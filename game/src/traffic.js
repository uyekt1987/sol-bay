// traffic.js — AI traffic cars that follow the road grid and pedestrians
// who walk the sidewalks and flee when the player gets close.
import * as THREE from 'three';
import { createVehicle } from './vehicle.js';
import { resolveCircleCollision, CITY } from './city.js';

export function createTraffic(scene, city) {
  const traffic = { cars: [], peds: [] };
  const models = ['sedan', 'taxi', 'van', 'sedan', 'taxi'];
  const colors = [0xd94f30, 0x4caf50, 0xeeeeee, 0x7b5ea7, 0x222222];
  for (let i = 0; i < 10; i++) {
    const road = city.roadLines[Math.floor(Math.random() * city.roadLines.length)];
    const along = -CITY.halfSize + Math.random() * CITY.halfSize * 2;
    const x = road.axis === 'z' ? road.at + 3 : along;
    const z = road.axis === 'z' ? along : road.at + 3;
    const car = createVehicle(scene, models[i % models.length], colors[i % colors.length], x, z, road.axis === 'z' ? 0 : Math.PI / 2, false);
    car.driver = 'ai';
    car.ai = { road, dir: Math.random() > 0.5 ? 1 : -1, speed: 7 + Math.random() * 4, wait: 0 };
    traffic.cars.push(car);
  }
  // Parked cars the player can steal.
  const parkedModels = ['sedan', 'sport', 'taxi', 'van'];
  for (let i = 0; i < 6; i++) {
    const p = city.spawnPoints[i];
    const car = createVehicle(scene, parkedModels[i % parkedModels.length], undefined, p.x + 8, p.z + 8, Math.random() * Math.PI * 2, false);
    traffic.cars.push(car);
  }
  // Pedestrians on sidewalks.
  const shirtColors = [0xffd166, 0x6ec6ff, 0xff6b9d, 0x9be15d, 0xf4f1de, 0xc792ea];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: shirtColors[i % shirtColors.length] });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.35), shirt);
    body.position.y = 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
    head.position.y = 1.8; g.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.26), new THREE.MeshLambertMaterial({ color: 0x333344 }));
    legL.position.set(-0.15, 0.35, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.15; g.add(legR);
    const x = (Math.random() - 0.5) * CITY.halfSize * 2;
    const z = (Math.random() - 0.5) * CITY.halfSize * 2;
    g.position.set(x, 0, z);
    scene.add(g);
    traffic.peds.push({
      group: g, legL, legR, pos: g.position,
      dir: Math.random() * Math.PI * 2, speed: 1.4 + Math.random(), phase: Math.random() * 6,
      fleeing: false, alive: true,
    });
  }
  return traffic;
}

export function updateTraffic(dt, traffic, city, state) {
  const playerPos = state.player.pos;
  const playerCar = state.currentCar;
  for (const car of traffic.cars) {
    if (!car.ai || car.driver !== 'ai') continue;
    const ai = car.ai;
    if (ai.wait > 0) { ai.wait -= dt; continue; }
    const p = car.group.position;
    const forward = ai.road.axis === 'z' ? ai.dir : 0;
    const side = ai.road.axis === 'x' ? ai.dir : 0;
    p.x += side * ai.speed * dt;
    p.z += forward * ai.speed * dt;
    car.yaw = ai.road.axis === 'z' ? (ai.dir > 0 ? 0 : Math.PI) : (ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    car.group.rotation.y = car.yaw;
    // At an intersection, sometimes turn onto a crossing road.
    // Road lines sit at -154 + 44k, i.e. 22 (mod 44).
    const along = ai.road.axis === 'z' ? p.z : p.x;
    const r = ((along % 44) + 44) % 44;
    const nearGrid = Math.abs(r - 22) < 1.2;
    if (nearGrid && Math.random() < dt * 0.4) {
      const crossing = city.roadLines.filter((r) => r.axis !== ai.road.axis);
      ai.road = crossing[Math.floor(Math.random() * crossing.length)];
      ai.dir = Math.random() > 0.5 ? 1 : -1;
      if (ai.road.axis === 'z') p.x = ai.road.at + 3; else p.z = ai.road.at + 3;
    }
    if (Math.abs(p.x) > CITY.halfSize + 4 || Math.abs(p.z) > CITY.halfSize + 4) {
      ai.dir *= -1;
      p.x = Math.max(-CITY.halfSize, Math.min(CITY.halfSize, p.x));
      p.z = Math.max(-CITY.halfSize, Math.min(CITY.halfSize, p.z));
    }
    // Simple avoidance: slow down if another car is right ahead.
    for (const other of traffic.cars) {
      if (other === car) continue;
      const d = Math.hypot(other.group.position.x - p.x, other.group.position.z - p.z);
      if (d < 6) { ai.wait = 0.4; break; }
    }
  }

  for (const ped of traffic.peds) {
    if (!ped.alive) continue;
    const threat = playerCar ? playerCar.group.position : playerPos;
    const d = Math.hypot(threat.x - ped.pos.x, threat.z - ped.pos.z);
    const threatSpeed = playerCar ? Math.abs(playerCar.speed) : (state.player.moving ? 5 : 0);
    ped.fleeing = d < (threatSpeed > 3 ? 10 : 5);
    const speed = ped.fleeing ? 5.5 : ped.speed;
    if (ped.fleeing) ped.dir = Math.atan2(ped.pos.x - threat.x, ped.pos.z - threat.z);
    else if (Math.random() < dt * 0.08) ped.dir += (Math.random() - 0.5) * 1.6;
    ped.pos.x += Math.sin(ped.dir) * speed * dt;
    ped.pos.z += Math.cos(ped.dir) * speed * dt;
    ped.phase += dt * (ped.fleeing ? 12 : 6);
    ped.group.rotation.y = ped.dir;
    ped.legL.rotation.x = Math.sin(ped.phase) * 0.5;
    ped.legR.rotation.x = -Math.sin(ped.phase) * 0.5;
    resolveCircleCollision(ped.pos, 0.5, city.colliders);
    // Run over by a fast car: the pedestrian is hit.
    if (playerCar && Math.abs(playerCar.speed) > 4 && d < 2.2) {
      ped.alive = false;
      ped.group.visible = false;
      state.effects.spawnBlood(ped.pos.x, 1, ped.pos.z);
      state.addWanted(1, 'Menabrak pejalan kaki!');
      state.showMessage('Kamu menabrak pejalan kaki! Wanted naik.');
    }
  }
}
