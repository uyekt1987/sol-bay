// save.js — save / load SOL BAY progress in localStorage.
const SAVE_KEY = 'solbay-save-v1';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      missionIndex: state.missionIndex,
      missionStep: state.missionStep,
      health: state.player.health,
      armor: state.player.armor,
      ammo: state.ammo,
      ownedCars: state.ownedCars,
      playerPos: [state.player.pos.x, state.player.pos.y, state.player.pos.z],
      clockMinutes: state.clockMinutes,
      packagesTaken: state.packagesTaken || [],
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number') return null;
    return data;
  } catch (err) { return null; }
}

export function hasSave() { return loadGame() !== null; }

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* storage unavailable */ }
}
