/**
 * Seller & Creator Marketplace Service
 */
import { store } from "../app/state.js";
import { toast } from "../components/toast.js";

const STORAGE_KEY_SELLER = "dkdocshop_seller_data";

class SellerService {
  constructor() {
    this.loadSellerData();
  }

  loadSellerData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SELLER);
      if (saved) {
        store.setSeller(JSON.parse(saved));
      } else {
        const initial = {
          isSeller: false,
          profile: null,
          documents: [],
          earnings: { gross: 0, platformFee: 0, net: 0, pending: 0 },
          payouts: [],
        };
        store.setSeller(initial);
      }
    } catch (e) {
      console.warn("Failed to load seller data:", e);
    }
  }

  persist(data) {
    localStorage.setItem(STORAGE_KEY_SELLER, JSON.stringify(data));
  }

  registerSeller({ displayName, subject, bio, bankAccount }) {
    const user = store.getState().auth.currentUser;
    if (!user) return false;

    const sellerData = {
      isSeller: true,
      profile: {
        userId: user.uid,
        displayName: displayName.trim(),
        subject,
        bio: bio.trim(),
        bankAccount: bankAccount.trim(),
        rating: 5.0,
        salesCount: 0,
        approvedAt: Date.now(),
      },
      documents: [],
      earnings: { gross: 2450000, platformFee: 367500, net: 2082500, pending: 450000 },
      payouts: [
        { id: "po_1", amount: 1500000, status: "completed", date: Date.now() - 604800000 }
      ],
    };

    store.setSeller(sellerData);
    this.persist(sellerData);
    toast.success("Đăng ký Người Bán thành công! Chào mừng bạn đến với DkDocShop Creator.");
    return true;
  }

  submitDocument({ title, price, subject, description, fileUrl, previewUrl }) {
    const seller = store.getState().seller;
    const docItem = {
      id: `sdoc_${Date.now()}`,
      title: title.trim(),
      price: Number(price) || 0,
      subject,
      description: description.trim(),
      fileUrl,
      previewUrl,
      status: "pending", // pending | approved | rejected
      submittedAt: Date.now(),
      salesCount: 0,
    };

    const updatedDocs = [docItem, ...(seller.documents || [])];
    const updated = { ...seller, documents: updatedDocs };
    store.setSeller(updated);
    this.persist(updated);
    toast.success("Tài liệu đã được gửi lên hệ thống và đang chờ Admin duyệt!");
    return docItem;
  }

  requestPayout(amount) {
    const seller = store.getState().seller;
    if (amount > seller.earnings.net) {
      toast.error("Số dư khả dụng không đủ để rút!");
      return false;
    }

    const payout = {
      id: `po_${Date.now()}`,
      amount,
      status: "pending",
      date: Date.now(),
    };

    const updatedEarnings = {
      ...seller.earnings,
      net: seller.earnings.net - amount,
      pending: (seller.earnings.pending || 0) + amount,
    };

    const updated = {
      ...seller,
      earnings: updatedEarnings,
      payouts: [payout, ...(seller.payouts || [])],
    };

    store.setSeller(updated);
    this.persist(updated);
    toast.success("Yêu cầu rút tiền đã được gửi! Tiền sẽ về tài khoản sau 24h.");
    return true;
  }
}

export const sellerService = new SellerService();
