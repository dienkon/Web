import React, { useState, useRef, useEffect } from "react";
import "mathlive";

interface Props {
  onInsert: (latex: string) => void;
  onClose: () => void;
}

export default function MathLiveModal({ onInsert, onClose }: Props) {
  const mfRef = useRef<any>(null);

  useEffect(() => {
    // Focus the math field on mount
    if (mfRef.current) {
      setTimeout(() => {
        mfRef.current.focus();
      }, 100);
    }
  }, []);

  const handleInsert = () => {
    if (mfRef.current) {
      const latex = mfRef.current.getValue();
      if (latex) {
        onInsert(`$$\${latex}$$`);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold text-slate-800">Chèn công thức toán học (MathLive)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>
        
        <div className="p-6">
          <div className="border border-slate-300 rounded-lg p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            {React.createElement("math-field", {
              ref: mfRef,
              style: { width: "100%", fontSize: "1.25rem", padding: "8px", outline: "none" }
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            Sử dụng bàn phím ảo hoặc gõ trực tiếp LaTeX. (Vd: \sqrt, \frac, x^2)
          </p>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleInsert}
            className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors"
          >
            Chèn công thức
          </button>
        </div>
      </div>
    </div>
  );
}

