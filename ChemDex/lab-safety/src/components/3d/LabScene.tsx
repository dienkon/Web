import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LabEnvironment } from './LabEnvironment';
import { useStore } from '../../store/useStore';
import { ThirdPersonController } from './ThirdPersonController';
import { PlayerModel } from './PlayerModel';

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
      <Canvas
        shadows={settings.graphicsQuality !== 'low' ? 'percentage' : false}
        dpr={settings.graphicsQuality === 'low' ? 1 : [1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 2.5, 6]} fov={55} />
        
        {view === 'start' ? (
          <OrbitControls 
            enablePan={false}
            minDistance={2}
            maxDistance={8}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={[0, 1.2, 0]}
            autoRotate={true}
            autoRotateSpeed={0.8}
          />
        ) : (
          <ThirdPersonController />
        )}

        {/* Art direction: Sunlit White Lab base & Fog */}
        <color attach="background" args={['#F7FAFD']} />
        <fog attach="fog" args={['#F7FAFD', 18, 60]} />
        
        {/* Fill lighting */}
        <ambientLight intensity={0.9} color="#ffffff" />

        {/* Warm-white "sun" directional light through north windows */}
        <directionalLight 
          castShadow={settings.graphicsQuality !== 'low'}
          position={[6, 12, -8]} 
          intensity={1.6} 
          color="#FFF4E0"
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0005}
        />

        {/* Soft cool fill from south/entry */}
        <directionalLight 
          position={[-8, 6, 8]} 
          intensity={0.5} 
          color="#E6F7FA"
        />

        {/* Overhead soft white LED panel lighting */}
        <pointLight position={[0, 6, 0]} intensity={0.6} color="#ffffff" distance={15} />

        <Suspense fallback={<Loader />}>
          {/* In Start screen: Player stands idling in the foreground facing camera */}
          {view === 'start' && (
            <PlayerModel 
              position={[0, 0, 0]}
              rotationY={Math.PI}
              isMoving={false}
            />
          )}

          {/* In Game mode: Player is controlled by ThirdPersonController via playerCoords */}
          {view === 'game' && (
            <PlayerModel />
          )}

          <LabEnvironment />
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
