import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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

const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 white-glass p-4 rounded-2xl border border-[var(--line)] shadow-lg">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <div className="text-[var(--primary-600)] font-extrabold font-mono text-sm">
          {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  );
};

export const LabScene: React.FC = () => {
  const view = useStore((state) => state.view);
  const settings = useStore((state) => state.settings);

  return (
    <div className="absolute inset-0 bg-[#F7FAFD]">
      {/* 2D FPS Crosshair & Interaction Tooltip Overlay */}
      <FPSCrosshair />
      {/* First-person goggles / mask overlay */}
      <PPEOverlay />
      {/* Real-time P.A.S.S Extinguisher Gauge */}
      <ExtinguisherHUD />

      <Canvas
        shadows={settings.graphicsQuality !== 'low' ? 'percentage' : false}
        dpr={settings.graphicsQuality === 'low' ? 1 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)}
        gl={{
          antialias: settings.graphicsQuality !== 'low',
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 2.5, 6]} fov={72} />
        
        {view === 'start' ? (
          <OrbitControls 
            enablePan={false}
            minDistance={2}
            maxDistance={8}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={[1.2, 1.05, 0]}
            autoRotate={true}
            autoRotateSpeed={0.8}
          />
        ) : (
          <>
            <FirstPersonController />
            <Viewmodel />
          </>
        )}

        {/* Art direction: Sunlit White Lab base & Fog */}
        <color attach="background" args={['#F7FAFD']} />
        <fog attach="fog" args={['#F7FAFD', 25, 80]} />
        
        {/* Fill lighting */}
        <ambientLight intensity={0.95} color="#ffffff" />

        {/* Warm-white "sun" directional light through north windows */}
        <directionalLight 
          castShadow={settings.graphicsQuality !== 'low'}
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

        <Suspense fallback={<Loader />}>
          {/* In Start screen: Player stands idling on the right half facing camera */}
          {view === 'start' && (
            <PlayerModel 
              position={[1.2, 0, 0]}
              rotationY={Math.PI * 0.85}
              isMoving={false}
            />
          )}

          {/* Modular Standard Laboratory Room (Milestone 2) */}
          <LabStandardRoom />

          {/* Dynamic 3D Fire & Particle simulation (Milestone 5) */}
          <FireFX />
        </Suspense>

        {settings.graphicsQuality !== 'low' && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.95} intensity={0.35} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
};
