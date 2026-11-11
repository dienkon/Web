/**
 * Cầu nối Drive dùng chung. Xem DRIVE-SETUP.md để triển khai.
 * Chạy setup() rồi Deploy > Web app > Execute as Me > Anyone.
 * OAuth token và URL phiên upload chỉ nằm trên server.
 */
const ROOT_FOLDER_ID = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const CHUNK_BYTES = 8 * 1024 * 1024; // Mỗi request; không giới hạn dung lượng tệp.
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function setup() {
  // Run from the editor: Web Apps cannot present the owner's consent dialog.
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/script.external_request'
  ]);
  const root = allowedFolder(ROOT_FOLDER_ID);
  // Verify external requests and Drive API before reporting setup as complete.
  readFolder(ROOT_FOLDER_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('HISTORY_SHEET_ID')) {
      const book = SpreadsheetApp.create('Kỷ Niệm Thanh Xuân - Lịch sử tải lên');
      book.getSheets()[0].appendRow(['event_json']);
      props.setProperty('HISTORY_SHEET_ID', book.getId());
    }
  } finally { lock.releaseLock(); }
  const sheet = historySheet();
  console.log('Drive: ' + root.getName() + '\nLịch sử: ' + sheet.getParent().getUrl());
}

function doGet(e) {
  return respond(function () {
    const p = (e && e.parameter) || {};
    if (p.action === 'ping') {
      allowedFolder(ROOT_FOLDER_ID);
      historySheet();
      return { ok: true, rootId: ROOT_FOLDER_ID, version: 2, writable: true, chunkBytes: CHUNK_BYTES };
    }
    if (p.action === 'history') return readHistory(p.before);
    if (!p.action || p.action === 'folder') return readFolder(p.id || ROOT_FOLDER_ID, p.pageToken);
    throw new Error('Hành động không hợp lệ.');
  });
}

function doPost(e) {
  return respond(function () {
    const b = JSON.parse(e.postData.contents);
    if (b.action === 'createFolder') return createFolder(b);
    if (b.action === 'uploadStart') return startUpload(b);
    if (b.action === 'uploadChunk') return uploadChunk(b);
    if (b.action === 'uploadStatus') return uploadStatus(b);
    if (b.action === 'uploadFailed') {
      const s = getSession(b.operationId);
      if (s.file) return completedUpload(s);
      updateHistory(s.row, { status: 'interrupted', error: String(b.error || 'Gián đoạn kết nối') });
      return { ok: true };
    }
    throw new Error('Hành động không hợp lệ.');
  });
}

function respond(fn) {
  let data;
  try { data = fn(); } catch (err) { data = { ok: false, error: String(err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function api(url, options) {
  const opts = Object.assign({ muteHttpExceptions: true, followRedirects: false }, options || {});
  opts.headers = Object.assign({ Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, opts.headers || {});
  const res = UrlFetchApp.fetch(url, opts);
  if (res.getResponseCode() >= 400) {
    let message = res.getContentText();
    try { message = JSON.parse(message).error.message; } catch (_) {}
    throw new Error('Google Drive (' + res.getResponseCode() + '): ' + message);
  }
  return res;
}

// Endpoint công khai chỉ được thao tác trong kho của lớp.
function allowedFolder(id) {
  if (!/^[\w-]+$/.test(id)) throw new Error('ID thư mục không hợp lệ.');
  const start = DriveApp.getFolderById(id);
  const pending = [start], seen = {};
  while (pending.length) {
    const folder = pending.pop(), fid = folder.getId();
    if (seen[fid] || folder.isTrashed()) continue;
    seen[fid] = true;
    if (fid === ROOT_FOLDER_ID) return start;
    const parents = folder.getParents();
    while (parents.hasNext()) pending.push(parents.next());
  }
  throw new Error('Thư mục nằm ngoài kho Drive của lớp hoặc đã bị xóa.');
}

function readFolder(id, pageToken) {
  const folder = allowedFolder(id);
  const query = "'" + id + "' in parents and trashed = false";
  let url = DRIVE_API + '?q=' + encodeURIComponent(query) + '&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true' +
    '&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime,size)');
  if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
  const data = JSON.parse(api(url).getContentText());
  const children = [], files = [];
  (data.files || []).forEach(function (f) {
    if (f.mimeType === 'application/vnd.google-apps.folder') children.push({ id: f.id, n: f.name, m: f.modifiedTime });
    else files.push([f.id, f.name, fileKind(f.mimeType), f.modifiedTime]);
  });
  return { ok: true, folder: { id: id, n: folder.getName(), m: folder.getLastUpdated().toISOString(), f: children, items: files },
    nextPageToken: data.nextPageToken || null, syncedAt: new Date().toISOString() };
}

function fileKind(mime) {
  return mime.indexOf('video/') === 0 ? 1 : mime.indexOf('image/') === 0 ? 0 : 2;
}

function operationId(value) {
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(value || '')) throw new Error('Mã thao tác không hợp lệ.');
  return value;
}

function createFolder(b) {
  const parent = allowedFolder(b.parentId || ROOT_FOLDER_ID);
  const name = String(b.folderName || '').trim();
  if (!name) throw new Error('Tên thư mục không được để trống.');
  const op = operationId(b.operationId), lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties(), saved = props.getProperty('folder_' + op);
    if (saved) {
      const record = JSON.parse(saved);
      if (record.parentId !== parent.getId() || record.folder.n !== name) throw new Error('Thao tác tạo thư mục không khớp.');
      ensureFolderHistory(record, op, parent, b.actor);
      props.setProperty('folder_' + op, JSON.stringify(record));
      return record;
    }
    const result = JSON.parse(api(DRIVE_API + '?supportsAllDrives=true&fields=id,name,modifiedTime', {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.folder', parents: [parent.getId()] })
    }).getContentText());
    const response = { ok: true, parentId: parent.getId(), createdAt: new Date().toISOString(), folder: { id: result.id, n: result.name, m: result.modifiedTime, f: [], items: [] } };
    props.setProperty('folder_' + op, JSON.stringify(response));
    ensureFolderHistory(response, op, parent, b.actor);
    props.setProperty('folder_' + op, JSON.stringify(response));
    return response;
  } finally { lock.releaseLock(); }
}

function ensureFolderHistory(record, op, parent, actor) {
  if (!record.row) record.row = appendHistory({ id: op, action: 'createFolder', name: record.folder.n,
    folderId: parent.getId(), folderName: parent.getName(), actor: String(actor || 'Khách'),
    status: 'success', fileId: record.folder.id, createdAt: record.createdAt });
}

function ensureUploadHistory(s) {
  if (!s.row) {
    s.row = appendHistory(Object.assign({}, s, { action: 'upload', status: s.file ? 'success' : 'uploading', fileId: s.file ? s.file.id : '' }));
    PropertiesService.getScriptProperties().setProperty('upload_' + s.id, JSON.stringify(s));
  }
}

function startUpload(b) {
  const folder = allowedFolder(b.folderId || ROOT_FOLDER_ID), op = operationId(b.operationId);
  if (!b.fileName || !Number.isSafeInteger(b.size) || b.size < 0) throw new Error('Tên hoặc dung lượng tệp không hợp lệ.');
  const props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    cleanupSessions(props);
    const existing = props.getProperty('upload_' + op);
    if (existing) {
      const saved = JSON.parse(existing);
      if (saved.folderId !== folder.getId() || saved.name !== b.fileName || saved.size !== b.size) throw new Error('Phiên tải lên không khớp tệp.');
      ensureUploadHistory(saved);
      if (saved.file) updateHistory(saved.row, { status: 'success', fileId: saved.file.id, error: '' });
      return saved.file ? completedUpload(saved) : { ok: true, operationId: op, chunkBytes: CHUNK_BYTES };
    }
    const s = { id: op, name: String(b.fileName), size: b.size, mimeType: b.mimeType || 'application/octet-stream',
      folderId: folder.getId(), folderName: folder.getName(), createdAt: new Date().toISOString(), actor: String(b.actor || 'Khách') };
    if (b.size === 0) {
      s.file = JSON.parse(api(DRIVE_API + '?supportsAllDrives=true&fields=id,name,mimeType,modifiedTime', {
        method: 'post', contentType: 'application/json', payload: JSON.stringify({ name: s.name, mimeType: s.mimeType, parents: [s.folderId] })
      }).getContentText());
    } else {
      const res = api('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,modifiedTime', {
        method: 'post', contentType: 'application/json', headers: { 'X-Upload-Content-Type': s.mimeType, 'X-Upload-Content-Length': String(b.size) },
        payload: JSON.stringify({ name: s.name, parents: [s.folderId] })
      });
      const h = res.getAllHeaders();
      s.url = h.Location || h.location;
      if (!s.url || !s.url.startsWith('https://www.googleapis.com/')) throw new Error('Drive không cấp phiên tải lên.');
    }
    props.setProperty('upload_' + op, JSON.stringify(s));
    ensureUploadHistory(s);
    return s.file ? completedUpload(s) : { ok: true, operationId: op, chunkBytes: CHUNK_BYTES };
  } finally { lock.releaseLock(); }
}

function cleanupSessions(props) {
  const all = props.getProperties(), now = Date.now();
  Object.keys(all).forEach(function (key) {
    if (!/^(upload_|folder_)/.test(key)) return;
    const s = JSON.parse(all[key]);
    if (s.createdAt && now - Date.parse(s.createdAt) > SESSION_TTL) {
      if (s.row && !s.file) updateHistory(s.row, { status: 'interrupted', error: 'Phiên tải lên đã hết hạn.' });
      props.deleteProperty(key);
    }
  });
}

function getSession(op) {
  const raw = PropertiesService.getScriptProperties().getProperty('upload_' + operationId(op));
  if (!raw) throw new Error('Phiên tải lên đã hết hạn. Hãy chọn tệp và tải lại.');
  const s = JSON.parse(raw);
  allowedFolder(s.folderId);
  return s;
}

function completedUpload(s) {
  return { ok: true, done: true, offset: s.size, file: [s.file.id, s.file.name, fileKind(s.file.mimeType), s.file.modifiedTime], folderId: s.folderId };
}

function uploadResult(s, res) {
  const code = res.getResponseCode();
  if (code === 200 || code === 201) {
    s.file = JSON.parse(res.getContentText());
    delete s.url;
    PropertiesService.getScriptProperties().setProperty('upload_' + s.id, JSON.stringify(s));
    updateHistory(s.row, { status: 'success', fileId: s.file.id, error: '' });
    return completedUpload(s);
  }
  if (code === 308) {
    const h = res.getAllHeaders(), range = h.Range || h.range || '';
    const match = /bytes=0-(\d+)/.exec(String(range));
    return { ok: true, done: false, offset: match ? Number(match[1]) + 1 : 0 };
  }
  throw new Error('Drive trả về trạng thái tải lên không hợp lệ: ' + code);
}

function uploadStatus(b) {
  const s = getSession(b.operationId);
  if (s.file) {
    updateHistory(s.row, { status: 'success', fileId: s.file.id, error: '' });
    return completedUpload(s);
  }
  return uploadResult(s, api(s.url, { method: 'put', headers: { 'Content-Range': 'bytes */' + s.size }, payload: [] }));
}

function uploadChunk(b) {
  const s = getSession(b.operationId);
  if (s.file) return completedUpload(s);
  const bytes = Utilities.base64Decode(b.base64Data || ''), offset = b.offset;
  if (!Number.isSafeInteger(offset) || offset < 0 || !bytes.length || bytes.length > CHUNK_BYTES || offset + bytes.length > s.size ||
      offset % 262144 !== 0 || (offset + bytes.length < s.size && bytes.length % 262144 !== 0)) throw new Error('Phần dữ liệu tải lên không hợp lệ.');
  updateHistory(s.row, { status: 'uploading', error: '' });
  return uploadResult(s, api(s.url, { method: 'put', contentType: s.mimeType,
    headers: { 'Content-Range': 'bytes ' + offset + '-' + (offset + bytes.length - 1) + '/' + s.size }, payload: bytes }));
}

// Sheet ngoài thư mục ảnh. Không xuất URL upload, token hay dữ liệu tệp.
function historySheet() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('HISTORY_SHEET_ID');
  if (!id) throw new Error('Chủ web cần chạy hàm setup() trong Apps Script trước khi triển khai.');
  return SpreadsheetApp.openById(id).getSheets()[0];
}

function appendHistory(event) {
  const sheet = historySheet(), clean = {};
  ['id', 'action', 'name', 'size', 'folderId', 'folderName', 'actor', 'status', 'fileId', 'createdAt', 'error'].forEach(function (key) {
    if (event[key] !== undefined) clean[key] = event[key];
  });
  sheet.appendRow([JSON.stringify(clean)]);
  return sheet.getLastRow();
}

function updateHistory(row, patch) {
  if (!row) return;
  const sheet = historySheet(), cell = sheet.getRange(row, 1);
  const event = JSON.parse(cell.getValue());
  Object.assign(event, patch, { updatedAt: new Date().toISOString() });
  cell.setValue(JSON.stringify(event));
}

function readHistory(before) {
  const sheet = historySheet(), last = sheet.getLastRow();
  const end = before ? Math.min(last, Math.max(1, Number(before) - 1)) : last;
  if (!Number.isSafeInteger(end)) throw new Error('Trang lịch sử không hợp lệ.');
  const start = Math.max(2, end - 49);
  const events = end < 2 ? [] : sheet.getRange(start, 1, end - start + 1, 1).getValues().reverse().map(function (r) { return JSON.parse(r[0]); });
  return { ok: true, events: events, nextBefore: start > 2 ? start : null };
}
