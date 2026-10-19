import { validateProject } from './project';
import type { ShareMode } from './sharing';
export interface PublishedShare { version: 1; mode: ShareMode; title: string; description: string; imageUrl?: string; imageDataUrl?: string; payload: string; createdAt: string }
export function validatePublishedShare(input: unknown): PublishedShare {
  const p = input as PublishedShare;
  if (!p || p.version !== 1 || !['website', 'website-edit', 'editor'].includes(p.mode) || typeof p.title !== 'string' || !p.title.trim() || p.title.length > 160 || typeof p.description !== 'string' || p.description.length > 300 || typeof p.payload !== 'string' || new TextEncoder().encode(p.payload).length > 700000) throw new Error('Dữ liệu chia sẻ không hợp lệ (mã nguồn tối đa 700 KB, ảnh tối đa 135 KB).');
  const data = JSON.parse(p.payload);
  if (p.imageUrl !== undefined && (typeof p.imageUrl !== 'string' || (p.imageUrl !== '' && !isShareImageUrl(p.imageUrl)))) throw new Error('Ảnh chia sẻ phải là URL ảnh HTTPS trên Cloudinary.');
  if (p.imageDataUrl !== undefined) {
    if (typeof p.imageDataUrl !== 'string' || p.imageDataUrl.length > 180000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.imageDataUrl)) throw new Error('Ảnh chia sẻ cũ không hợp lệ.');
    const bytes = atob(p.imageDataUrl.split(',')[1]);
    if (bytes.length < 24 || bytes.charCodeAt(0) !== 255 || bytes.charCodeAt(1) !== 216) throw new Error('Ảnh chia sẻ phải là JPEG hợp lệ.');
  }
  if (p.mode === 'website') { if (data?.version !== 1 || typeof data.html !== 'string' || !data.html.startsWith('<!DOCTYPE html>')) throw new Error('Website chia sẻ không hợp lệ.'); }
  else validateProject(data);
  const result = { version: 1 as const, mode: p.mode, title: p.title.trim(), description: p.description, ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}), ...(p.imageDataUrl ? { imageDataUrl: p.imageDataUrl } : {}), payload: p.payload, createdAt: typeof p.createdAt === 'string' ? p.createdAt : '' };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 900000) throw new Error('Bản chia sẻ quá lớn để lưu Firebase.');
  return result;
}
export function shareSlug(title: string): string {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42).replace(/-$/, '') || 'website';
}
export function shareIdFromSlug(slug: string): string { return /\.([a-f0-9]{16})$/.exec(slug)?.[1] || ''; }

export function isShareImageUrl(value: string): boolean {
  return value.length <= 2048 && /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/[^\s<>"']+$/.test(value);
}
