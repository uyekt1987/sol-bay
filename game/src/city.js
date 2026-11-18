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

  // Ground: warm dry grass, pale sand strip and teal sea at the south edge.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 220, half * 2 + 260),
    new THREE.MeshLambertMaterial({ color: 0x8aa864 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 220, 44),
    new THREE.MeshLambertMaterial({ color: 0xf2dcae }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, CITY.beachZ);
  scene.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, 120),
    new THREE.MeshLambertMaterial({ color: 0x1d8fa8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.1, CITY.seaZ + 55);
  scene.add(sea);
  // Animated foam lines where the waves meet the sand (moved in main.js).
  city.waves = [];
  for (let i = 0; i < 4; i++) {
    const wave = new THREE.Mesh(
      new THREE.PlaneGeometry(half * 2 + 200, 1.6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
    );
    wave.rotation.x = -Math.PI / 2;
    const bz = CITY.beachZ + 20 + i * 7;
    wave.position.set(0, 0.14, bz);
    scene.add(wave);
    city.waves.push({ mesh: wave, baseZ: bz, phase: i * 1.7 });
  }

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

  // Buildings: sun-soaked coastal palette (cream, terracotta, sea teal),
  // varied heights per block, window grids on both faces, roof clutter.
  const palette = [0xe07a5f, 0xf4ead8, 0x2a9d8f, 0xffd166, 0xe76f51, 0x8ecae6, 0xf7b267, 0x90be6d, 0xf9c74f, 0x84a98d, 0xe9c46a, 0xef8354];
  const shopNames = ['KOPI SENJA', 'WARUNG OMBAK', 'BENGKEL MIRA', 'TOKO PANCING', 'PASAR SOL', 'HOTEL KARANG', 'ES KELAPA', 'TAMBAL BAN'];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  let shopIdx = 0;
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
      const roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a3a }));
      roof.scale.set(w + 1, 0.8, d + 1);
      roof.position.set(cx, h + 0.4, cz);
      scene.add(roof);
      // Roof clutter: AC box and/or a thin antenna, seeded per building.
      if (rand() > 0.45) {
        const ac = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }));
        ac.scale.set(2.2, 1.0, 1.6);
        ac.position.set(cx - w / 4, h + 1.3, cz - d / 4);
        scene.add(ac);
      }
      if (rand() > 0.6) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 5), new THREE.MeshLambertMaterial({ color: 0x333333 }));
        ant.position.set(cx + w / 4, h + 3.2, cz + d / 4);
        scene.add(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
        tip.position.set(cx + w / 4, h + 5.8, cz + d / 4);
        scene.add(tip);
      }
      // Window grids on the front (+z) and back (-z) faces, mixed lit/dark.
      const floors = Math.max(1, Math.floor(h / 6));
      for (let f = 0; f < floors; f++) {
        for (let k = -1; k <= 1; k++) {
          const lit = rand() > 0.45;
          const winMat = new THREE.MeshBasicMaterial({ color: lit ? 0xffe9a8 : 0x2c3e50 });
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), winMat);
          win.position.set(cx + k * (w / 3.4), 3 + f * 5, cz + d / 2 + 0.06);
          scene.add(win);
          const winB = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), winMat);
          winB.position.set(cx + k * (w / 3.4), 3 + f * 5, cz - d / 2 - 0.06);
          winB.rotation.y = Math.PI;
          scene.add(winB);
        }
      }
      // A shop sign on the ground floor of every seventh building.
      if ((bx * CITY.blocks + bz) % 7 === 3) {
        const name = shopNames[shopIdx++ % shopNames.length];
        const sc = document.createElement('canvas');
        sc.width = 512; sc.height = 96;
        const sctx = sc.getContext('2d');
        sctx.fillStyle = '#f4ead8'; sctx.fillRect(0, 0, 512, 96);
        sctx.fillStyle = '#e76f51'; sctx.font = 'bold 52px sans-serif';
        sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
        sctx.fillText(name, 256, 50);
        const stex = new THREE.CanvasTexture(sc);
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(9, 1.7),
          new THREE.MeshBasicMaterial({ map: stex }),
        );
        sign.position.set(cx, 3.6, cz + d / 2 + 0.12);
        scene.add(sign);
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

  // Benches: wooden seat + back around the plaza and along the main road.
  const benchWood = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
  const benchIron = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const addBench = (x, z, rotY) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.7), benchWood);
    seat.position.y = 0.55; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.14), benchWood);
    back.position.set(0, 0.95, -0.3); g.add(back);
    for (const lx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.6), benchIron);
      leg.position.set(lx, 0.28, 0); g.add(leg);
    }
    g.position.set(x, 0, z); g.rotation.y = rotY;
    scene.add(g);
  };
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    addBench(Math.cos(a) * 13, Math.sin(a) * 13, -a + Math.PI / 2);
  }
  addBench(-20, 48, 0); addBench(48, -20, Math.PI / 2); addBench(-48, 110, 0);

  // Billboards with original Sol Bay text, facing the main roads.
  const billboard = (text, sub, x, z, rotY) => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1d3557'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text, 256, 105);
    ctx.fillStyle = '#f4ead8'; ctx.font = '28px sans-serif';
    ctx.fillText(sub, 256, 165);
    const tex = new THREE.CanvasTexture(c);
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    board.position.y = 9; g.add(board);
    for (const px of [-5, 5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 6), benchIron);
      pole.position.set(px, 3, 0); g.add(pole);
    }
    g.position.set(x, 0, z); g.rotation.y = rotY;
    scene.add(g);
  };
  billboard('SELAMAT DATANG', 'DI SOL BAY — KOTA PANTAI', -110, -60, Math.PI / 2);
  billboard('KOPI SENJA', 'BUKA 24 JAM — RASA JUARA', 90, 60, -Math.PI / 2);
  billboard('PANTAI SOL', 'AIRNYA BIRU, OMBAKNYA RAMAH', -40, 150, Math.PI);

  // STOP road signs at four intersections.
  const stopSign = (x, z, rotY) => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d62828'; ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('STOP', 64, 66);
    const tex = new THREE.CanvasTexture(c);
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), benchIron);
    pole.position.y = 1.3; g.add(pole);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    plate.position.y = 2.9; g.add(plate);
    g.position.set(x, 0, z); g.rotation.y = rotY;
    scene.add(g);
  };
  stopSign(-105, -105, 0); stopSign(105, -105, Math.PI / 2); stopSign(-105, 105, -Math.PI / 2); stopSign(105, 105, Math.PI);

  // Dealer lot (Beli Mobil) and garage markers.
  const dealerSign = makeSign(scene, 'DEALER MOBIL', 0xffe14d, city.dealerPos.x, city.dealerPos.z);
  const garageSign = makeSign(scene, 'GARASI', 0x6ec6ff, city.garagePos.x, city.garagePos.z);
  city.dealerSign = dealerSign; city.garageSign = garageSign;

  // Street lamps along the roads, with a soft glow halo so they read at dusk.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.22 });
  for (let i = 0; i <= CITY.blocks; i++) {
    const at = -half + i * step;
    for (let d = -half + 20; d < half; d += 44) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), poleMat);
      pole.position.set(at + 7, 3, d);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lampMat);
      lamp.position.set(at + 7, 6.2, d);
      scene.add(lamp);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), glowMat);
      glow.position.set(at + 7, 6.2, d);
      scene.add(glow);
    }
  }

  // Palm trees: varied height/lean/leaf tone, dense along the beach and
  // scattered on sidewalks so the coast reads at a glance.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b42 });
  const leafMats = [0x2fae5f, 0x3cb371, 0x27a35c, 0x57b25e].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const addPalm = (x, z) => {
    const g = new THREE.Group();
    const s = 0.8 + rand() * 0.6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 6, 6), trunkMat);
    trunk.position.y = 3; trunk.rotation.z = (rand() - 0.5) * 0.3;
    g.add(trunk);
    const leafMat = leafMats[Math.floor(rand() * leafMats.length)];
    const leaves = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < leaves; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), leafMat);
      leaf.position.set(Math.cos(i * 1.26) * 1.1, 6.2, Math.sin(i * 1.26) * 1.1);
      leaf.rotation.z = Math.cos(i * 1.26) * 1.1;
      leaf.rotation.x = -Math.sin(i * 1.26) * 1.1;
      g.add(leaf);
    }
    g.scale.setScalar(s);
    g.position.set(x, 0, z);
    scene.add(g);
    city.palms.push(g);
  };
  for (let x = -half - 20; x <= half + 20; x += 12) addPalm(x + rand() * 6, CITY.beachZ - 6 + rand() * 8);
  for (let i = 0; i < 44; i++) addPalm(-half + rand() * half * 2, -half + rand() * half * 2);

  // Beach umbrellas: striped cones on poles along the sand.
  const umbrellaColors = [0xef476f, 0xffd166, 0x118ab2, 0x06d6a0];
  for (let i = 0; i < 7; i++) {
    const x = -half + 20 + i * 44 + rand() * 10;
    const z = CITY.beachZ - 8 + rand() * 10;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    pole.position.set(x, 1.3, z);
    scene.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }),
    );
    top.position.set(x, 3.0, z);
    scene.add(top);
  }

  // ---- PELABUHAN SOL BAY (new district, south-east coast) --------------
  // Concrete apron, container yard, two gantry cranes, a wooden pier and
  // a cargo ship anchored in the bay. Missions m9/m10/m11 play here.
  city.harborCenter = new THREE.Vector3(140, 0, 185);
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(84, 42),
    new THREE.MeshLambertMaterial({ color: 0x8d8d85 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(141, 0.02, 183);
  scene.add(apron);
  // Pier deck jutting into the sea, with a striped edge.
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.5, 26),
    new THREE.MeshLambertMaterial({ color: 0x9c7a52 }),
  );
  pier.position.set(140, 0.25, 192);
  scene.add(pier);
  const pierEdge = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.15, 1),
    new THREE.MeshBasicMaterial({ color: 0xffe14d }),
  );
  pierEdge.position.set(140, 0.55, 204);
  scene.add(pierEdge);
  // Container yard: colourful stacked boxes on the west side of the apron.
  const containerColors = [0xef476f, 0x118ab2, 0xffd166, 0x06d6a0, 0xe76f51, 0x2a9d8f];
  const containerSpots = [
    [106, 170, 0], [114, 170, 1], [122, 170, 0], [106, 178, 1],
    [114, 178, 0], [122, 178, 0],
  ];
  for (let i = 0; i < containerSpots.length; i++) {
    const [cx, cz, stacked] = containerSpots[i];
    const col = containerColors[i % containerColors.length];
    const cont = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: col }));
    cont.scale.set(6, 2.6, 2.6);
    cont.position.set(cx, 1.3, cz);
    cont.castShadow = true;
    scene.add(cont);
    city.colliders.push({ minX: cx - 3, maxX: cx + 3, minZ: cz - 1.3, maxZ: cz + 1.3 });
    if (stacked) {
      const top = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: containerColors[(i + 2) % containerColors.length] }));
      top.scale.set(6, 2.6, 2.6);
      top.position.set(cx, 3.9, cz);
      top.castShadow = true;
      scene.add(top);
    }
  }
  // Two gantry cranes over the pier, with jib + hanging hook.
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xffb703 });
  const addCrane = (x, z) => {
    const g = new THREE.Group();
    for (const [lx, lz] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 16, 0.8), craneMat);
      leg.position.set(lx, 8, lz);
      g.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 6), craneMat);
    beam.position.y = 16.5;
    g.add(beam);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 20), craneMat);
    jib.position.set(0, 17.5, 6);
    g.add(jib);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, 0.12), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cable.position.set(0, 13.5, 12);
    g.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    hook.position.set(0, 10.2, 12);
    g.add(hook);
    g.position.set(x, 0, z);
    scene.add(g);
    city.colliders.push({ minX: x - 3.5, maxX: x + 3.5, minZ: z - 2.5, maxZ: z + 2.5 });
  };
  addCrane(108, 190);
  addCrane(172, 190);
  // Cargo ship anchored in the bay, loaded with containers.
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 34), new THREE.MeshLambertMaterial({ color: 0x1d3557 }));
  hull.position.y = 1.2;
  ship.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 4), new THREE.MeshLambertMaterial({ color: 0x1d3557 }));
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 1.2, 21);
  ship.add(bow);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 5), new THREE.MeshLambertMaterial({ color: 0xf4ead8 }));
  bridge.position.set(0, 5.5, -12);
  ship.add(bridge);
  for (let i = 0; i < 4; i++) {
    const sc = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: containerColors[i % containerColors.length] }));
    sc.scale.set(9, 2.4, 3.4);
    sc.position.set(0, 4.4, -4 + i * 4.2);
    ship.add(sc);
  }
  ship.position.set(140, 0, 224);
  scene.add(ship);
  // Harbour sign on the east side of the apron, clear of the city blocks
  // behind it so it reads from the pier.
  makeSign(scene, 'PELABUHAN SOL BAY', 0x33ddff, 162, 168);
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0xdd6b20 });
  for (const [bx, bz] of [[156, 172], [158, 174], [157, 176], [130, 196], [132, 196]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 10), barrelMat);
    barrel.position.set(bx, 0.8, bz);
    scene.add(barrel);
  }
  for (let i = 0; i < 5; i++) addPalm(104 + i * 18, 200);

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
  // Auto-fit long labels (e.g. "PELABUHAN SOL BAY") inside the sign.
  let fontSize = 64;
  c.font = `bold ${fontSize}px sans-serif`;
  const tw = c.measureText(text).width;
  if (tw > 480) { fontSize = Math.floor(64 * 480 / tw); c.font = `bold ${fontSize}px sans-serif`; }
  c.textAlign = 'center'; c.textBaseline = 'middle';
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
