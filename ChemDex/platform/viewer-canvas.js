import {parseCIF} from '../shared/chemistry/cif.mjs';
// Software projection and 3D geometry parser for SDF and CIF structures.
import { drawMolecularStudio } from './molecular-studio.js';
export const CPK_COLORS = {
  H: '#f8fafc',
  C: '#64748b',
  O: '#ef4444',
  N: '#3b82f6',
  S: '#eab308',
  Cl: '#22c55e',
  F: '#84cc16',
  Br: '#b45309',
  I: '#9333ea',
  P: '#f97316',
  Na: '#a855f7',
  K: '#8b5cf6',
  Li: '#c084fc',
  Mg: '#10b981',
  Ca: '#14b8a6',
  Ba: '#0d9488',
  Sr: '#06b6d4',
  Fe: '#ea580c',
  Cu: '#d97706',
  Zn: '#94a3b8',
  Al: '#cbd5e1',
  Ag: '#e2e8f0',
  Cr: '#60a5fa',
  Mn: '#a78bfa',
  Co: '#f43f5e',
  Ni: '#34d399',
  Pb: '#6b7280',
  Sn: '#9ca3af',
  Cd: '#fbbf24',
  Si: '#f59e0b',
  B: '#fb7185',
  Xe: '#38bdf8',
  Cs: '#7c3aed',
};

export function readSDF(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/),
    atoms = [],
    bonds = [];
  if (lines[3]?.includes('V3000')) {
    let state = '';
    for (const line of lines) {
      if (line.includes('BEGIN ATOM')) {
        state = 'atom';
        continue;
      }
      if (line.includes('BEGIN BOND')) {
        state = 'bond';
        continue;
      }
      if (line.includes('END ')) {
        state = '';
        continue;
      }
      const parts = line.trim().split(/\s+/);
      if (state === 'atom')
        atoms.push({
          elem: parts[3],
          x: Number(parts[4]),
          y: Number(parts[5]),
          z: Number(parts[6]),
        });
      if (state === 'bond')
        bonds.push({
          a: Number(parts[4]) - 1,
          b: Number(parts[5]) - 1,
          order: Number(parts[3]),
        });
    }
  } else {
    const n = Number(lines[3]?.slice(0, 3)),
      m = Number(lines[3]?.slice(3, 6));
    for (const line of lines.slice(4, 4 + n))
      atoms.push({
        elem: line.slice(31, 34).trim(),
        x: Number(line.slice(0, 10)),
        y: Number(line.slice(10, 20)),
        z: Number(line.slice(20, 30)),
      });
    for (const line of lines.slice(4 + n, 4 + n + m))
      bonds.push({
        a: Number(line.slice(0, 3)) - 1,
        b: Number(line.slice(3, 6)) - 1,
        order: Number(line.slice(6, 9)),
      });
  }
  if (!atoms.length || atoms.some((a) => ![a.x, a.y, a.z].every(Number.isFinite)))
    throw new Error('Không đọc được tọa độ cấu trúc.');
  const components=/>\s*<CHEMDEX_COMPONENTS>[^\S\r\n]*\r?\n([^\r\n]+)/.exec(raw);
  if(components)try{
    const groups=JSON.parse(components[1]),membership=new Map();
    if(!Array.isArray(groups)||groups.length>atoms.length)throw Error('Invalid component count');
    groups.forEach((group,id)=>{
      if(group.id!==id||typeof group.formula!=='string'||group.formula.length>120||!Number.isInteger(group.charge)||!Array.isArray(group.atomIndices)||!group.atomIndices.length)throw Error('Invalid group');
      for(const i of group.atomIndices){if(!Number.isInteger(i)||i<0||i>=atoms.length||membership.has(i))throw Error('Invalid membership');membership.set(i,id);}
    });
    if(membership.size!==atoms.length||bonds.some(b=>membership.get(b.a)!==membership.get(b.b)))throw Error('Invalid component topology');
    atoms.forEach((atom,i)=>atom.componentGroup=membership.get(i));
    return {atoms,bonds,groups,componentLayout:true};
  }catch{/* Ignore invalid optional metadata; retain the actual SDF geometry. */}
  return { atoms, bonds };
}

export const readCIF = parseCIF;

export function createCanvasViewer(host, model, onPick) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  const ctx = canvas.getContext('2d');
  let logicalW = 1,
    logicalH = 1,
    dpr = 1,
    zoom = 1,
    targetZoom = 1,
    moved = false,
    points = [],
    spinning = false,
    rafId = null,
    velYaw = 0,
    velPitch = 0,
    lastMoveAt = 0,
    lastFrameAt = 0,
    pinchDist = 0,
    selectedAtomIdx = -1,
    options = { hydrogen: true, labels: false, style: 'ball', environment: true };
  const activePointers = new Map();

  // 3x3 rotation matrix (row-major) eliminates Euler gimbal lock and axis inversion
  const makeRotX = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, c, -s, 0, s, c];
  };
  const makeRotY = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  };
  const mul3 = (A, B) => [
    A[0] * B[0] + A[1] * B[3] + A[2] * B[6],
    A[0] * B[1] + A[1] * B[4] + A[2] * B[7],
    A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
    A[3] * B[0] + A[4] * B[3] + A[5] * B[6],
    A[3] * B[1] + A[4] * B[4] + A[5] * B[7],
    A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
    A[6] * B[0] + A[7] * B[3] + A[8] * B[6],
    A[6] * B[1] + A[7] * B[4] + A[8] * B[7],
    A[6] * B[2] + A[7] * B[5] + A[8] * B[8],
  ];
  const orthonormalize = (M) => {
    let r0 = [M[0], M[1], M[2]], r1 = [M[3], M[4], M[5]];
    const l0 = Math.hypot(...r0) || 1;
    r0 = r0.map((v) => v / l0);
    const dot = r0[0] * r1[0] + r0[1] * r1[1] + r0[2] * r1[2];
    r1 = r1.map((v, i) => v - dot * r0[i]);
    const l1 = Math.hypot(...r1) || 1;
    r1 = r1.map((v) => v / l1);
    const r2 = [
      r0[1] * r1[2] - r0[2] * r1[1],
      r0[2] * r1[0] - r0[0] * r1[2],
      r0[0] * r1[1] - r0[1] * r1[0],
    ];
    return [...r0, ...r1, ...r2];
  };
  const initialRot = () => mul3(makeRotX(0.35), makeRotY(0.5));
  let rot = initialRot();

  const center = ['x', 'y', 'z'].map(
    (k) => model.atoms.reduce((n, a) => n + a[k], 0) / model.atoms.length,
  );
  const radius = Math.max(
    1.8,
    ...model.atoms.map((a) =>
      Math.hypot(a.x - center[0], a.y - center[1], a.z - center[2]),
    ),
  );

  function drawBondSegment(x1, y1, x2, y2, width, color = '#94a3b8') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function draw() {
    const w = logicalW,
      h = logicalH,
      scale = ((Math.min(w, h) * 0.34) / radius) * zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const isLight = document.documentElement.dataset.theme === 'light';
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    if (isLight) {
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(1, '#e2e8f0');
    } else {
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#0b1220');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const project = (a) => {
      const x = a.x - center[0],
        y = a.y - center[1],
        z = a.z - center[2];
      const rx = rot[0] * x + rot[1] * y + rot[2] * z;
      const ry = rot[3] * x + rot[4] * y + rot[5] * z;
      const rz = rot[6] * x + rot[7] * y + rot[8] * z;
      return {
        x: w / 2 + rx * scale,
        y: h / 2 - ry * scale,
        z: rz,
      };
    };
    if (options.environment) drawMolecularStudio(ctx, model, project);
    points = model.atoms.map((a, index) => ({ ...project(a), index, a }));

    if (options.style !== 'sphere') {
      for (const b of model.bonds) {
        const a = points[b.a],
          c = points[b.b];
        if (
          !a ||
          !c ||
          (!options.hydrogen && (a.a.elem === 'H' || c.a.elem === 'H'))
        )
          continue;
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const baseW = Math.max(2.2, scale * 0.095);
        const order = b.order ?? 1;
        const bondColor = isLight ? '#64748b' : '#cbd5e1';

        if (order === 2) {
          const off = Math.max(3, baseW * 0.85);
          drawBondSegment(a.x + nx * off, a.y + ny * off, c.x + nx * off, c.y + ny * off, baseW * 0.72, bondColor);
          drawBondSegment(a.x - nx * off, a.y - ny * off, c.x - nx * off, c.y - ny * off, baseW * 0.72, bondColor);
        } else if (order === 3) {
          const off = Math.max(4, baseW * 1.15);
          drawBondSegment(a.x, a.y, c.x, c.y, baseW * 0.65, bondColor);
          drawBondSegment(a.x + nx * off, a.y + ny * off, c.x + nx * off, c.y + ny * off, baseW * 0.6, bondColor);
          drawBondSegment(a.x - nx * off, a.y - ny * off, c.x - nx * off, c.y - ny * off, baseW * 0.6, bondColor);
        } else {
          drawBondSegment(a.x, a.y, c.x, c.y, baseW, bondColor);
        }
      }
    }

    for (const p of [...points].sort((a, b) => a.z - b.z)) {
      if (!options.hydrogen && p.a.elem === 'H') continue;
      const r = Math.max(
        3.5,
        Math.min(
          38,
          scale *
            (options.style === 'sphere'
              ? 0.8
              : options.style === 'stick'
                ? 0.15
                : 0.32) *
            (p.a.elem === 'H' ? 0.65 : 1),
        ),
      );
      const color = CPK_COLORS[p.a.elem] ?? '#a78bfa';
      const gradient = ctx.createRadialGradient(
        p.x - r * 0.35,
        p.y - r * 0.35,
        r * 0.05,
        p.x,
        p.y,
        r,
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.32, color);
      gradient.addColorStop(1, isLight ? '#334155' : '#090d16');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (p.index === selectedAtomIdx) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      p.r = r;
      if (options.labels) {
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(p.a.elem, p.x, p.y - r - 6);
      }
    }
    ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Kéo tự do 360° · Cuộn để thu/phóng · Nhấp đúp để đặt lại', 14, h - 14);
  }

  function ensureLoop() {
    if (rafId) return;
    lastFrameAt = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function tick(now) {
    rafId = null;
    const dt = Math.min(Math.max((now - (lastFrameAt || now)) / 1000, 1 / 240), 0.05);
    lastFrameAt = now;
    let needsMore = false;

    if (spinning && activePointers.size === 0) {
      rot = orthonormalize(mul3(makeRotY(0.75 * dt), rot));
      needsMore = true;
    } else if (activePointers.size === 0 && (Math.abs(velYaw) > 0.004 || Math.abs(velPitch) > 0.004)) {
      rot = orthonormalize(mul3(makeRotX(velPitch * dt), mul3(makeRotY(velYaw * dt), rot)));
      const damp = Math.exp(-7.5 * dt);
      velYaw *= damp;
      velPitch *= damp;
      if (Math.hypot(velYaw, velPitch) <= 0.006) {
        velYaw = 0;
        velPitch = 0;
      } else {
        needsMore = true;
      }
    }

    if (Math.abs(targetZoom - zoom) > 0.001) {
      zoom += (targetZoom - zoom) * (1 - Math.exp(-16 * dt));
      needsMore = true;
    } else {
      zoom = targetZoom;
    }

    draw();
    if (needsMore) {
      rafId = requestAnimationFrame(tick);
    }
  }

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    logicalW = Math.max(1, host.clientWidth);
    logicalH = Math.max(1, host.clientHeight);
    canvas.width = Math.round(logicalW * dpr);
    canvas.height = Math.round(logicalH * dpr);
    draw();
  };
  canvas.ondblclick = () => {
    rot = initialRot();
    targetZoom = 1;
    velYaw = 0;
    velPitch = 0;
    ensureLoop();
  };
  canvas.onpointerdown = (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    velYaw = 0;
    velPitch = 0;
    if (activePointers.size === 1) {
      moved = false;
      canvas.style.cursor = 'grabbing';
    } else if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      moved = true;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  };
  canvas.onpointermove = (e) => {
    if (!activePointers.has(e.pointerId)) return;
    const prev = activePointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;

    if (activePointers.size >= 2) {
      const pts = [...activePointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist > 0 && dist > 0) {
        targetZoom = Math.max(0.2, Math.min(8, targetZoom * (dist / pinchDist)));
      }
      pinchDist = dist;
      moved = true;
      ensureLoop();
      return;
    }

    moved ||= Math.abs(dx) + Math.abs(dy) > 2;
    const scale = 2.6 / Math.max(Math.min(logicalW, logicalH), 220);
    const dYaw = dx * scale;
    const dPitch = dy * scale;
    rot = orthonormalize(mul3(makeRotX(dPitch), mul3(makeRotY(dYaw), rot)));
    const now = performance.now();
    const dtMs = Math.max(now - (lastMoveAt || now - 16), 6);
    const rate = 1000 / Math.min(dtMs, 80);
    velYaw = velYaw * 0.45 + dYaw * rate * 0.55;
    velPitch = velPitch * 0.45 + dPitch * rate * 0.55;
    lastMoveAt = now;
    draw();
  };
  canvas.onpointerup = (e) => {
    activePointers.delete(e.pointerId);
    try {
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    } catch {}
    if (activePointers.size === 0) {
      canvas.style.cursor = 'grab';
      if (!moved) {
        const box = canvas.getBoundingClientRect(),
          x = e.clientX - box.left,
          y = e.clientY - box.top;
        const point = [...points]
          .sort((a, b) => b.z - a.z)
          .find(
            (p) =>
              (options.hydrogen || p.a.elem !== 'H') &&
              Math.hypot(p.x - x, p.y - y) < Math.max(p.r ?? 0, 12),
          );
        if (point) {
          selectedAtomIdx = point.index;
          draw();
          onPick({ ...point.a, index: point.index });
        }
      } else if (performance.now() - lastMoveAt < 75 && Math.hypot(velYaw, velPitch) > 0.08) {
        ensureLoop();
      } else {
        velYaw = 0;
        velPitch = 0;
      }
    }
  };
  canvas.onpointercancel = (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) {
      canvas.style.cursor = 'grab';
      velYaw = 0;
      velPitch = 0;
    }
  };
  canvas.onwheel = (e) => {
    e.preventDefault();
    targetZoom = Math.max(0.2, Math.min(8, targetZoom * Math.exp(-e.deltaY * 0.0011)));
    ensureLoop();
  };
  resize();
  return {
    resize,
    style: (next) => {
      options = next;
      draw();
    },
    spin: (enabled) => {
      spinning = Boolean(enabled);
      if (spinning) ensureLoop();
    },
    reset: () => {
      rot = initialRot();
      targetZoom = 1;
      velYaw = 0;
      velPitch = 0;
      selectedAtomIdx = -1;
      ensureLoop();
    },
    pngURI: () => canvas.toDataURL('image/png'),
    destroy: () => {
      spinning = false;
      activePointers.clear();
      if (rafId) cancelAnimationFrame(rafId);
      canvas.remove();
    },
  };
}
