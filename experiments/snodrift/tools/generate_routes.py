import requests
import json
import time

# OSRM Public Server (Demo only - be gentle)
OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"
NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"

LOCATIONS = {
    'cabin': {'address': '2146 Pocahontas Trl, Comins, MI 48619', 'coords': None},
    'lewiston_hq': {'coords': [44.8850, -84.3050]},
    'atlanta_hq': {'coords': [45.0047, -84.1439]},
    'huff': {'coords': [45.046800, -84.334100]},
    'meaford': {'coords': [45.051944, -84.203611]},
    'sage_lake': {'coords': [44.926944, -84.148889]},
    'avery_lake': {'coords': [44.902112, -84.202046]},
    'hunt_creek': {'coords': [44.867683, -84.131761]}
}

HEADERS = {
    'User-Agent': 'SnodriftCompanion/1.0 (me@example.com)'
}

def get_coords(address):
    print(f"Geocoding {address}...")
    params = {
        'q': address,
        'format': 'json',
        'limit': 1
    }
    try:
        response = requests.get(NOMINATIM_BASE, params=params, headers=HEADERS, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data:
            return [float(data[0]['lat']), float(data[0]['lon'])]
    except Exception as e:
        print(f"Geocoding error: {e}")
        # print(f"Response text: {response.text}")
    return None

def get_route(start_coords, end_coords):
    # OSRM expects lon,lat
    start_str = f"{start_coords[1]},{start_coords[0]}"
    end_str = f"{end_coords[1]},{end_coords[0]}"
    url = f"{OSRM_BASE}/{start_str};{end_str}?overview=false"

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        data = response.json()
        if data['code'] == 'Ok':
            route = data['routes'][0]
            return {
                'distanceKm': round(route['distance'] / 1000, 1),
                'durationMinutes': round(route['duration'] / 60)
            }
    except Exception as e:
        print(f"Error fetching route: {e}")
    return None

def main():
    # 1. Geocode Cabin
    cabin_coords = get_coords(LOCATIONS['cabin']['address'])
    if not cabin_coords:
        print("Could not geocode cabin. Using Comins town center fallback.")
        cabin_coords = [44.8080, -84.0550] # Comins approx

    LOCATIONS['cabin']['coords'] = cabin_coords
    print(f"Cabin Coords: {cabin_coords}")

    # Output resolved locations to update locations.ts manually if needed
    print(f"Resolved Locations: {json.dumps(LOCATIONS['cabin'])}")

    travel_data = {}

    # 2. Calculate Routes from Cabin to All
    start_node = 'cabin'
    travel_data[start_node] = {}

    for dest_id, dest_data in LOCATIONS.items():
        if dest_id == start_node:
            continue

        print(f"Routing {start_node} -> {dest_id}...")
        route = get_route(LOCATIONS[start_node]['coords'], dest_data['coords'])
        if route:
            travel_data[start_node][dest_id] = route
        time.sleep(1) # Be nice to OSRM

    # 3. Calculate Routes from Lewiston and Atlanta to Spectator Areas
    for hq in ['lewiston_hq', 'atlanta_hq']:
        travel_data[hq] = {}
        for dest_id, dest_data in LOCATIONS.items():
            if dest_id in ['cabin', 'lewiston_hq', 'atlanta_hq']:
                continue

            print(f"Routing {hq} -> {dest_id}...")
            route = get_route(LOCATIONS[hq]['coords'], dest_data['coords'])
            if route:
                travel_data[hq][dest_id] = route
            time.sleep(1)

    # Save to file
    with open('experiments/snodrift/src/data/travelTimes.json', 'w') as f:
        json.dump(travel_data, f, indent=2)

    # Save resolved cabin coords to a separate file for me to read
    with open('experiments/snodrift/cabin_coords.json', 'w') as f:
        json.dump({'cabin': cabin_coords}, f)

if __name__ == "__main__":
    main()
