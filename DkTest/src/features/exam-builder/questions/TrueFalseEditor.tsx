import { Question } from "../../../types";
import { Plus, X, GripVertical, Shuffle, Info } from "lucide-react";
import RichTextEditor from "../editor/RichTextEditor";
import { v4 as uuidv4 } from "uuid";

interface Props {
  question: Question;
  update: (updates: Partial<Question>) => void;
}

export default function TrueFalseEditor({ question, update }: Props) {
  const statements = question.statements || [];
  const shuffleStatements = question.shuffleStatements !== false; // default true

  const updateStatementText = (id: string, text: string) => {
    update({ statements: statements.map((s) => (s.id === id ? { ...s, text } : s)) });
  };

  const updateStatementAnswer = (id: string, correctAnswer: boolean) => {
    update({ statements: statements.map((s) => (s.id === id ? { ...s, correctAnswer } : s)) });
  };

  const removeStatement = (id: string) => {
    update({ statements: statements.filter((s) => s.id !== id) });
  };

  const addStatement = () => {
    const letters = ["a", "b", "c", "d", "e", "f"];
    const nextLetter = letters[statements.length] || `${statements.length + 1}`;
    update({
      statements: [
        ...statements,
        { id: uuidv4(), text: `Mệnh đề ${nextLetter}) ...`, correctAnswer: true },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block text-sm font-semibold text-slate-700">Các mệnh đề (Đúng / Sai)</label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={shuffleStatements}
            onChange={(e) => update({ shuffleStatements: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
          />
          <Shuffle className="w-3 h-3 text-blue-600" />
          <span>Xáo trộn các ý (a, b, c, d) câu này</span>
        </label>
      </div>

      <div className="space-y-3">
        {statements.map((stmt, idx) => {
          const letter = String.fromCharCode(97 + idx); // a, b, c, d
          return (
            <div
              key={stmt.id}
              className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-1.5 mt-1 shrink-0">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  {letter})
                </span>
              </div>

              <div className="flex-1 space-y-2">
                <RichTextEditor
                  value={stmt.text}
                  onChange={(val) => updateStatementText(stmt.id, val)}
                  minHeight="60px"
                  placeholder={`Nhập nội dung mệnh đề ${letter}...`}
                />

                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Đáp án:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-emerald-300 transition-all">
                    <input
                      type="radio"
                      name={`statement_ans_${stmt.id}`}
                      checked={stmt.correctAnswer === true}
                      onChange={() => updateStatementAnswer(stmt.id, true)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-emerald-700">Đúng</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 transition-all">
                    <input
                      type="radio"
                      name={`statement_ans_${stmt.id}`}
                      checked={stmt.correctAnswer === false}
                      onChange={() => updateStatementAnswer(stmt.id, false)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-red-700">Sai</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => removeStatement(stmt.id)}
                className="mt-1 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                disabled={statements.length <= 1}
                title="Xóa mệnh đề này"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={addStatement}
        className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center gap-1.5 transition-colors"
      >
        <Plus className="w-4 h-4" /> Thêm mệnh đề (ý tiếp theo)
      </button>
    </div>
  );
}
