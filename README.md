[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun rank](https://make.fun/badge/best-flight-game-20261126-0057/rdpratama/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun reward](https://make.fun/badge/best-flight-game-20261126-0057/rdpratama/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# MERAPI SKY RUN — Volcano Island Ring Rally

A complete 3D flight game for the [make.fun best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057). Fly the Kestrel bush plane around a living volcano island: race the ring courses, mind your fuel, and bring her home to runway 09.

## How to play

- **Throttle** `W` / `S` (or `Shift` / `Ctrl`), **pitch** `↑` / `↓`, **roll** `←` / `→`, **rudder** `A` / `D`. Mouse drag also flies the stick.
- `B` airbrake, `G` landing gear, `F` flaps, `C` cockpit / chase camera, `P` pause, `M` sound.
- Pick a mission on the title screen (or keys `1` / `2` / `3`):
  1. **Ring Rally** — 8 rings around the island, race the clock, then land on runway 09.
  2. **Volcano Circuit** — 6 rings over the crater of Mount Merapi, high and tight.
  3. **Island Landing** — take off, round the sea beacon, land back on 09. A gentle touchdown scores best.
- Rings pay 250 points each, the beacon 500, a good landing up to 1500, plus a time bonus. Fuel burns with throttle — an empty tank means gliding home. Hard touchdowns and hillside strikes damage the airframe; 100% damage ends the flight.

## What is in the game

- 3D island with a volcano crater (glowing lava, smoke column), coastline and beaches, a town beside the runway, mountains, drifting clouds, and a sea beacon.
- Runway 09 with centreline, threshold bars, PAPI lights, windsock, hangars and a control tower.
- Chase and cockpit cameras; cockpit view has a lit instrument panel (airspeed, altitude, heading, fuel) plus the HUD's attitude ball, compass tape, throttle / fuel / damage bars, and climb rate.
- Arcade flight model with lift, stall, coordinated turns, ground effect-free takeoffs and landings, and landing-quality scoring.
- Synthesized WebAudio: engine drone that follows RPM, wind that follows airspeed, ring chimes, touchdown thud, crash and fanfare.

## Play it

Serve `game/` with any static HTTP server and open `game/index.html` in a desktop browser. No network requests, no build step — all art is built from Three.js primitives and all sounds are synthesized with WebAudio. Three.js r149 is vendored under `game/vendor/`.

## Layout

- `game/index.html` — the page and HUD
- `game/style.css` — HUD and screen styling
- `game/src/config.js` — tuning, missions, ring layouts
- `game/src/noise.js` — seeded noise and the island height function
- `game/src/terrain.js` — island mesh, sea, runway, town, volcano, clouds
- `game/src/aircraft.js` — the Kestrel bush plane and the flight model
- `game/src/rings.js` — ring course, pass detection, beacon
- `game/src/audio.js` — synthesized engine, wind and effects
- `game/src/input.js` — keyboard and mouse
- `game/src/hud.js` — HUD readouts, compass tape, attitude ball, cockpit gauges
- `game/src/shots.js` — deterministic screenshot poses (`?shot=1..4`)
- `game/src/main.js` — boot, game loop, cameras, missions, scoring
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `screenshots/` — 4 real renders of the game's own code
