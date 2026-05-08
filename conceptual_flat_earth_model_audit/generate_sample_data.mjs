import fs from 'node:fs';
import { FeModel } from './source/js/core/app.js';
import {
  feConceptualLocalGlobeUnit,
  localGlobeCoordToAngles,
  localGlobeCoordToGlobalFeCoord,
} from './source/js/core/transforms.js';

const BODY_NAMES = ['sun', 'moon', 'mars', 'jupiter', 'saturn'];
const STAR_IDS = ['sirius', 'polaris', 'arcturus', 'vega', 'betelgeuse'];

function round(x, n = 6) {
  return Number.isFinite(x) ? Number(x.toFixed(n)) : null;
}
function vec(v, n = 6) {
  return v.map((x) => round(x, n));
}
function dotSepDeg(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
}
function dateFromModelDateTime(dateTime) {
  return new Date(Date.UTC(2017, 0, 1) + dateTime * 86_400_000);
}
function bodyEntry(model, id) {
  const c = model.computed;
  if (id === 'sun') {
    return {
      id: 'sun', label: 'Sun', category: 'body', raDeg: c.SunRA * 180 / Math.PI,
      decDeg: c.SunDec * 180 / Math.PI, vaultCoord: c.SunVaultCoord,
      opticalAngles: c.SunAnglesGlobe, opticalLocalGlobe: c.SunLocalGlobeCoord,
    };
  }
  if (id === 'moon') {
    return {
      id: 'moon', label: 'Moon', category: 'body', raDeg: c.MoonRA * 180 / Math.PI,
      decDeg: c.MoonDec * 180 / Math.PI, vaultCoord: c.MoonVaultCoord,
      opticalAngles: c.MoonAnglesGlobe, opticalLocalGlobe: c.MoonLocalGlobeCoord,
    };
  }
  const p = c.Planets[id];
  return {
    id, label: id[0].toUpperCase() + id.slice(1), category: 'body',
    raDeg: p.ra * 180 / Math.PI, decDeg: p.dec * 180 / Math.PI,
    vaultCoord: p.vaultCoord, opticalAngles: p.anglesGlobe,
    opticalLocalGlobe: p.localGlobe || null, celestCoord: p.celestCoord,
  };
}
function starEntry(model, id) {
  const s = model.computed.CelNavStars.find((x) => x.id === id);
  return {
    id: `star:${id}`, label: s.name, category: 'star',
    raDeg: s.ra * 180 / Math.PI, decDeg: s.dec * 180 / Math.PI,
    vaultCoord: s.vaultCoord, opticalAngles: s.anglesGlobe,
    opticalLocalGlobe: null, celestCoord: s.celestCoord,
  };
}
function enrich(model, raw) {
  const c = model.computed;
  let opticalLocal = raw.opticalLocalGlobe;
  // Reconstruct local vector from az/el when the app entry doesn't retain it.
  if (!opticalLocal) {
    const az = raw.opticalAngles.azimuth * Math.PI / 180;
    const el = raw.opticalAngles.elevation * Math.PI / 180;
    opticalLocal = [Math.sin(el), Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az)];
  }
  const globalOpticalPoint = localGlobeCoordToGlobalFeCoord(opticalLocal, c.TransMatLocalFeToGlobalFe);
  const obs = c.ObserverFeCoord;
  const dir = [
    globalOpticalPoint[0] - obs[0],
    globalOpticalPoint[1] - obs[1],
    globalOpticalPoint[2] - obs[2],
  ];
  const vault = raw.vaultCoord;
  let rayAtVaultZ = null;
  let missDistance = null;
  let rayMode = 'above-horizon';
  if (dir[2] > 1e-9) {
    const t = (vault[2] - obs[2]) / dir[2];
    rayAtVaultZ = [obs[0] + dir[0] * t, obs[1] + dir[1] * t, vault[2]];
    missDistance = Math.hypot(rayAtVaultZ[0] - vault[0], rayAtVaultZ[1] - vault[1]);
  } else {
    rayMode = 'below-horizon';
    rayAtVaultZ = [obs[0] + dir[0] * 0.34, obs[1] + dir[1] * 0.34, obs[2] + dir[2] * 0.34];
  }
  const feLocal = feConceptualLocalGlobeUnit(vault, obs, c.TransMatLocalFeToGlobalFe);
  const feAngles = localGlobeCoordToAngles(feLocal);
  return {
    ...raw,
    raDeg: round(raw.raDeg, 6), decDeg: round(raw.decDeg, 6),
    vaultZ: round(vault[2], 6),
    vaultCoord: vec(vault), opticalAngles: {
      azimuth: round(raw.opticalAngles.azimuth, 6),
      elevation: round(raw.opticalAngles.elevation, 6),
    },
    opticalAzDeg: round(raw.opticalAngles.azimuth, 6),
    opticalElDeg: round(raw.opticalAngles.elevation, 6),
    lineToVaultAzDeg: round(feAngles.azimuth, 6),
    lineToVaultElDeg: round(feAngles.elevation, 6),
    separationDeg: round(dotSepDeg(opticalLocal, feLocal), 6),
    feLineAngles: {
      azimuth: round(feAngles.azimuth, 6),
      elevation: round(feAngles.elevation, 6),
    },
    rayAtVaultZ: vec(rayAtVaultZ), rayMode,
    missDistance: missDistance == null ? null : round(missDistance, 6),
  };
}

const model = new FeModel();
const useAppNow = process.argv.includes('--use-app-now');
let replayDateIso = null;
if (!useAppNow && fs.existsSync('conceptual_flat_earth_model_audit/pipeline-sample-data.json')) {
  try {
    replayDateIso = JSON.parse(fs.readFileSync('conceptual_flat_earth_model_audit/pipeline-sample-data.json', 'utf8')).dateIso;
  } catch {
    replayDateIso = null;
  }
}
if (replayDateIso) {
  model.state.DateTime = (new Date(replayDateIso).getTime() - Date.UTC(2017, 0, 1)) / 86_400_000;
}
model.update();
const entries = [
  ...BODY_NAMES.map((id) => bodyEntry(model, id)),
  ...STAR_IDS.map((id) => starEntry(model, id)),
].map((entry) => enrich(model, entry));
const output = {
  generatedFrom: 'conceptual_flat_earth_model_audit/source cloned app modules',
  appDefaultSnapshot: true,
  dateMode: useAppNow ? 'fresh-app-default-now' : 'replayed-committed-default-load-snapshot',
  observer: {
    latDeg: round(model.state.ObserverLat, 6),
    lonDeg: round(model.state.ObserverLong, 6),
  },
  dateIso: dateFromModelDateTime(model.state.DateTime).toISOString(),
  stateDefaultsUsed: {
    worldModel: model.state.WorldModel,
    bodySource: model.state.BodySource,
    refraction: model.state.Refraction,
    starTrepidation: model.state.StarTrepidation,
    starfieldVaultHeight: model.state.StarfieldVaultHeight,
    vaultHeight: model.state.VaultHeight,
    vaultSize: model.state.VaultSize,
    opticalVaultSize: model.state.OpticalVaultSize,
    opticalVaultHeight: model.state.OpticalVaultHeight,
  },
  gmstDeg: round(model.computed.SkyRotAngle, 6),
  observerFeCoord: vec(model.computed.ObserverFeCoord),
  bodies: entries,
};
fs.writeFileSync('conceptual_flat_earth_model_audit/pipeline-sample-data.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote conceptual_flat_earth_model_audit/pipeline-sample-data.json (${entries.length} objects, ${output.dateIso})`);
