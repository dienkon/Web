import { FullExportSchemaV3, ExportV3 } from "./schema";

export type ValidationResult = {
  success: boolean;
  errors: string[];
  data?: ExportV3;
};

export function validateExamJson(data: any): ValidationResult {
  try {
    const parsed = FullExportSchemaV3.safeParse(data);
    if (!parsed.success) {
      const errors = (parsed.error.issues || []).map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: true, errors: [], data: parsed.data };
  } catch (err: any) {
    return { success: false, errors: [err.message] };
  }
}
