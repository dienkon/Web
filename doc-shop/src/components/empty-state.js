/**
 * Empty State Component
 */
import { safe } from "../utils/sanitize.js";

export const renderEmptyState = ({
  icon = "fa-folder-open",
  title = "Không tìm thấy dữ liệu",
  description = "Hiện tại chưa có nội dung nào để hiển thị.",
  actionText = null,
  actionId = null,
  actionFn = null,
} = {}) => {
  const btnHtml = actionText
    ? `<button type="button" id="${actionId || "empty-state-action-btn"}" class="mt-4 px-6 py-2 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 shadow-sm transition">
        ${safe(actionText)}
       </button>`
    : "";

  return `
    <div class="flex flex-col items-center justify-center p-12 text-center my-6">
      <div class="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center text-2xl mb-4">
        <i class="fas ${safe(icon)}"></i>
      </div>
      <h3 class="text-base font-bold text-gray-800 mb-1">${safe(title)}</h3>
      <p class="text-sm text-gray-500 max-w-sm">${safe(description)}</p>
      ${btnHtml}
    </div>
  `;
};
