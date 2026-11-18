// VELMARA HEAT — bootstrap and main loop. Builds the world, wires every
// system together, runs a fixed-step simulation (60 Hz) and a render pass,
// and owns the screens: title, play, paused, busted / wasted. Screenshot
// mode (?shot=chase|drive|mission|heli) skips the title and stages a
// deterministic scene from a seed.

import * as THREE from 'three';
import { CITY, PLAYER, STEP } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';
import { createRenderer, createSkyAndLights, createCamera, createMinimap, createHud } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer } from './player.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createHelicopter } from './helicopter.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createRadio } from './radio.js';
import { createShops } from './shops.js';
import { loadSave, saveGame } from './save.js';
import { createStream } from './stream.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 20261118);
const shotName = params.get('shot');
const rng = makeRng(seed);

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
createSkyAndLights(scene);
const camera = createCamera();
const minimap = createMinimap(document.getElementById('minimap'));
const hud = createHud();
const input = createInput(canvas);
const audio = createAudio();
const city = buildCity(scene, rng);
const traffic = createTraffic(scene, city, rng);
const player = createPlayer(scene, city.spawn, city);
const police = createPolice(scene, city, rng);
const heli = createHelicopter(scene);
const missions = createMissions(scene, city, rng, player.state, police);
const combat = createCombat(scene);
const radio = createRadio(audio);
const shops = createShops(city, player, audio);
const stream = createStream();

// Restore a previous session's cash, listeners and owned items.
const saved = loadSave();
let pendingResume = 0;
if (saved) {
  player.state.cash = saved.cash;
  player.state.listeners = saved.listeners;
  player.state.owned = saved.owned;
  pendingResume = saved.missionsDone;
  if (saved.owned.outfit) player.setOutfit();
}

let screen = 'title';
let overReason = '';
let clockMinutes = 21 * 60 + 40;
let toastText = '';
let toastTimer = 0;
let saveTimer = 12;
let lastWanted = 0;
let lastListenerSound = 0;

function setToast(text, seconds = 4) {
  toastText = text;
  toastTimer = seconds;
}

function gameOver(reason) {
  if (screen === 'over') return;
  screen = 'over';
  overReason = reason;
  const title = document.getElementById('over-title');
  if (title) title.textContent = reason === 'busted' ? 'BUSTED' : 'WASTED';
  const sub = document.getElementById('over-sub');
  if (sub) sub.textContent = reason === 'busted'
    ? 'The Velmara PD caught up with Rio. The broadcast goes quiet… tonight.'
    : 'Rio went down in Velmara Bay. The city keeps moving without him.';
  hud.show('over-screen');
  audio.update(0, 0, false);
}

function onEvent(type, data) {
  if (type === 'enter-car') setToast('You jacked the car. Drive!');
  if (type === 'exit-car') setToast('On foot. Watch the heat.');
  if (type === 'crash') {
    audio.crash();
    setToast('Careful — the city is not a cushion.');
  }
  if (type === 'reload') setToast('Reloading…', 1.5);
  if (type === 'reloaded') setToast('Magazine full.', 1.5);
  if (type === 'shop-repaired') setToast('Patched up — full health.', 3);
  if (type === 'rammed') {
    player.damage(6);
    setToast('Ram! The cruiser is on your bumper.');
    if (player.state.health <= 0) gameOver('wasted');
  }
  if (type === 'busted') gameOver('busted');
  if (type === 'shot') audio.shoot();
  if (type === 'shot-hit') setToast('Hit! The heat is coming.', 2);
  if (type === 'mission-done') {
    audio.missionDone();
    setToast(`Mission complete: ${data.name} — +$${data.pay}, +${data.listeners} listeners`, 6);
    saveGame(player.state, missions.state.index);
  }
  if (type === 'mission-failed') {
    audio.denied();
    setToast('Mission failed — try it again.', 4);
  }
  if (type === 'shop-bought') {
    setToast(`Bought the ${data.item}!`, 3);
    saveGame(player.state, missions.state.index);
  }
  if (type === 'shop-denied') setToast('Not enough cash for that.', 3);
  if (type === 'listeners') {
    const now = performance.now();
    if (now - lastListenerSound > 900) {
      lastListenerSound = now;
      audio.listenerGain();
    }
  }
  if (type === 'near-miss') {
    setToast(`Near miss! +${data} listeners`, 2.5);
    audio.listenerGain();
  }
  if (type === 'dj-line') setToast(data, 5);
  if (type === 'milestone') {
    audio.missionDone();
    setToast(data, 6);
  }
}

function stepWorld(dt, simInput) {
  player.update(dt, simInput, traffic, onEvent);
  traffic.update(dt);
  police.update(dt, player.state, onEvent);
  heli.update(dt, player.state, police.wanted());
  missions.update(dt, onEvent);
  radio.update(dt, player, traffic, onEvent);
  stream.update(dt, player.state, onEvent);
  combat.update(dt, simInput, player, police, traffic, camera.object, onEvent);
  const speedNorm = Math.min(1, Math.abs(player.state.speed) / 49);
  audio.update(dt, speedNorm, screen === 'play');
  clockMinutes += dt * 0.5;
  if (toastTimer > 0) toastTimer -= dt;
  saveTimer -= dt;
  if (saveTimer <= 0) {
    saveTimer = 12;
    saveGame(player.state, missions.state.index);
  }
  const wanted = Math.floor(police.wanted());
  if (wanted > lastWanted) audio.wantedUp();
  lastWanted = wanted;
}

function clockText() {
  const total = Math.floor(clockMinutes) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function renderFrame(dt) {
  const st = player.state;
  const inCar = st.inCar;
  camera.follow(
    new THREE.Vector3(st.x, 0, st.z),
    st.heading,
    inCar ? 10 : 7.5,
    inCar ? 4.6 : 3.4,
    dt,
    heli.state.active ? 5.5 : 1.6,
  );
  // The harbor beacon sweeps the bay.
  city.beacon.beam.rotation.y += dt * 0.5;
  renderer.render(scene, camera.object);
  minimap.draw(city, st, police.cruisers, missions.objective(), city.shops);
  // Shop prompt wins over the car prompt; otherwise show the car prompt.
  let prompt = '';
  const shopPrompt = shops.update(input, onEvent);
  if (shopPrompt) {
    prompt = shopPrompt;
  } else if (!inCar) {
    const car = traffic.nearestCar(st.x, st.z, 5);
    if (car) prompt = 'Press E to steal the car';
  }
  hud.update({
    cash: st.cash,
    listeners: st.listeners,
    clock: clockText(),
    stationName: `${radio.station().name} · ${radio.station().tag}`,
    speed: Math.abs(st.speed),
    inCar,
    wanted: Math.floor(police.wanted()),
    health: st.health,
    missionText: missions.state.text,
    prompt,
    toast: toastTimer > 0 ? toastText : '',
  });
}

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (screen === 'play') {
    accumulator += dt;
    while (accumulator >= STEP) {
      stepWorld(STEP, shotInput || input);
      accumulator -= STEP;
    }
    if (input.wasPressed('KeyR')) radio.next();
    if (input.wasPressed('KeyM')) {
      const muted = audio.toggleMute();
      setToast(muted ? 'Audio muted.' : 'Audio on.', 2);
    }
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      screen = 'paused';
      hud.show('pause-screen');
    }
  } else if (screen === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      screen = 'play';
      hud.hide('pause-screen');
    }
  }
  if (screen !== 'title') renderFrame(dt);
  input.endFrame();
}

function startGame() {
  audio.unlock();
  hud.hide('start-screen');
  screen = 'play';
  if (pendingResume > 0) missions.resume(pendingResume);
  else missions.start();
  setToast('WAVE 98 is live. Rio Vega is on the air.', 5);
}

document.getElementById('start-button')?.addEventListener('click', startGame);
document.getElementById('again-button')?.addEventListener('click', () => window.location.reload());

// Screenshot mode: skip the title, stage a deterministic scene, play it.
// The autopilot keeps driving while the screenshot is taken.
let shotInput = null;
if (shotName) {
  hud.hide('start-screen');
  screen = 'play';
  missions.start();
  shotInput = stageShot(shotName, {
    player,
    traffic,
    police,
    heli,
    missions,
    city,
    rng,
    step: (dt, simInput) => stepWorld(dt, simInput),
  });
} else {
  hud.show('start-screen');
}

requestAnimationFrame(frame);
