import React, { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, CheckCircle2, ListOrdered } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Question, OrderingItem } from "../../../types";
import LatexPreview from "../editor/LatexPreview";

interface Props {
  question: Question;
  update: (updates: Partial<Question>) => void;
}

export default function OrderingEditor({ question, update }: Props) {
  const items: OrderingItem[] = question.orderingItems || [];
  const correctOrder: string[] = question.correctOrder || items.map((it) => it.id);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync items in correct sequence
  const orderedItems = correctOrder
    .map((id) => items.find((it) => it.id === id))
    .filter(Boolean) as OrderingItem[];

  // Fallback if any items are missing in correctOrder
  const allOrderedItems = [
    ...orderedItems,
    ...items.filter((it) => !correctOrder.includes(it.id)),
  ];

  const handleAddItem = () => {
    const newItem: OrderingItem = {
      id: uuidv4(),
      text: `Mục ${allOrderedItems.length + 1}`,
    };
    const newItems = [...items, newItem];
    const newOrder = [...correctOrder, newItem.id];
    update({
      orderingItems: newItems,
      correctOrder: newOrder,
    });
  };

  const handleUpdateItemText = (id: string, text: string) => {
    const newItems = items.map((it) => (it.id === id ? { ...it, text } : it));
    update({ orderingItems: newItems });
  };

  const handleDeleteItem = (id: string) => {
    if (allOrderedItems.length <= 2) {
      alert("Câu hỏi sắp xếp cần tối thiểu 2 mục.");
      return;
    }
    const newItems = items.filter((it) => it.id !== id);
    const newOrder = correctOrder.filter((itemKey) => itemKey !== id);
    update({
      orderingItems: newItems,
      correctOrder: newOrder,
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= allOrderedItems.length) return;

    const newOrder = [...allOrderedItems.map((it) => it.id)];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    update({ correctOrder: newOrder });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...allOrderedItems.map((it) => it.id)];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    update({ correctOrder: newOrder });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-blue-600" />
            <span>Danh sách các mục và Thứ tự chuẩn (Đáp án đúng)</span>
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Sắp xếp các mục bên dưới theo thứ tự đúng từ trên xuống dưới (1 → N). Khi thí sinh làm bài, các mục sẽ được tự động xáo trộn ngẫu nhiên.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm mục</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {allOrderedItems.map((item, index) => {
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`p-3.5 bg-white border rounded-2xl transition-all shadow-xs flex items-center gap-3 ${
                draggedIndex === index
                  ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Drag Handle & Order Number */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {index + 1}
                </div>
              </div>

              {/* Text Input */}
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                  placeholder={`Nội dung mục ${index + 1}...`}
                  className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
                {item.text && (
                  <div className="text-xs text-slate-500 px-1 truncate">
                    <span className="font-semibold text-slate-400">Xem trước: </span>
                    <LatexPreview content={item.text} className="inline text-xs" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMove(index, "up")}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === allOrderedItems.length - 1}
                  onClick={() => handleMove(index, "down")}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                  title="Xóa mục này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          Thứ tự hiển thị ở trên chính là đáp án chấm điểm. Học sinh sắp xếp đúng vị trí sẽ đạt điểm tối đa.
        </span>
      </div>
    </div>
  );
}
