import React, { useState } from 'react';
import { LOCATIONS } from '../data/locations';
import travelTimesData from '../data/travelTimes.json';
import { Clock, MapPin, Car, ChevronDown, ChevronRight, Navigation } from 'lucide-react';

// Type for the JSON data structure
type TravelRoute = {
  distanceKm: number;
  durationMinutes: number;
};

type TravelTimes = {
  [originId: string]: {
    [destId: string]: TravelRoute;
  };
};

const travelTimes = travelTimesData as TravelTimes;

export const LogisticsView: React.FC = () => {
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>('cabin');

  const getLocationName = (id: string) => {
    const loc = LOCATIONS.find((l) => l.id === id);
    return loc ? loc.name : id;
  };

  const getGoogleMapsUrl = (originId: string, destId: string) => {
    const origin = LOCATIONS.find((l) => l.id === originId);
    const dest = LOCATIONS.find((l) => l.id === destId);

    if (origin && dest) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.coordinates[0]},${origin.coordinates[1]}&destination=${dest.coordinates[0]},${dest.coordinates[1]}&travelmode=driving`;
    }
    return '#';
  };

  const origins = Object.keys(travelTimes);

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
        <h2 className="text-xl font-bold text-cyan-400 mb-2 flex items-center gap-2">
          <Car className="w-6 h-6" />
          Travel Logistics
        </h2>
        <p className="text-slate-300 text-sm">
          Estimated drive times between key locations. Allow extra time for winter conditions (snow/ice).
        </p>
      </div>

      <div className="space-y-2">
        {origins.map((originId) => (
          <div key={originId} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
            <button
              onClick={() => setExpandedOrigin(expandedOrigin === originId ? null : originId)}
              className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">From</span>
                  <h3 className="font-bold text-slate-100">{getLocationName(originId)}</h3>
                </div>
              </div>
              {expandedOrigin === originId ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedOrigin === originId && (
              <div className="divide-y divide-slate-700/50 border-t border-slate-700">
                {Object.entries(travelTimes[originId])
                  .sort(([, a], [, b]) => a.durationMinutes - b.durationMinutes)
                  .map(([destId, route]) => (
                    <div key={destId} className="p-4 hover:bg-slate-700/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-slate-200">
                          To: <span className="text-cyan-300">{getLocationName(destId)}</span>
                        </div>
                        <a
                          href={getGoogleMapsUrl(originId, destId)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                          title="Open Route in Google Maps"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-amber-400 font-mono">
                          <Clock className="w-4 h-4" />
                          <span>{route.durationMinutes} min</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Car className="w-4 h-4" />
                          <span>{route.distanceKm.toFixed(1)} km</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
