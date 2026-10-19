import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createProject, moveIntoFolder, projectFolders } from '../src/practice/code-studio/project';
import { completionText, formatDuration } from '../src/practice/code-studio/timing';
import { fitFloating } from '../src/practice/code-studio/StudioPreview';

describe('Code Studio workspace moves', () => {
  it('moves a file into a folder, updating the active tab without changing its contents', () => {
    const p = createProject(); p.activeFile = 'script.js';
    const moved = moveIntoFolder(p, 'script.js', 'styles');
    expect(moved.activeFile).toBe('styles/script.js');
    expect(moved.files.find(f => f.path === 'styles/script.js')?.content).toBe(p.files.find(f => f.path === 'script.js')?.content);
    expect(p.files.some(f => f.path === 'script.js')).toBe(true);
  });
  it('moves a folder and its entire subtree to the root', () => {
    const p = createProject(); p.files = [{ path: 'src/app/index.html', content: '<h1>Hello</h1>' }]; p.activeFile = p.entry = 'src/app/index.html'; p.folders = ['src/app/empty'];
    const moved = moveIntoFolder(p, 'src/app', '');
    expect(moved.activeFile).toBe('app/index.html'); expect(moved.entry).toBe('app/index.html');
    expect(moved.folders).toContain('app/empty'); expect(projectFolders(moved)).toContain('src');
  });
  it('retains the empty source folder when its last file moves out', () => {
    const p = createProject();
    const moved = moveIntoFolder(p, 'styles/tokens.css', '');
    expect(moved.files.some(f => f.path === 'tokens.css')).toBe(true);
    expect(moved.folders).toContain('styles');
    expect(moveIntoFolder(moved, 'tokens.css', '')).toBe(moved);
  });
  it('rejects descendants, collisions, missing sources and invalid destinations without mutating files', () => {
    const p = createProject(); p.folders = ['styles/nested'];
    p.files.push({ path: 'styles/script.js', content: 'do not overwrite' });
    const original = structuredClone(p);
    for (const [source, destination] of [['styles', 'styles'], ['styles', 'styles/nested'], ['script.js', 'styles'], ['gone.js', 'styles'], ['script.js', 'missing'], ['script.js', '../private']]) {
      expect(() => moveIntoFolder(p, source, destination)).toThrow();
      expect(p).toEqual(original);
    }
  });
});

describe('Preview positioning', () => {
  it('keeps a resized or dragged floating preview inside the mobile viewport', () => {
    const fitted = fitFloating({ x: 1000, y: 900, width: 700, height: 1000 }, 390, 400);
    expect(fitted.x).toBeGreaterThanOrEqual(8); expect(fitted.y).toBeGreaterThanOrEqual(8);
    expect(fitted.x + fitted.width).toBeLessThanOrEqual(382); expect(fitted.y + fitted.height).toBeLessThanOrEqual(392);
  });
});

describe('Run timing and output', () => {
  it('formats subsecond, long and invalid durations and distinguishes execution errors', () => {
    expect(formatDuration(1.25)).toBe('1.3 ms'); expect(formatDuration(1423)).toBe('1.42 s'); expect(formatDuration(NaN)).toBe('0 ms');
    expect(completionText(true, 20, 2500)).toContain('Chạy xong. Thực thi: 20 ms · Tổng: 2.50 s');
    expect(completionText(false, 10, 20)).toContain('Kết thúc có lỗi.');
  });
  const source = fs.readFileSync('src/practice/code-studio/runtime.worker.js', 'utf8');
  async function execute(code: string, language = 'javascript', cppExit = 0) {
    const messages: any[] = [];
    const context: any = { performance, setInterval, clearInterval, setTimeout, console: {}, postMessage: (value: any) => messages.push(value) };
    context.self = context;
    context.importScripts = () => { context.window.JSCPP = { run(_code: string, _stdin: string, options: any) { options.stdio.write('Hello'); options.stdio.write(' world'); options.stdio.write('\n'); return cppExit; } }; };
    vm.runInNewContext(source, context);
    await context.onmessage({ data: { language, files: [{ path: 'main.js', content: code }], activeFile: 'main.js', stdin: '' } });
    return messages;
  }
  it('includes async execution duration in the completion event', async () => {
    const messages = await execute('await new Promise(r => setTimeout(r, 20)); console.log("finished");');
    const completion = messages.at(-1);
    expect(completion.type).toBe('done'); expect(completion.success).toBe(true);
    expect(completion.durationMs).toBeGreaterThanOrEqual(15); expect(completion.totalMs).toBeGreaterThanOrEqual(completion.durationMs);
    expect(messages.find(m => m.type === 'log')?.text).toBe('finished\n');
  });
  it('flushes output before an error and marks completion unsuccessful', async () => {
    const messages = await execute('console.log("before"); throw new Error("broken");');
    expect(messages.find(m => m.type === 'log')?.text).toBe('before\n');
    expect(messages.find(m => m.type === 'error')?.text).toBe('broken');
    expect(messages.at(-1).success).toBe(false);
  });
  it('batches C++ stream fragments into readable output and treats nonzero exit as failure', async () => {
    const messages = await execute('', 'cpp', 2);
    expect(messages.filter(m => m.type === 'log').map(m => m.text).join('')).toBe('Hello world\n');
    expect(messages.at(-1).success).toBe(false);
    expect(messages.find(m => m.type === 'error')?.text).toContain('mã 2');
  });
});
