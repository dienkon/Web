import React, { useMemo } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  Table2,
  Sparkles,
  GitCommitHorizontal,
  GitFork,
  Check,
} from "lucide-react";
import { Question, MatchingItem, MatchingMode } from "../../../types";
import { v4 as uuidv4 } from "uuid";
import InteractiveMatchingBoard from "../../../components/exam/InteractiveMatchingBoard";
import {
  getLeftItemLabel,
  getRightItemLabel,
  getUnconnectedItems,
  normalizeMatchesToArrayMap,
  removeLeftItemAndRemap,
  removeRightItemAndRemap,
  resolveMatchingMode,
  serializeMatchesMap,
  setLeftTargetsInMode,
  toggleMatchConnection,
} from "../../../utils/matchingUtils";

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
    question.matchingLeft && question.matchingLeft.length > 0
      ? question.matchingLeft
      : DEFAULT_LEFT_ITEMS;

  const rightItems: MatchingItem[] =
    question.matchingRight && question.matchingRight.length > 0
      ? question.matchingRight
      : DEFAULT_RIGHT_ITEMS;

  // Preserve intentional empty `{}` (all/some unconnected) instead of snapping back to defaults!
  const correctMatches =
    question.correctMatches !== undefined
      ? question.correctMatches
      : DEFAULT_CORRECT_MATCHES;

  const effectiveMode: MatchingMode = useMemo(
    () =>
      resolveMatchingMode({
        matchingMode: question.matchingMode,
        correctMatches,
        matchingLeft: leftItems,
        matchingRight: rightItems,
      }),
    [question.matchingMode, correctMatches, leftItems, rightItems]
  );

  const normalizedMap = useMemo(
    () => normalizeMatchesToArrayMap(correctMatches, leftItems, rightItems),
    [correctMatches, leftItems, rightItems]
  );

  const unconnectedInfo = useMemo(
    () => getUnconnectedItems(leftItems, rightItems, normalizedMap),
    [leftItems, rightItems, normalizedMap]
  );

  // Initialize once only if matchingLeft/matchingRight were never initialized
  React.useEffect(() => {
    if (!question.matchingLeft || !question.matchingRight || question.correctMatches === undefined) {
      update({
        matchingLeft: question.matchingLeft || DEFAULT_LEFT_ITEMS,
        matchingRight: question.matchingRight || DEFAULT_RIGHT_ITEMS,
        correctMatches:
          question.correctMatches !== undefined
            ? question.correctMatches
            : DEFAULT_CORRECT_MATCHES,
        matchingMode: question.matchingMode || "one_to_one",
      });
    }
  }, []);

  // Switch between 1-to-1 and multiple-connection modes
  const handleModeChange = (newMode: MatchingMode) => {
    const cleaned = serializeMatchesMap(normalizedMap, newMode);
    update({ matchingMode: newMode, correctMatches: cleaned });
  };

  // Add row to Left Column (new rows start unconnected by default so distractor rows are effortless!)
  const handleAddLeftItem = () => {
    const nextIdx = leftItems.length + 1;
    const newItems = [
      ...leftItems,
      { id: uuidv4(), label: `${nextIdx}`, text: `Nội dung mục ${nextIdx}` },
    ];
    update({ matchingLeft: newItems });
  };

  // Remove row from Left Column & safely remap surviving matches
  const handleRemoveLeftItem = (index: number) => {
    if (leftItems.length <= 1) return;
    const remapped = removeLeftItemAndRemap(
      leftItems,
      rightItems,
      correctMatches,
      index,
      effectiveMode
    );
    update(remapped);
  };

  // Update left item text
  const handleUpdateLeftText = (index: number, text: string) => {
    const newItems = leftItems.map((it, i) => (i === index ? { ...it, text } : it));
    update({ matchingLeft: newItems });
  };

  // Add row to Right Column (starts unconnected by default!)
  const handleAddRightItem = () => {
    const nextLabel = getRightItemLabel(rightItems.length);
    const newItems = [
      ...rightItems,
      { id: uuidv4(), label: nextLabel, text: `Nội dung mục ${nextLabel.toUpperCase()}` },
    ];
    update({ matchingRight: newItems });
  };

  // Remove row from Right Column & safely remap surviving matches
  const handleRemoveRightItem = (index: number) => {
    if (rightItems.length <= 1) return;
    const remapped = removeRightItemAndRemap(
      leftItems,
      rightItems,
      correctMatches,
      index,
      effectiveMode
    );
    update(remapped);
  };

  // Update right item text
  const handleUpdateRightText = (index: number, text: string) => {
    const newItems = rightItems.map((it, i) => (i === index ? { ...it, text } : it));
    update({ matchingRight: newItems });
  };

  // Update single-select match in 1-to-1 mode ("" = Không nối)
  const handleSelectOneToOneTarget = (leftLabel: string, rightLabel: string) => {
    const next = setLeftTargetsInMode(
      correctMatches,
      leftLabel,
      rightLabel ? [rightLabel] : [],
      "one_to_one",
      leftItems,
      rightItems
    );
    update({ correctMatches: next });
  };

  // Toggle individual wire in multiple mode
  const handleToggleMultipleTarget = (leftLabel: string, rightLabel: string) => {
    const next = toggleMatchConnection(
      correctMatches,
      leftLabel,
      rightLabel,
      "multiple",
      leftItems,
      rightItems
    );
    update({ correctMatches: next });
  };

  // Clear all wires for a single left row ("Không nối")
  const handleClearLeftRow = (leftLabel: string) => {
    const next = setLeftTargetsInMode(
      correctMatches,
      leftLabel,
      [],
      effectiveMode,
      leftItems,
      rightItems
    );
    update({ correctMatches: next });
  };

  return (
    <div className="space-y-5">
      {/* Helper Banner */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed space-y-1">
          <div className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
            <Table2 className="w-4 h-4" />
            <span>Dạng câu hỏi: Nối 2 cột trong bảng (Matching)</span>
          </div>
          <p>
            Soạn <strong>Cột 1 (1 ➔ n)</strong> và <strong>Cột 2 (a ➔ z)</strong>. Bạn có thể chọn chế độ{" "}
            <strong>Chỉ 1 ô – 1 mạch</strong> hoặc <strong>1 ô nối nhiều mạch</strong>, đồng thời có thể để trống các{" "}
            <strong>ô gây nhiễu (không cần nối)</strong> ở bất kỳ cột nào!
          </p>
        </div>
      </div>

      {/* Matching Rule Mode Selector */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
          Quy tắc nối mạch cho câu hỏi này:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleModeChange("one_to_one")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              effectiveMode === "one_to_one"
                ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20"
                : "bg-slate-50/60 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                effectiveMode === "one_to_one"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-300 text-slate-600"
              }`}
            >
              <GitCommitHorizontal className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>Chỉ 1 ô – 1 mạch (Đơn nối)</span>
                {effectiveMode === "one_to_one" && (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Mỗi ô ở Cột 1 và Cột 2 chỉ nối tối đa 1 đường. Nối sang ô mới sẽ tự gỡ mạch cũ.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("multiple")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              effectiveMode === "multiple"
                ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20"
                : "bg-slate-50/60 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                effectiveMode === "multiple"
                  ? "bg-purple-600 text-white"
                  : "bg-white border border-slate-300 text-slate-600"
              }`}
            >
              <GitFork className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>Cho phép 1 ô nối nhiều mạch</span>
                {effectiveMode === "multiple" && (
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Một ô có thể nối đến nhiều ô khác (1–nhiều hoặc nhiều–nhiều). Chạm lại để gỡ từng mạch.
              </p>
            </div>
          </button>
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
              <span>Cột 1 (Dòng 1 ➔ {leftItems.length})</span>
            </div>
            <button
              type="button"
              onClick={handleAddLeftItem}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm ô
            </button>
          </div>

          <div className="space-y-2.5">
            {leftItems.map((item, idx) => {
              const lLabel = getLeftItemLabel(idx, item);
              const isUnconnected = (normalizedMap[lLabel] || []).length === 0;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    {lLabel}
                  </span>

                  <div className="flex-1 space-y-1">
                    <textarea
                      rows={2}
                      value={item.text}
                      onChange={(e) => handleUpdateLeftText(idx, e.target.value)}
                      placeholder={`Nội dung ô ${lLabel}... (hỗ trợ $công thức$)`}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isUnconnected && (
                      <span className="inline-block text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        Đang để trống (Ô không cần nối)
                      </span>
                    )}
                  </div>

                  {leftItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLeftItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer mt-1"
                      title="Xóa ô này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2 Editor (Right: a..z) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center">
                a
              </span>
              <span>
                Cột 2 (Dòng a ➔{" "}
                {rightItems.length > 0
                  ? getRightItemLabel(rightItems.length - 1, rightItems[rightItems.length - 1])
                  : "z"}
                )
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddRightItem}
              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm ô
            </button>
          </div>

          <div className="space-y-2.5">
            {rightItems.map((item, idx) => {
              const rLabel = getRightItemLabel(idx, item);
              const isUnconnected = unconnectedInfo.unconnectedRightLabels.some(
                (lbl) => lbl.toLowerCase() === rLabel.toLowerCase()
              );
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    {rLabel}
                  </span>

                  <div className="flex-1 space-y-1">
                    <textarea
                      rows={2}
                      value={item.text}
                      onChange={(e) => handleUpdateRightText(idx, e.target.value)}
                      placeholder={`Nội dung ô ${rLabel}... (hỗ trợ $công thức$)`}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {isUnconnected && (
                      <span className="inline-block text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        Ô gây nhiễu (Không nối từ Cột 1)
                      </span>
                    )}
                  </div>

                  {rightItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRightItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer mt-1"
                      title="Xóa ô này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Correct Matches Mapping Config */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-emerald-600" />
            <span>
              Cấu hình đáp án đúng{" "}
              {effectiveMode === "multiple"
                ? "(Bấm chọn nhiều ô hoặc Không nối)"
                : "(Mỗi ô tối đa 1 mạch hoặc Không nối)"}
            </span>
          </label>

          {(unconnectedInfo.unconnectedLeftLabels.length > 0 ||
            unconnectedInfo.unconnectedRightLabels.length > 0) && (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              Ô không nối:{" "}
              {unconnectedInfo.unconnectedLeftLabels.length > 0 &&
                `Cột 1 [${unconnectedInfo.unconnectedLeftLabels.join(", ")}] `}
              {unconnectedInfo.unconnectedRightLabels.length > 0 &&
                `Cột 2 [${unconnectedInfo.unconnectedRightLabels.join(", ")}]`}
            </span>
          )}
        </div>

        <div
          className={
            effectiveMode === "multiple"
              ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          }
        >
          {leftItems.map((lItem, idx) => {
            const leftLabel = getLeftItemLabel(idx, lItem);
            const selectedTargets = normalizedMap[leftLabel] || [];

            if (effectiveMode === "multiple") {
              return (
                <div
                  key={leftLabel}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                        {leftLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">
                        Ô {leftLabel}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-700">
                      {selectedTargets.length > 0
                        ? `➔ [${selectedTargets.join(", ")}]`
                        : "Không nối"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rightItems.map((rItem, rIdx) => {
                      const rLabel = getRightItemLabel(rIdx, rItem);
                      const isActive = selectedTargets.some(
                        (t) => t.toLowerCase() === rLabel.toLowerCase()
                      );
                      return (
                        <button
                          key={rLabel}
                          type="button"
                          onClick={() => handleToggleMultipleTarget(leftLabel, rLabel)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isActive
                              ? "bg-purple-600 text-white border-purple-700 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                          title={`${rLabel}. ${rItem.text}`}
                        >
                          {rLabel}
                          {isActive ? " ✓" : ""}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleClearLeftRow(leftLabel)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        selectedTargets.length === 0
                          ? "bg-slate-700 text-white border-slate-800"
                          : "bg-white text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200"
                      }`}
                    >
                      Không nối
                    </button>
                  </div>
                </div>
              );
            }

            const currentMatch = selectedTargets[0] || "";
            return (
              <div
                key={leftLabel}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {leftLabel}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate">
                    Ô {leftLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={currentMatch}
                    onChange={(e) => handleSelectOneToOneTarget(leftLabel, e.target.value)}
                    className={`px-2.5 py-1 text-xs font-bold bg-white border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer ${
                      currentMatch
                        ? "border-indigo-300 text-indigo-700"
                        : "border-slate-300 text-slate-500"
                    }`}
                  >
                    <option value="">— Không nối —</option>
                    {rightItems.map((rItem, rIdx) => {
                      const rLabel = getRightItemLabel(rIdx, rItem);
                      return (
                        <option key={rLabel} value={rLabel}>
                          Ô {rLabel} ({rItem.text.slice(0, 18)})
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
          Xem trước & nối trực tiếp trên bảng (chạm hoặc kéo để sửa đáp án):
        </div>
        <InteractiveMatchingBoard
          leftItems={leftItems}
          rightItems={rightItems}
          matchingMode={effectiveMode}
          matches={correctMatches}
          onChange={(m) => update({ correctMatches: m })}
        />
      </div>
    </div>
  );
}
