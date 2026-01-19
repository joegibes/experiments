# AR Light Mapper

A WebXR-based tool for mapping smart lights in 3D space using augmented reality. Part of the Home Assistant SpatialAware project.

## Quick Start

### Prerequisites
- Node.js installed
- Android device with ARCore support (Pixel 7+, Samsung Galaxy S21+, etc.)
- Chrome browser (latest version)

### Running the Server

```bash
# Navigate to the ar-mapper folder
cd ar-mapper

# Install dependencies (first time only)
npm install

# Start the local server
npm start
```

### Accessing from Mobile

WebXR requires HTTPS. Use one of these tunneling methods:

**Option 1: Serveo (Recommended - No install needed)**
```bash
ssh -R 80:localhost:3000 serveo.net
```

**Option 2: Localtunnel**
```bash
npx localtunnel --port 3000
```

**Option 3: ngrok**
```bash
ngrok http 3000
```

Open the generated HTTPS URL on your Android phone in Chrome.

## How It Works

### Workflow

1. **Floor Detection**
   - Point your camera at the floor
   - The app auto-detects it after ~1 second of stable tracking
   - Or tap the floor manually to set it

2. **Room Outline (Optional)**
   - Walk around and tap each corner of your room
   - This creates a polygon representing your room's shape
   - You can skip this step if you just want to map lights

3. **Light Pinning**
   - Point at each light fixture and tap to place a pin
   - The app records the 3D coordinates relative to the floor
   - Height is calculated automatically

4. **Results**
   - View a 3D visualization of your mapped room
   - Export coordinates as JSON for Home Assistant

### Coordinate System

| Axis | Description |
|------|-------------|
| X | Left/Right (meters) |
| Y | Depth/Forward (meters) |
| Z | Height from floor (meters) |

> **Note:** WebXR uses Y-up internally, but the exported JSON maps to Z-up for consistency with physical intuition.

## Features

- **Auto Floor Detection** - Automatically detects horizontal surfaces
- **Room Corner Mapping** - Define your room's perimeter for accurate visualization
- **3D Hit Testing** - Detects both planes and feature points for accurate placement
- **Real-time Height Display** - Shows current height from floor as you aim
- **3D Room Visualizer** - Interactive preview of your mapped space
- **JSON Export** - Ready for the Home Assistant "Director" Add-on

## Key Learnings

### WebXR on Android
- Must use HTTPS (or localhost) for camera access
- `domOverlay` feature allows HTML UI over the camera feed
- Hit testing with `entityTypes: ['plane', 'point']` enables detection of non-planar objects

### Three.js Integration
- Renderer canvas must be appended to `document.body`, not the DOM overlay
- Set `scene.background = null` for AR transparency
- Use `renderer.xr.setSession(session)` to connect Three.js to WebXR

### Common Issues
- **Black screen**: Canvas not properly layered or background not transparent
- **Hit test fails on objects**: Need to include `'point'` in entityTypes
- **Auto-floor not triggering**: Requires stable tracking for threshold duration

## Project Structure

```
ar-mapper/
├── index.html      # Main HTML with all UI screens
├── styles.css      # CSS with modern dark theme
├── js/
│   └── app.js      # Core application logic
├── package.json    # npm scripts and dependencies
└── README.md       # This file
```

## API Output Format

```json
{
  "room_bounds": {
    "floor_y": 0.0,
    "ceiling_height": 2.44,
    "width": 4.5,
    "depth": 3.2
  },
  "lights": {
    "light.mapped_1": { "x": 1.2, "y": 2.1, "z": 2.3 },
    "light.mapped_2": { "x": -0.5, "y": 1.8, "z": 2.1 }
  }
}
```

## License

MIT
