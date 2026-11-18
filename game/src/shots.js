// VELMARA HEAT — the screenshot scenes behind ?shot=chase|drive|mission|
// heli. Each one plays the real rules forward from a seeded start for a
// fixed number of steps, steered by a pure-pursuit autopilot that follows
// waypoints around the streets, so the frame is what a short game really
// looks like and the same seed always gives the same frame. Returns the
// autopilot input so the game keeps driving while the screenshot is taken.

import { STEP } from './config.js';

export function stageShot(name, world) {
  // Unknown scene names fall back to the driving scene.
  if (!['chase', 'drive', 'mission', 'heli'].includes(name)) name = 'drive';
  const { player, traffic, police, missions, city, step } = world;
  const st = player.state;
  st.health = 100;
  st.speed = 0;

  // Put Rio in a car on the main avenue (street x = 0), facing north.
  const avenueX = city.streets[4];
  const car = traffic.nearestCar(st.x, st.z, 600);
  if (car) {
    traffic.takeCar(car);
    st.car = car;
    st.inCar = true;
    st.heading = 0;
    car.heading = 0;
  }
  st.x = avenueX;
  st.z = -140;
  st.speed = 16;

  // Waypoints: a loop around the central blocks, or an orbit around the
  // antenna beacon for the mission scene (close enough to see the beacon,
  // far enough never to complete the mission while staging).
  let waypoints = [
    { x: avenueX, z: 120 },
    { x: city.streets[6], z: 120 },
    { x: city.streets[6], z: -140 },
    { x: avenueX, z: -140 },
  ];
  let seconds = 4;
  if (name === 'drive') {
    seconds = 5;
  }
  if (name === 'chase') {
    police.setWanted(3);
    seconds = 4;
  }
  if (name === 'heli') {
    police.setWanted(4);
    seconds = 3;
  }
  let parked = false;
  if (name === 'mission') {
    // Parked on the avenue facing the antenna: the car holds still with
    // the pink beacon dead ahead, the mission live, the marker on the
    // minimap. No driving — the shot is about the objective.
    const ax = city.antenna.x;
    const az = city.antenna.z;
    st.x = ax;
    st.z = az + 44;
    st.heading = Math.PI;
    st.speed = 0;
    parked = true;
    seconds = 1;
  }

  let wp = 0;
  const autopilot = {
    takeLook() {
      return { x: 0, y: 0 };
    },
    axes() {
      if (parked) return { forward: 0, strafe: 0 };
      const target = waypoints[wp];
      const dx = target.x - st.x;
      const dz = target.z - st.z;
      if (Math.hypot(dx, dz) < 12) wp = (wp + 1) % waypoints.length;
      const want = Math.atan2(dx, dz);
      let diff = want - st.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return { forward: 1, strafe: Math.max(-1, Math.min(1, diff * 2.2)) };
    },
    wasPressed() {
      return false;
    },
    sprinting() {
      return false;
    },
    wasClicked() {
      return false;
    },
    endFrame() {},
  };

  for (let i = 0; i < seconds / STEP; i += 1) step(STEP, autopilot);
  return autopilot;
}
