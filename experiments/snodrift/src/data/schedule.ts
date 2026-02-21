import type { RallyEvent } from './types';

export const SCHEDULE: RallyEvent[] = [
  // Friday
  {
    id: 'fri_parc_expose',
    name: 'Parc Expose',
    day: 'Friday',
    startTime: '17:00',
    endTime: '18:00',
    locationId: 'lewiston_hq',
    description: 'Rally cars on display'
  },
  {
    id: 'ss1',
    name: 'SS1 Meaford - Mills',
    day: 'Friday',
    startTime: '18:25',
    stageNumber: 1,
    locationId: 'meaford'
  },
  {
    id: 'ss2',
    name: 'SS2 622 - East Branch',
    day: 'Friday',
    startTime: '18:55',
    stageNumber: 2
  },
  {
    id: 'ss3',
    name: 'SS3 Black River - Camp 30',
    day: 'Friday',
    startTime: '19:10',
    stageNumber: 3
  },
  {
    id: 'ss4',
    name: 'SS4 Huff - Old State',
    day: 'Friday',
    startTime: '19:40',
    stageNumber: 4,
    locationId: 'huff'
  },
  {
    id: 'ss5',
    name: 'SS5 Meaford - Mills',
    day: 'Friday',
    startTime: '21:15',
    stageNumber: 5,
    locationId: 'meaford'
  },
  {
    id: 'ss6',
    name: 'SS6 622 - East Branch',
    day: 'Friday',
    startTime: '21:45',
    stageNumber: 6
  },
  {
    id: 'ss7',
    name: 'SS7 Black River - Camp 30',
    day: 'Friday',
    startTime: '22:05',
    stageNumber: 7
  },
  {
    id: 'ss8',
    name: 'SS8 Huff - Old State',
    day: 'Friday',
    startTime: '22:30',
    stageNumber: 8,
    locationId: 'huff'
  },
  // Saturday
  {
    id: 'sat_parc_expose',
    name: 'Parc Expose',
    day: 'Saturday',
    startTime: '10:00',
    endTime: '11:00',
    locationId: 'atlanta_hq',
    description: 'Rally cars on display'
  },
  {
    id: 'ss9',
    name: 'SS9 Sage Creek - Von Dette',
    day: 'Saturday',
    startTime: '11:00',
    stageNumber: 9,
    locationId: 'sage_lake'
  },
  {
    id: 'ss10',
    name: 'SS10 Blue Lake - Fish Lab',
    day: 'Saturday',
    startTime: '11:40',
    stageNumber: 10,
    locationId: 'hunt_creek'
  },
  {
    id: 'ss11',
    name: 'SS11 Agren - Hunter',
    day: 'Saturday',
    startTime: '12:15',
    stageNumber: 11
  },
  {
    id: 'ss12',
    name: 'SS12 Orchard - Shoreline',
    day: 'Saturday',
    startTime: '12:40',
    stageNumber: 12,
    locationId: 'avery_lake'
  },
  {
    id: 'ss13',
    name: 'SS13 Sage Creek - Von Dette',
    day: 'Saturday',
    startTime: '14:10',
    stageNumber: 13,
    locationId: 'sage_lake'
  },
  {
    id: 'ss14',
    name: 'SS14 Blue Lake - Fish Lab',
    day: 'Saturday',
    startTime: '14:40',
    stageNumber: 14,
    locationId: 'hunt_creek'
  },
  {
    id: 'ss15',
    name: 'SS15 Agren - Hunter',
    day: 'Saturday',
    startTime: '15:15',
    stageNumber: 15
  },
  {
    id: 'ss16',
    name: 'SS16 Sage Creek - Von Dette',
    day: 'Saturday',
    startTime: '16:30',
    stageNumber: 16,
    locationId: 'sage_lake'
  }
];
