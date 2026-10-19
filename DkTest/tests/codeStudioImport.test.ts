import { describe, expect, it } from 'vitest';
import { applyCodeUpload, CodeUploadFile, readCodeUpload } from '../src/practice/code-studio/codeImport';
import { createProject } from '../src/practice/code-studio/project';

const file = (name: string, content: string, relative = ''): CodeUploadFile => {
  const bytes = new TextEncoder().encode(content);
  return { name, size: bytes.byteLength, webkitRelativePath: relative, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
};
const newOptions = { target: 'new' as const, name: 'Uploaded', folder: '', replace: false };
describe('Code Studio source upload', () => {
  it('imports one self-contained HTML unchanged as its own project and entry', async () => {
    const html = '<!DOCTYPE html><style>body{color:red}</style><button onclick="hello()">Click</button><script>function hello(){alert("Hi")}</script>';
    const upload = await readCodeUpload([file('demo.html', html)]);
    const project = applyCodeUpload(createProject(), upload, newOptions);
    expect(project.files).toEqual([{ path: 'demo.html', content: html }]);
    expect(project.activeFile).toBe('demo.html'); expect(project.entry).toBe('demo.html');
  });
  it('accepts multiple programming languages, config files and ordinary JSON as source', async () => {
    const names = ['main.py', 'main.cpp', 'app.tsx', 'App.vue', 'main.rs', 'main.go', 'config.json', '.gitignore'];
    const upload = await readCodeUpload(names.map(name => file(name, name === 'config.json' ? '{"setting":1}' : 'source')));
    expect(upload.files.map(f => f.path)).toEqual(names);
    expect(upload.files.find(f => f.path === 'config.json')?.content).toBe('{"setting":1}');
  });
  it('strips only the selected root folder and preserves nested paths and relative imports', async () => {
    const upload = await readCodeUpload([file('index.html', '<script src="src/main.js"></script>', 'my-site/pages/index.html'), file('main.js', 'console.log("hello")', 'my-site/pages/src/main.js')]);
    expect(upload.suggestedName).toBe('my-site');
    expect(upload.files.map(f => f.path)).toEqual(['pages/index.html', 'pages/src/main.js']);
    expect(applyCodeUpload(createProject(), upload, newOptions).entry).toBe('pages/index.html');
  });
  it('rejects duplicate upload names, path traversal, binary and invalid UTF-8 atomically', async () => {
    await expect(readCodeUpload([file('main.py', 'a'), file('main.py', 'b')])).rejects.toThrow(/Trùng/);
    await expect(readCodeUpload([file('main.py', 'a', 'root/../main.py')])).rejects.toThrow();
    await expect(readCodeUpload([file('image.bin', 'binary\0data')])).rejects.toThrow(/nhị phân/);
    await expect(readCodeUpload([{ name: 'binary.exe', size: 2, arrayBuffer: async () => new Uint8Array([0xff, 0xfe]).buffer }])).rejects.toThrow(/UTF-8/);
  });
  it('checks batch count and total file size before reading contents', async () => {
    await expect(readCodeUpload(Array.from({ length: 101 }, (_, i) => file(`${i}.js`, '')))).rejects.toThrow(/1–100/);
    let read = false;
    await expect(readCodeUpload([{ name: 'large.js', size: 1_000_001, arrayBuffer: async () => { read = true; return new ArrayBuffer(0); } }])).rejects.toThrow(/1 MB/);
    expect(read).toBe(false);
  });
  it('adds sources into a destination folder and rejects collisions without changing the existing project', async () => {
    const original = createProject(); const before = structuredClone(original);
    const upload = await readCodeUpload([file('script.js', 'new source')]);
    expect(() => applyCodeUpload(original, upload, { ...newOptions, target: 'current' })).toThrow(/đã tồn tại/);
    expect(original).toEqual(before);
    const nested = applyCodeUpload(original, upload, { ...newOptions, target: 'current', folder: 'styles' });
    expect(nested.files.find(f => f.path === 'styles/script.js')?.content).toBe('new source');
    expect(nested.files.find(f => f.path === 'script.js')?.content).toBe(before.files.find(f => f.path === 'script.js')?.content);
    expect(() => applyCodeUpload(original, upload, { ...newOptions, target: 'current', folder: 'missing' })).toThrow();
  });
  it('replaces files only when explicitly selected and makes an imported HTML the new entry', async () => {
    const upload = await readCodeUpload([file('index.html', '<style>h1{color:red}</style><script>console.log(1)</script>')]);
    const result = applyCodeUpload(createProject(), upload, { ...newOptions, target: 'current', replace: true });
    expect(result.files.filter(f => f.path === 'index.html')).toHaveLength(1);
    expect(result.files.find(f => f.path === 'index.html')?.content).toContain('console.log(1)');
    expect(result.entry).toBe('index.html');
  });
});
