import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Question } from '../../types/classroom';

interface QuestionBannerProps {
  question: Question | null;
}

export const QuestionBanner: React.FC<QuestionBannerProps> = ({ question }) => {
  if (!question) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[90%] pointer-events-none">
      <div className="bg-[#202124]/90 backdrop-blur-md border border-blue-500/30 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-start gap-3 pointer-events-auto">
        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
            Câu hỏi hiện tại
          </span>
          <p className="text-sm font-semibold text-white truncate">{question.text}</p>
        </div>
      </div>
    </div>
  );
};
