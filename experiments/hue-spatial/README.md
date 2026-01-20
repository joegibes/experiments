# Hue Spatial AR Mapper (Scaffold)

This scaffold provides a WebXR AR mapping flow for capturing room outlines and light positions, plus a lightweight server for storing session logs.

## What is included

- **WebXR AR mapper** for Android Chrome.
- **Room outline mapping** with floor + walls overlays.
- **Light pinning** with meters-based XYZ coordinates.
- **3D visualizer** for reviewing the layout.
- **Session logging & export** to a local server endpoint.

## Run locally

```bash
cd /workspace/experiments/experiments/hue-spatial
python3 server.py --port 8000
```

Then open `http://localhost:8000` in Chrome on Android.

## API endpoints

- `GET /api/health`
- `GET /api/sessions`
- `GET /api/sessions/<session_id>`
- `POST /api/sessions` (stores JSON payload under `data/sessions/`)

## Notes

- Coordinates are stored in **meters**.
- Scene logic is intentionally not implemented yet.
- The session payload includes room outline points, ceiling height, bounds, and light positions.
