// city.js — builds the procedural city of SOL BAY from a fixed seed:
// road grid, colourful buildings, street lamps, palm trees, beach + sea.
import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CITY = {
  blockSize: 44, roadWidth: 12, blocks: 7,
  halfSize: 7 * 44 / 2, // city spans -154 .. +154
  beachZ: 176, seaZ: 210,
};

export function buildCity(scene) {
  const rand = mulberry32(20261118);
  const city = {
    colliders: [], // {minX,maxX,minZ,maxZ}
    roadLines: [], // road centre lines for traffic/minimap: {axis:'x'|'z', at, from, to}
    spawnPoints: [],
    dealerPos: new THREE.Vector3(60, 0, -120),
    garagePos: new THREE.Vector3(-60, 0, -120),
    palms: [],
  };
  const half = CITY.halfSize;

  // Ground: grass-green base, sand strip and sea at the south edge.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 220, half * 2 + 260),
    new THREE.MeshLambertMaterial({ color: 0x6fae5e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 220, 44),
    new THREE.MeshLambertMaterial({ color: 0xe8d49a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, CITY.beachZ);
  scene.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, 120),
    new THREE.MeshLambertMaterial({ color: 0x2e9fc9 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.1, CITY.seaZ + 55);
  scene.add(sea);

  // Roads: dark asphalt strips on the grid + lighter sidewalks.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x333338 });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x9a9a92 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  const step = CITY.blockSize;
  for (let i = 0; i <= CITY.blocks; i++) {
    const at = -half + i * step;
    for (const vertical of [true, false]) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(vertical ? CITY.roadWidth : half * 2 + CITY.roadWidth, vertical ? half * 2 + CITY.roadWidth : CITY.roadWidth),
        roadMat,
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(vertical ? at : 0, 0.01, vertical ? 0 : at);
      scene.add(road);
      const walk = new THREE.Mesh(
        new THREE.PlaneGeometry(vertical ? CITY.roadWidth + 6 : half * 2 + CITY.roadWidth + 6, vertical ? half * 2 + CITY.roadWidth + 6 : CITY.roadWidth + 6),
        walkMat,
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(vertical ? at : 0, 0.005, vertical ? 0 : at);
      scene.add(walk);
      city.roadLines.push({ axis: vertical ? 'z' : 'x', at, from: -half, to: half });
      // Centre dashes along the road.
      for (let d = -half + 8; d < half - 4; d += 10) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(vertical ? at : d, 0.03, vertical ? d : at);
        scene.add(dash);
      }
    }
  }

  // Buildings: one colourful box per block quadrant, with a roof and windows.
  const palette = [0xff8c69, 0xffd166, 0x6ec6ff, 0xff6b9d, 0x9be15d, 0xc792ea, 0xffa94d, 0x7dd8c0, 0xf4f1de, 0xe07a5f];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = 0; bx < CITY.blocks; bx++) {
    for (let bz = 0; bz < CITY.blocks; bz++) {
      const cx = -half + bx * step + step / 2;
      const cz = -half + bz * step + step / 2;
      // Skip the central plaza and the dealer/garage corners.
      if (bx === 3 && bz === 3) continue;
      if (Math.abs(cx - 60) < 24 && Math.abs(cz + 120) < 24) continue;
      if (Math.abs(cx + 60) < 24 && Math.abs(cz + 120) < 24) continue;
      const w = 14 + rand() * 12, d = 14 + rand() * 12, h = 8 + rand() * rand() * 34;
      const color = palette[Math.floor(rand() * palette.length)];
      const b = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
      b.scale.set(w, h, d);
      b.position.set(cx, h / 2, cz);
      b.castShadow = true;
      scene.add(b);
      const roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x555560 }));
      roof.scale.set(w + 1, 0.8, d + 1);
      roof.position.set(cx, h + 0.4, cz);
      scene.add(roof);
      // Lit windows: small emissive planes on the front face.
      const winMat = new THREE.MeshBasicMaterial({ color: rand() > 0.5 ? 0xfff2a8 : 0x9fd8ff });
      const floors = Math.max(1, Math.floor(h / 6));
      for (let f = 0; f < floors; f++) {
        for (let k = -1; k <= 1; k++) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), winMat);
          win.position.set(cx + k * (w / 3.4), 3 + f * 5, cz + d / 2 + 0.06);
          scene.add(win);
        }
      }
      city.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }
  }

  // Central plaza: fountain + benches at the city centre.
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.2, 20), new THREE.MeshLambertMaterial({ color: 0x87ceeb }));
  plaza.position.set(0, 0.6, 0);
  scene.add(plaza);
  const plazaBase = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.3, 20), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
  plazaBase.position.set(0, 0.15, 0);
  scene.add(plazaBase);

  // Dealer lot (Beli Mobil) and garage markers.
  const dealerSign = makeSign(scene, 'DEALER MOBIL', 0xffe14d, city.dealerPos.x, city.dealerPos.z);
  const garageSign = makeSign(scene, 'GARASI', 0x6ec6ff, city.garagePos.x, city.garagePos.z);
  city.dealerSign = dealerSign; city.garageSign = garageSign;

  // Street lamps along the roads.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let i = 0; i <= CITY.blocks; i++) {
    const at = -half + i * step;
    for (let d = -half + 20; d < half; d += 44) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), poleMat);
      pole.position.set(at + 7, 3, d);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lampMat);
      lamp.position.set(at + 7, 6.2, d);
      scene.add(lamp);
    }
  }

  // Palm trees: along the beach and scattered on sidewalks.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b42 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f });
  const addPalm = (x, z) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 6, 6), trunkMat);
    trunk.position.y = 3; trunk.rotation.z = 0.12;
    g.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), leafMat);
      leaf.position.set(Math.cos(i * 1.26) * 1.1, 6.2, Math.sin(i * 1.26) * 1.1);
      leaf.rotation.z = Math.cos(i * 1.26) * 1.1;
      leaf.rotation.x = -Math.sin(i * 1.26) * 1.1;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    city.palms.push(g);
  };
  for (let x = -half - 20; x <= half + 20; x += 18) addPalm(x + rand() * 6, CITY.beachZ - 6 + rand() * 8);
  for (let i = 0; i < 26; i++) addPalm(-half + rand() * half * 2, -half + rand() * half * 2);

  // Parked cars' spawn points on roads (used by traffic + missions).
  for (let i = 0; i < 10; i++) {
    city.spawnPoints.push(new THREE.Vector3(-half + Math.floor(rand() * CITY.blocks) * step, 0, -half + Math.floor(rand() * CITY.blocks) * step));
  }
  return city;
}

function makeSign(scene, text, color, x, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = '#222226'; c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#' + color.toString(16).padStart(6, '0');
  c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
  mesh.position.set(x, 5, z);
  scene.add(mesh);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 6), new THREE.MeshLambertMaterial({ color: 0x444444 }));
  pole.position.set(x, 2.5, z);
  scene.add(pole);
  return mesh;
}

// Circle-vs-AABB push-out used by player, cars and NPCs.
export function resolveCircleCollision(pos, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
    }
  }
  // Keep everyone inside the playable area (city + beach).
  pos.x = Math.max(-CITY.halfSize - 30, Math.min(CITY.halfSize + 30, pos.x));
  pos.z = Math.max(-CITY.halfSize - 30, Math.min(CITY.beachZ + 26, pos.z));
}
