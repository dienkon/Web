export const uploadFileToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    console.warn("Cloudinary is not configured. Falling back to local object URL for preview.");
    return URL.createObjectURL(file);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const resourceType = file.type.startsWith('image/') ? 'image' : 'auto';

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      // Fallback to raw resource type for non-image files
      const rawRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
        method: 'POST',
        body: formData,
      });
      if (rawRes.ok) {
        const rawData = await rawRes.json();
        return rawData.secure_url;
      }
      throw new Error("Failed to upload file");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return URL.createObjectURL(file);
  }
};

export const uploadImageToCloudinary = uploadFileToCloudinary;

