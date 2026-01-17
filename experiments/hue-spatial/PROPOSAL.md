# Home Assistant "SpatialAware" Proposal

## 1. Executive Summary

**The Goal:** Bring Philips Hue's "SpatialAware" (2026) functionality—3D volumetric lighting—to *any* Home Assistant setup, using a standard Android phone (Pixel 7+) for setup and a lightweight Raspberry Pi runtime.

**The Solution:**
1.  **"The AR Mapper" (Setup Phase):** A web-based AR tool (WebXR) that runs in the user's phone browser. It allows the user to walk around the room and "pin" lights to their physical locations.
2.  **"The Director" (Runtime Phase):** A lightweight Home Assistant Add-on that uses this 3D map to drive lighting scenes in real-time.

---

## 2. User Experience (The "Magic")

### Step 1: The "Spatial Scan"
1.  **Start:** User opens the HA Add-on dashboard on their desktop, which shows a QR code.
2.  **Launch:** User scans the QR code with their Pixel 7, launching the "AR Mapper" web app in Chrome (no app install needed).
3.  **Floor Detection:** The app asks the user to point the camera at the floor. WebXR Plane Detection automatically identifies the floor plane `(y=0)`.
4.  **Ceiling Setup:** The app sets a default ceiling height (e.g., 2.4m above the floor) but allows the user to tap the ceiling to refine it.
5.  **Light Pinning:**
    *   HA turns on **Light 1**.
    *   User walks up to the light and taps it on the screen.
    *   A virtual sphere (Anchor) is placed at that 3D location.
    *   HA confirms by blinking the light.
    *   Repeat for all lights.
6.  **Finish:** User clicks "Save". The map (`lights_map.json`) is sent to the HA Add-on.

### Step 2: The "Volumetric Scene"
1.  User selects a scene like "Sunset".
2.  The "Director" applies a 3D gradient function:
    *   `if x < 1.0m (East) -> Purple`
    *   `if x > 4.0m (West) -> Orange`
    *   `if y > 2.0m (Ceiling) -> Fade to Blue`
3.  All lights (Hue, Shelly, Zigbee, etc.) update instantly to match their physical location in the gradient.

---

## 3. Technical Architecture

### A. The "AR Mapper" (WebXR Client)
*   **Role:** Interactive room mapping interface.
*   **Platform:** Mobile Web (Chrome on Android).
*   **Tech Stack:**
    *   **Three.js:** For 3D rendering (placing virtual pins).
    *   **WebXR Device API:** For `immersive-ar` session and camera tracking.
    *   **WebXR Anchors Module:** Crucial for ensuring "Pins" stay fixed in the real world even as the SLAM system corrects drift.
    *   **WebXR Plane Detection:** For automatically finding the floor height.
*   **Data Model:**
    *   Coordinate System: Meters (WebXR native).
    *   Origin (0,0,0): The position where the AR session started.
    *   Floor Height: Detected via Plane Detection (or manual tap).

### B. The "Director" (Lightweight Runtime)
*   **Role:** Home Assistant Add-on. Stores the map and executes scenes.
*   **Deployment:** Runs on HA OS (RPi 4/5 compatible).
*   **Tech Stack:** Python (FastAPI / HA Integration).
*   **Storage:** `lights_map.json`
    ```json
    {
      "room_bounds": {
        "floor_y": -1.5,
        "ceiling_y": 0.9,
        "min_x": -2.0, "max_x": 3.0,
        "min_z": -1.0, "max_z": 4.0
      },
      "lights": {
        "light.living_room_ceiling": {"x": 0.5, "y": 0.8, "z": 0.5},
        "light.desk_lamp": {"x": 0.1, "y": -0.8, "z": 0.1}
      }
    }
    ```
*   **Scene Logic:**
    *   **Normalization:** Convert raw meters to `0.0 - 1.0` range based on `room_bounds`.
    *   **Gradient Mapping:** Map normalized `(x, y, z)` to RGB colors.
    *   **Height Awareness:** Differentiate "Ceiling" vs "Floor" lights for nature scenes.

---

## 4. Key Challenges & Solutions

| Challenge | Solution |
| :--- | :--- |
| **Drift** | Use **WebXR Anchors**. Anchors are designed to "stick" to physical features. If the SLAM map updates, the Anchor pose updates to match, keeping the virtual pin on the physical lamp. |
| **Height Accuracy** | WebXR Plane Detection is very good at finding the "lowest large plane" (floor). We use this as the absolute reference for `y=0`. |
| **User Ease** | No app install (WebXR). QR code handoff makes it seamless. |
| **Performance** | The "Director" only does simple math (`position * gradient`). The heavy SLAM work is offloaded to the phone's AR chip during setup. |

---

## 5. Implementation Roadmap (Proof of Concept)

1.  **Phase 1: The "AR Mapper" (Web App)**
    *   Build a static HTML/JS page with Three.js.
    *   Implement "Start AR" button.
    *   Implement "Tap to Place Anchor".
    *   Implement "Export to JSON".
    *   *Test:* Run on Pixel 7, place pins, verify JSON output.

2.  **Phase 2: The "Director" (Add-on Skeleton)**
    *   Create a simple HA Add-on that accepts the JSON map.
    *   Implement a "Gradient Scene" that sets colors based on X/Y/Z.

3.  **Phase 3: Integration**
    *   Connect the Web App to the Add-on API to fetch the list of lights and post the map.

---

## Appendix: Fallback Plan (Video Mapping)
*If WebXR proves unstable or incompatible with specific devices, we can revert to the "Video Processing" approach:*
*   Record video + Light Sequence.
*   Process offline using **DROID-SLAM** or **Structure-from-Motion** on a desktop GPU.
