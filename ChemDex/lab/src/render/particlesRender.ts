/**
 * particlesRender.ts - GPU-instanced particle rendering for bubbles,
 * crystalline precipitate glitter, droplets, and sparks.
 * 
 * Performance:
 * Single instanced draw-call per particle type.
 * Streaming position, scale, and color matrices directly from SoA ParticleSystem buffers.
 */

import * as THREE from 'three';
import { ParticleSystem, ParticleType } from '../sim/particles.js';

export class ParticleRenderer {
  public instancedMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private colorScratch: THREE.Color = new THREE.Color();

  constructor(capacity: number = 20000) {
    const geometry = new THREE.SphereGeometry(1.0, 10, 8);
    const material = new THREE.MeshPhysicalMaterial({
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 0.8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
  }

  /**
   * Synchronize active particles from simulation SoA to GPU instanced buffers
   */
  public update(particles: ParticleSystem, filterType?: ParticleType): void {
    let renderIdx = 0;

    for (let i = 0; i < particles.capacity; i++) {
      if (particles.age[i] >= particles.maxAge[i]) continue;
      if (filterType !== undefined && particles.type[i] !== filterType) continue;

      const r = particles.radius[i];
      this.dummy.position.set(particles.x[i], particles.y[i], particles.z[i]);
      this.dummy.scale.set(r, r, r);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(renderIdx, this.dummy.matrix);

      this.colorScratch.setRGB(particles.r[i], particles.g[i], particles.b[i]);
      this.instancedMesh.setColorAt(renderIdx, this.colorScratch);

      renderIdx++;
      if (renderIdx >= this.instancedMesh.count) break;
    }

    // Hide remaining unused instances
    for (let j = renderIdx; j < this.instancedMesh.count; j++) {
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(j, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }
}
