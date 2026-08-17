/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import {
  Upload,
  Clipboard,
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { recognizeImageText, OCRProgress } from "../utils/ocrService";
import { TranslationDictionary } from "../utils/translations";

interface ImageUploaderProps {
  onOCRComplete: (text: string, confidence: number) => void;
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
  setRawOCRText: (text: string) => void;
  t: TranslationDictionary;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onOCRComplete,
  imagePreview,
  setImagePreview,
  setRawOCRText,
  t,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Process selected or pasted file
  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setOcrError(t.invalidFileError);
      return;
    }

    setOcrError(null);
    setLoading(true);
    setOcrProgress({ status: t.uploadingText, progress: 0.1 });

    // Generate local preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      setOcrProgress({ status: t.ocrProcessing, progress: 0.3 });

      const { text, confidence } = await recognizeImageText(
        file,
        (progressObj) => {
          setOcrProgress({
            status: progressObj.status,
            progress: progressObj.progress,
          });
        },
      );

      setOcrProgress({ status: "Completed!", progress: 1.0 });
      setRawOCRText(text);
      onOCRComplete(text, confidence);
    } catch (err: any) {
      console.error("OCR process error:", err);
      setOcrError(`${t.ocrErrorPrefix} ${err.message || err}`);
    } finally {
      setLoading(false);
      setOcrProgress(null);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Listen for global paste events (Ctrl+V) but ONLY if the mouse is hovering over the container!
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isHovered) {
        return; // ONLY paste when hovered!
      }
      if (
        e.clipboardData &&
        e.clipboardData.files &&
        e.clipboardData.files.length > 0
      ) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith("image/")) {
          e.preventDefault();
          processFile(file);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [isHovered, t]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImagePreview(null);
    setRawOCRText("");
    setOcrError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload Zone */}
      <div
        id="image-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={imagePreview ? undefined : triggerFileSelect}
        className={`relative group flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center transition-all min-h-[220px] select-none ${
          imagePreview ? "bg-slate-50/10 border-slate-200" : "cursor-pointer"
        } ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : isHovered
              ? "border-blue-400 bg-slate-50/80 shadow-md shadow-blue-500/5 scale-[1.01]"
              : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {imagePreview ? (
          <div className="w-full flex flex-col items-center justify-center">
            {/* Immersive Image Frame */}
            <div className="max-w-md max-h-[240px] overflow-hidden rounded-xl border border-slate-250 bg-white shadow-sm flex items-center justify-center p-1.5">
              <img
                src={imagePreview}
                alt="Chemistry Screen preview"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[210px] object-contain rounded-lg mx-auto"
              />
            </div>

            {/* Hover overlay covering the ENTIRE big frame drop-zone */}
            <div className="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-4 p-6 z-10">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  id="btn-change-image"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileSelect();
                  }}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold border border-blue-500 shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" />
                  {t.changeImage}
                </button>
                <button
                  type="button"
                  id="btn-remove-image"
                  onClick={clearImage}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold border border-rose-500 shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {t.deleteImage}
                </button>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                {t.pastePrompt}
              </p>
            </div>

            {/* Dynamic feedback instructions beneath the preview (hidden when overlay is hovered to maintain pristine visuals) */}
            <div className="flex flex-col items-center gap-1.5 text-center mt-4 transition-opacity group-hover:opacity-0 duration-200">
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <Clipboard className="w-3.5 h-3.5 text-blue-500" />
                {t.pastePrompt}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                {t.hoverPasteWarning}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className={`p-4 rounded-2xl border transition-colors ${isDragging ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : isHovered ? "bg-blue-50 border-blue-200 text-blue-500" : "bg-white border-slate-200 text-slate-400 shadow-sm"}`}
            >
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">
                {t.dropImagePrompt}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {t.screenshotPrompt}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 items-center mt-2">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <Clipboard className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-semibold text-slate-500">
                  {t.pastePrompt}
                </span>
              </div>
              <p
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${isHovered ? "text-green-600 bg-green-50 border-green-200" : "text-amber-600 bg-amber-50 border-amber-200"}`}
              >
                {t.hoverPasteWarning}
              </p>
            </div>
          </div>
        )}

        {/* OCR loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-6 z-10">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <h4 className="text-sm font-bold text-slate-800">
              {t.ocrProcessing}
            </h4>
            <p className="text-xs text-slate-500 mt-1 text-center font-mono max-w-sm">
              {ocrProgress?.status || "Processing..."}
            </p>

            <div className="w-48 bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-200">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${(ocrProgress?.progress || 0) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* OCR error display */}
      {ocrError && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl p-4 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{ocrError}</span>
        </div>
      )}
    </div>
  );
};
