import React, { useState } from 'react';
import { SCHEDULE } from '../data/schedule';
import { Car, Map, Clock, Settings, Calendar } from 'lucide-react';

export const ScheduleView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Day 1' | 'Day 2' | 'Overall'>('Day 1');

  // Map tabs to data days
  const dayMap: Record<string, 'Friday' | 'Saturday'> = {
    'Day 1': 'Friday',
    'Day 2': 'Saturday'
  };

  const activeDay = dayMap[activeTab];
  const events = activeDay
    ? SCHEDULE.filter(e => e.day === activeDay).sort((a, b) => a.startTime.localeCompare(b.startTime))
    : SCHEDULE; // Overall shows all (simplified)

  const getDateString = (day: string) => {
    return day === 'Friday' ? 'Friday • Jan 30' : 'Saturday • Jan 31';
  };

  // Mock calculation for "Leave By"
  const getLeaveTime = (startTime: string) => {
    // Subtract 30 mins for demo
    const [h, m] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m - 30);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#111] text-white pt-safe-top">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-[#111]">
        <div className="p-2 bg-blue-900/20 rounded-xl">
          <Calendar className="w-6 h-6 text-blue-500" />
        </div>
        <div className="text-center">
          <h1 className="font-bold text-lg">Sno*Drift 2026</h1>
          <p className="text-xs text-neutral-400 tracking-widest font-bold">SCHEDULE V3</p>
        </div>
        <Settings className="w-6 h-6 text-neutral-400" />
      </div>

      {/* Tabs */}
      <div className="flex px-4 border-b border-white/10">
        {['Day 1', 'Day 2', 'Overall'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`mr-6 py-3 font-bold text-sm relative ${
              activeTab === tab ? 'text-blue-500' : 'text-neutral-400'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {activeDay && (
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">{getDateString(activeDay)}</h2>
            {activeDay === 'Friday' && (
               <span className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-800">
                 ACTIVE STAGE
               </span>
            )}
          </div>
        )}

        {events.map((event) => {
          // Grouping logic simulation (e.g. Afternoon Session)
          // Just inserting a header before SS3/SS9 for demo
          const showHeader = (event.id === 'ss3' && activeTab === 'Day 1') || (event.id === 'ss13' && activeTab === 'Day 2');

          return (
            <React.Fragment key={event.id}>
              {showHeader && (
                <h3 className="font-bold text-lg mt-6 mb-2">Afternoon Session</h3>
              )}

              <div className="bg-[#1c1c1e] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 flex justify-between">
                  {/* Left Column */}
                  <div>
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">
                      {event.stageNumber ? 'Stage' : 'Event'}
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {event.stageNumber ? `SS${event.stageNumber}` : 'EXPO'}
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400 text-sm font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {event.startTime}
                    </div>
                  </div>

                  {/* Middle Column */}
                  <div className="flex-1 px-4">
                     <h3 className="font-bold text-white text-lg leading-tight mb-1">
                       {event.name.split(' - ')[0]} {/* Simplified name */}
                     </h3>
                     <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                       <Car className="w-3.5 h-3.5" />
                       <span>Drive: 18m</span> {/* Mock drive time */}
                     </div>
                  </div>

                  {/* Right Column */}
                  <div>
                     <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg text-center leading-tight transition-colors">
                       <div className="text-[9px] opacity-80 uppercase mb-0.5">Leave By</div>
                       {getLeaveTime(event.startTime)}
                     </button>
                  </div>
                </div>

                {/* Footer Button */}
                <button className="w-full bg-[#2c2c2e] hover:bg-[#3a3a3c] py-3 flex items-center justify-center gap-2 text-neutral-300 text-xs font-bold uppercase tracking-wider border-t border-white/5 transition-colors">
                  <Map className="w-3.5 h-3.5" />
                  Show Route
                </button>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
