import { migrateExamJson } from "./migrateExamJson";
import { validateExamJson, ValidationResult } from "./validateExamJson";

export const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10MB

export async function parseExamFile(file: File): Promise<ValidationResult> {
  if (file.size > MAX_IMPORT_SIZE) {
    return { success: false, errors: [`File quá lớn. Giới hạn là 10MB.`] };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rawJson = JSON.parse(text);
        
        // 1. Migrate & Normalize
        const migrated = migrateExamJson(rawJson);
        
        // 2. Validate against V3 schema
        const validation = validateExamJson(migrated);
        resolve(validation);
      } catch (err: any) {
        resolve({ success: false, errors: [`Không thể đọc file JSON: ${err.message}`] });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, errors: ["Lỗi đọc file"] });
    };
    reader.readAsText(file);
  });
}
