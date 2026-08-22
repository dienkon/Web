import React, { useState, useRef } from "react";
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { uploadImageToCloudinary } from "../../../services/cloudinary";
import { useToast } from "../../../components/ui/ToastNotification";

interface Props {
  onInsert: (markdown: string) => void;
  onClose: () => void;
}

export default function ImageUploadModal({ onInsert, onClose }: Props) {
  const { showToast, error: showErrorToast } = useToast();
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showErrorToast("Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, SVG, GIF...)");
      return;
    }

    setIsProcessing(true);
    try {
      const cloudinaryUrl = await uploadImageToCloudinary(file);
      setPreviewUrl(cloudinaryUrl);
      if (!altText) {
        setAltText(file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err) {
      console.error("Upload error:", err);
      showErrorToast("Lỗi khi tải hình ảnh lên hệ thống! Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleInsert = () => {
    const finalUrl = activeTab === "upload" ? previewUrl : imageUrl.trim();
    if (!finalUrl) {
      showErrorToast("Vui lòng tải ảnh lên hoặc nhập đường dẫn ảnh hợp lệ");
      return;
    }

    const description = altText.trim() || "Hình ảnh";
    const markdown = `\n![${description}](${finalUrl})\n`;
    onInsert(markdown);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Chèn hình ảnh vào câu hỏi</h3>
              <p className="text-xs text-slate-500">Tải ảnh từ máy hoặc dán link liên kết</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 px-4 pt-2 gap-2 bg-slate-50/30">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "upload"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload className="w-4 h-4" /> Tải từ máy tính
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "url"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <LinkIcon className="w-4 h-4" /> Đường dẫn (URL)
          </button>
        </div>

        <div className="p-6 space-y-4">
          {activeTab === "upload" && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => !isProcessing && handleDrop(e)}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  isProcessing
                    ? "border-blue-400 bg-blue-50/50 cursor-wait opacity-80 pointer-events-none"
                    : "border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer"
                }`}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center py-4 space-y-2">
                    <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-blue-700">Đang tải ảnh lên hệ thống...</p>
                    <p className="text-xs text-slate-400">Vui lòng đợi trong giây lát</p>
                  </div>
                ) : previewUrl ? (
                  <div className="w-full flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Xem trước"
                      className="max-h-40 max-w-full rounded-lg object-contain border border-slate-200 shadow-sm mb-2"
                    />
                    <p className="text-xs text-blue-600 font-medium hover:underline">Nhấp để chọn ảnh khác</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-800 mb-1">
                      Kéo thả ảnh vào đây hoặc <span className="text-blue-600 underline">duyệt tệp</span>
                    </p>
                    <p className="text-xs text-slate-400">Hỗ trợ PNG, JPG, GIF, WebP, SVG</p>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Đường dẫn hình ảnh (URL)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/hinh-anh.jpg"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
              {imageUrl.trim() && (
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex justify-center">
                  <img
                    src={imageUrl.trim()}
                    alt="Preview"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLElement).style.display = "block";
                    }}
                    className="max-h-36 object-contain rounded"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Chú thích / Tên mô tả ảnh</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="VD: Đồ thị hàm số y = f(x)"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleInsert}
            disabled={isProcessing || (activeTab === "upload" ? !previewUrl : !imageUrl.trim())}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Chèn ảnh
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
