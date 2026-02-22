import json
import os
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
MAP_FILE = os.path.join(BASE_DIR, "map_data.json")

# Ensure directories exist
os.makedirs(LOGS_DIR, exist_ok=True)

# --- Pydantic Models ---

class Vector3(BaseModel):
    x: float
    y: float
    z: float

class Light(BaseModel):
    id: str
    position: Vector3
    name: Optional[str] = None

class RoomGeometry(BaseModel):
    floor_points: List[Vector3]
    ceiling_height: float
    walls: Optional[List[List[Vector3]]] = None # List of walls, each wall is a list of points (usually 4)

class SpatialMap(BaseModel):
    room: RoomGeometry
    lights: List[Light]
    timestamp: float

class LogEntry(BaseModel):
    level: str
    message: str
    timestamp: float
    data: Optional[Dict[str, Any]] = None

# --- Endpoints ---

@app.post("/api/save-map")
async def save_map(map_data: SpatialMap):
    try:
        with open(MAP_FILE, "w") as f:
            f.write(map_data.model_dump_json(indent=2))
        return {"status": "success", "message": "Map saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/map")
async def get_map():
    if not os.path.exists(MAP_FILE):
        return {"room": {"floor_points": [], "ceiling_height": 2.4}, "lights": [], "timestamp": 0}
    try:
        with open(MAP_FILE, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/log")
async def log_message(entry: LogEntry):
    """
    Appends a log entry to a daily log file.
    """
    date_str = time.strftime("%Y-%m-%d")
    log_file_path = os.path.join(LOGS_DIR, f"session_{date_str}.log")

    log_line = json.dumps(entry.model_dump()) + "\n"

    try:
        with open(log_file_path, "a") as f:
            f.write(log_line)
        return {"status": "logged"}
    except Exception as e:
        print(f"Failed to write log: {e}")
        raise HTTPException(status_code=500, detail="Failed to write log")

# Mount static files (must be last to avoid capturing API routes)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
