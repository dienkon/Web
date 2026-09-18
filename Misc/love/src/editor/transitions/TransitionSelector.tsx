import React from 'react';
import { Film, Play, Volume2, Sparkles } from 'lucide-react';
import { SceneTransitionConfig, TransitionType } from '../../models/LoveStory';
import { soundManager } from '../../audio/SoundManager';

interface TransitionSelectorProps {
  label: string;
  config: SceneTransitionConfig;
  onChange: (config: SceneTransitionConfig) => void;
}

export const TransitionSelector: React.FC<TransitionSelectorProps> = ({
  label,
  config,
  onChange,
}) => {
  const transitions: { id: TransitionType; name: string; desc: string }[] = [
    { id: 'fade', name: 'Mờ Dần (Fade)', desc: 'Chuyển cảnh êm đềm, thanh lịch' },
    { id: 'zoom', name: 'Thu Phóng Điện Ảnh (Zoom)', desc: 'Đẩy góc máy tới gần hoặc lùi xa' },
    { id: 'blur', name: 'Làm Mờ Quang Học (Blur)', desc: 'Hiệu ứng nhòe mờ lãng mạn' },
    { id: 'heartExplosion', name: 'Bùng Nổ Trái Tim', desc: 'Hàng ngàn trái tim tỏa sáng' },
    { id: 'particleDissolve', name: 'Tan Biến Hạt (Dissolve)', desc: 'Phân rã thành bụi sao lấp lánh' },
    { id: 'lightSweep', name: 'Quét Ánh Sáng (Sweep)', desc: 'Dải sáng lướt qua màn hình' },
    { id: 'radialBloom', name: 'Hào Quang Tỏa Tròn', desc: 'Ánh sáng bung nở từ tâm' },
    { id: 'curtain', name: 'Màn Nhập Nhẹ Nhàng', desc: 'Khép màn mở ra thế giới mới' },
  ];

  const handlePreview = () => {
    soundManager.playBurst();
    soundManager.playTransition();
  };

  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '14px',
        background: 'rgba(0, 0, 0, 0.15)',
        border: '1px solid var(--theme-glass-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Film size={14} color="var(--theme-primary)" />
          <span>{label}</span>
        </span>

        <button
          onClick={handlePreview}
          className="glass-button"
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Play size={10} />
          <span>Xem Thử</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', display: 'block', marginBottom: '3px' }}>
            Kiểu chuyển cảnh
          </label>
          <select
            value={config.type}
            onChange={(e) => onChange({ ...config, type: e.target.value as TransitionType })}
            style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '11px' }}
          >
            {transitions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '3px' }}>
            <span>Thời lượng</span>
            <span>{config.duration}s</span>
          </label>
          <input
            type="range"
            min="0.3"
            max="2.0"
            step="0.1"
            value={config.duration}
            onChange={(e) => onChange({ ...config, duration: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.sound}
            onChange={(e) => onChange({ ...config, sound: e.target.checked })}
          />
          <Volume2 size={12} />
          <span>Âm thanh chuyển cảnh</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={11} color="var(--theme-primary)" />
          <select
            value={config.particleDensity}
            onChange={(e) => onChange({ ...config, particleDensity: e.target.value as any })}
            style={{ padding: '3px 6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--theme-glass-border)', color: '#fff', fontSize: '10px' }}
          >
            <option value="low">Hạt nhẹ</option>
            <option value="medium">Hạt vừa</option>
            <option value="high">Hạt dày</option>
          </select>
        </div>
      </div>
    </div>
  );
};
