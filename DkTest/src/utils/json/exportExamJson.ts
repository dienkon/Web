import { saveAs } from "file-saver";
import { ExportV3 } from "./schema";

export function exportJson(data: ExportV3, filenamePrefix: string) {
  const finalJson = JSON.stringify(data, null, 2);
  const blob = new Blob([finalJson], { type: "application/json;charset=utf-8" });
  
  const dateStr = new Date().toISOString().split("T")[0];
  const sanitizeName = filenamePrefix.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  saveAs(blob, `DkTEST_${sanitizeName}_${dateStr}.json`);
}
