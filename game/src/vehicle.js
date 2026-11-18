// vehicle.js — cars of SOL BAY: sedan, taxi, van, sport.
// Simple arcade physics, enter/exit with E, stealing raises wanted.
import * as THREE from 'three';
import { resolveCircleCollision } from './city.js';

export const CAR_MODELS = {
  sedan: { length: 4.4, width: 1.9, height: 1.0, topSpeed: 26, accel: 14, color: 0x3a7bd5 },
  taxi: { length: 4.4, width: 1.9, height: 1.0, topSpeed: 24, accel: 13, color: 0xffc300 },
  van: { length: 5.2, width: 2.1, height: 1.6, topSpeed: 19, accel: 10, color: 0x8a8a92 },
  sport: { length: 4.2, width: 2.0, height: 0.85, topSpeed: 36, accel: 20, color: 0xe63946 },
  police: { length: 4.4, width: 1.9, height: 1.0, topSpeed: 30, accel: 17, color: 0x1a4fd6 },
};

export function buildCarMesh(model, color) {
  const spec = CAR_MODELS[model] || CAR_MODELS.sedan;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: color ?? spec.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x223344 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.width, spec.height * 0.7, spec.length), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.85, spec.height * 0.6, spec.length * 0.5), glassMat);
  cabin.position.set(0, spec.height * 0.95, -spec.length * 0.05);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[-spec.width / 2, spec.length / 2 - 0.9], [spec.width / 2, spec.length / 2 - 0.9], [-spec.width / 2, -spec.length / 2 + 0.9], [spec.width / 2, -spec.length / 2 + 0.9]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w);
    wheels.push(w);
  }
  if (model === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    sign.position.set(0, spec.height * 1.35, 0);
    g.add(sign);
  }
  if (model === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, spec.height * 1.3, 0);
    g.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.02, 0.3, spec.length + 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.62;
    g.add(stripe);
  }
  return { group: g, wheels, spec };
}

export function createVehicle(scene, model, color, x, z, yaw, owned) {
  const built = buildCarMesh(model, color);
  built.group.position.set(x, 0, z);
  built.group.rotation.y = yaw || 0;
  scene.add(built.group);
  return {
    group: built.group, wheels: built.wheels, spec: built.spec,
    model, owned: !!owned, speed: 0, steer: 0, yaw: yaw || 0,
    driver: null, // 'player' | 'ai' | null (parked)
    stolen: false, brakeLight: false,
  };
}

// Arcade driving: W/S throttle & brake, A/D steer, Space handbrake.
export function updateVehicleDriving(dt, input, car, city, state) {
  const spec = car.spec;
  const throttle = (input.isDown('w') ? 1 : 0) - (input.isDown('s') ? 1 : 0);
  const steering = (input.isDown('a') ? 1 : 0) - (input.isDown('d') ? 1 : 0);
  const handbrake = input.isDown('Space') || input.isDown('space');
  if (throttle > 0) car.speed += spec.accel * dt;
  else if (throttle < 0) car.speed -= (car.speed > 0.5 ? spec.accel * 1.4 : spec.accel * 0.5) * dt;
  else car.speed -= Math.sign(car.speed) * 6 * dt;
  if (Math.abs(car.speed) < 0.2 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-10, Math.min(spec.topSpeed, car.speed));
  if (handbrake) {
    car.speed *= Math.max(0, 1 - 3 * dt);
    if (Math.abs(car.speed) > 6 && Math.random() < dt * 20) {
      state.effects.spawnSmoke(car.group.position.x, 0.3, car.group.position.z);
      state.effects.addSkid(car.group.position.x, car.group.position.z, car.yaw);
    }
  }
  car.steer += ((steering * 0.55) - car.steer) * Math.min(1, dt * 8);
  const turn = car.steer * Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed || 1);
  car.yaw += turn * dt * 1.6;
  const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
  car.group.position.x += fx * car.speed * dt;
  car.group.position.z += fz * car.speed * dt;
  resolveCircleCollision(car.group.position, spec.length / 2, city.colliders);
  car.group.rotation.y = car.yaw;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
  if (Math.abs(car.speed) > 12 && Math.random() < dt * 3) {
    state.effects.spawnDust(car.group.position.x - fx * 2, 0.2, car.group.position.z - fz * 2, 1, 0x999999);
  }
  return Math.abs(car.speed);
}

export function nearestCar(cars, pos, maxDist) {
  let best = null, bestD = maxDist;
  for (const c of cars) {
    if (c.driver) continue;
    const d = Math.hypot(c.group.position.x - pos.x, c.group.position.z - pos.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
