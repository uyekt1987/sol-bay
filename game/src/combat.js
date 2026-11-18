// combat.js — melee punch (F) and pistol (mouse click) with ammo,
// gang enemies who chase and attack, health + armor.
import * as THREE from 'three';

export function createCombat(scene) {
  return { enemies: [], bullets: [] };
}

export function spawnGangEnemy(scene, combat, x, z) {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x226622 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), jacket);
  body.position.y = 1.15; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), new THREE.MeshLambertMaterial({ color: 0xc98d5f }));
  head.position.y = 1.85; g.add(head);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.48), new THREE.MeshBasicMaterial({ color: 0x22aa44 }));
  band.position.y = 2.0; g.add(band);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.28), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  legL.position.set(-0.18, 0.38, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
  g.position.set(x, 0, z);
  scene.add(g);
  const enemy = { group: g, pos: g.position, legL, legR, health: 60, speed: 4.2, phase: 0, attackCd: 0 };
  combat.enemies.push(enemy);
  return enemy;
}

export function spawnGangSquad(scene, combat, center, count) {
  for (let i = 0; i < count; i++) {
    spawnGangEnemy(scene, combat, center.x + (Math.random() - 0.5) * 16, center.z + (Math.random() - 0.5) * 16);
  }
}

export function updateCombat(dt, scene, combat, state) {
  const playerPos = state.player.pos;
  // Pistol: click fires a hitscan shot toward the camera aim.
  if (state.inCar === false && state.input.consumeClick()) {
    if (state.ammo > 0) {
      state.ammo--;
      state.audio.gunshot();
      state.effects.spawnSmoke(playerPos.x, 1.4, playerPos.z);
      // Hit the nearest enemy roughly in front of the camera.
      let best = null, bestScore = 0.35;
      for (const e of combat.enemies) {
        const dx = e.pos.x - playerPos.x, dz = e.pos.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 40) continue;
        const aimX = Math.sin(state.camYaw), aimZ = Math.cos(state.camYaw);
        const dot = (dx * aimX + dz * aimZ) / (dist || 1);
        if (dot > bestScore) { bestScore = dot; best = e; }
      }
      if (best) damageEnemy(scene, combat, state, best, 34);
      else state.showMessage('Tembakan meleset.');
    } else {
      state.showMessage('Amunisi habis! Beli di dealer (tekan N di dekat dealer).');
      state.audio.beep(180, 0.15, 'square', 0.2);
    }
  }
  // Melee punch with F.
  if (state.input.keys.has('f') && state.punchCd <= 0 && !state.inCar) {
    state.punchCd = 0.45;
    state.audio.punch();
    let best = null, bestD = 2.4;
    for (const e of combat.enemies) {
      const d = Math.hypot(e.pos.x - playerPos.x, e.pos.z - playerPos.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) damageEnemy(scene, combat, state, best, 20);
  }
  state.punchCd = Math.max(0, (state.punchCd || 0) - dt);

  // Enemies chase the player on foot and attack up close.
  for (const e of combat.enemies) {
    const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
    const dist = Math.hypot(dx, dz);
    e.attackCd -= dt;
    if (dist > 1.8 && !state.inCar) {
      e.pos.x += (dx / dist) * e.speed * dt;
      e.pos.z += (dz / dist) * e.speed * dt;
      e.group.rotation.y = Math.atan2(dx, dz);
      e.phase += dt * 9;
      e.legL.rotation.x = Math.sin(e.phase) * 0.5;
      e.legR.rotation.x = -Math.sin(e.phase) * 0.5;
    } else if (dist <= 1.8 && e.attackCd <= 0 && !state.inCar) {
      e.attackCd = 1.1;
      state.damagePlayer(10, 'Anggota Geng Ombak memukulmu!');
    }
  }
}

export function damageEnemy(scene, combat, state, enemy, dmg) {
  enemy.health -= dmg;
  state.effects.spawnBlood(enemy.pos.x, 1.2, enemy.pos.z);
  if (enemy.health <= 0) {
    scene.remove(enemy.group);
    combat.enemies.splice(combat.enemies.indexOf(enemy), 1);
    state.kills++;
    state.money += 25;
    state.showMessage('Musuh dikalahkan! +$25');
    state.audio.pickup();
  }
}
