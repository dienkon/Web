import { useState } from "react";
import { Download, Copy, RefreshCw, Check, Code, Columns, AlignLeft, Settings2, Sparkles, Clock, History, Edit3, MessageSquare, FileText, Archive, X } from "lucide-react";
import { Chunk, HistoryEntry } from "../../types";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";

interface Props {
  chunks: Chunk[];
  onRetryChunk?: (id: string) => void;
  history: HistoryEntry[];
  onLoadHistory?: (entry: HistoryEntry) => void;
  onClearHistory?: () => void;
  onRetranslate?: (feedback: string) => void;
}

export function OutputPanel({ chunks, onRetryChunk, history = [], onLoadHistory, onClearHistory, onRetranslate }: Props) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [viewMode, setViewMode] = useState<"translation" | "split">("translation");
  const [activeTab, setActiveTab] = useState<"translation" | "analysis" | "history" | "review">("translation");
  const [feedbackText, setFeedbackText] = useState("");
  
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  const getCombinedText = () => {
    return chunks.map(c => (c.title ? c.title + "\n\n" : "") + (c.translatedText || c.text)).join('\n\n====================\n\n');
  };

  const handleCopy = async (textToCopy: string) => {
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowCopyMenu(false);
  };

  const getDownloadFileName = (ext: string) => {
    let name = "Ban_Dich";
    if (chunks.length > 0) {
       const firstTitle = chunks[0].title;
       const lastTitle = chunks[chunks.length - 1].title;
       
       if (firstTitle && chunks.length === 1) {
          name = firstTitle;
       } else if (firstTitle && lastTitle) {
          name = `${firstTitle} den ${lastTitle}`;
       }
    }
    name = name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s]/g, "").trim().replace(/\s+/g, "_");
    if (!name) name = "Ban_Dich";
    return `${name}_${new Date().getTime()}.${ext}`;
  };

  const handleDownloadTxt = () => {
    const text = getCombinedText();
    const blob = new Blob([text], { type: "text/plain" });
    saveAs(blob, getDownloadFileName("txt"));
    setShowDownloadMenu(false);
  };

  const handleDownloadDocx = async () => {
    const text = getCombinedText();
    const paragraphs = text.split('\n').map(line => new Paragraph({
      children: [new TextRun(line)]
    }));

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, getDownloadFileName("docx"));
    setShowDownloadMenu(false);
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const title = (chunk.title || `Chuong_${index + 1}`).trim().replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s]/g, "_");
      const content = chunk.translatedText || chunk.text || "";
      if (content) {
         const chunkText = `${chunk.title ? chunk.title + "\n\n" : ""}${content}`;
         const doc = new Document({
           sections: [{
             properties: {},
             children: chunkText.split('\n').map(line => new Paragraph({
               children: [new TextRun(line)]
             }))
           }]
         });
         const blob = await Packer.toBlob(doc);
         zip.file(`${title}.docx`, blob);
      }
    }
    
    // Add full combined as well
    const fullDoc = new Document({
      sections: [{
        properties: {},
        children: getCombinedText().split('\n').map(line => new Paragraph({
          children: [new TextRun(line)]
        }))
      }]
    });
    const fullBlob = await Packer.toBlob(fullDoc);
    zip.file(`Toan_bo_${getDownloadFileName("docx")}`, fullBlob);
    
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, getDownloadFileName("zip"));
    setShowDownloadMenu(false);
  };

  const handleSubmitFeedback = () => {
    if (onRetranslate && feedbackText.trim()) {
      onRetranslate(feedbackText);
      setFeedbackText("");
      setActiveTab("translation");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-2 bg-slate-50 border-b border-slate-200 shrink-0 h-12 overflow-x-auto hide-scrollbar">
        <div className="flex h-full min-w-max">
          <button
            onClick={() => setActiveTab("translation")}
            className={`px-3 h-full text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === "translation" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"}`}
          >
            <AlignLeft className="w-3.5 h-3.5" /> Translation
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-3 h-full text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === "analysis" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Analysis
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 h-full text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === "history" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"}`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`px-3 h-full text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === "review" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"}`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Đánh giá lại
          </button>
        </div>
        
        {activeTab === "translation" && (
          <div className="flex space-x-1 items-center pr-2 shrink-0">
             <div className="flex bg-slate-100 rounded border border-slate-200 p-0.5 mr-2">
              <button 
                onClick={() => setViewMode("translation")} 
                className={`p-1 rounded ${viewMode === "translation" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="Chỉ bản dịch"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button 
                onClick={() => setViewMode("split")} 
                className={`p-1 rounded ${viewMode === "split" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="So sánh song song"
              >
                <Columns className="w-3 h-3" />
              </button>
            </div>
            <button onClick={() => setShowRaw(!showRaw)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="JSON Raw"><Code className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowCopyMenu(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Copy">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            
            <button onClick={() => setShowDownloadMenu(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Download">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative bg-white">
        {activeTab === "translation" && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {chunks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[11px] text-slate-400">
                Bản dịch sẽ hiển thị ở đây...
              </div>
            ) : (
              chunks.map((chunk, index) => (
                <div key={chunk.id} className={`border-l-2 pl-3 py-1 ${chunk.status === 'success' ? 'border-emerald-500' : chunk.status === 'translating' ? 'border-indigo-500 bg-indigo-50/30' : 'border-red-500 bg-red-50'}`}>
                   <div className="flex justify-between items-center mb-1">
                     <p className={`text-[10px] font-bold ${chunk.status === 'success' ? 'text-slate-900' : chunk.status === 'translating' ? 'text-indigo-700' : 'text-red-700'}`}>
                       {chunk.title || `Chunk ${index + 1}`} - {chunk.status === 'success' ? 'Completed' : chunk.status === 'translating' ? 'In Progress' : 'Error'}
                     </p>
                     {chunk.status === 'success' && <span className="text-[9px] text-slate-500">{chunk.translatedText?.length || 0} chars</span>}
                     {chunk.status === 'error' && onRetryChunk && (
                        <button onClick={() => onRetryChunk(chunk.id)} className="text-[9px] text-red-600 underline">Thử lại</button>
                     )}
                  </div>
                  
                  {chunk.status === 'translating' ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-indigo-600 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-1 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <span className="text-[9px] text-indigo-600">Awaiting AI response...</span>
                    </div>
                  ) : chunk.status === 'error' ? (
                    <div className="mt-1">
                      <p className="text-[10px] text-red-600">{chunk.error}</p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                       {showRaw && (
                         <div className="p-2 bg-slate-100 text-[10px] font-mono text-slate-500 rounded whitespace-pre-wrap">
                            {chunk.text}
                         </div>
                       )}
                       
                       {viewMode === "split" ? (
                         <div className="grid grid-cols-2 gap-4 border border-slate-100 rounded p-3 bg-slate-50/50">
                           <div className="border-r border-slate-200 pr-3">
                             <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans bg-transparent">{chunk.text}</p>
                           </div>
                           <div className="pl-1">
                             <p className="text-[15px] text-slate-900 leading-relaxed whitespace-pre-wrap bg-transparent" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{chunk.translatedText}</p>
                           </div>
                         </div>
                       ) : (
                         <p className="text-[16px] text-slate-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{chunk.translatedText}</p>
                       )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="h-full overflow-y-auto p-6 bg-white space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> AI Context Memory
              </h4>
              <p className="text-xs text-slate-500 mt-1">Thông tin ngữ cảnh được AI ghi nhớ trong quá trình dịch.</p>
            </div>
            
            <div className="space-y-6">
              {chunks.filter(c => c.summary || c.notes?.length || c.glossaryUpdates?.length).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Chưa có dữ liệu phân tích. Bắt đầu dịch để xem.
                </div>
              ) : (
                chunks.filter(c => c.summary || c.notes?.length || c.glossaryUpdates?.length).map((c, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">CHUNK {i + 1}</span>
                    </div>
                    
                    {c.summary && (
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1 block">Tóm tắt (Summary)</span>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded border border-slate-100 shadow-sm">{c.summary}</p>
                      </div>
                    )}
                    
                    {c.notes && c.notes.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1 block">Ghi chú (Notes)</span>
                        <ul className="space-y-1.5">
                          {c.notes.map((note, idx) => (
                            <li key={idx} className="text-xs text-slate-700 bg-white p-2 rounded border border-amber-100/50 flex items-start gap-2 shadow-sm">
                              <span className="text-amber-500 mt-0.5">▪</span>
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.glossaryUpdates && c.glossaryUpdates.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 block">Thuật ngữ mới (New Terms)</span>
                        <div className="grid grid-cols-2 gap-2">
                          {c.glossaryUpdates.map((g, idx) => (
                            <div key={idx} className="bg-white border border-emerald-100 rounded p-2 flex flex-col shadow-sm">
                              <span className="text-[10px] text-slate-500">{g.original}</span>
                              <span className="text-xs font-semibold text-emerald-700">{g.translated}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="h-full overflow-y-auto p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800">Lịch sử dịch</h4>
              <button onClick={onClearHistory} className="text-[10px] text-red-500 hover:underline">Xóa tất cả</button>
            </div>
            
            {history.length === 0 ? (
               <div className="text-center py-12 text-slate-400 text-xs">
                 Chưa có lịch sử dịch.
               </div>
            ) : (
              <div className="space-y-2">
                {history.map(entry => (
                  <div key={entry.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => onLoadHistory && onLoadHistory(entry)}>
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="text-xs font-bold text-slate-800 truncate pr-4">{entry.title || "Không có tiêu đề"}</h5>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">{new Date(entry.date).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{entry.chunks.length} chunks</span>
                      <span className="text-[10px] text-indigo-600 font-medium group-hover:underline">Tải lại &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "review" && (
          <div className="h-full overflow-y-auto p-6 bg-slate-50">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" /> Đánh giá bản dịch
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Bạn thấy bản dịch chưa tốt? Hãy mô tả lỗi (vd: xưng hô sai, dịch sót ý, văn phong quá hiện đại...) để AI dịch lại toàn bộ.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Nhập nhận xét của bạn vào đây..."
              className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmitFeedback}
                disabled={!feedbackText.trim() || chunks.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Dịch lại với đánh giá
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Copy Modal */}
      {showCopyMenu && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Copy className="w-4 h-4 text-indigo-500"/> Sao chép bản dịch</h3>
              <button onClick={() => setShowCopyMenu(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <button onClick={() => handleCopy(getCombinedText())} className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg mb-2 transition-colors">
                Sao chép toàn bộ ({chunks.length} phần)
              </button>
              
              {chunks.length > 1 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Hoặc sao chép từng phần</h4>
                  <div className="space-y-1">
                    {chunks.map((c, i) => (
                      <button key={c.id} onClick={() => handleCopy((c.title ? c.title + "\n\n" : "") + (c.translatedText || c.text))} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 border border-slate-100 rounded-lg text-xs truncate transition-colors">
                        {c.title || `Phần ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowCopyMenu(false)} className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadMenu && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Download className="w-4 h-4 text-indigo-500"/> Tải xuống bản dịch</h3>
              <button onClick={() => setShowDownloadMenu(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={handleDownloadTxt} className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl transition-all text-left group">
                 <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600">
                   <FileText className="w-5 h-5" />
                 </div>
                 <div>
                   <div className="font-bold text-slate-800 text-sm">Tải file TXT</div>
                   <div className="text-[11px] text-slate-500">Gộp chung toàn bộ bản dịch</div>
                 </div>
              </button>

              <button onClick={handleDownloadDocx} className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl transition-all text-left group">
                 <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600">
                   <FileText className="w-5 h-5" />
                 </div>
                 <div>
                   <div className="font-bold text-slate-800 text-sm">Tải file DOCX (Word)</div>
                   <div className="text-[11px] text-slate-500">Giữ nguyên định dạng đoạn văn</div>
                 </div>
              </button>

              {chunks.length > 1 && (
                <button onClick={handleDownloadZip} className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl transition-all text-left group">
                   <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600">
                     <Archive className="w-5 h-5" />
                   </div>
                   <div>
                     <div className="font-bold text-slate-800 text-sm">Tải file ZIP</div>
                     <div className="text-[11px] text-slate-500">Tách riêng từng chương thành các file DOCX</div>
                   </div>
                </button>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowDownloadMenu(false)} className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
