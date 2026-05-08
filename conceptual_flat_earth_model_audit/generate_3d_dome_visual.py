#!/usr/bin/env python3
"""Generate a 3D-style SVG showing optical rays versus whole-world vault points."""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VIS = ROOT / "visuals"
VIS.mkdir(exist_ok=True)
DATA = json.loads((ROOT / "pipeline-sample-data.json").read_text())
OBJECTS = DATA["bodies"]
OBS = tuple(DATA["observerFeCoord"])

STYLE = """
<style>
  text{font-family:Arial,Helvetica,sans-serif}
  .title{font-size:24px;font-weight:700;fill:#f8fafc}
  .subtitle{font-size:13px;font-weight:500;fill:#cbd5e1}
  .label{font-size:12px;font-weight:700;fill:#f8fafc}
  .small{font-size:11px;font-weight:500;fill:#cbd5e1}
  .tiny{font-size:10px;font-weight:500;fill:#94a3b8}
</style>
<defs>
  <linearGradient id="sceneBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#07101f"/></linearGradient>
  <radialGradient id="discFill" cx="50%" cy="44%" r="65%"><stop offset="0" stop-color="#16243b"/><stop offset="1" stop-color="#0b1324"/></radialGradient>
  <clipPath id="sceneClip"><rect x="36" y="118" width="1208" height="696" rx="18"/></clipPath>
</defs>
"""
COLORS = {
    "Sun": "#ffd34d", "Moon": "#e5e7eb", "Mars": "#ff6b5f",
    "Jupiter": "#ffb86b", "Saturn": "#e7c77d", "Sirius": "#9ed0ff",
    "Polaris": "#b7f7ff", "Arcturus": "#ffb15d", "Vega": "#d6e8ff", "Betelgeuse": "#ff8f55",
}
SCENE_MAX_R = 1.18


def project(point: tuple[float, float, float]) -> tuple[float, float]:
    x, y, z = point
    # Three-quarter view similar to the app's dark 3D canvas: FE x/y skew to a
    # flattened map ellipse, z rises upward.
    return 505 + 360 * (x - y), 594 + 165 * (x + y) - 405 * z


def path(points: list[tuple[float, float, float]]) -> str:
    pts = [project(p) for p in points]
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts)


def ring(r: float, z: float = 0.0, n: int = 180) -> list[tuple[float, float, float]]:
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), z) for i in range(n + 1)]


def clip_ray_to_scene(start: tuple[float, float, float], end: tuple[float, float, float]) -> tuple[tuple[float, float, float], bool]:
    sx, sy, sz = start
    ex, ey, ez = end
    if math.hypot(ex, ey) <= SCENE_MAX_R:
        return end, False
    dx, dy = ex - sx, ey - sy
    a = dx * dx + dy * dy
    b = 2 * (sx * dx + sy * dy)
    c = sx * sx + sy * sy - SCENE_MAX_R * SCENE_MAX_R
    disc = max(0, b * b - 4 * a * c)
    roots = [(-b + math.sqrt(disc)) / (2 * a), (-b - math.sqrt(disc)) / (2 * a)]
    ts = [t for t in roots if 0 <= t <= 1]
    t = max(ts) if ts else 1
    return (sx + dx * t, sy + dy * t, sz + (ez - sz) * t), True


def optical_point_for(obj: dict) -> tuple[float, float, float]:
    # A tiny local optical dome marker close to the observer, showing that the
    # cyan ray passes through the observed optical position before extrapolating.
    az = math.radians(obj["opticalAzDeg"])
    el = math.radians(obj["opticalElDeg"])
    local_r = 0.18
    # Approximate the map-plane heading from azimuth in the same convention used
    # by the app's FE observer frame: north/south/east orientation is enough for
    # a readable local cap marker.
    lon = math.radians(DATA["observer"]["lonDeg"])
    east_axis = (-math.sin(lon), math.cos(lon))
    south_axis = (math.cos(lon), math.sin(lon))
    north = math.cos(el) * math.cos(az)
    east = math.cos(el) * math.sin(az)
    x = OBS[0] + local_r * (-north * south_axis[0] + east * east_axis[0])
    y = OBS[1] + local_r * (-north * south_axis[1] + east * east_axis[1])
    z = max(0.025, local_r * max(0.0, math.sin(el)))
    return (x, y, z)


def label_position(base: tuple[float, float], i: int) -> tuple[float, float]:
    x, y = base
    offsets = [(10, -10), (12, 14), (-86, -10), (-90, 14), (10, 28), (-88, 30)]
    ox, oy = offsets[i % len(offsets)]
    return x + ox, y + oy


def make_svg() -> str:
    obs = (OBS[0], OBS[1], OBS[2])
    body_count = sum(1 for o in OBJECTS if o["category"] == "body")
    star_count = sum(1 for o in OBJECTS if o["category"] == "star")
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900" role="img">',
        '<rect width="100%" height="100%" fill="#050b16"/>', STYLE,
        '<text class="title" x="42" y="46">3D dome mismatch: optical rays do not hit the whole-world vault markers</text>',
        f'<text class="subtitle" x="42" y="70">App defaults from cloned source • observer {DATA["observer"]["latDeg"]:.1f} deg, {DATA["observer"]["lonDeg"]:.4f} deg • {DATA["dateIso"]} • {body_count} bodies + {star_count} stars</text>',
        '<rect x="36" y="118" width="1208" height="696" rx="18" fill="url(#sceneBg)" stroke="#2b3d58"/>',
        '<g clip-path="url(#sceneClip)">',
    ]
    # World disc/grid.
    parts.append(f'<path d="{path(ring(1.0))}" fill="url(#discFill)" stroke="#64748b" stroke-width="2.2" opacity="0.95"/>')
    for r in (0.25, 0.5, 0.75):
        parts.append(f'<path d="{path(ring(r))}" fill="none" stroke="#2a3a53" stroke-width="1"/>')
    for deg in range(0, 360, 20):
        a = math.radians(deg)
        parts.append(f'<path d="{path([(0,0,0),(math.cos(a), math.sin(a), 0)])}" stroke="#24344d" stroke-width="0.9"/>')
    # Dome silhouettes.
    dome_arc = [(math.cos(math.radians(a)), math.sin(math.radians(a)), 0.72 * math.sin(math.radians(a - 180))) for a in range(180, 361, 3)]
    parts.append(f'<path d="{path(dome_arc)}" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.42" stroke-dasharray="8 7"/>')
    ox, oy, oz = obs
    local_arc = [(ox + 0.18 * math.cos(math.radians(a)), oy + 0.18 * math.sin(math.radians(a)), 0.18 * math.sin(math.radians(a - 180))) for a in range(180, 361, 4)]
    parts.append(f'<path d="{path(local_arc)}" fill="none" stroke="#38bdf8" stroke-width="2.4" opacity="0.78"/>')
    # Draw rays first so markers sit on top.
    scene_rows = []
    for i, obj in enumerate(OBJECTS):
        label = obj["label"]
        vault = tuple(obj["vaultCoord"])
        ray = tuple(obj["rayAtVaultZ"])
        optical = optical_point_for(obj)
        clipped_ray, clipped = clip_ray_to_scene(obs, ray)
        vault_xy = project(vault)
        optical_xy = project(optical)
        ray_xy = project(clipped_ray)
        color = COLORS.get(label, "#f8fafc")
        below = obj["rayMode"] == "below-horizon"
        if below:
            parts.append(f'<path d="{path([obs, clipped_ray])}" stroke="#ef4444" stroke-width="1.6" stroke-dasharray="5 5" opacity="0.72"/>')
        else:
            parts.append(f'<path d="{path([obs, optical, clipped_ray])}" stroke="#38bdf8" stroke-width="1.7" opacity="0.78" fill="none"/>')
            parts.append(f'<circle cx="{optical_xy[0]:.1f}" cy="{optical_xy[1]:.1f}" r="3.8" fill="#38bdf8" stroke="#e0f2fe" opacity="0.9"/>')
            if clipped:
                parts.append(f'<circle cx="{ray_xy[0]:.1f}" cy="{ray_xy[1]:.1f}" r="4.2" fill="#38bdf8" stroke="#e0f2fe"/>')
                # Short red pointer from target toward clipped ray, rather than a huge off-canvas slash.
                tx = vault_xy[0] + (ray_xy[0] - vault_xy[0]) * 0.22
                ty = vault_xy[1] + (ray_xy[1] - vault_xy[1]) * 0.22
                parts.append(f'<line x1="{vault_xy[0]:.1f}" y1="{vault_xy[1]:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 5"/>')
                parts.append(f'<text class="tiny" x="{ray_xy[0]+7:.1f}" y="{ray_xy[1]-7:.1f}">off-map ray</text>')
            else:
                parts.append(f'<circle cx="{ray_xy[0]:.1f}" cy="{ray_xy[1]:.1f}" r="4.5" fill="#38bdf8" stroke="#e0f2fe"/>')
                parts.append(f'<line x1="{ray_xy[0]:.1f}" y1="{ray_xy[1]:.1f}" x2="{vault_xy[0]:.1f}" y2="{vault_xy[1]:.1f}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 5"/>')
        parts.append(f'<circle cx="{vault_xy[0]:.1f}" cy="{vault_xy[1]:.1f}" r="6.2" fill="{color}" stroke="#fff7ed" stroke-width="1.2"/>')
        lx, ly = label_position(vault_xy, i)
        status = 'below horizon' if below else f'miss {obj["missDistance"]:.2f}R'
        parts.append(f'<text class="tiny" x="{lx:.1f}" y="{ly:.1f}">{label} • {status}</text>')
        scene_rows.append((label, obj["opticalElDeg"], status))
    # Observer marker last.
    sx, sy = project(obs)
    parts.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="7" fill="#22c55e" stroke="#bbf7d0" stroke-width="2.2"/>')
    parts.append(f'<text class="label" x="{sx+10:.1f}" y="{sy+4:.1f}">observer</text>')
    parts.append('</g>')
    # Legend outside clipped group.
    parts.append('<rect x="870" y="140" width="346" height="344" rx="14" fill="#0f172a" stroke="#334155" opacity="0.96"/>')
    parts.append('<text class="label" x="894" y="170">Legend</text>')
    parts.append('<circle cx="902" cy="198" r="5.5" fill="#fbbf24" stroke="#fff7ed"/><text class="small" x="920" y="202">whole-world vault marker</text>')
    parts.append('<circle cx="902" cy="225" r="5" fill="#38bdf8" stroke="#e0f2fe"/><text class="small" x="920" y="229">optical ray at same z plane</text>')
    parts.append('<line x1="894" y1="253" x2="924" y2="253" stroke="#38bdf8" stroke-width="2"/><text class="small" x="932" y="257">ray through observed optical position</text>')
    parts.append('<line x1="894" y1="282" x2="924" y2="282" stroke="#ef4444" stroke-dasharray="5 5"/><text class="small" x="932" y="286">miss distance / below-horizon ray</text>')
    parts.append('<text class="tiny" x="894" y="322">Large off-map misses are clipped to avoid misleading</text>')
    parts.append('<text class="tiny" x="894" y="338">diagonal lines going nowhere; labels retain true miss.</text>')
    y = 372
    for label, el, status in scene_rows:
        parts.append(f'<text class="tiny" x="894" y="{y}">{label}: optical el {el:.1f} deg, {status}</text>')
        y += 14
    parts.append('</svg>')
    return "\n".join(parts)

out = VIS / "dome-ray-mismatch-3d.svg"
out.write_text(make_svg())
print(out.relative_to(ROOT))
