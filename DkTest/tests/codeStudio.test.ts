import { describe, expect, it } from 'vitest';
import { cleanPath, createProject, decodeShare, encodeShare, languageFor, movePath, resolveLocal, validateProject } from '../src/practice/code-studio/project';
import { rewriteImports, virtualPath } from '../src/practice/code-studio/preview';
import { createShareUrl, decodeWebsite, encodeWebsite } from '../src/practice/code-studio/sharing';

describe('Code Studio projects and share boundaries', () => {
  it('round trips a rendered Unicode website without a project source bundle', () => {
    const snapshot = { version: 1 as const, title: 'Website tiếng Việt 🐍', html: '<!DOCTYPE html><html><body>Xin chào ✨</body></html>' };
    expect(decodeWebsite(encodeWebsite(snapshot))).toEqual(snapshot);
    expect(decodeWebsite(encodeWebsite(snapshot))).not.toHaveProperty('files');
  });
  it('rejects malformed, incompatible and oversized website snapshots', () => {
    expect(() => decodeWebsite('bad-data')).toThrow();
    expect(() => decodeWebsite(encodeWebsite({ version: 1, title: 'x', html: '<script>bad</script>' }))).toThrow();
    expect(() => encodeWebsite({ version: 1, title: 'x', html: 'x'.repeat(60000) })).toThrow();
    expect(() => decodeWebsite('x'.repeat(60001))).toThrow();
  });
  it('preserves the IDE link and explicitly marks website links allowing edits', () => {
    const p = createProject();
    const editor = new URL(createShareUrl(p, 'editor', 'https://example.test'));
    const website = new URL(createShareUrl(p, 'website-edit', 'https://example.test'));
    expect(editor.pathname).toBe('/practice/code');
    expect(website.pathname).toBe('/practice/code/view');
    expect(website.searchParams.get('editable')).toBe('1');
    expect(decodeShare(website.hash.slice('#project='.length)).files).toEqual(p.files);
  });
  it('rejects website sharing when the project has no HTML entry', () => {
    expect(() => createShareUrl(createProject('python'), 'website', 'https://example.test')).toThrow(/HTML/);
    expect(() => createShareUrl(createProject('python'), 'website-edit', 'https://example.test')).toThrow(/HTML/);
  });
  it.each(['web', 'python', 'cpp', 'javascript'] as const)('creates a valid %s project', type => {
    const project = createProject(type);
    expect(validateProject(project).files).toEqual(project.files);
    expect(project.files.some(f => f.path === project.activeFile)).toBe(true);
  });
  it('round trips Unicode and makes shared projects independent copies', () => {
    const p = createProject(); p.name = 'Ý tưởng 🐍'; p.files[0].content += '\n<!-- Tiếng Việt 💚 -->';
    const copy = decodeShare(encodeShare(p));
    expect(copy.files).toEqual(p.files); expect(copy.name).toBe(p.name); expect(copy.id).not.toBe(p.id);
  });
  it.each(['../secret', '/absolute', 'src/../../secret', 'a//b', 'src/./a', 'x\u0000.js', 'C:\\file', 'src/ a.js'])('rejects unsafe paths: %s', path => expect(() => cleanPath(path)).toThrow());
  it('normalizes Windows relative paths', () => expect(cleanPath('src\\main.js')).toBe('src/main.js'));
  it('rejects duplicate files and file/folder conflicts', () => {
    const p = createProject();
    expect(() => validateProject({ ...p, files: [...p.files, p.files[0]] })).toThrow();
    expect(() => validateProject({ ...p, folders: ['index.html'] })).toThrow();
    expect(() => validateProject({ ...p, files: [...p.files, { path: 'index.html/nested', content: '' }] })).toThrow();
  });
  it('rejects oversized projects, shares, corrupt base64 and malformed file objects', () => {
    const p = createProject(); p.files[0].content = 'a'.repeat(1_000_001);
    expect(() => validateProject(p)).toThrow(/1 MB/);
    expect(() => decodeShare('x'.repeat(60001))).toThrow();
    expect(() => decodeShare('not-a-project')).toThrow();
    expect(() => validateProject({ ...createProject(), files: [{ path: 'main.js', content: {} }] })).toThrow();
    const medium = createProject(); medium.files[0].content = 'x'.repeat(50000);
    expect(() => encodeShare(medium)).toThrow(/quá lớn/);
  });
  it('repairs active and entry files when a file is deleted', () => {
    const p = createProject(); const next = validateProject({ ...p, files: p.files.filter(f => f.path !== p.activeFile) });
    expect(next.files.some(f => f.path === next.activeFile)).toBe(true);
    expect(next.files.some(f => f.path === next.entry)).toBe(true);
  });
  it('renames folders together with descendants and active/entry pointers', () => {
    const p = createProject(); p.files = [{ path: 'src/index.html', content: '' }, { path: 'src/lib/main.js', content: '' }]; p.activeFile = 'src/lib/main.js'; p.entry = 'src/index.html'; p.folders = ['src', 'src/empty'];
    const next = movePath(p, 'src', 'app');
    expect(next.activeFile).toBe('app/lib/main.js'); expect(next.entry).toBe('app/index.html'); expect(next.folders).toContain('app/empty');
    expect(() => movePath(p, 'src', 'src/nested')).toThrow();
  });
  it('rejects rename collisions instead of overwriting files', () => {
    const p = createProject(); expect(() => movePath(p, 'script.js', 'styles.css')).toThrow(); expect(() => movePath(p, 'styles', 'index.html')).toThrow();
  });
  it('resolves nested local references without escaping the project', () => {
    expect(resolveLocal('pages/index.html', '../styles.css?v=2')).toBe('styles.css');
    expect(resolveLocal('pages/index.html', '/styles.css')).toBe('styles.css');
    expect(resolveLocal('index.html', '../private')).toBeNull();
    expect(resolveLocal('index.html', 'https://example.com/a.js')).toBeNull();
    expect(resolveLocal('index.html', '//example.com/a.js')).toBeNull();
  });
  it('rewrites static, side-effect, exported and dynamic ESM imports', () => {
    const code = `import { hello } from './lib/a.js';\nimport './side.js';\nexport { x } from '../x.js';\nconst lazy = import('./lazy.js');`;
    const rewritten = rewriteImports(code, 'src/main.js');
    for (const path of ['src/lib/a.js', 'src/side.js', 'x.js', 'src/lazy.js']) expect(rewritten).toContain(virtualPath(path));
  });
  it.each([['index.html', 'html'], ['main.py', 'python'], ['main.cpp', 'cpp'], ['main.js', 'javascript'], ['index.ts', 'typescript']])('recognizes %s', (path, language) => expect(languageFor(path)).toBe(language));
});
