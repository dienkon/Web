import React from 'react';
import {
  EffectComposer,
  Bloom,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useQualityStore, getQualitySettings } from '../quality';

export const PostFX = React.memo(function PostFX() {
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const settings = getQualitySettings(effectiveTier);

  // If low tier or postprocessing disabled, skip composer and rely on native renderer tone mapping
  if (!settings.usePostFX) {
    return null;
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {settings.useN8AO && (
        <N8AO aoRadius={0.6} intensity={1.4} distanceFalloff={1} />
      )}
      {settings.useBloom && (
        <Bloom
          mipmapBlur
          luminanceThreshold={1.0}
          luminanceSmoothing={0.2}
          intensity={0.55}
          radius={0.7}
        />
      )}
      {settings.useSMAA && <SMAA />}
      <ToneMapping mode={ToneMappingMode.AGX} />
      {settings.useVignette && <Vignette offset={0.25} darkness={0.35} />}
    </EffectComposer>
  );
});
