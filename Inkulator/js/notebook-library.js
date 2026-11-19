(function(root){
  'use strict';
  let path='',query='',host,folders=[],observer=null,view='grid',sort='recent',searchTimer=0;
  let previewBusy = false;
  const previewQueue = new Map();
  const folderIcon = '<span class="library-folder-icon" aria-hidden="true"></span>';
  const norm=s=>String(s||'').replace(/\\/g,'/').split('/').filter(Boolean).join('/');
  const esc=s=>App.escape(String(s));
  function load(){try{const value=JSON.parse(localStorage.getItem('inkulator-folders-v1')||'[]');folders=Array.isArray(value)?value.filter(s=>typeof s==='string').map(norm):[];}catch{folders=[];}}
  function allFolders(){const result=new Set(folders);for(const n of Store.state.notebooks)if(n.folder)result.add(norm(n.folder));for(const f of [...result]){const parts=f.split('/');while(parts.length>1){parts.pop();result.add(parts.join('/'));}}return [...result].filter(Boolean).sort((a,b)=>a.localeCompare(b,'vi'));}
  function remember(){folders=allFolders();localStorage.setItem('inkulator-folders-v1',JSON.stringify(folders));}
  function changed(){Store.invalidateSnapshot();Store.state.dirty=true;Store.save();remember();render();}
  function edit(title,value,apply,choices){
    const box=host.querySelector('.library-editor');box.hidden=false;box.replaceChildren();
    const label=document.createElement('label');label.textContent=title;
    const input=document.createElement(choices?'select':'input');input.setAttribute('aria-label',title);input.maxLength=100;
    if(choices)for(const p of choices){const option=document.createElement('option');option.value=p;option.textContent=p||'Tất cả tài liệu';input.append(option);}input.value=value;
    const save=document.createElement('button');save.type='button';save.className='primary';save.textContent='Lưu';save.onclick=async()=>{try{await apply(input.value);box.hidden=true;}catch(e){App.toast(e.message);}};
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Hủy';cancel.onclick=()=>box.hidden=true;
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save.click();}};label.append(input);box.append(label,save,cancel);input.focus();
  }
  function name(value){const s=value.trim();if(!s||/[\\/<>:"|?*]/.test(s)||s==='.'||s==='..')throw Error('Nhập tên không chứa ký tự đường dẫn.');return s;}
  async function preview(canvas, n) {
    const p = n.pages[0], economy = Store.economyMode();
    const objects = p.layers.filter(l => l.visible).flatMap(l => p.objects.filter(o => o.layer === l.id && o.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex)).slice(0, economy ? 80 : 150)
      .map(o => o.type === 'pdf' ? (o.data.preview ? { ...o, type:'image', data:{src:o.data.preview} } : null) : o).filter(Boolean);
    await Renderer.awaitImages({objects}, {pdf:false});
    if (!canvas.isConnected || !previewQueue.has(canvas)) return;
    canvas.width = economy ? 140 : 220;
    canvas.height = economy ? 96 : 148;
    const ctx = canvas.getContext('2d'), scale = Math.min((canvas.width - 12) / p.width, (canvas.height - 12) / p.height);
    ctx.translate((canvas.width - p.width * scale) / 2, (canvas.height - p.height * scale) / 2);
    ctx.scale(scale, scale);
    ctx.beginPath(); ctx.rect(0, 0, p.width, p.height); ctx.clip();
    ctx.fillStyle = p.paper === 'dark' ? '#24342d' : '#fff';
    ctx.fillRect(0, 0, p.width, p.height);
    for (const o of objects) Renderer.drawObject(ctx, o);
  }
  function queuePreview() {
    if (previewBusy || !previewQueue.size) return;
    previewBusy = true;
    const defer = root.requestIdleCallback || (callback => setTimeout(callback, 0));
    defer(async () => {
      const [entry] = previewQueue;
      try { if (entry) await preview(...entry); }
      catch { /* The document remains available when its preview cannot be drawn. */ }
      finally {
        if (entry) previewQueue.delete(entry[0]);
        previewBusy = false;
        queuePreview();
      }
    });
  }
  function navigate(folder) {
    path = folder;
    query = '';
    clearTimeout(searchTimer);
    host.querySelector('#notebook-search').value = '';
    host.querySelector('.notebook-content').scrollTop = 0;
    render();
  }
  async function remove(ids){
    if(!ids.length)return;
    if(!window.confirm('Dọn '+ids.length+' sổ tay? Các sổ trên máy sẽ được chuyển vào Thung rac trong thư viện.'))return;
    if(root.InkulatorDesktop?.documents)await DocumentFiles.forget(ids);
    for(const id of ids){const i=Store.state.notebooks.findIndex(n=>n.id===id);if(i>=0)Store.deleteBook(i);}
    await root.DocumentFiles?.flush();render();App.toast('Đã dọn '+ids.length+' sổ tay.');
  }
  function render(){
    if(!host?.isConnected)return;
    observer?.disconnect(); previewQueue.clear();
    const dirs=allFolders(),books=Store.state.notebooks, byId=new Map(books.map(n=>[n.id,n]));
    const handles = new IntersectionObserver(entries => {
      if (observer !== handles) return;
      for (const entry of entries) {
        const canvas = entry.target, n = byId.get(canvas.dataset.bookId);
        if (entry.isIntersecting && canvas.width === 1 && n) previewQueue.set(canvas, n);
        else if (!entry.isIntersecting) {
          previewQueue.delete(canvas);
          if (Store.economyMode()) canvas.width = canvas.height = 1;
        }
      }
      queuePreview();
    }, {root:host.querySelector('.notebook-content'),rootMargin:'60px'});
    observer = handles;
    host.querySelector('.library-tree').innerHTML='<button type="button" data-folder="" class="'+(!path?'active':'')+'">▤ Tài liệu của tôi</button>'+dirs.map(p=>'<button type="button" data-folder="'+esc(p)+'" class="'+(p===path?'active':'')+'" style="padding-left:'+(12+Math.min(4,p.split('/').length-1)*10)+'px">'+folderIcon+'<span>'+esc(p.split('/').at(-1))+'</span></button>').join('');
    const crumbs=host.querySelector('.library-breadcrumb');crumbs.innerHTML='<button type="button" data-folder="">Tài liệu</button>'+path.split('/').filter(Boolean).map((p,i)=>'<span>›</span><button type="button" data-folder="'+esc(path.split('/').slice(0,i+1).join('/'))+'">'+esc(p)+'</button>').join('');
    host.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>navigate(b.dataset.folder));
    const grid=host.querySelector('.notebook-grid');grid.replaceChildren();
    const folderGrid=host.querySelector('.notebook-folders');folderGrid.replaceChildren();
    for (const group of [grid, folderGrid]) group.classList.toggle('notebook-list', view === 'list');
    host.querySelector('#notebook-view').setAttribute('aria-pressed',String(view === 'list'));
    const child=dirs.filter(p=>query?p.toLocaleLowerCase().includes(query):p.split('/').slice(0,-1).join('/')===path);
    const counts=new Map();
    for (const n of books) {
      const parts=norm(n.folder).split('/').filter(Boolean);
      for(let i=1;i<=parts.length;i++){const p=parts.slice(0,i).join('/');counts.set(p,(counts.get(p)||0)+1);}
    }
    for(const p of child){const card=document.createElement('article');card.className='notebook-folder';card.innerHTML='<button type="button" class="folder-open">'+folderIcon+'<strong>'+esc(p.split('/').at(-1))+'</strong><small>'+(counts.get(p)||0)+' sổ tay</small></button><button type="button" class="folder-rename" title="Đổi tên thư mục" aria-label="Đổi tên thư mục">✎</button>';
      card.querySelector('.folder-open').onclick=()=>navigate(p);card.querySelector('.folder-rename').onclick=()=>edit('Tên thư mục',p.split('/').at(-1),v=>{const parent=p.split('/').slice(0,-1).join('/'),next=norm((parent?parent+'/':'')+name(v));if(next!==p&&dirs.includes(next))throw Error('Thư mục đã tồn tại.');for(const n of books){const f=norm(n.folder);if(f===p||f.startsWith(p+'/')){n.folder=next+f.slice(p.length);n.modified=new Date().toISOString();}}folders=dirs.map(f=>f===p||f.startsWith(p+'/')?next+f.slice(p.length):f);if(path===p||path.startsWith(p+'/'))path=next+path.slice(p.length);changed();});
      card.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-inkulator-book'))e.preventDefault();};card.ondrop=e=>{e.preventDefault();const n=byId.get(e.dataTransfer.getData('application/x-inkulator-book'));if(n){n.folder=p;n.modified=new Date().toISOString();changed();}};folderGrid.append(card);
    }
    const matching=books.filter(n=>query?(n.title+' '+n.folder).toLocaleLowerCase().includes(query):norm(n.folder)===path);
    matching.sort((a,b)=>sort==='name'?a.title.localeCompare(b.title,'vi'):String(b.modified).localeCompare(String(a.modified)));
    for(const n of matching){
      const card=document.createElement('article');card.className='notebook-card'+(n.id===Store.book().id?' current':'');card.draggable=true;card.ondragstart=e=>e.dataTransfer.setData('application/x-inkulator-book',n.id);
      card.innerHTML='<button type="button" class="notebook-open">'+(view==='grid'?'<canvas width="1" height="1" aria-hidden="true"></canvas>':'<img src="assets/color-icons/pages.svg" alt="">')+'<strong>'+esc(n.title)+'</strong><small>'+n.pages.length+' trang'+(query&&n.folder?' · '+esc(n.folder):'')+'</small></button><details class="notebook-actions"><summary title="Thao tác sổ tay" aria-label="Thao tác sổ tay">⋯</summary><div><button type="button" data-do="rename">Đổi tên</button><button type="button" data-do="move">Chuyển thư mục</button><button type="button" data-do="delete">Xóa sổ tay</button></div></details>';
      const canvas=card.querySelector('canvas');if(canvas){canvas.dataset.bookId=n.id;observer.observe(canvas);}
      const actions=card.querySelector('details');
      actions.ontoggle=()=>{
        if(!actions.open)return;
        grid.querySelectorAll('details[open]').forEach(d=>{if(d!==actions)d.open=false;});
        const extent=host.querySelector('.notebook-content').getBoundingClientRect();
        const anchor=actions.getBoundingClientRect(), menu=actions.querySelector('div');
        menu.style.maxHeight='';
        const above=anchor.top-extent.top-4, below=extent.bottom-anchor.bottom-4;
        const opensBelow=above<menu.offsetHeight && below>above;
        actions.classList.toggle('opens-below',opensBelow);
        menu.style.maxHeight=Math.max(36, opensBelow?below:above)+'px';
      };
      actions.addEventListener('click',e=>{if(e.target.matches('button'))actions.open=false;});
      card.querySelector('.notebook-open').onclick=()=>{Store.save();Store.switchBook(books.indexOf(n));App.closePanel();document.getElementById('dialog').close('cancel');};
      card.querySelector('[data-do="rename"]').onclick=()=>edit('Tên sổ tay',n.title,v=>{n.title=name(v);n.modified=new Date().toISOString();changed();});
      card.querySelector('[data-do="move"]').onclick=()=>edit('Chuyển đến thư mục',norm(n.folder),v=>{n.folder=v;n.modified=new Date().toISOString();changed();},['',...dirs]);
      card.querySelector('[data-do="delete"]').onclick=()=>remove([n.id]).catch(e=>App.toast(e.message));grid.append(card);
    }
    if(!grid.childElementCount&&!folderGrid.childElementCount){const empty=document.createElement('p');empty.className='hint';empty.textContent=query?'Không tìm thấy tài liệu.':'Thư mục trống. Tạo thư mục con hoặc sổ tay mới ở đây.';grid.append(empty);}
  }
  async function open(){
    load();path='';query='';
    try { view=localStorage.getItem('inkulator-library-view') === 'list' ? 'list' : 'grid'; } catch {}
    if(root.InkulatorDesktop?.documents)await DocumentFiles.flush();
    const done=App.dialog('Tài liệu của bạn','<section id="notebook-browser"><div class="notebook-toolbar"><input id="notebook-search" type="search" aria-label="Tìm tài liệu" placeholder="Tìm sổ tay, thư mục…"><button type="button" id="notebook-new" class="primary">+ Sổ tay</button><button type="button" id="folder-new">+ Thư mục</button><button type="button" id="notebook-import">Mở tệp…</button><button type="button" id="notebook-clean">Dọn dẹp</button></div><div class="library-editor" hidden></div><div class="notebook-layout"><nav class="library-tree" aria-label="Cây thư mục"></nav><section class="notebook-main"><header><nav class="library-breadcrumb" aria-label="Đường dẫn"></nav><select id="notebook-sort" aria-label="Sắp xếp tài liệu"><option value="recent">Sửa gần đây</option><option value="name">Tên A–Z</option></select><button type="button" id="notebook-view" title="Bật / tắt dạng danh sách" aria-label="Dạng danh sách">☷</button></header><div class="notebook-content"><div class="notebook-grid"></div></div></section></div></section>','Đóng');
    const d=document.getElementById('dialog');d.classList.add('notebook-dialog');host=d.querySelector('#notebook-browser');
    const folderGrid = document.createElement('div');
    folderGrid.className = 'notebook-folders';
    host.querySelector('.notebook-grid').before(folderGrid);
    host.querySelector('#notebook-search').oninput=e=>{query=e.target.value.trim().toLocaleLowerCase();clearTimeout(searchTimer);searchTimer=setTimeout(render,85);};
    const order=host.querySelector('#notebook-sort');order.value=sort;order.onchange=()=>{sort=order.value;render();};
    host.querySelector('#notebook-view').onclick=()=>{
      view=view==='grid'?'list':'grid';
      try{localStorage.setItem('inkulator-library-view',view);}catch{}
      render();
    };
    host.addEventListener('click',e=>{if(!e.target.closest('details'))host.querySelectorAll('details[open]').forEach(d=>d.open=false);});
    host.querySelector('#folder-new').onclick=()=>edit('Tên thư mục mới','',v=>{const p=norm((path?path+'/':'')+name(v));if(allFolders().includes(p))throw Error('Thư mục đã tồn tại.');folders.push(p);remember();render();});
    host.querySelector('#notebook-new').onclick=()=>edit('Tên sổ tay mới','Sổ tay mới',v=>{const n=Store.notebook(name(v));n.folder=path;Store.state.notebooks.push(n);Store.switchBook(Store.state.notebooks.length-1);changed();});
    host.querySelector('#notebook-import').onclick=()=>{d.close('cancel');DocumentFiles.open().catch(e=>App.toast(e.message));};
    host.querySelector('#notebook-clean').onclick=()=>remove(Store.state.notebooks.filter(n=>n.id!==Store.book().id).map(n=>n.id)).catch(e=>App.toast(e.message));
    render();try{return await done;}finally{observer?.disconnect();observer=null;previewQueue.clear();clearTimeout(searchTimer);d.classList.remove('notebook-dialog');}
  }
  root.NotebookLibrary={open,allFolders};
})(window);
