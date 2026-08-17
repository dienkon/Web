export const CLOUDINARY_CLOUD_NAME = "dys3wgutz";
export const CLOUDINARY_UPLOAD_PRESET = "comic_raw_files_preset";

export const uploadFileToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url;
    }
    throw new Error("Upload failed");
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

export const uploadImageToCloudinary = uploadFileToCloudinary;
