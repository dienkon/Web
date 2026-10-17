import React, { useState, useEffect } from 'react';
import {
  Key,
  Check,
  AlertCircle,
  ExternalLink,
  X,
  RefreshCw,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  removeGeminiApiKey,
  testGeminiApiKey,
  isGeminiKeyConfigured,
  getGeminiModel,
  setGeminiModel,
} from '../../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'vi' | 'en';
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = getGeminiApiKey();
      setApiKeyInput(current && !current.startsWith('AQ.') ? current : '');
      setSelectedModel(getGeminiModel());
      setTestStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      setGeminiApiKey(trimmed);
      setGeminiModel(selectedModel);
      setStatusMessage(
        language === 'vi'
          ? 'Đã lưu API Key vào trình duyệt thành công!'
          : 'API Key saved to browser storage successfully!'
      );
      setTestStatus('success');
    } else {
      removeGeminiApiKey();
      setStatusMessage(
        language === 'vi'
          ? 'Đã xóa API Key cá nhân.'
          : 'Removed custom API Key.'
      );
      setTestStatus('idle');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setStatusMessage(
      language === 'vi' ? 'Đang gửi gói tin kiểm tra đến Google AI...' : 'Pinging Google AI...'
    );

    const candidate = apiKeyInput.trim() || undefined;
    const result = await testGeminiApiKey(candidate);

    if (result.ok) {
      setTestStatus('success');
      setStatusMessage(
        language === 'vi'
          ? `Kết nối thành công! Mô hình hoạt động: ${result.model}`
          : `Connected successfully! Working model: ${result.model}`
      );
      if (candidate) {
        setGeminiApiKey(candidate);
      }
    } else {
      setTestStatus('error');
      setStatusMessage(
        language === 'vi'
          ? `Lỗi kết nối: ${result.error || 'API Key không hợp lệ hoặc bị chặn'}`
          : `Connection failed: ${result.error || 'Invalid or blocked API Key'}`
      );
    }
  };

  const handleClear = () => {
    removeGeminiApiKey();
    setApiKeyInput('');
    setTestStatus('idle');
    setStatusMessage(
      language === 'vi'
        ? 'Đã đặt lại về cấu hình mặc định.'
        : 'Reset to default configuration.'
    );
  };

  const isConfigured = isGeminiKeyConfigured();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'vi' ? 'Cấu Hình Gemini API Key' : 'Gemini API Key Settings'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'vi'
                  ? 'Hoạt động cả khi chạy local và trên web'
                  : 'Works seamlessly in local dev & web'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-semibold text-slate-700">
                {isConfigured
                  ? language === 'vi'
                    ? 'API Key cá nhân: Đã kết nối'
                    : 'Custom Key: Active'
                  : language === 'vi'
                    ? 'Chế độ Local Offline / Mặc định'
                    : 'Local Offline Mode / Default'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              localStorage
            </span>
          </div>

          {/* Input Field */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              {language === 'vi' ? 'Google AI Studio API Key (AIzaSy...)' : 'Google AI Studio API Key'}
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs text-slate-800 placeholder-slate-400"
              />
              {apiKeyInput && (
                <button
                  onClick={() => setApiKeyInput('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Model selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              {language === 'vi' ? 'Mô hình ưu tiên' : 'Preferred Model'}
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Khuyên dùng - Nhanh & Mới nhất)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Tối ưu tốc độ cao)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Thế hệ 2.0)</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Thử nghiệm)</option>
            </select>
          </div>

          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2 border text-[11px] ${
                testStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : testStatus === 'error'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {testStatus === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : testStatus === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage}</span>
            </div>
          )}

          {/* Helper Instructions */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              {language === 'vi' ? 'Cách lấy API Key miễn phí:' : 'How to get a free API Key:'}
            </p>
            <p>
              {language === 'vi'
                ? 'Truy cập Google AI Studio, bấm "Get API key" và tạo khoá miễn phí (không cần thẻ tín dụng).'
                : 'Visit Google AI Studio, click "Get API key" to create a free key without credit card.'}
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium mt-1"
            >
              <span>https://aistudio.google.com/app/apikey</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-medium transition-colors flex items-center gap-1 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Xóa khóa' : 'Clear Key'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-white font-medium transition-colors flex items-center gap-1 text-xs shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`}
              />
              <span>{language === 'vi' ? 'Kiểm tra' : 'Test Key'}</span>
            </button>

            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-1 text-xs shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Lưu & Đóng' : 'Save & Close'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
