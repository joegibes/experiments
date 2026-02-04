import React, { useEffect, useState } from 'react';
import { Cloud, Droplets, Thermometer, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { SCHEDULE } from '../data/schedule';
import { LOCATIONS } from '../data/locations';
import type { RallyEvent } from '../data/types';

type WeatherData = {
  current: {
    temperature_2m: number;
    precipitation: number;
    weather_code: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    time: string[];
  };
};

export const DashboardView: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [nextEvent, setNextEvent] = useState<RallyEvent | null>(null);

  useEffect(() => {
    // 1. Fetch Weather
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=44.8850&longitude=-84.3050&current=temperature_2m,weather_code,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FDetroit&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
        );
        const data = await res.json();
        setWeather(data);
      } catch (e) {
        console.error("Failed to fetch weather", e);
      } finally {
        setLoadingWeather(false);
      }
    };
    fetchWeather();

    // 2. Find Next Event
    // For demo purposes, if the date is not during the rally (Feb 2026),
    // we show the first event of the rally.
    const now = new Date();
    // Feb 2026 dates (Estimate)
    const rallyStart = new Date('2026-02-06T00:00:00');

    if (now < rallyStart) {
      setNextEvent(SCHEDULE[0]);
    } else {
      // Logic to find next event based on time would go here
      // But simpler to just show the first one or a random one for the 'experiment' context
      // unless we mock the date.
      setNextEvent(SCHEDULE[0]);
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code <= 3) return <Cloud className="w-8 h-8 text-yellow-400" />;
    if (code <= 67) return <Droplets className="w-8 h-8 text-blue-400" />;
    return <Cloud className="w-8 h-8 text-slate-400" />;
  };

  const getLocationName = (id?: string) => {
    if (!id) return 'Stage Route';
    const loc = LOCATIONS.find(l => l.id === id);
    return loc ? loc.name : id;
  };

  return (
    <div className="space-y-4 pb-20">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Snodrift 2026</h1>
          <p className="text-slate-400 text-sm">Rally Companion</p>
        </div>
        <div className="bg-cyan-900/30 text-cyan-400 px-3 py-1 rounded-full text-xs font-mono border border-cyan-800">
          OFFLINE READY
        </div>
      </header>

      {/* Next Up Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-5 border border-indigo-700/50 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-indigo-100 uppercase tracking-wider text-sm">Next Up</h2>
        </div>

        {nextEvent ? (
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-white">{nextEvent.name}</h3>
              <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded font-mono">
                {nextEvent.startTime}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{getLocationName(nextEvent.locationId)}</span>
            </div>

            {nextEvent.description && (
              <p className="text-sm text-slate-400 bg-black/20 p-3 rounded-lg border border-white/5">
                {nextEvent.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-slate-400">No upcoming events found.</p>
        )}
      </div>

      {/* Weather Widget */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-slate-100 uppercase tracking-wider text-sm">Local Weather</h2>
          </div>
          <span className="text-xs text-slate-500">Lewiston, MI</span>
        </div>

        {loadingWeather ? (
          <div className="animate-pulse flex space-x-4">
            <div className="h-10 w-10 bg-slate-700 rounded-full"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        ) : weather ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {getWeatherIcon(weather.current.weather_code)}
                <div>
                  <div className="text-3xl font-bold text-white">{weather.current.temperature_2m}°F</div>
                  <div className="text-sm text-slate-400">Current</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end text-blue-300">
                  <Droplets className="w-4 h-4" />
                  <span className="font-mono">{weather.current.precipitation}"</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Precipitation</div>
              </div>
            </div>

            {/* Daily Forecast Mini */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-700 pt-4">
              {weather.daily.time.slice(0, 3).map((time, idx) => (
                <div key={time} className="text-center">
                  <div className="text-xs text-slate-500 mb-1">
                    {new Date(time).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="font-mono text-sm text-white">
                    {Math.round(weather.daily.temperature_2m_max[idx])}°
                    <span className="text-slate-500 text-xs"> / {Math.round(weather.daily.temperature_2m_min[idx])}°</span>
                  </div>
                  <div className="text-xs text-blue-400 mt-1">
                    {weather.daily.precipitation_probability_max[idx]}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-500 bg-amber-900/20 p-3 rounded">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">Weather data unavailable offline</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-700 transition-colors">
            <Calendar className="w-6 h-6 text-purple-400" />
            <span className="text-sm font-medium text-slate-200">Full Schedule</span>
        </button>
        <button className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-700 transition-colors">
            <MapPin className="w-6 h-6 text-green-400" />
            <span className="text-sm font-medium text-slate-200">Course Map</span>
        </button>
      </div>
    </div>
  );
};
