# Implementation Plan - Snodrift Companion

## Status: Planning

## Architecture
*   **Framework:** React (Vite) + TypeScript.
*   **Routing:** `react-router-dom`.
*   **Styling:** Tailwind CSS (for rapid, mobile-first design).
*   **Icons:** `lucide-react`.
*   **PWA:** `vite-plugin-pwa` (Cache-first strategy for assets and map tiles if possible).

## Map Strategy
*   **Leaflet (`react-leaflet`):**
    *   Use OSM tiles.
    *   *Challenge:* Caching tiles for a specific area is tricky in a pure web PWA without a build step that downloads them.
    *   *Solution:* We will try to rely on the browser's Service Worker to cache tiles as they are viewed, but also provide a "Offline Map" mode that might just use a static SVG or high-res image overlay if tile caching proves unreliable.
    *   Actually, we can use a "Offline Mode" button that programmatically fetches tiles for the rally bounding box (zoom levels 10-13) and stores them in Cache Storage.

## Data Structure (`src/data`)
*   `locations.ts`:
    *   Type: `Location` { name, type (stage, hq, cabin), coordinates, description }
*   `schedule.ts`:
    *   Type: `Event` { id, name, day, startTime, endTime, locationId, stageNumbers }
*   `travelTimes.json`:
    *   Pre-calculated matrix: `{ "cabin_to_huff": { distance: "25km", duration: "30min" }, ... }`

## Pages / Views
1.  **Home / Dashboard:**
    *   "What's Happening Now?" (Current/Next Stage).
    *   Weather Widget (Current).
    *   Quick Nav: "Map", "Schedule".
2.  **Map:**
    *   Full screen Leaflet map.
    *   Filter toggle: Show Stages / Show Logistics (Cabin/Food).
3.  **Schedule:**
    *   Timeline view.
    *   Cards for each stage.
    *   "Plan" toggle (User can select "We are going here" - local storage).
4.  **Travel / Logistics:**
    *   Table/List of drive times from Cabin.
    *   Radio Frequencies card.

## Development Steps
1.  [ ] Setup Project (Vite, Tailwind, PWA).
2.  [ ] Extract Data (Schedule from Image/PDF, Coordinates).
3.  [ ] Generate Travel Times (Python script with OSRM/GraphHopper).
4.  [ ] Build Components.
5.  [ ] Polish & Offline Test.
