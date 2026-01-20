#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = BASE_DIR / "data" / "sessions"

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")


def json_response(handler: SimpleHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class SpatialHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            json_response(self, HTTPStatus.OK, {"status": "ok"})
            return
        if parsed.path == "/api/sessions":
            sessions = []
            if DATA_DIR.exists():
                for entry in sorted(DATA_DIR.glob("*.json"), reverse=True):
                    sessions.append(entry.stem)
            json_response(self, HTTPStatus.OK, {"sessions": sessions})
            return
        if parsed.path.startswith("/api/sessions/"):
            session_id = parsed.path.rsplit("/", 1)[-1]
            session_path = DATA_DIR / f"{session_id}.json"
            if not session_path.exists():
                json_response(self, HTTPStatus.NOT_FOUND, {"error": "session_not_found"})
                return
            payload = json.loads(session_path.read_text(encoding="utf-8"))
            json_response(self, HTTPStatus.OK, payload)
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/sessions":
            json_response(self, HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "invalid_json"})
            return

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        session_id = f"session_{timestamp}"
        payload.setdefault("session_id", session_id)
        payload["received_at"] = datetime.now(timezone.utc).isoformat()
        session_path = DATA_DIR / f"{session_id}.json"
        session_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        logging.info("Saved session %s", session_id)
        json_response(self, HTTPStatus.CREATED, {"session_id": session_id})


def main() -> None:
    parser = argparse.ArgumentParser(description="Hue Spatial AR Mapper server")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    args = parser.parse_args()

    server_address = (args.host, args.port)
    httpd = ThreadingHTTPServer(server_address, SpatialHandler)
    logging.info("Serving AR mapper on http://%s:%s", args.host, args.port)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logging.info("Shutting down server")


if __name__ == "__main__":
    main()
