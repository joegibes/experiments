import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LOCATIONS } from '../data/locations';
import { STAGE_TRACES } from '../data/stage_traces';
import { SCHEDULE } from '../data/schedule';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, Home, Flag, Cloud, ArrowRight, Camera, Tent } from 'lucide-react';
import L from 'leaflet';
import type { RallyEvent } from '../data/types';

// Fix for default marker icons in Leaflet
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// --- Components ---

const LocationMarker = ({ location }: { location: any }) => {
  const getIcon = (type: string) => {
    let IconComponent = MapPin;
    // Cyberpunk/Dark mode colors
    let color = 'text-cyan-400 border-cyan-400';
    let bg = 'bg-neutral-900';

    switch (type) {
      case 'cabin':
        IconComponent = Home;
        color = 'text-emerald-400 border-emerald-400';
        break;
      case 'hq':
        IconComponent = Flag;
        color = 'text-rose-500 border-rose-500';
        break;
      case 'spectator':
        IconComponent = Camera; // Changed to Camera for spectator
        color = 'text-amber-500 border-amber-500';
        break;
    }

    const html = renderToStaticMarkup(
      <div className={`p-1.5 ${bg} rounded-full border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${color}`}>
        <IconComponent size={18} fill="currentColor" className="opacity-100" />
      </div>
    );

    return divIcon({
      html,
      className: 'bg-transparent',
      iconSize: [32, 32],
      iconAnchor: [16, 16], // Centered
      popupAnchor: [0, -20],
    });
  };

  return (
    <Marker position={location.coordinates} icon={getIcon(location.type)}>
      <Popup className="dark-popup">
        <div className="text-neutral-900 min-w-[150px]">
          <h3 className="font-bold text-lg">{location.name}</h3>
          <p className="text-sm text-neutral-600 mb-2">{location.description}</p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates[0]},${location.coordinates[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-bold hover:bg-blue-700 transition-colors"
          >
            Navigate
          </a>
        </div>
      </Popup>
    </Marker>
  );
};

const UserLocationMarker = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    });
  }, [map]);

  if (!position) return null;

  const icon = divIcon({
    html: '<div class="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(34,211,238,0.8)] pulse"></div>',
    className: 'bg-transparent',
    iconSize: [16, 16],
  });

  return <Marker position={position} icon={icon}><Popup>You are here</Popup></Marker>;
};

const StagePolyline = ({ id, positions }: { id: string, positions: [number, number][] }) => {
  // Cycle colors based on ID hash or number
  const colors = ['#ef4444', '#f97316', '#3b82f6']; // Red, Orange, Blue
  const numId = parseInt(id.replace(/\D/g, '')) || 0;
  const color = colors[numId % colors.length];

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: color,
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'glow-line' // We can add CSS for glow if needed
      }}
    >
      <Popup>Stage {id}</Popup>
    </Polyline>
  );
};

// --- Bottom Sheet / Dashboard Overlay ---

const DashboardOverlay = () => {
  const [nextEvent, setNextEvent] = useState<RallyEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    // 1. Mock Next Event logic (find first event in future, or just Stage 4 for demo matching screenshot)
    // For demo/screenshot fidelity, let's pick "Stage 4" (SS4) if possible, or just the first one.
    // The screenshot says "Next: Sage Lake", which is SS9, SS13, SS16 in my data.
    // Let's just find the next actual event based on current time mock
    const upcoming = SCHEDULE.find(s => s.id === 'ss9') || SCHEDULE[0];
    setNextEvent(upcoming);

    // 2. Weather
    fetch("https://api.open-meteo.com/v1/forecast?latitude=44.8850&longitude=-84.3050&current=temperature_2m,weather_code&temperature_unit=fahrenheit")
      .then(r => r.json())
      .then(setWeather)
      .catch(console.error);

    // 3. Countdown Timer
    const target = new Date();
    target.setMinutes(target.getMinutes() + 45); // Mock: starts in 45m

    const interval = setInterval(() => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ h, m, s });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!nextEvent) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-[1000]">
      <div className="bg-[#1c1917]/90 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-white/10 text-white">

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-orange-500 fill-orange-500" />
              <h2 className="font-bold text-lg">Next: {nextEvent.name.split(' - ')[0]}</h2>
            </div>
            <p className="text-neutral-400 text-sm">
              Stage {nextEvent.stageNumber} starts in 45m
            </p>
          </div>
          <button className="bg-neutral-800 p-2 rounded-full hover:bg-neutral-700 transition-colors">
            <ArrowRight className="w-5 h-5 text-orange-500" />
          </button>
        </div>

        {/* Timers */}
        <div className="flex gap-3 mb-5">
          {['HRS', 'MIN', 'SEC'].map((label, i) => {
            const val = i === 0 ? timeLeft.h : i === 1 ? timeLeft.m : timeLeft.s;
            return (
              <div key={label} className="bg-neutral-800/50 rounded-2xl p-3 flex-1 text-center border border-white/5">
                <div className="text-2xl font-bold font-mono text-white">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-neutral-500 font-bold tracking-wider mt-1">{label}</div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3.5 rounded-2xl mb-4 transition-colors">
          View All Stages
        </button>

        {/* Info Chips */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-center gap-2 bg-neutral-800/50 px-4 py-2 rounded-xl border border-white/5 whitespace-nowrap">
            <Tent className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-neutral-300">Spectator Area</span>
          </div>

          <div className="flex items-center gap-2 bg-neutral-800/50 px-4 py-2 rounded-xl border border-white/5 whitespace-nowrap min-w-[140px]">
            <Cloud className="w-4 h-4 text-neutral-400" />
            <div className="flex flex-col leading-none">
              <span className="text-xs text-neutral-400 mb-0.5">Comins, MI</span>
              <span className="text-sm font-bold text-white">
                {weather ? `${weather.current.temperature_2m}°F` : '--°F'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export const MapView: React.FC = () => {
  // Center roughly between Atlanta and Lewiston
  const center: [number, number] = [44.95, -84.22];

  return (
    <div className="h-full w-full relative bg-black">
      {/* Top Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-safe-top bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          <h1 className="text-xl font-bold text-white drop-shadow-md">Sno*Drift 2026</h1>
          <Cloud className="text-white w-6 h-6" />
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={10}
        className="h-full w-full bg-[#111]"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />
        <ZoomControl position="topright" />

        {/* Render Locations */}
        {LOCATIONS.map(loc => (
          <LocationMarker key={loc.id} location={loc} />
        ))}

        {/* Render Stage Traces */}
        {Object.entries(STAGE_TRACES).map(([id, coords]) => (
          <StagePolyline key={id} id={id} positions={coords} />
        ))}

        <UserLocationMarker />
      </MapContainer>

      {/* Bottom Sheet UI */}
      <DashboardOverlay />
    </div>
  );
};
