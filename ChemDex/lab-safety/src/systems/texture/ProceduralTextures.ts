import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

function createNoisePattern(ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number = 0.05) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * opacity;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
}

export const ProceduralTextures = {
  /** Floor tiles: 0.6x0.6m squares with 4mm grout line */
  getTileFloor(): THREE.CanvasTexture {
    const key = 'tileFloor';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base ceramic grey
    ctx.fillStyle = '#C9CCCF';
    ctx.fillRect(0, 0, size, size);

    // Grout lines
    ctx.strokeStyle = '#9AA0A6';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);

    createNoisePattern(ctx, size, size, 0.04);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 7.5);
    textureCache.set(key, texture);
    return texture;
  },

  /** Wall ceramic tiles: 1.2m wainscoting */
  getTileWall(): THREE.CanvasTexture {
    const key = 'tileWall';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#F7F7F5';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    createNoisePattern(ctx, size, size, 0.02);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set(key, texture);
    return texture;
  },

  /** Black chemical-resistant epoxy countertop */
  getEpoxyCountertop(): THREE.CanvasTexture {
    const key = 'epoxyCounter';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1E2124';
    ctx.fillRect(0, 0, size, size);

    createNoisePattern(ctx, size, size, 0.03);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set(key, texture);
    return texture;
  },

  /** Brushed stainless steel */
  getBrushedSteel(): THREE.CanvasTexture {
    const key = 'brushedSteel';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#C4C9CE';
    ctx.fillRect(0, 0, size, size);

    // Fine linear brush streaks
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 2) {
      if (Math.random() > 0.4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set(key, texture);
    return texture;
  },

  /** Safety stripe texture: yellow and black 45-degree stripes */
  getHazardStripe(): THREE.CanvasTexture {
    const key = 'hazardStripe';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ECC94B'; // Safety yellow
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#1A202C'; // Black
    const stripeWidth = 32;
    for (let x = -size; x < size * 2; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + size, size);
      ctx.lineTo(x + size, size);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set(key, texture);
    return texture;
  },
};
