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
  // New in polish pass: nimble bike, heavy truck, open-top convertible.
  motor: { length: 2.1, width: 0.8, height: 1.0, topSpeed: 41, accel: 25, color: 0xef476f },
  truck: { length: 6.6, width: 2.4, height: 2.2, topSpeed: 18, accel: 9, color: 0x118ab2 },
  convertible: { length: 4.3, width: 2.0, height: 0.8, topSpeed: 34, accel: 19, color: 0xffd166 },
  // Resubmit 3: city bus — slow, long, roomy; same arcade physics as cars.
  bus: { length: 7.6, width: 2.5, height: 2.6, topSpeed: 20, accel: 9, color: 0x06a77d },
};

export function buildCarMesh(model, color) {
  const spec = CAR_MODELS[model] || CAR_MODELS.sedan;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: color ?? spec.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x223344 });

  // Headlights (warm white, emissive) and taillights (red, emissive) on
  // every vehicle — they read clearly at dusk and from the minimap side.
  const addLights = (w, h, len) => {
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    for (const sx of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.08), headMat);
      head.position.set(sx * (w / 2 - 0.3), h, len / 2 + 0.03);
      g.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.08), tailMat);
      tail.position.set(sx * (w / 2 - 0.3), h, -len / 2 - 0.03);
      g.add(tail);
    }
  };
  // Dark hubcap disc on the outside face of each wheel.
  const addHubcap = (wheel, side) => {
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10),
      new THREE.MeshLambertMaterial({ color: 0xbbbbbb }),
    );
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
  };

  if (model === 'motor') {
    // Two-wheeler: slim tank + seat, handlebar, two spoked-look wheels.
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 1.0), bodyMat);
    tank.position.y = 0.75; tank.castShadow = true; g.add(tank);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.8), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    seat.position.set(0, 0.8, -0.55); g.add(seat);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.07), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.05, 0.75); g.add(bar);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff6c9 }));
    head.position.set(0, 0.85, 1.05); g.add(head);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.16, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheels = [];
    for (const wz of [0.75, -0.75]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.36, wz);
      g.add(w); wheels.push(w);
    }
    return { group: g, wheels, spec };
  }

  if (model === 'bus') {
    // City bus: tall body, dark window band, white roof stripe, 6 wheels.
    const bodyBus = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 2.2, spec.length), bodyMat);
    bodyBus.position.y = 1.35; bodyBus.castShadow = true; g.add(bodyBus);
    const windows = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.06, 0.7, spec.length * 0.82), glassMat);
    windows.position.y = 1.9; g.add(windows);
    const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.04, 0.18, spec.length), new THREE.MeshLambertMaterial({ color: 0xf4ead8 }));
    roofStripe.position.y = 2.5; g.add(roofStripe);
    const dest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.1), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    dest.position.set(0, 2.35, spec.length / 2 + 0.03); g.add(dest);
    addLights(spec.width, 0.6, spec.length);
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.34, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheels = [];
    for (const [wx, wz] of [[-spec.width / 2, 2.6], [spec.width / 2, 2.6], [-spec.width / 2, -1.4], [spec.width / 2, -1.4], [-spec.width / 2, -2.8], [spec.width / 2, -2.8]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.48, wz);
      g.add(w); addHubcap(w); wheels.push(w);
    }
    return { group: g, wheels, spec };
  }

  if (model === 'truck') {
    // Cab up front, tall cargo box behind, chunky wheels.
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 1.9, 3.6), bodyMat);
    cargo.position.set(0, 1.35, -1.2); cargo.castShadow = true; g.add(cargo);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.92, 1.3, 1.7), glassMat);
    cab.position.set(0, 1.0, 1.9); g.add(cab);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 0.35, 0.3), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    bumper.position.set(0, 0.35, 2.85); g.add(bumper);
    addLights(spec.width, 0.85, spec.length);
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.34, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheels = [];
    for (const [wx, wz] of [[-spec.width / 2, 2.4], [spec.width / 2, 2.4], [-spec.width / 2, -1.2], [spec.width / 2, -1.2], [-spec.width / 2, -2.4], [spec.width / 2, -2.4]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.48, wz);
      g.add(w); addHubcap(w); wheels.push(w);
    }
    return { group: g, wheels, spec };
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.width, spec.height * 0.7, spec.length), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  if (model === 'convertible') {
    // Open top: low windshield only, no roof cabin; visible seats inside.
    const shield = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.85, 0.45, 0.12), glassMat);
    shield.position.set(0, 1.05, 0.7); g.add(shield);
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    for (const sx of [-0.45, 0.45]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), seatMat);
      seat.position.set(sx, 0.95, -0.3); g.add(seat);
    }
  } else {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.85, spec.height * 0.6, spec.length * 0.5), glassMat);
    cabin.position.set(0, spec.height * 0.95, -spec.length * 0.05);
    g.add(cabin);
  }
  addLights(spec.width, 0.55, spec.length);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[-spec.width / 2, spec.length / 2 - 0.9], [spec.width / 2, spec.length / 2 - 0.9], [-spec.width / 2, -spec.length / 2 + 0.9], [spec.width / 2, -spec.length / 2 + 0.9]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w);
    addHubcap(w);
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
  // Exhaust puffs from the tailpipe while the engine works, thicker at speed.
  if (Math.abs(car.speed) > 4 && Math.random() < dt * (car.model === 'truck' ? 14 : 9)) {
    state.effects.spawnExhaust(car.group.position.x - fx * (spec.length / 2), 0.35, car.group.position.z - fz * (spec.length / 2));
  }
  if (Math.abs(car.speed) > 12 && Math.random() < dt * 6) {
    state.effects.spawnDust(car.group.position.x - fx * 2, 0.2, car.group.position.z - fz * 2, 3, 0xcbb98a);
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
