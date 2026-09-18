import { CloudinaryMediaItem } from '../models/LoveStory';

const CLOUDINARY_MEDIA_STORAGE_KEY = 'love_story_media_library';

class CloudinaryService {
  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.cloudName && this.uploadPreset && this.cloudName !== 'your_cloudinary_cloud_name');
  }

  public async uploadImage(file: File): Promise<CloudinaryMediaItem> {
    // 1. If Cloudinary is configured, upload via REST API using unsigned preset
    if (this.isConfigured()) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', this.uploadPreset);
        formData.append('folder', 'love-stories');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Tải ảnh lên Cloudinary thất bại.');
        }

        const data = await response.json();
        const mediaItem: CloudinaryMediaItem = {
          publicId: data.public_id,
          secureUrl: data.secure_url,
          width: data.width,
          height: data.height,
          format: data.format,
          createdAt: Date.now(),
        };

        this.saveToLocalLibrary(mediaItem);
        return mediaItem;
      } catch (error) {
        console.warn('Cloudinary upload error, falling back to local base64:', error);
      }
    }

    // 2. High-performance Base64 fallback (works 100% offline & out-of-the-box)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const img = new Image();
          img.onload = () => {
            const mediaItem: CloudinaryMediaItem = {
              publicId: 'local-' + Math.random().toString(36).substring(2, 9),
              secureUrl: reader.result as string,
              width: img.naturalWidth || 800,
              height: img.naturalHeight || 600,
              format: file.type.split('/')[1] || 'jpeg',
              createdAt: Date.now(),
            };
            this.saveToLocalLibrary(mediaItem);
            resolve(mediaItem);
          };
          img.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
          img.src = reader.result;
        } else {
          reject(new Error('Lỗi chuyển đổi dữ liệu ảnh.'));
        }
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file.'));
      reader.readAsDataURL(file);
    });
  }

  public getOptimizedImageUrl(
    url: string,
    options: { width?: number; height?: number; crop?: 'fill' | 'fit' | 'thumb' } = {}
  ): string {
    if (!url) return '';
    // If it's a Cloudinary URL, insert transform parameters
    if (url.includes('res.cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        const transforms = [];
        if (options.width) transforms.push(`w_${options.width}`);
        if (options.height) transforms.push(`h_${options.height}`);
        if (options.crop) transforms.push(`c_${options.crop}`);
        transforms.push('f_auto', 'q_auto');
        return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`;
      }
    }
    return url;
  }

  public getMediaLibrary(): CloudinaryMediaItem[] {
    try {
      const raw = localStorage.getItem(CLOUDINARY_MEDIA_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveToLocalLibrary(item: CloudinaryMediaItem): void {
    const library = this.getMediaLibrary();
    const updated = [item, ...library.filter((i) => i.publicId !== item.publicId)].slice(0, 30);
    localStorage.setItem(CLOUDINARY_MEDIA_STORAGE_KEY, JSON.stringify(updated));
  }

  public deleteFromLibrary(publicId: string): void {
    const library = this.getMediaLibrary().filter((i) => i.publicId !== publicId);
    localStorage.setItem(CLOUDINARY_MEDIA_STORAGE_KEY, JSON.stringify(library));
  }
}

export const cloudinaryService = new CloudinaryService();
