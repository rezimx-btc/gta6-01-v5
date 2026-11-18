// VELMARA HEAT — the police helicopter. It only flies when the wanted
// level reaches 3: it circles above the player, rotor spinning, spotlight
// pinned on them. Below that it waits, parked, out of the way.

import * as THREE from 'three';
import { WANTED } from './config.js';

export function createHelicopter(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.6), bodyMat);
  group.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 1.6), new THREE.MeshLambertMaterial({ color: 0x9fd8e8 }));
  glass.position.set(0, 0.3, 1.6);
  group.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), bodyMat);
  tail.position.set(0, 0.2, -4.2);
  group.add(tail);
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), rotorMat);
  rotor.position.y = 1.1;
  group.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.4), rotorMat);
  tailRotor.position.set(0.4, 0.3, -6.2);
  group.add(tailRotor);
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.16 });
  const spot = new THREE.Mesh(new THREE.ConeGeometry(7, 22, 12, 1, true), spotMat);
  spot.position.y = -11;
  group.add(spot);
  // A pool of light on the ground under the helicopter, tracking the player.
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.12 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.1;
  pool.visible = false;
  scene.add(pool);
  group.visible = false;
  scene.add(group);

  const state = { active: false, angle: 0, x: 0, z: 0 };
  return {
    state,
    update(dt, player, wanted) {
      const shouldFly = wanted >= WANTED.heliAt;
      if (shouldFly && !state.active) {
        state.active = true;
        group.visible = true;
        pool.visible = true;
      }
      if (!shouldFly && state.active) {
        state.active = false;
        group.visible = false;
        pool.visible = false;
      }
      if (!state.active) return;
      state.angle += dt * 0.55;
      // Low orbit ahead of the player so the helicopter reads in the chase
      // camera's frame when the camera tilts up to track it.
      state.x = player.x + Math.cos(state.angle) * 34;
      state.z = player.z + Math.sin(state.angle) * 34;
      group.position.set(state.x, 22, state.z);
      group.rotation.y = -state.angle;
      rotor.rotation.y += dt * 22;
      tailRotor.rotation.x += dt * 26;
      pool.position.set(player.x, 0.1, player.z);
      // Spotlight cone always leans toward the player below.
      spot.lookAt(player.x - state.x, -22, player.z - state.z);
    },
  };
}
