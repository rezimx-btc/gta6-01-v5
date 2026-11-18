// VELMARA HEAT — every number the game runs on, in one place.
// Velmara Bay is a coastal grid city: 8 by 8 blocks, streets between them,
// the harbor and the sea along the south edge.

export const CITY = {
  blocks: 8,
  blockSize: 44,
  streetWidth: 14,
  // Full span of the drivable grid, in metres, centred on the origin.
  span: 8 * 44 + 9 * 14,
  sidewalkWidth: 3,
  maxBuildingHeight: 52,
  minBuildingHeight: 8,
};

export const PLAYER = {
  walkSpeed: 1.39, // 5 km/h, on foot
  sprintSpeed: 2.7,
  radius: 0.55,
  health: 100,
  startCash: 250,
  startListeners: 120,
};

export const CAR = {
  accel: 15,
  brake: 30,
  maxSpeed: 38,
  maxReverse: 13,
  turboMaxSpeed: 49,
  turnRate: 1.9,
  drag: 0.4,
};

export const WANTED = {
  max: 5,
  heliAt: 3,
  decayDelay: 9,
  decayRate: 0.12,
  // Police cars on the street per wanted level.
  policePerLevel: [0, 1, 2, 3, 4, 5],
};

export const RADIO_STATIONS = [
  { id: 'wave98', name: 'WAVE 98', tag: 'PIRATE TALK', color: '#ff2e88', bpm: 112 },
  { id: 'neonfm', name: 'Neon FM', tag: 'SYNTH', color: '#22d3ee', bpm: 126 },
  { id: 'tideam', name: 'Tide AM', tag: 'OLDIES', color: '#fbbf24', bpm: 88 },
];

export const SHOPS = [
  { id: 'pistol', name: 'Iron & Ink Guns', item: 'Pistol', price: 800, blurb: 'A loud argument-ender.' },
  { id: 'outfit', name: 'Neon Thread', item: 'Neon Fit', price: 350, blurb: 'Glow so the city sees you.' },
  { id: 'turbo', name: 'Vega Motors', item: 'Turbo Mod', price: 1200, blurb: 'Top speed 38 to 49 m/s.' },
];

// Listener economy: the WAVE 98 audience is a second currency.
export const LISTENERS = {
  perDriftSecond: 6,
  perNearMiss: 25,
  perMission: 400,
  perMinuteOnAir: 15,
  unlockCost: 500,
};

export const MISSIONS = [
  { id: 1, act: 1, name: 'First Broadcast', type: 'goto', giver: 'WAVE 98', pay: 300, listeners: 400,
    brief: 'Get to the rooftop antenna above the studio and light the signal.' },
  { id: 2, act: 1, name: 'Midnight Cassette', type: 'timed', giver: 'Mara the Fixer', pay: 450, listeners: 350,
    brief: 'A cassette for the harbor buyer. 90 seconds. No questions.', time: 90 },
  { id: 3, act: 1, name: 'Tail the Van', type: 'tail', giver: 'Caller 7', pay: 500, listeners: 450,
    brief: 'Follow the grey van for 45 seconds. Do not let it spot you.', time: 45 },
  { id: 4, act: 2, name: 'Dead Air', type: 'chain', giver: 'WAVE 98', pay: 600, listeners: 500,
    brief: 'Three relay points are dark. Light them all, in order.' },
  { id: 5, act: 2, name: 'Getaway Practice', type: 'escape', giver: 'Mara the Fixer', pay: 650, listeners: 550,
    brief: 'Stir up wanted level 2, then lose the heat completely.' },
  { id: 6, act: 2, name: 'The Interview', type: 'ferry', giver: 'Caller 7', pay: 700, listeners: 600,
    brief: 'Pick up the singer at the boardwalk. Drop her at the studio.' },
  { id: 7, act: 3, name: 'Signal Jam', type: 'timed', giver: 'WAVE 98', pay: 900, listeners: 800,
    brief: 'Cross the whole city in 120 seconds with the cops already on you.', time: 120, startWanted: 2 },
  { id: 8, act: 3, name: 'Prime Time', type: 'escape', giver: 'Mara the Fixer', pay: 1200, listeners: 1200,
    brief: 'Lose wanted level 4, then reach the rooftop for the live finale.', startWanted: 4 },
];

export const ACT_NAMES = { 1: 'ACT I — THE SIGNAL', 2: 'ACT II — STATIC', 3: 'ACT III — PRIME TIME' };

// Sun-soaked Velmara palette.
export const PALETTE = {
  skyTop: 0x7ec8e3,
  skyBottom: 0xffe8c9,
  sun: 0xfff2cc,
  sea: 0x1e7f8e,
  sand: 0xe8d5a8,
  road: 0x2e3440,
  roadLine: 0xf5d76e,
  sidewalk: 0xb8b0a0,
  building: [0xe8dcc8, 0xd9c4a5, 0xc9b8a3, 0xf0e6d2, 0xcfd8dc, 0xe6c9c9],
  buildingGlass: 0x9fd8e8,
  neonPink: 0xff2e88,
  neonCyan: 0x22d3ee,
  palmTrunk: 0x8a6b4f,
  palmLeaf: 0x3fae6a,
  carPaint: [0xd43d2a, 0x2a6fd4, 0xf2c230, 0x37b268, 0xe8e8e8, 0x222831, 0x8e44ad, 0xff7f2a],
  policePaint: 0x1f2937,
  policeLightRed: 0xff2020,
  policeLightBlue: 0x2040ff,
};

export const STEP = 1 / 60;
