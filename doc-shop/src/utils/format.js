/**
 * Formatting utilities
 */

export const formatVND = (amount) => {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
};

export const formatCurrency = formatVND;

export const formatNumber = (num) => {
  return new Intl.NumberFormat("vi-VN").format(Number(num || 0));
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
