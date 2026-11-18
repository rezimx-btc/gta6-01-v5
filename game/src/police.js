// VELMARA HEAT — the wanted system and the police who answer it. Wanted
// runs 0–5; each level puts that many black-and-white cruisers on the
// street, steering for the player and ramming. Wanted cools off when the
// player lays low. A cruiser that catches the player on foot, slow and
// close, busts them.

import * as THREE from 'three';
import { WANTED, PALETTE } from './config.js';
import { buildCarMesh } from './traffic.js';
import { pick, range } from './random.js';

export function createPolice(scene, city, rng) {
  const state = {
    wanted: 0,
    sinceCrime: 0,
    busted: false,
  };
  const cruisers = [];
  const lightMats = [];

  function spawnCruiser(player) {
    const street = pick(rng, city.streets);
    // Intercept: spawn ahead of the player so the cruiser comes at them
    // head-on down the street, in full view of the chase camera.
    const angle = player.heading + (rng() - 0.5) * 1.2;
    const x = player.x + Math.sin(angle) * 55;
    const z = player.z + Math.cos(angle) * 55;
    const mesh = buildCarMesh(PALETTE.policePaint);
    // Light bar: red on one side, blue on the other, flashing in update.
    const redMat = new THREE.MeshBasicMaterial({ color: PALETTE.policeLightRed });
    const blueMat = new THREE.MeshBasicMaterial({ color: PALETTE.policeLightBlue });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), redMat);
    red.position.set(-0.45, 1.45, -0.2);
    mesh.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), blueMat);
    blue.position.set(0.45, 1.45, -0.2);
    mesh.add(blue);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    lightMats.push({ redMat, blueMat, phase: rng() * 2 });
    const cruiser = { mesh, x, z, heading: Math.atan2(player.x - x, player.z - z), speed: 0, ramCooldown: 0 };
    cruisers.push(cruiser);
    return cruiser;
  }

  return {
    state,
    cruisers,
    wanted() {
      return state.wanted;
    },
    addWanted(amount, quiet) {
      const before = state.wanted;
      state.wanted = Math.max(0, Math.min(WANTED.max, state.wanted + amount));
      state.sinceCrime = 0;
      return state.wanted !== before && !quiet;
    },
    setWanted(level) {
      state.wanted = Math.max(0, Math.min(WANTED.max, level));
      state.sinceCrime = 0;
    },
    update(dt, player, onEvent) {
      state.sinceCrime += dt;
      // Cool off after laying low for a while.
      if (state.wanted > 0 && state.sinceCrime > WANTED.decayDelay) {
        state.wanted = Math.max(0, state.wanted - WANTED.decayRate * dt);
      }
      const wantCount = WANTED.policePerLevel[Math.floor(state.wanted)] || 0;
      while (cruisers.length < wantCount) spawnCruiser(player);
      while (cruisers.length > wantCount) {
        const gone = cruisers.pop();
        scene.remove(gone.mesh);
        lightMats.pop();
      }
      // Flash the light bars.
      const t = performance.now() / 1000;
      for (const lm of lightMats) {
        const on = Math.sin(t * 9 + lm.phase) > 0;
        lm.redMat.color.setHex(on ? PALETTE.policeLightRed : 0x330000);
        lm.blueMat.color.setHex(on ? 0x330000 : PALETTE.policeLightBlue);
      }
      // Chase: steer at the player, each cruiser aiming at its own offset
      // so they fan out instead of piling onto one spot, and ram on contact.
      for (let ci = 0; ci < cruisers.length; ci += 1) {
        const cruiser = cruisers[ci];
        const offset = (ci - (cruisers.length - 1) / 2) * 4;
        const px = player.x + Math.cos(player.heading || 0) * offset;
        const pz = player.z - Math.sin(player.heading || 0) * offset;
        const dx = px - cruiser.x;
        const dz = pz - cruiser.z;
        const dist = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        let diff = want - cruiser.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cruiser.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        const targetSpeed = dist > 60 ? 34 : 30;
        cruiser.speed += (targetSpeed - cruiser.speed) * Math.min(1, dt * 0.8);
        cruiser.x += Math.sin(cruiser.heading) * cruiser.speed * dt;
        cruiser.z += Math.cos(cruiser.heading) * cruiser.speed * dt;
        cruiser.mesh.position.set(cruiser.x, 0, cruiser.z);
        cruiser.mesh.rotation.y = cruiser.heading;
        cruiser.ramCooldown -= dt;
        if (dist < 2.6) {
          cruiser.speed *= 0.4;
          // One ram per cruiser per 1.2 s: without a cooldown a touch
          // lasting a few frames would drain all health at once.
          if (cruiser.ramCooldown <= 0) {
            cruiser.ramCooldown = 1.2;
            if (player.inCar) {
              player.speed *= 0.6;
              onEvent('rammed');
            }
          }
          if (!player.inCar && Math.abs(player.speed) < 1 && dist < 2.2) {
            state.busted = true;
            onEvent('busted');
          }
        }
      }
    },
  };
}
