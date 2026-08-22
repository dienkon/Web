import { CircleDot, CheckSquare, ToggleLeft, AlignLeft, X } from "lucide-react";
import { QuestionType } from "../../../types";

interface Props {
  onSelect: (type: QuestionType) => void;
  onClose: () => void;
}

export default function QuestionTypeSelector({ onSelect, onClose }: Props) {
  const types: { type: QuestionType; icon: any; label: string; desc: string }[] = [
    { type: "single_choice", icon: CircleDot, label: "Một đáp án", desc: "Trắc nghiệm chọn 1 đáp án đúng" },
    { type: "multiple_choice", icon: CheckSquare, label: "Nhiều đáp án", desc: "Trắc nghiệm chọn nhiều đáp án đúng" },
    { type: "true_false", icon: ToggleLeft, label: "Đúng / Sai", desc: "Chọn Đúng hoặc Sai cho các mệnh đề" },
    { type: "short_answer", icon: AlignLeft, label: "Trả lời ngắn", desc: "Học sinh tự nhập câu trả lời ngắn" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 animate-in fade-in zoom-in duration-200 relative">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h4 className="font-semibold text-slate-800">Chọn loại câu hỏi</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {types.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.type}
              onClick={() => onSelect(t.type)}
              className="flex items-start p-3 text-left border border-slate-100 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="p-2 bg-slate-50 text-slate-500 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 mr-3">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-slate-800 text-sm group-hover:text-blue-700">{t.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}
