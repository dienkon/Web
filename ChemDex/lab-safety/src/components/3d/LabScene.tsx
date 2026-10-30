import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useProgress } from '@react-three/drei';
import { AdaptivePerformance, initialDpr } from '../../systems/performance/AdaptivePerformance';
import {useCoarsePointer} from '../../systems/device/useCoarsePointer';
import * as THREE from 'three';
import { LabStandardRoom } from './lab/LabStandardRoom';
import { useStore } from '../../store/useStore';
import { FirstPersonController } from './fps/FirstPersonController';
import { Viewmodel } from './fps/Viewmodel';
import { PlayerModel } from './PlayerModel';
import { FPSCrosshair } from '../ui/hud/FPSCrosshair';
import { PPEOverlay } from '../ui/hud/PPEOverlay';
import { ExtinguisherHUD } from '../ui/hud/ExtinguisherHUD';
import { FireFX } from './fx/FireFX';
import { LabAtmosphere } from './fx/LabAtmosphere';
import type { PlayerState } from '../../types';
import { RendererInfoProbe } from '../../systems/performance/RendererInfoProbe';
import { LabCinematic } from './lab/LabCinematic';
import { FocusMarker } from './FocusMarker';
import { FrameScheduler } from '../../systems/performance/FrameScheduler';

const SHOWCASE_PLAYER: PlayerState = {
  equipment: { hasGoggles: true, hasLabCoat: true, hasGloves: true, hasMask: false, hairTied: true, hasClosedShoes: true },
  inventory: { hasFireExtinguisher: false, isHoldingTrash: false, heldTrashType: null, hasSweeper: false },
  flags: { fireExtinguished: false, trashCount: 0, trash1Picked: false, trash2Picked: false, trash3Picked: false },
};

const Loader = () => {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div data-ui className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
      <div className="flex flex-col items-center gap-2 white-glass p-4 rounded-2xl border border-[var(--line)] shadow-lg">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <div className="text-[var(--primary-600)] font-extrabold font-mono text-sm">
          {progress.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export const LabScene: React.FC = () => {
  const coarse=useCoarsePointer();
  const view = useStore((state) => state.view);
  const cinematic = useStore(s => s.cinematic);
  const settings = useStore((state) => state.settings);
  const showRendererInfo = import.meta.env.DEV
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debug') === '1';

  return (
    <div className="game-input-surface absolute inset-0 bg-[#F7FAFD]">
      {/* 2D FPS Crosshair & Interaction Tooltip Overlay */}
      {!cinematic && <FPSCrosshair />}
      {/* First-person goggles / mask overlay */}
      {!cinematic && <PPEOverlay />}
      {/* Real-time P.A.S.S Extinguisher Gauge */}
      {!cinematic && <ExtinguisherHUD />}

      <Loader />
      <Canvas
        frameloop="demand"
        shadows={settings.graphicsQuality === 'ultra'}
        dpr={initialDpr(settings.graphicsQuality,coarse)}
        gl={{
          antialias: !['potato', 'low'].includes(settings.graphicsQuality)&&!(coarse&&settings.graphicsQuality==='auto'),
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {showRendererInfo && <RendererInfoProbe />}
        <AdaptivePerformance />
        <FrameScheduler />
        <PerspectiveCamera makeDefault position={[-0.2, 2.2, 5.4]} fov={68} />
        
        {view === 'start' ? (
          <OrbitControls 
            enablePan={false}
            minDistance={2}
            maxDistance={8}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={[1.2, 1.05, 0]}
            autoRotate={true}
            autoRotateSpeed={0.42}
          />
        ) : (
          <>
            <FirstPersonController />
            {!cinematic && <Viewmodel />}
          </>
        )}

        {/* Art direction: Sunlit White Lab base & Fog */}
        <color attach="background" args={['#F7FAFD']} />
        <fog attach="fog" args={['#F7FAFD', 25, 80]} />
        
        {/* Fill lighting */}
        <ambientLight intensity={0.95} color="#ffffff" />

        {/* Warm-white "sun" directional light through north windows */}
        <directionalLight 
          castShadow={settings.graphicsQuality === 'ultra'}
          position={[8, 14, -10]} 
          intensity={1.7} 
          color="#FFF5E4"
          shadow-mapSize={settings.graphicsQuality === 'high' ? [1024, 1024] : [512, 512]}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-bias={-0.0005}
        />

        {/* Soft cool fill from south/entry */}
        <directionalLight 
          position={[-10, 8, 10]} 
          intensity={0.6} 
          color="#E6F7FA"
        />

        {/* Overhead soft white LED panel lighting */}
        <pointLight position={[0, 3.5, 0]} intensity={0.9} color="#ffffff" distance={25} />

        <Suspense fallback={null}>
          {/* In Start screen: Player stands idling on the right half facing camera */}
          {view === 'start' && (
            <PlayerModel 
              position={[1.2, 0, 0]}
              rotationY={-0.2}
              isMoving={false}
              player={SHOWCASE_PLAYER}
            />
          )}

          {/* Modular Standard Laboratory Room (Milestone 2) */}
          <LabStandardRoom />
          <FocusMarker />
          {cinematic && <LabCinematic key={cinematic} id={cinematic} />}

          {/* Dynamic 3D Fire & Particle simulation (Milestone 5) */}
          <FireFX />
          <LabAtmosphere />
        </Suspense>

      </Canvas>
    </div>
  );
};
