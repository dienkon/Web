import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../services/cloudinary';
import { readStudioJson } from './apiResponse';
export interface StudioAsset { url: string; mime: string; bytes: number }
export const IMAGE_LIMIT = 8 * 1024 * 1024, VIDEO_LIMIT = 25 * 1024 * 1024, BATCH_LIMIT = 50 * 1024 * 1024;
const types: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
export function validAsset(asset: StudioAsset) {
  if (!asset || typeof asset.mime !== 'string' || !Object.hasOwn(types,asset.mime)) return false;
  const kind = asset?.mime?.startsWith('video/') ? 'video' : 'image';
  return asset && types[asset.mime] && Number.isInteger(asset.bytes) && asset.bytes > 0 && asset.bytes <= (kind === 'video' ? VIDEO_LIMIT : IMAGE_LIMIT) && typeof asset.url === 'string' && asset.url.length <= 2048 && new RegExp(`^https://res\\.cloudinary\\.com/[A-Za-z0-9_-]+/${kind}/upload/[^\\s<>"']+$`).test(asset.url);
}
export function mediaName(file: Pick<File, 'name' | 'type'>) {
  const stem = file.name.replace(/\.[^.]*$/, '').normalize('NFC').replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 65) || 'media';
  return stem + '.' + types[file.type];
}
export async function validateMedia(files: readonly File[]) {
  if (!files.length || files.length > 10 || files.reduce((n, f) => n + f.size, 0) > BATCH_LIMIT) throw new Error('Chọn tối đa 10 ảnh/video, tổng tối đa 50 MB mỗi lượt.');
  for (const file of files) {
    if (!types[file.type] || file.size <= 0 || file.size > (file.type.startsWith('video/') ? VIDEO_LIMIT : IMAGE_LIMIT)) throw new Error(`${file.name}: ảnh tối đa 8 MB, video tối đa 25 MB. Hỗ trợ JPG, PNG, GIF, WebP, AVIF, MP4, WebM, MOV.`);
    const b = new Uint8Array(await file.slice(0, 32).arrayBuffer()), ascii = new TextDecoder('latin1').decode(b);
    const valid = file.type === 'image/jpeg' ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)
      : file.type === 'image/gif' ? /^GIF8[79]a/.test(ascii)
      : file.type === 'image/webp' ? ascii.startsWith('RIFF') && ascii.slice(8,12) === 'WEBP'
      : file.type === 'video/webm' ? [26,69,223,163].every((v,i) => b[i] === v)
      : ascii.slice(4,8) === 'ftyp' && (file.type !== 'image/avif' || /avif|avis/.test(ascii.slice(8)));
    if (!valid) throw new Error(`${file.name}: nội dung không khớp định dạng ảnh/video.`);
  }
}
export async function uploadProjectMedia(file: File, signal: AbortSignal): Promise<StudioAsset> {
  const kind = file.type.startsWith('video/') ? 'video' : 'image';
  const body = new FormData(); body.append('file', file); body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind}/upload`, { method: 'POST', body, signal });
  const data = await readStudioJson(response, 'Không tải được file lên Cloudinary.');
  const asset = { url: data.secure_url, mime: file.type, bytes: data.bytes };
  if (data.resource_type !== kind || !validAsset(asset)) throw new Error('Cloudinary trả về file không hợp lệ hoặc vượt giới hạn.');
  return asset;
}
