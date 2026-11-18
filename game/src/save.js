// VELMARA HEAT — saving to localStorage. Cash, listeners, missions
// finished and owned items persist between sessions; the wanted level and
// the player's position do not (every session starts fresh on the street).
// All storage access is guarded: a browser that blocks it just plays
// without saving.

const KEY = 'velmara-heat-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    if (data.version !== undefined && data.version !== 1) return null;
    return {
      cash: typeof data.cash === 'number' ? data.cash : 250,
      listeners: typeof data.listeners === 'number' ? data.listeners : 120,
      missionsDone: typeof data.missionsDone === 'number' ? data.missionsDone : 0,
      owned: {
        pistol: !!data.owned?.pistol,
        outfit: !!data.owned?.outfit,
        turbo: !!data.owned?.turbo,
      },
    };
  } catch {
    return null;
  }
}

export function saveGame(playerState, missionsDone) {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        cash: Math.floor(playerState.cash),
        listeners: Math.floor(playerState.listeners),
        missionsDone,
        owned: playerState.owned,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Saving was never available; nothing to clear.
  }
}
