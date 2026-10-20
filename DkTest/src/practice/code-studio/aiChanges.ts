import { cleanPath, StudioFile, StudioProject, validateProject } from './project';
export const STUDIO_AI_MODEL = 'gemini-3.5-flash-lite';
export interface AiChanges { summary: string; files: StudioFile[]; deletePaths: string[]; entry?: string }
export function validateAiChanges(input: unknown): AiChanges {
  const value = input as AiChanges;
  if (!value || typeof value.summary !== 'string' || value.summary.length > 4000 || !Array.isArray(value.files) || value.files.length > 40 || !Array.isArray(value.deletePaths) || value.deletePaths.length > 40) throw new Error('Phản hồi AI không đúng định dạng thay đổi file.');
  const files = value.files.map(f => { if (typeof f?.content !== 'string' || typeof f.path !== 'string') throw new Error('AI trả về file không hợp lệ.'); return { path: cleanPath(f.path), content: f.content }; });
  const deletePaths = value.deletePaths.map(path => { if (typeof path !== 'string') throw new Error('Đường dẫn xóa không hợp lệ.'); return cleanPath(path); });
  if (new Set([...files.map(f => f.path), ...deletePaths]).size !== files.length + deletePaths.length) throw new Error('AI trả về đường dẫn trùng hoặc vừa sửa vừa xóa cùng file.');
  if (value.entry !== undefined && typeof value.entry !== 'string') throw new Error('Trang mở đầu không hợp lệ.');
  return { summary: value.summary, files, deletePaths, entry: value.entry ? cleanPath(value.entry) : undefined };
}
export function applyAiChanges(base: StudioProject, current: StudioProject, input: unknown): StudioProject {
  if (base.id !== current.id) throw new Error('Bạn đã chuyển dự án. Thay đổi AI chưa được áp dụng.');
  const changes = validateAiChanges(input);
  if (changes.files.some(f => current.files.find(existing => existing.path === f.path)?.asset)) throw new Error('AI chỉ sửa mã nguồn. File ảnh/video được quản lý bằng tải lên và cây thư mục.');
  const touched = new Set([...changes.files.map(f => f.path), ...changes.deletePaths]);
  for (const path of touched) {
    if (base.files.find(f => f.path === path)?.content !== current.files.find(f => f.path === path)?.content) throw new Error(`“${path}” đã được bạn sửa trong khi AI đang làm. Giữ nguyên code của bạn; hãy gửi lệnh lại.`);
  }
  const files = [...current.files.filter(f => !touched.has(f.path)), ...changes.files];
  const entry = changes.entry || current.entry;
  if (changes.entry && !files.some(f => f.path === changes.entry)) throw new Error('AI chọn trang mở đầu không tồn tại.');
  return validateProject({ ...current, files, entry, activeFile: changes.files.find(f => f.path === entry)?.path || changes.files[0]?.path || current.activeFile });
}
