/* Loaded only after Run. Every run gets an isolated worker and can be terminated. */
self.onmessage = async ({ data }) => {
  const { language, files, activeFile, stdin } = data;
  const startedAt = performance.now();
  let executionAt = null;
  const send = (type, text = '') => self.postMessage({ type, text: String(text).slice(0, 8000) });
  const ready = () => { executionAt = performance.now(); send('ready'); };
  let output = 0;
  let pending = ''; let pendingLevel = 'log'; let success = true;
  const flush = () => { if (pending) { send(pendingLevel, pending); pending = ''; } };
  const write = (text, level = 'log') => {
    output += String(text).length;
    if (output > 100000) throw new Error('Đã vượt giới hạn 100 KB kết quả.');
    if (pendingLevel !== level) flush();
    pendingLevel = level; pending += String(text);
    if (pending.length >= 4000) flush();
  };
  const flushTimer = setInterval(flush, 40);
  const done = () => {
    clearInterval(flushTimer); flush();
    const now = performance.now();
    self.postMessage({ type: 'done', success, durationMs: executionAt === null ? 0 : now - executionAt, setupMs: (executionAt ?? now) - startedAt, totalMs: now - startedAt });
  };
  try {
    const source = files.find(f => f.path === activeFile)?.content || '';
    if (language === 'python') {
      send('status', 'Đang nạp Python lần đầu…');
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
      const py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/' });
      py.setStdout({ batched: text => write(text + '\n') });
      py.setStderr({ batched: text => write(text + '\n', 'error') });
      const lines = stdin.split('\n'); let index = 0;
      py.setStdin({ stdin: () => index < lines.length ? lines[index++] : null });
      py.FS.mkdirTree('/project');
      for (const file of files) {
        const path = '/project/' + file.path;
        py.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
        py.FS.writeFile(path, file.content);
      }
      py.FS.chdir('/project');
      py.runPython('import sys\nsys.path.insert(0, "/project")');
      ready();
      py.globals.set('__studio_path', '/project/' + activeFile);
      await py.runPythonAsync('import runpy, os\nsys.path.insert(0, os.path.dirname(__studio_path))\nrunpy.run_path(__studio_path, run_name="__main__")');
    } else if (language === 'cpp' || language === 'c') {
      send('status', 'Đang nạp trình thông dịch C++ cơ bản…');
      // JSCPP's browser build exports its API only when window exists. Without it,
      // it replaces onmessage with its own worker RPC protocol instead.
      self.window = { document: {} };
      importScripts('https://cdn.jsdelivr.net/gh/felixhao28/JSCPP@76e3534f04abf9c2547aa73ddca275e8935bed38/dist/JSCPP.es5.min.js');
      const cpp = self.window.JSCPP;
      delete self.window;
      ready();
      const expand = (path, seen = new Set()) => {
        if (seen.has(path)) return '';
        seen.add(path);
        const file = files.find(f => f.path === path);
        if (!file) throw new Error('Không tìm thấy ' + path);
        return file.content.replace(/^\s*#include\s*"([^"]+)"\s*$/gm, (_, target) => {
          const parts = path.split('/').slice(0, -1);
          for (const p of target.split('/')) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); }
          return expand(parts.join('/'), seen);
        });
      };
      const code = cpp.run(expand(activeFile), stdin, { stdio: { write: text => write(text) } });
      if (code !== 0) { success = false; write('\nChương trình trả về mã ' + code + '\n', 'error'); }
    } else if (language === 'javascript') {
      ready();
      const lines = stdin.split('\n'); let index = 0;
      const format = value => { try { return typeof value === 'string' ? value : JSON.stringify(value) ?? String(value); } catch { return String(value); } };
      const consoleProxy = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(level => [level, (...args) => write(args.map(format).join(' ') + '\n', level === 'error' ? 'error' : 'log')]));
      self.console = { ...self.console, ...consoleProxy };
      self.prompt = () => lines[index++] ?? null;
      await new (Object.getPrototypeOf(async function () {}).constructor)(source)();
    } else {
      throw new Error('Ngôn ngữ này chỉ hỗ trợ soạn thảo. HTML/CSS/JS chạy trong Preview.');
    }
    done();
  } catch (error) { success = false; flush(); send('error', error.message || error); done(); }
};
