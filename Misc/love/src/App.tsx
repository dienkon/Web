import React, { useState, useEffect } from 'react';
import { LoveStory } from './models/LoveStory';
import { DEMO_STORY } from './data/demoStory';
import { StoryStorage } from './services/StoryStorage';
import { THEME_PRESETS } from './themes/themePresets';
import { SceneRenderer } from './components/SceneRenderer';
import { StoryEditor } from './editor/StoryEditor';
import { ParticleCanvas } from './components/ParticleCanvas';
import { CustomCursor } from './components/CustomCursor';
import { soundManager } from './audio/SoundManager';

export function App() {
  const [view, setView] = useState<'story' | 'studio'>('story');
  const [currentStory, setCurrentStory] = useState<LoveStory>(DEMO_STORY);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const search = window.location.search;

      // 1. Check for standalone shared token ?d=... or #...d=...
      const urlParams = new URLSearchParams(search || hash.split('?')[1]);
      const token = urlParams.get('d');
      if (token) {
        const decoded = StoryStorage.decodeStoryFromShare(token);
        if (decoded) {
          setCurrentStory(decoded);
          setView('story');
          return;
        }
      }

      // 2. Check for route in hash
      if (hash.startsWith('#/love/') || hash.startsWith('#love/')) {
        const storyId = hash.replace(/^#(?:[/])?love\//, '').split('?')[0];
        const loaded = StoryStorage.getStory(storyId);
        if (loaded) {
          setCurrentStory(loaded);
        } else {
          setCurrentStory(DEMO_STORY);
        }
        setView('story');
      } else if (hash === '#studio' || hash === '#/studio') {
        setView('studio');
      } else {
        // Default root: show shared story experience with Studio button
        setView('story');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update theme CSS tokens when active story's theme changes
  useEffect(() => {
    const theme = THEME_PRESETS[currentStory.theme.preset] || THEME_PRESETS.midnight;
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.documentElement.style.setProperty('--theme-glow', theme.glow);
    document.documentElement.style.setProperty('--theme-bg', theme.background);
    document.documentElement.style.setProperty('--theme-glass-bg', theme.glassBg);
    document.documentElement.style.setProperty('--theme-glass-border', theme.glassBorder);
    document.documentElement.style.setProperty('--theme-card-bg', theme.cardBg);
    document.documentElement.style.setProperty('--theme-text-primary', theme.textPrimary);
    document.documentElement.style.setProperty('--theme-text-secondary', theme.textSecondary);
    document.documentElement.style.setProperty('--theme-heart', theme.heartColor);
  }, [currentStory.theme.preset]);

  const activeTheme = THEME_PRESETS[currentStory.theme.preset] || THEME_PRESETS.midnight;

  return (
    <div style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Desktop Custom Cursor */}
      <CustomCursor />

      {/* Layered Dynamic Background Orbs */}
      <div
        className="ambient-bg-orb"
        style={{
          width: '500px',
          height: '500px',
          background: activeTheme.blobColors[0],
          top: '-100px',
          left: '10%',
        }}
      />
      <div
        className="ambient-bg-orb"
        style={{
          width: '600px',
          height: '600px',
          background: activeTheme.blobColors[1],
          bottom: '-100px',
          right: '5%',
          animationDelay: '-4s',
        }}
      />
      <div
        className="ambient-bg-orb"
        style={{
          width: '400px',
          height: '400px',
          background: activeTheme.blobColors[2],
          top: '40%',
          right: '25%',
          animationDelay: '-8s',
        }}
      />

      {/* High-Performance Canvas Particle & Heart Engine */}
      <ParticleCanvas
        preset={currentStory.settings.particlePreset || activeTheme.particlePreset}
        primaryColor={activeTheme.primary}
        accentColor={activeTheme.accent}
        heartLayers={currentStory.heartLayers}
        enabled={currentStory.settings.particles}
      />

      {/* Views */}
      {view === 'story' ? (
        <SceneRenderer
          story={currentStory}
          onGoToStudio={() => {
            soundManager.playTransition();
            window.location.hash = '#studio';
            setView('studio');
          }}
          showStudioLink={true}
        />
      ) : (
        <StoryEditor
          initialStory={currentStory}
          onOpenLiveStory={(updatedStory) => {
            soundManager.playTransition();
            setCurrentStory(updatedStory);
            window.location.hash = `#/love/${updatedStory.id}`;
            setView('story');
          }}
        />
      )}
    </div>
  );
}

export default App;
