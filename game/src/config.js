// Merapi Sky Run — tuning, missions, ring layouts, palette.
// One island, one volcano, one runway. All distances in metres, speeds in m/s.

var MSR_CONFIG = (function () {
  var ISLAND_RADIUS = 1900;      // island falls to sea at this radius
  var VOLCANO = { x: -150, z: -650, height: 430, craterRadius: 150 };
  var RUNWAY = { x: 0, z: 1380, heading: 90, length: 620, width: 34, elevation: 9 };
  var CITY = { x: 260, z: 1150 }; // town blocks beside the runway

  // Flight model tuning (arcade, forgiving, but stall and fuel bite).
  var FLIGHT = {
    maxSpeed: 92,        // m/s at full throttle, level
    minFlySpeed: 26,     // below this the wing quits
    accel: 14,           // m/s^2 per full throttle
    drag: 0.08,          // quadratic-ish drag factor (level max ~84 m/s)
    pitchRate: 0.85,     // rad/s at full elevator
    rollRate: 1.9,       // rad/s at full aileron
    yawRate: 0.45,       // rad/s at full rudder
    turnCoord: 0.55,     // how much bank turns the nose
    gravity: 9.81,
    climbFactor: 0.55,   // lift turned into climb
    fuelCapacity: 100,   // percent
    fuelBurn: 0.55,      // %/s at full throttle
    fuelBurnIdle: 0.10,  // %/s at idle
    crashSpeed: 34,      // vertical speed (m/s) that breaks the gear on touchdown
    damagePerHit: 34,    // % damage from a hard terrain strike
    scorePerRing: 250,
    scorePerSecondBonus: 12,
    landingQualityMax: 1500
  };

  // Ring course 1: a tour of the whole island, low over beach and town.
  var RALLY_RINGS = [
    { x: 0, z: 1050, y: 130, r: 26 },
    { x: 900, z: 900, y: 170, r: 26 },
    { x: 1500, z: 100, y: 210, r: 26 },
    { x: 1100, z: -900, y: 260, r: 26 },
    { x: 100, z: -1250, y: 300, r: 26 },
    { x: -1000, z: -950, y: 280, r: 26 },
    { x: -1500, z: 0, y: 220, r: 26 },
    { x: -900, z: 950, y: 160, r: 26 }
  ];

  // Ring course 2: tight laps around the volcano crater, high and thin.
  var VOLCANO_RINGS = [
    { x: 420, z: -650, y: 480, r: 24 },
    { x: -150, z: -80, y: 520, r: 24 },
    { x: -720, z: -650, y: 480, r: 24 },
    { x: -150, z: -1220, y: 520, r: 24 },
    { x: 300, z: -1080, y: 560, r: 24 },
    { x: -600, z: -220, y: 560, r: 24 }
  ];

  // Mission 3: take off from runway 09, round the sea beacon, land back on 09.
  var BEACON = { x: 1500, z: 1450, y: 60, r: 40 };

  var MISSIONS = {
    rally: {
      id: 'rally', name: 'RING RALLY', rings: RALLY_RINGS,
      brief: 'Fly all 8 rings in order, then land on runway 09. Fuel is limited — smooth is fast.',
      start: { x: 0, z: 1380, y: 11, heading: 90, speed: 0 },
      parTime: 240
    },
    volcano: {
      id: 'volcano', name: 'VOLCANO CIRCUIT', rings: VOLCANO_RINGS,
      brief: 'Six rings over the crater of Mount Merapi. Thin air up high — keep your speed up.',
      start: { x: 0, z: 1380, y: 11, heading: 90, speed: 0 },
      parTime: 210
    },
    landing: {
      id: 'landing', name: 'ISLAND LANDING', rings: [],
      brief: 'Take off from runway 09, round the sea beacon east of the island, and land back on 09. A gentle touchdown scores best.',
      start: { x: 0, z: 1380, y: 11, heading: 90, speed: 0 },
      parTime: 300
    }
  };

  var PALETTE = {
    skyTop: 0x2f6fb4, skyHorizon: 0xcfe8f5, sea: 0x1d6f8e, seaDeep: 0x0f4a66,
    sand: 0xd9c08a, grass: 0x4f8f3a, grassDry: 0x7da24a, rock: 0x6e6a63,
    volcanoRock: 0x4a4038, lava: 0xff6a1f, runway: 0x3a3f45, runwayMark: 0xf5f2e8,
    planeBody: 0xff7a1a, planeWing: 0xfff3d6, ring: 0xffc93d, ringNext: 0x37e08b
  };

  return {
    ISLAND_RADIUS: ISLAND_RADIUS, VOLCANO: VOLCANO, RUNWAY: RUNWAY, CITY: CITY,
    FLIGHT: FLIGHT, MISSIONS: MISSIONS, BEACON: BEACON, PALETTE: PALETTE
  };
})();
