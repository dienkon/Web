/* A profile appears immediately; the archive and shared details load independently. */
const memberState = { id: null, request: 0, profile: {}, limit: 24, editing: false, trigger: null };
const profileFields = { nickname: ['Tên thân thương', 60], birthday: ['Sinh nhật', 40], role: ['Vai trò trong lớp', 80], hobbies: ['Sở thích', 240], quote: ['Lời nhắn gửi cả nhà', 500] };
function profileCacheKey(id) { return '12a1-profile:' + JSON.stringify([driveRoot.rootId, liveState.url, id]); }
function profileStatus(message) { document.getElementById('profile-gallery-status').textContent = message; }
function renderMemberDetails() {
  const p = memberState.profile;
  const restoreFocus = document.activeElement?.id === 'profile-edit';
  const facts = [['Lớp', '12A1 · Nhà Có Nhau'], ...Object.entries(profileFields).filter(([key]) => key !== 'quote').map(([key, [label]]) => [label, p[key] || 'Chưa chia sẻ'])];
  document.getElementById('member-profile').innerHTML = `<div class="profile-topline"><h4>Một chút về mình</h4><button type="button" id="profile-edit" class="face-text-link">Bổ sung giới thiệu ✎</button></div><dl class="profile-facts">${facts.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><p class="profile-quote">${escapeHtml(p.quote || 'Chưa có lời nhắn. Để lại vài dòng cho những lần cả nhà ghé thăm nhé.')}</p>`;
  document.getElementById('profile-edit').onclick = editMemberDetails;
  if (restoreFocus) document.getElementById('profile-edit').focus({ preventScroll: true });
}
function editMemberDetails() {
  if (!liveState.supportsProfiles) {
    profileStatus('Cần cập nhật deployment Apps Script để lưu giới thiệu dùng chung. Tên, lớp và kho kỷ niệm vẫn xem được bình thường.');
    return;
  }
  memberState.editing = true;
  const wrap = document.getElementById('member-profile');
  wrap.innerHTML = `<form id="profile-form" class="profile-form">${Object.entries(profileFields).map(([key, [label, max]]) => `<label class="${key === 'quote' || key === 'hobbies' ? 'full-width' : ''}">${label}${key === 'quote' ? `<textarea name="${key}" maxlength="${max}" rows="3">${escapeHtml(memberState.profile[key] || '')}</textarea>` : `<input name="${key}" maxlength="${max}" value="${escapeHtml(memberState.profile[key] || '')}" placeholder="${key === 'birthday' ? 'Ví dụ: 20/11' : 'Tự giới thiệu một chút nhé'}" />`}</label>`).join('')}<p class="profile-note full-width">Thông tin được chia sẻ với mọi người ghé kho lớp. Chỉ điền những gì bạn muốn chia sẻ.</p><div class="face-actions full-width"><button class="primary-action" type="submit">Lưu giới thiệu</button><button class="secondary-action" type="button" id="profile-cancel">Để sau</button></div></form>`;
  document.getElementById('profile-cancel').onclick = () => { memberState.editing = false; renderMemberDetails(); };
  const form = document.getElementById('profile-form');
  form.elements.nickname.focus();
  form.onsubmit = async event => {
    event.preventDefault();
    const id = memberState.id, request = memberState.request, fields = Object.fromEntries(new FormData(form));
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const result = await driveRequest('saveProfile', { id, profile: fields, revision: memberState.profile.revision || 0 }, true);
      storageSet(profileCacheKey(id), JSON.stringify(result.profile));
      if (request !== memberState.request) return;
      memberState.profile = result.profile; memberState.editing = false; renderMemberDetails(); profileStatus('Đã lưu giới thiệu cho cả nhà.');
    } catch (error) { if (request === memberState.request) profileStatus(error.message); }
    finally { button.disabled = false; }
  };
}
function renderMemberGallery() {
  const sf = folderById.get(memberState.id);
  if (!sf || document.getElementById('student-modal').classList.contains('hidden')) return;
  modalMediaList = collectAllFilesUnderFolder(sf).filter(item => item[2] !== 2);
  document.getElementById('modal-stats').textContent = `${sf.ti} ảnh · ${sf.tv} video · Kỷ niệm của một người nhà`;
  const gallery = document.getElementById('modal-gallery');
  const slice = modalMediaList.slice(0, memberState.limit);
  setDriveMarkup(gallery, slice.length ? slice.map(([id, name, kind], i) => `<button type="button" class="memory-card" data-drive-file-id="${id}" data-drive-file-key="${escapeHtml(JSON.stringify([name, kind]))}" onclick="openLightboxFromModal(${i})" aria-label="${escapeHtml(name)}"><img src="${getDriveThumbUrl(id, 480)}" onerror="this.onerror=null;this.src='${getDriveThumbFallbackUrl(id, 480)}'" alt="${escapeHtml(name)}" loading="lazy" decoding="async" width="480" height="480" />${kind === 1 ? '<b class="video-badge">▶ Video</b>' : ''}</button>`).join('') : '<p class="col-span-full profile-note">Góc nhỏ này đang chờ những kỷ niệm đầu tiên. Góp một tấm ảnh cho người nhà nhé!</p>');
  const more = document.getElementById('profile-more');
  more.hidden = modalMediaList.length <= memberState.limit;
  more.onclick = () => { memberState.limit += 24; renderMemberGallery(); };
}
async function loadMemberArchive(node, request) {
  // Bound parallelism, including albums nested below a member's folder.
  let queue = [node.id];
  while (queue.length && request === memberState.request) {
    const batch = queue.splice(0, 2);
    const nodes = await Promise.all(batch.map(id => ensureLiveFolder(id)));
    nodes.forEach(folder => { if (folder) queue.push(...folder.f.map(child => child.id)); });
    if (request === memberState.request) renderMemberGallery();
  }
}
function openMemberProfile(id) {
  const sf = folderById.get(id); if (!sf) return;
  const wasOpen = !document.getElementById('student-modal').classList.contains('hidden');
  const request = ++memberState.request;
  memberState.id = id; memberState.limit = 24; memberState.editing = false;
  if (!wasOpen) memberState.trigger = document.activeElement;
  try { memberState.profile = JSON.parse(storageGet(profileCacheKey(id))) || {}; } catch (_) { memberState.profile = {}; }
  const numbered = /^\d+\./.test(sf.n), name = numbered ? sf.n.replace(/^\d+\.\s*/, '') : sf.n;
  const avatar = document.getElementById('modal-avatar');
  avatar.src = sf.c ? getDriveThumbUrl(sf.c, 320) : getInitialsAvatar(name);
  avatar.alt = name;
  avatar.onerror = () => { avatar.onerror = null; avatar.src = getInitialsAvatar(name); };
  document.getElementById('modal-number').textContent = numbered ? `Người nhà #${parseInt(sf.n, 10)}` : 'Người dẫn đường';
  document.getElementById('modal-role').textContent = numbered ? 'ĐẠI GIA ĐÌNH 12A1' : 'GIÁO VIÊN CHỦ NHIỆM';
  document.getElementById('modal-name').textContent = name;
  document.getElementById('modal-drive-link').href = getDriveFolderUrl(id);
  document.getElementById('modal-open-in-explorer').onclick = () => { closeModal(); switchDriveTab('drive'); openFolderInExplorer(id, true); };
  document.getElementById('profile-upload').onclick = () => { closeModal(); switchDriveTab('drive'); openFolderInExplorer(id, true); liveState.writable ? document.getElementById('drive-upload-input').click() : openDriveSettings(); };
  renderMemberDetails();
  document.getElementById('student-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  document.getElementById('profile-scroll').scrollTop = 0;
  profileStatus('Đang cập nhật góc kỷ niệm…');
  renderMemberGallery();
  document.getElementById('profile-edit').focus({ preventScroll: true });
  loadMemberArchive(sf, request).then(() => { if (request === memberState.request) profileStatus('Ảnh gốc và video được giữ nguyên trên Google Drive.'); }).catch(error => { if (request === memberState.request) profileStatus('Chưa đọc đủ kho kỷ niệm: ' + error.message); });
  if (liveState.supportsProfiles) driveRequest('profile', { id }).then(result => {
    storageSet(profileCacheKey(id), JSON.stringify(result.profile));
    if (request === memberState.request && !memberState.editing) { memberState.profile = result.profile; renderMemberDetails(); }
  }).catch(error => { if (request === memberState.request) profileStatus('Chưa cập nhật được giới thiệu: ' + error.message); });
}
const originalCloseMemberModal = closeModal;
closeModal = function () {
  const open = !document.getElementById('student-modal').classList.contains('hidden');
  memberState.request++; memberState.id = null;
  originalCloseMemberModal();
  if (open) memberState.trigger?.focus({ preventScroll: true });
};
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || document.getElementById('student-modal').classList.contains('hidden') || !document.getElementById('drive-lightbox').classList.contains('hidden')) return;
  const focusable = [...document.getElementById('student-modal').querySelectorAll('a[href], button:not([disabled]), input, textarea')].filter(el => el.getClientRects().length);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
