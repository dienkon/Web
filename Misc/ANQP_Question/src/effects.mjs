// Hiệu ứng hoạt họa: luân phiên drone, bom và lựu đạn khi chọn sai.
export function createEffects(root) {
  const canvas = document.createElement('canvas');
  canvas.className = 'effects-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  root.append(canvas);
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let timer = 0;
  let shakeTimer = 0;
  let drone;
  let wrongCount = 0;
  const shakeTargets = [...document.querySelectorAll('.site-shell, .landscape')];
  const fallingArtwork = {
    bomb: `<svg viewBox="0 0 180 260" fill="none"><defs><linearGradient id="bomb-metal" x1="30" y1="90" x2="150" y2="170" gradientUnits="userSpaceOnUse"><stop stop-color="#71845a"/><stop offset=".45" stop-color="#3f5339"/><stop offset="1" stop-color="#172c25"/></linearGradient></defs><path d="M72 70 48 15l42 20 42-20-24 55" fill="#344b35" stroke="#d6c49a" stroke-width="4"/><path d="M90 48v37" stroke="#d6c49a" stroke-width="5"/><path d="M61 70C34 106 27 155 43 198c10 27 32 47 47 53 15-6 37-26 47-53 16-43 9-92-18-128Z" fill="url(#bomb-metal)" stroke="#e0cca1" stroke-width="4"/><path d="M42 126h96M39 144h102" stroke="#efc45d" stroke-width="9"/><path d="M58 162c0 24 11 49 23 62" stroke="#a7b08a" stroke-width="5" stroke-linecap="round" opacity=".55"/><path d="m90 196 6 12 13 2-10 9 2 13-11-6-11 6 2-13-10-9 13-2Z" fill="#e9c66e"/></svg>`,
    grenade: `<svg viewBox="0 0 180 240" fill="none"><defs><linearGradient id="grenade-metal" x2="1" y2="1"><stop stop-color="#728453"/><stop offset="1" stop-color="#243b29"/></linearGradient></defs><circle cx="117" cy="35" r="24" stroke="#dfcea6" stroke-width="7"/><path d="M72 58V32h33v39" fill="#435343" stroke="#e0cfaa" stroke-width="4"/><path d="m99 40 33 17 15 88-16 5-23-77-21-9" fill="#a1aa8b" stroke="#e3d3af" stroke-width="4"/><path d="M51 77c-21 27-31 60-24 96 7 35 28 52 63 53 35-1 56-18 63-53 7-36-3-69-24-96Z" fill="url(#grenade-metal)" stroke="#d0c399" stroke-width="4"/><g stroke="#1a3023" stroke-width="7"><path d="M40 103h97M30 135h120M28 168h124M41 200h98M67 81l-10 119M108 81l12 119M88 80v142"/></g><path d="M51 88h28" stroke="#f0d077" stroke-width="5" stroke-linecap="round"/></svg>`,
  };
  function stop() {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    clearTimeout(shakeTimer);
    drone?.remove();
    canvas.classList.remove('active');
    root.classList.remove('impact');
    shakeTargets.forEach(target => target.classList.remove('screen-shake'));
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }
  function particles(success) {
    if (!ctx) return;
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.classList.add('active');
    const dots = [];
    const colors = success ? ['#ffe5a0', '#ffc541', '#f4faf2', '#73dcba', '#f6a7a3'] : ['#fff3bf', '#ffba38', '#ff6928', '#b94d22'];
    const origins = success ? [[w * .2, h * .4], [w * .5, h * .22], [w * .8, h * .4]] : [[w * .5, h * .5]];
    for (const [x, y] of origins) for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * (success ? 320 : 520);
      dots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: colors[i % colors.length], size: 2 + Math.random() * (success ? 3 : 10) });
    }
    const start = performance.now();
    let previous = start;
    function draw(now) {
      const elapsed = (now - start) / 1000;
      const dt = Math.min((now - previous) / 1000, .04); previous = now;
      ctx.clearRect(0, 0, w, h);
      if (!success) {
        const radius = elapsed * 650;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,184,65,${Math.max(0, .8 - elapsed)})`; ctx.lineWidth = 18; ctx.stroke();
        const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(1, 180 + elapsed * 260));
        glow.addColorStop(0, `rgba(255,198,90,${Math.max(0, .55 - elapsed * .3)})`); glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2);
      for (const p of dots) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 130 * dt;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * Math.max(.1, 1 - elapsed / 2), 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (elapsed < 2.1) frame = requestAnimationFrame(draw);
      else stop();
    }
    frame = requestAnimationFrame(draw);
  }
  return {
    stop,
    play(success) {
      stop();
      if (reduced.matches) return;
      if (success) { particles(true); return; }
      const variant = ['drone', 'bomb', 'grenade'][wrongCount++ % 3];
      drone = document.createElement('div');
      drone.className = variant === 'drone' ? 'fpv-drone' : `falling-ordnance falling-${variant}`;
      drone.setAttribute('aria-hidden', 'true');
      drone.innerHTML = `<svg viewBox="0 0 240 160" fill="none"><g stroke="#111c17" stroke-width="13" stroke-linecap="round"><path d="m58 35 124 90M182 35 58 125"/></g><g fill="#283b30" stroke="#c0bb91" stroke-width="3"><ellipse cx="50" cy="32" rx="42" ry="18"/><ellipse cx="190" cy="32" rx="42" ry="18"/><ellipse cx="50" cy="128" rx="42" ry="18"/><ellipse cx="190" cy="128" rx="42" ry="18"/><path d="m94 50 52 0 12 54-38 20-38-20Z"/></g><g stroke="#e5dbba" stroke-width="3" opacity=".8"><path d="M10 32h80M150 32h80M10 128h80M150 128h80"/></g><rect x="105" y="69" width="30" height="24" rx="6" fill="#121d1a"/><circle cx="120" cy="81" r="8" fill="#e3b854"/><circle cx="120" cy="81" r="4" fill="#192626"/></svg>`;
      if (variant !== 'drone') drone.innerHTML = fallingArtwork[variant];
      root.append(drone);
      timer = setTimeout(() => {
        drone?.remove();
        root.classList.add('impact');
        shakeTargets.forEach(target => target.classList.add('screen-shake'));
        shakeTimer = setTimeout(() => shakeTargets.forEach(target => target.classList.remove('screen-shake')), 600);
        particles(false);
      }, 700);
    },
  };
}
