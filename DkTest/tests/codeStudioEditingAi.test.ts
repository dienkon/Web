import { describe, expect, it, vi } from 'vitest';
import { closeHtmlTag, htmlNewline } from '../src/practice/code-studio/htmlEditing';
import { applyAiChanges, validateAiChanges, STUDIO_AI_MODEL } from '../src/practice/code-studio/aiChanges';
import { createProject } from '../src/practice/code-studio/project';
const generateContent = vi.hoisted(() => vi.fn());
vi.mock('../src/services/ai/aiClient.js', () => ({ getAiClient: () => ({ models: { generateContent } }) }));
import { generateStudioChanges } from '../server/codeStudioAi';

describe('HTML typing', () => {
  it.each(['html', 'div', 'section', 'my-widget'])('closes %s and keeps the cursor inside', tag => {
    const code = `<${tag}>`; expect(closeHtmlTag(code.slice(0, -1), code, code.length)).toEqual({ code: `${code}</${tag}>`, caret: code.length });
  });
  it('handles attributes with quoted greater-than and does not duplicate adjacent closes', () => {
    const code = '<div data-label="a > b">'; expect(closeHtmlTag(code.slice(0, -1), code, code.length)?.code).toBe(code + '</div>');
    expect(closeHtmlTag('<div</div>', '<div></div>', 5)).toBeNull();
    expect(closeHtmlTag('<html', '<html>', 6)?.caret).toBe(6);
  });
  it.each(['<br>', '<img src="x">', '<input>', '<div/>', '</div>', '<!-- <html>', '<script>const s="<html>'])('avoids invalid closing in %s', code => expect(closeHtmlTag(code.slice(0, -1), code, code.length)).toBeNull());
  it('does not transform pasted markup and indents between paired tags', () => {
    expect(closeHtmlTag('', '<html>', 6)).toBeNull();
    expect(htmlNewline('  <div></div>', 7)).toEqual({ code: '  <div>\n    \n  </div>', caret: 12 });
  });
});
describe('AI project edits', () => {
  it('applies creates, updates, deletes and entry changes while preserving unrelated user edits', () => {
    const base = createProject(); const current = structuredClone(base); current.files.find(f => f.path === 'styles.css')!.content = 'user style';
    const result = applyAiChanges(base, current, { summary: 'Đã sửa', files: [{ path: 'page.html', content: '<h1>AI</h1>' }], deletePaths: ['script.js'], entry: 'page.html' });
    expect(result.entry).toBe('page.html'); expect(result.files.some(f => f.path === 'script.js')).toBe(false);
    expect(result.files.find(f => f.path === 'styles.css')?.content).toBe('user style'); expect(base.files.some(f => f.path === 'script.js')).toBe(true);
  });
  it('rejects stale edits, project switches, duplicate operations and traversal', () => {
    const base = createProject(); const current = structuredClone(base); current.files[0].content += 'user';
    const change = { summary: 'AI', files: [{ path: 'index.html', content: 'new' }], deletePaths: [] };
    expect(() => applyAiChanges(base, current, change)).toThrow(/đã được bạn sửa/);
    expect(() => applyAiChanges(base, { ...base, id: 'different' }, change)).toThrow(/chuyển dự án/);
    expect(() => validateAiChanges({ ...change, deletePaths: ['index.html'] })).toThrow();
    expect(() => validateAiChanges({ ...change, files: [{ path: '../private', content: 'x' }] })).toThrow();
  });
  it('uses the exact requested model and validates provider output before returning changes', async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ summary: 'Đã sửa', files: [{ path: 'index.html', content: '<h1>AI</h1>' }], deletePaths: [], entry: 'index.html' }) });
    const result = await generateStudioChanges({ prompt: 'Sửa trang', project: createProject() }, 'test-key');
    expect(result.model).toBe(STUDIO_AI_MODEL); expect(generateContent.mock.calls.at(-1)![0].model).toBe('gemini-3.5-flash-lite');
    generateContent.mockResolvedValueOnce({ text: '{"summary":"bad","files":[{"path":"../x","content":"bad"}],"deletePaths":[]}' });
    await expect(generateStudioChanges({ prompt: 'Sửa', project: createProject() }, 'test-key')).rejects.toThrow();
  });
});
