/**
 * Document Reviews & Ratings Service
 */
import { store } from "../app/state.js";
import { toast } from "../components/toast.js";

const STORAGE_KEY_REVIEWS = "dkdocshop_doc_reviews";

class ReviewService {
  constructor() {
    this.reviews = this.loadLocalReviews();
  }

  loadLocalReviews() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REVIEWS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(this.reviews));
  }

  getReviewsForDoc(docId) {
    return this.reviews[docId] || [
      {
        id: "rev_demo_1",
        userName: "Nguyễn Minh Tuấn",
        userClass: "Lớp 12A1",
        rating: 5,
        comment: "Tài liệu cực kỳ chi tiết, giải thích dễ hiểu, rất sát với cấu trúc đề thi thử năm nay!",
        timestamp: Date.now() - 172800000,
        verified: true,
      },
      {
        id: "rev_demo_2",
        userName: "Trần Mai Phương",
        userClass: "Lớp 12 Chuyên",
        rating: 5,
        comment: "Trình bày rõ ràng, có nhiều mẹo bấm máy tính Casio hữu ích giúp mình tiết kiệm nhiều thời gian.",
        timestamp: Date.now() - 86400000,
        verified: true,
      }
    ];
  }

  addReview(docId, { rating, comment }) {
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    if (!user) {
      toast.error("Vui lòng đăng nhập để gửi đánh giá!");
      return null;
    }

    if (!this.reviews[docId]) {
      this.reviews[docId] = [...this.getReviewsForDoc(docId)];
    }

    const newReview = {
      id: `rev_${Date.now()}`,
      userId: user.uid,
      userName: userData?.name || user.displayName || "Học sinh",
      userClass: userData?.class || "Học sinh THPT",
      rating: Number(rating) || 5,
      comment: comment.trim(),
      timestamp: Date.now(),
      verified: true,
    };

    this.reviews[docId].unshift(newReview);
    this.persist();
    toast.success("Cảm ơn bạn đã gửi đánh giá tài liệu!");
    return newReview;
  }
}

export const reviewService = new ReviewService();
