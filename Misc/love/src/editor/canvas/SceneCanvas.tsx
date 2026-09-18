import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  Type,
  Image as ImageIcon,
  Heart,
  Square,
  Sparkles,
  Quote,
  Video,
  Plus,
} from 'lucide-react';
import { StoryElement, ElementType, SceneConfig } from '../../models/LoveStory';
import { soundManager } from '../../audio/SoundManager';
import { cloudinaryService } from '../../services/CloudinaryService';

interface SceneCanvasProps {
  scene: SceneConfig;
  elements: StoryElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElements: (elements: StoryElement[]) => void;
  onAddElement: (element: StoryElement) => void;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  scene,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElements,
  onAddElement,
}) => {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0 });
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selectedElement = elements.find((e) => e.id === selectedElementId);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(2, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))));
  const handleZoomReset = () => setZoom(1);
  const handleZoomFit = () => {
    if (canvasRef.current) {
      const containerW = canvasRef.current.clientWidth - 40;
      const fitZoom = Math.min(1, containerW / 800);
      setZoom(Number(fitZoom.toFixed(2)));
    }
  };

  // Keyboard navigation on selected element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement || selectedElement.locked) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const step = e.shiftKey ? 10 : 1;
      let newX = selectedElement.x;
      let newY = selectedElement.y;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        newY -= step;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        newY += step;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        newX -= step;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        newX += step;
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        soundManager.playClick();
        onUpdateElements(elements.filter((el) => el.id !== selectedElement.id));
        onSelectElement(null);
        return;
      }

      if (newX !== selectedElement.x || newY !== selectedElement.y) {
        onUpdateElements(
          elements.map((el) => (el.id === selectedElement.id ? { ...el, x: newX, y: newY } : el))
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, elements, onUpdateElements, onSelectElement]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent, el: StoryElement) => {
    if (el.locked) return;
    e.stopPropagation();
    onSelectElement(el.id);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elX: el.x,
      elY: el.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || selectedElement.locked) return;

    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;
    let targetX = Math.round(dragStart.elX + dx);
    let targetY = Math.round(dragStart.elY + dy);

    // Snap to center guidelines (x=400, y=300)
    const newSnap: { x?: number; y?: number } = {};
    if (snapEnabled) {
      const centerX = targetX + selectedElement.width / 2;
      const centerY = targetY + selectedElement.height / 2;

      if (Math.abs(centerX - 400) < 8) {
        targetX = 400 - selectedElement.width / 2;
        newSnap.x = 400;
      }
      if (Math.abs(centerY - 300) < 8) {
        targetY = 300 - selectedElement.height / 2;
        newSnap.y = 300;
      }
    }
    setSnapLines(newSnap);

    onUpdateElements(
      elements.map((el) => (el.id === selectedElement.id ? { ...el, x: targetX, y: targetY } : el))
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setSnapLines({});
  };

  // Add new element helper
  const handleCreateElement = (type: ElementType) => {
    soundManager.playBurst();
    const id = 'el-' + Date.now();
    let content = 'Văn bản mới';
    let width = 240;
    let height = 50;

    if (type === 'heading') {
      content = 'Tiêu Đề Lãng Mạn';
      width = 400;
      height = 70;
    } else if (type === 'image' || type === 'polaroid') {
      content = 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80';
      width = 220;
      height = 260;
    } else if (type === 'heart') {
      content = '💖';
      width = 60;
      height = 60;
    } else if (type === 'button') {
      content = '❤️ Nhấn vào đây';
      width = 200;
      height = 50;
    } else if (type === 'quote') {
      content = '“Tình yêu là khi ở cạnh bạn, cả thế giới bỗng hóa dịu dàng.”';
      width = 360;
      height = 80;
    }

    const newEl: StoryElement = {
      id,
      name: `${type.toUpperCase()} #${elements.length + 1}`,
      type,
      x: 400 - width / 2,
      y: 300 - height / 2,
      width,
      height,
      rotation: 0,
      zIndex: elements.length + 1,
      opacity: 1,
      locked: false,
      hidden: false,
      content,
      style: {
        fontSize: type === 'heading' ? 28 : 15,
        color: '#ffffff',
        textAlign: 'center',
        glow: type === 'heart' || type === 'heading',
      },
      animation: {
        entrance: type === 'polaroid' ? 'polaroidDrop' : 'fadeIn',
        delay: 0.3,
        duration: 0.8,
        loop: type === 'heart' ? 'pulse' : 'none',
      },
    };

    onAddElement(newEl);
    onSelectElement(id);
  };

  return (
    <div
      ref={canvasRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Toolbar: Add Elements & Canvas Controls */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '840px',
          padding: '8px 16px',
          borderRadius: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* Left: Element Insertion Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => handleCreateElement('heading')}
            className="glass-button"
            title="Thêm Tiêu Đề"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Type size={13} />
            <span>Tiêu Đề</span>
          </button>

          <button
            onClick={() => handleCreateElement('quote')}
            className="glass-button"
            title="Thêm Câu Nói Hay"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Quote size={13} />
            <span>Trích Dẫn</span>
          </button>

          <button
            onClick={() => handleCreateElement('polaroid')}
            className="glass-button"
            title="Thêm Ảnh Polaroid"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ImageIcon size={13} />
            <span>Ảnh Polaroid</span>
          </button>

          <button
            onClick={() => handleCreateElement('heart')}
            className="glass-button"
            title="Thêm Trái Tim"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Heart size={13} color="var(--theme-primary)" />
            <span>Trái Tim</span>
          </button>

          <button
            onClick={() => handleCreateElement('button')}
            className="glass-button"
            title="Thêm Nút Bấm"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Square size={13} />
            <span>Nút Bấm</span>
          </button>
        </div>

        {/* Right: Zoom & Grid Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="glass-button"
            title="Bật/Tắt Lưới Pixel"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              color: showGrid ? 'var(--theme-primary)' : 'inherit',
            }}
          >
            <Grid size={13} />
          </button>

          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className="glass-button"
            title="Bật/Tắt Căn Chỉnh Hút Snap"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              color: snapEnabled ? 'var(--theme-primary)' : 'inherit',
            }}
          >
            <Magnet size={13} />
          </button>

          <div style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

          <button onClick={handleZoomOut} className="glass-button" title="Thu nhỏ" style={{ padding: '6px 8px', borderRadius: '8px' }}>
            <ZoomOut size={13} />
          </button>
          <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '38px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="glass-button" title="Phóng to" style={{ padding: '6px 8px', borderRadius: '8px' }}>
            <ZoomIn size={13} />
          </button>
          <button onClick={handleZoomFit} className="glass-button" title="Vừa màn hình" style={{ padding: '6px 8px', borderRadius: '8px' }}>
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Canva Virtual Workspace Frame (800 x 600) */}
      <div
        style={{
          width: `${800 * zoom}px`,
          height: `${600 * zoom}px`,
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--theme-glass-border)',
          background: 'var(--theme-bg)',
          transition: isDragging ? 'none' : 'width 0.2s ease, height 0.2s ease',
        }}
        onClick={() => onSelectElement(null)}
      >
        {/* Pixel Grid Pattern */}
        {showGrid && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {/* Snap Guide Lines */}
        {snapLines.x !== undefined && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${snapLines.x * zoom}px`,
              width: '1px',
              background: '#ec4899',
              boxShadow: '0 0 8px #ec4899',
              zIndex: 999,
              pointerEvents: 'none',
            }}
          />
        )}
        {snapLines.y !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${snapLines.y * zoom}px`,
              height: '1px',
              background: '#ec4899',
              boxShadow: '0 0 8px #ec4899',
              zIndex: 999,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Elements Renderer */}
        {elements
          .filter((el) => !el.hidden)
          .map((el) => {
            const isSelected = el.id === selectedElementId;

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleMouseDown(e, el)}
                style={{
                  position: 'absolute',
                  left: `${el.x * zoom}px`,
                  top: `${el.y * zoom}px`,
                  width: `${el.width * zoom}px`,
                  height: `${el.height * zoom}px`,
                  transform: `rotate(${el.rotation}deg)`,
                  zIndex: el.zIndex,
                  cursor: el.locked ? 'default' : isDragging && isSelected ? 'grabbing' : 'grab',
                  border: isSelected ? '2px solid var(--theme-primary)' : '1px dashed transparent',
                  boxShadow: isSelected ? '0 0 16px var(--theme-glow)' : 'none',
                  borderRadius: el.style.borderRadius ? `${el.style.borderRadius * zoom}px` : '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: el.style.textAlign || 'center',
                  padding: `${8 * zoom}px`,
                  boxSizing: 'border-box',
                  background: el.style.backgroundColor || 'transparent',
                }}
              >
                {/* Element Content Types */}
                {el.type === 'heading' && (
                  <h3
                    className="font-display"
                    style={{
                      fontSize: `${(el.style.fontSize || 28) * zoom}px`,
                      color: el.style.color || '#ffffff',
                      margin: 0,
                      lineHeight: 1.2,
                      textShadow: el.style.glow ? '0 0 20px var(--theme-glow)' : 'none',
                    }}
                  >
                    {el.content}
                  </h3>
                )}

                {el.type === 'paragraph' && (
                  <p
                    style={{
                      fontSize: `${(el.style.fontSize || 14) * zoom}px`,
                      color: el.style.color || 'var(--theme-text-secondary)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {el.content}
                  </p>
                )}

                {el.type === 'quote' && (
                  <blockquote
                    className="font-handwriting"
                    style={{
                      fontSize: `${(el.style.fontSize || 20) * zoom}px`,
                      color: el.style.color || '#fff1f2',
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {el.content}
                  </blockquote>
                )}

                {(el.type === 'image' || el.type === 'polaroid') && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#ffffff',
                      padding: `${10 * zoom}px`,
                      borderRadius: `${10 * zoom}px`,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <img
                      src={el.content}
                      alt={el.name}
                      style={{
                        width: '100%',
                        flex: 1,
                        objectFit: 'cover',
                        borderRadius: `${6 * zoom}px`,
                      }}
                    />
                    {el.type === 'polaroid' && (
                      <div
                        className="font-handwriting"
                        style={{
                          height: `${30 * zoom}px`,
                          color: '#333333',
                          fontSize: `${14 * zoom}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: `${4 * zoom}px`,
                        }}
                      >
                        Kỷ niệm ngọt ngào
                      </div>
                    )}
                  </div>
                )}

                {el.type === 'heart' && (
                  <div style={{ fontSize: `${(el.style.fontSize || 36) * zoom}px`, textAlign: 'center' }}>
                    {el.content || '💖'}
                  </div>
                )}

                {el.type === 'button' && (
                  <div
                    className="btn-vibrant"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '999px',
                      fontSize: `${(el.style.fontSize || 14) * zoom}px`,
                    }}
                  >
                    {el.content}
                  </div>
                )}

                {/* Selection Resize Handles on Corners */}
                {isSelected && !el.locked && (
                  <>
                    <div style={{ position: 'absolute', top: -5, left: -5, width: 9, height: 9, background: '#fff', border: '1px solid var(--theme-primary)', borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', top: -5, right: -5, width: 9, height: 9, background: '#fff', border: '1px solid var(--theme-primary)', borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', bottom: -5, left: -5, width: 9, height: 9, background: '#fff', border: '1px solid var(--theme-primary)', borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', bottom: -5, right: -5, width: 9, height: 9, background: '#fff', border: '1px solid var(--theme-primary)', borderRadius: '2px' }} />
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
