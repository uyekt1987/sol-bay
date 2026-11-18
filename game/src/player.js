// player.js — Raka Santoso on foot: WASD movement, run, jump,
// animated low-poly character, third-person camera.
import * as THREE from 'three';
import { resolveCircleCollision } from './city.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xff5a3c });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2b3a67 });
  const hair = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirt);
  torso.position.y = 1.15;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin);
  head.position.y = 1.85;
  group.add(head);
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.48), hair);
  hairTop.position.y = 2.1;
  group.add(hairTop);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 0.3), pants);
  legL.position.set(-0.18, 0.38, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), shirt);
  armL.position.set(-0.48, 1.15, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.48;
  group.add(armR);
  scene.add(group);

  const player = {
    group, legL, legR, armL, armR,
    pos: new THREE.Vector3(0, 0, 20),
    velY: 0, grounded: true, yaw: 0, // facing
    walkPhase: 0, moving: false,
    health: 100, armor: 50,
  };
  group.position.copy(player.pos);
  return player;
}

export function updatePlayerOnFoot(dt, input, player, city, state) {
  const look = input.consumeLook();
  state.camYaw += look.yaw;
  state.camPitch = Math.max(-0.5, Math.min(0.55, state.camPitch + look.pitch));

  const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = run ? 9 : 5;
  let fx = 0, fz = 0;
  if (input.isDown('w')) fz -= 1;
  if (input.isDown('s')) fz += 1;
  if (input.isDown('a')) fx -= 1;
  if (input.isDown('d')) fx += 1;
  const len = Math.hypot(fx, fz);
  player.moving = len > 0;
  if (len > 0) {
    fx /= len; fz /= len;
    const sin = Math.sin(state.camYaw), cos = Math.cos(state.camYaw);
    // Forward on screen is (sin, cos); screen-right is (-cos, sin).
    const mx = -fx * cos - fz * sin;
    const mz = fx * sin - fz * cos;
    player.pos.x += mx * speed * dt;
    player.pos.z += mz * speed * dt;
    player.yaw = Math.atan2(mx, mz);
    player.walkPhase += dt * (run ? 13 : 9);
    if (Math.random() < dt * (run ? 6 : 2)) state.effects.spawnDust(player.pos.x, 0.1, player.pos.z, 1, 0xccbb99);
  }
  // Jump.
  if ((input.isDown('Space') || input.isDown('space')) && player.grounded) {
    player.velY = 7.5; player.grounded = false;
  }
  player.velY -= 22 * dt;
  player.pos.y += player.velY * dt;
  if (player.pos.y <= 0) { player.pos.y = 0; player.velY = 0; player.grounded = true; }

  resolveCircleCollision(player.pos, 0.6, city.colliders);
  player.group.position.copy(player.pos);
  player.group.rotation.y = player.yaw;
  const swing = player.moving ? Math.sin(player.walkPhase) * 0.55 : 0;
  player.legL.rotation.x = swing;
  player.legR.rotation.x = -swing;
  player.armL.rotation.x = -swing * 0.8;
  player.armR.rotation.x = swing * 0.8;
}

// Third-person camera: behind the player (or behind the car when driving).
export function updateThirdPersonCamera(camera, state, player, car) {
  const target = car ? car.group.position : player.pos;
  const dist = car ? 11 : 7;
  const height = car ? 4.2 : 3.2;
  const cx = target.x - Math.sin(state.camYaw) * Math.cos(state.camPitch) * dist;
  const cz = target.z - Math.cos(state.camYaw) * Math.cos(state.camPitch) * dist;
  const cy = (car ? 1.5 : 1.6) + Math.sin(state.camPitch) * dist + height * 0.4;
  camera.position.set(cx, cy, cz);
  camera.lookAt(target.x, target.y + 1.4, target.z);
}
