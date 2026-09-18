import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import { CloudinaryMediaItem } from '../../models/LoveStory';
import { cloudinaryService } from '../../services/CloudinaryService';
import { soundManager } from '../../audio/SoundManager';

interface MediaLibraryModalProps {
  onSelectImage: (url: string) => void;
  onClose: () => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  onSelectImage,
  onClose,
}) => {
  const [items, setItems] = useState<CloudinaryMediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setItems(cloudinaryService.getMediaLibrary());
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        soundManager.playClick();
        const uploaded = await cloudinaryService.uploadImage(file);
        setItems(cloudinaryService.getMediaLibrary());
        soundManager.playBurst();
      } catch (err) {
        alert('Lỗi tải ảnh: ' + (err as Error).message);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDelete = (publicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    cloudinaryService.deleteFromLibrary(publicId);
    setItems(cloudinaryService.getMediaLibrary());
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.85)',
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
        className="glass-panel"
        style={{
          maxWidth: '680px',
          width: '100%',
          borderRadius: '24px',
          padding: '28px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={18} color="var(--theme-primary)" />
              <span>Thư Viện Ảnh (Cloudinary Media Library)</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
              {cloudinaryService.isConfigured()
                ? 'Đã kết nối đám mây Cloudinary tối ưu hóa tự động.'
                : 'Đang chạy chế độ lưu trữ media nội bộ an toàn (Offline Base64).'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="glass-button"
            style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload Action Button */}
        <div style={{ marginBottom: '18px' }}>
          <label
            className="btn-vibrant cursor-heart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '999px',
              fontSize: '13px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              opacity: isUploading ? 0.7 : 1,
            }}
          >
            <Upload size={15} />
            <span>{isUploading ? 'Đang tải lên...' : 'Tải Ảnh Mới Lên'}</span>
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Media Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px',
            overflowY: 'auto',
            flex: 1,
            paddingRight: '4px',
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--theme-text-secondary)',
                fontSize: '13px',
              }}
            >
              Chưa có hình ảnh nào trong thư viện. Hãy tải ảnh đầu tiên lên nhé!
            </div>
          ) : (
            items.map((img) => (
              <div
                key={img.publicId}
                onClick={() => {
                  soundManager.playBurst();
                  onSelectImage(img.secureUrl);
                  onClose();
                }}
                className="glass-card cursor-heart"
                style={{
                  height: '120px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={cloudinaryService.getOptimizedImageUrl(img.secureUrl, { width: 260, height: 240, crop: 'fill' })}
                  alt="Media item"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                <button
                  onClick={(e) => handleDelete(img.publicId, e)}
                  className="glass-button"
                  title="Xóa ảnh khỏi thư viện"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    padding: '4px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#ef4444',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
