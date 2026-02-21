# User Requirements & Specs - Snodrift 2026 Companion

## Goal
A mobile-friendly, offline-first web app to coordinate the 2026 Snodrift Rally for a small group of friends.

## Key Problems to Solve
*   **Poor Cell Service:** App must work offline. Maps must be cached or lightweight.
*   **Cold Hands:** UI targets must be large and easy to use.
*   **Coordination:** Need to know "Can we make it?" (Travel times from Cabin/Town to Stages).

## Features
1.  **Schedule & Map Integration:**
    *   Easy links to stage schedules.
    *   Map pins for Spectator Areas, Cabin, and Town (HQ).
2.  **Travel Logistics:**
    *   **Pre-calculated** travel times:
        *   Cabin -> Spectator Areas
        *   Cabin -> Town
        *   Town -> Spectator Areas
        *   Between Spectator Areas
    *   Suggested "Time to Leave".
3.  **Map View:**
    *   Mobile-optimized (like AllTrails).
    *   Pins for key locations.
    *   Route visualization (if possible).
    *   "Open in Google Maps" deep links.
4.  **Weather:**
    *   Local forecast for Fri/Sat (Lewiston/Atlanta area).
    *   Precipitation alerts.
5.  **Info & Sharing:**
    *   Radio Frequencies (Ham: 146.70 MHz).
    *   Car order/details (optional).
    *   Easy sharing of "plans" (e.g., "We are going to SS4").

## Data Sources
*   **Cabin Address:** 2146 Pocahontas Trl, Comins, MI 48619.
*   **Spectator Guide:** PDF provided (extracted schedule/coordinates).
*   **Coordinates:** Provided for Huff, Meaford, Sage Lake, Avery Lake, Hunt Creek.

## Technical Preferences
*   **Platform:** Web (PWA) installable on Android (Pixel 7).
*   **Hosting:** GitHub Pages or Vercel.
*   **Stack:** React + Vite.
*   **Map:** OpenStreetMap/Leaflet (for offline caching).
