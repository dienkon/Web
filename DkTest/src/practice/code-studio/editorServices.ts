const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/';
let monacoPromise: Promise<any> | undefined;
export function loadMonaco(): Promise<any> {
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.monaco?.editor) { resolve(w.monaco); return; }
    const timer = setTimeout(() => reject(new Error('Không thể tải Monaco. Bạn vẫn có thể dùng trình soạn thảo cảm ứng.')), 20000);
    w.MonacoEnvironment = { getWorkerUrl: () => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`self.MonacoEnvironment={baseUrl:${JSON.stringify(MONACO_BASE)}};importScripts(${JSON.stringify(MONACO_BASE + 'vs/base/worker/workerMain.js')});`) };
    const script = document.createElement('script');
    script.src = MONACO_BASE + 'vs/loader.js';
    script.onload = () => {
      w.require.config({ paths: { vs: MONACO_BASE + 'vs' } });
      w.require(['vs/editor/editor.main'], () => { clearTimeout(timer); resolve(w.monaco); }, (error: Error) => { clearTimeout(timer); reject(error); });
    };
    script.onerror = () => { clearTimeout(timer); reject(new Error('Không thể tải Monaco từ CDN.')); };
    document.head.append(script);
  });
  monacoPromise.catch(() => { monacoPromise = undefined; });
  return monacoPromise;
}

const prettierModules = new Map<string, Promise<any>>();
function prettierModule(name: string) {
  if (!prettierModules.has(name)) {
    const url = `https://cdn.jsdelivr.net/npm/prettier@3.6.2/${name}.mjs`;
    prettierModules.set(name, import(/* @vite-ignore */ url).catch(error => { prettierModules.delete(name); throw error; }));
  }
  return prettierModules.get(name)!;
}
export function canFormat(language: string) { return ['html', 'css', 'javascript', 'typescript', 'json', 'markdown'].includes(language); }
export async function formatCode(code: string, language: string): Promise<string> {
  const parser = { html: 'html', css: 'css', javascript: 'babel', typescript: 'typescript', json: 'json', markdown: 'markdown' }[language];
  if (!parser) throw new Error('Prettier hỗ trợ HTML, CSS, JS, TS, JSON và Markdown. Python/C++ giữ nguyên thụt lề của bạn.');
  const names = { html: ['html'], css: ['postcss'], javascript: ['babel', 'estree'], typescript: ['typescript', 'estree'], json: ['babel', 'estree'], markdown: ['markdown'] }[language]!;
  const [prettier, ...plugins] = await Promise.all([prettierModule('standalone'), ...names.map(name => prettierModule('plugins/' + name))]);
  return prettier.format(code, { parser, plugins, tabWidth: 2, printWidth: 88, singleQuote: false });
}

export const snippets: Record<string, { label: string; code: string }[]> = {
  html: [{ label: 'div', code: '<div class="container">\n  \n</div>' }, { label: 'button', code: '<button type="button">Nhấn vào đây</button>' }, { label: 'link:css', code: '<link rel="stylesheet" href="styles.css" />' }, { label: 'script', code: '<script src="script.js"></script>' }, { label: 'input', code: '<input type="text" placeholder="Nhập nội dung" />' }],
  css: [{ label: 'flex', code: 'display: flex;\nalign-items: center;\njustify-content: center;' }, { label: 'grid', code: 'display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\ngap: 16px;' }, { label: 'media', code: '@media (max-width: 640px) {\n  \n}' }],
  javascript: [{ label: 'log', code: 'console.log();' }, { label: 'function', code: 'function hello() {\n  \n}' }, { label: 'for', code: 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}' }, { label: 'querySelector', code: 'document.querySelector("")' }],
  typescript: [{ label: 'interface', code: 'interface User {\n  name: string;\n}' }, { label: 'log', code: 'console.log();' }],
  python: [{ label: 'print', code: 'print()' }, { label: 'for', code: 'for i in range(10):\n    print(i)' }, { label: 'def', code: 'def hello():\n    pass' }, { label: 'input', code: 'name = input("Tên: ")' }, { label: 'if', code: 'if True:\n    pass' }],
  cpp: [{ label: 'cout', code: 'cout << "Xin chao!" << endl;' }, { label: 'cin', code: 'cin >> n;' }, { label: 'for', code: 'for (int i = 0; i < 10; i++) {\n    cout << i << endl;\n}' }, { label: 'main', code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}' }],
};
