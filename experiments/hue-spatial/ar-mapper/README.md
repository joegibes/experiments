# AR Light Mapper

A WebXR-based tool for mapping smart lights in 3D space using augmented reality. Part of the Home Assistant SpatialAware project.

## Quick Start

### Prerequisites
- Node.js installed
- Android device with ARCore support (Pixel 7+, Samsung Galaxy S21+, etc.)
- Chrome browser (latest version)

### Running the Server

```bash
cd ar-mapper
npm install    # First time only
npm start      # Start local server at http://localhost:3000
```

### Accessing from Mobile (HTTPS Required)

**Serveo (Recommended - No install)**
```bash
ssh -R 80:localhost:3000 serveo.net
```

**Alternatives:** `npx localtunnel --port 3000` or `ngrok http 3000`

Open the generated URL on your Android phone in Chrome.

---

## User Guide

### Workflow

1. **Floor Detection** - Point at floor, auto-detects after ~1 second (or tap manually)
2. **Room Outline** - Tap each corner of your room (optional but recommended)
3. **Ceiling Height** - Tap the ceiling/wall top to measure (or skip for 2.44m default)
4. **Light Pinning** - Point at lights and tap to place 3D pins
5. **Results** - View 3D visualization and export JSON

### Controls

| Action | Description |
|--------|-------------|
| Tap floor | Set floor level |
| Tap corners | Define room shape |
| Tap lights | Place coordinate pin |
| ← Back | Go to previous step |
| Finish | End mapping, show results |

### 3D Visualizer Controls

| Platform | Action |
|----------|--------|
| Mobile | Drag to rotate, pinch to zoom |
| Desktop | Click+drag to rotate, scroll to zoom |

---

## Features

- **Auto Floor Detection** - Detects horizontal surfaces with visual feedback
- **Plane Detection VFX** - Radiating particles + haptic when surface found
- **Room Corner Mapping** - Define perimeter, visualize walls in AR
- **Ceiling Height Measurement** - Tap ceiling or use default
- **3D Hit Testing** - Detects planes and feature points
- **Real-time Height Display** - Shows height as you aim
- **3D Room Visualizer** - Interactive preview with walls
- **Haptic Feedback** - Vibration on actions
- **JSON Export** - Ready for Home Assistant

---

## Coordinate System

| Axis | Description |
|------|-------------|
| X | Left/Right (meters) |
| Y | Depth/Forward (meters) |
| Z | Height from floor (meters) |

> **Note:** WebXR uses Y-up internally, but exports map to Z-up.

---

## Debugging

```javascript
// In browser console:
window.debugExport()  // Copies all state data to clipboard
```

Returns: `{timestamp, floorHeight, ceilingHeight, corners[], pins[]}`

---

## Key Learnings

### WebXR on Android
- Requires HTTPS (use tunneling)
- `domOverlay` allows HTML UI over camera
- Hit testing with `['plane', 'point']` enables object detection

### Three.js + WebXR
- Canvas goes on `document.body`, not DOM overlay
- `scene.background = null` for AR transparency
- `renderer.xr.setSession(session)` connects to WebXR

### Floor Polygon Alignment
- ShapeGeometry uses 2D (x,y) coords
- When rotated -π/2 around X: shape Y becomes -world Z
- Fix: Negate Z when building shape (`-position.z`)

### Common Issues
- **Black screen**: Canvas layering or background issue
- **Hit test fails**: Include `'point'` in entityTypes
- **Floor polygon misaligned**: Check coordinate negation

---

## Project Structure

```
ar-mapper/
├── index.html      # UI screens
├── styles.css      # Dark theme
├── js/app.js       # Core logic
├── package.json    # npm config
└── README.md       # This file
```

---

## JSON Output

```json
{
  "room_bounds": {
    "floor_y": 0.0,
    "ceiling_height": 2.44,
    "width": 4.5,
    "depth": 3.2
  },
  "lights": {
    "light.mapped_1": { "x": 1.2, "y": 2.1, "z": 2.3 }
  }
}
```

---

## License

MIT
