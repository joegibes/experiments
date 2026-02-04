import type { Location } from './types';

export const LOCATIONS: Location[] = [
  {
    id: 'cabin',
    name: 'The Cabin',
    type: 'cabin',
    coordinates: [44.808, -84.055],
    description: '2146 Pocahontas Trl, Comins, MI 48619'
  },
  {
    id: 'lewiston_hq',
    name: 'Lewiston (Parc Expose)',
    type: 'hq',
    coordinates: [44.8850, -84.3050],
    description: 'Downtown Lewiston'
  },
  {
    id: 'atlanta_hq',
    name: 'Atlanta (Parc Expose)',
    type: 'hq',
    coordinates: [45.0047, -84.1439],
    description: 'Downtown Atlanta, Briley Township Park'
  },
  {
    id: 'huff',
    name: 'Huff - Old State',
    type: 'spectator',
    coordinates: [45.046800, -84.334100],
    stages: [4, 8],
    description: "Aunt Fern's"
  },
  {
    id: 'meaford',
    name: 'Meaford - Mills',
    type: 'spectator',
    coordinates: [45.051944, -84.203611],
    stages: [1, 5]
  },
  {
    id: 'sage_lake',
    name: 'Sage Creek - Von Dette',
    type: 'spectator',
    coordinates: [44.926944, -84.148889],
    stages: [9, 13, 16]
  },
  {
    id: 'avery_lake',
    name: 'Orchard - Shoreline',
    type: 'spectator',
    coordinates: [44.902112, -84.202046],
    stages: [12]
  },
  {
    id: 'hunt_creek',
    name: 'Blue Lakes - Fish Lab',
    type: 'spectator',
    coordinates: [44.867683, -84.131761],
    stages: [10, 14]
  }
];
