import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlayerCharacter } from '../types';
import { playSound } from '../utils/gameData';
import { Brush, Eraser, ImagePlus, Save, Trash2, Upload } from 'lucide-react';

interface Props {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
}

const GRID = 32;
const VIEW = 256;
const DEFAULT_COLOR = '#f2c36b';
const PALETTE = ['#f2c36b', '#ffffff', '#f87171', '#60a5fa', '#34d399', '#c084fc', '#111827', '#fde68a'];

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1] || '');
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

export default function CharacterPortraitStudio({ player, setPlayer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(2);
  const [drawing, setDrawing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [preview, setPreview] = useState<string>((player as any).portraitData || (player as any).portraitUrl || '');

  const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || '';
  const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || '';

  const paintPixel = (ctx: CanvasRenderingContext2D, x: number, y: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, 1, 1);
  };

  const drawInitial = useMemo(() => (source?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, GRID, GRID);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, GRID, GRID);

    if (!source) {
      // small silhouette seed
      const pixels = [
        [12, 6, 4, 4, '#f8fafc'],
        [10, 10, 8, 5, '#60a5fa'],
        [11, 15, 6, 8, '#cbd5e1'],
        [9, 23, 4, 7, '#f87171'],
        [19, 23, 4, 7, '#34d399'],
      ] as const;
      pixels.forEach(([x, y, w, h, fill]) => {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
      });
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, GRID, GRID);
    };
    img.src = source;
  }, []);

  useEffect(() => {
    drawInitial((player as any).portraitData || (player as any).portraitUrl || '');
    setPreview((player as any).portraitData || (player as any).portraitUrl || '');
  }, [drawInitial, player]);

  const drawAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * GRID);
    const y = Math.floor(((clientY - rect.top) / rect.height) * GRID);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    for (let dx = 0; dx < brushSize; dx += 1) {
      for (let dy = 0; dy < brushSize; dy += 1) {
        const px = Math.min(GRID - 1, Math.max(0, x + dx));
        const py = Math.min(GRID - 1, Math.max(0, y + dy));
        paintPixel(ctx, px, py, color);
      }
    }
    setPreview(canvas.toDataURL('image/png'));
  };

  const uploadToCloudinary = async (blob: Blob) => {
    if (!cloudName || !uploadPreset) return null;
    const form = new FormData();
    form.append('file', blob);
    form.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    return await res.json();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playSound('success');
    const dataUrl = canvas.toDataURL('image/png');
    let portraitUrl = dataUrl;

    try {
      const blob = dataUrlToBlob(dataUrl);
      const uploaded = await uploadToCloudinary(blob);
      if (uploaded?.secure_url) {
        portraitUrl = uploaded.secure_url;
        setStatus('Đã lưu lên Cloudinary.');
      } else {
        setStatus('Đã lưu cục bộ.');
      }
    } catch {
      setStatus('Cloudinary chưa sẵn sàng, đã lưu cục bộ.');
    }

    setPlayer(prev => ({
      ...prev,
      portraitUrl,
      portraitData: dataUrl,
      portraitSource: 'draw',
    } as any));
  };

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    playSound('click');
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setPreview(dataUrl);
      let portraitUrl = dataUrl;
      try {
        const uploaded = await uploadToCloudinary(file);
        if (uploaded?.secure_url) portraitUrl = uploaded.secure_url;
        setStatus('Ảnh đã nạp.');
      } catch {
        setStatus('Không upload được Cloudinary, dùng ảnh local.');
      }
      setPlayer(prev => ({
        ...prev,
        portraitUrl,
        portraitData: dataUrl,
        portraitSource: 'upload',
      } as any));
    };
    reader.readAsDataURL(file);
  };

  const clearCanvas = () => {
    playSound('click');
    drawInitial('');
    setPreview('');
    setStatus('Đã xoá bản vẽ.');
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
          <Brush size={13} /> Chân dung nhân vật
        </h4>
        <span className="text-[9px] text-stone-500">Pixel brush • upload Cloudinary</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-3 items-start">
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={GRID}
            height={GRID}
            onPointerDown={(e) => { setDrawing(true); drawAt(e.clientX, e.clientY); }}
            onPointerMove={(e) => { if (drawing) drawAt(e.clientX, e.clientY); }}
            onPointerUp={() => setDrawing(false)}
            onPointerLeave={() => setDrawing(false)}
            className="w-[256px] h-[256px] border border-stone-700 rounded-xl bg-stone-950 cursor-crosshair image-rendering-pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1"><Save size={12} /> Lưu</button>
            <button onClick={clearCanvas} className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-200 text-[10px] font-black flex items-center gap-1"><Trash2 size={12} /> Xoá</button>
            <label className="px-3 py-1.5 rounded-lg bg-cyan-600 text-stone-950 text-[10px] font-black flex items-center gap-1 cursor-pointer">
              <Upload size={12} /> Tải ảnh
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0] || null)} />
            </label>
          </div>
          <p className="text-[10px] text-stone-500">{status || 'Vẽ bằng chuột / chạm để tạo ảnh nhân vật, hoặc tải ảnh có sẵn.'}</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-8 gap-1">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => { setColor(c); playSound('click'); }} className="w-6 h-6 rounded border border-stone-700" style={{ background: c }} title={c} />
            ))}
          </div>
          <div className="space-y-2 text-[10px] text-stone-300">
            <div className="flex items-center gap-2">
              <span className="w-16 text-stone-500 uppercase font-black">Cọ</span>
              <input type="range" min={1} max={4} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-1" />
              <span className="w-6 text-right font-mono">{brushSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 text-stone-500 uppercase font-black">Màu</span>
              <span className="h-5 w-5 rounded border border-stone-700" style={{ background: color }} />
              <span className="font-mono text-stone-400">{color}</span>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-2 text-stone-400">
              Ảnh hiện tại sẽ được lưu vào hồ sơ nhân vật và đồng bộ lên Cloudinary nếu biến môi trường được cấu hình.
            </div>
          </div>
          {preview ? <img src={preview} alt="preview" className="w-24 h-24 rounded-xl border border-stone-800 object-cover" /> : null}
        </div>
      </div>
    </div>
  );
}
