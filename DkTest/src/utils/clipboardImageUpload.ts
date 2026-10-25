import { uploadImageToCloudinary } from "../services/cloudinary";

export interface ClipboardUploadOptions {
  value: string;
  onChange: (newValue: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onUploading?: (isUploading: boolean) => void;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Handles pasting an image from the operating system clipboard (temp memory)
 * directly to Cloudinary, inserting markdown image syntax `![ảnh](url)` at cursor position.
 */
export async function handleClipboardImagePaste(
  e: React.ClipboardEvent<HTMLTextAreaElement | HTMLElement>,
  options: ClipboardUploadOptions
): Promise<boolean> {
  const clipboardData = e.clipboardData;
  if (!clipboardData || !clipboardData.items) {
    return false;
  }

  let imageFile: File | null = null;

  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        imageFile = file;
        break;
      }
    }
  }

  if (!imageFile) {
    return false;
  }

  // Prevent default paste of binary data or filename string
  e.preventDefault();

  const { value, onChange, textareaRef, onUploading, onSuccess, onError } = options;
  const tempId = `temp_upload_${Date.now()}`;
  const placeholder = `![Đang tải ảnh lên Cloudinary...](${tempId})`;

  const curTarget = e.currentTarget as any;
  const evTarget = e.target as any;
  const targetEl =
    textareaRef?.current ||
    (curTarget && typeof curTarget.value === "string" ? curTarget : null) ||
    (evTarget && typeof evTarget.value === "string" ? evTarget : null);

  const el = targetEl;
  const initialValue = value ?? (el?.value || "");
  let textBefore = initialValue;
  let textAfter = "";

  if (el) {
    const start = typeof el.selectionStart === "number" ? el.selectionStart : textBefore.length;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : textBefore.length;
    textBefore = initialValue.substring(0, start);
    textAfter = initialValue.substring(end);
  }

  const textWithPlaceholder = `${textBefore}\n${placeholder}\n${textAfter}`;
  onChange(textWithPlaceholder);
  onUploading?.(true);

  try {
    const uploadedUrl = await uploadImageToCloudinary(imageFile);

    // Get current live text to preserve any typing user did while upload was in-flight
    const currentLiveText = el?.value && el.value.includes(placeholder) ? el.value : textWithPlaceholder;
    const finalMarkdown = `![ảnh](${uploadedUrl})`;
    const updated = currentLiveText.replace(placeholder, finalMarkdown);
    onChange(updated);

    // Reposition cursor right after inserted image
    if (el) {
      setTimeout(() => {
        try {
          const insertIdx = updated.indexOf(finalMarkdown);
          if (insertIdx !== -1) {
            const newPos = insertIdx + finalMarkdown.length;
            el.selectionStart = el.selectionEnd = newPos;
            el.focus();
          }
        } catch {
          // Ignore focus/selection errors in headless/synthetic environments
        }
      }, 0);
    }

    onSuccess?.(uploadedUrl);
    return true;
  } catch (err: any) {
    console.error("Cloudinary clipboard paste upload error:", err);
    const currentLiveText = el?.value && el.value.includes(placeholder) ? el.value : textWithPlaceholder;
    onChange(currentLiveText.replace(`${placeholder}\n`, "").replace(placeholder, ""));
    onError?.(err instanceof Error ? err : new Error("Tải ảnh từ clipboard lên Cloudinary thất bại"));
    return false;
  } finally {
    onUploading?.(false);
  }
}
