import os
import requests
import zipfile
import glob
from pathlib import Path

DATA_DIR = Path("data")
URL = "https://download.geofabrik.de/australia-oceania/australia-latest-free.shp.zip"
ZIP_PATH = DATA_DIR / "australia-latest-free.shp.zip"

def download_file():
    if not DATA_DIR.exists():
        DATA_DIR.mkdir()

    if ZIP_PATH.exists():
        print(f"{ZIP_PATH} already exists. Skipping download.")
        return

    print(f"Downloading {URL}...")
    with requests.get(URL, stream=True) as r:
        r.raise_for_status()
        with open(ZIP_PATH, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    print("Download complete.")

def unzip_file():
    print(f"Unzipping {ZIP_PATH}...")
    with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall(DATA_DIR)
    print("Unzip complete.")

def find_roads_file():
    # Look for the roads shapefile. Usually 'gis_osm_roads_free_1.shp'
    files = list(DATA_DIR.glob("*roads*free_1.shp"))
    if not files:
        # Fallback to any shapefile with 'roads' in it
        files = list(DATA_DIR.glob("*roads*.shp"))

    if files:
        print(f"Found roads file: {files[0]}")
        return files[0]
    else:
        print("No roads shapefile found!")
        return None

if __name__ == "__main__":
    download_file()
    unzip_file()
    find_roads_file()
