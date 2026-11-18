// effects.js — particles (dust / exhaust smoke), skid marks, damage flash.
import * as THREE from 'three';

export function createEffects(scene) {
  const effects = { particles: [], skids: [], flashEl: document.getElementById('damage-flash') };
  const geo = new THREE.SphereGeometry(0.22, 6, 5);
  const mat = new THREE.MeshBasicMaterial({ color: 0xccbb99, transparent: true, opacity: 0.7 });

  effects.spawnDust = (x, y, z, count, color) => {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      if (color) m.material.color.setHex(color);
      m.position.set(x + (Math.random() - 0.5), y + Math.random() * 0.4, z + (Math.random() - 0.5));
      m.userData = {
        vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.2 + 0.4,
        vz: (Math.random() - 0.5) * 1.5, life: 0.7 + Math.random() * 0.5,
      };
      scene.add(m);
      effects.particles.push(m);
    }
  };
  effects.spawnSmoke = (x, y, z) => effects.spawnDust(x, y, z, 5, 0x666666);
  effects.spawnBlood = (x, y, z) => effects.spawnDust(x, y, z, 6, 0xcc2222);
  // Thicker exhaust plume: several grey puffs that rise and grow.
  effects.spawnExhaust = (x, y, z) => {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.material.color.setHex(0x555555);
      m.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.6);
      m.scale.setScalar(1.6);
      m.userData = {
        vx: (Math.random() - 0.5) * 0.8, vy: Math.random() * 1.6 + 0.8,
        vz: (Math.random() - 0.5) * 0.8, life: 1.0 + Math.random() * 0.6,
      };
      scene.add(m);
      effects.particles.push(m);
    }
  };

  // Gold flash overlay (mission complete) — mirrors the red damage flash.
  effects.goldFlashEl = document.getElementById('gold-flash');
  effects.goldFlash = () => {
    if (!effects.goldFlashEl) return;
    effects.goldFlashEl.style.opacity = '0.6';
    setTimeout(() => { effects.goldFlashEl.style.opacity = '0'; }, 450);
  };

  effects.addSkid = (x, z, yaw) => {
    const g = new THREE.PlaneGeometry(0.35, 1.4);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.55 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = yaw;
    m.position.set(x, 0.03, z);
    m.userData.life = 6;
    scene.add(m);
    effects.skids.push(m);
    if (effects.skids.length > 80) { const old = effects.skids.shift(); scene.remove(old); }
  };

  effects.damageFlash = () => {
    if (!effects.flashEl) return;
    effects.flashEl.style.opacity = '0.55';
    setTimeout(() => { effects.flashEl.style.opacity = '0'; }, 140);
  };

  effects.update = (dt) => {
    for (let i = effects.particles.length - 1; i >= 0; i--) {
      const p = effects.particles[i];
      p.userData.life -= dt;
      if (p.userData.life <= 0) { scene.remove(p); effects.particles.splice(i, 1); continue; }
      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.material.opacity = Math.min(0.7, p.userData.life);
      const s = 1 + (0.8 - p.userData.life);
      p.scale.setScalar(Math.max(0.4, s));
    }
    for (let i = effects.skids.length - 1; i >= 0; i--) {
      const s = effects.skids[i];
      s.userData.life -= dt;
      if (s.userData.life <= 0) { scene.remove(s); effects.skids.splice(i, 1); }
    }
  };
  return effects;
}
