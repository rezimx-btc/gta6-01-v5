// VELMARA HEAT — the 8 missions in 3 acts. Each mission is a small state
// machine over one objective type: goto a marker, beat a timer, tail a van,
// light relay points in order, lose the heat, or ferry a passenger. A
// glowing beacon marks the current objective; completing one pays cash and
// listeners and opens the next.

import * as THREE from 'three';
import { MISSIONS, ACT_NAMES } from './config.js';
import { buildCarMesh } from './traffic.js';
import { pick } from './random.js';

export function createMissions(scene, city, rng, playerState, police) {
  const state = {
    index: 0,
    phase: 'idle',
    objective: null,
    timer: 0,
    chainStep: 0,
    chainPoints: [],
    tailTime: 0,
    tailLost: 0,
    escaped: false,
    pickedUp: false,
    text: 'Drive to the WAVE 98 studio to start Act I.',
  };

  // The beacon: a pulsing pink column over the objective.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.55 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 10, 1, true), beaconMat);
  beacon.visible = false;
  scene.add(beacon);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.8 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 4.4, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // The tail van for mission 3: a grey van circling the avenues.
  const van = buildCarMesh(0x6b7280);
  van.scale.set(1.1, 1.15, 1.25);
  scene.add(van);
  const vanState = { x: city.streets[2], z: city.streets[5], heading: 0, speed: 9, tx: city.streets[2], tz: city.streets[1] };
  van.visible = false;

  function landmark(name) {
    const s = city.streets;
    switch (name) {
      case 'antenna': return { x: city.antenna.x, z: city.antenna.z };
      case 'harbor': return { x: 0, z: city.bounds - 12 };
      case 'boardwalk': return { x: -120, z: city.bounds - 8 };
      case 'studio': return { x: s[4], z: s[4] };
      case 'northwest': return { x: s[1], z: s[1] };
      case 'northeast': return { x: s[7], z: s[1] };
      case 'southwest': return { x: s[1], z: s[7] };
      case 'downtown': return { x: s[6], z: s[3] };
      default: return { x: s[4], z: s[4] };
    }
  }

  function setObjective(point) {
    state.objective = point;
    beacon.position.set(point.x, 13, point.z);
    beacon.visible = true;
    ring.position.set(point.x, 0.15, point.z);
    ring.visible = true;
  }

  function hideBeacon() {
    beacon.visible = false;
    ring.visible = false;
  }

  function startMission(i) {
    const m = MISSIONS[i];
    state.index = i;
    state.phase = 'active';
    state.chainStep = 0;
    state.tailTime = 0;
    state.tailLost = 0;
    state.escaped = false;
    state.pickedUp = false;
    state.timer = m.time || 0;
    if (m.startWanted) police.setWanted(m.startWanted);
    if (m.type === 'goto') setObjective(landmark('antenna'));
    if (m.type === 'timed') setObjective(m.id === 2 ? landmark('harbor') : landmark('antenna'));
    if (m.type === 'tail') {
      van.visible = true;
      vanState.x = city.streets[2];
      vanState.z = city.streets[5];
      state.objective = { x: vanState.x, z: vanState.z };
      hideBeacon();
    }
    if (m.type === 'chain') {
      state.chainPoints = [landmark('northwest'), landmark('northeast'), landmark('southwest')];
      setObjective(state.chainPoints[0]);
    }
    if (m.type === 'escape') {
      hideBeacon();
      if (!m.startWanted) police.setWanted(2);
      state.objective = null;
    }
    if (m.type === 'ferry') {
      setObjective(landmark('boardwalk'));
    }
    state.text = `${ACT_NAMES[m.act]} — ${m.name}: ${m.brief}`;
  }

  function complete(onEvent) {
    const m = MISSIONS[state.index];
    playerState.cash += m.pay;
    playerState.listeners += m.listeners;
    state.phase = 'done';
    hideBeacon();
    van.visible = false;
    onEvent('mission-done', m);
    if (state.index + 1 < MISSIONS.length) {
      startMission(state.index + 1);
    } else {
      state.phase = 'finished';
      state.text = 'PRIME TIME complete — Velmara Bay is listening. Thanks for playing!';
      state.objective = null;
    }
  }

  function fail(onEvent) {
    const m = MISSIONS[state.index];
    state.text = `${m.name} failed — try it again.`;
    onEvent('mission-failed', m);
    startMission(state.index);
  }

  return {
    state,
    current() {
      return MISSIONS[state.index];
    },
    objective() {
      return state.objective;
    },
    start() {
      if (state.phase === 'idle') startMission(0);
    },
    // Resume a saved session at a later mission (missions already done
    // stay done; the current one restarts from its briefing).
    resume(index) {
      const at = Math.max(0, Math.min(MISSIONS.length - 1, index));
      if (state.phase === 'idle') startMission(at);
    },
    update(dt, onEvent) {
      if (state.phase !== 'active') return;
      const m = MISSIONS[state.index];
      const px = playerState.x;
      const pz = playerState.z;
      // Beacon pulse.
      const pulse = 0.4 + 0.25 * Math.sin(performance.now() / 300);
      beaconMat.opacity = pulse;
      if (m.type === 'timed') {
        state.timer -= dt;
        state.text = `${m.name}: ${Math.ceil(state.timer)}s left — ${m.brief}`;
        if (state.timer <= 0) {
          fail(onEvent);
          return;
        }
      }
      if (m.type === 'tail') {
        // The van cruises its loop; stay in the 8–30 m band.
        const dx = vanState.tx - vanState.x;
        const dz = vanState.tz - vanState.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3) {
          const s = pick(rng, city.streets);
          if (rng() < 0.5) { vanState.tx = s; } else { vanState.tz = s; }
        }
        vanState.heading = Math.atan2(vanState.tx - vanState.x, vanState.tz - vanState.z);
        vanState.x += Math.sin(vanState.heading) * vanState.speed * dt;
        vanState.z += Math.cos(vanState.heading) * vanState.speed * dt;
        van.position.set(vanState.x, 0, vanState.z);
        van.rotation.y = vanState.heading;
        const d = Math.hypot(px - vanState.x, pz - vanState.z);
        state.objective = { x: vanState.x, z: vanState.z };
        if (d > 8 && d < 30) {
          state.tailTime += dt;
          state.tailLost = 0;
          state.text = `${m.name}: tailing ${Math.ceil(state.tailTime)}s / ${m.time}s — stay back.`;
        } else {
          state.tailLost += dt;
          state.text = `${m.name}: too ${d <= 8 ? 'close' : 'far'} — get back in range!`;
          if (state.tailLost > 6) {
            fail(onEvent);
            return;
          }
        }
        if (state.tailTime >= m.time) {
          complete(onEvent);
          return;
        }
      }
      if (m.type === 'escape') {
        const wanted = police.wanted();
        if (wanted >= 2) state.escaped = true;
        if (state.escaped) {
          state.text = `${m.name}: heat is on — lose it completely!`;
          if (wanted < 0.5) {
            state.objective = landmark('antenna');
            setObjective(state.objective);
            state.text = `${m.name}: heat lost — get to the rooftop antenna!`;
            // Switch this escape into a final goto.
            m.type = 'goto';
            return;
          }
        } else {
          state.text = `${m.name}: stir up some heat first — make noise!`;
        }
        return;
      }
      if (m.type === 'chain') {
        const point = state.chainPoints[state.chainStep];
        if (Math.hypot(px - point.x, pz - point.z) < 7) {
          state.chainStep += 1;
          if (state.chainStep >= state.chainPoints.length) {
            complete(onEvent);
            return;
          }
          setObjective(state.chainPoints[state.chainStep]);
        }
        state.text = `${m.name}: relay ${state.chainStep + 1} of 3 — ${m.brief}`;
        return;
      }
      if (m.type === 'ferry') {
        const target = state.pickedUp ? landmark('studio') : landmark('boardwalk');
        if (Math.hypot(px - target.x, pz - target.z) < 7) {
          if (!state.pickedUp) {
            state.pickedUp = true;
            setObjective(landmark('studio'));
            state.text = `${m.name}: singer aboard — take her to the studio.`;
          } else {
            complete(onEvent);
            return;
          }
        }
        return;
      }
      // goto and timed: reach the marker.
      if (state.objective && Math.hypot(px - state.objective.x, pz - state.objective.z) < 7) {
        complete(onEvent);
      }
    },
  };
}
