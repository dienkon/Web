import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../services/cloudinary';
import { isShareImageUrl } from './publishedShare';

/** Upload only during explicit publishing; selecting/capturing stays local. */
export async function uploadShareCover(image: string, signal?: AbortSignal): Promise<string> {
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 180000) throw new Error('Ảnh đại diện không hợp lệ.');
  const body = new FormData(); body.append('file', image); body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body, signal });
  const data = await response.json();
  if (!response.ok || typeof data.secure_url !== 'string' || !isShareImageUrl(data.secure_url)) throw new Error('Không tải được ảnh lên Cloudinary. Thử lại hoặc bỏ ảnh để chia sẻ.');
  return data.secure_url;
}
