import { Question } from "../../../types";
import { Plus, X, GripVertical } from "lucide-react";
import RichTextEditor from "../editor/RichTextEditor";
import { v4 as uuidv4 } from "uuid";

interface Props {
  question: Question;
  update: (updates: Partial<Question>) => void;
}

export default function MultipleChoiceEditor({ question, update }: Props) {
  const options = question.options || [];
  const correctIds = question.correctOptionIds || [];

  const updateOption = (id: string, text: string) => {
    update({ options: options.map(o => o.id === id ? { ...o, text } : o) });
  };

  const removeOption = (id: string) => {
    update({ 
      options: options.filter(o => o.id !== id),
      correctOptionIds: correctIds.filter(cId => cId !== id)
    });
  };

  const toggleCorrect = (id: string) => {
    if (correctIds.includes(id)) {
      update({ correctOptionIds: correctIds.filter(cId => cId !== id) });
    } else {
      update({ correctOptionIds: [...correctIds, id] });
    }
  };

  const addOption = () => {
    update({ options: [...options, { id: uuidv4(), text: "Lựa chọn mới" }] });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700 mb-2">Các đáp án</label>
      
      {options.map((opt, idx) => {
        const isCorrect = correctIds.includes(opt.id);
        return (
          <div key={opt.id} className={`flex items-start gap-3 p-3 border rounded-lg transition-colors \${isCorrect ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}>
             <div className="mt-1 cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical className="w-4 h-4" />
             </div>
             
             <div className="mt-1.5 flex items-center justify-center">
                <input 
                  type="checkbox"
                  checked={isCorrect}
                  onChange={() => toggleCorrect(opt.id)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-slate-300 rounded"
                />
             </div>
             
             <div className="flex-1">
               <RichTextEditor 
                  value={opt.text} 
                  onChange={val => updateOption(opt.id, val)} 
                  minHeight="60px"
               />
             </div>
             
             <button 
               onClick={() => removeOption(opt.id)}
               className="mt-1 p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
               disabled={options.length <= 2}
             >
               <X className="w-4 h-4" />
             </button>
          </div>
        );
      })}
      
      <button 
        onClick={addOption}
        className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Plus className="w-4 h-4" /> Thêm đáp án
      </button>
    </div>
  );
}
