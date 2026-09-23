/**
 * Pagination Component
 */
import { safe } from "../utils/sanitize.js";

export const renderPagination = ({ currentPage = 1, totalPages = 1, onPageChange }) => {
  if (totalPages <= 1) return "";

  return `
    <div class="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white text-sm text-gray-600">
      <div>Trang <span class="font-medium">${currentPage}</span> / ${totalPages}</div>
      <div class="flex gap-2">
        <button type="button" class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>
          <i class="fas fa-chevron-left"></i>
        </button>
        <button type="button" class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
};
