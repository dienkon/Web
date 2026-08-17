/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Cpu, Languages } from "lucide-react";
import { TranslationDictionary } from "../utils/translations";

interface HeaderProps {
  isGeminiConnected: boolean | null;
  checkingGemini: boolean;
  language: "vi" | "en";
  setLanguage: (lang: "vi" | "en") => void;
  t: TranslationDictionary;
}

export const Header: React.FC<HeaderProps> = ({
  isGeminiConnected,
  checkingGemini,
  language,
  setLanguage,
  t,
}) => {
  return (
    <header className="bg-white border border-slate-100 py-5 px-6 sm:px-8 shadow-sm rounded-2xl mb-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Title & Logo */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/15 shrink-0">
            C
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-800 flex flex-wrap items-center gap-2">
              {t.appName}
              <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2.5 py-0.5 rounded-full border border-blue-200/50 uppercase tracking-wider font-mono">
                v1.1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {t.appDescription}
            </p>
          </div>
        </div>

        {/* Right: Language & AI Status Indicators */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex gap-1">
              <button
                type="button"
                id="lang-vi-btn"
                onClick={() => setLanguage("vi")}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  language === "vi"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                }`}
              >
                VI
              </button>
              <button
                type="button"
                id="lang-en-btn"
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  language === "en"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* AI Status */}
          <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t.aiService}
            </span>

            {checkingGemini ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {t.aiConnecting}
              </span>
            ) : isGeminiConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {t.aiReady}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-rose-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {t.aiOffline}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
