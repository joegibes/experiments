import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LOCATIONS } from '../data/locations';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, Home, Flag, Tent } from 'lucide-react';

// Fix for default marker icons in Leaflet with bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import L from 'leaflet';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const LocationMarker = ({ location }: { location: any }) => {
  const getIcon = (type: string) => {
    let IconComponent = MapPin;
    let color = 'text-blue-500';

    switch (type) {
      case 'cabin': IconComponent = Home; color = 'text-green-500'; break;
      case 'hq': IconComponent = Flag; color = 'text-red-500'; break;
      case 'spectator': IconComponent = Tent; color = 'text-orange-500'; break;
    }

    const html = renderToStaticMarkup(
      <div className={`p-1 bg-white rounded-full border-2 border-neutral-800 shadow-lg ${color}`}>
        <IconComponent size={20} fill="currentColor" className="opacity-20" />
      </div>
    );

    return divIcon({
      html,
      className: 'bg-transparent',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  return (
    <Marker position={location.coordinates} icon={getIcon(location.type)}>
      <Popup>
        <div className="text-neutral-900">
          <h3 className="font-bold">{location.name}</h3>
          <p className="text-sm">{location.description}</p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates[0]},${location.coordinates[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm mt-1 block"
          >
            Open in Google Maps
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
      // map.flyTo(e.latlng, map.getZoom()); // Don't auto fly, might be annoying
    });
  }, [map]);

  if (!position) return null;

  const icon = divIcon({
    html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg pulse"></div>',
    className: 'bg-transparent',
    iconSize: [16, 16],
  });

  return <Marker position={position} icon={icon}><Popup>You are here</Popup></Marker>;
};

export const MapView: React.FC = () => {
  // Center roughly between Atlanta and Lewiston
  const center: [number, number] = [44.95, -84.22];

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={10}
        className="h-full w-full bg-neutral-900"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark" // We'll add some CSS to darken the tiles
        />
        <ZoomControl position="topright" />

        {LOCATIONS.map(loc => (
          <LocationMarker key={loc.id} location={loc} />
        ))}

        <UserLocationMarker />
      </MapContainer>
    </div>
  );
};
