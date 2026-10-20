import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import { languageFor, StudioProject } from './project';
import { loadMonaco } from './editorServices';
import { closeHtmlTag, htmlNewline } from './htmlEditing';
import { applyCompletion, Completion, getCompletions } from './completions';

export interface EditorHandle { insert: (text: string) => void; replace: (text: string) => void; command: (name: 'undo' | 'redo' | 'suggest' | 'find') => void }
interface Props { project: StudioProject; onChange: (path: string, code: string) => void; onCursor: (line: number, column: number) => void; touch: boolean; fontSize: number; wrap: boolean }

const StudioEditor = forwardRef<EditorHandle, Props>(function StudioEditor({ project, onChange, onCursor, touch, fontSize, wrap }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<any>(null);
  const api = useRef<any>(null);
  const models = useRef(new Map<string, any>());
  const views = useRef(new Map<string, any>());
  const previousPath = useRef('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const highlight = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const latest = useRef({ project, onChange, onCursor }); latest.current = { project, onChange, onCursor };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [word, setWord] = useState('');
  const file = project.files.find(f => f.path === project.activeFile)!;
  const language = languageFor(file.path);
  const fallback = touch || !!error;
  const effectiveWrap = !touch && wrap;
  const [caret, setCaret] = useState(0), [expanded, setExpanded] = useState(false), [selected, setSelected] = useState(-1);
  const choices = useMemo(() => suggestionsOpen ? getCompletions(project, file.path, caret, true) : [], [project, file.path, caret, suggestionsOpen]);
  const syntax = useMemo(() => {
    if (!fallback) return '';
    const name = language === 'html' || language === 'xml' ? 'markup' : language;
    const grammar = Prism.languages[name];
    return grammar ? Prism.highlight(file.content + '\n', grammar, name) : (file.content + '\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }, [file.content, language, fallback]);

  useEffect(() => {
    if (touch) return;
    let disposed = false;
    const disposables: any[] = [];
    loadMonaco().then(monaco => {
      if (disposed || !host.current) return;
      api.current = monaco;
      const instance = monaco.editor.create(host.current, { theme: 'vs-dark', automaticLayout: true, minimap: { enabled: false }, fontFamily: 'Consolas, "Courier New", monospace', fontSize, lineHeight: Math.round(fontSize * 1.65), padding: { top: 16, bottom: 16 }, scrollBeyondLastLine: false, wordWrap: wrap ? 'on' : 'off', tabSize: 2, insertSpaces: true, smoothScrolling: true, bracketPairColorization: { enabled: true }, quickSuggestions: true, suggestOnTriggerCharacters: true, autoClosingBrackets: 'always', autoIndent: 'full', fixedOverflowWidgets: true, accessibilitySupport: 'auto' });
      editor.current = instance;
      disposables.push(instance.onDidChangeModelContent(() => {
        const model = instance.getModel();
        if (model && !model.__studioSync) latest.current.onChange(model.__studioPath, model.getValue());
      }));
      disposables.push(instance.onDidChangeCursorPosition((e: any) => latest.current.onCursor(e.position.lineNumber, e.position.column)));
      disposables.push(instance.onDidType((text: string) => {
        const model = instance.getModel(), position = instance.getPosition();
        if (text !== '>' || model?.getLanguageId() !== 'html' || !position) return;
        const code = model.getValue(), at = model.getOffsetAt(position);
        const edit = closeHtmlTag(code.slice(0, at - 1) + code.slice(at), code, at);
        if (!edit) return;
        const insertion = edit.code.slice(at, at + edit.code.length - code.length);
        instance.executeEdits('close-html-tag', [{ range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: insertion }]);
        instance.setPosition(position);
      }));
      for (const language of ['html','css','javascript','typescript','python','cpp','c']) {
        disposables.push(monaco.languages.registerCompletionItemProvider(language, { triggerCharacters: ['.','<','/','"',"'",':'], provideCompletionItems(model: any, position: any) {
          const path = model.__studioPath; const project = latest.current.project;
          const current = { ...project, files: project.files.map(f => f.path === path ? { ...f, content: model.getValue() } : f) };
          return { suggestions: getCompletions(current, path, model.getOffsetAt(position), true).map(item => { const start = model.getPositionAt(item.start), end = model.getPositionAt(item.end); return { label: item.label, detail: item.detail, kind: item.kind === 'file' ? monaco.languages.CompletionItemKind.File : monaco.languages.CompletionItemKind.Snippet, insertText: item.template.replace(/\$(?!0)/g,'\\$'), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: new monaco.Range(start.lineNumber,start.column,end.lineNumber,end.column) }; }) };
        } }));
      }
      setReady(true);
    }).catch(err => { if (!disposed) setError(err.message || 'Monaco không khả dụng.'); });
    return () => { disposed = true; disposables.forEach(d => d.dispose()); editor.current?.dispose(); editor.current = null; models.current.forEach(m => m.dispose()); models.current.clear(); views.current.clear(); previousPath.current = ''; setReady(false); };
  }, [touch]);

  useEffect(() => {
    if (!ready || !editor.current || !api.current) return;
    const paths = new Set(project.files.map(f => f.path));
    for (const [path, model] of models.current) {
      if (!paths.has(path)) { if (editor.current.getModel() === model) editor.current.setModel(null); model.dispose(); models.current.delete(path); views.current.delete(path); }
    }
    for (const f of project.files) {
      let model = models.current.get(f.path);
      if (!model) {
        model = api.current.editor.createModel(f.content, languageFor(f.path), api.current.Uri.parse(`file:///studio/${project.id}/${f.path}`));
        model.__studioPath = f.path; models.current.set(f.path, model);
      } else if (model.getValue() !== f.content) { model.__studioSync = true; model.setValue(f.content); model.__studioSync = false; }
    }
    const model = models.current.get(project.activeFile);
    if (editor.current.getModel() !== model) {
      if (previousPath.current) views.current.set(previousPath.current, editor.current.saveViewState());
      editor.current.setModel(model);
      editor.current.restoreViewState(views.current.get(project.activeFile) || null);
      previousPath.current = project.activeFile;
    }
  }, [project, ready]);
  useEffect(() => { editor.current?.updateOptions({ fontSize, lineHeight: Math.round(fontSize * 1.65), wordWrap: wrap ? 'on' : 'off' }); }, [fontSize, wrap, ready]);
  useEffect(() => { setWord(''); setSuggestionsOpen(false); if (textarea.current) { textarea.current.scrollTop = 0; textarea.current.scrollLeft = 0; } }, [file.path]);

  function cursor(el: HTMLTextAreaElement) {
    setCaret(el.selectionStart);
    const before = el.value.slice(0, el.selectionStart);
    const lines = before.split('\n'); onCursor(lines.length, lines.at(-1)!.length + 1);
  }
  function commitTyping(code: string, caret: number) {
    onChange(file.path, code);
    requestAnimationFrame(() => {
      const el = textarea.current;
      if (!el) return;
      el.selectionStart = el.selectionEnd = caret; cursor(el);
      if (highlight.current) { highlight.current.scrollTop = el.scrollTop; highlight.current.scrollLeft = el.scrollLeft; }
      if (gutter.current) gutter.current.scrollTop = el.scrollTop;
    });
  }
  function complete(item: Completion) {
    try { const edit = applyCompletion(file.content, item); commitTyping(edit.code, edit.caret); setSuggestionsOpen(false); setSelected(-1); textarea.current?.focus(); } catch { setSuggestionsOpen(false); }
  }
  function insert(text: string, replaceWord = false) {
    const pair = ['{}', '()', '[]', '<>', '""', "''"].includes(text);
    if (!fallback && editor.current) {
      const range = editor.current.getSelection();
      editor.current.pushUndoStop(); editor.current.executeEdits('studio', [{ range, text, forceMoveMarkers: true }]);
      if (pair) editor.current.setPosition({ lineNumber: range.startLineNumber, column: range.startColumn + 1 });
      editor.current.pushUndoStop(); editor.current.focus(); return;
    }
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart - (replaceWord ? word.length : 0);
    const code = file.content.slice(0, start) + text + file.content.slice(el.selectionEnd);
    onChange(file.path, code);
    setSuggestionsOpen(false); setWord('');
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + text.length - (pair ? 1 : 0); cursor(el); });
  }
  useImperativeHandle(ref, () => ({ insert, replace(text) {
    if (!fallback && editor.current) { editor.current.pushUndoStop(); editor.current.executeEdits('format', [{ range: editor.current.getModel().getFullModelRange(), text }]); editor.current.pushUndoStop(); }
    else onChange(file.path, text);
  }, command(name) {
    if (!fallback && editor.current) { editor.current.focus(); editor.current.trigger('studio', { undo: 'undo', redo: 'redo', suggest: 'editor.action.triggerSuggest', find: 'actions.find' }[name], null); }
    else if (name === 'suggest') { setWord(''); setCaret(textarea.current?.selectionStart || 0); setSuggestionsOpen(v => !v); setSelected(-1); textarea.current?.focus(); }
    else if (name === 'find') { const term = window.prompt('Tìm trong file:'); if (term) { const i = file.content.indexOf(term, (textarea.current?.selectionEnd || 0)); const at = i < 0 ? file.content.indexOf(term) : i; if (at >= 0) { textarea.current?.focus(); textarea.current?.setSelectionRange(at, at + term.length); } } }
  } }));

  return <div className="studio-editor-shell">
    {!fallback && <div className="studio-monaco" ref={host} />}
    {!fallback && !ready && <div className="studio-editor-loading" role="status">Đang nạp Monaco Editor…</div>}
    {fallback && <>
      {error && <div className="studio-inline-note">{error} Đang dùng chế độ cảm ứng.</div>}
      <div className={`studio-touch-editor ${effectiveWrap ? 'is-wrapped' : ''}`} style={{ '--code-size': `${fontSize}px` } as React.CSSProperties}>
        <div ref={gutter} className="studio-line-numbers" aria-hidden="true">{file.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}</div>
        <div className="studio-code-layers">
          <pre ref={highlight} aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: syntax }} /></pre>
          <textarea ref={textarea} aria-label={`Soạn thảo ${file.path}`} value={file.content} autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} wrap={effectiveWrap ? 'soft' : 'off'} aria-autocomplete="list" aria-controls={choices.length ? 'studio-completions' : undefined} onSelect={e => cursor(e.currentTarget)} onChange={e => {
            const code = e.target.value, at = e.target.selectionStart;
            if (language === 'html' && !(e.nativeEvent as InputEvent).isComposing) {
              const edit = closeHtmlTag(file.content, code, at);
              if (edit) { commitTyping(edit.code, edit.caret); setSuggestionsOpen(false); return; }
              if (code.length === file.content.length + 1 && code[at - 1] === '\n' && code.slice(0, at - 1) + code.slice(at) === file.content) { const edit = htmlNewline(file.content, at - 1); commitTyping(edit.code, edit.caret); return; }
            }
            onChange(file.path, code); setCaret(at); setSelected(-1); setSuggestionsOpen(!(e.nativeEvent as InputEvent).isComposing && getCompletions({ ...project, files: project.files.map(f => f.path === file.path ? { ...f, content: code } : f) }, file.path, at).length > 0); cursor(e.target);
          }} onScroll={e => { if (highlight.current) { highlight.current.scrollTop = e.currentTarget.scrollTop; highlight.current.scrollLeft = e.currentTarget.scrollLeft; } if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }} onKeyDown={e => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (choices.length && suggestionsOpen && ['ArrowDown','ArrowUp'].includes(e.key)) { e.preventDefault(); setSelected(i => (i + (e.key === 'ArrowDown' ? 1 : choices.length - 1) + choices.length) % choices.length); return; }
            if ((e.key === 'Tab' && choices.length) || (e.key === 'Enter' && selected >= 0 && choices.length)) { e.preventDefault(); complete(choices[Math.max(0,selected)]); return; }
            if (e.key === 'Tab') { e.preventDefault(); insert('  '); return; }
            if (e.key === 'Escape') setSuggestionsOpen(false);
            if (e.key === 'Enter') { e.preventDefault(); if (language === 'html') { const edit = htmlNewline(file.content, e.currentTarget.selectionStart, e.currentTarget.selectionEnd); commitTyping(edit.code, edit.caret); return; } const before = file.content.slice(0, e.currentTarget.selectionStart); const line = before.split('\n').at(-1) || ''; const indent = line.match(/^\s*/)?.[0] || ''; insert('\n' + indent + (/[{:\[]\s*$/.test(line) ? (language === 'python' ? '    ' : '  ') : '')); }
          }} />
        </div>
      </div>
      {suggestionsOpen && choices.length > 0 && <div className={`studio-completions ${expanded ? 'expanded' : ''}`} aria-label="Gợi ý code"><div className="studio-completion-heading"><span>{language.toUpperCase()} · {choices.length} gợi ý</span><button aria-label={expanded ? 'Thu gọn gợi ý' : 'Chi tiết gợi ý'} onPointerDown={e => e.preventDefault()} onClick={() => setExpanded(v => !v)}>{expanded ? 'Gọn' : 'Chi tiết'}</button><button aria-label="Đóng gợi ý" onPointerDown={e => e.preventDefault()} onClick={() => setSuggestionsOpen(false)}>×</button></div><div id="studio-completions" role="listbox" className="studio-completion-items">{choices.map((item,i) => <button role="option" aria-selected={i === selected} title={item.detail} key={item.label} onPointerDown={e => e.preventDefault()} onClick={() => complete(item)}><span className={`completion-kind kind-${item.kind}`}>{item.kind === 'file' ? '▧' : item.kind === 'tag' ? '‹›' : item.kind === 'word' ? 'abc' : 'ƒ'}</span><span><strong>{item.label}</strong>{expanded && <small>{item.detail}</small>}</span></button>)}</div></div>}

    </>}
  </div>;
});
export default React.memo(StudioEditor);
