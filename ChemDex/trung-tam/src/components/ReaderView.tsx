import React, { useState } from 'react';
import { DocFull, getCategoryConfig, DocMeta } from '../utils/config';
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, Printer, Type, Play, Pause, Square, ExternalLink, ArrowRight } from 'lucide-react';
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
  const { speak, stop, togglePause, isSpeaking, isPaused } = useSpeech();
  
  if (!doc) return null;

  const catConfig = getCategoryConfig(doc.category);

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
    <div className="min-h-screen bg-[#1E293B] print-container">
      {/* Sticky Reader Toolbar */}
      <div className="sticky top-0 z-40 bg-[#1E293B]/90 backdrop-blur-md border-b border-slate-700/50 px-4 sm:px-6 h-16 flex items-center justify-between no-print">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline font-medium">Quay lại</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={cycleFontSize}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Đổi cỡ chữ"
          >
            <Type size={20} />
          </button>
          
          <div className="flex items-center bg-slate-800 rounded-xl overflow-hidden mr-1 sm:mr-2">
            <button 
              onClick={handleReadText}
              className={`p-2 flex items-center gap-1 transition-colors ${
                isSpeaking && !isPaused ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Đọc văn bản"
            >
              {isSpeaking && !isPaused ? <Pause size={20} /> : <Play size={20} />}
            </button>
            {isSpeaking && (
              <button 
                onClick={stop}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                title="Dừng đọc"
              >
                <Square size={16} />
              </button>
            )}
          </div>

          <button 
            onClick={() => onToggleBookmark(doc.id)}
            className="p-2 rounded-xl hover:bg-slate-800 transition-colors"
            title="Lưu tài liệu"
          >
            {isBookmarked ? (
              <BookmarkCheck size={20} className="text-yellow-500 fill-yellow-500/20" />
            ) : (
              <Bookmark size={20} className="text-slate-400" />
            )}
          </button>

          <button 
            onClick={handleShare}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
            title="Chia sẻ"
          >
            <Share2 size={20} />
          </button>

          <button 
            onClick={handlePrint}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
        <header className="mb-10 sm:mb-14">
          {catConfig && (
            <span className={`inline-block mb-6 px-3 py-1 rounded-full text-sm font-medium ${catConfig.badgeClass} no-print`}>
              {catConfig.label}
            </span>
          )}
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {doc.title}
          </h1>
          
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <span className="font-medium text-slate-300">{doc.author}</span>
            <span>•</span>
            <span>{Math.ceil(doc.content.length / 1000)} phút đọc</span>
          </div>
        </header>

        <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-2xl overflow-hidden mb-12 bg-slate-800 no-print">
          <img 
            src={doc.image} 
            alt={doc.title} 
            className="w-full h-full object-cover"
          />
        </div>

        <article className={`markdown-body ${fontClasses[fontSize]}`}>
          <div className="text-xl text-slate-300 mb-8 font-medium leading-relaxed italic border-l-4 border-slate-700 pl-6">
            {doc.summary}
          </div>
          <Markdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{doc.content}</Markdown>
        </article>
        
        {/* Tags */}
        <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-wrap gap-2 no-print">
          {doc.tags.map(tag => (
            <button 
              key={tag} 
              onClick={() => onTagClick?.(tag)}
              className="px-3 py-1 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600 rounded-lg text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Suggestions Section */}
        <div className="mt-16 bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden no-print">
          <div className="p-6 sm:p-8">
            <h3 className="text-xl font-bold text-white mb-6">Tài liệu gợi ý</h3>
            
            <div className="space-y-4">
              {/* Internal Link */}
              {relatedDoc && (
                <div 
                  onClick={() => onDocClick?.(relatedDoc.id)}
                  className="flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 cursor-pointer transition-all group"
                >
                  <div>
                    <p className="text-xs text-blue-400 font-semibold mb-1 uppercase tracking-wider">Có thể bạn sẽ thích</p>
                    <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                      {relatedDoc.title}
                    </h4>
                  </div>
                  <ArrowRight className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" size={20} />
                </div>
              )}

              {/* External Links */}
              <a 
                href="/" 
                className="flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all group"
              >
                <div>
                  <p className="text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wider">Liên kết ngoài</p>
                  <h4 className="text-white font-medium group-hover:text-emerald-400 transition-colors">Xem tương tác trên Bảng Tuần Hoàn</h4>
                </div>
                <ExternalLink className="text-slate-500 group-hover:text-emerald-400 transition-colors" size={20} />
              </a>

              <a 
                href="https://antoanphongthinghiem.ai.studio" 
                className="flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all group"
              >
                <div>
                  <p className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">Thực hành</p>
                  <h4 className="text-white font-medium group-hover:text-purple-400 transition-colors">Phòng thí nghiệm an toàn</h4>
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
