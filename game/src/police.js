// police.js — wanted level 1-5, police cars and foot officers who chase
// the player, roadblocks at 5 stars, and wanted decay when hiding.
import * as THREE from 'three';
import { createVehicle } from './vehicle.js';
import { CITY } from './city.js';

export function createPolice(scene) {
  return { cars: [], officers: [], roadblock: [], hiddenTimer: 0, chaseTimer: 0 };
}

export function addWanted(state, amount, reason) {
  const before = state.wanted;
  state.wanted = Math.max(0, Math.min(5, state.wanted + amount));
  if (state.wanted > before) {
    state.audio.sirenBlip();
    if (reason) state.showMessage(reason + ` Wanted: ${'★'.repeat(state.wanted)}`);
    if (state.wanted > 0) state.audio.startSiren();
  }
  if (state.wanted === 0) state.audio.stopSiren();
}

function spawnPoliceCar(scene, police, state, nearPos) {
  const angle = Math.random() * Math.PI * 2;
  const x = nearPos.x + Math.cos(angle) * 45;
  const z = nearPos.z + Math.sin(angle) * 45;
  const car = createVehicle(scene, 'police', undefined, x, z, 0, false);
  car.driver = 'police';
  police.cars.push(car);
  return car;
}

function spawnOfficer(scene, police, state, nearPos) {
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1a2a6b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.4), navy);
  body.position.y = 1.15; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
  head.position.y = 1.85; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.48), new THREE.MeshLambertMaterial({ color: 0x0a1a4a }));
  cap.position.y = 2.08; g.add(cap);
  g.position.set(nearPos.x + (Math.random() - 0.5) * 20, 0, nearPos.z + (Math.random() - 0.5) * 20);
  scene.add(g);
  const officer = { group: g, pos: g.position, speed: 6.5, health: 30 };
  police.officers.push(officer);
  return officer;
}

export function updatePolice(dt, scene, police, state) {
  const playerPos = state.currentCar ? state.currentCar.group.position : state.player.pos;
  const wanted = state.wanted;
  const wantCars = wanted === 0 ? 0 : wanted <= 2 ? 1 : wanted <= 3 ? 2 : wanted === 4 ? 3 : 4;
  const wantOfficers = wanted === 0 ? 0 : Math.min(4, wanted);

  while (police.cars.length < wantCars) spawnPoliceCar(scene, police, state, playerPos);
  while (police.officers.length < wantOfficers) spawnOfficer(scene, police, state, playerPos);

  // Chase: police cars steer toward the player and ram.
  for (const car of police.cars) {
    const p = car.group.position;
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const dist = Math.hypot(dx, dz);
    const targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - car.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    car.yaw += Math.max(-2.2 * dt, Math.min(2.2 * dt, dy));
    const speed = Math.min(26 + wanted * 1.5, 34);
    car.speed = dist > 4 ? speed : 0;
    p.x += Math.sin(car.yaw) * car.speed * dt;
    p.z += Math.cos(car.yaw) * car.speed * dt;
    car.group.rotation.y = car.yaw;
    if (dist < 3.5) {
      // Ram: damage the player's car or the player on foot.
      if (state.currentCar) {
        state.currentCar.speed *= 0.4;
        state.damagePlayer(4 * dt * 10, 'Polisi menabrak mobilmu!');
      } else {
        state.damagePlayer(8 * dt * 10, 'Polisi menangkapmu!');
      }
      if (Math.random() < dt * 2) state.audio.horn();
    }
  }

  // Foot officers chase and punch the player.
  for (const off of police.officers) {
    const dx = playerPos.x - off.pos.x, dz = playerPos.z - off.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1.6) {
      off.pos.x += (dx / dist) * off.speed * dt;
      off.pos.z += (dz / dist) * off.speed * dt;
      off.group.rotation.y = Math.atan2(dx, dz);
    } else if (!state.currentCar) {
      state.damagePlayer(12 * dt, 'Polisi memukulmu!');
    }
  }

  // Roadblock at 5 stars: two police cars parked across the road ahead.
  if (wanted >= 5 && police.roadblock.length === 0) {
    const ahead = state.currentCar ? state.currentCar.yaw : state.player.yaw;
    const bx = playerPos.x + Math.sin(ahead) * 30;
    const bz = playerPos.z + Math.cos(ahead) * 30;
    for (const off of [-4, 4]) {
      const car = createVehicle(scene, 'police', undefined, bx + Math.cos(ahead) * off, bz - Math.sin(ahead) * off, ahead + Math.PI / 2, false);
      police.roadblock.push(car);
    }
    state.showMessage('ROADBLOCK! Polisi menutup jalan di depanmu!');
  }
  if (wanted < 5 && police.roadblock.length > 0) {
    for (const car of police.roadblock) scene.remove(car.group);
    police.roadblock = [];
  }

  // Wanted decay: hide from every police unit for a while, or swap cars.
  const nearestPolice = Math.min(
    ...police.cars.map((c) => Math.hypot(c.group.position.x - playerPos.x, c.group.position.z - playerPos.z)),
    ...police.officers.map((o) => Math.hypot(o.pos.x - playerPos.x, o.pos.z - playerPos.z)),
    999,
  );
  if (wanted > 0 && nearestPolice > 55) {
    police.hiddenTimer += dt;
    if (police.hiddenTimer > 8) {
      state.wanted -= 1;
      police.hiddenTimer = 0;
      state.showMessage(`Kamu bersembunyi. Wanted turun ke ${state.wanted}.`);
      if (state.wanted === 0) state.audio.stopSiren();
    }
  } else {
    police.hiddenTimer = 0;
  }
}

export function clearPolice(scene, police) {
  for (const car of [...police.cars, ...police.roadblock]) scene.remove(car.group);
  for (const off of police.officers) scene.remove(off.group);
  police.cars = []; police.officers = []; police.roadblock = []; police.hiddenTimer = 0;
}
