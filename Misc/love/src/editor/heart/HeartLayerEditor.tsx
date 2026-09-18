import React from 'react';
import { Plus, Trash2, Heart, Eye, EyeOff, Layers } from 'lucide-react';
import { HeartLayerConfig, HeartDirection, HeartReaction } from '../../models/LoveStory';
import { soundManager } from '../../audio/SoundManager';

interface HeartLayerEditorProps {
  layers: HeartLayerConfig[];
  onChange: (layers: HeartLayerConfig[]) => void;
}

export const HeartLayerEditor: React.FC<HeartLayerEditorProps> = ({ layers, onChange }) => {
  const handleAddLayer = () => {
    soundManager.playBurst();
    const newLayer: HeartLayerConfig = {
      id: 'hl-' + Date.now(),
      name: `Tầng Tim Mới ${layers.length + 1}`,
      enabled: true,
      quantity: 20,
      minSize: 12,
      maxSize: 24,
      speed: 0.8,
      direction: 'upward',
      drift: 0.5,
      blur: 0,
      glow: true,
      glowColor: '#f43f5e',
      color: '#f43f5e',
      depth: 'middle',
      parallaxStrength: 0.4,
      interactiveReaction: 'repel',
      trigger: 'always',
    };
    onChange([...layers, newLayer]);
  };

  const handleUpdateLayer = (id: string, partial: Partial<HeartLayerConfig>) => {
    onChange(layers.map((l) => (l.id === id ? { ...l, ...partial } : l)));
  };

  const handleDeleteLayer = (id: string) => {
    soundManager.playClick();
    onChange(layers.filter((l) => l.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Heart size={15} color="var(--theme-primary)" />
          <span>Hệ Thống Đa Tầng Trái Tim ({layers.length} Tầng)</span>
        </h4>
        <button
          onClick={handleAddLayer}
          className="glass-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        >
          <Plus size={13} />
          <span>Thêm Tầng Tim</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {layers.map((layer) => (
          <div
            key={layer.id}
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--theme-glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleUpdateLayer(layer.id, { enabled: !layer.enabled })}
                  className="glass-button"
                  style={{ padding: '4px', borderRadius: '6px' }}
                >
                  {layer.enabled ? <Eye size={13} color="var(--theme-primary)" /> : <EyeOff size={13} color="#94a3b8" />}
                </button>
                <input
                  type="text"
                  value={layer.name}
                  onChange={(e) => handleUpdateLayer(layer.id, { name: e.target.value })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {layers.length > 1 && (
                <button
                  onClick={() => handleDeleteLayer(layer.id)}
                  className="glass-button"
                  style={{ padding: '4px 6px', borderRadius: '6px', color: '#ef4444' }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Config Sliders Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
              {/* Quantity */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-text-secondary)', marginBottom: '3px' }}>
                  <span>Số lượng</span>
                  <span>{layer.quantity}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={layer.quantity}
                  onChange={(e) => handleUpdateLayer(layer.id, { quantity: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Speed */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-text-secondary)', marginBottom: '3px' }}>
                  <span>Tốc độ</span>
                  <span>{layer.speed}x</span>
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={layer.speed}
                  onChange={(e) => handleUpdateLayer(layer.id, { speed: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Direction */}
              <div>
                <label style={{ display: 'block', color: 'var(--theme-text-secondary)', marginBottom: '3px' }}>
                  Hướng trôi
                </label>
                <select
                  value={layer.direction}
                  onChange={(e) => handleUpdateLayer(layer.id, { direction: e.target.value as HeartDirection })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
                >
                  <option value="upward">Bay Lên Trời</option>
                  <option value="downward">Rơi Nhẹ Xuống</option>
                  <option value="sideways">Trôi Lượn Ngang</option>
                  <option value="gravity">Trọng Lực Tự Nhiên</option>
                </select>
              </div>

              {/* Cursor Interaction */}
              <div>
                <label style={{ display: 'block', color: 'var(--theme-text-secondary)', marginBottom: '3px' }}>
                  Tương tác chuột
                </label>
                <select
                  value={layer.interactiveReaction}
                  onChange={(e) => handleUpdateLayer(layer.id, { interactiveReaction: e.target.value as HeartReaction })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
                >
                  <option value="none">Không Tương Tác</option>
                  <option value="repel">Đẩy Xa Con Trỏ</option>
                  <option value="attract">Hút Về Con Trỏ</option>
                </select>
              </div>

              {/* Color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ color: 'var(--theme-text-secondary)' }}>Màu sắc:</label>
                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => handleUpdateLayer(layer.id, { color: e.target.value, glowColor: e.target.value })}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                />
              </div>

              {/* Depth */}
              <div>
                <label style={{ display: 'block', color: 'var(--theme-text-secondary)', marginBottom: '3px' }}>
                  Tầng độ sâu
                </label>
                <select
                  value={layer.depth}
                  onChange={(e) => handleUpdateLayer(layer.id, { depth: e.target.value as any })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
                >
                  <option value="background">Hậu Cảnh (Xa, Mờ Nhẹ)</option>
                  <option value="middle">Trung Cảnh (Vừa)</option>
                  <option value="foreground">Tiền Cảnh (Gần, Nổi Bật)</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
