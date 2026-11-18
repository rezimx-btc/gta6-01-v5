// VELMARA HEAT — Rio "Wavelength" Vega: on foot at 5 km/h, or behind the
// wheel of any car on the street. Handles walking, driving, stealing and
// leaving cars, soft collisions with buildings, health, cash, listeners and
// owned items. The mesh follows the state; the camera reads the state.

import * as THREE from 'three';
import { PLAYER, CAR } from './config.js';
import { buildCarMesh } from './traffic.js';

function collideCircle(pos, radius, colliders) {
  let hit = false;
  for (const box of colliders) {
    const cx = Math.max(box.minX, Math.min(pos.x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;
    hit = true;
    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      pos.x += dx * push;
      pos.z += dz * push;
    } else {
      // Centre inside the box: push out along the smallest penetration.
      const left = pos.x - box.minX;
      const right = box.maxX - pos.x;
      const top = pos.z - box.minZ;
      const bottom = box.maxZ - pos.z;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = box.minX - radius;
      else if (m === right) pos.x = box.maxX + radius;
      else if (m === top) pos.z = box.minZ - radius;
      else pos.z = box.maxZ + radius;
    }
  }
  return hit;
}

export function createPlayer(scene, spawn, city) {
  const state = {
    x: spawn.x,
    z: spawn.z,
    heading: spawn.heading,
    speed: 0,
    inCar: false,
    car: null,
    health: PLAYER.health,
    cash: PLAYER.startCash,
    listeners: PLAYER.startListeners,
    owned: { pistol: false, outfit: false, turbo: false },
    drifting: false,
    airTime: 0,
  };

  // On-foot body: a simple capsule-ish figure whose shirt changes with the
  // neon outfit.
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a6fd4 });
  const body = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
  torso.position.y = 1.05;
  body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.75;
  body.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), new THREE.MeshLambertMaterial({ color: 0x222831 }));
  legs.position.y = 0.4;
  body.add(legs);
  body.position.set(state.x, 0, state.z);
  scene.add(body);

  function syncMesh() {
    body.position.set(state.x, 0, state.z);
    body.rotation.y = state.heading;
    body.visible = !state.inCar;
    if (state.car) {
      state.car.mesh.position.set(state.x, 0, state.z);
      state.car.mesh.rotation.y = state.heading;
    }
  }

  return {
    state,
    mesh: body,
    pos() {
      return { x: state.x, z: state.z };
    },
    heading() {
      return state.heading;
    },
    speed() {
      return state.inCar ? state.speed : 0;
    },
    damage(amount) {
      state.health = Math.max(0, state.health - amount);
      return state.health;
    },
    heal(amount) {
      state.health = Math.min(PLAYER.health, state.health + amount);
    },
    setOutfit() {
      bodyMat.color.setHex(0xff2e88);
    },
    update(dt, input, traffic, onEvent) {
      const look = input.takeLook();
      state.heading -= look.x * 0.004;
      const axes = input.axes();
      const colliders = city.colliders;
      if (!state.inCar) {
        // On foot: walk 5 km/h, sprint a little faster, face the way we go.
        const speed = input.sprinting() ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
        const sin = Math.sin(state.heading);
        const cos = Math.cos(state.heading);
        const mx = (sin * axes.forward + cos * axes.strafe) * speed * dt;
        const mz = (cos * axes.forward - sin * axes.strafe) * speed * dt;
        state.x += mx;
        state.z += mz;
        state.x = Math.max(-city.bounds, Math.min(city.bounds, state.x));
        state.z = Math.max(-city.bounds, Math.min(city.bounds, state.z));
        collideCircle(state, PLAYER.radius, colliders);
        // Try to steal the nearest car.
        if (input.wasPressed('KeyE')) {
          input.consume('KeyE');
          const car = traffic.nearestCar(state.x, state.z, 5);
          if (car) {
            traffic.takeCar(car);
            state.car = car;
            state.inCar = true;
            state.speed = 0;
            state.heading = car.heading;
            onEvent('enter-car');
          }
        }
      } else {
        // Driving: arcade model with accel, drag, steering and handbrake.
        const car = state.car;
        const topSpeed = state.owned.turbo ? CAR.turboMaxSpeed : CAR.maxSpeed;
        if (axes.forward > 0) state.speed += CAR.accel * dt;
        if (axes.forward < 0) state.speed -= (state.speed > 0.5 ? CAR.brake : CAR.accel * 0.7) * dt;
        if (axes.forward === 0) state.speed -= Math.sign(state.speed) * CAR.drag * 4 * dt;
        if (input.sprinting()) state.speed -= Math.sign(state.speed) * CAR.brake * 1.4 * dt;
        if (Math.abs(state.speed) < 0.05 && axes.forward === 0) state.speed = 0;
        state.speed = Math.max(-CAR.maxReverse, Math.min(topSpeed, state.speed));
        const steer = axes.strafe * CAR.turnRate * dt * Math.min(1, Math.abs(state.speed) / 8) * (state.speed < 0 ? -1 : 1);
        state.heading += steer;
        car.heading = state.heading;
        const nx = state.x + Math.sin(state.heading) * state.speed * dt;
        const nz = state.z + Math.cos(state.heading) * state.speed * dt;
        const before = { x: state.x, z: state.z };
        state.x = nx;
        state.z = nz;
        const hitWall = collideCircle(state, 1.6, colliders);
        if (hitWall) {
          // Soft collision: lose a little speed, never stop dead.
          state.speed *= 0.55;
          if (Math.abs(state.speed) > 6) onEvent('crash');
        }
        state.x = Math.max(-city.bounds, Math.min(city.bounds, state.x));
        state.z = Math.max(-city.bounds, Math.min(city.bounds, state.z));
        // Drifting: sideways slide at speed with the handbrake.
        state.drifting = input.sprinting() && Math.abs(state.speed) > 12;
        const moved = Math.hypot(state.x - before.x, state.z - before.z);
        state.airTime = moved;
        if (input.wasPressed('KeyE')) {
          input.consume('KeyE');
          // Step out beside the car; it stays parked where it is.
          traffic.parkCar(car);
          state.car = null;
          state.inCar = false;
          state.speed = 0;
          state.x += Math.cos(state.heading) * 2.2;
          state.z -= Math.sin(state.heading) * 2.2;
          onEvent('exit-car');
        }
      }
      syncMesh();
    },
  };
}
