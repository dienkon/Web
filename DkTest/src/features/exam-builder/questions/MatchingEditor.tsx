import React from "react";
import { Plus, Trash2, ArrowRight, Table2, Sparkles, GripVertical } from "lucide-react";
import { Question, MatchingItem } from "../../../types";
import { v4 as uuidv4 } from "uuid";
import InteractiveMatchingBoard from "../../../components/exam/InteractiveMatchingBoard";

interface Props {
  question: Question;
  update: (updates: Partial<Question>) => void;
}

const DEFAULT_LEFT_ITEMS: MatchingItem[] = [
  { id: "m_l_1", label: "1", text: "Khái niệm hoặc câu hỏi 1" },
  { id: "m_l_2", label: "2", text: "Khái niệm hoặc câu hỏi 2" },
  { id: "m_l_3", label: "3", text: "Khái niệm hoặc câu hỏi 3" },
];

const DEFAULT_RIGHT_ITEMS: MatchingItem[] = [
  { id: "m_r_a", label: "a", text: "Định nghĩa hoặc câu trả lời A" },
  { id: "m_r_b", label: "b", text: "Định nghĩa hoặc câu trả lời B" },
  { id: "m_r_c", label: "c", text: "Định nghĩa hoặc câu trả lời C" },
];

const DEFAULT_CORRECT_MATCHES: Record<string, string> = {
  "1": "a",
  "2": "b",
  "3": "c",
};

export default function MatchingEditor({ question, update }: Props) {
  const leftItems: MatchingItem[] =
    question.matchingLeft && question.matchingLeft.length > 0 ? question.matchingLeft : DEFAULT_LEFT_ITEMS;

  const rightItems: MatchingItem[] =
    question.matchingRight && question.matchingRight.length > 0 ? question.matchingRight : DEFAULT_RIGHT_ITEMS;

  const correctMatches: Record<string, string> =
    question.correctMatches && Object.keys(question.correctMatches).length > 0
      ? question.correctMatches
      : DEFAULT_CORRECT_MATCHES;

  // Initialize once if question was just changed to matching type
  React.useEffect(() => {
    if (!question.matchingLeft || !question.matchingRight || !question.correctMatches) {
      update({
        matchingLeft: question.matchingLeft || DEFAULT_LEFT_ITEMS,
        matchingRight: question.matchingRight || DEFAULT_RIGHT_ITEMS,
        correctMatches: question.correctMatches || DEFAULT_CORRECT_MATCHES,
      });
    }
  }, []);

  // Add row to Left Column
  const handleAddLeftItem = () => {
    const nextIdx = leftItems.length + 1;
    const newItems = [
      ...leftItems,
      { id: uuidv4(), label: `${nextIdx}`, text: `Nội dung mục ${nextIdx}` },
    ];
    update({ matchingLeft: newItems });
  };

  // Remove row from Left Column
  const handleRemoveLeftItem = (index: number) => {
    if (leftItems.length <= 1) return;
    const itemToRemove = leftItems[index];
    const newItems = leftItems.filter((_, i) => i !== index);
    // Relabel
    const relabeled = newItems.map((it, i) => ({ ...it, label: `${i + 1}` }));

    const newMatches = { ...correctMatches };
    delete newMatches[itemToRemove.label || `${index + 1}`];

    update({ matchingLeft: relabeled, correctMatches: newMatches });
  };

  // Update left item text
  const handleUpdateLeftText = (index: number, text: string) => {
    const newItems = leftItems.map((it, i) => (i === index ? { ...it, text } : it));
    update({ matchingLeft: newItems });
  };

  // Add row to Right Column
  const handleAddRightItem = () => {
    const nextLabel = String.fromCharCode(97 + rightItems.length); // 'a', 'b', 'c'...
    const newItems = [
      ...rightItems,
      { id: uuidv4(), label: nextLabel, text: `Nội dung mục ${nextLabel.toUpperCase()}` },
    ];
    update({ matchingRight: newItems });
  };

  // Remove row from Right Column
  const handleRemoveRightItem = (index: number) => {
    if (rightItems.length <= 1) return;
    const itemToRemove = rightItems[index];
    const newItems = rightItems.filter((_, i) => i !== index);
    // Relabel
    const relabeled = newItems.map((it, i) => ({
      ...it,
      label: String.fromCharCode(97 + i),
    }));

    // Clean up matches pointing to this item
    const targetLabel = itemToRemove.label || String.fromCharCode(97 + index);
    const newMatches: Record<string, string> = {};
    Object.entries(correctMatches).forEach(([k, v]) => {
      if (v !== targetLabel) newMatches[k] = v;
    });

    update({ matchingRight: relabeled, correctMatches: newMatches });
  };

  // Update right item text
  const handleUpdateRightText = (index: number, text: string) => {
    const newItems = rightItems.map((it, i) => (i === index ? { ...it, text } : it));
    update({ matchingRight: newItems });
  };

  // Update match pair
  const handleUpdateMatch = (leftLabel: string, rightLabel: string) => {
    const newMatches = { ...correctMatches, [leftLabel]: rightLabel };
    update({ correctMatches: newMatches });
  };

  return (
    <div className="space-y-6">
      {/* Helper Banner */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed space-y-1">
          <div className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
            <Table2 className="w-4 h-4" />
            <span>Dạng câu hỏi: Nối 2 cột trong bảng (Matching)</span>
          </div>
          <p>
            Soạn bảng gồm 2 cột: <strong>Cột 1 (1 ➔ n)</strong> và <strong>Cột 2 (a ➔ z)</strong>.
            Sau đó cấu hình đáp án đúng cho từng dòng. Học sinh khi làm bài sẽ nhấp trực tiếp để nối đường line giữa các mục tương ứng!
          </p>
        </div>
      </div>

      {/* Editor Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1 Editor (Left: 1..n) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 text-xs font-black flex items-center justify-center">
                1
              </span>
              <span>Cột 1 (Dòng số 1 ➔ {leftItems.length})</span>
            </div>
            <button
              type="button"
              onClick={handleAddLeftItem}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng
            </button>
          </div>

          <div className="space-y-2.5">
            {leftItems.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                  {item.label || idx + 1}
                </span>

                <div className="flex-1">
                  <textarea
                    rows={2}
                    value={item.text}
                    onChange={(e) => handleUpdateLeftText(idx, e.target.value)}
                    placeholder={`Nội dung dòng ${item.label || idx + 1}... (hỗ trợ $công thức$)`}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {leftItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLeftItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer mt-1"
                    title="Xóa dòng này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 Editor (Right: a..z) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center">
                A
              </span>
              <span>Cột 2 (Dòng chữ cái a ➔ {String.fromCharCode(96 + rightItems.length)})</span>
            </div>
            <button
              type="button"
              onClick={handleAddRightItem}
              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng
            </button>
          </div>

          <div className="space-y-2.5">
            {rightItems.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                  {item.label || String.fromCharCode(97 + idx)}
                </span>

                <div className="flex-1">
                  <textarea
                    rows={2}
                    value={item.text}
                    onChange={(e) => handleUpdateRightText(idx, e.target.value)}
                    placeholder={`Nội dung dòng ${item.label || String.fromCharCode(97 + idx)}... (hỗ trợ $công thức$)`}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {rightItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRightItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer mt-1"
                    title="Xóa dòng này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Correct Matches Mapping Config */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-emerald-600" />
          <span>Cấu hình đáp án đúng cho từng dòng Cột 1</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {leftItems.map((lItem, idx) => {
            const leftLabel = lItem.label || `${idx + 1}`;
            const currentMatch = correctMatches[leftLabel] || "";

            return (
              <div
                key={leftLabel}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                    {leftLabel}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                    Dòng {leftLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={currentMatch}
                    onChange={(e) => handleUpdateMatch(leftLabel, e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Chọn --</option>
                    {rightItems.map((rItem, rIdx) => {
                      const rLabel = rItem.label || String.fromCharCode(97 + rIdx);
                      return (
                        <option key={rLabel} value={rLabel}>
                          Dòng {rLabel.toUpperCase()}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview of the Matching Board */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Xem trước giao diện bảng nối (thử nghiệm nhấp nối):
        </div>
        <InteractiveMatchingBoard
          leftItems={leftItems}
          rightItems={rightItems}
          matches={correctMatches}
          onChange={(m) => update({ correctMatches: m })}
        />
      </div>
    </div>
  );
}
