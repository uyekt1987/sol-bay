// missions.js — the SOL BAY story: Raka Santoso owes the Ombak gang.
// Five missions in order, each with dialogue, objectives and cash rewards.
import * as THREE from 'three';

export const MISSIONS = [
  {
    id: 'm1', title: 'Antar Paket', reward: 150,
    intro: 'Mira: "Raka, antar paket ini ke dermaga selatan. Jangan dibuka. Jangan telat."',
    steps: [
      { text: 'Ambil paket di bengkel Mira', target: new THREE.Vector3(-40, 0, -60), radius: 6 },
      { text: 'Antar paket ke dermaga selatan', target: new THREE.Vector3(0, 0, 175), radius: 8 },
    ],
  },
  {
    id: 'm2', title: 'Curi Mobil Bos', reward: 300,
    intro: 'Mira: "Bos Ombak parkir sedan sportnya di plaza. Ambil. Itu bayaran utangmu."',
    steps: [
      { text: 'Curi sedan sport merah di plaza', target: new THREE.Vector3(30, 0, 30), radius: 8, needCar: 'sport' },
      { text: 'Bawa mobil itu ke bengkel Mira', target: new THREE.Vector3(-40, 0, -60), radius: 8, needCar: 'sport' },
    ],
  },
  {
    id: 'm3', title: 'Kabur dari Polisi', reward: 400,
    intro: 'Bos Ombak: "Polisi mengendusmu, Raka. Buat mereka kehilangan jejakmu."',
    steps: [
      { text: 'Buat wanted naik ke 2 bintang (curi mobil / tabrak)', target: null, radius: 0, needWanted: 2 },
      { text: 'Lolos! Turunkan wanted sampai 0', target: null, radius: 0, needWanted: 0, needWantedZero: true },
    ],
  },
  {
    id: 'm4', title: 'Tagih Utang', reward: 500,
    intro: 'Mira: "Dua orang berutang pada kita. Tagih di pasar utara, lalu di pantai timur."',
    steps: [
      { text: 'Tagih utang di pasar utara', target: new THREE.Vector3(-88, 0, -132), radius: 7 },
      { text: 'Tagih utang di pantai timur', target: new THREE.Vector3(150, 0, 150), radius: 7 },
    ],
  },
  {
    id: 'm5', title: 'Balas Dendam', reward: 1000,
    intro: 'Raka: "Cukup. Hari ini Bos Ombak berhenti menagihku. Selamanya."',
    steps: [
      { text: 'Kejar mobil Bos Ombak di jalan utama', target: new THREE.Vector3(0, 0, -88), radius: 10, spawnBoss: true },
      { text: 'Kalahkan anggota Geng Ombak (3 orang)', target: new THREE.Vector3(0, 0, -88), radius: 14, needKills: 3 },
      { text: 'Kembali ke bengkel Mira — SOL BAY bebas', target: new THREE.Vector3(-40, 0, -60), radius: 8 },
    ],
  },
];

export function createMissionState() {
  return { marker: null, bossCar: null, killsAtStepStart: 0 };
}

export function currentMission(state) {
  return state.missionIndex < MISSIONS.length ? MISSIONS[state.missionIndex] : null;
}

export function currentStep(state) {
  const m = currentMission(state);
  return m ? m.steps[state.missionStep] : null;
}

export function missionObjectiveText(state) {
  const m = currentMission(state);
  if (!m) return 'Semua misi selesai! SOL BAY milikmu, Raka.';
  const step = m.steps[state.missionStep];
  return `${m.title} — ${step.text}`;
}

export function startMission(state, index) {
  const m = MISSIONS[index];
  if (!m) return;
  state.missionIndex = index;
  state.missionStep = 0;
  state.showDialog(m.title, m.intro);
  state.audio.pickup();
}

export function updateMissions(dt, state) {
  const m = currentMission(state);
  if (!m) return;
  const step = m.steps[state.missionStep];
  if (!step) return;
  const playerPos = state.currentCar ? state.currentCar.group.position : state.player.pos;

  if (step.needWanted !== undefined) {
    if (step.needWantedZero) {
      if (state.wanted === 0) advanceStep(state, m);
    } else if (state.wanted >= step.needWanted) {
      advanceStep(state, m);
    }
    return;
  }
  if (step.needKills) {
    if (state.kills - state.mission.killsAtStepStart >= step.needKills) advanceStep(state, m);
    return;
  }
  if (step.target) {
    const d = Math.hypot(step.target.x - playerPos.x, step.target.z - playerPos.z);
    state.missionTarget = step.target;
    if (step.needCar && !(state.currentCar && state.currentCar.model === step.needCar)) return;
    if (d < step.radius) {
      if (step.spawnBoss && !state.mission.bossCar) {
        state.spawnBossCar(step.target);
        state.showMessage('Itu mobil Bos Ombak! Kejar dan hentikan dia!');
      }
      advanceStep(state, m);
    }
  }
}

function advanceStep(state, mission) {
  state.missionStep++;
  state.audio.cash();
  if (state.missionStep >= mission.steps.length) {
    state.money += mission.reward;
    state.showDialog('Misi Selesai!', `${mission.title} selesai. Kamu dapat $${mission.reward}.`);
    state.showMessage(`+$${mission.reward} — ${mission.title} selesai!`);
    state.missionIndex++;
    state.missionStep = 0;
    if (state.missionIndex < MISSIONS.length) {
      setTimeout(() => startMission(state, state.missionIndex), 2500);
    } else {
      state.showDialog('SOL BAY BEBAS', 'Raka melunasi utangnya dan mengalahkan Geng Ombak. Kota ini milikmu sekarang.');
    }
    if (state.mission.killsAtStepStart !== undefined) state.mission.killsAtStepStart = state.kills;
  } else {
    const next = mission.steps[state.missionStep];
    if (next.needKills) state.mission.killsAtStepStart = state.kills;
    state.showMessage(`Objektif baru: ${next.text}`);
  }
  state.saveSoon();
}
