// VELMARA HEAT — all sound is synthesized live with WebAudio: a procedural
// engine hum, three radio stations with their own step-sequenced patterns,
// and one-shot effects. No audio files, no network. Audio starts only after
// the first user gesture (the start click), as browsers require.

import { RADIO_STATIONS } from './config.js';

const SCALES = {
  wave98: [0, 3, 5, 7, 10, 12],
  neonfm: [0, 2, 3, 7, 9, 12],
  tideam: [0, 4, 7, 9, 12, 16],
};
const ROOTS = { wave98: 55, neonfm: 65.41, tideam: 49 };

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;
  let stationIndex = 0;
  let step = 0;
  let nextStepAt = 0;
  let talkTimer = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      nextStepAt = ctx.currentTime + 0.1;
      return true;
    } catch {
      return false;
    }
  }

  function note(freq, at, dur, type, vol) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(vol, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  function noiseBurst(at, dur, vol, filterFreq) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(at);
  }

  function stationStep(station, at) {
    const scale = SCALES[station.id];
    const root = ROOTS[station.id];
    const bar = Math.floor(step / 8) % 4;
    if (station.id === 'wave98') {
      // Driving bass on the beat, a sparkle note off it.
      if (step % 4 === 0) note(root * 2, at, 0.22, 'triangle', 0.22);
      if (step % 8 === 6) note(root * 2 * Math.pow(2, scale[bar] / 12), at, 0.18, 'square', 0.07);
    } else if (station.id === 'neonfm') {
      // Fast synth arpeggio climbing the scale.
      const deg = scale[step % scale.length];
      note(root * 4 * Math.pow(2, deg / 12), at, 0.14, 'sawtooth', 0.08);
      if (step % 8 === 0) note(root, at, 0.4, 'triangle', 0.16);
    } else {
      // Slow oldies chords: root and fifth, long and warm.
      if (step % 8 === 0) {
        note(root * 2, at, 0.9, 'sine', 0.14);
        note(root * 3, at, 0.9, 'sine', 0.08);
      }
      if (step % 8 === 4) note(root * 2 * Math.pow(2, 7 / 12), at, 0.4, 'sine', 0.1);
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    setStation(index) {
      stationIndex = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
      step = 0;
      return RADIO_STATIONS[stationIndex];
    },
    station() {
      return RADIO_STATIONS[stationIndex];
    },
    // Called every frame: keeps the engine hum pitched to speed and steps
    // the current station's sequencer.
    update(dt, speedNorm, onAir) {
      if (!ctx || muted) return;
      if (engineGain) {
        engineGain.gain.value = 0.02 + speedNorm * 0.06;
        engineOsc.frequency.value = 48 + speedNorm * 130;
      }
      const station = RADIO_STATIONS[stationIndex];
      const stepDur = 60 / station.bpm / 2;
      while (nextStepAt < ctx.currentTime + 0.12) {
        stationStep(station, Math.max(nextStepAt, ctx.currentTime));
        step += 1;
        nextStepAt += stepDur;
      }
      // WAVE 98 talk: a burst of short voice-like blips every few seconds
      // while the broadcast is live.
      if (station.id === 'wave98' && onAir) {
        talkTimer -= dt;
        if (talkTimer <= 0) {
          talkTimer = 4 + Math.random() * 5;
          const at = ctx.currentTime + 0.05;
          for (let i = 0; i < 6; i += 1) note(180 + Math.random() * 120, at + i * 0.09, 0.07, 'square', 0.045);
        }
      }
    },
    shoot() {
      if (!ctx || muted) return;
      noiseBurst(ctx.currentTime, 0.12, 0.5, 1400);
    },
    crash() {
      if (!ctx || muted) return;
      noiseBurst(ctx.currentTime, 0.22, 0.4, 320);
    },
    buy() {
      if (!ctx || muted) return;
      const at = ctx.currentTime;
      note(880, at, 0.12, 'sine', 0.2);
      note(1318, at + 0.09, 0.16, 'sine', 0.2);
    },
    denied() {
      if (!ctx || muted) return;
      note(160, ctx.currentTime, 0.25, 'square', 0.12);
    },
    missionDone() {
      if (!ctx || muted) return;
      const at = ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => note(f, at + i * 0.09, 0.22, 'triangle', 0.18));
    },
    wantedUp() {
      if (!ctx || muted) return;
      const at = ctx.currentTime;
      note(740, at, 0.16, 'square', 0.09);
      note(587, at + 0.18, 0.16, 'square', 0.09);
    },
    listenerGain() {
      if (!ctx || muted) return;
      note(1568, ctx.currentTime, 0.08, 'sine', 0.1);
    },
  };
}
