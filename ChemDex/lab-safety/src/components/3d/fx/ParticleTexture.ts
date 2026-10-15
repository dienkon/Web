import * as THREE from 'three';
// Small procedural sprite shared by a particle pool: soft edges rather than square points.
export function createParticleTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const ctx=canvas.getContext('2d')!;
  const gradient=ctx.createRadialGradient(16,16,1,16,16,16);
  gradient.addColorStop(0,'rgba(255,255,255,.8)');gradient.addColorStop(.4,'rgba(255,255,255,.45)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  return new THREE.CanvasTexture(canvas);
}
