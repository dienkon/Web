import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2, ExternalLink, Download } from 'lucide-react';
import { LoveStory } from '../models/LoveStory';
import { StoryStorage } from '../services/StoryStorage';
import { soundManager } from '../audio/SoundManager';

interface ShareModalProps {
  story: LoveStory;
  onClose: () => void;
  onOpenStory: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ story, onClose, onOpenStory }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    // Generate share link
    // We create a standalone link with compressed base64 hash so it works across any device without backend!
    const token = StoryStorage.encodeStoryForShare(story);
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const url = `${origin}${pathname}#/love/${story.id}?d=${token}`;
    setShareUrl(url);

    // Generate QR Code
    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then((qr) => setQrDataUrl(qr))
      .catch((err) => console.error('QR code generation error:', err));
  }, [story]);

  const handleCopy = async () => {
    soundManager.playBurst();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    soundManager.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: story.title || 'Lời Tỏ Tình Bí Mật',
          text: `Một món quà bí mật từ ${story.sender.name} gửi tặng riêng cho ${story.receiver.name} ❤️`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleCopy();
    }
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
          maxWidth: '560px',
          width: '100%',
          borderRadius: '28px',
          padding: 'clamp(24px, 5vw, 40px)',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        <button
          onClick={onClose}
          className="glass-button"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        <h3
          className="font-display"
          style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: '8px',
            color: '#ffffff',
          }}
        >
          Câu Chuyện Đã Sẵn Sàng! ❤️
        </h3>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--theme-text-secondary)',
            marginBottom: '28px',
          }}
        >
          Gửi liên kết bí mật này cho {story.receiver.name || 'người ấy'} hoặc quét mã QR dưới đây.
        </p>

        {/* QR Code Container */}
        {qrDataUrl && (
          <div
            style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '20px',
              display: 'inline-block',
              marginBottom: '24px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            }}
          >
            <img
              src={qrDataUrl}
              alt="Mã QR Câu Chuyện"
              style={{ width: '180px', height: '180px', display: 'block' }}
            />
          </div>
        )}

        {/* Share Link Box */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            readOnly
            value={shareUrl}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--theme-glass-border)',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleCopy}
            className="btn-vibrant cursor-heart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenStory}
            className="btn-vibrant cursor-heart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '999px',
              fontSize: '0.95rem',
            }}
          >
            <ExternalLink size={16} />
            <span>Mở xem ngay</span>
          </button>

          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="glass-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '999px',
                fontSize: '0.95rem',
              }}
            >
              <Share2 size={16} />
              <span>Chia sẻ nhanh</span>
            </button>
          )}

          <button
            onClick={() => StoryStorage.exportToJson(story)}
            className="glass-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '999px',
              fontSize: '0.95rem',
            }}
          >
            <Download size={16} />
            <span>Tải JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
