# Australia Road Map Project Plan

## Goals
The user wants to generate a high-resolution (approx 4k) road map of Australia.
- **Scope:** "Every single street" - high density including residential roads.
- **Aesthetic:** Blue lines on a dark gray/black background (similar to "Tron" style).
- **Hierarchy:** Clear visual distinction between major highways (thicker) and minor streets (thinner).
- **Process:** The process must include a "caching" step where the raw, massive dataset is processed and saved in a more efficient, lower-resolution format (`parquet`) to allow for rapid iteration on styling without re-processing the raw shapefiles.

## Execution Plan

### 1. Project Initialization
- [x] Create directory structure.
- [x] Create `requirements.txt` and `.gitignore`.

### 2. Data Acquisition
- [ ] Download the Australia shapefile from Geofabrik (`australia-latest-free.shp.zip`).
- [ ] Unzip and identify the correct road data file (typically `gis_osm_roads_free_1.shp`).
- [ ] Inspect the schema to identify the column used for road classification (e.g., `fclass`).

### 3. Data Processing (Caching)
- [ ] Read the massive shapefile in chunks/streams to avoid memory crashes.
- [ ] Simplify geometries (tolerance ~0.0001) to reduce file size while maintaining visual fidelity at the target resolution.
- [ ] Save the processed data to `roads.parquet`.

### 4. Preview Rendering
- [ ] Render a small subset (e.g., a specific city or region) to test the styling.
- [ ] Validate the color palette and line width hierarchy.

### 5. Full Rendering
- [ ] Render the full continent at 4k resolution using `datashader`.
- [ ] Apply "spread" functions to thicken major roads.
- [ ] Save final output as `australia_roads.png`.

### 6. Final Review
- [ ] Verify image quality and file existence.
