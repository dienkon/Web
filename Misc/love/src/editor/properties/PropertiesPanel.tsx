import React from 'react';
import { Sliders, Sparkles, Upload, Type, Eye, Trash2 } from 'lucide-react';
import { StoryElement, EntranceAnimation, LoopAnimation } from '../../models/LoveStory';
import { cloudinaryService } from '../../services/CloudinaryService';
import { soundManager } from '../../audio/SoundManager';

interface PropertiesPanelProps {
  element: StoryElement | null;
  onUpdateElement: (updated: StoryElement) => void;
  onDeleteElement: (id: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  element,
  onUpdateElement,
  onDeleteElement,
}) => {
  if (!element) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--theme-text-secondary)',
          border: '1px dashed var(--theme-glass-border)',
          borderRadius: '16px',
        }}
      >
        <Sliders size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
        Chọn một đối tượng trên Canvas để tùy chỉnh kích thước, màu sắc, phông chữ và hiệu ứng chuyển động.
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        soundManager.playClick();
        const uploaded = await cloudinaryService.uploadImage(file);
        onUpdateElement({
          ...element,
          content: uploaded.secureUrl,
        });
        soundManager.playBurst();
      } catch (err) {
        alert('Lỗi tải ảnh: ' + (err as Error).message);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={15} color="var(--theme-primary)" />
          <span>Thuộc Tính Phần Tử</span>
        </h4>
        <button
          onClick={() => {
            soundManager.playClick();
            onDeleteElement(element.id);
          }}
          className="glass-button"
          title="Xóa phần tử"
          style={{ padding: '4px 8px', borderRadius: '6px', color: '#ef4444' }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Basic Name & Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <label style={{ color: 'var(--theme-text-secondary)', marginBottom: '3px', display: 'block' }}>
            Tên lớp
          </label>
          <input
            type="text"
            value={element.name}
            onChange={(e) => onUpdateElement({ ...element, name: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '12px' }}
          />
        </div>

        <div>
          <label style={{ color: 'var(--theme-text-secondary)', marginBottom: '3px', display: 'block' }}>
            Nội dung hiển thị
          </label>
          {element.type === 'heading' || element.type === 'paragraph' || element.type === 'quote' || element.type === 'button' ? (
            <textarea
              rows={2}
              value={element.content}
              onChange={(e) => onUpdateElement({ ...element, content: e.target.value })}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '12px' }}
            />
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={element.content}
                onChange={(e) => onUpdateElement({ ...element, content: e.target.value })}
                placeholder="URL hình ảnh"
                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '12px' }}
              />
              <label
                className="glass-button"
                title="Tải ảnh lên Cloudinary"
                style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Upload size={12} />
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Geometry: X, Y, Width, Height, Rotation */}
      <div>
        <h5 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
          Tọa Độ & Kích Thước
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>X (px)</label>
            <input
              type="number"
              value={element.x}
              onChange={(e) => onUpdateElement({ ...element, x: Number(e.target.value) })}
              style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Y (px)</label>
            <input
              type="number"
              value={element.y}
              onChange={(e) => onUpdateElement({ ...element, y: Number(e.target.value) })}
              style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Xoay (°)</label>
            <input
              type="number"
              value={element.rotation}
              onChange={(e) => onUpdateElement({ ...element, rotation: Number(e.target.value) })}
              style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Rộng (W)</label>
            <input
              type="number"
              value={element.width}
              onChange={(e) => onUpdateElement({ ...element, width: Number(e.target.value) })}
              style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Cao (H)</label>
            <input
              type="number"
              value={element.height}
              onChange={(e) => onUpdateElement({ ...element, height: Number(e.target.value) })}
              style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>

      {/* Typography & Style */}
      <div>
        <h5 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
          Định Dạng Màu Sắc & Kiểu Chữ
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Cỡ chữ (px)</label>
            <input
              type="number"
              value={element.style.fontSize || 16}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  style: { ...element.style, fontSize: Number(e.target.value) },
                })
              }
              style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Màu sắc</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="color"
                value={element.style.color || '#ffffff'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    style: { ...element.style, color: e.target.value },
                  })
                }
                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontSize: '11px' }}>{element.style.color || '#ffffff'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Animation & Timeline Preset */}
      <div>
        <h5 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
          Hiệu Ứng Chuyển Động (Animation)
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>
              Kiểu xuất hiện
            </label>
            <select
              value={element.animation.entrance}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  animation: {
                    ...element.animation,
                    entrance: e.target.value as EntranceAnimation,
                  },
                })
              }
              style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            >
              <option value="fadeIn">Hiện dần (Fade In)</option>
              <option value="blurReveal">Làm mờ lộ dần (Blur Reveal)</option>
              <option value="slideUp">Trượt từ dưới lên (Slide Up)</option>
              <option value="typewriter">Máy gõ chữ (Typewriter)</option>
              <option value="polaroidDrop">Thả ảnh rơi Polaroid</option>
              <option value="heartPop">Bật nảy Pop (Heart Pop)</option>
              <option value="zoomIn">Thu phóng điện ảnh (Zoom In)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Độ trễ: {element.animation.delay}s</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={element.animation.delay}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    animation: {
                      ...element.animation,
                      delay: Number(e.target.value),
                    },
                  })
                }
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px' }}>Thời lượng: {element.animation.duration}s</label>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.1"
                value={element.animation.duration}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    animation: {
                      ...element.animation,
                      duration: Number(e.target.value),
                    },
                  })
                }
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ color: 'var(--theme-text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>
              Chuyển động lặp lại (Loop)
            </label>
            <select
              value={element.animation.loop || 'none'}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  animation: {
                    ...element.animation,
                    loop: e.target.value as LoopAnimation,
                  },
                })
              }
              style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
            >
              <option value="none">Không lặp lại</option>
              <option value="pulse">Nhịp đập trái tim (Pulse)</option>
              <option value="float">Bồng bềnh lơ lửng (Float)</option>
              <option value="rotate">Xoay tròn nhẹ (Rotate)</option>
              <option value="shimmer">Lấp lánh lóa sáng (Shimmer)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
