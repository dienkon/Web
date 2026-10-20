import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, ImagePlus, Check, ChevronDown, ChevronRight, Code2, Download, FileCode2, FolderOpen, HelpCircle, LayoutPanelLeft, Play, Plus, Search, Settings2, Share2, Sparkles, Square, Terminal, Trash2, Upload, WrapText, X } from 'lucide-react';
import { cleanPath, createProject, decodeShare, languageFor, moveIntoFolder, movePath, projectFolders, readProjects, STORAGE_KEY, StudioProject, validateProject } from './project';
import { buildPreview } from './preview';
import { canFormat, formatCode } from './editorServices';
import StudioEditor, { EditorHandle } from './StudioEditor';
import { runnerDocument } from './runner';
import StudioShareDialog from './StudioShareDialog';
import StudioAiPanel from './StudioAiPanel';
import StudioProjectsDialog from './StudioProjectsDialog';
import { AiChanges, applyAiChanges } from './aiChanges';
import StudioExplorer from './StudioExplorer';
import StudioPreview, { PreviewDock } from './StudioPreview';
import { completionText, formatDuration } from './timing';
import { applyCodeUpload, CodeUpload, ImportOptions, readCodeUpload } from './codeImport';
import CodeImportDialog from './CodeImportDialog';
import StudioMediaDialog from './StudioMediaDialog';
import StudioAssetView from './StudioAssetView';
import { exportProjectZip } from './projectZip';
import { useStudioFullscreen } from './useStudioFullscreen';
import { StudioFile } from './project';
import './studio.css';
import './workspace.css';
import './mobile.css';

type Log = { level: string; text: string; at: number };
type Dialog = { kind: 'file' | 'folder' | 'rename' | 'move' | 'project' | 'projectRename'; path?: string; value: string; template?: 'web' | 'python' | 'cpp' | 'javascript' };
function boot(injected?: StudioProject) {
  let projects: StudioProject[] = []; let error = ''; let blocked = false;
  try { projects = readProjects(); } catch (e) { error = 'Không đọc được bộ nhớ: ' + (e as Error).message; blocked = true; }
  const shared = new URLSearchParams(window.location.hash.slice(1)).get('project');
  if (injected) { const copy = { ...validateProject(injected), id: crypto.randomUUID(), name: injected.name.slice(0, 70) + ' (bản sao)' }; projects.unshift(copy); }
  else if (shared) {
    try { const copy = decodeShare(shared); copy.name = copy.name.slice(0, 70) + ' (bản sao)'; projects.unshift(copy); }
    catch (e) { error = (e as Error).message; }
  }
  if (!projects.length) projects.push(createProject());
  return { projects, current: projects[0], error, blocked, shared: !!shared || !!injected };
}
function download(content: string, name: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CodeStudioPage({ initialSharedProject }: { initialSharedProject?: StudioProject } = {}) {
  const viewportMode = useStudioFullscreen();
  const mediaInput = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<File[] | null>(null);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number; controller: AbortController } | null>(null);
  const zipController = useRef<AbortController | null>(null);
  const zipUrl = useRef('');
  const [zipDownload, setZipDownload] = useState<{ url:string; name:string } | null>(null);
  useEffect(() => () => { if (zipUrl.current) URL.revokeObjectURL(zipUrl.current); }, []);
  useEffect(() => () => zipController.current?.abort(), []);
  const [initial] = useState(() => boot(initialSharedProject));
  const [projects, setProjects] = useState(initial.projects);
  const [project, setProject] = useState(initial.current);
  const [notice, setNotice] = useState(initial.error || (initial.shared ? 'Đã mở bản sao từ link. Bạn có thể chỉnh sửa và chia sẻ một link mới.' : ''));
  const [saveState, setSaveState] = useState('Đang lưu…');
  const [explorer, setExplorer] = useState(window.innerWidth >= 900);
  const [previewOpen, setPreviewOpen] = useState(window.innerWidth >= 1100 || window.innerWidth < 900 || matchMedia('(pointer: coarse)').matches);
  const [previewDock, setPreviewDock] = useState<PreviewDock>(window.innerWidth < 900 && window.innerHeight > window.innerWidth ? 'top' : 'right');
  const [mobilePanel, setMobilePanel] = useState<'code' | 'preview'>('code');
  const [outputOpen, setOutputOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stdin, setStdin] = useState('5');
  const [running, setRunning] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [formatOnSave, setFormatOnSave] = useState(false);
  const [touch, setTouch] = useState(() => matchMedia('(pointer: coarse)').matches || window.innerWidth < 700);
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState(window.innerWidth < 900 ? 16 : 15);
  const [cursor, setCursor] = useState([1, 1]);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [aiUndo, setAiUndo] = useState<{ before: StudioProject; after: StudioProject } | null>(null);
  const [codeUpload, setCodeUpload] = useState<CodeUpload | null>(null);
  const [readingUpload, setReadingUpload] = useState(false);
  const [showLogTimes, setShowLogTimes] = useState(true);
  const [previewDoc, setPreviewDoc] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [runnerDoc, setRunnerDoc] = useState('');
  const [runnerKey, setRunnerKey] = useState(0);
  const [autoPreview, setAutoPreview] = useState(!initial.shared);
  const editor = useRef<EditorHandle>(null);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const runnerFrame = useRef<HTMLIFrameElement>(null);
  const previewToken = useRef('');
  const runnerToken = useRef('');
  const runtimeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const runStartedAt = useRef<number | null>(null);
  const executionStartedAt = useRef<number | null>(null);
  const previewStartedAt = useRef<number | null>(null);
  const previewCompletedToken = useRef('');
  const consoleEnd = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const codeFileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const current = useRef(project); current.current = project;
  const library = useRef(projects); library.current = projects;
  const formatCounter = useRef(0);
  const touchPreference = useRef(false);
  const importShared = useRef<() => void>(() => {});
  const file = project.files.find(f => f.path === project.activeFile)!;
  const language = languageFor(file.path);
  const htmlFiles = project.files.filter(f => /\.html?$/i.test(f.path));

  const stop = useCallback(() => {
    clearTimeout(runtimeTimer.current); runnerToken.current = ''; setRunnerDoc(''); setRunning(false);
    runStartedAt.current = null; executionStartedAt.current = null;
  }, []);
  const update = useCallback((path: string, content: string) => {
    setSaveState('Đang lưu…');
    setProject(p => ({ ...p, files: p.files.map(f => f.path === path ? { ...f, content } : f), updatedAt: Date.now() }));
  }, []);
  const appendLog = useCallback((level: string, text: string) => setLogs(items => [...items.slice(-199), { level, text: text.slice(0, 8000), at: Date.now() }]), []);
  const onCursor = useCallback((line: number, column: number) => setCursor([line, column]), []);
  function cancelRun() {
    const elapsed = runStartedAt.current === null ? 0 : performance.now() - runStartedAt.current;
    stop(); appendLog('status', `Đã dừng theo yêu cầu · Tổng: ${formatDuration(elapsed)}`);
  }

  useEffect(() => {
    if (initial.shared) history.replaceState(history.state, '', location.pathname + location.search);
    return () => {
      clearTimeout(runtimeTimer.current);
      if (initial.blocked) return;
      try {
        const valid = validateProject(current.current);
        const all = [valid, ...library.current.filter(p => p.id !== valid.id)];
        if (all.length <= 20) localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch { /* Keep the last saved copy if storage is unavailable. */ }
    };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      document.querySelector<HTMLElement>('.code-studio')?.classList.toggle('keyboard-open', (window.innerHeight - (viewport?.height || window.innerHeight)) > 120);
      document.querySelector<HTMLElement>('.code-studio')?.style.setProperty('--studio-height', `${Math.round(viewport?.height || window.innerHeight)}px`);
      if (!touchPreference.current) setTouch(matchMedia('(pointer: coarse)').matches || window.innerWidth < 700);
    };
    resize(); viewport?.addEventListener('resize', resize); window.addEventListener('resize', resize);
    return () => { viewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => {
    const listener = () => importShared.current();
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initial.blocked) { setSaveState('Không thể lưu — hãy xuất dự án'); return; }
      try {
        const valid = validateProject(project);
        const all = [valid, ...projects.filter(p => p.id !== valid.id)];
        if (all.length > 20) throw new Error('Đã đạt giới hạn 20 dự án. Hãy xuất và xóa bớt dự án cũ.');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        setSaveState('Đã lưu trên máy');
      } catch (e) { setSaveState('Chưa lưu'); setNotice('Không lưu được: ' + (e as Error).message + ' Bạn có thể xuất dự án để giữ lại bài.'); }
    }, 500);
    return () => clearTimeout(timer);
  }, [project, projects]);
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (saveState !== 'Đã lưu trên máy') { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', onBeforeUnload); return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (event.source === previewFrame.current?.contentWindow && data.studioToken === previewToken.current && previewToken.current) {
        if (data.type === 'preview-ready' && previewCompletedToken.current !== data.studioToken) {
          previewCompletedToken.current = data.studioToken;
          appendLog('status', `Preview sẵn sàng · ${formatDuration(previewStartedAt.current === null ? 0 : performance.now() - previewStartedAt.current)}`);
        }
        if (typeof data.text === 'string') appendLog(data.level === 'error' ? 'error' : 'log', data.text);
      }
      if (event.source === runnerFrame.current?.contentWindow && data.studioToken === runnerToken.current && runnerToken.current) {
        if (data.type === 'done') {
          const now = performance.now();
          const total = runStartedAt.current === null ? 0 : now - runStartedAt.current;
          const elapsed = typeof data.durationMs === 'number' && Number.isFinite(data.durationMs) && data.durationMs >= 0 ? data.durationMs : executionStartedAt.current === null ? 0 : now - executionStartedAt.current;
          stop(); appendLog('status', completionText(data.success !== false, elapsed, total));
        }
        else if (data.type === 'ready') {
          executionStartedAt.current = performance.now();
          clearTimeout(runtimeTimer.current);
          runtimeTimer.current = setTimeout(() => { const elapsed = performance.now() - (runStartedAt.current ?? performance.now()); stop(); appendLog('error', `Đã dừng: vượt quá 10 giây thực thi · Tổng: ${formatDuration(elapsed)}`); }, 10000);
        } else if (typeof data.text === 'string') appendLog(['error', 'status'].includes(data.type) ? data.type : 'log', data.text);
      }
    };
    window.addEventListener('message', listener); return () => window.removeEventListener('message', listener);
  }, [appendLog, stop]);
  useEffect(() => { consoleEnd.current?.scrollIntoView({ block: 'nearest' }); }, [logs]);

  const refreshPreview = useCallback((p: StudioProject = current.current, reveal = true) => {
    try {
      previewStartedAt.current = performance.now();
      const token = crypto.randomUUID();
      const doc = buildPreview(p, token);
      previewToken.current = token; setPreviewDoc(doc); setPreviewKey(k => k + 1);
      if (reveal) { setPreviewOpen(true); setMobilePanel('preview'); if (window.innerWidth < 900) setExplorer(false); }
    } catch (e) { setNotice((e as Error).message); }
  }, []);
  useEffect(() => {
    // A received project is never executed automatically, including its HTML scripts.
    if (initial.shared) return;
    if (htmlFiles.length) refreshPreview(initial.current, false);
  }, []);
  useEffect(() => {
    if (!autoPreview || !previewDoc) return;
    const timer = setTimeout(() => refreshPreview(current.current, false), 800);
    return () => clearTimeout(timer);
  }, [project.files, project.entry, autoPreview, refreshPreview]);

  async function format() {
    if (formatting) return;
    const snapshot = current.current;
    const target = snapshot.files.find(f => f.path === snapshot.activeFile)!;
    const version = ++formatCounter.current;
    setFormatting(true);
    try {
      const code = await formatCode(target.content, languageFor(target.path));
      if (formatCounter.current !== version) return;
      const now = current.current;
      if (now.id !== snapshot.id || now.activeFile !== target.path || now.files.find(f => f.path === target.path)?.content !== target.content) { setNotice('Code đã thay đổi trong khi format. Hãy bấm Format lần nữa.'); return; }
      editor.current?.replace(code);
    } catch (e) { setNotice('Format: ' + (e as Error).message); }
    finally { if (formatCounter.current === version) setFormatting(false); }
  }
  const formatRef = useRef(format); formatRef.current = format;
  useEffect(() => {
    if (!formatOnSave || !canFormat(language)) return;
    const timer = setTimeout(() => { void formatRef.current(); }, 1800);
    return () => clearTimeout(timer);
  }, [file.content, file.path, formatOnSave]);

  function run() {
    stop(); setLogs([]);
    if (file.asset && htmlFiles.length) { refreshPreview(); return; }
    if (language === 'html') {
      const next = { ...project, entry: file.path };
      if (project.entry !== file.path) setProject(next);
      refreshPreview(next); setOutputOpen(open => window.innerWidth >= 900 || open); return;
    }
    if (['html', 'css'].includes(language) || (language === 'javascript' && htmlFiles.length > 0)) { refreshPreview(); setOutputOpen(open => window.innerWidth >= 900 || open); return; }
    if (!['javascript', 'python', 'cpp', 'c'].includes(language)) { setNotice('File này hỗ trợ soạn thảo. Chạy HTML/CSS/JS, Python hoặc C++ cơ bản. TypeScript cần được biên dịch trước.'); return; }
    setOutputOpen(true); setMobilePanel('code');
    const token = crypto.randomUUID(); runnerToken.current = token;
    runStartedAt.current = performance.now();
    setRunnerDoc(runnerDocument(project, language, stdin, token)); setRunnerKey(k => k + 1); setRunning(true);
    runtimeTimer.current = setTimeout(() => { const elapsed = performance.now() - (runStartedAt.current ?? performance.now()); stop(); appendLog('error', `Hết thời gian nạp runtime · Tổng: ${formatDuration(elapsed)}. Kiểm tra mạng và thử lại.`); }, 90000);
  }
  const runRef = useRef(run); runRef.current = run;
  useEffect(() => {
    function hotkey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); void formatRef.current(); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runRef.current(); }
      if (event.key === 'Escape') { setDialog(null); setShareOpen(false); setSettings(false); setHelp(false); setCodeUpload(null); setAiOpen(false); setProjectsOpen(false); }
    }
    window.addEventListener('keydown', hotkey); return () => window.removeEventListener('keydown', hotkey);
  }, []);

  function switchProject(next: StudioProject) {
    stop(); formatCounter.current++; setFormatting(false);
    setProjects(all => [project, ...all.filter(p => p.id !== project.id && p.id !== next.id), next]);
    setProject(next); setPreviewDoc(''); previewToken.current = ''; setLogs([]); setMobilePanel('code');
  }
  function openDialog(next: Dialog) { setDialogError(''); setDialog(next); }
  function applyAi(base: StudioProject, changes: AiChanges): string | null {
    try {
      const before = current.current;
      const next = applyAiChanges(base, before, changes);
      stop(); setAiUndo({ before, after: next }); setProject(next); setSaveState('Đang lưu…');
      setNotice('AI đã cập nhật dự án local. Bấm Chạy để kiểm tra hoặc Hoàn tác trong bảng AI.');
      return null;
    } catch (e: any) { return e.message; }
  }
  function undoAi() {
    if (!aiUndo || current.current.id !== aiUndo.after.id) return;
    if (JSON.stringify(current.current.files) !== JSON.stringify(aiUndo.after.files)) { setNotice('Bạn đã sửa thêm code sau khi AI hoàn tất. Hãy giữ hoặc sao lưu phần mới trước khi hoàn tác AI.'); return; }
    stop(); setProject(aiUndo.before); setAiUndo(null); setSaveState('Đang lưu…'); setNotice('Đã hoàn tác thay đổi AI.');
  }
  function manageProject(action: 'open' | 'rename' | 'duplicate' | 'delete' | 'export', id: string, name?: string) {
    const all = [current.current, ...projects.filter(p => p.id !== current.current.id)];
    const target = all.find(p => p.id === id); if (!target) throw new Error('Dự án không còn tồn tại.');
    if (action === 'open') { switchProject(target); setProjectsOpen(false); }
    if (action === 'rename') {
      const next = validateProject({ ...target, name: name?.trim() });
      if (id === project.id) setProject(next); else setProjects(all.map(p => p.id === id ? next : p));
      setSaveState('Đang lưu…');
    }
    if (action === 'duplicate') {
      if (all.length >= 20) throw new Error('Tối đa 20 dự án. Hãy xuất và xóa bớt dự án cũ.');
      switchProject({ ...structuredClone(target), id: crypto.randomUUID(), name: target.name.slice(0, 70) + ' (bản sao)', updatedAt: Date.now() });
    }
    if (action === 'delete' && window.confirm(`Xóa “${target.name}” trên thiết bị? Link đã chia sẻ vẫn được giữ, nhưng xóa dự án local sẽ mất bản làm việc để cập nhật.`)) {
      const rest = all.filter(p => p.id !== id);
      if (id === project.id) { stop(); const next = rest[0] || createProject(); setProject(next); setProjects(rest.length ? rest : [next]); setPreviewDoc(''); setLogs([]); }
      else setProjects(rest);
      setSaveState('Đang lưu…');
    }
    if (action === 'export') void exportZip(target);
  }
  function moveItem(source: string, destination: string) {
    try {
      const next = moveIntoFolder(current.current, source, destination);
      if (next === current.current) return;
      setProject(next); setSaveState('Đang lưu…');
      setNotice(`Đã chuyển ${source.split('/').at(-1)} → ${destination || 'thư mục gốc'}`);
    } catch (e) { setNotice((e as Error).message); }
  }
  importShared.current = () => {
    const shared = new URLSearchParams(location.hash.slice(1)).get('project');
    if (!shared) return;
    try {
      if (projects.length >= 20) throw new Error('Tối đa 20 dự án. Hãy xuất và xóa bớt dự án cũ.');
      const copy = decodeShare(shared);
      switchProject({ ...copy, name: copy.name.slice(0, 70) + ' (bản sao)' });
      setAutoPreview(false); setMobilePanel('code');
      setNotice('Đã mở bản sao từ link. Bấm Chạy khi bạn sẵn sàng.');
      history.replaceState(history.state, '', location.pathname + location.search);
    } catch (e) { setNotice((e as Error).message); }
  };
  function submitDialog(event: React.FormEvent) {
    event.preventDefault(); if (!dialog) return;
    try {
      if (dialog.kind === 'project' || dialog.kind === 'projectRename') {
        const name = dialog.value.trim(); if (!name || name.length > 80) throw new Error('Tên dự án cần 1–80 ký tự.');
        if (dialog.kind === 'projectRename') setProject(p => ({ ...p, name }));
        else {
          if (projects.length >= 20) throw new Error('Tối đa 20 dự án. Hãy xuất và xóa bớt dự án cũ.');
          switchProject({ ...createProject(dialog.template), name });
        }
      } else if (dialog.kind === 'rename') { setProject(movePath(project, dialog.path!, dialog.value)); }
      else if (dialog.kind === 'move') { setProject(moveIntoFolder(project, dialog.path!, dialog.value)); }
      else {
        const path = cleanPath(dialog.value);
        if ([...project.files.map(f => f.path), ...project.folders].some(p => p === path || p.startsWith(path + '/'))) throw new Error('Đường dẫn này đã tồn tại.');
        const next = dialog.kind === 'folder' ? { ...project, folders: [...project.folders, path] } : { ...project, files: [...project.files, { path, content: '' }], activeFile: path };
        setProject(validateProject(next));
      }
      setSaveState('Đang lưu…'); setDialog(null);
    } catch (e) { setDialogError((e as Error).message); }
  }
  function removePath(path: string) {
    const files = project.files.filter(f => f.path !== path && !f.path.startsWith(path + '/'));
    if (!files.length) { setNotice('Dự án cần ít nhất một file.'); return; }
    if (!window.confirm(`Xóa “${path}”${project.files.some(f => f.path.startsWith(path + '/')) ? ' và toàn bộ file bên trong' : ''}?`)) return;
    setProject(validateProject({ ...project, files, folders: project.folders.filter(f => f !== path && !f.startsWith(path + '/')) }));
  }
  async function importProject(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = '';
    if (!selected) return;
    if (selected.size > 1_000_000) { setNotice('File dự án tối đa 1 MB.'); return; }
    try {
      if (projects.length >= 20) throw new Error('Tối đa 20 dự án. Hãy xuất và xóa bớt dự án cũ.');
      const next = validateProject(JSON.parse(await selected.text()));
      switchProject({ ...next, id: crypto.randomUUID() }); setNotice('Đã nhập bản sao dự án. Bấm Chạy khi bạn sẵn sàng.');
    } catch (e) { setNotice('Không nhập được: ' + (e as Error).message); }
  }
  async function uploadCode(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []); event.target.value = '';
    if (!selected.length) return;
    setReadingUpload(true);
    try { setCodeUpload(await readCodeUpload(selected)); }
    catch (e) { setNotice((e as Error).message); }
    finally { setReadingUpload(false); }
  }
  function confirmCodeUpload(options: ImportOptions): string | null {
    if (!codeUpload) return 'Chưa chọn file mã nguồn.';
    try {
      if (options.target === 'new' && projects.length >= 20) throw new Error('Tối đa 20 dự án. Hãy xuất và xóa bớt dự án cũ.');
      const next = applyCodeUpload(current.current, codeUpload, options);
      if (options.target === 'new') switchProject(next);
      else { stop(); setProject(next); setPreviewDoc(''); previewToken.current = ''; setLogs([]); }
      setSaveState('Đang lưu…'); setCodeUpload(null); setMobilePanel('code');
      if (window.innerWidth < 900) setExplorer(false);
      setNotice(`Đã nhập ${codeUpload.files.length} file. Bấm Chạy để xem kết quả.`);
      return null;
    } catch (e) { return (e as Error).message; }
  }
  function addMedia(id: string, files: StudioFile[]) {
    if (current.current.id !== id) throw new Error('Dự án đã thay đổi. Hãy chọn lại file media.');
    const next = validateProject({ ...current.current, files: [...current.current.files, ...files], activeFile: files[0]?.path || current.current.activeFile });
    setProject(next); setSaveState('Đang lưu…'); if (window.innerWidth < 900) setExplorer(false); setNotice(`Đã thêm ${files.length} file media. Dùng đường dẫn trong assets cho HTML/CSS.`);
  }
  async function exportZip(target: StudioProject) {
    if (zipController.current) { setNotice('Một dự án đang được xuất ZIP.'); return; }
    const controller = new AbortController(); zipController.current = controller; setZipProgress({ done:0,total:target.files.length,controller });
    try {
      const blob = await exportProjectZip(target, controller.signal, (done,total) => setZipProgress({done,total,controller}));
      if (zipUrl.current) URL.revokeObjectURL(zipUrl.current);
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = (target.name.replace(/[^\p{L}\p{N} _-]/gu,'') || 'project') + '.zip';
      zipUrl.current = url; setZipDownload({ url,name:a.download }); a.style.display = 'none'; (document.fullscreenElement || document.body).append(a); a.click(); a.remove();
      setNotice('ZIP đã sẵn sàng, gồm mã nguồn, thư mục và file media.');
    } catch (error: any) { setNotice(controller.signal.aborted ? 'Đã hủy xuất ZIP.' : error.message); }
    finally { zipController.current = null; setZipProgress(null); }
  }
  function deleteProject() {
    if (!window.confirm(`Xóa dự án “${project.name}” khỏi máy? Hãy xuất dự án nếu muốn giữ lại.`)) return;
    stop(); const rest = projects.filter(p => p.id !== project.id);
    const next = rest[0] || createProject(); setProjects(rest.length ? rest : [next]); setProject(next); setPreviewDoc(''); setLogs([]);
  }

  const selectedProjects = [project, ...projects.filter(p => p.id !== project.id)];
  const modalOpen = !!(dialog || settings || help);

  return <main ref={viewportMode.root} className={`code-studio ${previewOpen ? 'with-preview' : ''} preview-${previewDock} mobile-${mobilePanel}`}>
    <header className="studio-header">
      <Link to="/practice" className="studio-back" aria-label="Về luyện tập"><ArrowLeft size={18} /></Link>
      <div className="studio-brand"><span className="studio-brand-icon"><Code2 size={22} /></span><div><strong>Code<span>Studio</span></strong><small>Ý tưởng của bạn. Không giới hạn.</small></div></div>
      <span className="studio-header-divider" />
      <button className="studio-icon-button" aria-label="Quản lý dự án" title="Quản lý dự án" onClick={() => setProjectsOpen(true)}><FolderOpen size={17} /></button><div className="studio-project-select"><FolderOpen size={15} /><select aria-label="Chọn dự án" value={project.id} onChange={e => { const next = selectedProjects.find(p => p.id === e.target.value); if (next) switchProject(next); }}>{selectedProjects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select><ChevronDown size={12} /></div>
      <button className="studio-icon-button" title="Tạo dự án mới" aria-label="Tạo dự án mới" onClick={() => openDialog({ kind: 'project', value: 'Dự án mới', template: 'web' })}><Plus size={18} /></button>
      <div className="studio-header-actions"><button className="studio-icon-button" aria-label={viewportMode.fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={() => void viewportMode.toggle()}>{viewportMode.fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button><button className="studio-button studio-share" onClick={() => setShareOpen(true)}><Share2 size={15} /><span>Chia sẻ</span></button><button className="studio-icon-button" onClick={() => setSettings(true)} aria-label="Cài đặt trình soạn thảo"><Settings2 size={18} /></button></div>
    </header>

    <div className="studio-workspace">
      <nav className="studio-activity" aria-label="Công cụ"><button className={explorer ? 'active' : ''} onClick={() => setExplorer(v => !v)} aria-label="Bật tắt cây thư mục" aria-expanded={explorer}><FolderOpen size={22} /></button><button onClick={() => { setExplorer(true); requestAnimationFrame(() => document.getElementById('studio-file-search')?.focus()); }} aria-label="Tìm file"><Search size={22} /></button><button className={outputOpen ? 'active' : ''} onClick={() => setOutputOpen(v => !v)} aria-label="Bật tắt console"><Terminal size={22} /></button><div className="studio-activity-spacer" /><button onClick={() => setHelp(true)} aria-label="Hướng dẫn"><HelpCircle size={22} /></button></nav>
      {explorer && <><button className="studio-explorer-backdrop" aria-label="Đóng cây thư mục" onClick={() => setExplorer(false)} /><StudioExplorer key={project.id} project={project}
        onOpen={path => { setProject(p => ({ ...p, activeFile: path })); setMobilePanel('code'); if (window.innerWidth < 900) setExplorer(false); }}
        onCreate={(kind, parent) => openDialog({ kind, value: parent ? parent + '/' : '' })}
        onRename={path => openDialog({ kind: 'rename', path, value: path })}
        onMoveDialog={path => openDialog({ kind: 'move', path, value: path.split('/').slice(0, -1).join('/') })}
        onMove={moveItem} onDelete={removePath}
        onRenameProject={() => openDialog({ kind: 'projectRename', value: project.name })} onClose={() => setExplorer(false)}>
        <div className="studio-explorer-bottom"><span>{project.files.length} file · Lưu tự động trên thiết bị</span><button disabled={readingUpload} onClick={() => codeFileInput.current?.click()}><Upload size={14} />{readingUpload ? 'Đang đọc file…' : 'Tải file code lên'}</button><button disabled={readingUpload} onClick={() => folderInput.current?.click()}><FolderOpen size={14} />Tải thư mục lên</button><button onClick={() => fileInput.current?.click()}><Upload size={14} />Nhập bản sao dự án JSON</button><button onClick={() => mediaInput.current?.click()}><ImagePlus size={14} />Tải ảnh / video</button><button disabled={!!zipProgress} onClick={() => void exportZip(project)}><Download size={14} />Xuất dự án ZIP</button><button onClick={() => download(JSON.stringify(project,null,2), project.name + ".dkcode.json")}><Download size={14} />Sao lưu JSON</button><button onClick={deleteProject}><Trash2 size={14} />Xóa dự án khỏi máy</button></div>
      </StudioExplorer></>}

      <section className="studio-main">
        <div className="studio-commandbar"><div className="studio-command-title"><span className="studio-live-dot" />KHÔNG GIAN LẬP TRÌNH<span className="studio-beta">BETA</span></div><div className="studio-command-actions"><button className={`studio-tool ${aiOpen ? 'active' : ''}`} onClick={() => setAiOpen(v => !v)} aria-label="AI lập trình"><Sparkles size={14} />AI</button><button className="studio-mobile-only" onClick={() => setExplorer(v => !v)} aria-label="Quản lý file"><FolderOpen size={16} /></button><button className="studio-tool" onClick={() => void format()} disabled={formatting || !canFormat(language)} title="Format bằng Prettier (Ctrl+S)"><Sparkles size={14} /><span>{formatting ? 'Đang format…' : 'Format'}</span></button><button className={`studio-tool ${previewOpen ? 'active' : ''}`} onClick={() => { setPreviewOpen(v => !v); setMobilePanel(previewOpen ? 'code' : 'preview'); }} aria-pressed={previewOpen}><LayoutPanelLeft size={15} /><span>Preview</span></button><button className={`studio-run ${running ? 'is-running' : ''}`} onClick={running ? cancelRun : run}>{running ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}<span>{running ? 'Dừng' : 'Chạy'}</span></button></div></div>

        <div className="studio-document-area">
          <div className="studio-code-column">
            <div className="studio-tabs" role="tablist" aria-label="File đang mở">{project.files.map(f => <button role="tab" aria-selected={f.path === project.activeFile} key={f.path} className={f.path === project.activeFile ? 'active' : ''} onClick={() => setProject(p => ({ ...p, activeFile: f.path }))}><FileCode2 size={13} className={`file-${languageFor(f.path)}`} /><span>{f.path.split('/').at(-1)}</span>{f.path === project.activeFile && <span className="studio-tab-dot" />}</button>)}<button onClick={() => openDialog({ kind: 'file', value: '' })} aria-label="Thêm file"><Plus size={15} /></button></div>
            <div className="studio-breadcrumb"><span>{project.name}</span><ChevronRight size={11} /><span>{file.path}</span><span className="studio-language">{language}</span></div>
            {file.asset ? <StudioAssetView key={file.path} file={file} /> : <StudioEditor key={project.id} ref={editor} project={project} onChange={update} onCursor={onCursor} touch={touch} fontSize={fontSize} wrap={wrap} />}
            <div hidden={!!file.asset} className="studio-keybar" aria-label="Phím hỗ trợ lập trình">{['Tab', '{ }', '( )', '[ ]', '< >', '"', "'", ';', '=', '/', ':'].map(key => <button key={key} onPointerDown={e => e.preventDefault()} onClick={() => editor.current?.insert(key === 'Tab' ? (language === 'python' ? '    ' : '  ') : key.replace(' ', ''))}>{key}</button>)}<button className="studio-suggest-key" onPointerDown={e => e.preventDefault()} onClick={() => editor.current?.command('suggest')}><Sparkles size={13} />Gợi ý</button></div>
            {outputOpen && <section className="studio-output" aria-label="Console"><div className="studio-pane-title"><span><Terminal size={13} />CONSOLE <b>{logs.filter(l => l.level === 'error').length || ''}</b></span><div><label className="studio-console-timestamps"><input type="checkbox" checked={showLogTimes} onChange={e => setShowLogTimes(e.target.checked)} />Giờ</label><button onClick={() => setLogs([])} title="Xóa console" aria-label="Xóa console"><Trash2 size={14} /></button><button onClick={() => setOutputOpen(false)} aria-label="Đóng console"><X size={15} /></button></div></div><div className="studio-output-body"><label className="studio-stdin-label">STDIN <small>input() / cin / prompt() — mỗi giá trị một dòng</small><textarea aria-label="Dữ liệu đầu vào" value={stdin} onChange={e => setStdin(e.target.value)} placeholder="Nhập dữ liệu trước khi chạy…" /></label><div className="studio-console-lines" role="log" aria-live="polite">{logs.length ? logs.map((log, i) => <div key={i} className="studio-log-row">{showLogTimes && <time dateTime={new Date(log.at).toISOString()}>{new Date(log.at).toLocaleTimeString("vi-VN", { hour12: false })}</time>}<pre className={`log-${log.level}`}>{log.text}</pre></div>) : <p>Kết quả và lỗi sẽ xuất hiện ở đây.</p>}<div ref={consoleEnd} /></div></div></section>}
          </div>

          {previewOpen && <StudioPreview dock={previewDock} onDock={setPreviewDock} frameRef={previewFrame} doc={previewDoc} docKey={previewKey} htmlFiles={htmlFiles} entry={project.entry}
            onEntry={path => { const next = { ...project, entry: path }; setProject(next); if (previewDoc) refreshPreview(next, false); }}
            auto={autoPreview} onAuto={setAutoPreview} onRun={() => refreshPreview()} onClose={() => { setPreviewOpen(false); setMobilePanel('code'); }} />}
        </div>
        <div className="studio-mobile-switch"><button className={mobilePanel === 'code' ? 'active' : ''} onClick={() => setMobilePanel('code')}><Code2 size={16} />Code</button><button className={previewOpen && mobilePanel === 'preview' ? 'active' : ''} onClick={() => { setPreviewOpen(true); setMobilePanel('preview'); }}><LayoutPanelLeft size={16} />Preview</button><button className={outputOpen ? 'active' : ''} onClick={() => { setOutputOpen(v => !v); setMobilePanel('code'); }}><Terminal size={16} />Console</button></div>
        <footer className="studio-status"><span><Check size={12} />{saveState}</span><span className="studio-status-hint">{language === 'cpp' || language === 'c' ? 'C++ cơ bản · JSCPP · chưa hỗ trợ toàn bộ STL/C++17' : language === 'python' ? 'Python · Pyodide · lần đầu cần tải runtime' : 'Ctrl + Enter để chạy · Ctrl + S để format'}</span><span>Ln {cursor[0]}, Col {cursor[1]}</span><button onClick={() => { if (touch) setNotice('Chế độ mobile luôn giữ một dòng code trên một hàng. Vuốt ngang để xem dòng dài.'); else setWrap(v => !v); }} title="Bật tắt xuống dòng trên desktop"><WrapText size={12} />{!touch && wrap ? 'Wrap' : 'No wrap'}</button><span>UTF-8</span></footer>
      </section>
    </div>
    {runnerDoc && <iframe key={runnerKey} ref={runnerFrame} className="studio-runner-frame" title="Runtime cách ly" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={runnerDoc} />}
    <input ref={fileInput} className="studio-hidden-input" type="file" accept=".json,.dkcode.json" onChange={importProject} />
    <input ref={mediaInput} className="studio-hidden-input" type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime" aria-label="Chọn ảnh và video" onChange={e => { const files = [...(e.target.files || [])]; e.target.value = ''; if (files.length) setMediaFiles(files); }} />
    {mediaFiles && <StudioMediaDialog project={project} files={mediaFiles} onApply={addMedia} onClose={() => setMediaFiles(null)} />}
    {zipDownload && !zipProgress && <div className="studio-export-progress"><span>ZIP đã sẵn sàng</span><a href={zipDownload.url} download={zipDownload.name}>Tải ZIP</a><button aria-label="Đóng tải ZIP" onClick={() => { URL.revokeObjectURL(zipDownload.url); zipUrl.current = ''; setZipDownload(null); }}>×</button></div>}
    {zipProgress && <div className="studio-export-progress" role="status"><span>Đang xuất ZIP · {zipProgress.done}/{zipProgress.total} file</span><button onClick={() => zipProgress.controller.abort()}>Hủy</button></div>}
    <input ref={codeFileInput} className="studio-hidden-input" type="file" multiple aria-label="Chọn file mã nguồn" onChange={uploadCode} />
    <input ref={folderInput} className="studio-hidden-input" type="file" multiple {...{ webkitdirectory: '', directory: '' }} aria-label="Chọn thư mục mã nguồn" onChange={uploadCode} />
    {shareOpen && <StudioShareDialog project={project} onClose={() => setShareOpen(false)} />}
    {projectsOpen && <StudioProjectsDialog projects={selectedProjects} currentId={project.id} onAction={manageProject} onClose={() => setProjectsOpen(false)} />}
    {aiOpen && <StudioAiPanel key={project.id} project={project} onApply={applyAi} onUndo={undoAi} canUndo={!!aiUndo && aiUndo.after.id === project.id} onClose={() => setAiOpen(false)} />}
    {codeUpload && <CodeImportDialog upload={codeUpload} project={project} onImport={confirmCodeUpload} onClose={() => setCodeUpload(null)} />}
    {notice && <div className="studio-notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Đóng thông báo"><X size={17} /></button></div>}
    {modalOpen && <div className="studio-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setDialog(null); setShareOpen(false); setSettings(false); setHelp(false); } }}><section className="studio-modal" role="dialog" aria-modal="true" aria-label={dialog ? 'Quản lý dự án' : settings ? 'Cài đặt' : 'Hướng dẫn'} onKeyDown={e => { if (e.key === 'Tab') { const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')).filter(node => !(node as HTMLButtonElement).disabled); const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }}>
      <button className="studio-modal-close" aria-label="Đóng hộp thoại" onClick={() => { setDialog(null); setShareOpen(false); setSettings(false); setHelp(false); }}><X size={19} /></button>
      {dialog && <form onSubmit={submitDialog}><span className="studio-modal-eyebrow">CODE STUDIO / WORKSPACE</span><h2>{{ file: 'Tạo file mới', folder: 'Tạo thư mục', rename: 'Đổi tên / di chuyển', move: 'Di chuyển tới thư mục', project: 'Bắt đầu một ý tưởng.', projectRename: 'Đổi tên dự án' }[dialog.kind]}</h2>{dialog.kind === 'move' ? <label>Thư mục đích<select className="studio-move-select" autoFocus value={dialog.value} onChange={e => setDialog({ ...dialog, value: e.target.value })}><option value="">Thư mục gốc</option>{projectFolders(project).filter(path => path !== dialog.path && !path.startsWith(dialog.path! + '/')).map(path => <option key={path} value={path}>{path}</option>)}</select></label> : <label>{dialog.kind === 'project' || dialog.kind === 'projectRename' ? 'Tên dự án' : 'Đường dẫn'}<input autoFocus value={dialog.value} onChange={e => setDialog({ ...dialog, value: e.target.value })} placeholder={dialog.kind === 'file' ? 'src/main.js' : dialog.kind === 'folder' ? 'src/components' : 'Nhập tên…'} maxLength={160} required /></label>}{dialog.kind === 'project' && <div className="studio-template-grid">{([['web', '🌐', 'Web', 'HTML · CSS · JS'], ['python', '🐍', 'Python', 'Chạy với Pyodide'], ['cpp', '⚡', 'C++', 'Bài tập cơ bản'], ['javascript', '✦', 'JavaScript', 'Console & thuật toán']] as const).map(([id, icon, title, detail]) => <button key={id} type="button" className={dialog.template === id ? 'active' : ''} onClick={() => setDialog({ ...dialog, template: id })}><span>{icon}</span><strong>{title}</strong><small>{detail}</small></button>)}</div>}{dialogError && <p className="studio-form-error" role="alert">{dialogError}</p>}<button className="studio-primary" type="submit">{dialog.kind === 'project' ? 'Tạo dự án' : 'Lưu'}<ChevronRight size={16} /></button></form>}

      {settings && <><span className="studio-modal-eyebrow">MAKE IT YOURS</span><h2>Góc code của bạn.</h2><label className="studio-setting-row">Chế độ cảm ứng <input autoFocus type="checkbox" checked={touch} onChange={e => { touchPreference.current = true; setTouch(e.target.checked); }} /></label><p className="studio-setting-hint">Bàn phím điện thoại, màu cú pháp và gợi ý chạm. Tắt để dùng Monaco với IntelliSense, kiểm tra lỗi, undo/redo và tìm kiếm.</p><label className="studio-setting-row">Tự format sau khi ngừng gõ<input type="checkbox" checked={formatOnSave} onChange={e => setFormatOnSave(e.target.checked)} /></label><label className="studio-setting-row">Tự xuống dòng<input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} /></label><label className="studio-setting-row">Cỡ chữ <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))}>{[13, 14, 15, 16, 18, 20].map(n => <option key={n} value={n}>{n}px</option>)}</select></label><button className="studio-secondary" onClick={() => file.asset ? window.open(file.asset.url, '_blank', 'noopener,noreferrer') : download(file.content, file.path.split('/').at(-1)!, 'text/plain;charset=utf-8')}><Download size={15} />{file.asset ? 'Mở file media' : 'Tải file hiện tại'}</button></>}
      {help && <><span className="studio-modal-eyebrow">TỪ DÒNG CODE ĐẦU TIÊN</span><h2>Chào mừng đến studio.</h2><p><b>Web:</b> chọn trang HTML mở đầu, liên kết CSS/JS bằng đường dẫn tương đối rồi bấm Chạy. Hỗ trợ CSS @import và JS module cục bộ. Preview bật/tắt riêng; mặc định chạy thủ công.</p><p><b>Python:</b> chọn file .py, nhập STDIN trong Console rồi Chạy. Hỗ trợ import file Python trong dự án. Runtime tải từ CDN ở lần chạy đầu.</p><p><b>C++:</b> chạy bài cơ bản bằng JSCPP: iostream, cin/cout, hàm và vòng lặp, include file .h cục bộ. Đây là trình thông dịch giới hạn, chưa thay thế GCC/Clang hoặc hỗ trợ toàn bộ STL.</p><p><b>JavaScript:</b> dự án web chạy trong Preview. Dự án JS riêng chạy console trong worker; dùng prompt() để đọc STDIN. TypeScript và các file khác hỗ trợ soạn thảo.</p><p><b>Format:</b> Prettier cho HTML/CSS/JS/TS/JSON/Markdown. Ctrl+S để format; Ctrl+Enter để chạy. Trên điện thoại, dùng thanh ký tự và nút Gợi ý.</p><p><b>Lưu & chia sẻ:</b> lưu tự động trên thiết bị. Xuất .dkcode.json để sao lưu và nhập lại trên máy khác. Link chia sẻ tạo bản sao chỉnh sửa, không đồng bộ trực tiếp.</p><a href="https://prettier.io/docs/browser" target="_blank" rel="noreferrer">Tài liệu Prettier ↗</a></>}
    </section></div>}
  </main>;
}
