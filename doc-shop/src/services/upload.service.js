/**
 * Cloudinary File Upload Service
 */
import { ENV } from "../config/environment.js";
import { validateFile } from "../utils/validation.js";
import { logger } from "../utils/logger.js";

export const UploadService = {
  /**
   * Upload image file to Cloudinary with validation
   */
  async uploadImage(file, folder = "edumarket") {
    if (!file) return "";

    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { cloudName, uploadPreset } = ENV.CLOUDINARY;
    if (!cloudName || !uploadPreset || cloudName.includes("YOUR_") || uploadPreset.includes("YOUR_")) {
      throw new Error("Dịch vụ lưu trữ ảnh (Cloudinary) chưa được cấu hình.");
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Tải ảnh lên thất bại.");
      }

      return data.secure_url || data.url || "";
    } catch (err) {
      logger.error("Cloudinary upload failed:", err);
      throw err;
    }
  },
};
