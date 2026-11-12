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
  return { atoms, bonds };
}

export const readCIF = parseCIF;

export function createCanvasViewer(host, model, onPick) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  const ctx = canvas.getContext('2d');
  let ax = 0.35,
    ay = 0.5,
    zoom = 1,
    drag = null,
    moved = false,
    points = [],
    spinning = false,
    rafId = null,
    options = { hydrogen: true, labels: false, style: 'ball', environment: true };

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
    const w = canvas.width,
      h = canvas.height,
      scale = ((Math.min(w, h) * 0.34) / radius) * zoom;
    const isLight = document.documentElement.dataset.theme === 'light';
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    if (isLight) {
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(1, '#e2e8f0');
    } else {
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const project = a => {
      const x = a.x - center[0],
        y = a.y - center[1],
        z = a.z - center[2],
        xx = x * Math.cos(ay) + z * Math.sin(ay),
        zz = -x * Math.sin(ay) + z * Math.cos(ay);
      return {
        x: w / 2 + xx * scale,
        y: h / 2 - (y * Math.cos(ax) - zz * Math.sin(ax)) * scale,
        z: y * Math.sin(ax) + zz * Math.cos(ax),
      };
    };
    if(options.environment)drawMolecularStudio(ctx,model,project);
    points = model.atoms.map((a, index) => ({...project(a),index,a}));

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
      p.r = r;
      if (options.labels) {
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(p.a.elem, p.x, p.y - r - 6);
      }
    }
    ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Kéo để xoay · Cuộn để phóng to · Hiển thị liên kết đơn/đôi/ba', 14, h - 14);
  }

  function tick() {
    if (!spinning) return;
    ay += 0.012;
    draw();
    rafId = requestAnimationFrame(tick);
  }

  const resize = () => {
    canvas.width = Math.max(1, host.clientWidth);
    canvas.height = Math.max(1, host.clientHeight);
    draw();
  };
  canvas.onpointerdown = (e) => {
    drag = { x: e.clientX, y: e.clientY };
    moved = false;
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    moved ||= Math.abs(dx) + Math.abs(dy) > 2;
    ay += dx * 0.01;
    ax += dy * 0.01;
    drag = { x: e.clientX, y: e.clientY };
    draw();
  };
  canvas.onpointerup = (e) => {
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
      if (point) onPick({ ...point.a, index: point.index });
    }
    drag = null;
  };
  canvas.onpointercancel = () => {
    drag = null;
  };
  canvas.onwheel = (e) => {
    e.preventDefault();
    zoom = Math.max(0.2, Math.min(8, zoom * Math.exp(-e.deltaY * 0.001)));
    draw();
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
      if (rafId) cancelAnimationFrame(rafId);
      if (spinning) rafId = requestAnimationFrame(tick);
    },
    reset: () => {
      ax = 0.35;
      ay = 0.5;
      zoom = 1;
      draw();
    },
    pngURI: () => canvas.toDataURL('image/png'),
    destroy: () => {
      spinning = false;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.remove();
    },
  };
}
