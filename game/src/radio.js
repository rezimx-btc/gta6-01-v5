// VELMARA HEAT — the radio dial and the listener economy. Three stations,
// switched with R. Listeners are the second currency: they grow while the
// broadcast is live — drifting, near misses, and simply staying on air —
// and the WAVE 98 audience is what the missions pay out in as well.

import { RADIO_STATIONS, LISTENERS } from './config.js';

export function createRadio(audio) {
  let index = 0;
  let driftBank = 0;
  let airBank = 0;
  let nearMissCooldown = 0;

  return {
    station() {
      return RADIO_STATIONS[index];
    },
    setStationById(id) {
      const found = RADIO_STATIONS.findIndex((s) => s.id === id);
      if (found !== -1) {
        index = found;
        return audio.setStation(index);
      }
      return RADIO_STATIONS[index];
    },
    next() {
      index = (index + 1) % RADIO_STATIONS.length;
      return audio.setStation(index);
    },
    prev() {
      index = (index - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
      return audio.setStation(index);
    },
    update(dt, player, traffic, onEvent) {
      nearMissCooldown -= dt;
      const st = player.state;
      // Drifting banks listeners every second of slide.
      if (st.drifting) {
        driftBank += LISTENERS.perDriftSecond * dt;
        if (driftBank >= 1) {
          const gain = Math.floor(driftBank);
          driftBank -= gain;
          st.listeners += gain;
          onEvent('listeners', gain);
        }
      } else {
        driftBank = 0;
      }
      // Simply staying on air pays a slow trickle.
      airBank += (LISTENERS.perMinuteOnAir / 60) * dt;
      if (airBank >= 1) {
        const gain = Math.floor(airBank);
        airBank -= gain;
        st.listeners += gain;
      }
      // Near miss: a traffic car flashing past within arm's reach at speed.
      if (st.inCar && Math.abs(st.speed) > 14 && nearMissCooldown <= 0) {
        for (const car of traffic.cars) {
          const d = Math.hypot(car.x - st.x, car.z - st.z);
          if (d < 4.2) {
            nearMissCooldown = 2.5;
            st.listeners += LISTENERS.perNearMiss;
            onEvent('near-miss', LISTENERS.perNearMiss);
            break;
          }
        }
      }
    },
  };
}
