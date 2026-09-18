import React from 'react';
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Type,
  Image as ImageIcon,
  Heart,
  Square,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { StoryElement, ElementType } from '../../models/LoveStory';
import { soundManager } from '../../audio/SoundManager';

interface LayerPanelProps {
  elements: StoryElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onUpdateElements: (elements: StoryElement[]) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElements,
}) => {
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const getElementIcon = (type: ElementType) => {
    switch (type) {
      case 'heading':
      case 'paragraph':
      case 'quote':
        return <Type size={14} color="var(--theme-primary)" />;
      case 'image':
      case 'polaroid':
        return <ImageIcon size={14} color="#38bdf8" />;
      case 'heart':
        return <Heart size={14} color="#f43f5e" />;
      case 'button':
        return <Square size={14} color="#a855f7" />;
      default:
        return <Sparkles size={14} color="#eab308" />;
    }
  };

  const moveLayer = (id: string, direction: 'up' | 'down' | 'front' | 'back') => {
    soundManager.playClick();
    const list = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const index = list.findIndex((e) => e.id === id);
    if (index === -1) return;

    if (direction === 'up' && index < list.length - 1) {
      const temp = list[index].zIndex;
      list[index].zIndex = list[index + 1].zIndex;
      list[index + 1].zIndex = temp;
    } else if (direction === 'down' && index > 0) {
      const temp = list[index].zIndex;
      list[index].zIndex = list[index - 1].zIndex;
      list[index - 1].zIndex = temp;
    } else if (direction === 'front') {
      const maxZ = Math.max(...list.map((e) => e.zIndex), 0);
      list[index].zIndex = maxZ + 1;
    } else if (direction === 'back') {
      const minZ = Math.min(...list.map((e) => e.zIndex), 0);
      list[index].zIndex = Math.max(0, minZ - 1);
    }

    onUpdateElements([...list]);
  };

  const toggleLock = (id: string) => {
    soundManager.playClick();
    onUpdateElements(
      elements.map((e) => (e.id === id ? { ...e, locked: !e.locked } : e))
    );
  };

  const toggleHidden = (id: string) => {
    soundManager.playClick();
    onUpdateElements(
      elements.map((e) => (e.id === id ? { ...e, hidden: !e.hidden } : e))
    );
  };

  const deleteElement = (id: string) => {
    soundManager.playClick();
    onUpdateElements(elements.filter((e) => e.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={15} color="var(--theme-primary)" />
          <span>Danh Sách Lớp Đối Tượng ({elements.length})</span>
        </h4>

        {selectedElementId && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => moveLayer(selectedElementId, 'up')}
              className="glass-button"
              title="Lên trên 1 bậc"
              style={{ padding: '4px', borderRadius: '6px' }}
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={() => moveLayer(selectedElementId, 'down')}
              className="glass-button"
              title="Xuống dưới 1 bậc"
              style={{ padding: '4px', borderRadius: '6px' }}
            >
              <ArrowDown size={12} />
            </button>
          </div>
        )}
      </div>

      {elements.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--theme-text-secondary)',
            border: '1px dashed var(--theme-glass-border)',
            borderRadius: '12px',
          }}
        >
          Chưa có phần tử tự do nào trên màn này. Nhấp các nút bên dưới để thêm văn bản, ảnh hoặc nút bấm!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sortedElements.map((el) => {
            const isSelected = el.id === selectedElementId;
            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--theme-primary)' : '1px solid var(--theme-glass-border)',
                  background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'rgba(0,0,0,0.2)',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {getElementIcon(el.type)}
                  <span
                    style={{
                      fontWeight: isSelected ? 600 : 400,
                      color: el.hidden ? 'rgba(255,255,255,0.4)' : '#ffffff',
                      textDecoration: el.hidden ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      maxWidth: '120px',
                    }}
                  >
                    {el.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(el.id);
                    }}
                    className="glass-button"
                    title={el.locked ? 'Mở khóa lớp' : 'Khóa lớp'}
                    style={{ padding: '4px', borderRadius: '6px' }}
                  >
                    {el.locked ? <Lock size={12} color="#f59e0b" /> : <Unlock size={12} color="rgba(255,255,255,0.5)" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(el.id);
                    }}
                    className="glass-button"
                    title={el.hidden ? 'Hiện lớp' : 'Ẩn lớp'}
                    style={{ padding: '4px', borderRadius: '6px' }}
                  >
                    {el.hidden ? <EyeOff size={12} color="#ef4444" /> : <Eye size={12} color="rgba(255,255,255,0.5)" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElement(el.id);
                    }}
                    className="glass-button"
                    title="Xóa phần tử"
                    style={{ padding: '4px', borderRadius: '6px', color: '#ef4444' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
