import json
import random
import math

def generate_wiggly_line(start_lat, start_lng, num_points=20, step_size=0.005):
    path = [[start_lat, start_lng]]
    current_lat = start_lat
    current_lng = start_lng

    # Random direction
    angle = random.uniform(0, 2 * math.pi)

    for _ in range(num_points):
        # Wiggle the angle
        angle += random.uniform(-0.5, 0.5)

        current_lat += math.sin(angle) * step_size
        current_lng += math.cos(angle) * step_size * 1.4 # Longitude correction approx

        path.append([round(current_lat, 6), round(current_lng, 6)])

    return path

def generate_stage_near(lat, lng, stage_id):
    # Start a bit away
    start_lat = lat + random.uniform(-0.02, 0.02)
    start_lng = lng + random.uniform(-0.02, 0.02)

    # Generate segments
    path = generate_wiggly_line(start_lat, start_lng, num_points=30, step_size=0.003)

    # Make sure it passes near the spectator point (hacky injection)
    mid_index = len(path) // 2
    path[mid_index] = [lat, lng]
    # Smooth it a bit around the injection
    path[mid_index-1] = [(path[mid_index-2][0] + lat)/2, (path[mid_index-2][1] + lng)/2]
    path[mid_index+1] = [(path[mid_index+2][0] + lat)/2, (path[mid_index+2][1] + lng)/2]

    return path

locations = {
    'huff': [45.046800, -84.334100],
    'meaford': [45.051944, -84.203611],
    'sage_lake': [44.926944, -84.148889],
    'avery_lake': [44.902112, -84.202046],
    'hunt_creek': [44.867683, -84.131761]
}

stages = {
    'SS1': locations['meaford'],
    'SS2': locations['meaford'], # Reuse area
    'SS3': locations['huff'],
    'SS4': locations['huff'],
    'SS5': locations['meaford'],
    'SS8': locations['huff'],
    'SS9': locations['sage_lake'],
    'SS10': locations['hunt_creek'],
    'SS12': locations['avery_lake'],
    'SS13': locations['sage_lake'],
    'SS14': locations['hunt_creek'],
    'SS15': locations['sage_lake'], # Bonfire
}

output = {}
for stage_id, coords in stages.items():
    output[stage_id] = generate_stage_near(coords[0], coords[1], stage_id)

ts_content = "export const STAGE_TRACES: Record<string, [number, number][]> = " + json.dumps(output, indent=2) + ";"

print(ts_content)
