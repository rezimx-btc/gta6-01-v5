// VELMARA HEAT — builds Velmara Bay: a coastal grid city of towers, streets,
// sidewalks, palms, the harbor and its beacon. Everything is plain three.js
// boxes, cylinders and planes, so the city is one deterministic function of
// its seed. Returns the colliders (for soft collisions), the shop spots,
// the street grid (for traffic) and the beacon.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';
import { range, intRange, pick } from './random.js';

const STREET_STEP = CITY.blockSize + CITY.streetWidth;

export function streetCoords() {
  const coords = [];
  const first = -CITY.span / 2 + CITY.streetWidth / 2;
  for (let i = 0; i <= CITY.blocks; i += 1) coords.push(first + i * STREET_STEP);
  return coords;
}

function blockCenters() {
  const centers = [];
  const first = -CITY.span / 2 + CITY.streetWidth + CITY.blockSize / 2;
  for (let i = 0; i < CITY.blocks; i += 1) centers.push(first + i * STREET_STEP);
  return centers;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const shops = [];
  const palms = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const groundMat = new THREE.MeshLambertMaterial({ color: 0xcfc4a8 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY.span + 160, CITY.span + 160), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  group.add(ground);

  // Roads: dark strips along every street, with a pale centre line.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const streets = streetCoords();
  for (const c of streets) {
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(CITY.streetWidth, CITY.span), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(c, 0, 0);
    group.add(vRoad);
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(CITY.span, CITY.streetWidth), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0, c);
    group.add(hRoad);
    const vLine = new THREE.Mesh(new THREE.PlaneGeometry(0.5, CITY.span), lineMat);
    vLine.rotation.x = -Math.PI / 2;
    vLine.position.set(c, 0.02, 0);
    group.add(vLine);
    const hLine = new THREE.Mesh(new THREE.PlaneGeometry(CITY.span, 0.5), lineMat);
    hLine.rotation.x = -Math.PI / 2;
    hLine.position.set(0, 0.02, c);
    group.add(hLine);
  }

  // Blocks: sidewalks, then one or two towers each, with parapets and roof
  // AC units so the skyline reads at a glance.
  const centers = blockCenters();
  const wallMats = PALETTE.building.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const glassMat = new THREE.MeshLambertMaterial({ color: PALETTE.buildingGlass, emissive: 0x2a4a55 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x6b6257 });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const acMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a6 });
  for (const cx of centers) {
    for (const cz of centers) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(CITY.blockSize, CITY.blockSize), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.01, cz);
      group.add(walk);
      const lots = rng() < 0.45 ? 1 : 2;
      for (let lot = 0; lot < lots; lot += 1) {
        const w = lots === 1 ? range(rng, 26, 34) : range(rng, 15, 19);
        const d = lots === 1 ? range(rng, 26, 34) : range(rng, 15, 19);
        const h = range(rng, CITY.minBuildingHeight, CITY.maxBuildingHeight);
        const ox = lots === 1 ? 0 : (lot === 0 ? -10 : 10);
        const oz = lots === 1 ? 0 : (lot === 0 ? -10 : 10);
        const x = cx + ox;
        const z = cz + oz;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pick(rng, wallMats));
        tower.position.set(x, h / 2, z);
        group.add(tower);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, Math.min(3, h * 0.12), d + 0.3), glassMat);
        glass.position.set(x, h * 0.82, z);
        group.add(glass);
        // Parapet rim and roof AC units.
        const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.7, d + 0.8), roofMat);
        rim.position.set(x, h + 0.35, z);
        group.add(rim);
        const acCount = intRange(rng, 1, 3);
        for (let a = 0; a < acCount; a += 1) {
          const ac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 2.2), acMat);
          ac.position.set(x + range(rng, -w / 4, w / 4), h + 1.1, z + range(rng, -d / 4, d / 4));
          group.add(ac);
        }
        // Tall towers get a rooftop water tower, a Velmara skyline signature.
        if (h > 30) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.4, 8), new THREE.MeshLambertMaterial({ color: 0x7a6a55 }));
          tank.position.set(x + w / 4, h + 2.6, z - d / 4);
          group.add(tank);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.4, 8), roofMat);
          cap.position.set(x + w / 4, h + 5, z - d / 4);
          group.add(cap);
        }
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Harbor: sand strip and sea along the south edge, with a beacon tower.
  const seaMat = new THREE.MeshLambertMaterial({ color: PALETTE.sea });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(CITY.span + 160, 120), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.3, CITY.span / 2 + 60 + 7);
  group.add(sea);
  const sandMat = new THREE.MeshLambertMaterial({ color: PALETTE.sand });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CITY.span + 160, 16), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, CITY.span / 2 + 7);
  group.add(sand);
  const beaconMat = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
  const beaconTower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 26, 10), beaconMat);
  beaconTower.position.set(-CITY.span / 2 + 24, 13, CITY.span / 2 + 4);
  group.add(beaconTower);
  const beaconLampMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  const beaconLamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), beaconLampMat);
  beaconLamp.position.set(-CITY.span / 2 + 24, 27, CITY.span / 2 + 4);
  group.add(beaconLamp);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.22 });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 60, 12, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(-CITY.span / 2 + 24, 27, CITY.span / 2 + 4);
  group.add(beam);

  // Palms along the boardwalk and a few avenues.
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf });
  for (let i = 0; i < 26; i += 1) {
    const px = -CITY.span / 2 + 12 + i * ((CITY.span - 24) / 25);
    const pz = CITY.span / 2 - 2 + (rng() < 0.5 ? -4 : 2);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 7), trunkMat);
    trunk.position.set(px, 3.5, pz);
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), leafMat);
    crown.scale.y = 0.55;
    crown.position.set(px, 7.4, pz);
    group.add(crown);
    palms.push({ x: px, z: pz });
  }

  // Streetlights on alternating corners.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f47 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const c of streets) {
    for (const d of streets) {
      if ((Math.round(c) + Math.round(d)) % 116 !== 0) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), poleMat);
      pole.position.set(c + 7.5, 3, d + 7.5);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lampMat);
      lamp.position.set(c + 7.5, 6.2, d + 7.5);
      group.add(lamp);
    }
  }

  // The three shops, as glowing kiosks at fixed intersections.
  const shopDefs = [
    { id: 'pistol', x: streets[1], z: streets[2], color: 0xff5030 },
    { id: 'outfit', x: streets[6], z: streets[1], color: 0xff2e88 },
    { id: 'turbo', x: streets[4], z: streets[6], color: 0x22d3ee },
  ];
  for (const def of shopDefs) {
    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(7, 4.5, 5),
      new THREE.MeshLambertMaterial({ color: 0x2b2f38 }),
    );
    kiosk.position.set(def.x + 11, 2.25, def.z + 11);
    group.add(kiosk);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 1.2, 0.4),
      new THREE.MeshBasicMaterial({ color: def.color }),
    );
    sign.position.set(def.x + 11, 5.1, def.z + 11);
    group.add(sign);
    shops.push({ ...def, x: def.x + 11, z: def.z + 11 });
    colliders.push({ minX: def.x + 7.5, maxX: def.x + 14.5, minZ: def.z + 8.5, maxZ: def.z + 13.5 });
  }

  // The WAVE 98 rooftop antenna, the first mission's destination.
  const antennaX = streets[4];
  const antennaZ = streets[4];
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 18, 6), poleMat);
  mast.position.set(antennaX, 30, antennaZ);
  group.add(mast);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ color: PALETTE.neonPink }));
  dish.position.set(antennaX, 39.5, antennaZ);
  group.add(dish);

  return {
    colliders,
    shops,
    palms,
    streets,
    bounds: CITY.span / 2,
    antenna: { x: antennaX, z: antennaZ },
    beacon: { x: -CITY.span / 2 + 24, z: CITY.span / 2 + 4, lamp: beaconLamp, beam },
    spawn: { x: streets[4], z: streets[7], heading: Math.PI },
  };
}
