/* Local, incremental face-descriptor index. No face identity or reference image is sent to Drive. */
(() => {
  'use strict';
  const MODEL = 'face-api-0.22.2-tiny68-v1';
  const state = { model: null, db: null, dbOpened: false, reference: null, candidates: [], busy: false,
    stop: false, generation: 0, matches: [], shown: 48, memory: new Map(), cacheUnavailable: false, scope: '', controller: null };
  const el = id => document.getElementById(id);
  const status = message => { el('face-status').textContent = message; };
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  function distance(a, b) {
    if (!a || !b || a.length !== 128 || b.length !== 128) return Infinity;
    let total = 0;
    for (let i = 0; i < 128; i++) {
      if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return Infinity;
      total += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(total);
  }
  function bestDistance(reference, descriptors) {
    let best = Infinity;
    for (const descriptor of descriptors || []) best = Math.min(best, distance(reference, descriptor));
    return best;
  }
  window.FaceSearchMath = { distance, bestDistance };
  async function models() {
    if (location.protocol === 'file:') throw new Error('Trình duyệt không cho tải mô hình từ tệp HTML mở trực tiếp. Nhấp đúp start-local.cmd trong thư mục dự án để mở web qua localhost.');
    if (state.model) return state.model;
    state.model = (async () => {
      status('Đang khởi động bộ tìm khuôn mặt trên thiết bị…');
      if (!window.faceapi) await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = 'assets/face/face-api.min.js';
        const timeout = setTimeout(() => { script.remove(); reject(new Error('Bộ tìm khuôn mặt tải quá lâu. Thử lại khi mạng ổn định.')); }, 45000);
        script.onload = () => { clearTimeout(timeout); resolve(); };
        script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Không tải được bộ tìm khuôn mặt. Hãy tải lại trang.')); };
        document.head.append(script);
      });
      const api = window.faceapi;
      await Promise.all([api.nets.tinyFaceDetector.loadFromUri('assets/face'), api.nets.faceLandmark68TinyNet.loadFromUri('assets/face'), api.nets.faceRecognitionNet.loadFromUri('assets/face')]);
      return api;
    })().catch(error => { state.model = null; throw error; });
    return state.model;
  }
  function scope() { return JSON.stringify([MODEL, driveRoot.rootId, liveState.url]); }
  function key(item) { return JSON.stringify([scope(), item[0], item[3] || '']); }
  async function openDB() {
    if (state.dbOpened) return state.db;
    state.dbOpened = true;
    try {
      state.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('12a1-face-index', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('faces', { keyPath: 'key' });
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Bộ nhớ đang được dùng ở trang khác.'));
        request.onsuccess = () => resolve(request.result);
      });
      state.db.onversionchange = () => { state.db.close(); state.db = null; state.dbOpened = false; };
    } catch (_) { state.cacheUnavailable = true; }
    return state.db;
  }
  async function cacheGet(item) {
    const id = key(item);
    if (state.memory.has(id)) return state.memory.get(id);
    const db = await openDB(); if (!db) return null;
    return new Promise(resolve => {
      const request = db.transaction('faces').objectStore('faces').get(id);
      request.onsuccess = () => {
        const entry = request.result;
        if (!entry || !Array.isArray(entry.descriptors) || !entry.descriptors.every(d => d.length === 128 && d.every(Number.isFinite))) return resolve(null);
        state.memory.set(id, entry); resolve(entry);
      };
      request.onerror = () => resolve(null);
    });
  }
  async function cachePut(item, descriptors) {
    const entry = { key: key(item), scope: scope(), fileId: item[0], modified: item[3] || '', descriptors, indexedAt: Date.now() };
    state.memory.set(entry.key, entry);
    const db = await openDB(); if (!db) return;
    await new Promise(resolve => {
      const tx = db.transaction('faces', 'readwrite'); tx.objectStore('faces').put(entry);
      tx.oncomplete = resolve; tx.onerror = tx.onabort = () => { state.cacheUnavailable = true; resolve(); };
    });
  }
  async function pruneCache(items) {
    const valid = new Set(items.map(key)), current = scope();
    for (const [id, entry] of state.memory) if (entry.scope === current && !valid.has(id)) state.memory.delete(id);
    const db = await openDB(); if (!db) return;
    await new Promise(resolve => {
      const tx = db.transaction('faces', 'readwrite'), store = tx.objectStore('faces');
      const request = store.openCursor();
      request.onsuccess = () => { const cursor = request.result; if (!cursor) return; if (cursor.value.scope === current && !valid.has(cursor.key)) cursor.delete(); cursor.continue(); };
      tx.oncomplete = tx.onerror = tx.onabort = resolve;
    });
  }
  function imageFromURL(url, cors = true, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new Error('Đã dừng quét.'));
      const image = new Image(); if (cors) image.crossOrigin = 'anonymous'; image.decoding = 'async';
      const abort = () => finish(new Error('Đã dừng quét.'));
      const finish = (error) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); image.onload = image.onerror = null; if (error) { image.src = ''; reject(error); } else resolve(image); };
      const timer = setTimeout(() => finish(new Error('Ảnh tải quá lâu hoặc không cho phép đọc.')), 18000);
      signal?.addEventListener('abort', abort, { once: true });
      image.onload = () => finish(); image.onerror = () => finish(new Error('Không đọc được ảnh.'));
      image.src = url;
    });
  }
  function downscale(source) {
    const width = source.naturalWidth || source.width, height = source.naturalHeight || source.height;
    const scale = Math.min(1, 1280 / Math.max(width, height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  async function localCanvas(file) {
    if (!file.type.startsWith('image/')) throw new Error('Chọn một ảnh JPG, PNG hoặc WebP có khuôn mặt nhé.');
    if ('createImageBitmap' in window) {
      try { const bitmap = await createImageBitmap(file, { resizeWidth: 1280, resizeQuality: 'high', imageOrientation: 'from-image' }); const canvas = downscale(bitmap); bitmap.close(); return canvas; } catch (_) {}
    }
    const url = URL.createObjectURL(file);
    try { return downscale(await imageFromURL(url, false)); }
    finally { URL.revokeObjectURL(url); }
  }
  async function driveCanvas(id) {
    const signal = state.controller?.signal;
    try { const image = await imageFromURL(getDriveThumbUrl(id, 960), true, signal); const canvas = downscale(image); image.src = ''; return canvas; }
    catch (_) {
      if (signal?.aborted) throw new Error('Đã dừng quét.');
      if (!liveState.faceThumbnails) throw new Error('Ảnh bị chặn đọc. Cập nhật Apps Script để bật cầu nối ảnh.');
      const result = await driveRequest('faceThumbnail', { id }, false, { signal });
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(result.image || '')) throw new Error('Ảnh xem trước không hợp lệ.');
      const image = await imageFromURL(result.image, false, signal); const canvas = downscale(image); image.src = ''; return canvas;
    }
  }
  async function detect(canvas) {
    const api = await models();
    const results = await api.detectAllFaces(canvas, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: .45 })).withFaceLandmarks(true).withFaceDescriptors();
    return results;
  }
  function setBusy(busy) {
    state.busy = busy; el('face-reference').disabled = busy || location.protocol === 'file:';
    el('face-search-button').disabled = busy || !state.reference;
    el('face-stop-button').hidden = !busy;
    el('face-clear-button').disabled = busy;
    el('face-threshold').disabled = busy;
    el('face-candidates').querySelectorAll('button').forEach(button => { button.disabled = busy; });
  }
  async function selectReference(file) {
    if (!file || state.busy) return;
    const generation = ++state.generation;
    state.reference = null; state.matches = []; state.candidates = [];
    el('face-candidates').replaceChildren(); el('face-results').replaceChildren(); el('face-result-area').hidden = true;
    state.stop = false; setBusy(true);
    let canvas;
    try {
      await models(); if (state.stop) return;
      status('Đang tìm khuôn mặt trong ảnh mẫu…');
      canvas = await localCanvas(file);
      const faces = await detect(canvas);
      if (generation !== state.generation || state.stop) return;
      if (!faces.length) throw new Error('Chưa thấy khuôn mặt đủ rõ. Thử ảnh chính diện, sáng hơn hoặc ảnh JPG/PNG nhé.');
      // Keep the descriptor only; the original photo and tensors are released.
      state.candidates = faces.map(face => Array.from(face.descriptor));
      faces.forEach((face, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
        const crop = document.createElement('canvas'); crop.width = crop.height = 80;
        const box = face.detection.box;
        crop.getContext('2d').drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, 80, 80);
        button.append(crop, document.createTextNode(`Mặt ${index + 1}`));
        button.onclick = () => { state.reference = state.candidates[index]; el('face-candidates').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === index))); state.matches = []; el('face-result-area').hidden = true; status('Đã chọn khuôn mặt. Bấm tìm để quét toàn kho.'); };
        el('face-candidates').append(button);
      });
      state.reference = state.candidates[0];
      status(faces.length > 1 ? `Có ${faces.length} khuôn mặt. Chọn đúng người ở trên rồi bấm tìm.` : 'Đã chọn khuôn mặt. Sẵn sàng tìm trong toàn kho của lớp.');
    } catch (error) { status(error.message); }
    finally { if (canvas) canvas.width = canvas.height = 0; setBusy(false); if (state.stop) status('Đã dừng đọc ảnh mẫu. Bạn có thể chọn lại ảnh.'); }
  }
  function renderMatches() {
    el('face-result-area').hidden = false;
    el('face-results-title').textContent = `${state.matches.length} khoảnh khắc có khuôn mặt tương đồng`;
    const grid = el('face-results');
    const previous = new Map([...grid.children].map(card => [card.dataset.faceId, card]));
    const keep = new Set();
    state.matches.slice(0, state.shown).forEach(({ item, distance: score }, index) => {
      const [id, name, kind, , folder] = item;
      const button = previous.get(id) || document.createElement('button'); button.className = 'memory-card'; button.type = 'button'; button.dataset.faceId = id;
      button.title = `Khoảng cách khuôn mặt: ${score.toFixed(3)} (càng thấp càng giống)`;
      if (!previous.has(id)) {
        const image = document.createElement('img'); image.referrerPolicy = 'no-referrer'; image.onerror = () => recoverDriveImage(image); image.src = getDriveThumbUrl(id, 480); image.alt = name; image.loading = 'lazy'; image.decoding = 'async'; image.width = image.height = 480;
        const label = document.createElement('span'); label.textContent = `${kind === 1 ? '▶ Bìa video · ' : ''}${folder || name}`;
        button.append(image, label);
      }
      button.onclick = () => { lightboxList = state.matches.map(match => match.item); openLightboxAt(index); };
      keep.add(button);
      if (grid.children[index] !== button) grid.insertBefore(button, grid.children[index] || null);
    });
    for (const button of [...grid.children]) if (!keep.has(button)) button.remove();
    el('face-more-button').hidden = state.shown >= state.matches.length;
  }
  async function search() {
    if (!state.reference || state.busy) return;
    state.stop = false; state.matches = []; state.shown = 48; state.scope = scope(); state.controller = new AbortController(); setBusy(true);
    const generation = liveState.generation, threshold = Number(el('face-threshold').value);
    let examined = 0, cached = 0, skipped = 0, total = 0, listingError = '';
    el('face-progress').hidden = false; el('face-progress').value = 0;
    el('face-results').replaceChildren(); el('face-result-area').hidden = true;
    try {
      status('Đang đọc danh sách toàn bộ thư mục trong kho lớp…');
      try {
        await new Promise((resolve, reject) => {
          const signal = state.controller.signal;
          const abort = () => reject(new Error('Đã dừng quét khuôn mặt. Chỉ mục trước đó được giữ lại.'));
          signal.addEventListener('abort', abort, { once: true });
          scanDriveTree().then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
        });
      } catch (error) { if (state.stop) { status(error.message); return; } listingError = error.message; }
      if (generation !== liveState.generation || state.scope !== scope()) throw new Error('Kết nối Drive đã thay đổi. Bấm tìm lại trong kho hiện tại.');
      const unique = new Map(collectAllFilesUnderFolder(ROOT_VIRTUAL_NODE).filter(item => item[2] !== 2).map(item => [item[0], item]));
      const items = [...unique.values()]; total = items.length;
      el('face-progress').max = Math.max(1, total);
      await pruneCache(items);
      for (const item of items) {
        if (state.stop) break;
        if (generation !== liveState.generation || state.scope !== scope()) throw new Error('Kết nối Drive đã thay đổi. Bấm tìm lại trong kho hiện tại.');
        // Give uploads priority and yield regularly to keep scrolling and controls responsive.
        while (document.hidden && !state.stop) { status('Đang tạm nghỉ khi bạn ở trang khác. Quay lại để tiếp tục.'); await delay(400); }
        if (state.stop) break;
        let entry = await cacheGet(item);
        const wasCached = Boolean(entry);
        if (entry) cached++;
        else {
          let canvas;
          try {
            canvas = await driveCanvas(item[0]);
            if (state.stop) break;
            if (generation !== liveState.generation || state.scope !== scope()) throw new Error('Kết nối Drive đã thay đổi.');
            const faces = await detect(canvas); entry = { descriptors: faces.map(face => Array.from(face.descriptor)) };
            if (generation !== liveState.generation || state.scope !== scope()) throw new Error('Kết nối Drive đã thay đổi.');
            await cachePut(item, entry.descriptors);
          }
          catch (_) { skipped++; }
          finally { if (canvas) canvas.width = canvas.height = 0; }
        }
        if (state.stop) break;
        if (generation !== liveState.generation || state.scope !== scope()) throw new Error('Kết nối Drive đã thay đổi. Bấm tìm lại.');
        if (entry) { const score = bestDistance(state.reference, entry.descriptors); if (score <= threshold) state.matches.push({ item, distance: score }); }
        examined++; el('face-progress').value = examined;
        status(`Đã xét ${examined}/${total} ảnh và bìa video · ${cached} từ chỉ mục · ${skipped} chưa đọc được · ${state.matches.length} gợi ý.`);
        if (examined % 12 === 0) { state.matches.sort((a, b) => a.distance - b.distance); renderMatches(); }
        if (!wasCached || examined % 24 === 0) await delay(liveState.uploading ? 100 : wasCached ? 0 : 16);
      }
      state.matches.sort((a, b) => a.distance - b.distance); renderMatches();
      status(`${state.stop ? 'Đã dừng' : 'Đã tìm'}: ${examined}/${total} ảnh và bìa video · ${cached} dùng lại chỉ mục · ${state.matches.length} gợi ý.${skipped ? ` ${skipped} tệp chưa đọc được; lần tìm sau sẽ thử lại.${!liveState.faceThumbnails ? ' Cập nhật Apps Script để bật cầu nối ảnh khi bị chặn quyền đọc.' : ''}` : ''}${listingError ? ' Chưa đọc đủ danh sách Drive: ' + listingError : ''}${state.cacheUnavailable ? ' Không lưu được bộ nhớ máy; chỉ mục chỉ dùng trong lần mở trang này.' : ''}`);
    } catch (error) { state.matches = []; el('face-result-area').hidden = true; status(error.message); }
    finally { state.controller = null; setBusy(false); }
  }
  el('face-reference').addEventListener('change', event => { selectReference(event.target.files[0]); event.target.value = ''; });
  const zone = el('face-dropzone');
  ['dragenter', 'dragover'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add('drag-over'); }));
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('drag-over'); selectReference(event.dataTransfer.files[0]); });
  el('face-search-button').onclick = search;
  el('face-stop-button').onclick = () => { state.stop = true; state.controller?.abort(); status('Đang dừng sau ảnh hiện tại. Chỉ mục đã có được giữ lại.'); };
  el('face-more-button').onclick = () => { state.shown += 48; renderMatches(); };
  el('face-clear-button').onclick = async () => {
    if (state.busy) return;
    setBusy(true);
    try {
      const db = await openDB();
      if (db) await new Promise((resolve, reject) => { const tx = db.transaction('faces', 'readwrite'); tx.objectStore('faces').clear(); tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error('Không xóa được chỉ mục.')); });
      state.memory.clear(); state.matches = []; state.reference = null; state.candidates = [];
      el('face-candidates').replaceChildren(); el('face-results').replaceChildren(); el('face-result-area').hidden = true; el('face-progress').hidden = true;
      status('Đã xóa ảnh mẫu và toàn bộ chỉ mục khuôn mặt trên thiết bị này.');
    } catch (error) { status(error.message); }
    finally { setBusy(false); }
  };
  if (location.protocol === 'file:') {
    el('face-reference').disabled = true;
    zone.setAttribute('aria-disabled', 'true');
    const help = document.createElement('div'); help.className = 'face-local-help'; help.setAttribute('role', 'note');
    help.innerHTML = '<strong>Mở web qua localhost để tìm khuôn mặt</strong><p>Nhấp đúp <code>start-local.cmd</code> trong thư mục dự án. Trang web sẽ được mở tự động trong trình duyệt. Hoặc chạy <code>python server.py --open</code> từ Terminal.</p>';
    zone.before(help);
    status('Trang đang mở bằng file:// nên trình duyệt chặn đọc mô hình. Mở lại bằng start-local.cmd rồi chọn ảnh nhé.');
  }
})();
