// hud.js — the SOL BAY heads-up display: money, health, armor, wanted
// stars, ammo, speed, mission objective, clock, dialogs and messages.
import { missionObjectiveText, currentMission, MISSIONS } from './missions.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    money: el('hud-money'), health: el('hud-health'), healthBar: el('health-bar'),
    armor: el('hud-armor'), armorBar: el('armor-bar'), wanted: el('hud-wanted'),
    ammo: el('hud-ammo'), speed: el('hud-speed'), objective: el('hud-objective'),
    clock: el('hud-clock'), message: el('hud-message'), dialog: el('dialog-box'),
    dialogTitle: el('dialog-title'), dialogText: el('dialog-text'),
    prompt: el('hud-prompt'), missionLabel: el('hud-mission'),
    packages: el('hud-packages'), courier: el('hud-courier'), timer: el('hud-timer'),
  };
}

export function updateHud(hud, state) {
  hud.money.textContent = `$${state.money}`;
  hud.health.textContent = `${Math.ceil(state.player.health)}`;
  hud.healthBar.style.width = `${Math.max(0, state.player.health)}%`;
  hud.armor.textContent = `${Math.ceil(state.player.armor)}`;
  hud.armorBar.style.width = `${Math.max(0, state.player.armor)}%`;
  hud.wanted.textContent = state.wanted > 0 ? '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted) : '☆☆☆☆☆';
  hud.wanted.style.color = state.wanted >= 4 ? '#ff3333' : state.wanted > 0 ? '#ffcc00' : '#ffffff';
  hud.ammo.textContent = `${state.ammo}`;
  const speed = state.currentCar ? Math.abs(state.currentCar.speed) * 3.6 : 0;
  hud.speed.textContent = state.currentCar ? `${Math.round(speed)} km/h` : '';
  hud.objective.textContent = missionObjectiveText(state);
  const m = currentMission(state);
  hud.missionLabel.textContent = m ? `MISI ${state.missionIndex + 1}/${MISSIONS.length}: ${m.title}` : 'SEMUA MISI SELESAI';
  const hh = Math.floor(state.clockMinutes / 60) % 24;
  const mm = Math.floor(state.clockMinutes % 60);
  hud.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  // Hidden-package counter (8 total) and the repeatable courier job.
  if (hud.packages) hud.packages.textContent = `${(state.packagesTaken || []).length}/8`;
  if (hud.courier) {
    const c = state.courier;
    hud.courier.textContent = c && c.active
      ? `ANTAR KILAT → ${c.label}: ${Math.ceil(c.timeLeft)} dtk (+$80)`
      : '';
  }
  if (hud.timer) {
    const tl = state.mission ? state.mission.timeLeft : null;
    hud.timer.textContent = tl !== null && tl !== undefined
      ? `⏱ Waktu misi: ${Math.ceil(tl)} dtk`
      : '';
  }
}

export function showHudMessage(hud, text) {
  hud.message.textContent = text;
  hud.message.style.opacity = '1';
  clearTimeout(showHudMessage._t);
  showHudMessage._t = setTimeout(() => { hud.message.style.opacity = '0'; }, 3500);
}

export function showHudDialog(hud, title, text) {
  hud.dialogTitle.textContent = title;
  hud.dialogText.textContent = text;
  hud.dialog.style.display = 'block';
  clearTimeout(showHudDialog._t);
  showHudDialog._t = setTimeout(() => { hud.dialog.style.display = 'none'; }, 5000);
}

export function showHudPrompt(hud, text) {
  if (!text) { hud.prompt.style.display = 'none'; return; }
  hud.prompt.textContent = text;
  hud.prompt.style.display = 'block';
}
