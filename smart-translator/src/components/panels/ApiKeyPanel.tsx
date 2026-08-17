import { useState } from "react";
import { Key, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { testGeminiKey } from "../../lib/gemini";
import { AppState } from "../../types";

interface Props {
  apiKey: string;
  model: string;
  onUpdate: (key: string, model: string) => void;
}

export function ApiKeyPanel({ apiKey, model, onUpdate }: Props) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(model);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const handleTestAndSave = async () => {
    if (!localKey) return;
    setStatus("testing");
    const ok = await testGeminiKey(localKey, localModel);
    setStatus(ok ? "success" : "error");
    if (ok) {
      onUpdate(localKey, localModel);
    }
  };

  return (
    <section>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
          API Configuration
        </label>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="Nhập Gemini API Key..."
              className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              {showKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <select
            value={localModel}
            onChange={(e) => setLocalModel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 outline-none"
          >
            <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
            <option value="gemini-3.6-flash">gemini-3.6-flash</option>
            <option value="gemini-3.5-flash">gemini-3.5-flash</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            
          </select>

          <button
            onClick={handleTestAndSave}
            disabled={status === "testing" || !localKey}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {status === "testing" ? "Đang kiểm tra..." : "Kiểm tra & Lưu"}
          </button>

          {status === "success" && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-medium bg-emerald-50 p-2 rounded">
              <CheckCircle className="w-3 h-3" /> Kết nối thành công!
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-[10px] text-red-600 font-medium bg-red-50 p-2 rounded">
              <XCircle className="w-3 h-3" /> Kết nối thất bại. Vui lòng kiểm
              tra lại Key.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
