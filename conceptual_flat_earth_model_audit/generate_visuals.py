#!/usr/bin/env python3
"""Generate the SVG visuals used by the flat-earth model audit report."""
from __future__ import annotations

import json
import math

from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / "pipeline-sample-data.json").read_text())
VIS = ROOT / "visuals"
VIS.mkdir(exist_ok=True)

SVG_STYLE = """
<style>
.title{font:700 24px system-ui,-apple-system,Segoe UI,sans-serif;fill:#f8fafc}.subtitle{font:500 13px system-ui,-apple-system,Segoe UI,sans-serif;fill:#cbd5e1}.label{font:600 13px system-ui,-apple-system,Segoe UI,sans-serif;fill:#e5e7eb}.small{font:500 11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#cbd5e1}.tiny{font:500 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#94a3b8}.arrow{stroke:#94a3b8;stroke-width:2;fill:none;marker-end:url(#arrow)}.arrowBlue{stroke:#60a5fa;stroke-width:2.5;fill:none;marker-end:url(#arrowBlue)}.arrowOrange{stroke:#fb923c;stroke-width:2.5;fill:none;marker-end:url(#arrowOrange)}
</style>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#94a3b8"/></marker>
<marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#60a5fa"/></marker>
<marker id="arrowOrange" viewBox="0 0 10 10" refX="9" markerWidth="7" markerHeight="7" refY="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#fb923c"/></marker>
</defs>
"""

def svg(name: str, w: int, h: int, body: str) -> Path:
    path = VIS / name
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img"><rect width="100%" '
        f'height="100%" fill="#0b1020"/>{SVG_STYLE}{body}</svg>\n'
    )
    return path

def box(x, y, w, h, lines, stroke="#334155", fill="#111827"):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}"/>']
    for i, line in enumerate(lines):
        cls = "label" if i == 0 else "small"
        out.append(f'<text class="{cls}" x="{x+14}" y="{y+22+i*17}">{escape(line)}</text>')
    return "".join(out)

def pipeline_overview():
    b=[]
    b.append('<text class="title" x="40" y="42">Two calculation pipelines: shared RA/Dec, separate projections</text>')
    b.append('<text class="subtitle" x="40" y="65">Both branches start with the same ephemeris/catalogue direction, then diverge before rendering.</text>')
    b.append(box(330,90,300,70,["Source direction","Sun/moon/planets: Ptolemy RA/Dec","Stars: catalogue RA/Dec"],"#8b5cf6","#1e1b4b"))
    b.append(box(350,190,260,56,["Shared time rotation","GMST / SkyRotAngle"],"#60a5fa","#172554"))
    b.append('<path class="arrow" d="M480 160L480 190"/>')
    left=[("RA/Dec → celestial unit vector","equatorialToCelestCoord()"),("unit vector → lat/lon","coordToLatLong()"),("subtract sidereal rotation","lon = lonCelest − SkyRotAngle"),("project to FE disc + assign z","vaultCoordAt(lat, lon, height)"),("render dome marker","whole-world / heavenly vault")]
    right=[("RA/Dec → celestial unit vector","same input direction"),("standard local sky transform","observer lat/lon + GMST"),("local vector → azimuth/elevation","localGlobeCoordToAngles()"),("project to observer cap","opticalVaultProject()"),("render optical marker","observer / optical vault")]
    b.append('<path class="arrowOrange" d="M430 246C350 268 245 268 235 300"/><path class="arrowBlue" d="M530 246C615 268 730 268 740 300"/>')
    for i,(a,c) in enumerate(left):
        y=300+i*80; b.append(box(80,y,340,56,[a,c],"#fb923c" if i>=3 else "#92400e","#2f1d0b"))
        if i<4: b.append(f'<path class="arrowOrange" d="M250 {y+56}L250 {y+80}"/>')
    for i,(a,c) in enumerate(right):
        y=300+i*80; b.append(box(590,y,340,56,[a,c],"#60a5fa" if i>=3 else "#1d4ed8","#0b2545"))
        if i<4: b.append(f'<path class="arrowBlue" d="M760 {y+56}L760 {y+80}"/>')
    b.append('<rect x="300" y="710" width="400" height="60" rx="14" fill="#450a0a" stroke="#ef4444"/><text class="label" x="325" y="735">No reconciliation step</text><text class="small" x="325" y="755">The optical branch does not use observer → drawn FE vault as its sightline.</text>')
    return "".join(b)

def mismatch():
    cx,cy,R=350,380,260
    def pos(az,el):
        r=((90-el)/180)*R; th=math.radians(az); return cx+r*math.sin(th),cy-r*math.cos(th)
    b=[]
    b.append('<text class="title" x="40" y="42">Apparent positions: observer-sky calculation vs line to drawn FE vault</text>')
    b.append(f'<text class="subtitle" x="40" y="65">Observer {DATA["observer"]["latDeg"]:.1f}°, {DATA["observer"]["lonDeg"]:.4f}° • {DATA["dateIso"]} • refraction off</text>')
    for frac,label in [(0,"Zenith +90°"),(.5,"Horizon 0°"),(1,"Nadir −90°")]:
        r=R*frac; b.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#334155" stroke-width="{2 if frac==.5 else 1}"/>')
        if frac: b.append(f'<text class="tiny" x="{cx+r+8}" y="{cy-4}">{label}</text>')
    b.append(f'<line x1="{cx}" y1="{cy-R}" x2="{cx}" y2="{cy+R}" stroke="#334155"/><line x1="{cx-R}" y1="{cy}" x2="{cx+R}" y2="{cy}" stroke="#334155"/>')
    for lab,x,y in [('N',cx,cy-R-12),('E',cx+R+14,cy+4),('S',cx,cy+R+22),('W',cx-R-16,cy+4)]: b.append(f'<text class="label" x="{x-5}" y="{y}">{lab}</text>')
    for i,d in enumerate(DATA['bodies']):
        ox,oy=pos(d['opticalAzDeg'],d['opticalElDeg']); fx,fy=pos(d['lineToVaultAzDeg'],d['lineToVaultElDeg'])
        b.append(f'<line x1="{ox:.1f}" y1="{oy:.1f}" x2="{fx:.1f}" y2="{fy:.1f}" stroke="#eab308" stroke-width="1.4" stroke-dasharray="4 4"/><circle cx="{ox:.1f}" cy="{oy:.1f}" r="6" fill="#2563eb" stroke="#bfdbfe" stroke-width="2"/><path d="M{fx-7:.1f} {fy-7:.1f}L{fx+7:.1f} {fy+7:.1f}M{fx+7:.1f} {fy-7:.1f}L{fx-7:.1f} {fy+7:.1f}" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>')
        b.append(f'<text class="small" x="{ox+(10 if ox<cx else -70):.1f}" y="{oy-8+(i%2)*14:.1f}">{escape(d["label"])}</text>')
    b.append('<rect x="660" y="112" width="296" height="520" rx="14" fill="#111827" stroke="#334155"/><text class="label" x="682" y="142">Legend / angular gaps</text><circle cx="690" cy="168" r="6" fill="#2563eb" stroke="#bfdbfe" stroke-width="2"/><text class="small" x="708" y="172">Blue: app optical-vault direction</text><path d="M684 191L696 203M696 191L684 203" stroke="#f97316" stroke-width="3" stroke-linecap="round"/><text class="small" x="708" y="201">Orange: line to FE vault</text>')
    y=250
    for d in DATA['bodies']:
        w=min(220,d['separationDeg']/110*220); b.append(f'<text class="small" x="682" y="{y}">{escape(d["label"])}</text><text class="small" text-anchor="end" x="930" y="{y}">{d["separationDeg"]:.1f}°</text><rect x="682" y="{y+7}" width="220" height="7" rx="3" fill="#1f2937"/><rect x="682" y="{y+7}" width="{w:.1f}" height="7" rx="3" fill="#f97316"/>')
        y+=48
    return "".join(b)

def sun_geometry():
    sun=DATA['bodies'][0]
    b=[]
    b.append('<text class="title" x="40" y="42">Sun example: same ephemeris input, two different displayed directions</text>')
    b.append('<rect x="50" y="90" width="430" height="470" rx="16" fill="#111827" stroke="#334155"/><text class="label" x="75" y="125">A. Whole-world FE vault branch</text>')
    b.append('<circle cx="265" cy="330" r="170" fill="#0b1324" stroke="#475569" stroke-width="2"/><circle cx="245" cy="405" r="7" fill="#22c55e" stroke="#bbf7d0" stroke-width="2"/><text class="small" x="260" y="410">observer</text><circle cx="160" cy="230" r="8" fill="#f97316" stroke="#fed7aa" stroke-width="2"/><text class="small" x="174" y="226">drawn Sun vault</text><path class="arrowOrange" d="M245 405L160 230"/>')
    b.append('<path class="arrowBlue" d="M245 405L118 438"/><text class="small" x="75" y="520" fill="#fb923c">Orange: straight bearing to drawn FE vault point</text><text class="small" x="75" y="540" fill="#60a5fa">Blue: app optical azimuth from local-sky transform</text>')
    b.append('<rect x="530" y="90" width="420" height="470" rx="16" fill="#111827" stroke="#334155"/><text class="label" x="555" y="125">B. Local elevation comparison</text>')
    base_x,base_y=740,330
    b.append(f'<line x1="{base_x-140}" y1="{base_y}" x2="{base_x+140}" y2="{base_y}" stroke="#475569" stroke-width="2"/><path d="M{base_x-140} {base_y}A140 140 0 0 1 {base_x+140} {base_y}" fill="none" stroke="#334155"/>')
    for color,el,label in [('#60a5fa',sun['opticalElDeg'],'app optical'),('#fb923c',sun['lineToVaultElDeg'],'line to vault')]:
        x2=base_x+135*math.cos(math.radians(el)); y2=base_y-135*math.sin(math.radians(el)); marker='arrowBlue' if color=='#60a5fa' else 'arrowOrange'
        b.append(f'<line x1="{base_x}" y1="{base_y}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="3" marker-end="url(#{marker})"/><text class="small" x="555" y="{410 if color=="#60a5fa" else 435}" fill="{color}">{label}: el {el:.2f}°</text>')
    b.append(f'<text class="label" x="555" y="475">Full 3D angular gap: {sun["separationDeg"]:.2f}°</text><text class="small" x="555" y="505">Sun RA {sun["raDeg"]:.3f}° • Dec {sun["decDeg"]:.3f}° • vault z {sun["vaultZ"]:.3f}</text>')
    return "".join(b)

generated = [
    svg('pipeline-overview.svg', 1000, 820, pipeline_overview()),
    svg('coordinate-mismatch.svg', 1000, 720, mismatch()),
    svg('sun-pipeline-geometry.svg', 1000, 650, sun_geometry()),
]
for path in generated:
    print(path.relative_to(ROOT))
