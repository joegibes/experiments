#!/usr/bin/env python3
"""Generate a 3D-style SVG showing optical rays versus whole-world vault points."""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VIS = ROOT / "visuals"
VIS.mkdir(exist_ok=True)
BASE = json.loads((ROOT / "pipeline-sample-data.json").read_text())

GMST_DEG = 224.85242742020637
OBS_LAT = BASE["observer"]["latDeg"]
OBS_LON = BASE["observer"]["lonDeg"]
FE_RADIUS = 1.0
STAR_Z = 0.485

# Extra bright stars; RA/Dec are approximate degrees and are enough for the
# illustrative geometry here. Sirius is also in pipeline-sample-data.json but is
# recomputed here so all five star rays use the same formula path.
STARS = [
    {"label": "Sirius", "raDeg": 101.580, "decDeg": -16.746, "vaultZ": STAR_Z},
    {"label": "Polaris", "raDeg": 37.950, "decDeg": 89.264, "vaultZ": STAR_Z},
    {"label": "Arcturus", "raDeg": 213.915, "decDeg": 19.182, "vaultZ": STAR_Z},
    {"label": "Vega", "raDeg": 279.234, "decDeg": 38.784, "vaultZ": STAR_Z},
    {"label": "Betelgeuse", "raDeg": 88.793, "decDeg": 7.407, "vaultZ": STAR_Z},
]

BODY_IDS = {"Sun", "Moon", "Mars", "Jupiter", "Saturn"}
BODIES = [b for b in BASE["bodies"] if b["label"] in BODY_IDS]
OBJECTS = [*BODIES, *STARS]

STYLE = """
<style>
  .title{font:700 25px system-ui,-apple-system,Segoe UI,sans-serif;fill:#f8fafc}
  .subtitle{font:500 13px system-ui,-apple-system,Segoe UI,sans-serif;fill:#cbd5e1}
  .label{font:650 12px system-ui,-apple-system,Segoe UI,sans-serif;fill:#f8fafc}
  .small{font:500 11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#cbd5e1}
  .tiny{font:500 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#94a3b8}
</style>
<defs>
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="2.6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
"""

COLORS = {
    "Sun": "#ffd34d", "Moon": "#e5e7eb", "Mars": "#ff6b5f",
    "Jupiter": "#ffb86b", "Saturn": "#e7c77d", "Sirius": "#9ed0ff",
    "Polaris": "#b7f7ff", "Arcturus": "#ffb15d", "Vega": "#d6e8ff", "Betelgeuse": "#ff8f55",
}


def rad(d: float) -> float:
    return math.radians(d)


def wrap180(x: float) -> float:
    return ((x + 180) % 360) - 180


def fe_xy(lat_deg: float, lon_deg: float) -> tuple[float, float]:
    r = (90 - lat_deg) / 180 * FE_RADIUS
    return r * math.cos(rad(lon_deg)), r * math.sin(rad(lon_deg))


def observer_xy() -> tuple[float, float]:
    return fe_xy(OBS_LAT, OBS_LON)


def az_el_from_ra_dec(ra_deg: float, dec_deg: float) -> tuple[float, float]:
    lat = rad(OBS_LAT)
    dec = rad(dec_deg)
    ha = rad((GMST_DEG + OBS_LON) - ra_deg)
    sin_alt = math.sin(lat) * math.sin(dec) + math.cos(lat) * math.cos(dec) * math.cos(ha)
    alt = math.asin(max(-1, min(1, sin_alt)))
    y = -math.cos(dec) * math.sin(ha)
    x = math.sin(dec) * math.cos(lat) - math.cos(dec) * math.sin(lat) * math.cos(ha)
    az = math.degrees(math.atan2(y, x)) % 360
    return az, math.degrees(alt)


def local_to_global_dir(az_deg: float, el_deg: float) -> tuple[float, float, float]:
    """Convert az/el to the app-like FE local frame orientation at observer."""
    az = rad(az_deg)
    el = rad(el_deg)
    zenith = math.sin(el)
    east = math.cos(el) * math.sin(az)
    north = math.cos(el) * math.cos(az)
    # local-globe -> local-FE: [-north, east, zenith]
    lf_x = -north
    lf_y = east
    lf_z = zenith
    lon = rad(OBS_LON)
    south_axis = (math.cos(lon), math.sin(lon), 0)
    east_axis = (-math.sin(lon), math.cos(lon), 0)
    return (
        lf_x * south_axis[0] + lf_y * east_axis[0],
        lf_x * south_axis[1] + lf_y * east_axis[1],
        lf_z,
    )


def enrich(obj: dict) -> dict:
    ra = obj["raDeg"]
    dec = obj["decDeg"]
    gp_lon = wrap180(ra - GMST_DEG)
    vx, vy = fe_xy(dec, gp_lon)
    vz = obj["vaultZ"]
    if "opticalAzDeg" in obj:
        az, el = obj["opticalAzDeg"], obj["opticalElDeg"]
    else:
        az, el = az_el_from_ra_dec(ra, dec)
    ox, oy = observer_xy()
    dz = local_to_global_dir(az, el)
    if dz[2] > 1e-6:
        t = vz / dz[2]
        rx, ry, rz = ox + dz[0] * t, oy + dz[1] * t, vz
        miss = math.sqrt((rx - vx) ** 2 + (ry - vy) ** 2 + (rz - vz) ** 2)
        ray = (rx, ry, rz)
        upward = True
    else:
        # Downward observed ray: draw a short red segment; it never reaches the upper dome.
        ray = (ox + dz[0] * 0.32, oy + dz[1] * 0.32, dz[2] * 0.32)
        miss = None
        upward = False
    return {**obj, "vault": (vx, vy, vz), "az": az, "el": el, "ray": ray, "miss": miss, "upward": upward}


def project(p: tuple[float, float, float]) -> tuple[float, float]:
    x, y, z = p
    sx = 520 + 360 * (x - y)
    sy = 540 + 170 * (x + y) - 390 * z
    return sx, sy


def path(points: list[tuple[float, float, float]]) -> str:
    pts = [project(p) for p in points]
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts)


def circle3(cx: float, cy: float, r: float, z: float, n: int = 160) -> list[tuple[float, float, float]]:
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n), z) for i in range(n + 1)]


def make_svg() -> str:
    objs = [enrich(o) for o in OBJECTS]
    obs = (*observer_xy(), 0.0)
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900" role="img">',
        '<rect width="100%" height="100%" fill="#060b16"/>',
        STYLE,
        '<text class="title" x="42" y="46">3D dome mismatch: optical sightlines do not hit the whole-world vault markers</text>',
        '<text class="subtitle" x="42" y="70">Observer 32.0°, -100.8387° • 2026-05-07T00:00Z • FE-style disc/dome sketch • orange = whole-world vault, cyan = observer optical ray extrapolation</text>',
        '<rect x="32" y="96" width="1216" height="742" rx="18" fill="url(#panel)" stroke="#263449"/>',
    ]
    # Flat map and two transparent domes.
    parts.append(f'<path d="{path(circle3(0,0,1,0))}" fill="#10192b" stroke="#475569" stroke-width="2" opacity="0.92"/>')
    for r in (0.25, 0.5, 0.75):
        parts.append(f'<path d="{path(circle3(0,0,r,0))}" fill="none" stroke="#243246" stroke-width="1"/>')
    for lon in range(0, 360, 30):
        a = rad(lon)
        parts.append(f'<path d="{path([(0,0,0),(math.cos(a),math.sin(a),0)])}" stroke="#243246" stroke-width="1"/>')
    # Outer dome silhouette and observer local dome.
    dome_front = [(math.cos(rad(a)), math.sin(rad(a)), 0.72 * math.sqrt(max(0, 1 - math.sin(rad(a))**2))) for a in range(180, 361, 3)]
    parts.append(f'<path d="{path(dome_front)}" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.42" stroke-dasharray="8 7"/>')
    ox, oy, _ = obs
    local_dome = [(ox + 0.18*math.cos(rad(a)), oy + 0.18*math.sin(rad(a)), 0.18*math.sqrt(max(0,1-math.sin(rad(a))**2))) for a in range(180,361,4)]
    parts.append(f'<path d="{path(local_dome)}" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.75"/>')
    # Observer marker.
    sx, sy = project(obs)
    parts.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="7" fill="#22c55e" stroke="#bbf7d0" stroke-width="2" filter="url(#glow)"/>')
    parts.append(f'<text class="label" x="{sx+10:.1f}" y="{sy+4:.1f}">observer</text>')
    # Rays, vault points, projected ray endpoints and miss segments.
    for obj in objs:
        color = COLORS.get(obj["label"], "#ffffff")
        vx, vy, vz = obj["vault"]
        rx, ry, rz = obj["ray"]
        vault_s = project((vx, vy, vz))
        ray_s = project((rx, ry, rz))
        if obj["upward"]:
            parts.append(f'<path d="{path([obs, (rx,ry,rz)])}" stroke="#38bdf8" stroke-width="1.7" opacity="0.75"/>')
            parts.append(f'<line x1="{ray_s[0]:.1f}" y1="{ray_s[1]:.1f}" x2="{vault_s[0]:.1f}" y2="{vault_s[1]:.1f}" stroke="#ef4444" stroke-width="1.4" stroke-dasharray="5 5" opacity="0.9"/>')
            parts.append(f'<circle cx="{ray_s[0]:.1f}" cy="{ray_s[1]:.1f}" r="4.5" fill="#38bdf8" stroke="#e0f2fe"/>')
        else:
            down_s = project((rx,ry,rz))
            parts.append(f'<path d="{path([obs, (rx,ry,rz)])}" stroke="#ef4444" stroke-width="1.5" opacity="0.65" stroke-dasharray="4 4"/>')
            parts.append(f'<circle cx="{down_s[0]:.1f}" cy="{down_s[1]:.1f}" r="3.5" fill="#ef4444"/>')
        parts.append(f'<circle cx="{vault_s[0]:.1f}" cy="{vault_s[1]:.1f}" r="6" fill="{color}" stroke="#fff7ed" stroke-width="1.2" filter="url(#glow)"/>')
        label_x = vault_s[0] + (9 if vault_s[0] < 1070 else -75)
        label_y = vault_s[1] - 7
        miss_txt = "below horizon" if not obj["upward"] else f"miss {obj['miss']:.2f}R"
        parts.append(f'<text class="tiny" x="{label_x:.1f}" y="{label_y:.1f}">{obj["label"]} ({miss_txt})</text>')
    # Legend/table.
    parts.append('<rect x="878" y="112" width="350" height="286" rx="14" fill="#0f172a" stroke="#334155" opacity="0.94"/>')
    parts.append('<text class="label" x="902" y="142">Legend</text>')
    parts.append('<circle cx="910" cy="168" r="5" fill="#fbbf24" stroke="#fff7ed"/><text class="small" x="926" y="172">whole-world dome marker</text>')
    parts.append('<circle cx="910" cy="194" r="5" fill="#38bdf8" stroke="#e0f2fe"/><text class="small" x="926" y="198">where observed optical ray reaches same z</text>')
    parts.append('<line x1="902" y1="222" x2="930" y2="222" stroke="#ef4444" stroke-dasharray="5 5"/><text class="small" x="938" y="226">gap / inaccuracy on the vault</text>')
    parts.append('<line x1="902" y1="250" x2="930" y2="250" stroke="#ef4444" stroke-dasharray="4 4"/><text class="small" x="938" y="254">downward optical ray: below horizon</text>')
    parts.append('<text class="tiny" x="902" y="286">R = flat-earth disc radius. Red gap is not an app-validated</text>')
    parts.append('<text class="tiny" x="902" y="302">optical law; it is the straight FE geometry mismatch.</text>')
    y = 336
    parts.append('<text class="tiny" x="902" y="326">Shown: Sun, Moon, Mars, Jupiter, Saturn + 5 stars.</text>')
    for obj in objs[:10]:
        txt = "below" if not obj["upward"] else f"{obj['miss']:.2f}R"
        parts.append(f'<text class="tiny" x="902" y="{y}">{obj["label"]}: optical el {obj["el"]:.1f}°, {txt}</text>')
        y += 15
    parts.append('</svg>')
    return "\n".join(parts)

out = VIS / "dome-ray-mismatch-3d.svg"
out.write_text(make_svg())
print(out.relative_to(ROOT))
