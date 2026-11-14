/* Live Drive data, resumable uploads and shared operation history. */
const liveConfig = window.DRIVE_CONFIG || {};
const drivePollInterval = Math.max(60000, liveConfig.pollIntervalMs || 10 * 60 * 1000);
const driveTreeInterval = Math.max(drivePollInterval, liveConfig.treeRefreshIntervalMs || 6 * 60 * 60 * 1000);
const liveState = {
  url: storageGet('kn-drive-script-url') || liveConfig.appsScriptUrl || '',
  writable: false, generation: 0, requests: new Map(), scanning: false,
  lastScan: 0, lastRead: 0, lastPoll: 0, tab: 'drive', historyBefore: null, historyBusy: false,
  queue: [], uploading: false, folderTarget: null, historyEvents: [],
  supportsProfiles: false, thumbnailBridge: false, thumbnailAction: 'faceThumbnail',
};

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function storageSet(key, value) {
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (_) {}
}
function driveCacheKey() {
  return 'kn-drive-cache-v1:' + JSON.stringify([driveRoot.rootId, liveState.url]);
}
function restoreDriveCache() {
  try {
    const cached = JSON.parse(storageGet(driveCacheKey()));
    if (!cached || cached.version !== 1 || cached.root.id !== driveRoot.rootId ||
        !Number.isFinite(cached.lastRead) || Date.now() - cached.lastRead > (liveConfig.cacheMaxAgeMs || 10 * 60 * 60 * 1000)) return false;
    const validNode = node => /^[\w-]+$/.test(node.id) && typeof node.n === 'string' &&
      Array.isArray(node.items) && node.items.every(item => Array.isArray(item) && /^[\w-]+$/.test(item[0]) && typeof item[1] === 'string' && [0, 1, 2].includes(item[2])) &&
      Array.isArray(node.f) && node.f.every(validNode);
    if (!validNode(cached.root)) return false;
    Object.assign(ROOT_VIRTUAL_NODE, cached.root);
    liveState.lastRead = cached.lastRead || 0;
    liveState.lastScan = cached.lastScan || 0;
    liveState.lastPoll = cached.lastPoll || 0;
    rebuildDriveIndex();
    return true;
  } catch (_) { return false; }
}
let driveCacheTimer = null;
function saveDriveCache() {
  if (!ROOT_VIRTUAL_NODE.loaded) return;
  const cache = JSON.stringify({ version: 1, savedAt: Date.now(), lastRead: liveState.lastRead,
    lastScan: liveState.lastScan, lastPoll: liveState.lastPoll, root: ROOT_VIRTUAL_NODE },
  (key, value) => key === 'liveSignature' ? undefined : value);
  storageSet(driveCacheKey(), cache);
}
function scheduleDriveCache() {
  if (driveCacheTimer !== null) return;
  const generation = liveState.generation;
  driveCacheTimer = setTimeout(() => {
    driveCacheTimer = null;
    if (generation === liveState.generation) saveDriveCache();
  }, 1500);
}
function ensureLiveFolder(id, generation = liveState.generation) {
  const node = folderById.get(id);
  if (node?.loaded && Date.now() - node.loadedAt < drivePollInterval) return Promise.resolve(node);
  return refreshLiveFolder(id, generation);
}
function newOperationId() {
  return crypto.randomUUID ? crypto.randomUUID() : 'op-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}
function validScriptUrl(value) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(value);
}

async function driveRequest(action, data = {}, write = false, options = {}) {
  const endpoint = options.url === undefined ? liveState.url : options.url;
  if (!endpoint) throw new Error('Chưa cấu hình kết nối Google Drive. Điền appsScriptUrl trong drive-config.js hoặc mở “Kết nối Drive”.');
  const url = new URL(endpoint);
  const init = { cache: 'no-store', redirect: 'follow', credentials: 'omit', signal: AbortSignal.timeout(write ? 120000 : 45000) };
  if (options.signal) init.signal = AbortSignal.any([init.signal, options.signal]);
  if (write) {
    // text/plain avoids an unsupported CORS preflight on Apps Script Web Apps.
    init.method = 'POST';
    init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    init.body = JSON.stringify({ ...data, action });
  } else {
    url.searchParams.set('action', action);
    url.searchParams.set('_', Date.now());
    Object.entries(data).forEach(([key, value]) => { if (value != null) url.searchParams.set(key, value); });
  }
  const response = await fetch(url, init);
  let body;
  try { body = await response.json(); } catch (_) {
    throw new Error('Chưa kết nối được Drive. Mở “Kết nối Drive” để thiết lập; URL phải là Web App cho phép truy cập Anyone.');
  }
  if (!response.ok || !body.ok) throw new Error(body.error || `Không đọc được Drive (HTTP ${response.status}).`);
  return body;
}

function setDriveStatus(message, error = false) {
  const el = document.getElementById('drive-live-status');
  el.textContent = message;
  el.className = `text-sm mb-4 ${error ? 'text-red-600' : 'text-slate-500'}`;
}
function showDriveError(error) {
  setDriveStatus(`${error.message} Dữ liệu đang hiển thị là lần đọc thành công gần nhất.`, true);
}
function setWritable(value) {
  liveState.writable = value;
  ['drive-upload-button', 'drive-create-folder-button'].forEach(id => { document.getElementById(id).disabled = !value; });
}

async function initLiveDrive() {
  const zone = document.getElementById('drive-dropzone');
  const chooseFiles = () => liveState.writable ? document.getElementById('drive-upload-input').click() : openDriveSettings();
  zone.addEventListener('click', chooseFiles);
  zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseFiles(); } });
  ['dragenter', 'dragover'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add('bg-indigo-50'); }));
  zone.addEventListener('dragleave', () => zone.classList.remove('bg-indigo-50'));
  zone.addEventListener('drop', event => {
    event.preventDefault(); zone.classList.remove('bg-indigo-50');
    enqueueDriveFiles(event.dataTransfer.files);
  });
  restoreDriveCache();
  repaintLiveData();
  await connectLiveDrive();
  setInterval(pollLiveDrive, drivePollInterval);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollLiveDrive(); });
  window.addEventListener('online', () => {
    pollLiveDrive();
    liveState.queue.forEach(item => { if (item.status === 'error' && !item.stop) { item.status = 'queued'; item.error = ''; } });
    renderUploadQueue(); runUploadQueue();
  });
  window.addEventListener('beforeunload', event => {
    if (liveState.uploading) { event.preventDefault(); event.returnValue = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveDriveCache(); });
}

let driveConnectionPromise = null;
function connectLiveDrive() {
  driveConnectionPromise = performLiveDriveConnection();
  return driveConnectionPromise;
}
async function performLiveDriveConnection() {
  const generation = ++liveState.generation;
  clearTimeout(driveCacheTimer); driveCacheTimer = null;
  liveState.requests.clear();
  setWritable(false);
  liveState.supportsProfiles = false; liveState.thumbnailBridge = false;
  setDriveStatus(ROOT_VIRTUAL_NODE.loaded ? 'Đang hiển thị dữ liệu Drive đã lưu. Kiểm tra kết nối trong nền…' : 'Đang kết nối và đọc dữ liệu thực tế từ Drive…');
  try {
    const status = await driveRequest('ping');
    if (generation !== liveState.generation) return;
    if (status.rootId !== driveRoot.rootId) throw new Error('Cầu nối được cấu hình cho một thư mục Drive khác.');
    if (liveState.url && status.version !== 2) throw new Error('Cần triển khai phiên bản mới của google-apps-script.gs.');
    setWritable(Boolean(liveState.url && status.writable));
    liveState.supportsProfiles = Boolean(status.profiles);
    // Accept the existing thumbnail API so static hosting needs no bridge redeployment.
    liveState.thumbnailBridge = Boolean(status.thumbnails || status.faceThumbnails);
    liveState.thumbnailAction = status.thumbnails ? 'thumbnail' : 'faceThumbnail';
    await ensureLiveFolder(driveRoot.rootId);
    if (generation !== liveState.generation) return;
    liveState.lastPoll = Date.now();
    showLiveTimestamp();
    if (!liveState.lastScan || Date.now() - liveState.lastScan >= driveTreeInterval) scanDriveTree().catch(showDriveError);
  } catch (error) {
    if (generation === liveState.generation) {
      showDriveError(error);
      document.getElementById('hero-badge-stats').textContent = 'Chưa kết nối Google Drive';
    }
  }
}

async function refreshLiveFolder(id, generation = liveState.generation) {
  const key = `${generation}:${id}`;
  if (liveState.requests.has(key)) return liveState.requests.get(key);
  const request = (async () => {
    let pageToken = null, folder = null;
    do {
      const result = await driveRequest('folder', { id, pageToken });
      if (generation !== liveState.generation) return null;
      if (!result.folder || result.folder.id !== id) throw new Error('Drive trả về dữ liệu thư mục không hợp lệ.');
      if (!folder) folder = { ...result.folder, f: [], items: [] };
      folder.f.push(...(result.folder.f || []));
      folder.items.push(...(result.folder.items || []));
      pageToken = result.nextPageToken || null;
    } while (pageToken);
    if (generation !== liveState.generation) return null;
    // A complete listing replaces the previous listing, including deletions/moves.
    const node = folderById.get(id);
    if (!node) return null; // Parent was removed while this request was in flight.
    const signature = JSON.stringify([folder.n, folder.m, folder.f, folder.items]);
    const changed = signature !== node.liveSignature;
    if (changed) {
      const previous = new Map((node.f || []).map(child => [child.id, child]));
      node.n = folder.n || node.n;
      node.m = folder.m;
      node.items = folder.items;
      node.f = folder.f.map(child => Object.assign(previous.get(child.id) || { ti: 0, tv: 0, to: 0, f: [], items: [] }, child));
      node.f.sort((a, b) => a.n.localeCompare(b.n, 'vi', { numeric: true }));
      node.liveSignature = signature;
      node.loaded = true;
      rebuildDriveIndex();
      if (id === currentFolderId) repaintLiveData();
      else scheduleLiveRepaint();
    }
    node.loadedAt = Date.now();
    liveState.lastRead = Date.now();
    scheduleDriveCache();
    if (!liveState.scanning) showLiveTimestamp();
    return node;
  })();
  liveState.requests.set(key, request);
  try { return await request; } finally { liveState.requests.delete(key); }
}

function rebuildDriveIndex() {
  folderById.clear(); parentById.clear();
  const seen = new Set();
  function count(node) {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    node.ti = node.items.filter(it => it[2] === 0).length;
    node.tv = node.items.filter(it => it[2] === 1).length;
    node.to = node.items.filter(it => it[2] === 2).length;
    node.c = node.items.find(it => it[2] === 0)?.[0] || node.items.find(it => it[2] === 1)?.[0] || '';
    node.f.forEach(child => {
      count(child);
      node.ti += child.ti; node.tv += child.tv; node.to += child.to || 0;
      node.c ||= child.c;
    });
  }
  count(ROOT_VIRTUAL_NODE);
  indexFolderTree(ROOT_VIRTUAL_NODE);
  driveRoot.folders = ROOT_VIRTUAL_NODE.f;
  driveRoot.totalImages = ROOT_VIRTUAL_NODE.ti;
  driveRoot.totalVideos = ROOT_VIRTUAL_NODE.tv;
  if (!folderById.has(currentFolderId)) currentFolderId = driveRoot.rootId;
  folderChung = findSubfolderByName(ROOT_VIRTUAL_NODE, '0. chung');
  folderLuoi = findSubfolderByName(ROOT_VIRTUAL_NODE, 'lười chọn tên');
  folderLop10 = findSubfolderByName(folderChung, 'lớp 10');
  folderLop11 = findSubfolderByName(folderChung, 'lớp 11');
  folderLop12 = findSubfolderByName(folderChung, 'lớp 12');
  folderGVCN = findSubfolderByName(folderChung, 'gvcn');
}

function repaintLiveData() {
  initHeroStats(); initQuickShortcuts(); selectYear(selectedYear);
  renderDriveExplorer(); renderClassMap(selectedStudentFilter);
  if (typeof renderMemberGallery === 'function') renderMemberGallery();
}
let driveRepaintTimer = null;
function scheduleLiveRepaint() {
  if (driveRepaintTimer !== null) return;
  driveRepaintTimer = setTimeout(() => { driveRepaintTimer = null; repaintLiveData(); }, 100);
}
function showLiveTimestamp() {
  const time = new Date(liveState.lastRead).toLocaleTimeString('vi-VN');
  setDriveStatus(`Dữ liệu Drive lúc ${time} · Cập nhật nền mỗi ${Math.round(drivePollInterval / 60000)} phút, toàn kho mỗi ${Math.round(driveTreeInterval / 3600000)} giờ.${liveState.writable ? '' : ' Kết nối Apps Script để bật tải lên và lịch sử.'}`);
}

let driveScanPromise = null;
function scanDriveTree(force = false) {
  if (driveScanPromise) return force ? driveScanPromise.then(() => scanDriveTree(true)) : driveScanPromise;
  driveScanPromise = performDriveTreeScan(force).finally(() => { driveScanPromise = null; });
  return driveScanPromise;
}
async function performDriveTreeScan(force = false) {
  liveState.scanning = true;
  const generation = liveState.generation, queue = [driveRoot.rootId], seen = new Set(), failures = [];
  let read = 0;
  try {
    while (queue.length && generation === liveState.generation) {
      const batch = queue.splice(0, 2).filter(id => !seen.has(id));
      batch.forEach(id => seen.add(id));
      await Promise.all(batch.map(async id => {
        try {
          const node = await (force ? refreshLiveFolder(id, generation) : ensureLiveFolder(id, generation));
          if (node) { read++; queue.unshift(...node.f.map(child => child.id)); }
        } catch (error) { failures.push(error); }
      }));
      if (generation === liveState.generation) setDriveStatus(`Đang đọc toàn bộ Drive: ${read} thư mục. Có thể mở thư mục và tải tệp trong lúc chờ…`);
      await new Promise(resolve => setTimeout(resolve, 16));
    }
    if (generation === liveState.generation) {
      if (failures.length) throw new Error(`${failures.length} thư mục chưa đọc được. ${failures[0].message}`);
      liveState.lastScan = Date.now();
      scheduleDriveCache();
      showLiveTimestamp();
    }
  } finally {
    liveState.scanning = false;
    if (generation !== liveState.generation) setTimeout(() => scanDriveTree().catch(showDriveError), 0);
  }
}

let livePollBusy = false;
async function pollLiveDrive() {
  if (document.hidden || !navigator.onLine || livePollBusy || Date.now() - liveState.lastPoll < drivePollInterval) return;
  livePollBusy = true;
  liveState.lastPoll = Date.now();
  try {
    // Refresh ancestors first so a removed/moved folder cannot remain in navigation.
    const ids = [currentFolderId];
    let parent = parentById.get(currentFolderId);
    while (parent) { ids.unshift(parent); parent = parentById.get(parent); }
    if (!ids.includes(driveRoot.rootId)) ids.unshift(driveRoot.rootId);
    for (const id of ids) if (folderById.has(id)) await refreshLiveFolder(id);
    if (Date.now() - liveState.lastScan >= driveTreeInterval) scanDriveTree().catch(showDriveError);
    if (liveState.tab === 'history') await loadDriveHistory(false, true);
  } catch (error) { showDriveError(error); } finally { livePollBusy = false; }
}
async function refreshDriveNow() {
  const button = document.getElementById('drive-refresh-button');
  button.disabled = true;
  try { await refreshLiveFolder(currentFolderId); await scanDriveTree(true); }
  catch (error) { showDriveError(error); } finally { button.disabled = false; }
}

function openDriveSettings() {
  document.getElementById('drive-script-url').value = liveState.url;
  document.getElementById('drive-settings-error').textContent = '';
  document.getElementById('drive-settings-dialog').showModal();
}
async function saveDriveSettings(event) {
  event.preventDefault();
  const button = document.getElementById('drive-settings-save'), errorEl = document.getElementById('drive-settings-error');
  const url = document.getElementById('drive-script-url').value.trim();
  button.disabled = true;
  try {
    if (liveState.uploading) throw new Error('Chờ hàng đợi tải lên hoàn tất trước khi đổi kết nối.');
    if (!validScriptUrl(url)) throw new Error('URL cần có dạng https://script.google.com/macros/s/…/exec');
    const status = await driveRequest('ping', {}, false, { url });
    if (status.rootId !== driveRoot.rootId || (url && status.version !== 2)) throw new Error('Cần triển khai đúng phiên bản Apps Script và thư mục Drive của lớp.');
    saveDriveCache();
    liveState.url = url; storageSet('kn-drive-script-url', url || null);
    liveState.lastScan = 0; liveState.lastPoll = 0; liveState.lastRead = 0;
    Object.assign(ROOT_VIRTUAL_NODE, { n: 'Drive Lớp Mình (Tất cả)', f: [], items: [], loaded: false, loadedAt: 0, liveSignature: null });
    restoreDriveCache(); rebuildDriveIndex(); repaintLiveData();
    liveState.historyEvents = []; liveState.historyBefore = null;
    liveState.queue = []; renderUploadQueue();
    document.getElementById('drive-settings-dialog').close();
    await connectLiveDrive();
    if (liveState.tab === 'history') loadDriveHistory();
  } catch (error) { errorEl.textContent = error.message; } finally { button.disabled = false; }
}

function switchDriveTab(tab) {
  liveState.tab = tab;
  ['drive', 'history'].forEach(key => {
    const button = document.getElementById(`tab-${key}`), active = key === tab;
    button.setAttribute('aria-selected', String(active));
    button.className = `px-4 py-2 rounded-xl font-bold ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`;
  });
  document.getElementById('drive-browser-panel').hidden = tab !== 'drive';
  document.getElementById('drive-history-panel').hidden = tab !== 'history';
  if (tab === 'history') loadDriveHistory();
}
async function loadDriveHistory(more = false, preserve = false) {
  if (liveState.historyBusy) return;
  liveState.historyBusy = true;
  const status = document.getElementById('drive-history-status'), generation = liveState.generation;
  status.textContent = 'Đang đọc lịch sử từ Drive…';
  try {
    const data = await driveRequest('history', { before: more ? liveState.historyBefore : null });
    if (generation !== liveState.generation) return;
    const list = document.getElementById('drive-history-list'), previous = liveState.historyEvents;
    const combined = more ? [...previous, ...data.events] : preserve ? [...data.events, ...previous] : data.events;
    const seen = new Set();
    liveState.historyEvents = combined.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
    list.replaceChildren();
    const labels = { success: 'Hoàn tất', uploading: 'Đang tải lên', interrupted: 'Gián đoạn / có thể tiếp tục' };
    for (const item of liveState.historyEvents) {
      const row = document.createElement('article'); row.className = 'border rounded-2xl p-4 bg-slate-50';
      row.innerHTML = `<div class="flex flex-wrap justify-between gap-2"><strong class="break-all">${item.action === 'createFolder' ? '📁 Tạo thư mục' : '↑ Tải tệp'}: ${escapeHtml(item.name)}</strong><span class="text-sm ${item.status === 'success' ? 'text-emerald-700' : 'text-amber-700'}">${escapeHtml(labels[item.status] || item.status)}</span></div><p class="text-xs text-slate-500 mt-2">${escapeHtml(item.folderName)} · ${escapeHtml(new Date(item.createdAt).toLocaleString('vi-VN'))}${item.size !== undefined ? ' · ' + formatDriveBytes(item.size) : ''}</p>${item.error ? `<p class="text-sm text-red-600 mt-2">${escapeHtml(item.error)}</p>` : ''}`;
      if (item.fileId && /^[\w-]+$/.test(item.fileId)) {
        const link = document.createElement('a'); link.textContent = 'Mở trên Drive ↗'; link.className = 'inline-block text-sm text-indigo-700 mt-2';
        link.href = item.action === 'createFolder' ? getDriveFolderUrl(item.fileId) : getDriveViewUrl(item.fileId);
        link.target = '_blank'; link.rel = 'noopener'; row.append(link);
      }
      list.append(row);
    }
    if (!preserve || !previous.length) liveState.historyBefore = data.nextBefore;
    document.getElementById('drive-history-more').hidden = !liveState.historyBefore;
    status.textContent = list.children.length ? 'Lịch sử các thao tác qua web, dùng chung trên mọi thiết bị.' : 'Chưa có thao tác tải lên hoặc tạo thư mục qua web.';
  } catch (error) { status.textContent = error.message; } finally { liveState.historyBusy = false; }
}

function openCreateFolderDialog() {
  if (!liveState.writable) return openDriveSettings();
  liveState.folderTarget = { id: currentFolderId, operationId: newOperationId() };
  document.getElementById('drive-folder-parent').textContent = `Trong: ${folderById.get(currentFolderId).n}`;
  document.getElementById('drive-folder-name').value = '';
  document.getElementById('drive-folder-error').textContent = '';
  document.getElementById('drive-folder-dialog').showModal();
}
async function submitDriveFolder(event) {
  event.preventDefault();
  const button = document.getElementById('drive-folder-submit'); button.disabled = true;
  const target = liveState.folderTarget;
  try {
    const name = document.getElementById('drive-folder-name').value.trim();
    if (!name) throw new Error('Nhập tên thư mục.');
    await driveRequest('createFolder', { parentId: target.id, folderName: name, operationId: target.operationId }, true);
    document.getElementById('drive-folder-dialog').close();
    await refreshLiveFolder(target.id);
  } catch (error) { document.getElementById('drive-folder-error').textContent = error.message; }
  finally { button.disabled = false; }
}

function formatDriveBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'], unit = Math.min(4, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** unit).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ${units[unit]}`;
}
function enqueueDriveFiles(files) {
  if (!liveState.writable) return openDriveSettings();
  for (const file of Array.from(files)) {
    // File objects are references; each worker reads one bounded chunk at a time.
    const resumeKey = 'kn-drive-resume:' + JSON.stringify([liveState.url, currentFolderId, file.name, file.size, file.lastModified]);
    if (liveState.queue.some(item => item.resumeKey === resumeKey && item.status !== 'success')) continue;
    liveState.queue.push({ file, name: file.name, size: file.size, folderId: currentFolderId, folderName: folderById.get(currentFolderId).n,
      operationId: storageGet(resumeKey) || newOperationId(), resumeKey, status: 'queued', offset: 0, stop: false });
  }
  renderUploadQueue(); runUploadQueue();
}
function renderUploadQueue() {
  const wrap = document.getElementById('drive-upload-queue');
  const retainedRows = new Set(liveState.queue.map(item => item.row));
  for (const row of [...wrap.children]) if (!retainedRows.has(row)) row.remove();
  liveState.queue.forEach(item => {
    const row = item.row || document.createElement('div'); row.className = 'border rounded-xl p-3 bg-slate-50';
    const file = item.file || item;
    const labels = { queued: 'Đang chờ', uploading: 'Đang tải', success: 'Đã tải lên Drive', error: 'Gián đoạn', paused: 'Đã dừng' };
    const percent = item.status === 'success' ? 100 : file.size ? Math.floor(item.offset / file.size * 100) : 0;
    const signature = JSON.stringify([item.status, item.offset, item.error]);
    if (item.row && item.renderSignature === signature) return;
    item.renderSignature = signature;
    const speed = item.speed ? ` · ${formatDriveBytes(item.speed)}/s` : '';
    row.innerHTML = `<div class="flex gap-2 justify-between"><span class="text-sm font-bold break-all">${escapeHtml(file.name)}</span><span class="text-xs shrink-0">${percent}%</span></div><p class="text-xs text-slate-500 my-1">${escapeHtml(item.folderName)} · ${formatDriveBytes(file.size)} · ${labels[item.status]}${speed}</p><progress class="w-full h-2" max="100" value="${percent}" aria-label="Tiến độ tải lên"></progress>${item.error ? `<p class="text-xs text-red-600 break-all">${escapeHtml(item.error)}</p>` : ''}`;
    if (item.status === 'error' || item.status === 'paused') {
      const button = document.createElement('button'); button.textContent = 'Tiếp tục tải'; button.className = 'text-sm font-bold text-indigo-700 mt-2';
      button.onclick = () => { item.status = 'queued'; item.stop = false; item.error = ''; renderUploadQueue(); runUploadQueue(); };
      row.append(button);
    } else if (item.status !== 'success') {
      const button = document.createElement('button'); button.textContent = 'Dừng'; button.className = 'text-sm text-slate-500 mt-2';
      button.onclick = () => { item.stop = true; if (item.status === 'queued') item.status = 'paused'; renderUploadQueue(); };
      row.append(button);
    }
    if (!item.row) { item.row = row; wrap.append(row); }
  });
}
function chunkBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Không đọc được tệp trên thiết bị.'));
    reader.readAsDataURL(blob);
  });
}
async function runUploadQueue() {
  if (liveState.uploading) return;
  liveState.uploading = true;
  const changedFolders = new Set();
  let refreshTimer = null, refreshPromise = Promise.resolve();
  const flushUploadedFolders = () => {
    const ids = [...changedFolders]; changedFolders.clear();
    refreshPromise = refreshPromise.then(() => Promise.all(ids.map(id => refreshLiveFolder(id).catch(showDriveError))));
    return refreshPromise;
  };
  try {
    // Two files share bandwidth without loading an entire photo or video into RAM.
    await Promise.all(Array.from({ length: navigator.connection?.saveData || navigator.deviceMemory <= 2 ? 1 : 2 }, async () => {
      let item;
      while ((item = liveState.queue.find(entry => entry.status === 'queued' && !entry.stop))) {
        item.status = 'uploading'; renderUploadQueue();
        storageSet(item.resumeKey, item.operationId);
        try {
          let result = await driveRequest('uploadStart', { operationId: item.operationId, folderId: item.folderId,
            fileName: item.file.name, mimeType: item.file.type || 'application/octet-stream', size: item.file.size }, true);
          const chunkBytes = Math.max(262144, Math.floor(Math.min(result.chunkBytes || 8 * 1024 * 1024,
            liveConfig.uploadChunkBytes || 2 * 1024 * 1024) / 262144) * 262144);
          if (!result.done && !Number.isSafeInteger(result.offset)) result = await driveRequest('uploadStatus', { operationId: item.operationId }, true);
          item.offset = result.offset || 0;
          if (!Number.isSafeInteger(item.offset) || item.offset < 0 || item.offset > item.file.size) throw new Error('Drive trả về tiến độ không hợp lệ.');
          let stalled = 0;
          while (!result.done) {
            if (item.stop) throw new Error('Đã dừng. Có thể tiếp tục từ phần đã tải.');
            const offset = item.offset, blob = item.file.slice(offset, Math.min(item.file.size, offset + chunkBytes));
            if (!blob.size) throw new Error('Drive chưa xác nhận hoàn tất tệp. Bấm tiếp tục để kiểm tra lại.');
            const base64Data = await chunkBase64(blob);
            const started = performance.now();
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
              try {
                result = await driveRequest('uploadChunk', { operationId: item.operationId, offset, base64Data }, true);
                lastError = null; break;
              } catch (error) {
                lastError = error;
                if (item.stop) break;
                await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt + Math.random() * 250));
                if (item.stop) break;
                // Check Drive's accepted byte offset before retrying a lost request.
                try {
                  result = await driveRequest('uploadStatus', { operationId: item.operationId }, true);
                  if (result.done || result.offset !== offset) { lastError = null; break; }
                } catch (_) {}
              }
            }
            if (lastError) throw lastError;
            if (!Number.isSafeInteger(result.offset) || result.offset < 0 || result.offset > item.file.size) throw new Error('Drive trả về tiến độ không hợp lệ.');
            stalled = result.offset <= item.offset ? stalled + 1 : 0;
            if (stalled >= 3) throw new Error('Drive chưa nhận thêm dữ liệu. Hãy tiếp tục sau khi kiểm tra kết nối.');
            item.speed = (result.offset - offset) / Math.max(.001, (performance.now() - started) / 1000);
            item.offset = result.offset; renderUploadQueue();
          }
          item.status = 'success'; item.offset = item.file.size; storageSet(item.resumeKey, null);
          changedFolders.add(item.folderId);
          if (!refreshTimer) refreshTimer = setTimeout(() => { refreshTimer = null; flushUploadedFolders(); }, 1500);
          item.file = null; // Release the source File after Drive confirms completion.
        } catch (error) {
          item.status = item.stop ? 'paused' : 'error'; item.error = error.message;
          driveRequest('uploadFailed', { operationId: item.operationId, error: error.message }, true).catch(() => {});
        }
        renderUploadQueue();
      }
    }));
    clearTimeout(refreshTimer); refreshTimer = null;
    await flushUploadedFolders();
  } finally {
    clearTimeout(refreshTimer);
    liveState.uploading = false;
    if (liveState.queue.some(item => item.status === 'queued' && !item.stop)) runUploadQueue();
  }
}
