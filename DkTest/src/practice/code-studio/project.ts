export interface StudioFile { path: string; content: string }
export interface StudioProject {
  version: 1;
  id: string;
  name: string;
  files: StudioFile[];
  folders: string[];
  activeFile: string;
  entry: string;
  updatedAt: number;
}

export const STORAGE_KEY = 'dktest.code-studio.v1';
export const MAX_PROJECT_BYTES = 1_000_000;
export const MAX_SHARE_LENGTH = 60_000;
export const languageFor = (path: string) => ({ html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', cpp: 'cpp', cc: 'cpp', c: 'c', h: 'cpp', hpp: 'cpp', json: 'json', jsonc: 'json', md: 'markdown', svg: 'xml', xml: 'xml', txt: 'plaintext', java: 'java', kt: 'kotlin', go: 'go', rs: 'rust', php: 'php', rb: 'ruby', swift: 'swift', sql: 'sql', sh: 'shell', bash: 'shell', ps1: 'powershell', yaml: 'yaml', yml: 'yaml', ini: 'ini', toml: 'ini', vue: 'html', svelte: 'html', dart: 'dart' }[path.split('.').pop()?.toLowerCase() || ''] || 'plaintext');

export function cleanPath(value: string): string {
  const path = value.trim().replace(/\\/g, '/');
  if (!path || path.length > 160 || path.startsWith('/') || /[\x00-\x1f<>:"|?*#]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..' || p.trim() !== p)) {
    throw new Error('Đường dẫn không hợp lệ. Ví dụ: src/main.js');
  }
  return path;
}

export function validateProject(input: unknown): StudioProject {
  if (!input || typeof input !== 'object') throw new Error('Dự án không hợp lệ.');
  const p = input as StudioProject;
  if (p.version !== 1 || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || !Array.isArray(p.files) || !p.files.length || p.files.length > 100 || !Array.isArray(p.folders) || p.folders.length > 100) throw new Error('Dự án cần 1–100 file và tên tối đa 80 ký tự.');
  const files = p.files.map(f => {
    if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') throw new Error('File không hợp lệ.');
    return { path: cleanPath(f.path), content: f.content };
  });
  const folders = [...new Set(p.folders.map(f => { if (typeof f !== 'string') throw new Error('Thư mục không hợp lệ.'); return cleanPath(f); }))];
  const paths = files.map(f => f.path);
  if (new Set(paths).size !== paths.length || paths.some(path => paths.some(other => other.startsWith(path + '/')) || folders.some(folder => folder === path || folder.startsWith(path + '/')))) throw new Error('File và thư mục bị trùng đường dẫn.');
  const project: StudioProject = { version: 1, id: typeof p.id === 'string' && /^[\w-]{1,80}$/.test(p.id) ? p.id : crypto.randomUUID(), name: p.name.trim(), files, folders, activeFile: paths.includes(p.activeFile) ? p.activeFile : paths[0], entry: paths.includes(p.entry) ? p.entry : (paths.find(f => /\.html?$/i.test(f)) || paths[0]), updatedAt: Date.now() };
  if (new TextEncoder().encode(JSON.stringify(project)).length > MAX_PROJECT_BYTES) throw new Error('Dự án quá lớn (tối đa 1 MB).');
  return project;
}

export function createProject(template: 'web' | 'python' | 'cpp' | 'javascript' = 'web'): StudioProject {
  const examples: Record<typeof template, { name: string; files: StudioFile[] }> = {
    web: { name: 'Website đầu tiên', files: [
      { path: 'index.html', content: '<!DOCTYPE html>\n<html lang="vi">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Xin chào thế giới</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <main class="card">\n      <span class="badge">ĐƯỢC TẠO BỞI BẠN ✦</span>\n      <h1>Ý tưởng nhỏ.<br />Khả năng vô hạn.</h1>\n      <p>Thay đổi vài dòng code và biến nơi này thành thế giới của bạn.</p>\n      <button id="hello">Chạm để khám phá ↗</button>\n      <p id="message" aria-live="polite"></p>\n    </main>\n    <script src="script.js"></script>\n  </body>\n</html>\n' },
      { path: 'styles.css', content: '@import url("./styles/tokens.css");\n\n* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: #eef2ff; font-family: system-ui, sans-serif; padding: 24px; }\n.card { width: min(100%, 520px); padding: 40px 28px; border: 1px solid #ffffff20; border-radius: 28px; background: #ffffff06; }\n.badge { color: var(--accent); font-size: 11px; letter-spacing: 2px; }\nh1 { font-size: clamp(32px, 8vw, 52px); line-height: 1.1; letter-spacing: -2px; }\np { color: #a9b3c9; line-height: 1.7; }\nbutton { background: var(--accent); border: 0; border-radius: 12px; padding: 16px 22px; font-weight: 700; cursor: pointer; }\n' },
      { path: 'script.js', content: 'const button = document.querySelector("#hello");\n\nbutton.addEventListener("click", () => {\n  document.querySelector("#message").textContent = "Bạn vừa viết nên điều kỳ diệu. Tiếp tục nhé! ✨";\n  console.log("Xin chào từ Code Studio!");\n});\n' },
      { path: 'styles/tokens.css', content: ':root {\n  --bg: #111827;\n  --accent: #a3e635;\n}\n' },
    ] },
    python: { name: 'Khám phá Python', files: [{ path: 'main.py', content: '# Python chạy ngay trong trình duyệt\nname = input("Tên của bạn: ")\nprint(f"Xin chào, {name or \'bạn\'}! 🐍")\n\nfor i in range(1, 6):\n    print("★" * i)\n' }, { path: 'helpers.py', content: 'def square(number):\n    return number * number\n' }] },
    cpp: { name: 'Bắt đầu C++', files: [{ path: 'main.cpp', content: '// C++ cơ bản: iostream, biến, điều kiện, vòng lặp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 1; i <= n; i++) {\n        cout << "Xin chao Code Studio! " << i << endl;\n    }\n    return 0;\n}\n' }] },
    javascript: { name: 'Khám phá JavaScript', files: [{ path: 'main.js', content: '// JavaScript console (không có DOM)\nconst languages = ["HTML", "CSS", "JavaScript", "Python", "C++"];\n\nfor (const [index, language] of languages.entries()) {\n  console.log(`${index + 1}. Xin chào ${language}!`);\n}\n' }] },
  };
  const example = examples[template];
  return { version: 1, id: crypto.randomUUID(), name: example.name, files: example.files.map(f => ({ ...f })), folders: [], activeFile: example.files[0].path, entry: example.files[0].path, updatedAt: Date.now() };
}

export function encodeShare(project: StudioProject): string {
  const bytes = new TextEncoder().encode(JSON.stringify(validateProject(project)));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const value = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (value.length > MAX_SHARE_LENGTH) throw new Error('Dự án quá lớn để đưa vào link. Hãy xuất file dự án và gửi cho bạn bè.');
  return value;
}

export function decodeShare(value: string): StudioProject {
  if (!value || value.length > MAX_SHARE_LENGTH || !/^[\w-]+$/.test(value)) throw new Error('Link dự án không hợp lệ hoặc quá lớn.');
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
    return { ...validateProject(parsed), id: crypto.randomUUID() };
  } catch { throw new Error('Không thể mở link. Dữ liệu dự án bị lỗi hoặc không tương thích.'); }
}

export function readProjects(): StudioProject[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 20) throw new Error('Bộ nhớ dự án không hợp lệ. Hãy xuất dự án trước khi tiếp tục.');
  return data.map(validateProject);
}

export function movePath(project: StudioProject, from: string, to: string): StudioProject {
  if (!project.files.some(f => f.path === from || f.path.startsWith(from + '/')) && !project.folders.some(p => p === from || p.startsWith(from + '/'))) throw new Error('File hoặc thư mục không còn tồn tại.');
  to = cleanPath(to);
  if (to === from) return project;
  if (to.startsWith(from + '/')) throw new Error('Không thể chuyển thư mục vào chính nó.');
  if ([...project.files.map(f => f.path), ...project.folders].some(p => p === to || p.startsWith(to + '/'))) throw new Error('Đường dẫn đích đã tồn tại.');
  const replace = (p: string) => p === from || p.startsWith(from + '/') ? to + p.slice(from.length) : p;
  return validateProject({ ...project, files: project.files.map(f => ({ ...f, path: replace(f.path) })), folders: project.folders.map(replace), activeFile: replace(project.activeFile), entry: replace(project.entry) });
}

export function projectFolders(project: Pick<StudioProject, 'files' | 'folders'>): string[] {
  const folders = new Set(project.folders);
  for (const path of [...project.files.map(f => f.path), ...project.folders]) {
    const parts = path.split('/'); parts.pop();
    while (parts.length) { folders.add(parts.join('/')); parts.pop(); }
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

export function moveIntoFolder(project: StudioProject, source: string, folder: string): StudioProject {
  const folders = projectFolders(project);
  if (folder && !folders.includes(cleanPath(folder))) throw new Error('Thư mục đích không tồn tại.');
  if (folder === source || folder.startsWith(source + '/')) throw new Error('Không thể chuyển thư mục vào chính nó hoặc thư mục con.');
  const target = (folder ? folder + '/' : '') + source.split('/').at(-1);
  if (target === source) return project;
  // Preserve empty source folders, including previously implicit parent folders.
  const parent = source.split('/').slice(0, -1).join('/');
  return movePath({ ...project, folders: [...new Set([...project.folders, ...(parent ? [parent] : [])])] }, source, target);
}

export function resolveLocal(from: string, target: string): string | null {
  if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(target)) return null;
  const parts = target.startsWith('/') ? [] : from.split('/').slice(0, -1);
  for (const p of target.split(/[?#]/)[0].split('/')) {
    if (p === '..') { if (!parts.length) return null; parts.pop(); }
    else if (p && p !== '.') parts.push(p);
  }
  return parts.join('/');
}
