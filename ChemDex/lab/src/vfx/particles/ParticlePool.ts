import * as THREE from 'three';

export interface ParticleState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  baseSize: number;
  seed: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
}

export class ParticlePool {
  public maxCount: number;
  public liveCount = 0;
  public particles: ParticleState[];
  private freeIndices: number[];

  // Reusable scratch objects to guarantee ZERO GC allocations during animation frames
  private static scratchMat4 = new THREE.Matrix4();
  private static scratchPos = new THREE.Vector3();
  private static scratchScale = new THREE.Vector3();
  private static scratchQuat = new THREE.Quaternion();
  private static scratchQuat2 = new THREE.Quaternion();
  private static scratchEuler = new THREE.Euler();
  private static scratchColor = new THREE.Color();
  private initializedMeshes = new WeakSet<THREE.InstancedMesh>();

  constructor(maxCount: number) {
    this.maxCount = maxCount;
    this.particles = new Array(maxCount);
    this.freeIndices = new Array(maxCount);

    for (let i = 0; i < maxCount; i++) {
      this.particles[i] = {
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        life: 0,
        size: 0,
        baseSize: 0,
        seed: Math.random(),
        r: 1,
        g: 1,
        b: 1,
        alpha: 1,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        vRotX: 0,
        vRotY: 0,
        vRotZ: 0,
      };
      this.freeIndices[i] = maxCount - 1 - i;
    }
  }

  public spawn(init: Partial<ParticleState>): boolean {
    if (this.freeIndices.length === 0) return false;
    const idx = this.freeIndices.pop()!;
    const p = this.particles[idx];

    p.x = init.x ?? 0;
    p.y = init.y ?? 0;
    p.z = init.z ?? 0;
    p.vx = init.vx ?? 0;
    p.vy = init.vy ?? 0;
    p.vz = init.vz ?? 0;
    p.age = 0;
    p.life = init.life ?? 1.0;
    p.baseSize = init.baseSize ?? (init.size ?? 0.05);
    p.size = init.size ?? p.baseSize;
    p.seed = init.seed ?? Math.random();
    p.r = init.r ?? 1;
    p.g = init.g ?? 1;
    p.b = init.b ?? 1;
    p.alpha = init.alpha ?? 1;
    p.rotX = init.rotX ?? 0;
    p.rotY = init.rotY ?? 0;
    p.rotZ = init.rotZ ?? 0;
    p.vRotX = init.vRotX ?? 0;
    p.vRotY = init.vRotY ?? 0;
    p.vRotZ = init.vRotZ ?? 0;

    this.liveCount++;
    return true;
  }

  public init(mesh: THREE.InstancedMesh): void {
    if (!mesh) return;
    this.clear(mesh);
    this.initializedMeshes.add(mesh);
  }

  public update(
    dt: number,
    updater: (p: ParticleState, dt: number) => boolean,
    mesh: THREE.InstancedMesh,
    camera?: THREE.Camera
  ): void {
    if (!mesh) return;

    // Ensure all unspawned instance matrices are zeroed out on initial frame
    if (!this.initializedMeshes.has(mesh)) {
      this.clear(mesh);
      this.initializedMeshes.add(mesh);
    }

    if (this.liveCount === 0) {
      if (mesh.visible) {
        mesh.visible = false;
      }
      return;
    }

    if (dt <= 0) return;

    let updatedInstances = 0;
    const count = this.particles.length;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;

      p.age += dt;
      if (p.age >= p.life) {
        // Particle died
        p.life = 0;
        this.freeIndices.push(i);
        this.liveCount = Math.max(0, this.liveCount - 1);

        // Hide instance by scaling to zero
        ParticlePool.scratchPos.set(0, -9999, 0);
        ParticlePool.scratchScale.set(0, 0, 0);
        ParticlePool.scratchQuat.identity();
        ParticlePool.scratchMat4.compose(
          ParticlePool.scratchPos,
          ParticlePool.scratchQuat,
          ParticlePool.scratchScale
        );
        mesh.setMatrixAt(i, ParticlePool.scratchMat4);
        updatedInstances++;
        continue;
      }

      // Run custom per-particle physics & simulation logic
      const alive = updater(p, dt);
      if (!alive) {
        p.life = 0;
        this.freeIndices.push(i);
        this.liveCount = Math.max(0, this.liveCount - 1);

        ParticlePool.scratchPos.set(0, -9999, 0);
        ParticlePool.scratchScale.set(0, 0, 0);
        ParticlePool.scratchQuat.identity();
        ParticlePool.scratchMat4.compose(
          ParticlePool.scratchPos,
          ParticlePool.scratchQuat,
          ParticlePool.scratchScale
        );
        mesh.setMatrixAt(i, ParticlePool.scratchMat4);
        updatedInstances++;
        continue;
      }

      // Update position & rotation
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rotX += p.vRotX * dt;
      p.rotY += p.vRotY * dt;
      p.rotZ += p.vRotZ * dt;

      // Compose matrix: billboard to camera if camera is provided
      ParticlePool.scratchPos.set(p.x, p.y, p.z);
      if (camera) {
        ParticlePool.scratchQuat.copy(camera.quaternion);
        if (p.rotZ !== 0) {
          ParticlePool.scratchEuler.set(0, 0, p.rotZ);
          ParticlePool.scratchQuat2.setFromEuler(ParticlePool.scratchEuler);
          ParticlePool.scratchQuat.multiply(ParticlePool.scratchQuat2);
        }
      } else {
        ParticlePool.scratchEuler.set(p.rotX, p.rotY, p.rotZ);
        ParticlePool.scratchQuat.setFromEuler(ParticlePool.scratchEuler);
      }
      ParticlePool.scratchScale.set(p.size, p.size, p.size);

      ParticlePool.scratchMat4.compose(
        ParticlePool.scratchPos,
        ParticlePool.scratchQuat,
        ParticlePool.scratchScale
      );
      mesh.setMatrixAt(i, ParticlePool.scratchMat4);

      if (mesh.instanceColor) {
        ParticlePool.scratchColor.setRGB(p.r, p.g, p.b);
        mesh.setColorAt(i, ParticlePool.scratchColor);
      }
      updatedInstances++;
    }

    if (updatedInstances > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }

    mesh.visible = this.liveCount > 0;
  }

  public clear(mesh?: THREE.InstancedMesh): void {
    this.freeIndices = [];
    this.liveCount = 0;
    for (let i = 0; i < this.maxCount; i++) {
      this.particles[i].life = 0;
      this.particles[i].age = 0;
      this.freeIndices.push(this.maxCount - 1 - i);

      if (mesh) {
        ParticlePool.scratchPos.set(0, -9999, 0);
        ParticlePool.scratchScale.set(0, 0, 0);
        ParticlePool.scratchQuat.identity();
        ParticlePool.scratchMat4.compose(
          ParticlePool.scratchPos,
          ParticlePool.scratchQuat,
          ParticlePool.scratchScale
        );
        mesh.setMatrixAt(i, ParticlePool.scratchMat4);
      }
    }
    if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = false;
    }
  }
}
