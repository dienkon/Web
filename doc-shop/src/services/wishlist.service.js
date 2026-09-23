/**
 * Wishlist / Favorites Service
 */
import { store } from "../app/state.js";
import { toast } from "../components/toast.js";

const STORAGE_KEY_WISHLIST = "dkdocshop_wishlist";

class WishlistService {
  constructor() {
    this.loadWishlist();
  }

  loadWishlist() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WISHLIST);
      if (saved) {
        store.setWishlist(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load wishlist:", e);
    }
  }

  persist(items) {
    localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(items));
  }

  toggleWishlist(docId) {
    const current = [...store.getState().wishlist.items];
    const exists = current.includes(docId);
    let updated;

    if (exists) {
      updated = current.filter(id => id !== docId);
      toast.info("Đã xóa tài liệu khỏi danh sách yêu thích");
    } else {
      updated = [...current, docId];
      toast.success("Đã thêm tài liệu vào danh sách yêu thích ❤️");
    }

    store.setWishlist(updated);
    this.persist(updated);
    return !exists;
  }

  isWishlisted(docId) {
    return store.getState().wishlist.items.includes(docId);
  }
}

export const wishlistService = new WishlistService();
