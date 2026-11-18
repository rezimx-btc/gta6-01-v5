// VELMARA HEAT — traffic and pedestrians. NPC cars cruise the street grid
// from intersection to intersection; pedestrians stroll the sidewalks. Cars
// are plain three.js groups (body, cabin, wheels, lights) so the player can
// steal any of them: takeCar pulls one out of traffic, parkCar puts a
// player-driven car back as a parked car.

import * as THREE from 'three';
import { PALETTE } from './config.js';
import { range, intRange, pick } from './random.js';

export function buildCarMesh(color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.3), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glass);
  cabin.position.set(0, 1.1, -0.2);
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181d });
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const lx of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), lightMat);
    lamp.position.set(lx, 0.62, 2.16);
    group.add(lamp);
  }
  return group;
}

function makeCar(scene, rng, x, z, heading) {
  const color = pick(rng, PALETTE.carPaint);
  const mesh = buildCarMesh(color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, x, z, heading, speed: range(rng, 7, 11), color, parked: false, route: null };
}

export function createTraffic(scene, city, rng) {
  const cars = [];
  const peds = [];
  const streets = city.streets;

  // A dozen cruising cars, each starting on a random street.
  for (let i = 0; i < 12; i += 1) {
    const vertical = rng() < 0.5;
    const street = pick(rng, streets);
    const along = range(rng, -city.bounds + 20, city.bounds - 20);
    const car = makeCar(scene, rng, vertical ? street : along, vertical ? along : street, vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
    car.route = { tx: car.x, tz: car.z };
    cars.push(car);
  }

  // Parked cars the player can steal, lined up on side streets.
  for (let i = 0; i < 8; i += 1) {
    const street = pick(rng, streets);
    const along = range(rng, -city.bounds + 30, city.bounds - 30);
    const vertical = rng() < 0.5;
    const car = makeCar(scene, rng, vertical ? street + 6.5 : along, vertical ? along : street + 6.5, vertical ? 0 : Math.PI / 2);
    car.parked = true;
    car.speed = 0;
    cars.push(car);
  }

  // Pedestrians on the sidewalks.
  const pedMat = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const shirtColors = [0xd43d2a, 0x2a6fd4, 0x37b268, 0xf2c230, 0x8e44ad, 0xe8e8e8];
  for (let i = 0; i < 18; i += 1) {
    const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, shirtColors) });
    const group = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.32), shirt);
    bodyMesh.position.y = 1.0;
    group.add(bodyMesh);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), pedMat);
    head.position.y = 1.65;
    group.add(head);
    const street = pick(rng, streets);
    const along = range(rng, -city.bounds + 10, city.bounds - 10);
    const vertical = rng() < 0.5;
    const x = vertical ? street + 8.5 : along;
    const z = vertical ? along : street + 8.5;
    group.position.set(x, 0, z);
    scene.add(group);
    peds.push({ mesh: group, x, z, heading: rng() * Math.PI * 2, speed: range(rng, 0.8, 1.4), vertical, street });
  }

  function pickNextWaypoint(car) {
    const s = pick(rng, streets);
    if (rng() < 0.5) return { tx: s, tz: car.z };
    return { tx: car.x, tz: s };
  }

  return {
    cars,
    peds,
    nearestCar(x, z, maxDist) {
      let best = null;
      let bestD = maxDist;
      for (const car of cars) {
        const d = Math.hypot(car.x - x, car.z - z);
        if (d < bestD) {
          bestD = d;
          best = car;
        }
      }
      return best;
    },
    takeCar(car) {
      const i = cars.indexOf(car);
      if (i !== -1) cars.splice(i, 1);
    },
    parkCar(car) {
      car.parked = true;
      car.speed = 0;
      if (!cars.includes(car)) cars.push(car);
    },
    addCar(car) {
      cars.push(car);
    },
    update(dt) {
      for (const car of cars) {
        if (car.parked) continue;
        const target = car.route;
        const dx = target.tx - car.x;
        const dz = target.tz - car.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3) {
          car.route = pickNextWaypoint(car);
          continue;
        }
        // Ease off when another car is directly ahead and close.
        let followSpeed = car.speed;
        for (const other of cars) {
          if (other === car || other.parked) continue;
          const ahead = (other.x - car.x) * Math.sin(car.heading) + (other.z - car.z) * Math.cos(car.heading);
          const side = Math.abs((other.x - car.x) * Math.cos(car.heading) - (other.z - car.z) * Math.sin(car.heading));
          if (ahead > 0 && ahead < 9 && side < 2.4) followSpeed = Math.min(followSpeed, other.speed * 0.7);
        }
        const want = Math.atan2(dx, dz);
        let diff = want - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
        car.x += Math.sin(car.heading) * followSpeed * dt;
        car.z += Math.cos(car.heading) * followSpeed * dt;
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.heading;
      }
      for (const ped of peds) {
        const dx = Math.sin(ped.heading);
        const dz = Math.cos(ped.heading);
        ped.x += dx * ped.speed * dt;
        ped.z += dz * ped.speed * dt;
        if (Math.abs(ped.x) > city.bounds - 6 || Math.abs(ped.z) > city.bounds - 6) {
          ped.heading += Math.PI;
        }
        if (rng() < dt * 0.08) ped.heading += (rng() - 0.5) * 1.2;
        ped.mesh.position.set(ped.x, 0, ped.z);
        ped.mesh.rotation.y = ped.heading;
      }
    },
  };
}
