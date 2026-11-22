import React from 'react';
import { useQualityStore, getQualitySettings } from '../quality';

const PostFXComposer = React.lazy(() => import('./PostFXComposer').catch(error => {
  console.warn('Could not load optional 3D post-processing', error);
  return { default: () => null };
}));

export const PostFX = React.memo(function PostFX() {
  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const settings = getQualitySettings(effectiveTier);
  if (!settings.usePostFX) return null;

  return <React.Suspense fallback={null}>
    <PostFXComposer settings={settings} />
  </React.Suspense>;
});
