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
