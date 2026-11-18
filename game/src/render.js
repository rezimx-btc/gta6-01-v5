// VELMARA HEAT — renderer, sky and lights, the chase camera, the minimap
// canvas and the HUD. The HUD is plain DOM the game updates every frame;
// the minimap is a top-down 2D drawing of the street grid, the player,
// police, shops and the mission marker.

import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return renderer;
}

export function createSkyAndLights(scene) {
  scene.background = new THREE.Color(PALETTE.skyTop);
  scene.fog = new THREE.Fog(0xcfe8ef, 180, 620);
  const hemi = new THREE.HemisphereLight(0xbfd9e8, 0x8a7a5f, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffd9b0, 0.35);
  fill.position.set(-90, 60, -120);
  scene.add(fill);
  return { sun, hemi };
}

// Third-person chase camera: sits behind and above the target, smoothed.
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  const smooth = new THREE.Vector3();
  let first = true;
  return {
    object: camera,
    follow(targetPos, heading, distance, height, dt, lookHeight = 1.6) {
      const back = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
      const wanted = new THREE.Vector3(
        targetPos.x + back.x * distance,
        targetPos.y + height,
        targetPos.z + back.z * distance,
      );
      if (first) {
        smooth.copy(wanted);
        first = false;
      }
      smooth.lerp(wanted, 1 - Math.exp(-6 * dt));
      camera.position.copy(smooth);
      // lookHeight lifts the gaze: the camera tilts up to track the
      // helicopter when it is flying, instead of staring at the road.
      camera.lookAt(targetPos.x, targetPos.y + lookHeight, targetPos.z);
    },
  };
}

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  return {
    draw(city, player, police, missionTarget, shops) {
      const span = city.bounds * 2;
      const scale = size / span;
      const toPx = (x) => (x + city.bounds) * scale;
      const toPy = (z) => (z + city.bounds) * scale;
      ctx.fillStyle = '#10151d';
      ctx.fillRect(0, 0, size, size);
      // Streets.
      ctx.strokeStyle = '#3a4356';
      ctx.lineWidth = Math.max(2, 14 * scale);
      for (const c of city.streets) {
        ctx.beginPath();
        ctx.moveTo(toPx(c), 0);
        ctx.lineTo(toPx(c), size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, toPy(c));
        ctx.lineTo(size, toPy(c));
        ctx.stroke();
      }
      // Sea along the bottom edge, and the harbor beacon as a gold dot.
      ctx.fillStyle = '#1e7f8e';
      ctx.fillRect(0, toPy(city.bounds - 4), size, size - toPy(city.bounds - 4));
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(toPx(city.beacon.x), toPy(city.beacon.z), 4, 0, Math.PI * 2);
      ctx.fill();
      // Shops.
      for (const shop of shops) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(toPx(shop.x), toPy(shop.z), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Mission marker.
      if (missionTarget) {
        ctx.fillStyle = '#ff2e88';
        ctx.beginPath();
        ctx.arc(toPx(missionTarget.x), toPy(missionTarget.z), 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff2e88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(toPx(missionTarget.x), toPy(missionTarget.z), 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Police.
      ctx.fillStyle = '#3b82f6';
      for (const car of police) {
        ctx.beginPath();
        ctx.arc(toPx(car.x), toPy(car.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Player arrow, rotated to the heading.
      ctx.save();
      ctx.translate(toPx(player.x), toPy(player.z));
      ctx.rotate(Math.atan2(Math.sin(player.heading), Math.cos(player.heading)) + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
}

// HUD: one update per frame, writing text and widths into the DOM ids that
// index.html declares. Missing elements are skipped, so the HUD never
// throws when a screen runs without one.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const cache = {};
  function get(id) {
    if (!(id in cache)) cache[id] = el(id);
    return cache[id];
  }
  function setText(id, value) {
    const node = get(id);
    if (node && node.textContent !== String(value)) node.textContent = value;
  }
  return {
    update(state) {
      setText('hud-cash', `$${Math.floor(state.cash)}`);
      setText('hud-listeners', `${Math.floor(state.listeners)} listeners`);
      setText('hud-clock', state.clock);
      setText('hud-station', state.stationName);
      setText('hud-speed', state.inCar ? `${Math.round(state.speed * 3.6)} km/h` : 'ON FOOT');
      setText('hud-mission', state.missionText);
      setText('hud-prompt', state.prompt);
      setText('hud-toast', state.toast);
      const stars = get('hud-wanted');
      if (stars) {
        const text = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
        if (stars.textContent !== text) stars.textContent = text;
      }
      const health = get('hud-health-fill');
      if (health) health.style.width = `${Math.max(0, Math.min(100, state.health))}%`;
    },
    show(id) {
      const node = get(id);
      if (node) node.style.display = 'flex';
    },
    hide(id) {
      const node = get(id);
      if (node) node.style.display = 'none';
    },
  };
}
