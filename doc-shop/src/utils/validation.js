/**
 * Validation utilities
 */
import { APP_CONFIG } from "../config/app-config.js";

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email || "").toLowerCase());
};

export const isPositiveNumber = (val) => {
  const num = Number(val);
  return Number.isFinite(num) && num > 0;
};

export const validateFile = (file, options = {}) => {
  if (!file) return { valid: false, error: "Không tìm thấy file." };

  const maxSize = options.maxSize || APP_CONFIG.UPLOAD.MAX_FILE_SIZE_BYTES;
  const allowedTypes = options.allowedTypes || APP_CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File quá lớn. Dung lượng tối đa là ${Math.round(maxSize / (1024 * 1024))}MB.`,
    };
  }

  if (allowedTypes && allowedTypes.length && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Định dạng file không được hỗ trợ. Vui lòng chọn ảnh hợp lệ (JPG, PNG, WEBP).",
    };
  }

  return { valid: true, error: null };
};
