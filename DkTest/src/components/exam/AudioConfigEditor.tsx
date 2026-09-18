import React, { useState } from "react";
import { Headphones, Upload, Trash2, Music, Loader2, Play, Volume2, Settings } from "lucide-react";
import type { ExamAudioConfig } from "../../types";
import { uploadFileToCloudinary } from "../../services/cloudinary";

interface Props {
  audioConfig?: ExamAudioConfig;
  onChange: (config: ExamAudioConfig) => void;
  onRemove?: () => void;
  label?: string;
  defaultTitle?: string;
}

export default function AudioConfigEditor({
  audioConfig,
  onChange,
  onRemove,
  label = "Bài nghe Audio (Listening MP3)",
  defaultTitle = "File nghe Audio",
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const config: ExamAudioConfig = audioConfig || {
    enabled: false,
    url: "",
    fileName: "",
    title: defaultTitle,
    maxPlays: 0,
    allowSeek: true,
    allowPause: true,
    autoPlay: false,
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const cloudUrl = await uploadFileToCloudinary(file);
      onChange({
        ...config,
        enabled: true,
        url: cloudUrl,
        fileName: file.name,
        fileSize: file.size,
        title: config.title || file.name.replace(/\.[^/.]+$/, ""),
      });
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      alert("Tải file MP3 lên Cloudinary thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const update = (updates: Partial<ExamAudioConfig>) => {
    onChange({
      ...config,
      ...updates,
    });
  };

  const handleClear = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange({
        ...config,
        enabled: false,
        url: "",
        fileName: "",
        fileSize: undefined,
      });
    }
  };

  return (
    <div className="border border-indigo-200 bg-indigo-50/20 rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all">
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-slate-900 block truncate">
              {label}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {config.enabled && config.url
                ? (config.fileName || "Đã gắn file nghe Cloudinary")
                : "Thêm tệp MP3 để thí sinh nghe khi làm"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.enabled && config.url && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              {showAdvanced ? "Thu gọn thiết lập" : "Cài đặt nghe"}
            </button>
          )}

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.enabled || false}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* When enabled */}
      {config.enabled && (
        <div className="space-y-3 pt-2 border-t border-indigo-100">
          {config.url ? (
            <div className="bg-white p-3 rounded-xl border border-indigo-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="truncate text-xs">
                    <strong className="text-slate-800 font-bold truncate block">
                      {config.fileName || "File audio đã tải"}
                    </strong>
                    {config.fileSize && (
                      <span className="text-[10px] text-slate-400">
                        {(config.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer transition-all">
                    Đổi file
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                      disabled={isUploading}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Xóa file audio này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Native audio player preview */}
              <div className="pt-1.5 border-t border-slate-100">
                <audio controls src={config.url} className="w-full h-8 rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <label className={`w-full sm:w-auto px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs ${isUploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    Đang tải lên Cloudinary...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Tải lên file MP3
                  </>
                )}
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                  disabled={isUploading}
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <span className="text-xs text-slate-400 font-medium">hoặc</span>

              <input
                type="url"
                value={config.url || ""}
                onChange={(e) => update({ url: e.target.value })}
                placeholder="Dán link audio trực tiếp (https://...)"
                className="flex-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Advanced / Playback Settings */}
          {(showAdvanced || !config.url) && (
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tiêu đề bài nghe hiển thị
                  </label>
                  <input
                    type="text"
                    value={config.title || ""}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="VD: Hội thoại 1, File nghe câu 5"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Số lần được nghe</span>
                    <span className="text-[10px] text-indigo-600 font-mono font-semibold">0 = Vô hạn</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={config.maxPlays ?? 0}
                    onChange={(e) => update({ maxPlays: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value)) })}
                    placeholder="0 = Vô hạn"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-[11px] font-semibold text-slate-700 hover:border-indigo-300">
                  <input
                    type="checkbox"
                    checked={config.allowSeek !== false}
                    onChange={(e) => update({ allowSeek: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>Cho phép tua</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-[11px] font-semibold text-slate-700 hover:border-indigo-300">
                  <input
                    type="checkbox"
                    checked={config.allowPause !== false}
                    onChange={(e) => update({ allowPause: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>Cho phép tạm dừng</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-[11px] font-semibold text-slate-700 hover:border-indigo-300">
                  <input
                    type="checkbox"
                    checked={config.autoPlay || false}
                    onChange={(e) => update({ autoPlay: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>Tự động phát</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
