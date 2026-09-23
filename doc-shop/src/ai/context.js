/**
 * Document Context Boundary & Safe Text Extractor for DkAI (Section AR & AS)
 */
import { store } from "../app/state.js";
import { PurchaseService } from "../services/purchase.service.js";

export const getDocumentContext = (docId) => {
  if (!docId) return null;

  const doc = store.getState().documents.items[docId];
  if (!doc) return null;

  const hasAccess = PurchaseService.hasAccess(docId);

  // If user has access: provide full public and preview context
  if (hasAccess) {
    return {
      id: doc.id,
      title: doc.title,
      subject: doc.subject,
      grade: doc.grade,
      description: doc.description,
      sampleText: doc.preview?.sampleText || "",
      isFullAccess: true,
      hasSolution: !!doc.hasSolution,
    };
  }

  // If user does NOT own the document: only public metadata
  return {
    id: doc.id,
    title: doc.title,
    subject: doc.subject,
    grade: doc.grade,
    description: doc.description,
    sampleText: "",
    isFullAccess: false,
    hasSolution: false,
    notice: "Người dùng chưa sở hữu tài liệu này. Chỉ được phép cung cấp thông tin tổng quan, không tiết lộ nội dung chi tiết.",
  };
};

/**
 * Extracts selected text from the browser viewport
 */
export const getSelectedText = () => {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : "";
};

export default {
  getDocumentContext,
  getSelectedText,
};
