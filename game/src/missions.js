// missions.js — the SOL BAY story: Raka Santoso owes the Ombak gang.
// Eleven missions in order, each with dialogue, objectives and cash rewards.
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
      { text: 'Tagih utang di pasar utara', target: new THREE.Vector3(-88, 0, -110), radius: 7 },
      { text: 'Tagih utang di pantai timur', target: new THREE.Vector3(150, 0, 150), radius: 7 },
    ],
  },
  {
    id: 'm5', title: 'Balas Dendam', reward: 1000,
    intro: 'Raka: "Cukup. Hari ini Bos Ombak berhenti menagihku. Selamanya."',
    steps: [
      { text: 'Kejar mobil Bos Ombak di jalan utama', target: new THREE.Vector3(22, 0, -88), radius: 10, spawnBoss: true },
      { text: 'Kalahkan anggota Geng Ombak (3 orang)', target: new THREE.Vector3(22, 0, -88), radius: 14, needKills: 3 },
      { text: 'Kembali ke bengkel Mira — SOL BAY bebas', target: new THREE.Vector3(-40, 0, -60), radius: 8 },
    ],
  },
  {
    id: 'm6', title: 'Antar Cepat', reward: 600, timeLimit: 150,
    intro: 'Mira: "Bos Ombak kabur tapi anak buahnya masih menguasai pelabuhan. Antar obat dan suku cadang ini ke dua titik — cepat, sebelum mereka sadar!"',
    steps: [
      { text: 'Ambil paket cepat di bengkel Mira', target: new THREE.Vector3(-40, 0, -60), radius: 6 },
      { text: 'Antar ke gudang pelabuhan selatan', target: new THREE.Vector3(60, 0, 165), radius: 8 },
      { text: 'Antar ke warung timur sebelum waktu habis', target: new THREE.Vector3(110, 0, 44), radius: 8 },
    ],
  },
  {
    id: 'm7', title: 'Selamatkan Mira', reward: 800,
    intro: 'Mira: "Raka! Geng Ombak mengepungku di taman barat! Cepat ke sini!"',
    steps: [
      { text: 'Temui Mira di taman barat', target: new THREE.Vector3(-110, 0, 88), radius: 8 },
      { text: 'Hadapi penyergap Geng Ombak di taman', target: new THREE.Vector3(-110, 0, 88), radius: 10, spawnGang: 3 },
      { text: 'Kalahkan anggota geng yang menyerang (3 orang)', target: new THREE.Vector3(-110, 0, 88), radius: 16, needKills: 3 },
      { text: 'Bawa Mira kabur ke bengkel', target: new THREE.Vector3(-40, 0, -60), radius: 8 },
    ],
  },
  {
    id: 'm8', title: 'Serbu Markas Ombak', reward: 1500,
    intro: 'Raka: "Markas mereka di gudang utara. Kita akhiri ini malam ini — ambil uangnya, bubarkan gengnya."',
    steps: [
      { text: 'Serbu markas Geng Ombak di gudang utara', target: new THREE.Vector3(110, 0, -132), radius: 10, spawnGang: 4 },
      { text: 'Kalahkan penjaga markas (4 orang)', target: new THREE.Vector3(110, 0, -132), radius: 18, needKills: 4 },
      { text: 'Ambil uang hasil jarahan di dalam markas', target: new THREE.Vector3(118, 0, -140), radius: 6 },
      { text: 'Kembali ke Mira — Geng Ombak tamat', target: new THREE.Vector3(-40, 0, -60), radius: 8 },
    ],
  },
  {
    id: 'm9', title: 'Pelabuhan Gelap', reward: 1200,
    intro: 'Mira: "Bos Ombak kabur dari markas utara — anak buahnya menyelundupkan senjata lewat Pelabuhan Sol Bay yang baru. Selidiki dermaganya, Raka!"',
    steps: [
      { text: 'Selidiki gerbang Pelabuhan Sol Bay', target: new THREE.Vector3(120, 0, 168), radius: 8, spawnGang: 3 },
      { text: 'Kalahkan penyelundup Geng Ombak (3 orang)', target: new THREE.Vector3(120, 0, 168), radius: 16, needKills: 3 },
      { text: 'Periksa kontainer mencurigakan di dermaga', target: new THREE.Vector3(150, 0, 185), radius: 6 },
      { text: 'Lapor kembali ke bengkel Mira', target: new THREE.Vector3(-40, 0, -60), radius: 8 },
    ],
  },
  {
    id: 'm10', title: 'Balapan Liar', reward: 1500, timeLimit: 180,
    intro: 'Raka: "Pembalap Geng Ombak menantangku balapan jalanan keliling kota. Menang, dan jalanan Sol Bay milik kita."',
    steps: [
      { text: 'Ke garis start di dermaga selatan — balapan dimulai!', target: new THREE.Vector3(0, 0, 175), radius: 8, spawnGang: 2 },
      { text: 'Checkpoint 1: pantai timur', target: new THREE.Vector3(150, 0, 150), radius: 9 },
      { text: 'Checkpoint 2: gudang utara', target: new THREE.Vector3(110, 0, -132), radius: 9 },
      { text: 'Checkpoint 3: Pelabuhan Sol Bay', target: new THREE.Vector3(140, 0, 185), radius: 9 },
      { text: 'Finis! Kembali ke bengkel Mira sebagai juara', target: new THREE.Vector3(-40, 0, -60), radius: 8 },
    ],
  },
  {
    id: 'm11', title: 'Jatuhnya Bos Ombak', reward: 2500,
    intro: 'Mira: "Ini akhirnya, Raka. Bos Ombak bersembunyi di ujung dermaga pelabuhan dengan pengawal terakhirnya. Akhiri semua ini."',
    steps: [
      { text: 'Serbu markas terakhir di Pelabuhan Sol Bay', target: new THREE.Vector3(140, 0, 185), radius: 10, spawnGang: 5 },
      { text: 'Kalahkan pengawal pelabuhan (5 orang)', target: new THREE.Vector3(140, 0, 185), radius: 18, needKills: 5 },
      { text: 'Hadapi Bos Ombak di ujung dermaga', target: new THREE.Vector3(150, 0, 198), radius: 7, spawnGang: 2 },
      { text: 'Kalahkan Bos Ombak dan pengawalnya (2 orang)', target: new THREE.Vector3(150, 0, 198), radius: 16, needKills: 2 },
      { text: 'Kembali ke Mira — SOL BAY benar-benar bebas', target: new THREE.Vector3(-40, 0, -60), radius: 8 },
    ],
  },
];

export function createMissionState() {
  return { marker: null, bossCar: null, killsAtStepStart: 0, timeLeft: null, gangSpawnedAt: -1 };
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
  state.mission.timeLeft = m.timeLimit ?? null;
  state.mission.gangSpawnedAt = -1;
  state.showDialog(m.title, m.intro);
  state.audio.pickup();
}

export function updateMissions(dt, state) {
  const m = currentMission(state);
  if (!m) return;
  const step = m.steps[state.missionStep];
  if (!step) return;
  const playerPos = state.currentCar ? state.currentCar.group.position : state.player.pos;

  // Timed missions (m6): the clock runs from mission start; expiry restarts
  // the mission from step 0 instead of soft-locking the player.
  if (state.mission.timeLeft !== null && state.mission.timeLeft !== undefined) {
    state.mission.timeLeft -= dt;
    if (state.mission.timeLeft <= 0) {
      state.missionStep = 0;
      state.mission.timeLeft = m.timeLimit;
      state.mission.gangSpawnedAt = -1;
      state.showDialog('Waktu Habis!', 'Kamu terlambat. Misi diulang dari awal — lebih cepat kali ini!');
      state.showMessage('Waktu habis! Misi diulang dari awal.');
      state.saveSoon();
      return;
    }
  }

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
      // Gang ambush (m7/m8): spawn the squad once, on first arrival.
      if (step.spawnGang && state.mission.gangSpawnedAt !== state.missionStep) {
        state.mission.gangSpawnedAt = state.missionStep;
        if (state.spawnGangSquad) state.spawnGangSquad(step.target, step.spawnGang);
        state.showMessage(`Anggota Geng Ombak menyerang! (${step.spawnGang} orang)`);
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
    state.mission.timeLeft = null;
    if (state.effects && state.effects.goldFlash) state.effects.goldFlash();
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
