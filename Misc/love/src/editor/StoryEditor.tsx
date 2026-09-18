import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  Share2,
  RotateCcw,
  Upload,
  Download,
  Smartphone,
  Monitor,
  Eye,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Music,
  Image as ImageIcon,
  Check,
  Palette,
  Settings,
  ListOrdered,
  Layers,
  Sliders,
  Sun,
  Moon,
  Clock,
  Film,
  FolderOpen,
} from 'lucide-react';
import {
  LoveStory,
  SceneConfig,
  StoryElement,
  HeartLayerConfig,
  SceneTransitionConfig,
} from '../models/LoveStory';
import { THEME_PRESETS } from '../themes/themePresets';
import { StoryStorage } from '../services/StoryStorage';
import { firestoreService } from '../services/FirestoreService';
import { DEMO_STORY } from '../data/demoStory';
import { SceneRenderer } from '../components/SceneRenderer';
import { ShareModal } from '../components/ShareModal';
import { SceneCanvas } from './canvas/SceneCanvas';
import { LayerPanel } from './layers/LayerPanel';
import { VisualTimeline } from './timeline/VisualTimeline';
import { HeartLayerEditor } from './heart/HeartLayerEditor';
import { TransitionSelector } from './transitions/TransitionSelector';
import { PropertiesPanel } from './properties/PropertiesPanel';
import { MediaLibraryModal } from './media/MediaLibraryModal';
import { soundManager } from '../audio/SoundManager';

interface StoryEditorProps {
  initialStory?: LoveStory;
  onOpenLiveStory: (story: LoveStory) => void;
}

export const StoryEditor: React.FC<StoryEditorProps> = ({
  initialStory,
  onOpenLiveStory,
}) => {
  const [story, setStory] = useState<LoveStory>(() => {
    return initialStory || StoryStorage.getDraft() || DEMO_STORY;
  });

  const [history, setHistory] = useState<LoveStory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(story.scenes[0]?.id || 'sc-0');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'scenes' | 'layers' | 'hearts' | 'transitions' | 'settings'>('scenes');
  const [rightTab, setRightTab] = useState<'properties' | 'preview'>('preview');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [clipboardElement, setClipboardElement] = useState<StoryElement | null>(null);

  const selectedScene = story.scenes.find((s) => s.id === selectedSceneId) || story.scenes[0];
  const selectedElement = selectedScene.elements.find((e) => e.id === selectedElementId) || null;

  // Auto-save with Firestore & LocalStorage debounce
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        StoryStorage.saveDraft(story);
        await firestoreService.saveStory(story);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [story]);

  // Sync theme colors with root CSS
  useEffect(() => {
    const isLight = story.settings.studioThemeMode === 'light';
    const theme = isLight ? THEME_PRESETS.pureWhite : (THEME_PRESETS[story.theme.preset] || THEME_PRESETS.midnight);
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
  }, [story.theme.preset, story.settings.studioThemeMode]);

  // Undo / Redo history tracking
  const updateStory = (updater: (prev: LoveStory) => LoveStory) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), story]);
    setHistoryIndex((prev) => prev + 1);
    setStory(updater);
  };

  const handleUndo = () => {
    if (historyIndex >= 0) {
      soundManager.playClick();
      setStory(history[historyIndex]);
      setHistoryIndex((prev) => prev - 1);
    }
  };

  // Keyboard shortcuts (Undo/Redo, Copy/Paste, Delete)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedElement) {
          e.preventDefault();
          soundManager.playClick();
          setClipboardElement(selectedElement);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardElement) {
          e.preventDefault();
          soundManager.playBurst();
          const cloned: StoryElement = {
            ...clipboardElement,
            id: 'el-' + Date.now(),
            name: `${clipboardElement.name} (Bản sao)`,
            x: clipboardElement.x + 20,
            y: clipboardElement.y + 20,
          };
          updateSceneElements([...selectedScene.elements, cloned]);
          setSelectedElementId(cloned.id);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [historyIndex, history, selectedElement, clipboardElement, selectedScene]);

  // Update elements in currently active scene
  const updateSceneElements = (newElements: StoryElement[]) => {
    updateStory((p) => ({
      ...p,
      scenes: p.scenes.map((s) =>
        s.id === selectedSceneId ? { ...s, elements: newElements } : s
      ),
    }));
  };

  // Update heart layers in currently active scene
  const updateSceneHeartLayers = (newLayers: HeartLayerConfig[]) => {
    updateStory((p) => ({
      ...p,
      scenes: p.scenes.map((s) =>
        s.id === selectedSceneId ? { ...s, heartLayers: newLayers } : s
      ),
    }));
  };

  // Reorder scenes
  const moveScene = (idx: number, direction: 'up' | 'down') => {
    soundManager.playClick();
    updateStory((prev) => {
      const list = [...prev.scenes];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= list.length) return prev;
      const temp = list[idx];
      list[idx] = list[target];
      list[target] = temp;
      list.forEach((s, i) => (s.order = i));
      return { ...prev, scenes: list };
    });
  };

  const handleAddScene = () => {
    soundManager.playBurst();
    const newId = 'sc-' + Date.now();
    const newScene: SceneConfig = {
      id: newId,
      type: 'memories',
      title: `Cảnh Mới ${story.scenes.length + 1}`,
      enabled: true,
      order: story.scenes.length,
      duration: 8,
      elements: [],
      heartLayers: story.heartLayers,
      transitionIn: { type: 'fade', duration: 0.6, sound: true, particleDensity: 'medium' },
      transitionOut: { type: 'fade', duration: 0.6, sound: true, particleDensity: 'medium' },
    };
    updateStory((p) => ({ ...p, scenes: [...p.scenes, newScene] }));
    setSelectedSceneId(newId);
  };

  const handleDuplicateScene = (sc: SceneConfig) => {
    soundManager.playBurst();
    const clonedId = 'sc-' + Date.now();
    const cloned: SceneConfig = {
      ...JSON.parse(JSON.stringify(sc)),
      id: clonedId,
      title: `${sc.title} (Bản sao)`,
      order: sc.order + 1,
    };
    updateStory((p) => {
      const list = [...p.scenes];
      const index = list.findIndex((s) => s.id === sc.id);
      list.splice(index + 1, 0, cloned);
      list.forEach((s, i) => (s.order = i));
      return { ...p, scenes: list };
    });
    setSelectedSceneId(clonedId);
  };

  const handleDeleteScene = (id: string) => {
    if (story.scenes.length <= 1) {
      alert('Không thể xóa cảnh duy nhất còn lại.');
      return;
    }
    soundManager.playClick();
    updateStory((p) => ({
      ...p,
      scenes: p.scenes.filter((s) => s.id !== id),
    }));
    setSelectedSceneId(story.scenes.find((s) => s.id !== id)?.id || '');
  };

  const isLightMode = story.settings.studioThemeMode === 'light';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: isLightMode ? '#f8fafc' : 'var(--theme-bg)',
        color: isLightMode ? '#0f172a' : 'var(--theme-text-primary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Studio Global Top Header */}
      <header
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          zIndex: 60,
          borderBottom: isLightMode ? '1px solid #e2e8f0' : '1px solid var(--theme-glass-border)',
          background: isLightMode ? '#ffffff' : 'var(--theme-glass-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px var(--theme-glow)',
            }}
          >
            <Heart size={18} fill="#ffffff" color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              Chuyện Của Hai Chúng Ta — Studio
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: saveStatus === 'saved' ? '#10b981' : saveStatus === 'saving' ? '#f59e0b' : '#ef4444',
                  boxShadow: saveStatus === 'saved' ? '0 0 6px #10b981' : 'none',
                }}
              />
              <span style={{ color: isLightMode ? '#64748b' : 'var(--theme-text-secondary)' }}>
                {saveStatus === 'saved'
                  ? firestoreService.getIsConfigured()
                    ? 'Đã đồng bộ Firestore'
                    : 'Đã lưu bản thảo nội bộ'
                  : saveStatus === 'saving'
                  ? 'Đang lưu…'
                  : 'Lưu thất bại'}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Light / Dark Mode Switcher */}
          <button
            onClick={() => {
              soundManager.playClick();
              updateStory((p) => ({
                ...p,
                settings: {
                  ...p.settings,
                  studioThemeMode: isLightMode ? 'dark' : 'light',
                },
              }));
            }}
            className="glass-button"
            title={isLightMode ? 'Chuyển sang chế độ Tối' : 'Chuyển sang chế độ Sáng'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            {isLightMode ? <Moon size={14} /> : <Sun size={14} color="#facc15" />}
            <span className="hidden sm:inline">{isLightMode ? 'Tối' : 'Sáng'}</span>
          </button>

          {/* Media Library */}
          <button
            onClick={() => setShowMediaLibrary(true)}
            className="glass-button"
            title="Thư viện ảnh Cloudinary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <FolderOpen size={14} />
            <span className="hidden md:inline">Thư Viện Ảnh</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className="glass-button"
            title="Hoàn tác (Ctrl+Z)"
            style={{ padding: '6px 10px', borderRadius: '8px', opacity: historyIndex < 0 ? 0.4 : 1 }}
          >
            <RotateCcw size={13} />
          </button>

          <button
            onClick={() => onOpenLiveStory(story)}
            className="glass-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <Eye size={14} />
            <span>Xem Phim</span>
          </button>

          <button
            onClick={() => {
              soundManager.playBurst();
              setShowShareModal(true);
            }}
            className="btn-vibrant cursor-heart"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 18px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <Share2 size={14} />
            <span>Chia Sẻ Cho Crush ❤️</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* LEFT DOCK: Scene Strip & Visual Layers & Heart Emitters */}
        <aside
          className="glass-panel"
          style={{
            width: '320px',
            borderRight: isLightMode ? '1px solid #e2e8f0' : '1px solid var(--theme-glass-border)',
            background: isLightMode ? '#ffffff' : 'var(--theme-glass-bg)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: isLightMode ? '1px solid #e2e8f0' : '1px solid var(--theme-glass-border)',
            }}
          >
            <button
              onClick={() => setLeftTab('scenes')}
              style={{
                flex: 1,
                padding: '10px 4px',
                border: 'none',
                background: leftTab === 'scenes' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: leftTab === 'scenes' ? 'var(--theme-primary)' : isLightMode ? '#64748b' : 'var(--theme-text-secondary)',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Kịch Bản
            </button>
            <button
              onClick={() => setLeftTab('layers')}
              style={{
                flex: 1,
                padding: '10px 4px',
                border: 'none',
                background: leftTab === 'layers' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: leftTab === 'layers' ? 'var(--theme-primary)' : isLightMode ? '#64748b' : 'var(--theme-text-secondary)',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Lớp Đối Tượng
            </button>
            <button
              onClick={() => setLeftTab('hearts')}
              style={{
                flex: 1,
                padding: '10px 4px',
                border: 'none',
                background: leftTab === 'hearts' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: leftTab === 'hearts' ? 'var(--theme-primary)' : isLightMode ? '#64748b' : 'var(--theme-text-secondary)',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Tầng Tim
            </button>
            <button
              onClick={() => setLeftTab('transitions')}
              style={{
                flex: 1,
                padding: '10px 4px',
                border: 'none',
                background: leftTab === 'transitions' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: leftTab === 'transitions' ? 'var(--theme-primary)' : isLightMode ? '#64748b' : 'var(--theme-text-secondary)',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Chuyển Cảnh
            </button>
            <button
              onClick={() => setLeftTab('settings')}
              style={{
                flex: 1,
                padding: '10px 4px',
                border: 'none',
                background: leftTab === 'settings' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: leftTab === 'settings' ? 'var(--theme-primary)' : isLightMode ? '#64748b' : 'var(--theme-text-secondary)',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Theme
            </button>
          </div>

          {/* Tab Contents */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* 1. SCENES TAB */}
            {leftTab === 'scenes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>
                    Danh Sách Cảnh ({story.scenes.length})
                  </span>
                  <button
                    onClick={handleAddScene}
                    className="glass-button"
                    style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} />
                    <span>Thêm Cảnh</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {story.scenes.map((sc, idx) => {
                    const isSelected = sc.id === selectedSceneId;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => {
                          soundManager.playClick();
                          setSelectedSceneId(sc.id);
                          setSelectedElementId(null);
                        }}
                        className="glass-card"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--theme-primary)' : isLightMode ? '1px solid #e2e8f0' : '1px solid var(--theme-glass-border)',
                          background: isSelected ? 'rgba(244, 63, 94, 0.15)' : isLightMode ? '#ffffff' : 'rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 0 15px var(--theme-glow)' : 'none',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 500 }}>
                            {idx + 1}. {sc.title}
                          </div>
                          <div style={{ fontSize: '10px', color: isLightMode ? '#64748b' : 'var(--theme-text-secondary)' }}>
                            {sc.elements.length} phần tử • {sc.duration || 6}s
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateScene(sc);
                            }}
                            className="glass-button"
                            title="Nhân bản cảnh"
                            style={{ padding: '4px', borderRadius: '4px' }}
                          >
                            <Copy size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveScene(idx, 'up');
                            }}
                            disabled={idx === 0}
                            className="glass-button"
                            style={{ padding: '4px', borderRadius: '4px', opacity: idx === 0 ? 0.3 : 1 }}
                          >
                            <ChevronUp size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveScene(idx, 'down');
                            }}
                            disabled={idx === story.scenes.length - 1}
                            className="glass-button"
                            style={{ padding: '4px', borderRadius: '4px', opacity: idx === story.scenes.length - 1 ? 0.3 : 1 }}
                          >
                            <ChevronDown size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(sc.id);
                            }}
                            className="glass-button"
                            style={{ padding: '4px', borderRadius: '4px', color: '#ef4444' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. LAYERS TAB */}
            {leftTab === 'layers' && (
              <LayerPanel
                elements={selectedScene.elements}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElements={updateSceneElements}
              />
            )}

            {/* 3. HEARTS TAB */}
            {leftTab === 'hearts' && (
              <HeartLayerEditor
                layers={selectedScene.heartLayers || story.heartLayers}
                onChange={updateSceneHeartLayers}
              />
            )}

            {/* 4. TRANSITIONS TAB */}
            {leftTab === 'transitions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <TransitionSelector
                  label="Hiệu Ứng Vào Cảnh (Transition In)"
                  config={selectedScene.transitionIn}
                  onChange={(tIn) =>
                    updateStory((p) => ({
                      ...p,
                      scenes: p.scenes.map((s) => (s.id === selectedSceneId ? { ...s, transitionIn: tIn } : s)),
                    }))
                  }
                />
                <TransitionSelector
                  label="Hiệu Ứng Ra Cảnh (Transition Out)"
                  config={selectedScene.transitionOut}
                  onChange={(tOut) =>
                    updateStory((p) => ({
                      ...p,
                      scenes: p.scenes.map((s) => (s.id === selectedSceneId ? { ...s, transitionOut: tOut } : s)),
                    }))
                  }
                />
              </div>
            )}

            {/* 5. THEMES & SETTINGS TAB */}
            {leftTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
                    Chủ Đề Không Gian (Themes)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {Object.values(THEME_PRESETS).map((t) => {
                      const isSelected = story.theme.preset === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            soundManager.playClick();
                            updateStory((p) => ({ ...p, theme: { ...p.theme, preset: t.id as any } }));
                          }}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            background: t.background,
                            border: isSelected ? `2px solid ${t.primary}` : '1px solid rgba(0,0,0,0.1)',
                            color: t.id === 'pureWhite' ? '#0f172a' : '#ffffff',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.primary, margin: '0 auto 4px auto' }} />
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
                    Thông Tin Nhân Vật
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                    <input
                      type="text"
                      placeholder="Tên người gửi"
                      value={story.sender.name}
                      onChange={(e) => updateStory((p) => ({ ...p, sender: { ...p.sender, name: e.target.value } }))}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--theme-glass-border)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    />
                    <input
                      type="text"
                      placeholder="Tên người nhận"
                      value={story.receiver.name}
                      onChange={(e) => updateStory((p) => ({ ...p, receiver: { ...p.receiver, name: e.target.value } }))}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--theme-glass-border)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    />
                    <input
                      type="text"
                      placeholder="Biệt danh ngọt ngào"
                      value={story.receiver.nickname || ''}
                      onChange={(e) => updateStory((p) => ({ ...p, receiver: { ...p.receiver, nickname: e.target.value } }))}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--theme-glass-border)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER STAGE: Canva-Style Visual Canvas & Video Timeline */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px',
            alignItems: 'center',
            gap: '16px',
            background: isLightMode ? '#f1f5f9' : 'rgba(0,0,0,0.2)',
          }}
        >
          {/* Visual Scene Canvas */}
          <SceneCanvas
            scene={selectedScene}
            elements={selectedScene.elements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElements={updateSceneElements}
            onAddElement={(newEl) => updateSceneElements([...selectedScene.elements, newEl])}
          />

          {/* Visual Effect Timeline Bar */}
          <div style={{ width: '100%', maxWidth: '840px' }}>
            <VisualTimeline
              elements={selectedScene.elements}
              totalDuration={selectedScene.duration || 6}
              onUpdateElements={updateSceneElements}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
            />
          </div>
        </main>

        {/* RIGHT DOCK: Properties Inspector / Live Preview Frame */}
        <aside
          className="glass-panel"
          style={{
            width: '380px',
            borderLeft: isLightMode ? '1px solid #e2e8f0' : '1px solid var(--theme-glass-border)',
            background: isLightMode ? '#ffffff' : 'var(--theme-glass-bg)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Switcher Tab */}
          <div style={{ display: 'flex', borderBottom: isLightMode ? '1px solid #e2e8f0' : '1px solid var(--theme-glass-border)' }}>
            <button
              onClick={() => setRightTab('properties')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: rightTab === 'properties' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: rightTab === 'properties' ? 'var(--theme-primary)' : isLightMode ? '#64748b' : 'var(--theme-text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Sliders size={14} />
              <span>Thuộc Tính</span>
            </button>
            <button
              onClick={() => setRightTab('preview')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: rightTab === 'preview' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: rightTab === 'preview' ? 'var(--theme-primary)' : isLightMode ? '#64748b' : 'var(--theme-text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Eye size={14} />
              <span>Xem Trước</span>
            </button>
          </div>

          <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {rightTab === 'properties' ? (
              <PropertiesPanel
                element={selectedElement}
                onUpdateElement={(updated) =>
                  updateSceneElements(selectedScene.elements.map((e) => (e.id === updated.id ? updated : e)))
                }
                onDeleteElement={(id) => {
                  updateSceneElements(selectedScene.elements.filter((e) => e.id !== id));
                  setSelectedElementId(null);
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: isLightMode ? '#64748b' : 'var(--theme-text-secondary)' }}>
                    Trải Nghiệm Thực Tế
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className="glass-button"
                      style={{ padding: '4px 8px', borderRadius: '6px', background: previewMode === 'mobile' ? 'var(--theme-primary)' : 'transparent' }}
                    >
                      <Smartphone size={13} />
                    </button>
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className="glass-button"
                      style={{ padding: '4px 8px', borderRadius: '6px', background: previewMode === 'desktop' ? 'var(--theme-primary)' : 'transparent' }}
                    >
                      <Monitor size={13} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    width: previewMode === 'mobile' ? '300px' : '100%',
                    height: '560px',
                    borderRadius: previewMode === 'mobile' ? '32px' : '16px',
                    border: previewMode === 'mobile' ? '8px solid #1e293b' : '1px solid var(--theme-glass-border)',
                    overflow: 'hidden',
                    position: 'relative',
                    background: 'var(--theme-bg)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  }}
                >
                  <SceneRenderer story={story} showStudioLink={false} />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <MediaLibraryModal
          onSelectImage={(url) => {
            if (selectedElement) {
              updateSceneElements(
                selectedScene.elements.map((e) =>
                  e.id === selectedElement.id ? { ...e, content: url } : e
                )
              );
            }
          }}
          onClose={() => setShowMediaLibrary(false)}
        />
      )}

      {/* Share & QR Modal */}
      {showShareModal && (
        <ShareModal
          story={story}
          onClose={() => setShowShareModal(false)}
          onOpenStory={() => {
            setShowShareModal(false);
            onOpenLiveStory(story);
          }}
        />
      )}
    </div>
  );
};
