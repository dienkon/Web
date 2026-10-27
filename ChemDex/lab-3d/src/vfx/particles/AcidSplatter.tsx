import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { vfxBus } from '../bus';
import { useAppStore } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import { simulationFrameDt } from '../../core/clock';
import { PRNG } from '../../core/rng';
import { advanceSplatterFlight, advanceSplatterBounce } from '../../science/splatterFlight';

const TABLE_SURFACE_Y = LAB_PHYSICS.TABLE_SURFACE_Y;
const MAX_TRAIL_STEPS = 5;

interface DropletProjectile {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  colorHex: string;
  isAcid: boolean;
  substances: string[];
  life: number;
  maxLife: number;
  history: Array<[number, number, number]>;
}

interface BounceDroplet {
  delay_s: number;
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export const AcidSplatter = React.memo(function AcidSplatter() {
  const rng = useMemo(() => new PRNG(), []);
  const simulationTime = useRef(0);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const maxDroplets = useMemo(() => {
    return Math.max(24, Math.floor((effectiveTier === 'high' || effectiveTier === 'ultra' ? 120 : effectiveTier === 'medium' ? 64 : 32) * multiplier));
  }, [effectiveTier, multiplier]);

  const maxTrails = maxDroplets * MAX_TRAIL_STEPS;
  const maxBounces = maxDroplets * 4;

  const dropletMeshRef = useRef<THREE.InstancedMesh>(null);
  const trailMeshRef = useRef<THREE.InstancedMesh>(null);
  const bounceMeshRef = useRef<THREE.InstancedMesh>(null);

  // Preallocated glyph slots; trajectory samples still allocate on the CPU.
  const projectiles = useMemo<DropletProjectile[]>(() => {
    return Array.from({ length: maxDroplets }, () => ({
      active: false,
      x: 0,
      y: -9999,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 0.02,
      r: 1,
      g: 1,
      b: 1,
      alpha: 1,
      colorHex: '#fca5a5',
      isAcid: false,
      substances: [],
      life: 0,
      maxLife: 2.5,
      history: [],
    }));
  }, [maxDroplets]);

  const bounces = useMemo<BounceDroplet[]>(() => {
    return Array.from({ length: maxBounces }, () => ({
      delay_s: 0,
      active: false,
      x: 0,
      y: -9999,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 0.015,
      r: 1,
      g: 1,
      b: 1,
      alpha: 1,
      life: 0,
      maxLife: 0.4,
    }));
  }, [maxBounces]);

  // Scratch objects for zero allocations
  const _pos = useMemo(() => new THREE.Vector3(), []);
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _scale = useMemo(() => new THREE.Vector3(), []);
  const _mat4 = useMemo(() => new THREE.Matrix4(), []);
  const _up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const _vDir = useMemo(() => new THREE.Vector3(), []);
  const _color = useMemo(() => new THREE.Color(), []);
  const lastSoundTime = useRef(-Infinity);

  // Initialize instanced meshes
  useEffect(() => {
    _pos.set(0, -9999, 0);
    _scale.set(0, 0, 0);
    _quat.identity();
    _mat4.compose(_pos, _quat, _scale);

    if (dropletMeshRef.current) {
      for (let i = 0; i < maxDroplets; i++) {
        dropletMeshRef.current.setMatrixAt(i, _mat4);
      }
      dropletMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (trailMeshRef.current) {
      for (let i = 0; i < maxTrails; i++) {
        trailMeshRef.current.setMatrixAt(i, _mat4);
      }
      trailMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (bounceMeshRef.current) {
      for (let i = 0; i < maxBounces; i++) {
        bounceMeshRef.current.setMatrixAt(i, _mat4);
      }
      bounceMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [maxDroplets, maxTrails, maxBounces, _mat4, _pos, _quat, _scale]);

  // Helper to spawn a bounce splash droplet upon landing
  const spawnBounce = (x: number, z: number, r: number, g: number, b: number, delay_s: number) => {
    const slot = bounces.find(b => !b.active);
    if (!slot) return;

    const angle = rng.next() * Math.PI * 2;
    const speed = 0.25 + rng.next() * 0.45;
    slot.active = true;
    slot.delay_s = delay_s;
    slot.x = x;
    slot.y = TABLE_SURFACE_Y + 0.003;
    slot.z = z;
    slot.vx = Math.cos(angle) * speed;
    slot.vy = 0.08 + rng.next() * 0.16;
    slot.vz = Math.sin(angle) * speed;
    slot.size = 0.012 + rng.next() * 0.014;
    slot.r = r;
    slot.g = g;
    slot.b = b;
    slot.alpha = 0.9;
    slot.life = 0;
    slot.maxLife = 0.28 + rng.next() * 0.15;
  };

  // Helper to spawn projectile droplets
  const spawnSplatter = (
    origin: [number, number, number],
    count: number,
    baseSpeed: number,
    colorHex: string,
    isAcid: boolean,
    substances: string[]
  ) => {
    if (![...origin, count, baseSpeed].every(Number.isFinite) || count <= 0 || baseSpeed < 0) return;
    const col = new THREE.Color(colorHex);
    let spawned = 0;

    for (let i = 0; i < maxDroplets && spawned < count; i++) {
      const p = projectiles[i];
      if (p.active) continue;

      // Seeded presentation cone; speeds supplied by VFX are in scene units/s.
      const theta = rng.next() * Math.PI * 2;
      const elevation = 0.55 + rng.next() * 0.42; // sin(elevation)
      const horizFrac = Math.sqrt(Math.max(0.01, 1 - elevation * elevation));
      const speed = baseSpeed * (0.7 + rng.next() * 0.6);

      p.active = true;
      p.x = origin[0] + (rng.next() - 0.5) * 0.08;
      p.y = origin[1];
      p.z = origin[2] + (rng.next() - 0.5) * 0.08;
      p.vx = Math.cos(theta) * horizFrac * speed;
      p.vy = elevation * speed;
      p.vz = Math.sin(theta) * horizFrac * speed;
      p.size = 0.022 + rng.next() * 0.024;
      p.r = col.r;
      p.g = col.g;
      p.b = col.b;
      p.alpha = 0.95;
      p.colorHex = colorHex;
      p.isAcid = isAcid;
      p.substances = substances;
      p.life = 0;
      p.maxLife = 2.4;
      p.history = [[p.x, p.y, p.z]];

      spawned++;
    }
  };

  // One explicit liquid-presentation channel. A flash/explosion alone does
  // not prove that any liquid was ejected.
  useEffect(() => {
    const unsubAcid = vfxBus.on('acid:splatter', (e) => {
      const burstCount = Math.floor((e.count ?? 60) * multiplier);
      spawnSplatter(
        e.position,
        burstCount,
        e.speed ?? 4.2,
        e.color || '#fca5a5',
        e.isAcid ?? false,
        e.substances ?? []
      );
    });

    return () => {
      unsubAcid();
    };
  }, [multiplier]);

  useFrame((_, delta) => {
    const dt = simulationFrameDt(delta, useAppStore.getState());
    if (dt <= 0) return;
    const startTime = simulationTime.current;
    simulationTime.current += dt;
    let activeProjectileCount = 0;
    let trailIndex = 0;

    // 1. Update Ballistic Flying Droplets
    for (let i = 0; i < maxDroplets; i++) {
      const p = projectiles[i];
      if (!p.active) {
        _pos.set(0, -9999, 0);
        _scale.set(0, 0, 0);
        _quat.identity();
        _mat4.compose(_pos, _quat, _scale);
        if (dropletMeshRef.current) dropletMeshRef.current.setMatrixAt(i, _mat4);
        continue;
      }

      const flight = advanceSplatterFlight(p, dt, TABLE_SURFACE_Y);
      p.x = flight.x; p.y = flight.y; p.z = flight.z;
      p.vx = flight.vx; p.vy = flight.vy; p.vz = flight.vz;
      p.life += flight.elapsed_s;
      const speed = Math.hypot(p.vx, p.vy, p.vz);

      // Store trajectory point history for arc rendering
      p.history.push([p.x, p.y, p.z]);
      if (p.history.length > MAX_TRAIL_STEPS) {
        p.history.shift();
      }

      // Check Table Collision (Landing & Spattering onto Workbench Surface)
      if (flight.hit) {
        p.active = false;

        // Read-only presentation. Shatter/pour inventory already owns the
        // finite released matter; quality-dependent glyphs cannot add it again.

        // Spawn secondary capillary bounce droplets scattering outward
        const numBounces = 3 + Math.floor(rng.next() * 3);
        for (let b = 0; b < numBounces; b++) {
          spawnBounce(p.x, p.z, p.r, p.g, p.b, flight.elapsed_s);
        }

        // Play audio impact sizzle and splash
        const impactTime = startTime + flight.elapsed_s;
        if (impactTime - lastSoundTime.current >= 0.12) {
          labSound.playDroplet();
          lastSoundTime.current = impactTime;
        }

        _pos.set(0, -9999, 0);
        _scale.set(0, 0, 0);
        _quat.identity();
        _mat4.compose(_pos, _quat, _scale);
        if (dropletMeshRef.current) dropletMeshRef.current.setMatrixAt(i, _mat4);
        continue;
      }

      // Exceeded max life
      if (p.life >= p.maxLife) {
        p.active = false;
        _scale.set(0, 0, 0); _quat.identity(); _mat4.compose(_pos, _quat, _scale);
        dropletMeshRef.current?.setMatrixAt(i, _mat4);
        continue;
      }
      activeProjectileCount++;

      // Render flying droplet elongated along velocity vector
      _pos.set(p.x, p.y, p.z);
      _vDir.set(p.vx, p.vy, p.vz).normalize();
      _quat.setFromUnitVectors(_up, _vDir);

      const stretch = 1.0 + Math.min(2.8, speed * 0.35);
      _scale.set(p.size, p.size * stretch, p.size);
      _mat4.compose(_pos, _quat, _scale);

      if (dropletMeshRef.current) {
        dropletMeshRef.current.setMatrixAt(i, _mat4);
        _color.setRGB(p.r, p.g, p.b);
        dropletMeshRef.current.setColorAt(i, _color);
      }

      // Render Trajectory Arc Ribbons / Stream of Trail Beads
      for (let h = 0; h < p.history.length; h++) {
        if (trailIndex >= maxTrails) break;
        const pt = p.history[h];
        const ageFrac = (h + 1) / p.history.length;
        const trailR = p.size * (0.35 + ageFrac * 0.65);

        _pos.set(pt[0], pt[1], pt[2]);
        _scale.set(trailR, trailR, trailR);
        _quat.identity();
        _mat4.compose(_pos, _quat, _scale);

        if (trailMeshRef.current) {
          trailMeshRef.current.setMatrixAt(trailIndex, _mat4);
          _color.setRGB(p.r, p.g, p.b).lerp(new THREE.Color('#ffffff'), 0.45);
          trailMeshRef.current.setColorAt(trailIndex, _color);
        }
        trailIndex++;
      }
    }

    // Hide remaining unused trail slots
    if (trailMeshRef.current) {
      _pos.set(0, -9999, 0);
      _scale.set(0, 0, 0);
      _quat.identity();
      _mat4.compose(_pos, _quat, _scale);
      for (let t = trailIndex; t < maxTrails; t++) {
        trailMeshRef.current.setMatrixAt(t, _mat4);
      }
      trailMeshRef.current.instanceMatrix.needsUpdate = true;
      if (trailMeshRef.current.instanceColor) trailMeshRef.current.instanceColor.needsUpdate = true;
      trailMeshRef.current.visible = trailIndex > 0;
    }

    if (dropletMeshRef.current) {
      dropletMeshRef.current.instanceMatrix.needsUpdate = true;
      if (dropletMeshRef.current.instanceColor) dropletMeshRef.current.instanceColor.needsUpdate = true;
      dropletMeshRef.current.visible = activeProjectileCount > 0;
    }

    // 2. Update Secondary Capillary Bounce Droplets on Table Surface
    let activeBounces = 0;
    for (let b = 0; b < maxBounces; b++) {
      const bd = bounces[b];
      if (!bd.active) {
        _pos.set(0, -9999, 0);
        _scale.set(0, 0, 0);
        _quat.identity();
        _mat4.compose(_pos, _quat, _scale);
        if (bounceMeshRef.current) bounceMeshRef.current.setMatrixAt(b, _mat4);
        continue;
      }

      const bounceDt = Math.max(0, dt - bd.delay_s);
      bd.delay_s = 0;
      bd.life += bounceDt;
      if (bd.life >= bd.maxLife) {
        bd.active = false;
        _scale.set(0, 0, 0); _quat.identity(); _mat4.compose(_pos, _quat, _scale);
        bounceMeshRef.current?.setMatrixAt(b, _mat4);
        continue;
      }
      activeBounces++;

      const bounce = advanceSplatterBounce(bd, bounceDt, TABLE_SURFACE_Y);
      bd.x = bounce.x; bd.y = bounce.y; bd.z = bounce.z;
      bd.vx = bounce.vx; bd.vy = bounce.vy; bd.vz = bounce.vz;

      const lifeFrac = 1.0 - bd.life / bd.maxLife;
      const bScale = bd.size * lifeFrac;

      _pos.set(bd.x, bd.y, bd.z);
      _scale.set(bScale, bScale * 0.7, bScale);
      _quat.identity();
      _mat4.compose(_pos, _quat, _scale);

      if (bounceMeshRef.current) {
        bounceMeshRef.current.setMatrixAt(b, _mat4);
        _color.setRGB(bd.r, bd.g, bd.b);
        bounceMeshRef.current.setColorAt(b, _color);
      }
    }

    if (bounceMeshRef.current) {
      bounceMeshRef.current.instanceMatrix.needsUpdate = true;
      if (bounceMeshRef.current.instanceColor) bounceMeshRef.current.instanceColor.needsUpdate = true;
      bounceMeshRef.current.visible = activeBounces > 0;
    }
  });

  return (
    <group name="acid_splatter_system">
      {/* 1. Airborne Projectile Droplet Streaks (InstancedMesh) */}
      <instancedMesh
        ref={dropletMeshRef}
        args={[undefined, undefined, maxDroplets]}
        frustumCulled={false}
        renderOrder={5}
        visible={false}
      >
        <cylinderGeometry args={[0.012, 0.024, 0.12, 8]} />
        <meshPhysicalMaterial
          roughness={0.08}
          transmission={0.45}
          ior={1.38}
          clearcoat={0.9}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.88}
          depthWrite={false}
        />
      </instancedMesh>

      {/* 2. Parabolic Trajectory Arc Ribbons / Trail Beads (InstancedMesh) */}
      <instancedMesh
        ref={trailMeshRef}
        args={[undefined, undefined, maxTrails]}
        frustumCulled={false}
        renderOrder={4}
        visible={false}
      >
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      {/* 3. Secondary Capillary Bounce Droplets on Workbench (InstancedMesh) */}
      <instancedMesh
        ref={bounceMeshRef}
        args={[undefined, undefined, maxBounces]}
        frustumCulled={false}
        renderOrder={5}
        visible={false}
      >
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          roughness={0.12}
          metalness={0.1}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
});

export default AcidSplatter;
