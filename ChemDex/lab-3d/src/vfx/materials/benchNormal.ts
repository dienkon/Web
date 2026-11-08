import * as THREE from 'three';

let cached: THREE.DataTexture | undefined;

/** A restrained, periodic micro-normal for matte lab resin. Grayscale noise
 * is a height field, not an RGB tangent-space normal: interpreting it as one
 * produces random grazing normals and bright speckle across the entire desk. */
export function getBenchNormalTexture(): THREE.DataTexture {
  if (cached) return cached;
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const nx = 0.022 * Math.cos(3 * u + 2 * v) + 0.012 * Math.cos(7 * u - 5 * v);
    const ny = 0.018 * Math.cos(3 * u + 2 * v) - 0.015 * Math.cos(7 * u - 5 * v);
    const length = Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
    data[i] = Math.round((nx / length * 0.5 + 0.5) * 255);
    data[i + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
    data[i + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
    data[i + 3] = 255;
  }
  cached = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  cached.wrapS = cached.wrapT = THREE.RepeatWrapping;
  cached.repeat.set(8, 8);
  cached.magFilter = THREE.LinearFilter;
  cached.minFilter = THREE.LinearMipmapLinearFilter;
  cached.generateMipmaps = true;
  cached.colorSpace = THREE.NoColorSpace;
  cached.needsUpdate = true;
  return cached;
}
