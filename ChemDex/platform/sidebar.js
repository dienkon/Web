// One navigation for static tools and independently built React applications.
const icons = {
  atom: '<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/>',
  table: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M3 15h18M9 5v15M15 5v15"/>',
  book: '<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6"/>',
  tools: '<path d="M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 4-4-4z"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  flask: '<path d="M9 3h6M10 3v7L4 20q-1 2 2 2h12q3 0 2-2l-6-10V3M7 16h10"/>',
  shield: '<path d="m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6zM8 12l3 3 5-6"/>',
  quiz: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 11h6M9 16h6"/>',
  trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v3a5 5 0 0 0 5 5M17 5h4v3a5 5 0 0 1-5 5M12 15v6M8 22h8"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.atom}</svg>`;
export function mountSidebar() {
  if (typeof document === 'undefined') return;
  if (new URLSearchParams(location.search).get('embed') === '1' || document.getElementById('chemdex-sidebar')) return;
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.classList.add('dark');
  document.documentElement.classList.add('chemdex-shell');
  try { document.documentElement.classList.toggle('sidebar-collapsed', localStorage.getItem('chemdex:sidebar-collapsed') === 'true'); } catch {}
  const path = location.pathname;
  const active = path.includes('cau-truc-3d') ? 'structures' : path.startsWith('/tien-ich') ? 'tools' : path.includes('tai-lieu-so') ? 'library' : path.includes('cong-dong') ? 'community' : path.includes('lab-safety') ? 'safety' : path.includes('lab-2d') ? 'lab2d' : path.includes('lab-3d') ? 'lab3d' : path.includes('on-tap') ? 'study' : path.includes('dau-truong') ? 'arena' : 'elements';
  const link = (href, label, key, symbol, color) => `<a href="${href}" class="cd-nav-link" ${key === active ? 'aria-current="page"' : ''} title="${label}" style="--nav-color:${color}">${icon(symbol)}<span class="cd-nav-label">${label}</span>${key === active ? '<span class="cd-active-dot"></span>' : ''}</a>`;
  const sidebar = document.createElement('aside');
  sidebar.id = 'chemdex-sidebar';
  sidebar.setAttribute('aria-label', 'Điều hướng ChemDex');
  sidebar.innerHTML = `<a class="cd-brand" href="/" aria-label="ChemDex trang chủ"><span class="cd-logo">${icon('atom')}</span><span class="cd-nav-label">Chem<span>Dex</span></span></a><button class="cd-quick-search" id="open-search" aria-label="Tìm kiếm nhanh toàn web" title="Tìm kiếm nhanh (Ctrl+K)">${icon('search')}<span class="cd-nav-label">Tìm nhanh…</span><kbd class="cd-nav-label">Ctrl K</kbd></button><nav aria-label="Điều hướng chính">${link('/', 'Bảng Tuần Hoàn', 'elements', 'table', '#60a5fa')}${link('/trung-tam/tai-lieu-so/', 'Tài Liệu Số', 'library', 'book', '#34d399')}${link('/trung-tam/cong-dong/', 'Cộng đồng', 'community', 'users', '#38bdf8')}${link('/tien-ich/', 'Tiện Ích Học Tập', 'tools', 'tools', '#60a5fa')}${link('/tien-ich/cau-truc-3d/', 'Cấu Trúc 3D', 'structures', 'cube', '#34d399')}<details class="cd-lab-menu" ${['safety', 'lab2d', 'lab3d', 'study'].includes(active) ? 'open' : ''}><summary title="Thí Nghiệm" style="--nav-color:#c084fc">${icon('flask')}<span class="cd-nav-label">Thí Nghiệm</span><span class="cd-chevron">${icon('chevron')}</span></summary><div class="cd-submenu">${link('/lab-safety/', 'An Toàn Phòng Lab', 'safety', 'shield', '#34d399')}${link('/lab-2d/', 'Lab 2D', 'lab2d', 'flask', '#38bdf8')}${link('/lab-3d/', 'Lab 3D', 'lab3d', 'flask', '#22d3ee')}${link('/on-tap/', 'Ôn Tập Trắc Nghiệm', 'study', 'quiz', '#c084fc')}</div></details>${link('/dau-truong/', 'Đấu Trường Hóa Học', 'arena', 'trophy', '#facc15')}</nav><div class="cd-sidebar-bottom"><button id="cd-collapse" aria-label="Thu gọn sidebar" aria-expanded="true" title="Thu gọn sidebar">${icon('chevron')}<span class="cd-nav-label">Thu gọn thanh bên</span></button><div class="cd-user"><span class="cd-avatar">${icon('atom')}</span><span class="cd-nav-label"><strong>Không gian học tập</strong><small>Khám phá cùng ChemDex</small></span></div></div>`;
  document.body.prepend(sidebar);
  const overlay = document.createElement('button');
  overlay.className = 'cd-mobile-overlay'; overlay.setAttribute('aria-label', 'Đóng menu điều hướng'); overlay.tabIndex = -1;
  const mobile = document.createElement('button');
  mobile.className = 'cd-mobile-toggle'; mobile.innerHTML = icon('menu'); mobile.setAttribute('aria-label', 'Mở menu điều hướng'); mobile.setAttribute('aria-expanded', 'false');
  document.body.append(overlay, mobile);
  const toggleMobile = (force) => {
    const open = force ?? !document.documentElement.classList.contains('cd-menu-open');
    document.documentElement.classList.toggle('cd-menu-open', open);
    mobile.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('a').focus(); else mobile.focus();
  };
  mobile.onclick = () => toggleMobile(); overlay.onclick = () => toggleMobile(false);
  window.addEventListener('chemdex:toggle-menu', () => matchMedia('(max-width: 767px)').matches ? toggleMobile() : sidebar.querySelector('#cd-collapse').click());
  const collapse = sidebar.querySelector('#cd-collapse');
  const sync = () => {
    const collapsed = document.documentElement.classList.contains('sidebar-collapsed');
    collapse.setAttribute('aria-expanded', String(!collapsed));
    collapse.setAttribute('aria-label', collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar');
    collapse.title = collapse.getAttribute('aria-label');
    window.dispatchEvent(new Event('resize'));
  };
  collapse.onclick = () => {
    document.documentElement.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem('chemdex:sidebar-collapsed', String(document.documentElement.classList.contains('sidebar-collapsed'))); } catch {}
    sync();
  };
  sidebar.querySelector('summary').onclick = () => {
    if (document.documentElement.classList.contains('sidebar-collapsed')) {
      collapse.click(); sidebar.querySelector('details').open = false;
    }
  };
  const openSearch = async () => {
    const { openSearch } = await import('./search.js');
    openSearch(sidebar.querySelector('#open-search'));
  };
  sidebar.querySelector('#open-search').onclick = openSearch;
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
    if (event.key === 'Escape' && document.documentElement.classList.contains('cd-menu-open')) toggleMobile(false);
    if (event.key === 'Tab' && document.documentElement.classList.contains('cd-menu-open')) {
      const items = [...sidebar.querySelectorAll('a,button,summary')].filter(el => el.getClientRects().length);
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
  });
  sync();
  initInteractiveEffects();
}

function initInteractiveEffects() {
  if (typeof window === 'undefined') return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !finePointer) return;

  const SPOTLIGHT_SELECTOR =
    '.element, .tool-card, .compound-card, .explore-card, .visual-card, .detail-media-block, .suggestion-card, .cd-nav-link, .doc-card, .reader-rec-card';
  let activeEl = null;
  let pendingX = 0;
  let pendingY = 0;
  let rafId = 0;

  const flush = () => {
    rafId = 0;
    if (!activeEl || !activeEl.isConnected) return;
    const rect = activeEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (((pendingX - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((pendingY - rect.top) / rect.height) * 100).toFixed(1);
    activeEl.style.setProperty('--cd-mx', `${x}%`);
    activeEl.style.setProperty('--cd-my', `${y}%`);
  };

  document.addEventListener(
    'pointermove',
    (event) => {
      const target = event.target?.closest?.(SPOTLIGHT_SELECTOR);
      if (!target) {
        activeEl = null;
        return;
      }
      activeEl = target;
      pendingX = event.clientX;
      pendingY = event.clientY;
      if (!rafId) rafId = requestAnimationFrame(flush);
    },
    { passive: true },
  );
}
mountSidebar();
