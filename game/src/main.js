// main.js — SOL BAY bootstrap + game loop.
// Raka Santoso, kurir yang berutang pada Geng Ombak, di kota pantai Sol Bay.
// Third-person open world: walk, drive, steal cars, police wanted level,
// 11 story missions, combat, HUD + minimap, save, synthesized WebAudio.
import * as THREE from 'three';
import { buildCity, CITY } from './city.js';
import { createPlayer, updatePlayerOnFoot, updateThirdPersonCamera } from './player.js';
import { createVehicle, updateVehicleDriving, nearestCar } from './vehicle.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice, addWanted, clearPolice } from './police.js';
import { createMissionState, startMission, updateMissions, currentStep, MISSIONS } from './missions.js';
import { createCombat, updateCombat, spawnGangSquad } from './combat.js';
import { createHud, updateHud, showHudMessage, showHudDialog, showHudPrompt } from './hud.js';
import { createMinimap, drawMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { createEffects } from './effects.js';
import { createInput } from './input.js';
import { saveGame, loadGame, hasSave } from './save.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Warm late-afternoon sky: vertical gradient (blue → gold → peach) drawn
// once on a canvas and used as the scene background.
{
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 16; skyCanvas.height = 512;
  const sctx = skyCanvas.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#5aa9dd');
  grad.addColorStop(0.45, '#8ec8e8');
  grad.addColorStop(0.72, '#ffd9a0');
  grad.addColorStop(1, '#ff9a5c');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 16, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
}
scene.fog = new THREE.Fog(0xf2c48d, 180, 420);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 8, 30);

// Warm low sun with soft shadows + sky-bounce fill for a sun-soaked coast.
const sun = new THREE.DirectionalLight(0xffdf9e, 1.9);
sun.position.set(90, 110, 70);
sun.castShadow = true;
sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xffe0b3, 0x3a6b4f, 0.55));
scene.add(new THREE.AmbientLight(0xbfd9ff, 0.55));

// ---- shared game state -------------------------------------------------
const state = {
  mode: 'menu', // menu | playing | paused
  money: 200, wanted: 0, ammo: 24, kills: 0,
  missionIndex: 0, missionStep: 0, missionTarget: null,
  clockMinutes: 8 * 60,
  camYaw: Math.PI, camPitch: 0.12, camYawOffset: 0,
  currentCar: null, inCar: false,
  punchCd: 0, saveTimer: 0,
  ownedCars: [],
  packagesTaken: [], packages: [], courier: { active: false, target: null, label: '', timeLeft: 0 },
  time: 0,
  player: null, city: null, traffic: null, police: null, combat: null,
  mission: null, effects: null, audio: null, input: null, hud: null, minimap: null,
};

state.showMessage = (t) => showHudMessage(state.hud, t);
state.showDialog = (title, text) => showHudDialog(state.hud, title, text);
state.addWanted = (n, reason) => addWanted(state, n, reason);
state.saveSoon = () => { state.saveTimer = 0.5; };
state.damagePlayer = (amount, reason) => {
  if (state.mode !== 'playing') return;
  let left = amount;
  if (state.player.armor > 0) {
    const absorbed = Math.min(state.player.armor, left);
    state.player.armor -= absorbed; left -= absorbed;
  }
  if (left > 0) state.player.health -= left;
  state.effects.damageFlash();
  if (reason && Math.random() < 0.1) state.showMessage(reason);
  if (state.player.health <= 0) respawnPlayer();
};
state.spawnBossCar = (target) => {
  const boss = createVehicle(scene, 'sport', 0x111111, target.x + 10, target.z, 0, false);
  boss.driver = 'boss';
  state.traffic.cars.push(boss);
  state.mission.bossCar = boss;
  spawnGangSquad(scene, state.combat, target, 3);
  state.showMessage('Anggota Geng Ombak muncul! Kalahkan mereka!');
};
state.spawnGangSquad = (target, count) => {
  spawnGangSquad(scene, state.combat, target, count);
};

function respawnPlayer() {
  state.player.health = 100;
  state.player.armor = 50;
  state.money = Math.max(0, state.money - 100);
  state.wanted = 0;
  state.audio.stopSiren();
  clearPolice(scene, state.police);
  exitCar(true);
  state.player.pos.set(0, 0, 20);
  state.player.group.position.copy(state.player.pos);
  state.showDialog('Kamu Pingsan', 'Polisi membawamu ke rumah sakit. Biaya $100. Wanted dihapus.');
  state.showMessage('Kamu pingsan dan dirawat. -$100.');
}

// ---- world -------------------------------------------------------------
state.city = buildCity(scene);
state.player = createPlayer(scene);
state.traffic = createTraffic(scene, state.city);
state.police = createPolice(scene);
state.combat = createCombat(scene);
state.mission = createMissionState();
state.effects = createEffects(scene);
state.audio = createAudio();
state.input = createInput(canvas);
state.hud = createHud();
state.minimap = createMinimap();

// The boss's red sport sedan parked at the plaza (mission 2 target).
const missionSport = createVehicle(scene, 'sport', 0xe63946, 30, 30, Math.PI / 2, false);
state.traffic.cars.push(missionSport);

// A gang squad guards the plaza from the start, so combat is visible early.
spawnGangSquad(scene, state.combat, new THREE.Vector3(30, 0, 30), 2);

// Mission target marker: a tall yellow beacon column.
const markerGeo = new THREE.CylinderGeometry(1.2, 1.2, 30, 10, 1, true);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
const marker = new THREE.Mesh(markerGeo, markerMat);
scene.add(marker);
const markerBase = new THREE.Mesh(new THREE.RingGeometry(2, 4, 24), new THREE.MeshBasicMaterial({ color: 0xffe14d, side: THREE.DoubleSide }));
markerBase.rotation.x = -Math.PI / 2;
markerBase.position.y = 0.05;
scene.add(markerBase);

// ---- hidden packages: 12 "Paket Rahasia" collectibles (+$50 each) -------
// Fixed spots near landmarks; walk up close and press E to collect.
const PACKAGE_SPOTS = [
  [12, 12], [-120, 170], [52, -112], [-52, -112],
  [-88, -110], [150, 150], [-110, 88], [110, -132],
  // New in polish pass: two at the harbour, two on quiet roads.
  [128, 192], [165, 178], [22, -140], [-22, 140],
];
for (let i = 0; i < PACKAGE_SPOTS.length; i++) {
  const [px, pz] = PACKAGE_SPOTS[i];
  const pkg = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.MeshBasicMaterial({ color: 0x33ddff }),
  );
  box.position.y = 0.9;
  pkg.add(box);
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshBasicMaterial({ color: 0x33ddff, transparent: true, opacity: 0.25 }),
  );
  shell.position.y = 0.9;
  pkg.add(shell);
  pkg.position.set(px, 0, pz);
  scene.add(pkg);
  state.packages.push({ index: i, pos: new THREE.Vector3(px, 0, pz), mesh: pkg, taken: false });
}

function tryPickupPackage() {
  if (state.inCar) return false;
  for (const p of state.packages) {
    if (p.taken) continue;
    if (Math.hypot(p.pos.x - state.player.pos.x, p.pos.z - state.player.pos.z) < 3) {
      p.taken = true;
      p.mesh.visible = false;
      state.packagesTaken.push(p.index);
      state.money += 50;
      state.showMessage(`Paket Rahasia ditemukan! +$50 (${state.packagesTaken.length}/12)`);
      state.audio.pickup();
      state.saveSoon();
      return true;
    }
  }
  return false;
}

// ---- repeatable courier job: "Antar Kilat" (+$80, 60 s) -----------------
// Unlocks after mission 1; start it with C near the dealer.
const COURIER_DESTS = [
  { label: 'Dermaga Selatan', x: 0, z: 175 },
  { label: 'Pasar Utara', x: -88, z: -110 },
  { label: 'Pantai Timur', x: 150, z: 150 },
  { label: 'Hotel Karang', x: 66, z: 110 },
  { label: 'Gudang Utara', x: 110, z: -132 },
  { label: 'Pelabuhan Sol Bay', x: 140, z: 185 },
  { label: 'Pantai Selatan', x: -60, z: 175 },
];
function startCourier() {
  if (state.missionIndex < 1) {
    state.showMessage('Antar Kilat baru buka setelah kamu menyelesaikan misi 1.');
    return;
  }
  if (state.courier.active) return;
  const dest = COURIER_DESTS[Math.floor(Math.random() * COURIER_DESTS.length)];
  state.courier = { active: true, target: new THREE.Vector3(dest.x, 0, dest.z), label: dest.label, timeLeft: 60 };
  state.showMessage(`Antar Kilat: antar ke ${dest.label} dalam 60 detik! (+$80)`);
  state.audio.pickup();
}
function updateCourier(dt) {
  const c = state.courier;
  if (!c.active) return;
  c.timeLeft -= dt;
  const pos = state.currentCar ? state.currentCar.group.position : state.player.pos;
  if (Math.hypot(c.target.x - pos.x, c.target.z - pos.z) < 7) {
    c.active = false;
    state.money += 80;
    state.showMessage('Antar Kilat selesai! +$80. Tekan C di dealer untuk antar lagi.');
    state.audio.cash();
    state.saveSoon();
    return;
  }
  if (c.timeLeft <= 0) {
    c.active = false;
    state.showMessage('Antar Kilat gagal — waktu habis. Coba lagi di dealer.');
  }
}
// ---- entering / exiting cars (edge-triggered keys) ---------------------
let prevE = false;
let prevB = false, prevN = false, prevC = false;
function tryEnterExitCar() {
  if (state.inCar) {
    exitCar(false);
    return;
  }
  const car = nearestCar(state.traffic.cars, state.player.pos, 4.5);
  if (!car) return;
  state.currentCar = car;
  state.inCar = true;
  car.driver = 'player';
  state.player.group.visible = false;
  state.camYaw = car.yaw;
  if (!car.owned && !car.stolen) {
    car.stolen = true;
    state.addWanted(1, 'Mobil dicuri! Seseorang menelepon polisi.');
  }
  state.audio.horn();
}

function exitCar(force) {
  if (!state.currentCar) return;
  const car = state.currentCar;
  car.driver = null;
  car.speed = 0;
  const side = new THREE.Vector3(Math.cos(car.yaw), 0, -Math.sin(car.yaw));
  state.player.pos.set(car.group.position.x + side.x * 2.5, 0, car.group.position.z + side.z * 2.5);
  state.player.group.position.copy(state.player.pos);
  state.player.group.visible = true;
  state.currentCar = null;
  state.inCar = false;
}

// ---- dealer: buy a car ($800) or ammo ($50) -----------------------------
function nearDealer() {
  const p = state.player.pos;
  return Math.hypot(p.x - state.city.dealerPos.x, p.z - state.city.dealerPos.z) < 12 && !state.inCar;
}
function buyCar() {
  if (state.money < 800) { state.showMessage('Uang tidak cukup! Mobil sport $800.'); return; }
  state.money -= 800;
  const car = createVehicle(scene, 'sport', 0x2ec4b6, state.city.dealerPos.x - 8, state.city.dealerPos.z + 6, 0, true);
  state.traffic.cars.push(car);
  state.ownedCars.push('sport');
  state.showMessage('Kamu membeli mobil sport! Mobilmu tersimpan di garasi.');
  state.audio.cash();
  state.saveSoon();
}
function buyAmmo() {
  if (state.money < 50) { state.showMessage('Uang tidak cukup! Amunisi $50.'); return; }
  state.money -= 50;
  state.ammo += 24;
  state.showMessage('Amunisi +24. Siap tempur!');
  state.audio.pickup();
  state.saveSoon();
}

// ---- menus --------------------------------------------------------------
const startScreen = document.getElementById('start-screen');
const hudEl = document.getElementById('hud');
const pauseScreen = document.getElementById('pause-screen');
const btnContinue = document.getElementById('btn-continue');
if (!hasSave()) btnContinue.style.display = 'none';

function beginGame(fromSave) {
  state.audio.init();
  state.audio.startMusic();
  if (fromSave) {
    const data = loadGame();
    if (data) {
      state.money = data.money;
      state.missionIndex = Math.min(data.missionIndex, MISSIONS.length - 1);
      state.player.health = data.health ?? 100;
      state.player.armor = data.armor ?? 50;
      state.ammo = data.ammo ?? 24;
      state.ownedCars = data.ownedCars || [];
      state.packagesTaken = data.packagesTaken || [];
      for (const p of state.packages) {
        if (state.packagesTaken.includes(p.index)) { p.taken = true; p.mesh.visible = false; }
      }
      if (data.playerPos) state.player.pos.set(data.playerPos[0], 0, data.playerPos[2]);
      state.clockMinutes = data.clockMinutes ?? 480;
      state.showMessage('Save dimuat. Selamat datang kembali di Sol Bay!');
      // BUG FIX: startMission() resets missionStep to 0, so restore the saved
      // step AFTER starting the mission (was silently lost before).
      state._savedStep = data.missionStep || 0;
    }
  } else {
    state.money = 200; state.missionIndex = 0; state.missionStep = 0;
    state.ammo = 24; state.kills = 0; state.wanted = 0;
    state.packagesTaken = [];
    for (const p of state.packages) { p.taken = false; p.mesh.visible = true; }
    state.player.health = 100; state.player.armor = 50;
    state.player.pos.set(0, 0, 20);
  }
  startScreen.style.display = 'none';
  hudEl.classList.remove('hidden');
  state.mode = 'playing';
  startMission(state, state.missionIndex);
  if (state._savedStep !== undefined) {
    const m = MISSIONS[state.missionIndex];
    state.missionStep = Math.min(state._savedStep, m ? m.steps.length - 1 : 0);
    const step = m && m.steps[state.missionStep];
    if (step && step.needKills) state.mission.killsAtStepStart = state.kills;
    delete state._savedStep;
  }
}

document.getElementById('btn-start').addEventListener('click', () => beginGame(false));
btnContinue.addEventListener('click', () => beginGame(true));
document.getElementById('btn-howto').addEventListener('click', () => {
  const h = document.getElementById('howto');
  h.style.display = h.style.display === 'block' ? 'none' : 'block';
});
document.getElementById('btn-resume').addEventListener('click', () => {
  pauseScreen.style.display = 'none';
  state.mode = 'playing';
});
document.getElementById('btn-save-quit').addEventListener('click', () => {
  saveGame(state);
  pauseScreen.style.display = 'none';
  hudEl.classList.add('hidden');
  startScreen.style.display = 'flex';
  state.mode = 'menu';
  state.input.releasePointerLock();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.mode === 'playing') {
    state.mode = 'paused';
    pauseScreen.style.display = 'flex';
    state.input.releasePointerLock();
  } else if (e.code === 'Escape' && state.mode === 'paused') {
    pauseScreen.style.display = 'none';
    state.mode = 'playing';
  }
  if (e.code === 'KeyM') {
    const muted = state.audio.toggleMute();
    state.showMessage(muted ? 'Suara dimatikan.' : 'Suara dinyalakan.');
  }
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- main loop -----------------------------------------------------------
const clock = new THREE.Clock();
let bossChaseDone = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.mode === 'playing') {
    state.time += dt;
    state.clockMinutes += dt * 0.6; // a game hour every 100 real seconds
    const step = currentStep(state);
    state.missionTarget = step && step.target ? step.target : null;

    // E to enter/exit a car (edge-triggered); near a package it collects it.
    const eDown = state.input.isDown('e');
    if (eDown && !prevE) {
      if (!tryPickupPackage()) tryEnterExitCar();
    }
    prevE = eDown;

    // Animate the sea foam drifting toward the sand.
    for (const w of state.city.waves || []) {
      w.mesh.position.z = w.baseZ + Math.sin(state.time * 0.8 + w.phase) * 2.5;
    }
    // Spin + bob the uncollected packages so they catch the eye.
    for (const p of state.packages) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = Math.sin(state.time * 2 + p.index) * 0.15;
    }

    if (state.inCar && state.currentCar) {
      const speed = updateVehicleDriving(dt, state.input, state.currentCar, state.city, state);
      // Camera follows the car; mouse look adds a small free offset.
      const look = state.input.consumeLook();
      state.camYawOffset = Math.max(-1.2, Math.min(1.2, state.camYawOffset + look.yaw));
      state.camPitch = Math.max(-0.5, Math.min(0.55, state.camPitch + look.pitch));
      state.camYaw = state.currentCar.yaw + state.camYawOffset;
      state.audio.setEngine(Math.abs(speed) / 36, true);
      state.input.consumeClick();
    } else {
      state.camYawOffset = 0;
      updatePlayerOnFoot(dt, state.input, state.player, state.city, state);
      state.audio.setEngine(0, false);
    }

    // Dealer prompt + purchases.
    // BUG FIX (dealer repeat-buy): purchases are edge-triggered here too —
    // buyCar()/buyAmmo() run only on the keydown edge (prevB/prevN), and
    // input.js now ignores e.repeat, so holding B buys exactly once.
    if (nearDealer()) {
      const courierHint = state.missionIndex >= 1 && !state.courier.active ? ' · C Antar Kilat ($80, 60 dtk)' : '';
      showHudPrompt(state.hud, `DEALER MOBIL — tekan B beli mobil sport ($800) · N beli amunisi 24 ($50)${courierHint}`);
      const bDown = state.input.keys.has('b');
      if (bDown && !prevB) buyCar();
      prevB = bDown;
      const nDown = state.input.keys.has('n');
      if (nDown && !prevN) buyAmmo();
      prevN = nDown;
      const cDown = state.input.keys.has('c');
      if (cDown && !prevC) startCourier();
      prevC = cDown;
    } else {
      showHudPrompt(state.hud, null);
      prevB = state.input.keys.has('b');
      prevN = state.input.keys.has('n');
      prevC = state.input.keys.has('c');
    }

    updateTraffic(dt, state.traffic, state.city, state);
    updatePolice(dt, scene, state.police, state);
    updateMissions(dt, state);
    updateCourier(dt);
    // A live courier job overrides the mission beacon with its destination.
    if (state.courier.active) state.missionTarget = state.courier.target;
    updateCombat(dt, scene, state.combat, state);
    state.effects.update(dt);

    // Boss car (mission 5) drives away along the main road when approached.
    const boss = state.mission.bossCar;
    if (boss && !bossChaseDone) {
      boss.group.position.z -= 8 * dt;
      boss.group.rotation.y = Math.PI;
      if (boss.group.position.z < -CITY.halfSize) { bossChaseDone = true; boss.driver = null; }
    }

    // Mission marker beacon follows the current objective.
    if (state.missionTarget) {
      marker.visible = true;
      markerBase.visible = true;
      marker.position.set(state.missionTarget.x, 15, state.missionTarget.z);
      markerBase.position.set(state.missionTarget.x, 0.05, state.missionTarget.z);
      marker.rotation.y += dt;
    } else {
      marker.visible = false;
      markerBase.visible = false;
    }

    // Autosave every few seconds after a change.
    if (state.saveTimer > 0) {
      state.saveTimer -= dt;
      if (state.saveTimer <= 0) saveGame(state);
    }

    updateHud(state.hud, state);
    drawMinimap(state.minimap, state);
  }

  updateThirdPersonCamera(camera, state, state.player, state.currentCar);
  renderer.render(scene, camera);
}

animate();

// Exposed for automated play-testing / screenshots.
window.__solbay = { state, THREE, startMission };
window.__shotReady = true;
