import React from 'react';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { QualitySettings } from '../quality';

export default function PostFXComposer({ settings }: { settings: QualitySettings }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {settings.useN8AO && <N8AO aoRadius={0.6} intensity={1.4} distanceFalloff={1} />}
      {settings.useBloom && (
        <Bloom mipmapBlur luminanceThreshold={1.15} luminanceSmoothing={0.28} intensity={0.42} radius={0.55} />
      )}
      {settings.useSMAA && <SMAA />}
      <ToneMapping mode={ToneMappingMode.AGX} />
      {settings.useVignette && <Vignette offset={0.25} darkness={0.35} />}
    </EffectComposer>
  );
}
