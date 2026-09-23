/**
 * Favorites (Wishlist) View for DkDocShop 2.0 (Section T)
 */
import { store } from "../../app/state.js";
import { wishlistService } from "../../services/wishlist.service.js";
import { renderDocumentCard } from "../../components/document-card.js";
import { renderEmptyState } from "../../components/empty-state.js";
import { safe } from "../../utils/sanitize.js";
import { toast } from "../../components/toast.js";

export const renderFavoritesView = async (container) => {
  if (!container) return;

  const user = store.getState().auth.currentUser;
  if (!user) {
    container.innerHTML = `
      <div class="py-16 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-2xl flex items-center justify-center mx-auto">❤️</div>
        <h3 class="text-base font-bold text-gray-900">Danh sách tài liệu yêu thích</h3>
        <p class="text-xs text-gray-500 max-w-sm mx-auto">Vui lòng đăng nhập để lưu và theo dõi các tài liệu bạn quan tâm.</p>
        <button type="button" onclick="window.loginGoogleUI()" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition">
          Đăng nhập ngay
        </button>
      </div>
    `;
    return;
  }

  const wishlistMap = store.getState().wishlist?.items || {};
  const favDocIds = Object.keys(wishlistMap);
  const docsMap = store.getState().documents.items || {};

  let favDocs = favDocIds.map((id) => docsMap[id]).filter(Boolean);

  let searchQuery = "";
  let subjectFilter = "all";

  const renderContent = () => {
    let list = [...favDocs];

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => (d.title || "").toLowerCase().includes(q));
    }

    if (subjectFilter !== "all") {
      list = list.filter((d) => d.subject === subjectFilter);
    }

    container.innerHTML = `
      <div class="fade-in space-y-6 pb-16">
        <!-- Header -->
        <div class="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 class="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <span class="text-red-500">❤️</span> Tài Liệu Yêu Thích (${favDocs.length})
            </h2>
            <p class="text-xs text-gray-500 mt-0.5">Danh sách các tài liệu bạn đã đánh dấu để theo dõi hoặc mua sau</p>
          </div>
          <!-- Search & Filter -->
          <div class="flex items-center gap-2.5 w-full sm:w-auto">
            <input
              type="text"
              id="fav-search-input"
              value="${safe(searchQuery)}"
              placeholder="Tìm trong yêu thích..."
              class="px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <!-- Document Grid -->
        ${list.length > 0 ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            ${list.map((doc) => `
              <div class="relative group">
                ${renderDocumentCard(doc)}
                <button
                  type="button"
                  data-remove-fav="${doc.id}"
                  class="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-red-500 hover:bg-red-50 hover:text-red-700 shadow-md flex items-center justify-center text-xs transition"
                  title="Bỏ yêu thích"
                >
                  ✕
                </button>
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="py-16">
            ${renderEmptyState({
              title: "Bạn chưa yêu thích tài liệu nào",
              message: "Khám phá các tài liệu hữu ích và bấm vào biểu tượng trái tim để lưu lại.",
              actionText: "Khám phá tài liệu ngay",
              actionRoute: "home",
            })}
          </div>
        `}
      </div>
    `;

    attachEvents();
  };

  const attachEvents = () => {
    container.querySelector("#fav-search-input")?.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderContent();
    });

    container.querySelectorAll("[data-remove-fav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const docId = btn.getAttribute("data-remove-fav");
        wishlistService.toggleWishlist(docId);
        favDocs = favDocs.filter((d) => d.id !== docId);
        toast.info("Đã xóa khỏi danh sách yêu thích");
        renderContent();
      });
    });
  };

  renderContent();
};

export default renderFavoritesView;
