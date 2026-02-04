import React, { useState } from 'react';
import { SCHEDULE } from '../data/schedule';
import { MapPin } from 'lucide-react';
import { LOCATIONS } from '../data/locations';

export const ScheduleView: React.FC = () => {
  const [activeDay, setActiveDay] = useState<'Friday' | 'Saturday'>('Friday');

  const events = SCHEDULE.filter(e => e.day === activeDay).sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      <div className="flex border-b border-neutral-800">
        {(['Friday', 'Saturday'] as const).map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`flex-1 py-4 font-bold text-center ${
              activeDay === day
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-neutral-500'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {events.map(event => {
          const location = LOCATIONS.find(l => l.id === event.locationId);
          return (
            <div key={event.id} className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white">{event.name}</h3>
                <span className="bg-neutral-700 text-xs px-2 py-1 rounded text-neutral-300 font-mono">
                  {event.startTime}
                </span>
              </div>

              {event.description && (
                <p className="text-sm text-neutral-400 mb-2">{event.description}</p>
              )}

              {location && (
                <div className="flex items-center text-sm text-blue-400 mt-2">
                  <MapPin size={14} className="mr-1" />
                  <span>{location.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
