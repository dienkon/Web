import { confirmDialog } from '../ui/Dialogs';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Trash2,
  Download,
  Paintbrush,
  Eraser,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { socketService } from '../../services/socket';
import { WhiteboardStroke } from '../../types/meeting';
import { clsx } from 'clsx';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  { name: 'Đen', value: '#1e293b' },
  { name: 'Đỏ', value: '#ef4444' },
  { name: 'Xanh dương', value: '#3b82f6' },
  { name: 'Xanh lá', value: '#10b981' },
  { name: 'Vàng', value: '#f59e0b' },
  { name: 'Tím', value: '#8b5cf6' },
  { name: 'Trắng', value: '#ffffff' },
];

const BRUSH_SIZES = [2, 4, 8, 16];

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(4);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas according to container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const previous = document.createElement('canvas');
    previous.width = canvas.width;
    previous.height = canvas.height;
    previous.getContext('2d')?.drawImage(canvas, 0, 0);
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (previous.width && previous.height) canvas.getContext('2d')?.drawImage(previous, 0, 0, canvas.width, canvas.height);
  }, []);

  // Listen to remote whiteboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleRemoteDraw = (stroke: WhiteboardStroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fromX = stroke.fromX * canvas.width;
      const fromY = stroke.fromY * canvas.height;
      const toX = stroke.toX * canvas.width;
      const toY = stroke.toY * canvas.height;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    };

    const handleRemoteClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleRemoteSync = ({ strokes }: { strokes: WhiteboardStroke[] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      strokes?.forEach(handleRemoteDraw);
    };

    socketService.on('whiteboard:draw', handleRemoteDraw);
    socketService.on('whiteboard:clear', handleRemoteClear);
    socketService.on('whiteboard:sync', handleRemoteSync);

    // Request initial canvas state from room
    resizeCanvas();
    socketService.emit('whiteboard:get');

    window.addEventListener('resize', resizeCanvas);
    const timer = setTimeout(() => { resizeCanvas(); socketService.emit('whiteboard:get'); }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
      socketService.off('whiteboard:draw', handleRemoteDraw);
      socketService.off('whiteboard:clear', handleRemoteClear);
      socketService.off('whiteboard:sync', handleRemoteSync);
    };
  }, [isOpen, resizeCanvas]);

  const drawStroke = (fromX: number, fromY: number, toX: number, toY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // Broadcast normalized coordinates (0.0 to 1.0) for cross-device responsiveness
    const stroke: WhiteboardStroke = {
      fromX: fromX / canvas.width,
      fromY: fromY / canvas.height,
      toX: toX / canvas.width,
      toY: toY / canvas.height,
      color: tool === 'eraser' ? '#ffffff' : color,
      size: tool === 'eraser' ? brushSize * 4 : brushSize,
      isEraser: tool === 'eraser',
    };
    socketService.emit('whiteboard:draw', stroke);
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    isDrawingRef.current = true;
    lastPosRef.current = { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    drawStroke(lastPosRef.current.x, lastPosRef.current.y, currentX, currentY);
    lastPosRef.current = { x: currentX, y: currentY };
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
    }
  };

  // Touch Handlers for Mobile & Tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    isDrawingRef.current = true;
    lastPosRef.current = { x, y };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current || e.touches.length !== 1) return;
    e.preventDefault(); // Prevent touch scroll on mobile while drawing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    drawStroke(lastPosRef.current.x, lastPosRef.current.y, currentX, currentY);
    lastPosRef.current = { x: currentX, y: currentY };
  };

  const handleTouchEnd = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
    }
  };

  const handleClear = async () => {
    if (await confirmDialog('Bạn có chắc chắn muốn xóa toàn bộ bảng vẽ không?')) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      socketService.emit('whiteboard:clear');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a white background export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = `MeetClass-Whiteboard-${Date.now()}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        'fixed z-50 transition-all duration-300 flex flex-col bg-[#161b26] text-white shadow-2xl border border-white/10',
        isFullscreen
          ? 'inset-0 rounded-none'
          : 'inset-2 sm:inset-6 md:inset-10 lg:inset-14 rounded-2xl md:rounded-3xl overflow-hidden'
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#1e2535] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <Paintbrush size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Bảng vẽ cộng tác thời gian thực</h2>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Nét vẽ được đồng bộ tức thì cho tất cả thành viên trong phòng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-colors"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/30 hover:text-rose-300 text-slate-300 transition-colors"
            title="Đóng bảng vẽ"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-3 sm:px-4 py-2 bg-[#19202f] border-b border-white/[0.07] flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto shrink-0 select-none">
        {/* Tool Mode */}
        <div className="flex items-center gap-1 bg-[#101520] p-1 rounded-xl shrink-0">
          <button
            onClick={() => setTool('pen')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tool === 'pen' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            )}
            title="Bút vẽ"
          >
            <Paintbrush size={14} />
            <span className="hidden sm:inline">Bút</span>
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tool === 'eraser' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            )}
            title="Tẩy nét vẽ"
          >
            <Eraser size={14} />
            <span className="hidden sm:inline">Tẩy</span>
          </button>
        </div>

        {/* Colors Palette */}
        {tool === 'pen' && (
          <div className="flex items-center gap-1.5 shrink-0">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={clsx(
                  'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                  color === c.value ? 'border-white scale-110 ring-2 ring-blue-500' : 'border-black/30'
                )}
                title={c.name}
              />
            ))}
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-1 shrink-0 bg-[#101520] p-1 rounded-xl">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                brushSize === size ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              )}
              title={`Cỡ nét ${size}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: `${Math.max(4, size)}px`, height: `${Math.max(4, size)}px` }}
              />
            </button>
          ))}
        </div>

        {/* Actions (Clear & Download) */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-medium transition-colors"
            title="Xóa toàn bộ bảng"
          >
            <Trash2 size={14} />
            <span className="hidden md:inline">Xóa bảng</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            title="Tải ảnh về máy"
          >
            <Download size={14} />
            <span className="hidden md:inline">Lưu ảnh</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full min-h-0 bg-white relative overflow-hidden touch-none cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="absolute inset-0 block w-full h-full"
        />
      </div>
    </div>
  );
};
