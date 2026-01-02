import fiona
from pathlib import Path

DATA_DIR = Path("data")

def inspect():
    # Find the file again (or hardcode if we know it from previous step)
    files = list(DATA_DIR.glob("*roads*free_1.shp"))
    if not files:
        files = list(DATA_DIR.glob("*roads*.shp"))

    if not files:
        print("No roads file to inspect.")
        return

    filepath = files[0]
    print(f"Inspecting {filepath}...")

    with fiona.open(filepath, 'r') as source:
        print(f"Driver: {source.driver}")
        print(f"Schema: {source.schema}")
        print(f"CRS: {source.crs}")
        print(f"Total features: {len(source)}")

        print("\nFirst 5 features properties:")
        for i, feature in enumerate(source):
            if i >= 5:
                break
            print(feature['properties'])

if __name__ == "__main__":
    inspect()
