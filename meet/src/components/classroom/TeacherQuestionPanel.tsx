import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Send, HelpCircle, Sparkles } from 'lucide-react';

interface TeacherQuestionPanelProps {
  onStartQuestion: (text: string, options: { A: string; B: string; C: string; D: string }) => void;
}

export const TeacherQuestionPanel: React.FC<TeacherQuestionPanelProps> = ({ onStartQuestion }) => {
  const [text, setText] = useState('');
  const [optionA, setOptionA] = useState('Đáp án A');
  const [optionB, setOptionB] = useState('Đáp án B');
  const [optionC, setOptionC] = useState('Đáp án C');
  const [optionD, setOptionD] = useState('Đáp án D');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onStartQuestion(text.trim(), {
      A: optionA.trim() || 'A',
      B: optionB.trim() || 'B',
      C: optionC.trim() || 'C',
      D: optionD.trim() || 'D',
    });
  };

  const setPresetQuestion = (presetText: string, a: string, b: string, c: string, d: string) => {
    setText(presetText);
    setOptionA(a);
    setOptionB(b);
    setOptionC(c);
    setOptionD(d);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
        <HelpCircle className="w-4 h-4" />
        <span>Tạo câu hỏi trắc nghiệm A / B / C / D</span>
      </div>

      <Input
        label="Nội dung câu hỏi"
        placeholder="Nhập câu hỏi (Ví dụ: 2 + 2 bằng bao nhiêu?)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Lựa chọn A" value={optionA} onChange={(e) => setOptionA(e.target.value)} />
        <Input label="Lựa chọn B" value={optionB} onChange={(e) => setOptionB(e.target.value)} />
        <Input label="Lựa chọn C" value={optionC} onChange={(e) => setOptionC(e.target.value)} />
        <Input label="Lựa chọn D" value={optionD} onChange={(e) => setOptionD(e.target.value)} />
      </div>

      {/* Preset Quick Polls */}
      <div className="border-t border-gray-800 pt-3">
        <span className="text-[11px] text-gray-400 font-medium block mb-2">Mẫu câu hỏi nhanh:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setPresetQuestion('2 + 2 bằng bao nhiêu?', '3', '4', '5', '6')}
            className="text-xs px-2.5 py-1 bg-[#282a2d] hover:bg-[#34373b] border border-gray-700 rounded-lg text-gray-300 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-400" /> Toán cơ bản (2 + 2)
          </button>

          <button
            type="button"
            onClick={() => setPresetQuestion('Thủ đô của Việt Nam là gì?', 'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng')}
            className="text-xs px-2.5 py-1 bg-[#282a2d] hover:bg-[#34373b] border border-gray-700 rounded-lg text-gray-300 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-400" /> Địa lý Việt Nam
          </button>
        </div>
      </div>

      <Button type="submit" variant="primary" className="w-full gap-2 mt-2" disabled={!text.trim()}>
        <Send className="w-4 h-4" /> Bắt đầu câu hỏi
      </Button>
    </form>
  );
};
