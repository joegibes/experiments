export interface Location {
  id: string;
  name: string;
  type: 'hq' | 'cabin' | 'spectator' | 'stage_start';
  coordinates: [number, number]; // [lat, lng]
  description?: string;
  stages?: number[]; // SS numbers associated with this location
}

export interface RallyEvent {
  id: string;
  name: string;
  day: 'Friday' | 'Saturday';
  startTime: string; // HH:mm format
  endTime?: string;
  locationId?: string;
  stageNumber?: number;
  description?: string;
}

export interface TravelTime {
  toId: string;
  durationMinutes: number;
  distanceKm: number;
}
