import React, { useState, useEffect } from 'react';
import { DocFull, getCategoryConfig, DocMeta } from '../utils/config';
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, Printer, Type, Play, Pause, Square, ExternalLink, ArrowRight, Sun, Moon } from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';
import { useSpeech } from '../hooks/useSpeech';

interface ReaderViewProps {
  doc: DocFull | null;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onTagClick?: (tag: string) => void;
  onDocClick?: (id: string) => void;
  relatedDoc?: DocMeta | null;
}

export function ReaderView({ doc, onBack, isBookmarked, onToggleBookmark, onTagClick, onDocClick, relatedDoc }: ReaderViewProps) {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isLight, setIsLight] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.body.classList.contains('light-mode');
    }
    return true;
  });
  const { speak, stop, togglePause, isSpeaking, isPaused } = useSpeech();
  
  if (!doc) return null;

  const catConfig = getCategoryConfig(doc.category);
  const headingId = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const sections = doc.content.split('\n').filter(line=>/^## /.test(line)).map(line=>line.slice(3).trim());

  useEffect(() => {
    // Keep local state in sync with body class
    const checkMode = () => {
      setIsLight(document.body.classList.contains('light-mode'));
    };
    checkMode();
  }, []);

  const toggleTheme = () => {
    setIsLight(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        localStorage.setItem('chemdex_doc_theme', 'light');
      } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('chemdex_doc_theme', 'dark');
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: doc.title,
        text: doc.summary,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã copy link vào clipboard!');
    }
  };

  const cycleFontSize = () => {
    setFontSize(prev => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  };

  const handleReadText = () => {
    if (isSpeaking) {
      togglePause();
    } else {
      const textToRead = `${doc.title}. ${doc.summary}. ${doc.content}`;
      speak(textToRead);
    }
  };

  const fontClasses = {
    normal: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  };

  return (
    <div className={`min-h-screen reader-container print-container ${isLight ? 'is-light' : 'is-dark'}`}>
      {/* Sticky Reader Toolbar */}
      <div className="sticky top-0 z-40 reader-toolbar backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between no-print">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 hover:opacity-80 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline font-medium">Quay lại</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:opacity-80 transition-colors"
            title={isLight ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}
          >
            {isLight ? <Moon size={20} /> : <Sun size={20} className="text-amber-400" />}
          </button>

          <button 
            onClick={cycleFontSize}
            className="p-2 rounded-xl hover:opacity-80 transition-colors"
            title="Đổi cỡ chữ"
          >
            <Type size={20} />
          </button>
          
          <div className="flex items-center bg-slate-800/40 rounded-xl overflow-hidden mr-1 sm:mr-2 border border-slate-700/30">
            <button 
              onClick={handleReadText}
              className={`p-2 flex items-center gap-1 transition-colors ${
                isSpeaking && !isPaused ? 'bg-blue-500/20 text-blue-400' : 'hover:opacity-80'
              }`}
              title="Đọc văn bản"
            >
              {isSpeaking && !isPaused ? <Pause size={20} /> : <Play size={20} />}
            </button>
            {isSpeaking && (
              <button 
                onClick={stop}
                className="p-2 hover:text-red-400 transition-colors"
                title="Dừng đọc"
              >
                <Square size={16} />
              </button>
            )}
          </div>

          <button 
            onClick={() => onToggleBookmark(doc.id)}
            className="p-2 rounded-xl hover:opacity-80 transition-colors"
            title="Lưu tài liệu"
          >
            {isBookmarked ? (
              <BookmarkCheck size={20} className="text-yellow-500 fill-yellow-500/20" />
            ) : (
              <Bookmark size={20} />
            )}
          </button>

          <button 
            onClick={handleShare}
            className="p-2 rounded-xl hover:opacity-80 transition-colors hidden sm:block"
            title="Chia sẻ"
          >
            <Share2 size={20} />
          </button>

          <button 
            onClick={handlePrint}
            className="p-2 rounded-xl hover:opacity-80 transition-colors"
            title="In tài liệu"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <motion.main 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16"
      >
        <header className="mb-8 sm:mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-5 no-print">
            {catConfig && (
              <span className={`inline-block px-3.5 py-1 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-xs ${catConfig.badgeClass}`}>
                {catConfig.label}
              </span>
            )}
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Chuyên mục: Lịch sử &amp; Sự ra đời của chất
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold reader-title mb-5 leading-tight tracking-tight">
            {doc.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 reader-meta text-sm font-medium">
            <span className="font-bold meta-author">{doc.author}</span>
            <span>•</span>
            <span>{doc.readingMinutes ?? Math.ceil(doc.content.length / 1000)} phút đọc</span>
            <span>•</span>
            <span className="font-semibold">{doc.content.trim().split(/\s+/).length.toLocaleString('vi-VN')} chữ</span>
            {doc.substanceIds?.[0] && (
              <>
                <span>•</span>
                <a
                  href={`/tien-ich/cau-truc-3d/?compound=${encodeURIComponent(doc.substanceIds[0])}`}
                  className="inline-flex items-center gap-1 meta-3d-link font-bold underline underline-offset-4"
                >
                  Khám phá mô hình 3D tương tác ↗
                </a>
              </>
            )}
          </div>
        </header>

        {doc.chemicalFormula ? (
          <div className="mb-10 rounded-3xl reader-formula-card p-5 sm:p-7 shadow-md no-print overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="min-w-0 flex-1 w-full">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-widest reader-formula-title">
                  Kỳ báo Hóa học • Định danh &amp; Khởi nguyên phân tử
                </p>
                <strong
                  data-chemical-formula
                  className="block break-all font-mono text-2xl sm:text-4xl font-extrabold reader-formula-text px-4 py-2.5 rounded-2xl shadow-xs w-full"
                >
                  {doc.chemicalFormula}
                </strong>
              </div>
              <div className="w-full sm:w-64 aspect-[16/9] rounded-2xl overflow-hidden border border-sky-200/80 shadow-sm shrink-0 bg-white">
                <img
                  src={doc.image || '/assets/library/covalent-bonds.svg'}
                  alt={doc.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-[280px] sm:h-[380px] rounded-3xl overflow-hidden mb-10 bg-sky-50 border border-sky-200 shadow-md no-print">
            <img 
              src={doc.image} 
              alt={doc.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {sections.length > 0 && <nav aria-label="Mục lục bài viết" className="mb-8 rounded-2xl reader-toc-card p-5 shadow-xs no-print">
          <h2 className="mb-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider reader-toc-title">✦ Mục lục kỳ báo khoa học</h2>
          <ol className="grid gap-2 sm:grid-cols-2">{sections.map((title,index)=><li key={title}><a className="text-sm font-semibold reader-toc-link transition-colors" href={'#'+headingId(title)}>{index+1}. {title}</a></li>)}</ol>
        </nav>}
        {doc.documentKind === 'reference' && <p className="mb-6 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950 font-medium"><strong>Tạp chí Hóa Học Số ChemDex:</strong> Bài báo tái hiện chi tiết lịch sử phát hiện, nguồn gốc tự nhiên, con đường điều chế và bản chất liên kết không gian 3D của chất dựa trên dữ liệu thực nghiệm đã kiểm chứng.</p>}
        <article className={`reader-article-card markdown-body rounded-3xl p-5 sm:p-9 shadow-sm ${fontClasses[fontSize]}`}>
          <div className="text-lg sm:text-xl reader-summary-box mb-8 font-semibold leading-relaxed italic py-4 px-5 rounded-r-2xl">
            {doc.summary}
          </div>
          <Markdown components={{h2: ({children}) => <h2 id={headingId(String(children))} className="scroll-mt-24">{children}</h2>}} rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{doc.content}</Markdown>
        </article>
        
        {/* Tags */}
        <div className="mt-12 pt-8 border-t border-slate-700/30 flex flex-wrap gap-2 no-print reader-tags">
          {doc.tags.map(tag => (
            <button 
              key={tag} 
              onClick={() => onTagClick?.(tag)}
              className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Suggestions Section */}
        <div className="mt-16 reader-suggestions rounded-2xl overflow-hidden no-print">
          <div className="p-6 sm:p-8">
            <h3 className="text-xl font-bold mb-6">Tài liệu gợi ý</h3>
            
            <div className="space-y-4">
              {/* Internal Link */}
              {relatedDoc && (
                <div 
                  onClick={() => onDocClick?.(relatedDoc.id)}
                  className="flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl border border-slate-700/40 cursor-pointer transition-all group"
                >
                  <div>
                    <p className="text-xs text-blue-400 font-semibold mb-1 uppercase tracking-wider">Có thể bạn sẽ thích</p>
                    <h4 className="font-medium group-hover:text-blue-400 transition-colors">
                      {relatedDoc.title}
                    </h4>
                  </div>
                  <ArrowRight className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" size={20} />
                </div>
              )}

              {/* External Links */}
              <a 
                href="/" 
                className="flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl border border-slate-700/40 transition-all group"
              >
                <div>
                  <p className="text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wider">Liên kết ngoài</p>
                  <h4 className="font-medium group-hover:text-emerald-400 transition-colors">Xem tương tác trên Bảng Tuần Hoàn</h4>
                </div>
                <ExternalLink className="text-slate-500 group-hover:text-emerald-400 transition-colors" size={20} />
              </a>

              <a 
                href="/lab-safety/" 
                className="flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl border border-slate-700/40 transition-all group"
              >
                <div>
                  <p className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">Thực hành</p>
                  <h4 className="font-medium group-hover:text-purple-400 transition-colors">Phòng thí nghiệm an toàn</h4>
                </div>
                <ExternalLink className="text-slate-500 group-hover:text-purple-400 transition-colors" size={20} />
              </a>
            </div>
          </div>
        </div>

      </motion.main>
    </div>
  );
}
