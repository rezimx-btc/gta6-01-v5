# VELMARA HEAT

[![VELMARA HEAT](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/rezimx-btc/gta6-01-v5/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/rezimx-btc/gta6-01-v5/reward.svg)](https://make.fun/bounty/gta6-01)

A 3D open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). It runs entirely
offline in a desktop browser from static files — no network requests, no
build step. Three.js r160 is vendored under `game/vendor/`.

## The game

You are Rio "Wavelength" Vega, getaway driver by night and pirate-radio DJ
by day, in the sun-soaked coastal city of **Velmara Bay**. Your live
broadcast on **WAVE 98** is more than a show: the listener count it pulls
is a second currency. Drive well, drift hard, finish missions while on air,
and the city tunes in. Spend listeners on unlocks no cash can buy.

- **Open world**: a full coastal city — downtown towers, the harbor, the
  boardwalk, suburbs — explored on foot (5 km/h walk) and by car. Steal any
  parked car with `E`.
- **Wanted 0–5**: police cars chase you when the heat rises; above wanted 3
  a police helicopter circles overhead with a spotlight. Lay low to cool off.
- **8 missions, 3 acts**: radio callers and fixers send you on timed
  deliveries, tail jobs and escapes. Missions pay cash and listeners.
- **3 radio stations**: WAVE 98 (pirate talk), Neon FM (synth), Tide AM
  (oldies). Switch with `R`. The music is synthesized live with WebAudio.
- **3 shops**: pistol $800, neon outfit $350, turbo mod $1200. Walk up to a
  shop marker and press `E`.
- **Combat**: pistol on foot (`Click` to fire). Shooting raises your wanted
  level.
- **Traffic and pedestrians**: cars cruise the avenues, pedestrians walk the
  sidewalks, the harbor beacon sweeps the bay at dusk.
- **HUD**: minimap, wanted stars, cash, listeners, clock, health, current
  station, mission banner.
- **Save**: progress (cash, listeners, missions, owned items) persists in
  localStorage.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` | Walk / drive |
| `Shift` | Sprint on foot / handbrake in car |
| `E` | Enter or exit car / buy at a shop |
| `R` | Switch radio station |
| `M` | Mute audio |
| `Click` | Fire pistol (on foot, when owned) |
| `P` / `Esc` | Pause |
| `Mouse` | Look around (drag) |

## Play it

```sh
node serve.ts --port 8082
```

Then open http://localhost:8082 in desktop Chrome.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's vendored library.

## Screenshots

Four real renders of the game itself, in `screenshots/`:

1. `1-chase.jpg` — a police chase at wanted 3
2. `2-drive.jpg` — driving down the main avenue
3. `3-mission.jpg` — a mission marker live on the HUD
4. `4-heli.jpg` — the police helicopter overhead at wanted 4

## Tips

- Listeners are a second currency: drift with the handbrake (`Shift`) and
  thread near misses in traffic to grow the WAVE 98 audience fast.
- The wanted level cools off only when you lay low — duck down a side
  street and stay out of sight for a few seconds.
- The turbo mod ($1200 at Vega Motors) is the single biggest speed gain in
  the game; buy it before the Act III timed run.
- Missions pay in cash and listeners. Finishing all eight ends the story
  with the live Prime Time finale on the studio rooftop.

## License

MIT — see `LICENSE`.
