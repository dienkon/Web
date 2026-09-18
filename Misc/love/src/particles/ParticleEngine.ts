export type ParticleType = 'star' | 'heart' | 'petal' | 'sparkle' | 'dust';
export type ParticlePresetName = 'calm' | 'romantic' | 'dreamy' | 'celebration' | 'climax';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  color: string;
  type: ParticleType;
  rotation: number;
  rotationSpeed: number;
  flutter?: number;
  flutterSpeed?: number;
  life?: number;
  maxLife?: number;
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private preset: ParticlePresetName = 'romantic';
  private primaryColor: string = '#f43f5e';
  private accentColor: string = '#8b5cf6';
  private maxParticles: number = 60;
  private reducedMotion: boolean = false;

  constructor(canvas: HTMLCanvasElement, preset: ParticlePresetName = 'romantic', primaryColor = '#f43f5e', accentColor = '#8b5cf6') {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Cannot get 2d context');
    this.ctx = context;
    this.preset = preset;
    this.primaryColor = primaryColor;
    this.accentColor = accentColor;

    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.animate = this.animate.bind(this);

    this.init();
  }

  private init() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.handleResize();
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });

    this.spawnInitialParticles();
  }

  public setColors(primary: string, accent: string) {
    this.primaryColor = primary;
    this.accentColor = accent;
  }

  public setPreset(preset: ParticlePresetName) {
    this.preset = preset;
    this.particles = [];
    this.spawnInitialParticles();
  }

  public setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  private handleResize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    // Responsive particle count scaling
    const isMobile = this.width < 768;
    if (this.preset === 'climax') {
      this.maxParticles = isMobile ? 65 : 120;
    } else if (this.preset === 'celebration') {
      this.maxParticles = isMobile ? 50 : 90;
    } else if (this.preset === 'calm') {
      this.maxParticles = isMobile ? 25 : 45;
    } else {
      this.maxParticles = isMobile ? 40 : 70;
    }
  }

  private handleMouseMove(e: MouseEvent) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      this.mouseX = e.touches[0].clientX;
      this.mouseY = e.touches[0].clientY;
    }
  }

  private createParticle(x?: number, y?: number, temporary = false): Particle {
    const pX = x !== undefined ? x : Math.random() * this.width;
    const pY = y !== undefined ? y : Math.random() * this.height;

    let type: ParticleType = 'dust';
    const rand = Math.random();

    if (this.preset === 'romantic') {
      if (rand < 0.45) type = 'heart';
      else if (rand < 0.7) type = 'petal';
      else if (rand < 0.85) type = 'sparkle';
      else type = 'dust';
    } else if (this.preset === 'calm') {
      if (rand < 0.5) type = 'star';
      else if (rand < 0.8) type = 'sparkle';
      else type = 'dust';
    } else if (this.preset === 'dreamy') {
      if (rand < 0.35) type = 'star';
      else if (rand < 0.65) type = 'petal';
      else if (rand < 0.85) type = 'heart';
      else type = 'sparkle';
    } else if (this.preset === 'celebration' || this.preset === 'climax') {
      if (rand < 0.55) type = 'heart';
      else if (rand < 0.8) type = 'sparkle';
      else type = 'star';
    }

    const colors = [
      this.primaryColor,
      this.accentColor,
      '#ffffff',
      '#fb7185',
      '#ffd700',
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const speedMultiplier = this.reducedMotion ? 0.15 : 1;
    const baseVy = type === 'petal' ? (0.6 + Math.random() * 0.8) : (-(0.3 + Math.random() * 0.7));

    return {
      x: pX,
      y: pY,
      vx: (Math.random() - 0.5) * 0.8 * speedMultiplier,
      vy: baseVy * speedMultiplier,
      size: type === 'heart' ? (8 + Math.random() * 10) : (type === 'petal' ? 9 + Math.random() * 8 : 2 + Math.random() * 5),
      alpha: 0.1,
      targetAlpha: 0.35 + Math.random() * 0.55,
      color,
      type,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03 * speedMultiplier,
      flutter: Math.random() * Math.PI * 2,
      flutterSpeed: 0.02 + Math.random() * 0.03,
      life: temporary ? 120 + Math.random() * 60 : undefined,
      maxLife: temporary ? 120 + Math.random() * 60 : undefined,
    };
  }

  private spawnInitialParticles() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  public burst(x: number, y: number, count = 24) {
    if (this.reducedMotion) count = Math.min(count, 8);
    for (let i = 0; i < count; i++) {
      const p = this.createParticle(x, y, true);
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 1.5;
      p.type = Math.random() < 0.65 ? 'heart' : 'sparkle';
      p.size = 10 + Math.random() * 8;
      p.targetAlpha = 0.9;
      p.alpha = 0.9;
      this.particles.push(p);
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, size: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    // top left curve
    ctx.bezierCurveTo(
      -size / 2, -topCurveHeight,
      -size, topCurveHeight / 3,
      0, size
    );
    // top right curve
    ctx.bezierCurveTo(
      size, topCurveHeight / 3,
      size / 2, -topCurveHeight,
      0, topCurveHeight
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawPetal(ctx: CanvasRenderingContext2D, size: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.4, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, size: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(Math.cos((i * Math.PI) / 2) * size, Math.sin((i * Math.PI) / 2) * size);
      ctx.lineTo(
        Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (size * 0.25),
        Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (size * 0.25)
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, size: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private animate() {
    if (!this.isRunning) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Maintain steady particle pool
    while (this.particles.length < this.maxParticles) {
      this.particles.push(this.createParticle(undefined, this.height + 20));
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Alpha fade in
      if (p.alpha < p.targetAlpha) {
        p.alpha += 0.02;
      }

      // Cursor gentle interaction (repel/swirl)
      if (this.mouseX > 0 && this.mouseY > 0) {
        const dx = p.x - this.mouseX;
        const dy = p.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && dist > 1) {
          const force = (100 - dist) / 100;
          p.x += (dx / dist) * force * 1.5;
          p.y += (dy / dist) * force * 1.5;
        }
      }

      // Physics update
      if (p.flutter !== undefined && p.flutterSpeed !== undefined) {
        p.flutter += p.flutterSpeed;
        p.x += Math.sin(p.flutter) * 0.7;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Handle temporary particles (bursts)
      if (p.life !== undefined && p.maxLife !== undefined) {
        p.life -= 1;
        p.alpha = (p.life / p.maxLife) * p.targetAlpha;
        p.vy += 0.04; // gravity for burst
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        // Wrap around boundaries
        if (p.y < -30) {
          p.y = this.height + 20;
          p.x = Math.random() * this.width;
        } else if (p.y > this.height + 30) {
          p.y = -20;
          p.x = Math.random() * this.width;
        }
        if (p.x < -30) p.x = this.width + 20;
        else if (p.x > this.width + 30) p.x = -20;
      }

      // Render particle
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.type === 'heart') {
        this.drawHeart(this.ctx, p.size, p.color, p.alpha);
      } else if (p.type === 'petal') {
        this.drawPetal(this.ctx, p.size, p.color, p.alpha);
      } else if (p.type === 'sparkle') {
        this.drawSparkle(this.ctx, p.size, p.color, p.alpha);
      } else if (p.type === 'star') {
        this.drawStar(this.ctx, p.size, p.color, p.alpha);
      } else {
        // dust mote
        this.ctx.globalAlpha = p.alpha * 0.6;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('touchmove', this.handleTouchMove);
    this.particles = [];
  }
}
