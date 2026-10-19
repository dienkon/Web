import { cleanPath, MAX_PROJECT_BYTES, projectFolders, StudioFile, StudioProject, validateProject } from './project';

export interface CodeUploadFile {
  name: string;
  size: number;
  webkitRelativePath?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface CodeUpload { files: StudioFile[]; suggestedName: string }
export interface ImportOptions { target: 'new' | 'current'; name: string; folder: string; replace: boolean }

/** Read source text, never execute uploads, and reject the whole batch on errors. */
export async function readCodeUpload(input: readonly CodeUploadFile[]): Promise<CodeUpload> {
  if (!input.length || input.length > 100) throw new Error('Chọn từ 1–100 file mã nguồn. Với dự án lớn, chỉ chọn thư mục chứa code cần dùng.');
  if (input.reduce((total, file) => total + file.size, 0) > MAX_PROJECT_BYTES) throw new Error('Tổng mã nguồn tối đa 1 MB. Hãy chọn ít file hơn.');
  const root = input.every(f => f.webkitRelativePath?.includes('/')) ? input[0].webkitRelativePath!.split('/')[0] : '';
  const commonRoot = root && input.every(f => f.webkitRelativePath!.startsWith(root + '/')) ? root : '';
  const paths = new Set<string>();
  const files: StudioFile[] = [];
  for (const file of input) {
    const relative = file.webkitRelativePath || file.name;
    const path = cleanPath(commonRoot ? relative.slice(commonRoot.length + 1) : relative);
    if (paths.has(path)) throw new Error(`Trùng đường dẫn “${path}” trong các file đã chọn. Hãy tải cả thư mục để giữ cấu trúc.`);
    paths.add(path);
    let content: string;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
    catch { throw new Error(`Không đọc được “${path}”. Hãy chọn file mã nguồn UTF-8.`); }
    if (content.includes('\0')) throw new Error(`“${path}” là file nhị phân hoặc không phải mã nguồn UTF-8.`);
    files.push({ path, content });
  }
  return { files, suggestedName: (commonRoot || files[0].path.split('/').at(-1)!.replace(/\.[^.]+$/, '') || 'Dự án đã tải lên').slice(0, 80) };
}

export function applyCodeUpload(project: StudioProject, upload: CodeUpload, options: ImportOptions): StudioProject {
  const folder = options.target === 'current' ? options.folder : '';
  if (folder && !projectFolders(project).includes(cleanPath(folder))) throw new Error('Thư mục nhận file không còn tồn tại.');
  const incoming = upload.files.map(f => ({ ...f, path: cleanPath((folder ? folder + '/' : '') + f.path) }));
  const existing = options.target === 'current' ? project.files : [];
  const collision = incoming.find(f => existing.some(other => other.path === f.path));
  if (collision && !options.replace) throw new Error(`File “${collision.path}” đã tồn tại. Chọn thay thế file trùng hoặc nhập thành dự án mới.`);
  const addedPaths = new Set(incoming.map(f => f.path));
  const files = [...existing.filter(f => !addedPaths.has(f.path)), ...incoming];
  const html = incoming.find(f => /(^|\/)index\.html?$/i.test(f.path)) || incoming.find(f => /\.html?$/i.test(f.path));
  const activeFile = html?.path || incoming[0]?.path;
  const result = options.target === 'new'
    ? { version: 1, id: crypto.randomUUID(), name: options.name.trim(), files, folders: [], activeFile, entry: activeFile, updatedAt: Date.now() }
    : { ...project, files, activeFile, entry: html?.path || project.entry, updatedAt: Date.now() };
  return validateProject(result);
}
