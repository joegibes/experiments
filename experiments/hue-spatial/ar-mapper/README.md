# AR Light Mapper

The Setup Tool for Home Assistant SpatialAware.

## Quick Start

1.  Open this folder in your terminal.
2.  Run `npm install` and then `npm start`.
3.  **Important:** WebXR requires HTTPS or Localhost. To test on a phone, use a tool like **ngrok** to create an HTTPS tunnel to your local server:
    ```bash
    ngrok http 3000
    ```
4.  Open the HTTPS URL on your Android phone in Chrome.

## Features

- **Floor Detection:** Automatically finds the floor to set the ground reference.
- **Precision Pinning:** Tap lights in the real world to place 3D anchors.
- **Height Awareness:** Automatically calculates height from the ground (Z-axis).
- **Sanity Checks:** Warns if pins are placed above the detected ceiling.
- **JSON Export:** Downloads the coordinates in a format ready for the HA "Director" Add-on.

## Units
- All units are in **meters**.
- **Y** is the vertical axis in WebXR, but the exported JSON maps it to **Z** height from ground as requested.
- **(0,0,0)** is the starting point of the AR session, relative to the floor.
