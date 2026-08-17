import React, { useState } from "react";
import { Link, FileText, Upload, Globe, Play, Loader2 } from "lucide-react";
import { parseUrlPattern, buildChapterUrl, fetchWithCorsProxy, parseHtmlContent, delay } from "../../lib/scraper";
import * as mammoth from "mammoth";

interface Props {
  sourceText: string;
  onUpdateSource: React.Dispatch<React.SetStateAction<string>>;
  corsProxy: string;
  addLog?: (msg: string) => void;
}

export function SourcePanel({ sourceText, onUpdateSource, corsProxy, addLog }: Props) {
  const [activeTab, setActiveTab] = useState<"text" | "url">("url");
  const [urlInput, setUrlInput] = useState("");
  const [pageStart, setPageStart] = useState("1");
  const [pageEnd, setPageEnd] = useState("5");
  
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState("");
  const [scrapeError, setScrapeError] = useState("");

  const log = (msg: string) => {
    if (addLog) addLog(msg);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.docx')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onUpdateSource(result.value);
        setActiveTab("text");
        log(`Đã tải file Word: ${file.name}`);
      } catch (err: any) {
        log("Lỗi đọc file docx: " + err.message);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpdateSource(ev.target?.result as string);
        setActiveTab("text");
        log(`Đã tải file: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  const handleScrape = async () => {
    setScrapeError("");
    if (!urlInput) {
      setScrapeError("Vui lòng nhập URL.");
      return;
    }
    const start = parseInt(pageStart);
    const end = parseInt(pageEnd);
    if (isNaN(start) || isNaN(end) || start > end) {
      setScrapeError("Trang bắt đầu / kết thúc không hợp lệ.");
      return;
    }

    const job = parseUrlPattern(urlInput);
    if (!job) {
      setScrapeError("URL không đúng định dạng nhận diện (VD: abc_1.html).");
      return;
    }

    setIsScraping(true);
    setActiveTab("text"); // Switch tab to see content coming in
    log(`Bắt đầu tải từ trang ${start} đến ${end}...`);

    try {
      for (let i = start; i <= end; i++) {
        setScrapeProgress(`Đang tải trang ${i}/${end}...`);
        const currentUrl = buildChapterUrl(job, i);
        log(`Fetching ${currentUrl}...`);
        
        let html = "";
        try {
          html = await fetchWithCorsProxy(currentUrl, corsProxy);
        } catch (e: any) {
          log(`Lỗi tải trang ${i}, thử lại lần 2... ${e.message}`);
          await delay(1000); 
          try {
            html = await fetchWithCorsProxy(currentUrl, corsProxy); 
          } catch (e2: any) {
            log(`Bỏ qua trang ${i} do lỗi: ${e2.message}`);
            continue;
          }
        }

        log(`Parsing trang ${i}...`);
        const parsed = parseHtmlContent(html);
        if (parsed.content) {
          const title = parsed.title || `Chương ${i}`;
          log(`Lọc thành công: ${title} (${parsed.content.length} chars)`);
          const newChunk = `\n\n====================\n${title}\n====================\n\n${parsed.content}`;
          onUpdateSource(prev => (prev + newChunk).trim());
        } else {
          log(`Trang ${i} không có nội dung hợp lệ.`);
        }
        
        if (i < end) await delay(300);
      }
      log(`Hoàn thành tải ${end - start + 1} trang.`);
    } catch (e: any) {
      setScrapeError("Quá trình tải thất bại: " + e.message);
      log(`Lỗi tải: ${e.message}`);
    } finally {
      setIsScraping(false);
      setScrapeProgress("");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col flex-1 overflow-hidden shadow-sm panel-shadow">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab("url")}
            className={`px-4 py-1.5 rounded-t-md text-xs font-semibold relative top-[1px] ${activeTab === "url" ? "bg-white border border-slate-200 border-b-white text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
          >
            URL Import
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`px-4 py-1.5 rounded-t-md text-xs font-semibold relative top-[1px] ${activeTab === "text" ? "bg-white border border-slate-200 border-b-white text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
          >
            Direct Text
          </button>
        </div>
        <div className="text-xs text-slate-400 flex items-center space-x-2">
          {activeTab === "text" && (
            <label className="text-indigo-600 hover:text-indigo-700 cursor-pointer font-medium flex items-center gap-1">
              <Upload className="w-3 h-3" /> Upload File
              <input type="file" accept=".txt,.doc,.docx" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          <span>{sourceText.length} characters</span>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-hidden flex flex-col space-y-4">
        {activeTab === "url" && (
          <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300 space-y-3 shrink-0">
            <div className="flex space-x-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pattern URL Base</label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://.../chapter_2.html"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs mono bg-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="w-20">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start</label>
                <input
                  type="number"
                  min="1"
                  value={pageStart}
                  onChange={(e) => setPageStart(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500 bg-white"
                />
              </div>
              <div className="w-20">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">End</label>
                <input
                  type="number"
                  min="1"
                  value={pageEnd}
                  onChange={(e) => setPageEnd(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500 bg-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleScrape}
                  disabled={isScraping}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-70 flex items-center h-[30px]"
                >
                  {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Analyze"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
               {scrapeError ? (
                 <span className="text-red-500">{scrapeError}</span>
               ) : (
                 <span className="text-slate-500">
                   {isScraping ? (
                      <span className="text-indigo-600 font-mono">{scrapeProgress}</span>
                   ) : urlInput ? "Ready to scrape" : "Enter a URL pattern"}
                 </span>
               )}
              <span className="text-slate-500">Proxy: <span className="text-emerald-600">Active</span></span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Original (Source)</label>
            {sourceText && (
               <button onClick={() => onUpdateSource("")} className="text-[10px] text-red-500 hover:underline">Clear</button>
            )}
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => onUpdateSource(e.target.value)}
            placeholder="Dán nội dung truyện vào đây..."
            className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans text-xs leading-relaxed text-slate-700"
          />
        </div>
      </div>
    </div>
  );
}
