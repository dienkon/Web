import { buildPreview } from './preview';
import { encodeShare, MAX_SHARE_LENGTH, StudioProject } from './project';

export type ShareMode = 'website' | 'website-edit' | 'editor';
export interface WebsiteSnapshot { version: 1; title: string; html: string }

export function encodeWebsite(snapshot: WebsiteSnapshot): string {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (encoded.length > MAX_SHARE_LENGTH) throw new Error('Website quá lớn để đưa vào link. Hãy giảm nội dung trang hoặc chia sẻ file dự án.');
  return encoded;
}

export function decodeWebsite(value: string): WebsiteSnapshot {
  if (!value || value.length > MAX_SHARE_LENGTH || !/^[\w-]+$/.test(value)) throw new Error('Link website không hợp lệ hoặc quá lớn.');
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
    if (data?.version !== 1 || typeof data.title !== 'string' || data.title.length > 80 || typeof data.html !== 'string' || !data.html.startsWith('<!DOCTYPE html>')) throw new Error();
    return { version: 1, title: data.title, html: data.html };
  } catch { throw new Error('Không thể mở website. Link bị lỗi hoặc không tương thích.'); }
}

export function createShareUrl(project: StudioProject, mode: ShareMode, origin: string): string {
  if (mode === 'editor') return `${origin}/practice/code#project=${encodeShare(project)}`;
  if (!/\.html?$/i.test(project.entry)) throw new Error('Chọn một trang HTML mở đầu trước khi chia sẻ website.');
  if (mode === 'website-edit') return `${origin}/practice/code/view?editable=1#project=${encodeShare(project)}`;
  const snapshot = { version: 1 as const, title: project.name, html: buildPreview(project, crypto.randomUUID()) };
  return `${origin}/practice/code/view#site=${encodeWebsite(snapshot)}`;
}
