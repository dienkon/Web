import { HeartLayerConfig } from '../models/LoveStory';

interface PhysicsHeart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  rotation: number;
  rotationSpeed: number;
  layerId: string;
  color: string;
  blur: number;
  glow: boolean;
  glowColor?: string;
  reaction: 'repel' | 'attract' | 'burstOnClick' | 'none';
  parallax: number;
  angle: number;
  orbitRadius: number;
  orbitSpeed: number;
  life?: number;
  maxLife?: number;
}

export class HeartLayerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layers: HeartLayerConfig[] = [];
  private hearts: PhysicsHeart[] = [];
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private mouseX: number = -1000;
  private mouseY: number = -1000;

  constructor(canvas: HTMLCanvasElement, layers: HeartLayerConfig[]) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Cannot get 2d context for HeartLayerEngine');
    this.ctx = context;
    this.layers = layers;

    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.animate = this.animate.bind(this);

    this.init();
  }

  private init() {
    this.handleResize();
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    this.repopulateHearts();
  }

  public setLayers(layers: HeartLayerConfig[]) {
    this.layers = layers;
    this.repopulateHearts();
  }

  private handleResize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  private handleMouseMove(e: MouseEvent) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  private createHeartForLayer(layer: HeartLayerConfig, customX?: number, customY?: number, isBurst = false): PhysicsHeart {
    const pX = customX !== undefined ? customX : Math.random() * this.width;
    const pY = customY !== undefined ? customY : Math.random() * this.height;

    const size = layer.minSize + Math.random() * Math.max(1, layer.maxSize - layer.minSize);
    const speed = layer.speed;

    let vx = (Math.random() - 0.5) * (layer.drift * 2);
    let vy = -speed;

    if (layer.direction === 'downward') {
      vy = speed;
    } else if (layer.direction === 'sideways') {
      vx = (Math.random() > 0.5 ? 1 : -1) * speed;
      vy = (Math.random() - 0.5) * 0.4;
    } else if (layer.direction === 'gravity') {
      vy = 0.5 + Math.random() * speed;
      vx = (Math.random() - 0.5) * 1.5;
    }

    if (isBurst) {
      const angle = Math.random() * Math.PI * 2;
      const burstSpeed = 2 + Math.random() * 5;
      vx = Math.cos(angle) * burstSpeed;
      vy = Math.sin(angle) * burstSpeed;
    }

    return {
      x: pX,
      y: pY,
      vx,
      vy,
      size,
      alpha: isBurst ? 1 : 0.1,
      targetAlpha: isBurst ? 1 : 0.4 + Math.random() * 0.55,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      layerId: layer.id,
      color: layer.color || '#f43f5e',
      blur: layer.blur || 0,
      glow: layer.glow,
      glowColor: layer.glowColor || layer.color,
      reaction: layer.interactiveReaction,
      parallax: layer.parallaxStrength || 0.3,
      angle: Math.random() * Math.PI * 2,
      orbitRadius: 20 + Math.random() * 60,
      orbitSpeed: 0.02 + Math.random() * 0.03,
      life: isBurst ? 60 + Math.random() * 40 : undefined,
      maxLife: isBurst ? 60 + Math.random() * 40 : undefined,
    };
  }

  private repopulateHearts() {
    this.hearts = [];
    this.layers.forEach((layer) => {
      if (!layer.enabled) return;
      const count = Math.min(layer.quantity, 60);
      for (let i = 0; i < count; i++) {
        this.hearts.push(this.createHeartForLayer(layer));
      }
    });
  }

  public burst(x: number, y: number, count = 16) {
    const activeLayer = this.layers.find((l) => l.enabled) || this.layers[0];
    if (!activeLayer) return;

    for (let i = 0; i < count; i++) {
      this.hearts.push(this.createHeartForLayer(activeLayer, x, y, true));
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, size: number, color: string, alpha: number, glow: boolean, glowColor?: string) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;

    if (glow && glowColor) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = size * 0.7;
    }

    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, -topCurveHeight, -size, topCurveHeight / 3, 0, size);
    ctx.bezierCurveTo(size, topCurveHeight / 3, size / 2, -topCurveHeight, 0, topCurveHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private animate() {
    if (!this.isRunning) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];

      // Fade in alpha
      if (h.alpha < h.targetAlpha) {
        h.alpha += 0.02;
      }

      // Parallax & Cursor Physics
      if (this.mouseX > 0 && this.mouseY > 0 && h.reaction !== 'none') {
        const dx = h.x - this.mouseX;
        const dy = h.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 120 * h.parallax;

        if (dist < radius && dist > 1) {
          const force = (radius - dist) / radius;
          if (h.reaction === 'repel') {
            h.x += (dx / dist) * force * 3 * h.parallax;
            h.y += (dy / dist) * force * 3 * h.parallax;
          } else if (h.reaction === 'attract') {
            h.x -= (dx / dist) * force * 2 * h.parallax;
            h.y -= (dy / dist) * force * 2 * h.parallax;
          }
        }
      }

      h.x += h.vx;
      h.y += h.vy;
      h.rotation += h.rotationSpeed;

      // Handle burst hearts
      if (h.life !== undefined && h.maxLife !== undefined) {
        h.life -= 1;
        h.alpha = (h.life / h.maxLife);
        h.vy += 0.05; // gravity
        if (h.life <= 0) {
          this.hearts.splice(i, 1);
          continue;
        }
      } else {
        // Wrap screen borders
        if (h.y < -40) {
          h.y = this.height + 30;
          h.x = Math.random() * this.width;
        } else if (h.y > this.height + 40) {
          h.y = -30;
          h.x = Math.random() * this.width;
        }
        if (h.x < -40) h.x = this.width + 30;
        else if (h.x > this.width + 40) h.x = -30;
      }

      // Render
      this.ctx.save();
      this.ctx.translate(h.x, h.y);
      this.ctx.rotate(h.rotation);
      this.drawHeart(this.ctx, h.size, h.color, h.alpha, h.glow, h.glowColor);
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
    this.hearts = [];
  }
}
