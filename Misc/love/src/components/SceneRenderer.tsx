import React, { useState, useEffect } from 'react';
import { LoveStory, SceneConfig } from '../models/LoveStory';
import { Scene0Intro } from '../scenes/Scene0Intro';
import { Scene1Greeting } from '../scenes/Scene1Greeting';
import { Scene2Reasons } from '../scenes/Scene2Reasons';
import { Scene3Memories } from '../scenes/Scene3Memories';
import { Scene4SmallThings } from '../scenes/Scene4SmallThings';
import { Scene5Music } from '../scenes/Scene5Music';
import { SceneMiniGame1 } from '../scenes/SceneMiniGame1';
import { SceneMiniGame2 } from '../scenes/SceneMiniGame2';
import { Scene6Letter } from '../scenes/Scene6Letter';
import { Scene7Climax } from '../scenes/Scene7Climax';
import { Scene8FinalQuestion } from '../scenes/Scene8FinalQuestion';
import { StoryControls } from './StoryControls';
import { soundManager } from '../audio/SoundManager';
import { X, Sparkles } from 'lucide-react';

interface SceneRendererProps {
  story: LoveStory;
  onGoToStudio?: () => void;
  showStudioLink?: boolean;
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  story,
  onGoToStudio,
  showStudioLink = true,
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showEasterEggModal, setShowEasterEggModal] = useState(false);

  const enabledScenes: SceneConfig[] = story.scenes
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const totalScenes = enabledScenes.length;
  const currentSceneConfig = enabledScenes[currentSceneIndex] || enabledScenes[0];

  const handleNext = () => {
    if (currentSceneIndex < totalScenes - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    soundManager.playTransition();
    setCurrentSceneIndex(0);
  };

  // Keyboard navigation & Easter egg combo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (currentSceneIndex > 0) {
          setCurrentSceneIndex((prev) => prev - 1);
        }
      } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
        // Ctrl+L secret shortcut
        setShowEasterEggModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSceneIndex, totalScenes]);

  const renderCurrentScene = () => {
    if (!currentSceneConfig) return null;

    switch (currentSceneConfig.type) {
      case 'intro':
        return <Scene0Intro story={story} onNext={handleNext} />;
      case 'greeting':
        return <Scene1Greeting story={story} onNext={handleNext} />;
      case 'reasons':
        return <Scene2Reasons story={story} onNext={handleNext} />;
      case 'memories':
        return <Scene3Memories story={story} onNext={handleNext} />;
      case 'smallThings':
        return <Scene4SmallThings story={story} onNext={handleNext} />;
      case 'music':
        return <Scene5Music story={story} onNext={handleNext} />;
      case 'miniGame1':
        return <SceneMiniGame1 story={story} onNext={handleNext} />;
      case 'miniGame2':
        return <SceneMiniGame2 story={story} onNext={handleNext} />;
      case 'letter':
        return <Scene6Letter story={story} onNext={handleNext} />;
      case 'climax':
        return <Scene7Climax story={story} onNext={handleNext} />;
      case 'finalQuestion':
        return <Scene8FinalQuestion story={story} onRestart={handleRestart} />;
      default:
        return <Scene0Intro story={story} onNext={handleNext} />;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <StoryControls
        currentScene={currentSceneIndex}
        totalScenes={totalScenes}
        onGoToStudio={onGoToStudio}
        showStudioLink={showStudioLink}
        onTriggerEasterEgg={() => setShowEasterEggModal(true)}
      />

      {/* Main Scene Container */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        {renderCurrentScene()}
      </div>

      {/* Easter Egg Modal */}
      {showEasterEggModal && (
        <div
          onClick={() => setShowEasterEggModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(16px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'inkReveal 0.3s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{
              padding: '36px',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              textAlign: 'center',
              border: '2px solid var(--theme-primary)',
              boxShadow: '0 0 40px var(--theme-glow)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowEasterEggModal(false)}
              className="glass-button"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <Sparkles size={30} color="#ffffff" />
            </div>

            <h3
              className="font-display"
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '12px',
              }}
            >
              Hộp Thư Bí Mật Đã Mở Khóa! ✨
            </h3>

            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--theme-text-secondary)',
                lineHeight: 1.7,
                marginBottom: '24px',
              }}
            >
              {story.endings.secretNote ||
                `Lời nhắn riêng: "${story.sender.name} đã dành rất nhiều tâm huyết để viết nên từng câu chữ này, chỉ mong một lần được nhìn thấy nụ cười hạnh phúc của ${story.receiver.name}!"`}
            </p>

            <button
              onClick={() => setShowEasterEggModal(false)}
              className="btn-vibrant"
              style={{
                padding: '12px 32px',
                borderRadius: '999px',
                fontSize: '0.95rem',
              }}
            >
              Tiếp tục thưởng thức
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
