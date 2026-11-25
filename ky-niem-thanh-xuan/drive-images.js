/* Recover blocked Drive thumbnails through the existing, root-scoped Apps Script bridge. */
const driveImageStore = { pending: new Map(), ready: new Map(), queue: [], active: 0, bytes: 0 };
const driveImageStates = new WeakMap();
const driveImagePlaceholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#eef0f7"/><g fill="none" stroke="#a4abc3" stroke-width="5"><rect x="250" y="215" width="100" height="82" rx="12"/><circle cx="280" cy="241" r="9"/><path d="m260 283 23-25 18 18 16-15 23 22"/></g><text x="300" y="340" text-anchor="middle" fill="#68718b" font-family="Arial,sans-serif" font-size="18">Chưa tải được ảnh</text><text x="300" y="370" text-anchor="middle" fill="#8991a6" font-family="Arial,sans-serif" font-size="14">Bấm để xem bằng Google Drive</text></svg>');
const driveImageLoading = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#eef0f7"/></svg>');

function driveImageScope() { return JSON.stringify([driveRoot.rootId, liveState.url]); }
function parseDriveImage(url) {
  try {
    const parsed = new URL(url, location.href);
    if (parsed.hostname === 'lh3.googleusercontent.com') {
      const match = /^\/d\/([\w-]+)(?:=w(\d+)|=s0)?$/.exec(parsed.pathname);
      if (match) return { id: match[1], width: Number(match[2]) || 600, fallback: false };
    }
    if (parsed.hostname === 'drive.google.com' && parsed.pathname === '/thumbnail' && /^[\w-]+$/.test(parsed.searchParams.get('id') || '')) {
      return { id: parsed.searchParams.get('id'), width: Number((parsed.searchParams.get('sz') || '').replace(/^w/, '')) || 600, fallback: true };
    }
  } catch (_) {}
  return null;
}

function pumpDriveImages() {
  while (driveImageStore.active < 3 && driveImageStore.queue.length) {
    const job = driveImageStore.queue.shift(); driveImageStore.active++;
    job.run().then(job.resolve, job.reject).finally(() => { driveImageStore.active--; pumpDriveImages(); });
  }
}

async function getDriveThumbnailData(fileId) {
  // Restored galleries may render before the initial Apps Script handshake finishes.
  if (!liveState.thumbnailBridge && typeof driveConnectionPromise !== 'undefined' && driveConnectionPromise) await driveConnectionPromise;
  if (!/^[\w-]+$/.test(fileId) || !liveState.thumbnailBridge) return Promise.reject(new Error('Cầu nối ảnh chưa sẵn sàng.'));
  const scope = driveImageScope(), key = JSON.stringify([scope, fileId]), cached = driveImageStore.ready.get(key);
  if (cached && Date.now() - cached.savedAt < 5 * 60 * 1000) {
    driveImageStore.ready.delete(key); driveImageStore.ready.set(key, cached);
    return Promise.resolve(cached.image);
  }
  if (cached) { driveImageStore.bytes -= cached.image.length * 2; driveImageStore.ready.delete(key); }
  if (driveImageStore.pending.has(key)) return driveImageStore.pending.get(key);
  const promise = new Promise((resolve, reject) => {
    driveImageStore.queue.push({ resolve, reject, run: async () => {
      if (scope !== driveImageScope()) throw new Error('Kết nối Drive đã thay đổi.');
      const result = await driveRequest(liveState.thumbnailAction, { id: fileId });
      const data = result.image;
      if (typeof data !== 'string' || data.length > 4.1 * 1024 * 1024 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('Ảnh xem trước không hợp lệ.');
      // Reject invalid image bytes before caching; a failed thumbnail must remain retryable.
      await new Promise((loaded, failed) => {
        const image = new Image();
        const timeout = setTimeout(() => finish(new Error('Ảnh xem trước tải quá lâu.')), 10000);
        const finish = error => { clearTimeout(timeout); image.onload = image.onerror = null; image.src = ''; error ? failed(error) : loaded(); };
        image.onload = () => finish(image.naturalWidth * image.naturalHeight > 4 * 1024 * 1024 ? new Error('Ảnh xem trước quá lớn.') : null);
        image.onerror = () => finish(new Error('Không giải mã được ảnh xem trước.')); image.src = data;
      });
      if (scope !== driveImageScope()) throw new Error('Kết nối Drive đã thay đổi.');
      driveImageStore.ready.set(key, { image: data, savedAt: Date.now() }); driveImageStore.bytes += data.length * 2;
      while (driveImageStore.ready.size > 48 || driveImageStore.bytes > 16 * 1024 * 1024) {
        const oldest = driveImageStore.ready.keys().next().value;
        driveImageStore.bytes -= driveImageStore.ready.get(oldest).image.length * 2; driveImageStore.ready.delete(oldest);
      }
      return data;
    } });
  }).finally(() => driveImageStore.pending.delete(key));
  driveImageStore.pending.set(key, promise); pumpDriveImages();
  return promise;
}

async function recoverDriveImage(image) {
  const info = parseDriveImage(image.src), previous = driveImageStates.get(image);
  if (!info && !previous) return;
  let state = previous;
  if (!state || (info && (state.id !== info.id || (!info.fallback && state.step > 0)))) {
    state = { ...info, step: info.fallback ? 1 : 0, pending: false, scope: driveImageScope() }; driveImageStates.set(image, state);
    if (image.dataset.driveImageFailed === 'true') image.removeAttribute('title');
    delete image.dataset.driveImageFailed; delete image.dataset.driveImageSource;
  }
  if (state.pending) return;
  image.referrerPolicy = 'no-referrer';
  if (state.step === 0) {
    state.step = 1; image.src = getDriveThumbFallbackUrl(state.id, state.width); return;
  }
  if (state.step === 1) {
    state.step = 2; state.pending = true;
    image.src = driveImageLoading;
    try {
      const data = await getDriveThumbnailData(state.id);
      if (!image.isConnected || image.src !== driveImageLoading || driveImageStates.get(image) !== state || state.scope !== driveImageScope()) return;
      delete image.dataset.driveImageFailed; image.dataset.driveImageSource = 'bridge'; image.src = data;
      return;
    } catch (_) {
      if (!image.isConnected || image.src !== driveImageLoading || driveImageStates.get(image) !== state || state.scope !== driveImageScope()) return;
    } finally { state.pending = false; }
  }
  if (image.src === driveImagePlaceholder || image.dataset.driveImageFailed === 'true') return;
  image.dataset.driveImageFailed = 'true';
  image.title = 'Ảnh xem trước chưa tải được. Bấm để xem bằng Google Drive.';
  if (image.id === 'lightbox-img' && !document.getElementById('drive-lightbox').classList.contains('hidden')) {
    forceDriveIframeForImage = true; renderLightboxCurrentItem(); return;
  }
  image.src = image.id === 'modal-avatar' || image.closest('.member-card') ? getInitialsAvatar(image.alt) : driveImagePlaceholder;
}

document.addEventListener('load', event => {
  const image = event.target;
  if (image.tagName !== 'IMG') return;
  if (driveImageStates.get(image)?.pending && image.src === driveImageLoading) return;
  image.parentElement?.classList.remove('img-skeleton');
}, true);

/* --- Cross-Platform JPEG Download Engine (iOS/iPadOS Web Share, In-App Fallback, Android & Desktop Blob Download) --- */
const TIFF_TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4 };
const PREPARED_FILE_TTL_MS = 10 * 60 * 1000;
const PREPARED_CACHE_MAX_ITEMS = 6;
const PREPARED_CACHE_MAX_BYTES = 60 * 1024 * 1024;
const BLOB_REVOKE_DELAY_MS = 120 * 1000;

const driveDownloadState = {
  selectMode: false,
  selectedIds: new Set(),
  selectedItems: new Map(),
  busyIds: new Set(),
  batchRunning: false,
  batchAbort: null,
  toastTimer: null,
  toastActionHandler: null,
  preparedFiles: new Map(),
  preparedTotalBytes: 0,
  preparingPromises: new Map(),
  lightboxPreloadTimer: null,
  lightboxPreloadAbort: null,
  activeSaveModal: null,
};

function logDownloadDebug(stage, details = {}, isError = false) {
  const entry = {
    ts: new Date().toISOString(),
    stage,
    ...details,
  };
  try {
    if (typeof window !== 'undefined') {
      if (!Array.isArray(window.__driveDownloadLogs)) window.__driveDownloadLogs = [];
      window.__driveDownloadLogs.push(entry);
      if (window.__driveDownloadLogs.length > 60) window.__driveDownloadLogs.shift();
    }
    const logger = isError
      ? (console.error || console.log)
      : (console.info || console.log);
    logger.call(console, `[DriveDownload] ${stage}`, entry);
  } catch (_) {}
  return entry;
}

function getDownloadPlatformInfo() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const ua = String(nav.userAgent || '');
  const platform = String(nav.platform || '');
  const maxTouchPoints = Number(nav.maxTouchPoints || 0);

  const isIPhoneOrIPod = /iPhone|iPod/i.test(ua);
  // iPadOS 13+ Safari requests desktop websites with MacIntel platform + multi-touch points.
  const isIPad = /iPad/i.test(ua) || (!isIPhoneOrIPod && /Macintosh|MacIntel/i.test(platform || ua) && maxTouchPoints > 1);
  const isIOS = isIPhoneOrIPod || isIPad;
  const isAndroid = !isIOS && /Android/i.test(ua);
  const isMac = !isIOS && /Mac/i.test(platform || ua);
  const isWindows = /Win/i.test(platform || ua);

  let inAppName = '';
  if (/\bZalo\b|ZaloClient|ZaloTheme/i.test(ua)) inAppName = 'Zalo';
  else if (/\bMessenger\b|\bOrca-Android\b|FBAN\/Messenger|FB_IAB\/Orca/i.test(ua)) inAppName = 'Messenger';
  else if (/\bFBAN\b|\bFBAV\b|\bFB_IAB\b|\bFBIOS\b/i.test(ua)) inAppName = 'Facebook';
  else if (/\bInstagram\b/i.test(ua)) inAppName = 'Instagram';
  else if (/\bBytedanceWebview\b|\bTikTok\b|\bmusical_ly\b/i.test(ua)) inAppName = 'TikTok';
  else if (/\bBarcelona\b/i.test(ua)) inAppName = 'Threads';
  else if (/\bLine\//i.test(ua)) inAppName = 'LINE';

  const isInApp = Boolean(inAppName);
  const isCriOS = /CriOS/i.test(ua);
  const isFxiOS = /FxiOS/i.test(ua);
  const isEdgiOS = /EdgiOS/i.test(ua);
  const isSafariIOS = isIOS && !isInApp && /Safari/i.test(ua) && !isCriOS && !isFxiOS && !isEdgiOS;

  const os = isIPad ? 'iPadOS' : isIPhoneOrIPod ? 'iOS' : isAndroid ? 'Android' : isWindows ? 'Windows' : isMac ? 'macOS' : 'Desktop';
  return {
    os,
    ua,
    isIOS,
    isIPad,
    isIPhoneOrIPod,
    isAndroid,
    isMac,
    isWindows,
    isInApp,
    inAppName,
    isSafariIOS,
    hasShareApi: typeof nav.share === 'function',
    hasCanShareApi: typeof nav.canShare === 'function',
  };
}

function canWebShareFiles(files) {
  try {
    if (typeof navigator === 'undefined') return false;
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    if (!Array.isArray(files) || !files.length) return false;
    return Boolean(navigator.canShare({ files }));
  } catch (err) {
    logDownloadDebug('canShare-check-failed', { message: err?.message || String(err) });
    return false;
  }
}

function hasActiveUserGesture(gestureStartedAt = 0) {
  try {
    if (typeof navigator !== 'undefined' && navigator.userActivation && typeof navigator.userActivation.isActive === 'boolean') {
      return navigator.userActivation.isActive;
    }
  } catch (_) {}
  return gestureStartedAt > 0 && (Date.now() - gestureStartedAt) < 3500;
}

function isNefFileName(name) {
  return /\.nef$/i.test(String(name || '').trim());
}

function isConvertibleSourceBadgeName(name) {
  return /\.(?:nef|heic|heif)$/i.test(String(name || '').trim());
}

function isKnownImageFileName(name) {
  return /\.(?:jpe?g|png|heic|heif|webp|gif|bmp|tiff?|avif|nef|nrw|dng|cr2|cr3|arw|raf|orf|rw2)$/i.test(String(name || '').trim());
}

// Normalize every downloaded image filename to clean lowercase .jpg and strip old HEIC/HEIF/PNG/RAW/JPEG extensions.
function normalizeJpegFileName(originalName) {
  let clean = String(originalName || 'anh-ky-niem')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_')
    .replace(/\s+/g, ' ');
  const extPattern = /\.(?:jpe?g|heic|heif|png|webp|gif|bmp|tiff?|avif|nef|nrw|dng|cr2|cr3|arw|raf|orf|rw2)$/i;
  while (extPattern.test(clean)) {
    clean = clean.replace(extPattern, '');
  }
  clean = clean.replace(/[. _-]+$/g, '').trim();
  if (!clean) clean = 'anh-ky-niem';
  return `${clean}.jpg`;
}

function getDownloadFileName(originalName, mimeType = 'image/jpeg', forceJpeg = false) {
  if (forceJpeg || mimeType === 'image/jpeg' || isNefFileName(originalName)) {
    return normalizeJpegFileName(originalName);
  }
  const clean = String(originalName || 'anh-ky-niem').trim().replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_') || 'anh-ky-niem';
  if (mimeType === 'image/png') return /\.png$/i.test(clean) ? clean : clean.replace(/\.[a-z0-9]{2,5}$/i, '') + '.png';
  if (mimeType === 'image/webp') return /\.webp$/i.test(clean) ? clean : clean.replace(/\.[a-z0-9]{2,5}$/i, '') + '.webp';
  if (mimeType === 'image/gif') return /\.gif$/i.test(clean) ? clean : clean.replace(/\.[a-z0-9]{2,5}$/i, '') + '.gif';
  return clean;
}

function toUint8(input) {
  if (!input) return new Uint8Array(0);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (typeof input.byteLength === 'number' && typeof input.slice === 'function') return new Uint8Array(input);
  return new Uint8Array(0);
}

function hexMagicPrefix(bytes, length = 8) {
  const b = toUint8(bytes);
  const count = Math.min(b.length, length);
  const parts = [];
  for (let i = 0; i < count; i++) parts.push(b[i].toString(16).toUpperCase().padStart(2, '0'));
  return parts.join(' ');
}

// Strict binary verification of JPEG SOI + marker magic bytes: FF D8 FF.
function isJpegBuffer(bytes) {
  const b = toUint8(bytes);
  return b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}
function isPngBuffer(bytes) {
  const b = toUint8(bytes);
  return b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}
function isWebpBuffer(bytes) {
  const b = toUint8(bytes);
  return b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
}
function isGifBuffer(bytes) {
  const b = toUint8(bytes);
  return b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
}
function isBmpBuffer(bytes) {
  const b = toUint8(bytes);
  return b.length >= 14 && b[0] === 0x42 && b[1] === 0x4d;
}
function isIsoBmffImageBuffer(bytes) {
  const b = toUint8(bytes);
  if (b.length < 12) return '';
  if (b[4] !== 0x66 || b[5] !== 0x74 || b[6] !== 0x79 || b[7] !== 0x70) return '';
  const brand = String.fromCharCode(b[8], b[9], b[10], b[11]).toLowerCase();
  if (brand === 'avif' || brand === 'avis') return 'image/avif';
  if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return 'image/heic';
  return '';
}
function isNefBuffer(bytes) {
  const b = toUint8(bytes);
  if (b.length < 8) return false;
  return (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
         (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a);
}
function detectImageMime(bytes) {
  if (isJpegBuffer(bytes)) return 'image/jpeg';
  if (isPngBuffer(bytes)) return 'image/png';
  if (isWebpBuffer(bytes)) return 'image/webp';
  if (isGifBuffer(bytes)) return 'image/gif';
  if (isBmpBuffer(bytes)) return 'image/bmp';
  return isIsoBmffImageBuffer(bytes);
}

function createVerifiedJpegFile(jpegBytes, originalName) {
  const b = toUint8(jpegBytes);
  if (!isJpegBuffer(b)) {
    throw new Error(`Dữ liệu ảnh không có chữ ký JPEG hợp lệ (FF D8 FF), nhận được [${hexMagicPrefix(b, 4) || 'rỗng'}].`);
  }
  const fileName = normalizeJpegFileName(originalName);
  const slice = b.byteOffset === 0 && b.byteLength === b.buffer.byteLength
    ? b
    : new Uint8Array(b);
  if (typeof File === 'function') {
    return new File([slice], fileName, { type: 'image/jpeg', lastModified: Date.now() });
  }
  const fallbackBlob = new Blob([slice], { type: 'image/jpeg' });
  try {
    Object.defineProperty(fallbackBlob, 'name', { value: fileName, configurable: true });
  } catch (_) {
    fallbackBlob.name = fileName;
  }
  return fallbackBlob;
}

function parseJpegMetadata(input) {
  const b = toUint8(input);
  if (!isJpegBuffer(b)) return { valid: false, width: 0, height: 0, area: 0, exifOrientation: 0, orientationOffset: 0, orientationLE: true };
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let width = 0, height = 0, exifOrientation = 0, orientationOffset = 0, orientationLE = true;
  let pos = 2;
  while (pos + 2 <= b.length) {
    if (b[pos] !== 0xff) { pos++; continue; }
    while (pos < b.length && b[pos] === 0xff) pos++;
    if (pos >= b.length) break;
    const marker = b[pos++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (pos + 2 > b.length) break;
    const segLen = (b[pos] << 8) | b[pos + 1];
    if (segLen < 2 || pos + segLen > b.length) break;
    if (marker === 0xe1 && segLen >= 16 && b[pos + 2] === 0x45 && b[pos + 3] === 0x78 && b[pos + 4] === 0x69 && b[pos + 5] === 0x66 && b[pos + 6] === 0x00 && b[pos + 7] === 0x00 && !exifOrientation) {
      const tiff = pos + 8;
      const le = b[tiff] === 0x49 && b[tiff + 1] === 0x49;
      const be = b[tiff] === 0x4d && b[tiff + 1] === 0x4d;
      if ((le || be) && tiff + 8 <= pos + segLen && view.getUint16(tiff + 2, le) === 42) {
        const ifd0 = tiff + view.getUint32(tiff + 4, le);
        if (ifd0 + 2 <= pos + segLen) {
          const count = Math.min(256, view.getUint16(ifd0, le));
          for (let i = 0; i < count && ifd0 + 2 + (i + 1) * 12 <= pos + segLen; i++) {
            const entry = ifd0 + 2 + i * 12;
            if (view.getUint16(entry, le) === 0x0112 && view.getUint16(entry + 2, le) === 3 && view.getUint32(entry + 4, le) === 1) {
              exifOrientation = view.getUint16(entry + 8, le);
              orientationOffset = entry + 8;
              orientationLE = le;
              break;
            }
          }
        }
      }
    } else if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      if (segLen >= 7) {
        height = (b[pos + 3] << 8) | b[pos + 4];
        width = (b[pos + 5] << 8) | b[pos + 6];
      }
    }
    pos += segLen;
  }
  return { valid: true, width, height, area: width * height, exifOrientation, orientationOffset, orientationLE };
}

// Losslessly preserve camera EXIF orientation in embedded NEF JPEGs without re-compressing 24-45MP pixels.
function applyExifOrientationToJpeg(jpegBytes, targetOrientation) {
  const b = toUint8(jpegBytes), orient = Number(targetOrientation) || 1;
  if (!isJpegBuffer(b) || orient < 2 || orient > 8) return b;
  const meta = parseJpegMetadata(b);
  if (meta.exifOrientation === orient) return b;
  if (meta.orientationOffset > 0 && meta.orientationOffset + 2 <= b.length) {
    const patched = new Uint8Array(b);
    new DataView(patched.buffer).setUint16(meta.orientationOffset, orient, meta.orientationLE);
    return patched;
  }
  const app1 = new Uint8Array([
    0xff, 0xe1, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orient & 0xff, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
  let insertAt = 2;
  if (b.length >= 6 && b[2] === 0xff && b[3] === 0xe0) {
    const app0Len = (b[4] << 8) | b[5];
    if (app0Len >= 2 && 4 + app0Len <= b.length) insertAt = 4 + app0Len;
  }
  const out = new Uint8Array(b.length + app1.length);
  out.set(b.subarray(0, insertAt), 0);
  out.set(app1, insertAt);
  out.set(b.subarray(insertAt), insertAt + app1.length);
  return out;
}

function trimJpegPadding(slice) {
  if (!isJpegBuffer(slice)) return null;
  let end = slice.length;
  while (end > 4 && slice[end - 1] === 0x00) end--;
  if (end >= 4 && slice[end - 2] === 0xff && slice[end - 1] === 0xd9) return slice.subarray(0, end);
  // Scan backward a short tail window if Nikon padded extra metadata bytes after EOI.
  const limit = Math.max(2, end - 4096);
  for (let i = end - 2; i >= limit; i--) {
    if (slice[i] === 0xff && slice[i + 1] === 0xd9) return slice.subarray(0, i + 2);
  }
  return slice;
}

function scanEmbeddedJpegs(bytes) {
  const found = [];
  for (let i = 0; i + 16 < bytes.length; i++) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8 || bytes[i + 2] !== 0xff) continue;
    const third = bytes[i + 3];
    if (third < 0xc0 || third === 0xd8 || third === 0xd9 || third === 0xff) continue;
    let p = i + 2, eoi = -1, inScan = false;
    while (p + 1 < bytes.length) {
      if (!inScan) {
        if (bytes[p] !== 0xff) break;
        while (p < bytes.length && bytes[p] === 0xff) p++;
        if (p >= bytes.length) break;
        const m = bytes[p++];
        if (m === 0xd9) { eoi = p; break; }
        if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) continue;
        if (p + 2 > bytes.length) break;
        const len = (bytes[p] << 8) | bytes[p + 1];
        if (len < 2 || p + len > bytes.length) break;
        p += len;
        if (m === 0xda) inScan = true;
      } else {
        if (bytes[p] === 0xff) {
          const next = bytes[p + 1];
          if (next === 0x00 || (next >= 0xd0 && next <= 0xd7) || next === 0xff) { p += next === 0xff ? 1 : 2; continue; }
          if (next === 0xd9) { eoi = p + 2; break; }
          inScan = false;
          continue;
        }
        p++;
      }
    }
    if (eoi > i + 32) {
      found.push(bytes.subarray(i, eoi));
      i = eoi - 1;
    }
  }
  return found;
}

// Parse Nikon .NEF (TIFF/EP + SubIFDs + ExifIFD + Nikon MakerNote PreviewIFD) and extract the highest-resolution EXPEED JPEG.
function extractBestJpegFromNef(input) {
  const bytes = toUint8(input);
  if (bytes.length < 16) throw new Error('Tệp NEF rỗng hoặc bị hỏng.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const candidates = [];
  let rootOrientation = 1;

  if (isNefBuffer(bytes)) {
    const rootLE = bytes[0] === 0x49;
    const visited = new Set();

    function readUints(base, entryPos, type, count, le) {
      const size = TIFF_TYPE_SIZES[type];
      if (!size || !count) return [];
      const capped = Math.min(count, 64), byteTotal = count * size;
      const valPos = byteTotal <= 4 ? entryPos + 8 : base + view.getUint32(entryPos + 8, le);
      if (valPos < 0 || valPos + capped * size > bytes.length) return [];
      const out = [];
      for (let i = 0; i < capped; i++) {
        if (type === 1) out.push(bytes[valPos + i]);
        else if (type === 3) out.push(view.getUint16(valPos + i * 2, le));
        else if (type === 4 || type === 13) out.push(view.getUint32(valPos + i * 4, le));
      }
      return out;
    }

    function addCandidateSlice(start, length) {
      if (!Number.isFinite(start) || !Number.isFinite(length) || start < 0 || length < 32 || start >= bytes.length) return;
      const slice = trimJpegPadding(bytes.subarray(start, Math.min(bytes.length, start + length)));
      if (slice) candidates.push(slice);
    }

    function walkIfd(base, relOffset, le, isRoot, depth) {
      if (!relOffset || depth > 8) return;
      const abs = base + relOffset, visitKey = `${base}:${relOffset}`;
      if (visited.has(visitKey) || abs < 0 || abs + 2 > bytes.length) return;
      visited.add(visitKey);
      const entryCount = view.getUint16(abs, le);
      if (entryCount > 512 || abs + 2 + entryCount * 12 > bytes.length) return;

      let compression = 0, jpegOffset = 0, jpegLength = 0;
      let stripOffsets = [], stripCounts = [], subIfds = [], exifIfd = 0, previewIfd = 0;
      let makerOffset = 0, makerLength = 0;

      for (let i = 0; i < entryCount; i++) {
        const entry = abs + 2 + i * 12;
        const tag = view.getUint16(entry, le), type = view.getUint16(entry + 2, le), count = view.getUint32(entry + 4, le);
        if (tag === 0x0112) {
          const v = readUints(base, entry, type, count, le)[0];
          if (isRoot && v >= 1 && v <= 8) rootOrientation = v;
        } else if (tag === 0x0103) {
          compression = readUints(base, entry, type, count, le)[0] || 0;
        } else if (tag === 0x0201) {
          jpegOffset = readUints(base, entry, type, count, le)[0] || 0;
        } else if (tag === 0x0202) {
          jpegLength = readUints(base, entry, type, count, le)[0] || 0;
        } else if (tag === 0x0111) {
          stripOffsets = readUints(base, entry, type, count, le);
        } else if (tag === 0x0117) {
          stripCounts = readUints(base, entry, type, count, le);
        } else if (tag === 0x014a) {
          subIfds = readUints(base, entry, type, count, le);
        } else if (tag === 0x8769) {
          exifIfd = readUints(base, entry, type, count, le)[0] || 0;
        } else if (tag === 0x0011 && base > 0) {
          previewIfd = readUints(base, entry, type, count, le)[0] || 0;
        } else if (tag === 0x927c) {
          const size = TIFF_TYPE_SIZES[type] || 1, total = count * size;
          if (total > 18) {
            makerOffset = base + view.getUint32(entry + 8, le);
            makerLength = total;
          }
        }
      }

      if (jpegOffset > 0 && jpegLength > 32) addCandidateSlice(base + jpegOffset, jpegLength);
      if (stripOffsets.length && stripOffsets.length === stripCounts.length) {
        const firstStart = base + stripOffsets[0];
        if (stripOffsets.length === 1 && firstStart + 4 <= bytes.length && bytes[firstStart] === 0xff && bytes[firstStart + 1] === 0xd8) {
          addCandidateSlice(firstStart, stripCounts[0]);
        } else if ((compression === 6 || compression === 7) && firstStart + 4 <= bytes.length && bytes[firstStart] === 0xff && bytes[firstStart + 1] === 0xd8) {
          const totalLen = stripCounts.reduce((sum, n) => sum + n, 0);
          if (totalLen > 32 && totalLen <= bytes.length) {
            const joined = new Uint8Array(totalLen);
            let cursor = 0, valid = true;
            for (let s = 0; s < stripOffsets.length; s++) {
              const st = base + stripOffsets[s], ln = stripCounts[s];
              if (st < 0 || st + ln > bytes.length) { valid = false; break; }
              joined.set(bytes.subarray(st, st + ln), cursor);
              cursor += ln;
            }
            if (valid) {
              const trimmed = trimJpegPadding(joined);
              if (trimmed) candidates.push(trimmed);
            }
          }
        }
      }

      subIfds.forEach(off => walkIfd(base, off, le, false, depth + 1));
      if (exifIfd) walkIfd(base, exifIfd, le, false, depth + 1);
      if (previewIfd) walkIfd(base, previewIfd, le, false, depth + 1);

      // Nikon Type-3 MakerNote: "Nikon\0" + 4-byte version + embedded TIFF header at +10.
      if (makerOffset > 0 && makerOffset + 18 <= bytes.length && makerOffset + makerLength <= bytes.length &&
          bytes[makerOffset] === 0x4e && bytes[makerOffset + 1] === 0x69 && bytes[makerOffset + 2] === 0x6b &&
          bytes[makerOffset + 3] === 0x6f && bytes[makerOffset + 4] === 0x6e && bytes[makerOffset + 5] === 0x00) {
        const mnTiff = makerOffset + 10;
        const mnLE = bytes[mnTiff] === 0x49 && bytes[mnTiff + 1] === 0x49;
        const mnBE = bytes[mnTiff] === 0x4d && bytes[mnTiff + 1] === 0x4d;
        if ((mnLE || mnBE) && view.getUint16(mnTiff + 2, mnLE) === 42) {
          walkIfd(mnTiff, view.getUint32(mnTiff + 4, mnLE), mnLE, false, depth + 1);
        }
      }

      const nextPos = abs + 2 + entryCount * 12;
      if (nextPos + 4 <= bytes.length) {
        const nextIfd = view.getUint32(nextPos, le);
        if (nextIfd) walkIfd(base, nextIfd, le, false, depth + 1);
      }
    }

    walkIfd(0, view.getUint32(4, rootLE), rootLE, true, 0);
  }

  let scored = candidates.map(slice => ({ slice, meta: parseJpegMetadata(slice) })).filter(item => item.meta.valid);
  if (!scored.some(item => item.meta.area > 0)) {
    const scanned = scanEmbeddedJpegs(bytes).map(slice => ({ slice, meta: parseJpegMetadata(slice) })).filter(item => item.meta.valid);
    scored.push(...scanned);
  }
  if (!scored.length) throw new Error('Không tìm thấy luồng ảnh JPEG chuẩn gốc bên trong tệp NEF.');

  scored.sort((a, b) => (b.meta.area - a.meta.area) || (b.slice.byteLength - a.slice.byteLength));
  const best = scored[0];
  const effectiveOrientation = (best.meta.exifOrientation >= 2 && best.meta.exifOrientation <= 8)
    ? best.meta.exifOrientation
    : rootOrientation;
  const outputBytes = (rootOrientation >= 2 && rootOrientation <= 8 && (best.meta.exifOrientation || 1) === 1)
    ? applyExifOrientationToJpeg(best.slice, rootOrientation)
    : new Uint8Array(best.slice);
  const rotated = effectiveOrientation >= 5 && effectiveOrientation <= 8;
  return {
    bytes: outputBytes,
    width: rotated ? best.meta.height : best.meta.width,
    height: rotated ? best.meta.width : best.meta.height,
    orientation: effectiveOrientation,
  };
}

async function transcodeBlobToJpeg(sourceBlob, quality = 0.95) {
  if (typeof document === 'undefined') throw new Error('Cần trình duyệt để chuyển đổi định dạng ảnh sang JPG.');
  const url = URL.createObjectURL(sourceBlob);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không giải mã được ảnh để chuyển sang JPG.'));
      el.src = url;
    });
    let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('Kích thước ảnh không hợp lệ.');
    // Respect mobile Safari's 16.7MP canvas ceiling while keeping full native resolution whenever supported.
    const maxPixels = 16777216;
    const tryRender = async (targetW, targetH) => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Không tạo được bộ đệm xử lý ảnh.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      canvas.width = canvas.height = 0;
      if (!blob || !blob.size) throw new Error('Canvas limit');
      return { blob, width: targetW, height: targetH };
    };
    try {
      return await tryRender(w, h);
    } catch (_) {
      if (w * h <= maxPixels) throw new Error('Không xuất được tệp JPG chất lượng gốc.');
      const scale = Math.sqrt(maxPixels / (w * h));
      return await tryRender(Math.max(1, Math.floor(w * scale)), Math.max(1, Math.floor(h * scale)));
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dataUrlToUint8(dataUrl) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Dữ liệu ảnh trả về không hợp lệ.');
  const binary = atob(match[2]), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mimeType: match[1], bytes };
}

function createTimeoutFetchScope(timeoutMs, externalSignal) {
  if (typeof AbortController !== 'function') {
    return { signal: externalSignal, cleanup() {} };
  }
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(externalSignal?.reason || new DOMException('Aborted', 'AbortError'));
  if (externalSignal) {
    if (externalSignal.aborted) onExternalAbort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => {
    controller.abort(new Error(`Quá thời gian tải ảnh (${Math.round(timeoutMs / 1000)}s).`));
  }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      if (externalSignal) {
        try { externalSignal.removeEventListener('abort', onExternalAbort); } catch (_) {}
      }
    },
  };
}

function getCachedPreparedImage(fileId) {
  const entry = driveDownloadState.preparedFiles.get(fileId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > PREPARED_FILE_TTL_MS) {
    driveDownloadState.preparedFiles.delete(fileId);
    driveDownloadState.preparedTotalBytes = Math.max(0, driveDownloadState.preparedTotalBytes - (entry.byteLength || 0));
    return null;
  }
  // Refresh LRU order.
  driveDownloadState.preparedFiles.delete(fileId);
  driveDownloadState.preparedFiles.set(fileId, entry);
  return entry;
}

function storeCachedPreparedImage(fileId, result) {
  if (!fileId || !result?.file) return result;
  const existing = driveDownloadState.preparedFiles.get(fileId);
  if (existing) {
    driveDownloadState.preparedTotalBytes = Math.max(0, driveDownloadState.preparedTotalBytes - (existing.byteLength || 0));
    driveDownloadState.preparedFiles.delete(fileId);
  }
  const byteLength = result.file.size || result.bytes?.byteLength || 0;
  if (byteLength > PREPARED_CACHE_MAX_BYTES) return result;
  const entry = { ...result, byteLength, createdAt: Date.now() };
  driveDownloadState.preparedFiles.set(fileId, entry);
  driveDownloadState.preparedTotalBytes += byteLength;

  while (
    driveDownloadState.preparedFiles.size > PREPARED_CACHE_MAX_ITEMS ||
    driveDownloadState.preparedTotalBytes > PREPARED_CACHE_MAX_BYTES
  ) {
    const oldestKey = driveDownloadState.preparedFiles.keys().next().value;
    if (!oldestKey) break;
    const oldest = driveDownloadState.preparedFiles.get(oldestKey);
    driveDownloadState.preparedFiles.delete(oldestKey);
    driveDownloadState.preparedTotalBytes = Math.max(0, driveDownloadState.preparedTotalBytes - (oldest?.byteLength || 0));
  }
  return entry;
}

// Convert any NEF or non-JPEG input into a verified JPEG File/Blob (preserving original JPEG bytes losslessly whenever possible).
async function convertNefToJpeg(input, options = {}) {
  const quality = options.quality ?? 0.95;
  const fileName = normalizeJpegFileName(options.fileName || input?.name || 'anh-goc.nef');
  let bytes;
  if (input && typeof input.arrayBuffer === 'function') bytes = toUint8(await input.arrayBuffer());
  else bytes = toUint8(input);
  if (!bytes.length) throw new Error('Không có dữ liệu ảnh để chuyển đổi.');

  if (isNefBuffer(bytes)) {
    const extracted = extractBestJpegFromNef(bytes);
    const file = createVerifiedJpegFile(extracted.bytes, fileName);
    return {
      file,
      blob: file,
      bytes: extracted.bytes,
      fileName,
      width: extracted.width,
      height: extracted.height,
      orientation: extracted.orientation,
      converted: true,
      source: 'nef-binary',
    };
  }
  if (isJpegBuffer(bytes)) {
    const meta = parseJpegMetadata(bytes);
    const file = createVerifiedJpegFile(bytes, fileName);
    return {
      file,
      blob: file,
      bytes,
      fileName,
      width: meta.width,
      height: meta.height,
      orientation: meta.exifOrientation || 1,
      converted: true,
      source: 'jpeg-original',
    };
  }
  const detected = detectImageMime(bytes);
  if (detected) {
    const rendered = await transcodeBlobToJpeg(new Blob([bytes], { type: detected }), quality);
    const outBytes = toUint8(await rendered.blob.arrayBuffer());
    const file = createVerifiedJpegFile(outBytes, fileName);
    return {
      file,
      blob: file,
      bytes: outBytes,
      fileName,
      width: rendered.width,
      height: rendered.height,
      orientation: 1,
      converted: true,
      source: 'canvas-jpeg',
    };
  }
  // Fallback for non-TIFF wrapper containing an embedded JPEG stream.
  const extracted = extractBestJpegFromNef(bytes);
  const file = createVerifiedJpegFile(extracted.bytes, fileName);
  return {
    file,
    blob: file,
    bytes: extracted.bytes,
    fileName,
    width: extracted.width,
    height: extracted.height,
    orientation: extracted.orientation,
    converted: true,
    source: 'nef-scan',
  };
}

async function fetchDriveOriginalImage(fileId, fileName, options = {}) {
  if (!/^[\w-]+$/.test(fileId || '')) throw new Error('ID ảnh không hợp lệ.');
  const normalizedName = normalizeJpegFileName(fileName);
  const signal = options.signal;

  if (!options.skipCache) {
    const cached = getCachedPreparedImage(fileId);
    if (cached && cached.fileName === normalizedName) {
      logDownloadDebug('cache-hit', { fileId, fileName: normalizedName, size: cached.file.size, via: cached.via });
      return cached;
    }
  }

  if (!signal && driveDownloadState.preparingPromises.has(fileId)) {
    return driveDownloadState.preparingPromises.get(fileId);
  }

  const runFetch = async () => {
    const isNonJpegNamedSource = /\.(?:nef|nrw|dng|cr2|cr3|arw|raf|orf|rw2|heic|heif|png|webp|gif|bmp|tiff?|avif)$/i.test(String(fileName || '').trim());
    const directUrl = getDriveOriginalImageUrl(fileId);
    const errors = [];

    const finalizeVerifiedJpeg = async (rawBytes, sourceName, contentTypeHeader = '', sourceUrl = '') => {
      const magic = hexMagicPrefix(rawBytes, 8);
      logDownloadDebug('inspect-binary', {
        fileId,
        originalName: fileName,
        normalizedName,
        via: sourceName,
        contentTypeHeader,
        byteLength: rawBytes.byteLength,
        magicHex: magic,
      });

      // 1. Genuine JPEG magic bytes (FF D8 FF): keep exact binary stream without any re-compression!
      if (isJpegBuffer(rawBytes)) {
        const meta = parseJpegMetadata(rawBytes);
        const file = createVerifiedJpegFile(rawBytes, normalizedName);
        return storeCachedPreparedImage(fileId, {
          fileId,
          originalName: fileName,
          file,
          blob: file,
          bytes: rawBytes,
          fileName: normalizedName,
          width: meta.width,
          height: meta.height,
          converted: isNonJpegNamedSource,
          losslessPassthrough: true,
          via: sourceName,
          directJpegUrl: sourceName === 'direct-s0' ? sourceUrl : directUrl,
        });
      }

      // 2. Nikon NEF / TIFF RAW binary: extract full-res embedded JPEG losslessly.
      if (isNefBuffer(rawBytes)) {
        const converted = await convertNefToJpeg(rawBytes, { fileName: normalizedName, quality: 0.95 });
        return storeCachedPreparedImage(fileId, {
          fileId,
          originalName: fileName,
          ...converted,
          losslessPassthrough: true,
          via: sourceName,
          directJpegUrl: directUrl,
        });
      }

      // 3. Other valid raster formats (PNG, WebP, GIF, BMP, HEIC/AVIF if returned un-converted): transcode once to high-quality JPEG & verify FF D8 FF.
      const detectedMime = detectImageMime(rawBytes);
      if (detectedMime) {
        const rendered = await transcodeBlobToJpeg(new Blob([rawBytes], { type: detectedMime }), 0.95);
        const outBytes = toUint8(await rendered.blob.arrayBuffer());
        const file = createVerifiedJpegFile(outBytes, normalizedName);
        logDownloadDebug('transcoded-to-jpeg', {
          fileId,
          fromMime: detectedMime,
          outBytes: outBytes.byteLength,
          magicHex: hexMagicPrefix(outBytes, 4),
          width: rendered.width,
          height: rendered.height,
        });
        return storeCachedPreparedImage(fileId, {
          fileId,
          originalName: fileName,
          file,
          blob: file,
          bytes: outBytes,
          fileName: normalizedName,
          width: rendered.width,
          height: rendered.height,
          converted: true,
          losslessPassthrough: false,
          via: sourceName,
          directJpegUrl: directUrl,
        });
      }

      throw new Error(`Dữ liệu từ ${sourceName} không phải ảnh hợp lệ (Content-Type: "${contentTypeHeader || 'không rõ'}", magic: [${magic || 'rỗng'}]).`);
    };

    // 1. Direct original-resolution stream (=s0) from Google Drive image servers.
    for (const [label, url] of [
      ['direct-s0', directUrl],
      ['thumb-s0', getDriveOriginalFallbackUrl(fileId)],
    ]) {
      const scope = createTimeoutFetchScope(45000, signal);
      try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: scope.signal });
        const contentType = res.headers?.get?.('content-type') || '';
        if (!res.ok) {
          errors.push(`${label}: HTTP ${res.status}`);
          logDownloadDebug('endpoint-http-error', { label, fileId, status: res.status, contentType }, true);
          continue;
        }
        const bytes = toUint8(await res.arrayBuffer());
        if (bytes.byteLength < 32) {
          errors.push(`${label}: dữ liệu quá ngắn (${bytes.byteLength}B)`);
          continue;
        }
        return await finalizeVerifiedJpeg(bytes, label, contentType, url);
      } catch (err) {
        if (signal?.aborted) throw err;
        errors.push(`${label}: ${err?.message || String(err)}`);
        logDownloadDebug('endpoint-failed', { label, fileId, error: err?.message || String(err) }, true);
      } finally {
        scope.cleanup();
      }
    }

    // 2. CORS-safe Apps Script bridge fallback when direct Google hosts are blocked.
    if (typeof driveConnectionPromise !== 'undefined' && driveConnectionPromise && !liveState.imageDownloadBridge && !liveState.thumbnailBridge) {
      try { await driveConnectionPromise; } catch (_) {}
    }
    if (liveState.imageDownloadBridge) {
      try {
        const res = await driveRequest('downloadImage', { id: fileId }, false, { signal });
        const { mimeType, bytes } = dataUrlToUint8(res.image);
        return await finalizeVerifiedJpeg(bytes, 'bridge-s0', mimeType, directUrl);
      } catch (err) {
        if (signal?.aborted) throw err;
        errors.push(`bridge-s0: ${err?.message || String(err)}`);
        logDownloadDebug('bridge-s0-failed', { fileId, error: err?.message || String(err) }, true);
      }
    }
    if (liveState.thumbnailBridge) {
      try {
        const dataUrl = await getDriveThumbnailData(fileId);
        const { mimeType, bytes } = dataUrlToUint8(dataUrl);
        return await finalizeVerifiedJpeg(bytes, 'bridge-preview', mimeType, directUrl);
      } catch (err) {
        if (signal?.aborted) throw err;
        errors.push(`bridge-preview: ${err?.message || String(err)}`);
        logDownloadDebug('bridge-preview-failed', { fileId, error: err?.message || String(err) }, true);
      }
    }

    const detail = errors.length ? ` (${errors[0]})` : '';
    throw new Error(`Không tải được dữ liệu ảnh JPEG gốc từ Google Drive${detail}. Vui lòng kiểm tra kết nối mạng hoặc thử lại.`);
  };

  if (signal) return runFetch();
  const tracked = runFetch().finally(() => {
    if (driveDownloadState.preparingPromises.get(fileId) === tracked) {
      driveDownloadState.preparingPromises.delete(fileId);
    }
  });
  driveDownloadState.preparingPromises.set(fileId, tracked);
  return tracked;
}

// Android & Desktop download: Blob URL + <a download>, keeping ObjectURL alive well past click.
function triggerBrowserBlobDownload(blob, fileName) {
  const safeName = normalizeJpegFileName(fileName);
  const payload = blob?.type === 'image/jpeg' ? blob : new Blob([blob], { type: 'image/jpeg' });
  const objectUrl = URL.createObjectURL(payload);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  // Remove anchor asynchronously and delay revokeObjectURL (120s) so Android/Desktop disk writes never race.
  setTimeout(() => {
    try { link.remove(); } catch (_) {}
  }, 1000);
  setTimeout(() => {
    try { URL.revokeObjectURL(objectUrl); } catch (_) {}
  }, BLOB_REVOKE_DELAY_MS);
  logDownloadDebug('blob-anchor-download', { fileName: safeName, size: payload.size, revokeDelayMs: BLOB_REVOKE_DELAY_MS });
}

function showDownloadToast(message, options = {}) {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const toast = document.getElementById('download-toast');
  if (!toast) return;
  clearTimeout(driveDownloadState.toastTimer);
  const spinner = document.getElementById('download-toast-spinner');
  const text = document.getElementById('download-toast-text');
  const cancelBtn = document.getElementById('download-toast-cancel');
  const actionBtn = document.getElementById('download-toast-action');
  toast.classList.remove('hidden');
  toast.dataset.tone = options.error ? 'error' : options.busy ? 'busy' : 'done';
  if (spinner) spinner.classList.toggle('hidden', !options.busy);
  if (text) text.textContent = message;
  if (cancelBtn) cancelBtn.classList.toggle('hidden', !options.cancellable);
  if (actionBtn) {
    if (options.actionLabel && typeof options.onAction === 'function') {
      driveDownloadState.toastActionHandler = options.onAction;
      actionBtn.textContent = options.actionLabel;
      actionBtn.classList.remove('hidden');
    } else {
      driveDownloadState.toastActionHandler = null;
      actionBtn.classList.add('hidden');
    }
  }
  if (!options.busy) {
    const duration = options.durationMs || (options.error ? 7000 : options.actionLabel ? 8000 : 4200);
    driveDownloadState.toastTimer = setTimeout(() => { toast.classList.add('hidden'); }, duration);
  }
}

function handleDownloadToastAction() {
  const fn = driveDownloadState.toastActionHandler;
  if (typeof fn === 'function') fn();
}

function formatByteSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function getInAppSafariGuideText(platform) {
  const app = platform.inAppName || 'ứng dụng này';
  if (platform.isIOS) {
    if (app === 'Zalo') {
      return 'Bạn đang mở trong Zalo. Để lưu nhiều ảnh nhanh nhất: bấm nút ⋯ ở góc trên phải → chọn "Mở bằng trình duyệt" (Safari), hoặc nhấn giữ trực tiếp vào ảnh bên dưới để chọn "Lưu vào Ảnh".';
    }
    if (app === 'Messenger' || app === 'Facebook') {
      return `Bạn đang mở trong ${app}. Bấm biểu tượng ⋯ (hoặc biểu tượng la bàn Safari góc dưới phải) → chọn "Mở trong trình duyệt ngoài / Open in Safari", hoặc nhấn giữ trực tiếp vào ảnh bên dưới để lưu vào Ảnh.`;
    }
    return `Bạn đang mở trong trình duyệt nhúng ${app}. Hãy mở trang bằng Safari để dùng tính năng Lưu vào Ảnh một chạm, hoặc nhấn giữ trực tiếp vào ảnh bên dưới để lưu.`;
  }
  return `Bạn đang mở trong ${app}. Nếu ảnh chưa tự lưu về máy, bấm nút ⋮ góc trên phải → chọn "Mở bằng trình duyệt / Chrome", hoặc nhấn giữ trực tiếp vào ảnh bên dưới để tải ảnh.`;
}

function closeImageSaveHelperModal() {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const modal = document.getElementById('ios-save-modal');
  if (modal) modal.classList.add('hidden');
  const active = driveDownloadState.activeSaveModal;
  driveDownloadState.activeSaveModal = null;
  if (active?.objectUrls?.length) {
    const urls = active.objectUrls.slice();
    setTimeout(() => {
      urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (_) {} });
    }, BLOB_REVOKE_DELAY_MS);
  }
}

function openImageSaveHelperModal(items, options = {}) {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const modal = document.getElementById('ios-save-modal');
  if (!modal) return;
  closeImageSaveHelperModal();

  const platform = options.platform || getDownloadPlatformInfo();
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return;

  const files = list.map(it => it.file).filter(Boolean);
  const canShareNow = files.length > 0 && canWebShareFiles(files);
  const objectUrls = [];
  const first = list[0];
  let previewSrc = '';
  if (first.file) {
    const blobUrl = URL.createObjectURL(first.file);
    objectUrls.push(blobUrl);
    // In embedded iOS WebViews (Zalo/Messenger/FB), https:// =s0 JPEG supports native UIContextMenu "Save to Photos" reliably, with blobUrl fallback.
    previewSrc = (platform.isInApp && first.directJpegUrl) ? first.directJpegUrl : blobUrl;
  } else if (first.directJpegUrl) {
    previewSrc = first.directJpegUrl;
  }

  driveDownloadState.activeSaveModal = { list, files, platform, objectUrls, previewSrc };

  const titleEl = document.getElementById('ios-save-title');
  const subtitleEl = document.getElementById('ios-save-subtitle');
  const shareBtn = document.getElementById('ios-save-share-btn');
  const directLink = document.getElementById('ios-save-direct-link');
  const previewWrap = document.getElementById('ios-save-preview-wrap');
  const previewImg = document.getElementById('ios-save-preview-img');
  const holdHint = document.getElementById('ios-save-hold-hint');
  const inAppBox = document.getElementById('ios-save-inapp-box');
  const inAppText = document.getElementById('ios-save-inapp-text');

  const isMulti = list.length > 1;
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  if (titleEl) {
    titleEl.textContent = isMulti
      ? `Sẵn sàng lưu ${list.length} ảnh JPG gốc`
      : `Sẵn sàng lưu: ${first.fileName || normalizeJpegFileName(first.originalName)}`;
  }
  if (subtitleEl) {
    const dim = (!isMulti && first.width && first.height) ? ` • ${first.width}×${first.height}px` : '';
    const sizeText = totalBytes ? ` (${formatByteSize(totalBytes)}${dim})` : '';
    subtitleEl.textContent = canShareNow
      ? `Ảnh JPEG chất lượng chuẩn gốc${sizeText}. Bấm nút màu xanh bên dưới → chọn "${isMulti ? `Lưu ${list.length} hình ảnh` : 'Lưu hình ảnh'}" (Save Image) để lưu thẳng vào ứng dụng Ảnh (Photos).`
      : `Ảnh JPEG chất lượng chuẩn gốc${sizeText}. Nhấn giữ vào ảnh bên dưới khoảng 1 giây rồi chọn "Lưu vào Ảnh" (Save to Photos).`;
  }

  if (shareBtn) {
    if (canShareNow) {
      shareBtn.classList.remove('hidden');
      shareBtn.textContent = isMulti
        ? `📲 Lưu tất cả ${list.length} ảnh vào Ảnh (Photos)`
        : '📲 Lưu vào Ảnh (Photos)';
    } else {
      shareBtn.classList.add('hidden');
    }
  }

  const fallbackDirectUrl = first.directJpegUrl || previewSrc;
  if (directLink) {
    if (!isMulti && fallbackDirectUrl) {
      directLink.href = fallbackDirectUrl;
      directLink.classList.remove('hidden');
    } else {
      directLink.classList.add('hidden');
    }
  }

  if (previewWrap && previewImg) {
    if (previewSrc) {
      previewImg.onerror = () => {
        if (objectUrls[0] && previewImg.src !== objectUrls[0]) previewImg.src = objectUrls[0];
      };
      previewImg.src = previewSrc;
      previewImg.alt = first.fileName || 'Ảnh JPEG gốc';
      previewWrap.classList.remove('hidden');
      if (holdHint) {
        holdHint.textContent = isMulti
          ? `Xem trước ảnh 1/${list.length} (${first.fileName}) — hoặc nhấn giữ vào ảnh để lưu nhanh`
          : '👆 Nhấn giữ vào ảnh (1 giây) → chọn "Lưu vào Ảnh / Thêm vào Ảnh"';
      }
    } else {
      previewWrap.classList.add('hidden');
    }
  }

  if (inAppBox && inAppText) {
    if (platform.isInApp) {
      inAppText.textContent = getInAppSafariGuideText(platform);
      inAppBox.classList.remove('hidden');
    } else {
      inAppBox.classList.add('hidden');
    }
  }

  modal.classList.remove('hidden');
  logDownloadDebug('open-save-helper-modal', {
    reason: options.reason || 'manual',
    count: list.length,
    canShareNow,
    platform: platform.os,
    inAppName: platform.inAppName,
  });
}

// Synchronous click handler inside #ios-save-modal: File[] is already prepared in RAM -> 100% transient user activation!
function triggerPreparedModalShare(event) {
  if (event) event.preventDefault();
  const active = driveDownloadState.activeSaveModal;
  if (!active || !active.files?.length) return;
  const files = active.files;
  if (!canWebShareFiles(files)) {
    showDownloadToast('Trình duyệt này không hỗ trợ bảng Chia sẻ tệp — hãy nhấn giữ vào ảnh bên dưới để lưu.', { error: true });
    return;
  }
  logDownloadDebug('modal-sync-web-share-start', { count: files.length, names: files.map(f => f.name) });
  // Pass ONLY { files } so iOS Safari always shows "Save Image / Lưu hình ảnh" to Apple Photos!
  navigator.share({ files }).then(() => {
    logDownloadDebug('modal-sync-web-share-success', { count: files.length });
    closeImageSaveHelperModal();
    showDownloadToast(
      files.length > 1
        ? `✓ Đã hoàn tất chia sẻ / lưu ${files.length} ảnh JPG gốc!`
        : `✓ Đã mở lưu ${files[0].name} vào Ảnh!`,
      { busy: false }
    );
  }).catch(err => {
    if (err?.name === 'AbortError') {
      logDownloadDebug('modal-sync-web-share-cancelled', {});
      return;
    }
    logDownloadDebug('modal-sync-web-share-error', { name: err?.name, message: err?.message || String(err) }, true);
    showDownloadToast('Không mở được bảng Chia sẻ — bạn hãy nhấn giữ trực tiếp vào ảnh bên dưới để chọn "Lưu vào Ảnh".', { error: true });
  });
}

async function copyCurrentUrlForSafari() {
  const url = typeof location !== 'undefined' ? location.href : '';
  if (!url) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showDownloadToast('✓ Đã sao chép liên kết! Hãy mở Safari và dán vào thanh địa chỉ.', { busy: false });
  } catch (_) {
    showDownloadToast('Hãy sao chép địa chỉ trang trên thanh tiêu đề rồi mở bằng Safari.', { error: true });
  }
}

// Pre-warm current Lightbox photo on iOS/iPadOS so File is already prepared BEFORE user taps the Save button.
function scheduleIOSLightboxPreload(item) {
  clearTimeout(driveDownloadState.lightboxPreloadTimer);
  if (driveDownloadState.lightboxPreloadAbort) {
    try { driveDownloadState.lightboxPreloadAbort.abort(); } catch (_) {}
    driveDownloadState.lightboxPreloadAbort = null;
  }
  if (!item) return;
  const [id, name, kind] = item;
  if (!(kind === 0 || isKnownImageFileName(name))) return;
  const platform = getDownloadPlatformInfo();
  if (!platform.isIOS) return;
  if (getCachedPreparedImage(id)) return;

  driveDownloadState.lightboxPreloadTimer = setTimeout(() => {
    if (typeof document !== 'undefined' && document.getElementById('drive-lightbox')?.classList.contains('hidden')) return;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    driveDownloadState.lightboxPreloadAbort = controller;
    fetchDriveOriginalImage(id, name, { signal: controller?.signal })
      .then(() => {
        if (typeof lightboxList !== 'undefined' && lightboxList[lightboxIndex]?.[0] === id) {
          syncLightboxDownloadButton();
        }
      })
      .catch(() => {});
  }, 180);
}

function warmCardDownloadOnIOS(button) {
  if (!button) return;
  const platform = getDownloadPlatformInfo();
  if (!platform.isIOS) return;
  const id = button.dataset?.fileId;
  const name = button.dataset?.fileName || 'anh.jpg';
  if (!id || getCachedPreparedImage(id) || driveDownloadState.preparingPromises.has(id)) return;
  fetchDriveOriginalImage(id, name).catch(() => {});
}

// Synchronous iOS Share fast-path when File is already prepared in cache: zero awaits -> 100% transient user activation!
function tryImmediateCachedIOSShare(item) {
  if (!item) return false;
  const [id, name, kind] = item;
  if (!(kind === 0 || isKnownImageFileName(name))) return false;
  const platform = getDownloadPlatformInfo();
  if (!platform.isIOS) return false;

  const cached = getCachedPreparedImage(id);
  if (!cached?.file) return false;

  if (platform.isInApp || !canWebShareFiles([cached.file])) {
    openImageSaveHelperModal([cached], {
      platform,
      reason: platform.isInApp ? 'cached-in-app' : 'cached-no-web-share',
    });
    return true;
  }

  logDownloadDebug('sync-cached-web-share', { fileId: id, fileName: cached.fileName, size: cached.file.size });
  navigator.share({ files: [cached.file] }).then(() => {
    logDownloadDebug('sync-cached-web-share-success', { fileId: id, fileName: cached.fileName });
    showDownloadToast(`✓ Đã mở menu Lưu ảnh: ${cached.fileName}`, { busy: false });
  }).catch(err => {
    if (err?.name === 'AbortError') {
      logDownloadDebug('sync-cached-web-share-cancelled', { fileId: id });
      return;
    }
    logDownloadDebug('sync-cached-web-share-fallback', { fileId: id, name: err?.name, message: err?.message }, true);
    openImageSaveHelperModal([cached], { platform, reason: 'share-rejected' });
  });
  return true;
}

function updateCardDownloadButtonState(fileId, busy) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`.card-download-btn[data-file-id="${CSS.escape ? CSS.escape(fileId) : fileId}"]`).forEach(btn => {
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
  });
  if (typeof lightboxList !== 'undefined' && lightboxList[lightboxIndex]?.[0] === fileId) {
    syncLightboxDownloadButton(busy);
  }
}

function syncLightboxDownloadButton(busy = driveDownloadState.busyIds.has(lightboxList[lightboxIndex]?.[0])) {
  if (typeof document === 'undefined') return;
  const link = document.getElementById('lb-download-link');
  const textEl = document.getElementById('lb-download-text');
  const item = typeof lightboxList !== 'undefined' ? lightboxList[lightboxIndex] : null;
  if (!link || !item) return;
  const [id, name, kind] = item;
  const isImage = kind === 0 || isKnownImageFileName(name);
  const isNef = isNefFileName(name);
  const platform = getDownloadPlatformInfo();
  const isReadyCached = isImage && Boolean(getCachedPreparedImage(id));

  link.dataset.busy = busy ? 'true' : 'false';
  if (textEl) {
    textEl.textContent = busy
      ? (isNef ? 'Đang chuyển JPG…' : 'Đang chuẩn bị…')
      : kind === 1
        ? 'Tải video'
        : platform.isIOS && isImage
          ? (isReadyCached ? 'Lưu vào Ảnh ✓' : 'Lưu vào Ảnh')
          : isNef
            ? 'Tải JPG gốc'
            : 'Tải ảnh gốc';
  }
  link.title = isNef
    ? 'Tự động chuyển ảnh NEF sang JPG chất lượng chuẩn gốc và lưu về máy (Phím D)'
    : isImage
      ? (platform.isIOS ? 'Lưu ảnh JPEG chất lượng gốc vào ứng dụng Ảnh (Photos)' : 'Tải ảnh JPEG độ phân giải gốc về máy (Phím D)')
      : 'Tải tệp gốc về máy';

  const lb = document.getElementById('drive-lightbox');
  if (isImage && lb && !lb.classList.contains('hidden') && !busy && !isReadyCached) {
    scheduleIOSLightboxPreload(item);
  }
}

async function downloadDriveMediaItem(item, options = {}) {
  if (!item) return false;
  const [id, name, kind] = item;
  const isImage = kind === 0 || isKnownImageFileName(name);
  const isNef = isNefFileName(name);

  // Videos and non-image documents use Google Drive's native file download.
  if (!isImage) {
    window.open(getDriveDownloadUrl(id), '_blank', 'noopener');
    return true;
  }

  const gestureStartedAt = options.gestureStartedAt || Date.now();
  const platform = getDownloadPlatformInfo();

  if (driveDownloadState.busyIds.has(id) && !options.batch) return false;
  driveDownloadState.busyIds.add(id);
  updateCardDownloadButtonState(id, true);

  const targetName = normalizeJpegFileName(name);
  logDownloadDebug('download-start', {
    fileId: id,
    originalName: name,
    targetName,
    platform: platform.os,
    inAppName: platform.inAppName,
    batch: Boolean(options.batch),
  });

  if (!options.silent) {
    showDownloadToast(
      isNef
        ? `Đang chuyển NEF sang JPG chuẩn gốc: ${targetName}…`
        : platform.isIOS
          ? `Đang chuẩn bị ảnh JPG gốc: ${targetName}…`
          : `Đang tải ảnh JPG gốc: ${targetName}…`,
      { busy: true }
    );
  }

  try {
    const result = await fetchDriveOriginalImage(id, name, { signal: options.signal });
    if (options.prepareOnly) return result;

    // iOS / iPadOS path: prioritize Web Share API ({ files }) -> 1-tap Ready Sheet -> Direct JPEG Long-Press Fallback.
    if (platform.isIOS) {
      const canShare = canWebShareFiles([result.file]);
      const gestureAlive = hasActiveUserGesture(gestureStartedAt);
      logDownloadDebug('ios-delivery-check', {
        fileId: id,
        fileName: result.fileName,
        size: result.file.size,
        canShare,
        gestureAlive,
        isInApp: platform.isInApp,
        inAppName: platform.inAppName,
      });

      if (canShare && !platform.isInApp && gestureAlive) {
        try {
          await navigator.share({ files: [result.file] });
          if (!options.silent) {
            showDownloadToast(`✓ Đã mở lưu ${result.fileName} — chọn "Lưu hình ảnh" để lưu vào Ảnh!`, { busy: false });
          }
          logDownloadDebug('ios-async-web-share-success', { fileId: id, fileName: result.fileName });
          return true;
        } catch (shareErr) {
          if (shareErr?.name === 'AbortError') {
            if (!options.silent) document.getElementById('download-toast')?.classList.add('hidden');
            logDownloadDebug('ios-async-web-share-cancelled', { fileId: id });
            return true;
          }
          logDownloadDebug('ios-async-web-share-expired-or-blocked', {
            fileId: id,
            errName: shareErr?.name,
            errMessage: shareErr?.message || String(shareErr),
          });
        }
      }

      // Transient user activation expired during download, or in-app WebView (Zalo/Messenger/FB), or Web Share unavailable:
      // File is now 100% prepared in RAM -> open Save Sheet so user taps once with fresh activation or long-presses JPEG!
      if (!options.silent) document.getElementById('download-toast')?.classList.add('hidden');
      openImageSaveHelperModal([result], {
        platform,
        reason: platform.isInApp ? 'ios-in-app' : canShare ? 'ios-ready-for-gesture' : 'ios-direct-jpeg-fallback',
      });
      return true;
    }

    // Android & Desktop (Windows / macOS / Linux): maintain Blob URL + <a download> with delayed revokeObjectURL.
    triggerBrowserBlobDownload(result.file, result.fileName);
    if (!options.silent) {
      if (platform.isInApp) {
        showDownloadToast(`✓ Đã gửi tải ${result.fileName}. Nếu ${platform.inAppName} chặn tải, bấm nút bên cạnh:`, {
          busy: false,
          actionLabel: 'Mở lưu ảnh',
          onAction: () => openImageSaveHelperModal([result], { platform, reason: 'android-in-app-helper' }),
        });
      } else {
        showDownloadToast(
          isNef ? `✓ Đã chuyển & tải về ${result.fileName} (JPG chuẩn gốc)` : `✓ Đã tải về ${result.fileName}`,
          { busy: false }
        );
      }
    }
    return true;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    logDownloadDebug('download-error', {
      fileId: id,
      originalName: name,
      platform: platform.os,
      inAppName: platform.inAppName,
      error: error?.message || String(error),
    }, true);

    // Direct JPEG URL fallback when fetch CORS is blocked by an extension/webview (never use uc?export=download for HEIC/NEF on mobile!).
    if (!isNef && !options.batch && (platform.isIOS || platform.isInApp)) {
      openImageSaveHelperModal([{
        fileId: id,
        originalName: name,
        fileName: targetName,
        file: null,
        directJpegUrl: getDriveOriginalImageUrl(id),
      }], { platform, reason: 'cors-fallback-direct-jpeg' });
      showDownloadToast('Mạng chặn tải nền — hãy nhấn giữ vào ảnh trên màn hình để lưu vào Ảnh.', { error: true });
      return true;
    }

    if (!options.silent) {
      showDownloadToast(error?.message || `Không thể tải ảnh "${targetName}" lúc này. Vui lòng thử lại.`, { error: true });
    }
    return false;
  } finally {
    driveDownloadState.busyIds.delete(id);
    updateCardDownloadButtonState(id, false);
  }
}

function handleCardDownload(event, button) {
  event.preventDefault();
  event.stopPropagation();
  const id = button.dataset.fileId, name = button.dataset.fileName || 'anh.jpg', kind = Number(button.dataset.fileKind || 0);
  if (!id) return;
  const item = [id, name, kind];
  if (tryImmediateCachedIOSShare(item)) return;
  downloadDriveMediaItem(item, { gestureStartedAt: Date.now() });
}

function handleLightboxDownload(event) {
  const item = typeof lightboxList !== 'undefined' ? lightboxList[lightboxIndex] : null;
  if (!item) return;
  const [, name, kind] = item;
  if (kind === 0 || isKnownImageFileName(name)) {
    event.preventDefault();
    if (tryImmediateCachedIOSShare(item)) return;
    downloadDriveMediaItem(item, { gestureStartedAt: Date.now() });
  }
}

/* --- Multi-Select Batch Image Download --- */
function isSelectableImageItem(item) {
  return Boolean(item && (item[2] === 0 || isKnownImageFileName(item[1])));
}

function toggleDriveSelectMode(force) {
  driveDownloadState.selectMode = typeof force === 'boolean' ? force : !driveDownloadState.selectMode;
  if (!driveDownloadState.selectMode) {
    driveDownloadState.selectedIds.clear();
    driveDownloadState.selectedItems.clear();
  }
  syncDriveSelectionUI();
}

function handleExplorerCardActivate(event, idx) {
  const item = activeMediaList[idx];
  if (!item) return;
  if (driveDownloadState.selectMode && isSelectableImageItem(item)) {
    event.preventDefault();
    toggleDriveItemSelection(item);
    return;
  }
  openLightboxFromExplorer(idx);
}

function toggleDriveItemSelection(item) {
  if (!isSelectableImageItem(item)) return;
  const id = item[0];
  if (driveDownloadState.selectedIds.has(id)) {
    driveDownloadState.selectedIds.delete(id);
    driveDownloadState.selectedItems.delete(id);
  } else {
    driveDownloadState.selectedIds.add(id);
    driveDownloadState.selectedItems.set(id, item);
  }
  syncDriveSelectionUI();
}

function selectVisibleDriveImages() {
  const slice = activeMediaList.slice(0, displayedFilesLimit).filter(isSelectableImageItem);
  slice.forEach(item => {
    driveDownloadState.selectedIds.add(item[0]);
    driveDownloadState.selectedItems.set(item[0], item);
  });
  syncDriveSelectionUI();
}

function clearDriveSelection() {
  driveDownloadState.selectedIds.clear();
  driveDownloadState.selectedItems.clear();
  syncDriveSelectionUI();
}

function syncDriveSelectionUI() {
  const toggleBtn = document.getElementById('btn-select-download-mode');
  const bar = document.getElementById('drive-selection-bar');
  const countEl = document.getElementById('drive-selection-count');
  const downloadBtn = document.getElementById('btn-download-selected');
  const grid = document.getElementById('drive-files-grid');
  const active = driveDownloadState.selectMode;
  const count = driveDownloadState.selectedIds.size;
  const platform = getDownloadPlatformInfo();

  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', String(active));
    toggleBtn.className = active
      ? 'px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm transition-all'
      : 'px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all';
    toggleBtn.textContent = active ? `✓ Đang chọn (${count})` : '⬇ Chọn tải nhiều ảnh';
  }
  if (bar) bar.classList.toggle('hidden', !active);
  if (countEl) {
    const convertCount = [...driveDownloadState.selectedItems.values()].filter(it => isConvertibleSourceBadgeName(it[1])).length;
    countEl.textContent = count
      ? `Đã chọn ${count} ảnh${convertCount ? ` (${convertCount} ảnh HEIC/NEF tự chuẩn hóa sang JPG gốc)` : ' (tải chuẩn JPG gốc)'}`
      : 'Chạm vào các ảnh bên dưới để chọn tải về cùng lúc (tất cả lưu dạng JPG chuẩn gốc)';
  }
  if (downloadBtn) {
    downloadBtn.disabled = count === 0 || driveDownloadState.batchRunning;
    downloadBtn.textContent = driveDownloadState.batchRunning
      ? 'Đang chuẩn bị…'
      : count > 0
        ? (platform.isIOS ? `📲 Lưu ${count} ảnh vào Ảnh` : `⬇ Tải ${count} ảnh về máy`)
        : '⬇ Tải ảnh đã chọn';
  }
  if (grid) {
    grid.classList.toggle('is-select-mode', active);
    for (const card of grid.children) {
      const id = card.dataset?.driveFileId;
      if (!id) continue;
      const selected = active && driveDownloadState.selectedIds.has(id);
      card.classList.toggle('is-selected-card', selected);
      const check = card.querySelector('.card-select-badge');
      if (check) {
        check.classList.toggle('hidden', !active);
        check.classList.toggle('is-checked', selected);
        check.textContent = selected ? '✓' : '';
      }
    }
  }
}

function cancelBatchDownload() {
  if (driveDownloadState.batchAbort) driveDownloadState.batchAbort.abort();
}

async function downloadSelectedDriveImages() {
  if (driveDownloadState.batchRunning || !driveDownloadState.selectedItems.size) return;
  const items = [...driveDownloadState.selectedItems.values()];
  const platform = getDownloadPlatformInfo();
  const gestureStartedAt = Date.now();
  const controller = typeof AbortController === 'function' ? new AbortController() : { signal: null, abort() {} };
  driveDownloadState.batchRunning = true;
  driveDownloadState.batchAbort = controller;
  syncDriveSelectionUI();

  // iOS / iPadOS batch flow: prepare all JPEG File objects first, then present 1-tap Share Sheet ("Save N Images" -> Photos).
  if (platform.isIOS) {
    const preparedList = [];
    let failed = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        if (controller.signal?.aborted) break;
        const item = items[i];
        const outName = normalizeJpegFileName(item[1]);
        showDownloadToast(`Đang chuẩn bị ảnh JPG ${i + 1}/${items.length}: ${outName}…`, { busy: true, cancellable: items.length > 1 });
        const prepared = await downloadDriveMediaItem(item, { silent: true, batch: true, prepareOnly: true, signal: controller.signal });
        if (prepared?.file) preparedList.push(prepared);
        else failed++;
      }
      if (controller.signal?.aborted) {
        showDownloadToast(`Đã dừng chuẩn bị ảnh (${preparedList.length}/${items.length}).`, { busy: false });
      } else if (!preparedList.length) {
        showDownloadToast('Không chuẩn bị được ảnh nào. Vui lòng kiểm tra kết nối mạng.', { error: true });
      } else {
        const files = preparedList.map(p => p.file);
        if (canWebShareFiles(files) && !platform.isInApp && hasActiveUserGesture(gestureStartedAt)) {
          try {
            await navigator.share({ files });
            showDownloadToast(`✓ Đã mở lưu ${files.length} ảnh JPG gốc vào Ảnh!`, { busy: false });
            toggleDriveSelectMode(false);
            return;
          } catch (err) {
            if (err?.name === 'AbortError') {
              document.getElementById('download-toast')?.classList.add('hidden');
              return;
            }
          }
        }
        document.getElementById('download-toast')?.classList.add('hidden');
        openImageSaveHelperModal(preparedList, { platform, reason: 'ios-batch-ready' });
        if (failed === 0) toggleDriveSelectMode(false);
      }
    } catch (error) {
      if (controller.signal?.aborted) {
        showDownloadToast('Đã dừng chuẩn bị ảnh hàng loạt.', { busy: false });
      } else {
        showDownloadToast(error?.message || 'Chuẩn bị ảnh hàng loạt bị gián đoạn.', { error: true });
      }
    } finally {
      driveDownloadState.batchRunning = false;
      driveDownloadState.batchAbort = null;
      syncDriveSelectionUI();
    }
    return;
  }

  let done = 0, failed = 0;
  try {
    for (let i = 0; i < items.length; i++) {
      if (controller.signal?.aborted) break;
      const item = items[i];
      const outName = normalizeJpegFileName(item[1]);
      showDownloadToast(`Đang tải ${i + 1}/${items.length}: ${outName}…`, { busy: true, cancellable: items.length > 1 });
      const ok = await downloadDriveMediaItem(item, { silent: true, batch: true, signal: controller.signal });
      if (ok) done++; else failed++;
      // Gentle pacing so Android/Desktop browsers never throttle multiple consecutive downloads.
      if (i + 1 < items.length && !controller.signal?.aborted) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    if (controller.signal?.aborted) {
      showDownloadToast(`Đã dừng tải hàng loạt (đã lưu ${done}/${items.length} ảnh).`, { busy: false });
    } else if (failed > 0) {
      showDownloadToast(`Đã tải ${done}/${items.length} ảnh (${failed} ảnh chưa tải được).`, { error: done === 0 });
    } else {
      showDownloadToast(`✓ Hoàn tất tải ${done} ảnh JPG chất lượng gốc về máy!`, { busy: false });
      toggleDriveSelectMode(false);
    }
  } catch (error) {
    if (controller.signal?.aborted) {
      showDownloadToast(`Đã dừng tải hàng loạt (đã lưu ${done}/${items.length} ảnh).`, { busy: false });
    } else {
      showDownloadToast(error?.message || 'Tải hàng loạt bị gián đoạn.', { error: true });
    }
  } finally {
    driveDownloadState.batchRunning = false;
    driveDownloadState.batchAbort = null;
    syncDriveSelectionUI();
  }
}
