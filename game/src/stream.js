// VELMARA HEAT — the WAVE 98 live broadcast. Rio is on air whenever the
// game runs: the stream module drops DJ chatter, caller lines and listener
// milestones into the toast line, so the broadcast feels alive while the
// player drives. Milestones pay a small listener bonus the first time the
// audience crosses them.

import { LISTENERS } from './config.js';

const DJ_LINES = [
  'WAVE 98 — Velmara Bay is listening. Rio Vega on the night shift.',
  'Caller 7 says the grey van is moving again. Keep your eyes open.',
  'That was the tide coming in. This is the city going out.',
  'If you can hear the beacon, you are already home.',
  'Neon FM plays the same four songs. We play the whole city.',
  'A listener in the suburbs asks: Rio, do the cops ever sleep? No.',
  'The harbor buyer pays in cash and silence. Mostly silence.',
  'This next one goes out to everyone stuck in traffic on Meridian Ave.',
  'WAVE 98: the only station the police cannot switch off.',
  'Mara says the fixers are watching. Drive like it matters.',
  'The beacon is sweeping the bay again. If it finds you, wave.',
  'Somewhere out there a listener just stole their first car. Proud of you.',
];

const MILESTONES = [
  { at: 500, line: '500 listeners! The night shift is officially a movement.' },
  { at: 1000, line: 'One thousand listeners — Velmara Bay is tuned to WAVE 98.' },
  { at: 2500, line: '2,500 listeners! The mayor’s office just called. We hung up.' },
  { at: 5000, line: '5,000 listeners — prime time belongs to Rio Vega.' },
];

export function createStream() {
  let timer = 5;
  let lineIndex = 0;
  const hitMilestones = new Set();

  return {
    update(dt, playerState, onEvent) {
      timer -= dt;
      if (timer <= 0) {
        timer = 8 + Math.random() * 7;
        const line = DJ_LINES[lineIndex % DJ_LINES.length];
        lineIndex += 1;
        onEvent('dj-line', line);
      }
      for (const m of MILESTONES) {
        if (playerState.listeners >= m.at && !hitMilestones.has(m.at)) {
          hitMilestones.add(m.at);
          playerState.listeners += LISTENERS.unlockCost / 2;
          onEvent('milestone', m.line);
        }
      }
    },
  };
}
