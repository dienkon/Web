import { Question } from "../../../types";
import { Plus, X } from "lucide-react";

interface Props {
  question: Question;
  update: (updates: Partial<Question>) => void;
}

export default function ShortAnswerEditor({ question, update }: Props) {
  const answers = question.acceptedAnswers || [];

  const updateAnswer = (idx: number, text: string) => {
    const newAnswers = [...answers];
    newAnswers[idx] = text;
    update({ acceptedAnswers: newAnswers });
  };

  const removeAnswer = (idx: number) => {
    update({ acceptedAnswers: answers.filter((_, i) => i !== idx) });
  };

  const addAnswer = () => {
    update({ acceptedAnswers: [...answers, ""] });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Các đáp án được chấp nhận</label>
        <p className="text-xs text-slate-500 mb-3">Học sinh cần nhập chính xác một trong các đáp án dưới đây để được tính điểm.</p>
        
        <div className="space-y-2">
          {answers.map((ans, idx) => (
            <div key={idx} className="flex items-center gap-2">
               <input 
                 type="text"
                 value={ans}
                 onChange={e => updateAnswer(idx, e.target.value)}
                 placeholder="Nhập đáp án..."
                 className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
               />
               <button 
                 onClick={() => removeAnswer(idx)}
                 className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          ))}
        </div>
        
        <button 
          onClick={addAnswer}
          className="mt-3 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm đáp án chấp nhận
        </button>
      </div>
      
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={question.caseSensitive ?? false}
            onChange={(e) => update({ caseSensitive: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Phân biệt hoa/thường (Case Sensitive)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={question.trimWhitespace ?? true}
            onChange={(e) => update({ trimWhitespace: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Tự động bỏ khoảng trắng thừa (Trim Whitespace)</span>
        </label>
      </div>
    </div>
  );
}
