// minimap.js — 2D canvas minimap in the top-right corner: roads, beach,
// player arrow, police dots, mission marker, north indicator.
import { CITY } from './city.js';

export function createMinimap() {
  const canvas = document.getElementById('minimap');
  return { canvas, ctx: canvas.getContext('2d'), size: 180 };
}

function toMap(minimap, x, z) {
  const s = minimap.size / (CITY.halfSize * 2 + 80);
  return [minimap.size / 2 + x * s, minimap.size / 2 + z * s];
}

export function drawMinimap(minimap, state) {
  const { ctx, size } = minimap;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(20, 40, 30, 0.85)';
  ctx.fillRect(0, 0, size, size);
  // Beach + sea at the south edge.
  const [, beachY] = toMap(minimap, 0, CITY.beachZ);
  ctx.fillStyle = '#e8d49a';
  ctx.fillRect(0, beachY - 6, size, 12);
  ctx.fillStyle = '#2e9fc9';
  ctx.fillRect(0, beachY + 6, size, size - beachY);
  // Roads.
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  for (const road of state.city.roadLines) {
    ctx.beginPath();
    if (road.axis === 'z') {
      const [x1, y1] = toMap(minimap, road.at, road.from);
      const [x2, y2] = toMap(minimap, road.at, road.to);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    } else {
      const [x1, y1] = toMap(minimap, road.from, road.at);
      const [x2, y2] = toMap(minimap, road.to, road.at);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }
  // Mission marker (yellow).
  if (state.missionTarget) {
    const [mx, my] = toMap(minimap, state.missionTarget.x, state.missionTarget.z);
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // Police (blue/red dots).
  for (const car of state.police.cars) {
    const [px, py] = toMap(minimap, car.group.position.x, car.group.position.z);
    ctx.fillStyle = '#3388ff';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const off of state.police.officers) {
    const [px, py] = toMap(minimap, off.pos.x, off.pos.z);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Roadblock cars (orange) and the active courier destination (green).
  for (const car of state.police.roadblock || []) {
    const [px, py] = toMap(minimap, car.group.position.x, car.group.position.z);
    ctx.fillStyle = '#ff8800';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (state.courier && state.courier.active && state.courier.target) {
    const [cx, cy] = toMap(minimap, state.courier.target.x, state.courier.target.z);
    ctx.fillStyle = '#7dff8a';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // Uncollected hidden packages (small cyan dots).
  if (state.packages) {
    ctx.fillStyle = '#33ddff';
    for (const p of state.packages) {
      if (p.taken) continue;
      const [px, py] = toMap(minimap, p.pos.x, p.pos.z);
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Player arrow (white, rotated by camera yaw).
  const playerPos = state.currentCar ? state.currentCar.group.position : state.player.pos;
  const [px, py] = toMap(minimap, playerPos.x, playerPos.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.camYaw + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // North indicator.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('N', 8, 16);
  ctx.beginPath(); ctx.moveTo(12, 20); ctx.lineTo(8, 30); ctx.lineTo(16, 30); ctx.closePath(); ctx.fill();
}
