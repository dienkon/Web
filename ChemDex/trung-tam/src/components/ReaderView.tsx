import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DocFull, getCategoryConfig, DocMeta } from '../utils/config';
import { 
  ArrowLeft, Bookmark, BookmarkCheck, Share2, Printer, Type, Play, Pause, 
  Square, ExternalLink, ArrowRight, Sun, Moon, SlidersHorizontal, Volume2, 
  Sparkles, Atom, FlaskConical, X 
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import 'katex/contrib/mhchem';
import { normalizeMathMarkdown } from '../../../shared/chemistry/math-markdown.mjs';
import { motion } from 'motion/react';
import { useSpeech } from '../hooks/useSpeech';
import { getRecommendationsForDoc } from '../utils/recommendations';
const SubstanceVisuals = React.lazy(() => import('./SubstanceVisuals').then(m => ({ default: m.SubstanceVisuals })));
import remarkStudyLinks from '../utils/remarkStudyLinks';

interface ReaderViewProps {
  doc: DocFull | null;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onTagClick?: (tag: string) => void;
  onDocClick?: (id: string) => void;
  relatedDoc?: DocMeta | null;
}

const colorBadgeStyles: Record<string, { badge: string; dot: string }> = {
  emerald: {
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300 light-badge-emerald',
    dot: 'bg-emerald-400'
  },
  sky: {
    badge: 'bg-sky-500/15 border-sky-500/30 text-sky-400 dark:bg-sky-500/20 dark:border-sky-500/40 dark:text-sky-300 light-badge-sky',
    dot: 'bg-sky-400'
  },
  amber: {
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300 light-badge-amber',
    dot: 'bg-amber-400'
  },
  rose: {
    badge: 'bg-rose-500/15 border-rose-500/30 text-rose-400 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-300 light-badge-rose',
    dot: 'bg-rose-400'
  },
  purple: {
    badge: 'bg-purple-500/15 border-purple-500/30 text-purple-400 dark:bg-purple-500/20 dark:border-purple-500/40 dark:text-purple-300 light-badge-purple',
    dot: 'bg-purple-400'
  },
  blue: {
    badge: 'bg-blue-500/15 border-blue-500/30 text-blue-400 dark:bg-blue-500/20 dark:border-blue-500/40 dark:text-blue-300 light-badge-blue',
    dot: 'bg-blue-400'
  }
};

export function ReaderView({ doc, onBack, isBookmarked, onToggleBookmark, onTagClick, onDocClick, relatedDoc }: ReaderViewProps) {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isLight, setIsLight] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.body.classList.contains('light-mode');
    }
    return true;
  });
  const [showSpeechSettings, setShowSpeechSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const { 
    speak, stop, togglePause, testVoice, isSpeaking, isPaused,
    rate, setRate, pitch, setPitch, gender, setGender,
    vietnameseVoices, selectedVoiceURI, setSelectedVoiceURI
  } = useSpeech();
  
  const catConfig = getCategoryConfig(doc?.category ?? '');
  const headingId = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const sections = (doc?.content ?? '').split('\n').filter(line=>/^## /.test(line)).map(line=>line.slice(3).trim());

  const recommendations = useMemo(() => doc ? getRecommendationsForDoc(doc.id) : [], [doc?.id]);

  useEffect(() => {
    const checkMode = () => {
      setIsLight(document.body.classList.contains('light-mode'));
    };
    checkMode();
  }, []);

  // Close speech settings popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSpeechSettings(false);
      }
    }
    if (showSpeechSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeechSettings]);

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

  if (!doc) return null;

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
      {/* Sticky Reader Toolbar - Compact & Slim h-12 to preserve reading space */}
      <div className="reader-toolbar backdrop-blur-md px-3 sm:px-6 h-12 flex items-center justify-between no-print shadow-xs transition-colors">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800/40 dark:hover:bg-slate-800/50 transition-colors"
          title="Quay lại danh sách tài liệu"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline text-xs font-semibold">Quay lại</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5 relative">
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-slate-800/40 dark:hover:bg-slate-800/50 transition-colors"
            title={isLight ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
          </button>

          <button 
            onClick={cycleFontSize}
            className="p-1.5 rounded-lg hover:bg-slate-800/40 dark:hover:bg-slate-800/50 transition-colors"
            title="Đổi cỡ chữ đọc"
          >
            <Type size={16} />
          </button>
          
          {/* Audio TTS Toolbar Group */}
          <div className="flex items-center bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50 p-0.5">
            <button 
              onClick={handleReadText}
              className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
                isSpeaking && !isPaused ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-slate-700/50 text-slate-300'
              }`}
              title={isSpeaking ? (isPaused ? "Tiếp tục đọc" : "Tạm dừng") : "Đọc văn bản"}
            >
              {isSpeaking && !isPaused ? <Pause size={15} /> : <Play size={15} />}
              <span className="text-[11px] font-bold hidden md:inline px-0.5">
                {isSpeaking && !isPaused ? 'Tạm dừng' : 'Đọc'}
              </span>
            </button>

            {isSpeaking && (
              <button 
                onClick={stop}
                className="p-1.5 rounded-md hover:text-red-400 hover:bg-red-500/10 text-slate-400 transition-colors"
                title="Dừng đọc"
              >
                <Square size={13} />
              </button>
            )}

            <button
              onClick={() => setShowSpeechSettings(prev => !prev)}
              className={`p-1.5 rounded-md flex items-center gap-0.5 transition-colors ${
                showSpeechSettings ? 'bg-sky-500 text-white shadow-xs' : 'hover:bg-slate-700/50 text-slate-300'
              }`}
              title="Cài đặt giọng đọc (Nam/Nữ, tốc độ, cao độ)"
            >
              <SlidersHorizontal size={14} />
              {rate !== 1 && (
                <span className="text-[10px] font-mono font-bold text-sky-400">
                  {rate}x
                </span>
              )}
            </button>
          </div>

          <button 
            onClick={() => onToggleBookmark(doc.id)}
            className="p-1.5 rounded-lg hover:bg-slate-800/40 dark:hover:bg-slate-800/50 transition-colors"
            title="Lưu tài liệu"
          >
            {isBookmarked ? (
              <BookmarkCheck size={16} className="text-yellow-500 fill-yellow-500/20" />
            ) : (
              <Bookmark size={16} />
            )}
          </button>

          <button 
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-slate-800/40 dark:hover:bg-slate-800/50 transition-colors hidden sm:block"
            title="Chia sẻ"
          >
            <Share2 size={16} />
          </button>

          <button 
            onClick={handlePrint}
            className="p-1.5 rounded-lg hover:bg-slate-800/40 dark:hover:bg-slate-800/50 transition-colors"
            title="In tài liệu"
          >
            <Printer size={16} />
          </button>

          {/* Floating TTS Settings Popover */}
          {showSpeechSettings && (
            <div 
              ref={settingsRef}
              className="absolute right-0 top-11 z-50 w-[310px] sm:w-[350px] p-4 rounded-2xl shadow-2xl backdrop-blur-xl border reader-tts-popover animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/40">
                <div className="flex items-center gap-2">
                  <Volume2 size={16} className="text-sky-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Cài đặt giọng đọc AI (TTS)</h4>
                </div>
                <button 
                  onClick={() => setShowSpeechSettings(false)}
                  className="p-1 rounded-md hover:bg-slate-700/40 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Đóng"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Voice Gender selection */}
              <div className="mb-3.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">
                  Giọng đọc (Tiếng Việt vi-VN)
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      gender === 'female' 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>👩</span>
                    <span>Giọng Nữ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      gender === 'male' 
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>👨</span>
                    <span>Giọng Nam</span>
                  </button>
                </div>
              </div>

              {/* Reading Speed */}
              <div className="mb-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tốc độ đọc</label>
                  <span className="text-xs font-mono font-bold text-sky-400">{rate}x</span>
                </div>
                <div className="grid grid-cols-5 gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs">
                  {([0.75, 1, 1.25, 1.5, 2] as const).map(speed => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setRate(speed)}
                      className={`py-1 rounded-lg font-mono font-bold transition-all text-center ${
                        rate === speed 
                          ? 'bg-sky-500 text-white shadow-xs' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Modulation */}
              <div className="mb-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cao độ (Pitch)</label>
                  <span className="text-xs font-mono font-bold text-sky-400">{pitch.toFixed(2)}x</span>
                </div>
                <input 
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={pitch}
                  onChange={e => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                  <span>Trầm (0.8x)</span>
                  <span>Tiêu chuẩn (1.0x)</span>
                  <span>Thanh (1.3x)</span>
                </div>
              </div>

              {/* Voice Dropdown if multiple Vietnamese voices exist */}
              {vietnameseVoices.length > 1 && (
                <div className="mb-3.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">
                    Bộ tổng hợp giọng ({vietnameseVoices.length} giọng vi-VN)
                  </label>
                  <select
                    value={selectedVoiceURI}
                    onChange={e => setSelectedVoiceURI(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Tự động tối ưu theo giới tính ({gender === 'male' ? 'Nam' : 'Nữ'})</option>
                    {vietnameseVoices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Test Voice action */}
              <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => testVoice()}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play size={13} />
                  <span>Nghe thử giọng</span>
                </button>
                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stop}
                    className="py-1.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Dừng
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <motion.main 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12"
      >
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
            {catConfig && (
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-xs ${catConfig.badgeClass}`}>
                {catConfig.label}
              </span>
            )}
            <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Chuyên mục: Lịch sử &amp; Sự ra đời của chất
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold reader-title mb-4 leading-tight tracking-tight">
            {doc.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2.5 reader-meta text-xs sm:text-sm font-medium">
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
          <div className="mb-8 rounded-3xl reader-formula-card p-4 sm:p-6 shadow-md no-print overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1 w-full">
                <p className="mb-1.5 text-xs font-extrabold uppercase tracking-widest reader-formula-title">
                  Kỳ báo Hóa học • Định danh &amp; Khởi nguyên phân tử
                </p>
                <strong
                  data-chemical-formula
                  className="block break-all font-mono text-2xl sm:text-4xl font-extrabold reader-formula-text px-4 py-2 rounded-2xl shadow-xs w-full"
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
          <div className="w-full h-[260px] sm:h-[340px] rounded-3xl overflow-hidden mb-8 bg-sky-50 border border-sky-200 shadow-md no-print">
            <img 
              src={doc.image} 
              alt={doc.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <React.Suspense fallback={null}><SubstanceVisuals key={doc.id} slug={doc.slug ?? doc.id} /></React.Suspense>

        {sections.length > 0 && (
          <nav aria-label="Mục lục bài viết" className="mb-6 rounded-2xl reader-toc-card p-4 sm:p-5 shadow-xs no-print">
            <h2 className="mb-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider reader-toc-title">✦ Mục lục kỳ báo khoa học</h2>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {sections.map((title, index) => (
                <li key={title}>
                  <a className="text-xs sm:text-sm font-semibold reader-toc-link transition-colors" href={'#' + headingId(title)}>
                    {index + 1}. {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {doc.documentKind === 'reference' && (
          <p className="mb-6 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-xs sm:text-sm leading-relaxed text-amber-950 font-medium">
            <strong>Tạp chí Hóa Học Số ChemDex:</strong> Bài báo tái hiện chi tiết lịch sử phát hiện, nguồn gốc tự nhiên, con đường điều chế và bản chất liên kết không gian 3D của chất dựa trên dữ liệu thực nghiệm đã kiểm chứng.
          </p>
        )}

        <article className={`reader-article-card markdown-body rounded-3xl p-5 sm:p-9 shadow-sm ${fontClasses[fontSize]}`}>
          <div className="text-base sm:text-lg reader-summary-box mb-6 font-semibold leading-relaxed italic py-3.5 px-4 sm:px-5 rounded-r-2xl">
            {doc.summary}
          </div>
          <Markdown 
            components={{
              h2: ({children}) => <h2 id={headingId(String(children))} className="scroll-mt-16">{children}</h2>
            }} 
            rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
            remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }], remarkStudyLinks]}
          >
            {normalizeMathMarkdown(doc.content)}
          </Markdown>
        </article>
        
        {/* Tags */}
        <div className="mt-10 pt-6 border-t border-slate-700/30 flex flex-wrap gap-2 no-print reader-tags">
          {doc.tags.map(tag => (
            <button 
              key={tag} 
              onClick={() => onTagClick?.(tag)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Intelligent Recommendation Widget */}
        <div className="mt-14 reader-suggestions rounded-3xl overflow-hidden no-print shadow-sm">
          <div className="p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={18} className="text-amber-400" />
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">Tài liệu gợi ý &amp; Mạng lưới liên kết</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Gợi ý thông minh dựa trên vị trí Bảng tuần hoàn, phản ứng hóa học thực nghiệm và lịch sử phát hiện.
                </p>
              </div>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {recommendations.map(rec => {
                  const style = colorBadgeStyles[rec.color] || colorBadgeStyles.sky;
                  return (
                    <button
                      key={rec.doc.id}
                      type="button"
                      onClick={() => onDocClick?.(rec.doc.id)}
                      className="text-left p-4 sm:p-5 rounded-2xl reader-rec-card transition-all duration-200 group flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {rec.label}
                          </span>
                          {rec.doc.chemicalFormula && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800/80 text-sky-300 border border-slate-700/60 light-formula-pill">
                              {rec.doc.chemicalFormula}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm sm:text-base leading-snug mb-1.5 group-hover:text-sky-400 transition-colors line-clamp-2">
                          {rec.doc.title}
                        </h4>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {rec.desc}
                        </p>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-slate-700/30 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-sky-400 transition-colors">
                        <span>{rec.doc.category === 'nguyento' ? 'Nguyên tố hóa học' : 'Hợp chất & Phân tử'} • {rec.doc.readingMinutes || 5} phút đọc</span>
                        <div className="flex items-center gap-1 text-sky-400 group-hover:translate-x-1 transition-transform">
                          <span>Xem chi tiết</span>
                          <ArrowRight size={13} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : relatedDoc ? (
              <button
                type="button"
                onClick={() => onDocClick?.(relatedDoc.id)}
                className="w-full text-left flex items-center justify-between p-4 rounded-xl border reader-rec-card transition-all group"
              >
                <div>
                  <p className="text-xs text-blue-400 font-semibold mb-1 uppercase tracking-wider">Có thể bạn sẽ thích</p>
                  <h4 className="font-medium group-hover:text-blue-400 transition-colors">
                    {relatedDoc.title}
                  </h4>
                </div>
                <ArrowRight className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" size={18} />
              </button>
            ) : null}

            {/* Quick External Links Row */}
            <div className="mt-6 pt-5 border-t border-slate-700/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="/"
                className="flex items-center justify-between p-3.5 rounded-xl border reader-rec-card hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Atom size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold group-hover:text-emerald-400 transition-colors">Bảng Tuần Hoàn Tương Tác</h5>
                    <p className="text-[11px] text-slate-400">Tra cứu 118 nguyên tố và mô hình Bohr</p>
                  </div>
                </div>
                <ExternalLink className="text-slate-500 group-hover:text-emerald-400 transition-colors" size={15} />
              </a>

              <a
                href="/lab-safety/"
                className="flex items-center justify-between p-3.5 rounded-xl border reader-rec-card hover:border-purple-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
                    <FlaskConical size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold group-hover:text-purple-400 transition-colors">Phòng Thí Nghiệm An Toàn</h5>
                    <p className="text-[11px] text-slate-400">Quy tắc chuẩn GHS và xử lý sự cố thực hành</p>
                  </div>
                </div>
                <ExternalLink className="text-slate-500 group-hover:text-purple-400 transition-colors" size={15} />
              </a>
            </div>
          </div>
        </div>

      </motion.main>
    </div>
  );
}
