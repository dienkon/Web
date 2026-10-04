import * as THREE from 'three';

// Cache generated textures so they are never recreated repeatedly
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a soft blurred radial sprite texture for particles (gas, smoke, steam, bubbles)
 */
export function getSoftParticleTexture(size = 128): THREE.CanvasTexture {
  const key = `soft_particle_${size}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates a subtle procedural tileable noise texture for surfaces and normal perturbations
 */
export function getNoiseTexture(width = 256, height = 256): THREE.CanvasTexture {
  const key = `noise_${width}x${height}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates a clean laboratory wall tile texture with subtle grout lines
 */
export function getLaboratoryTileTexture(): { map: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const keyMap = 'lab_tile_diffuse';
  const keyNormal = 'lab_tile_normal';

  if (textureCache.has(keyMap) && textureCache.has(keyNormal)) {
    return {
      map: textureCache.get(keyMap)!,
      normal: textureCache.get(keyNormal)!,
    };
  }

  const width = 512;
  const height = 512;
  const canvasMap = document.createElement('canvas');
  canvasMap.width = width;
  canvasMap.height = height;
  const ctxMap = canvasMap.getContext('2d')!;

  const canvasNorm = document.createElement('canvas');
  canvasNorm.width = width;
  canvasNorm.height = height;
  const ctxNorm = canvasNorm.getContext('2d')!;

  // 10x20 cm style tiles: 4 rows x 2 cols on 512x512 with running bond (staggered)
  const rows = 8;
  const cols = 4;
  const tileH = height / rows;
  const tileW = width / cols;
  const groutSize = 3;

  // Base diffuse
  ctxMap.fillStyle = '#f8fafc';
  ctxMap.fillRect(0, 0, width, height);

  // Normal base: (128, 128, 255) => flat normal vector (0, 0, 1)
  ctxNorm.fillStyle = 'rgb(128, 128, 255)';
  ctxNorm.fillRect(0, 0, width, height);

  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2 === 0) ? 0 : tileW / 2;
    for (let c = -1; c <= cols; c++) {
      const x = c * tileW + offsetX + groutSize / 2;
      const y = r * tileH + groutSize / 2;
      const w = tileW - groutSize;
      const h = tileH - groutSize;

      // Subtle gloss & color variation per tile
      const shade = 250 + Math.floor((Math.sin(r * 3 + c * 7) + 1) * 2.5);
      ctxMap.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctxMap.fillRect(x, y, w, h);

      // Subtle bevel normal around tile edges
      ctxNorm.fillStyle = 'rgb(140, 140, 250)';
      ctxNorm.fillRect(x, y, w, h);
    }
  }

  // Draw grey grout lines
  ctxMap.fillStyle = '#cbd5e1';
  for (let r = 0; r <= rows; r++) {
    ctxMap.fillRect(0, r * tileH - groutSize / 2, width, groutSize);
  }
  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2 === 0) ? 0 : tileW / 2;
    for (let c = -1; c <= cols + 1; c++) {
      ctxMap.fillRect(c * tileW + offsetX - groutSize / 2, r * tileH, groutSize, tileH);
    }
  }

  const mapTex = new THREE.CanvasTexture(canvasMap);
  mapTex.wrapS = THREE.RepeatWrapping;
  mapTex.wrapT = THREE.RepeatWrapping;
  mapTex.repeat.set(6, 3);
  mapTex.needsUpdate = true;
  textureCache.set(keyMap, mapTex);

  const normTex = new THREE.CanvasTexture(canvasNorm);
  normTex.wrapS = THREE.RepeatWrapping;
  normTex.wrapT = THREE.RepeatWrapping;
  normTex.repeat.set(6, 3);
  normTex.needsUpdate = true;
  textureCache.set(keyNormal, normTex);

  return { map: mapTex, normal: normTex };
}

/**
 * Creates etched ml graduation markings and label background for vessels
 */
export function getVesselGraduationTexture(
  capacity_ml: number,
  vesselType: string
): THREE.CanvasTexture {
  const key = `grad_${vesselType}_${capacity_ml}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const width = 256;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, width, height);

    // Subtle white ceramic frosted label patch for beaker / flask
    if (vesselType === 'beaker' || vesselType === 'flask') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.roundRect(width * 0.45, height * 0.28, width * 0.45, height * 0.16, 8);
      ctx.fill();

      // Border around label patch
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Lab capacity text
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(`${capacity_ml} mL`, width * 0.48, height * 0.35);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText('BORO 3.3', width * 0.48, height * 0.40);
    }

    // Graduation tick marks along the vertical axis
    const startY = height * 0.82;
    const endY = height * 0.25;
    const stepCount = 5;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.font = '13px sans-serif';

    for (let i = 0; i <= stepCount; i++) {
      const frac = i / stepCount;
      const y = startY - frac * (startY - endY);
      const ml = Math.round((capacity_ml / stepCount) * i);

      // Major tick mark
      ctx.beginPath();
      ctx.moveTo(width * 0.2, y);
      ctx.lineTo(width * 0.35, y);
      ctx.stroke();

      if (i > 0) {
        ctx.fillText(`${ml}`, width * 0.38, y + 4);
      }

      // Minor tick mark
      if (i < stepCount) {
        const midY = y - (startY - endY) / (stepCount * 2);
        ctx.beginPath();
        ctx.moveTo(width * 0.23, midY);
        ctx.lineTo(width * 0.31, midY);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates dynamic caustics pattern texture
 */
export function getCausticTexture(size = 256): THREE.CanvasTexture {
  const key = `caustic_${size}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center * 0.85);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.4, 'rgba(224, 242, 254, 0.7)');
    gradient.addColorStop(0.8, 'rgba(186, 230, 253, 0.2)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw wavy caustic web threads
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const angle = (i / 6) * Math.PI * 2;
      const x1 = center + Math.cos(angle) * (center * 0.2);
      const y1 = center + Math.sin(angle) * (center * 0.2);
      const x2 = center + Math.cos(angle + 0.8) * (center * 0.75);
      const y2 = center + Math.sin(angle + 0.8) * (center * 0.75);
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(center, center, x2, y2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates a sky gradient texture for the lab window
 */
export function getSkyGradientTexture(): THREE.CanvasTexture {
  const key = 'sky_gradient_window';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#38bdf8'); // Sky blue
    grad.addColorStop(0.45, '#7dd3fc');
    grad.addColorStop(0.8, '#bae6fd');
    grad.addColorStop(1.0, '#fffbeb'); // Warm sunlight at horizon

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates an authentic chemical reagent bottle label with GHS pictogram
 */
export function getReagentBottleLabelTexture(
  name: string,
  formula: string,
  hazard: 'toxic' | 'corrosive' | 'flammable' | 'oxidizer' | 'safe' = 'safe'
): THREE.CanvasTexture {
  const key = `bottle_label_${formula}_${hazard}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Label paper background: crisp off-white with fine border
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    // Left red stripe indicating purity/standard
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(6, 6, 8, height - 12);

    // Formula text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(formula, 24, 44);

    // Chemical name
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(name.length > 22 ? name.substring(0, 20) + '...' : name, 24, 70);

    // Purity grade
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('ANALYTICAL REAGENT (AR)', 24, 94);
    ctx.fillText('99.5% PURITY', 24, 110);

    // GHS Hazard Diamond on the right
    if (hazard !== 'safe') {
      const hx = width - 42;
      const hy = height / 2;
      const r = 24;

      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(Math.PI / 4);

      // Red diamond border
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-r / 2, -r / 2, r, r);
      ctx.strokeRect(-r / 2, -r / 2, r, r);

      ctx.restore();

      // Symbol inside diamond
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbol = hazard === 'flammable' ? '🔥' : hazard === 'corrosive' ? '⚗️' : hazard === 'oxidizer' ? '⭕' : '☠️';
      ctx.fillText(symbol, hx, hy);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates soft alpha mask for sunbeam light cones
 */
export function getSunbeamTexture(): THREE.CanvasTexture {
  const key = 'sunbeam_gradient';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(255, 250, 220, 0.45)');
    grad.addColorStop(0.2, 'rgba(255, 250, 220, 0.35)');
    grad.addColorStop(0.7, 'rgba(255, 250, 220, 0.12)');
    grad.addColorStop(1.0, 'rgba(255, 250, 220, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates authentic bubble sprite with sharp Fresnel rim and specular highlight dot
 */
export function getBubbleSpriteTexture(size = 128): THREE.CanvasTexture {
  const key = `bubble_sprite_${size}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const center = size / 2;
    const radius = size * 0.44;

    // Center gradient with high transparency
    const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.04)');
    grad.addColorStop(0.65, 'rgba(220, 245, 255, 0.15)');
    grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(0.96, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight spot at top-left
    const spotX = center - radius * 0.38;
    const spotY = center - radius * 0.38;
    const spotR = radius * 0.22;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotR);
    spotGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    spotGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    spotGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates stretched spark particle sprite with bright core
 */
export function getSparkTexture(): THREE.CanvasTexture {
  const key = 'spark_sprite_v1';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const cx = 64;
    const cy = 16;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(254, 240, 138, 0.95)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.6)');
    grad.addColorStop(0.8, 'rgba(234, 88, 12, 0.2)');
    grad.addColorStop(1.0, 'rgba(234, 88, 12, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

