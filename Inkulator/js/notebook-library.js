(function(root){
  'use strict';
  let path='',query='',host,folders=[];
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
  async function remove(ids){
    if(!ids.length)return;
    if(!window.confirm('Dọn '+ids.length+' sổ tay? Các sổ trên máy sẽ được chuyển vào Thung rac trong thư viện.'))return;
    if(root.InkulatorDesktop?.documents)await DocumentFiles.forget(ids);
    for(const id of ids){const i=Store.state.notebooks.findIndex(n=>n.id===id);if(i>=0)Store.deleteBook(i);}
    await root.DocumentFiles?.flush();render();App.toast('Đã dọn '+ids.length+' sổ tay.');
  }
  function render(){
    if(!host?.isConnected)return;const dirs=allFolders(),books=Store.state.notebooks;
    host.querySelector('.library-tree').innerHTML='<button type="button" data-folder="" class="'+(!path?'active':'')+'">▤ Tất cả tài liệu</button>'+dirs.map(p=>'<button type="button" data-folder="'+esc(p)+'" class="'+(p===path?'active':'')+'" style="padding-left:'+(14+p.split('/').length*12)+'px">▱ '+esc(p.split('/').at(-1))+'</button>').join('');
    const crumbs=host.querySelector('.library-breadcrumb');crumbs.innerHTML='<button type="button" data-folder="">Tài liệu</button>'+path.split('/').filter(Boolean).map((p,i)=>'<span>›</span><button type="button" data-folder="'+esc(path.split('/').slice(0,i+1).join('/'))+'">'+esc(p)+'</button>').join('');
    host.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>{path=b.dataset.folder;query='';host.querySelector('#notebook-search').value='';render();});
    const grid=host.querySelector('.notebook-grid');grid.replaceChildren();
    const child=dirs.filter(p=>p.startsWith(path?path+'/':'')&&p.split('/').length===(path?path.split('/').length:0)+1);
    for(const p of child){if(query&&!p.toLocaleLowerCase().includes(query))continue;const card=document.createElement('article');card.className='notebook-folder';card.innerHTML='<button type="button" class="folder-open"><span>▱</span><strong>'+esc(p.split('/').at(-1))+'</strong><small>'+books.filter(n=>norm(n.folder)===p||norm(n.folder).startsWith(p+'/')).length+' sổ tay</small></button><button type="button" class="folder-rename" title="Đổi tên thư mục">Đổi tên</button>';
      card.querySelector('.folder-open').onclick=()=>{path=p;render();};card.querySelector('.folder-rename').onclick=()=>edit('Tên thư mục',p.split('/').at(-1),v=>{const parent=p.split('/').slice(0,-1).join('/'),next=norm((parent?parent+'/':'')+name(v));if(next!==p&&dirs.includes(next))throw Error('Thư mục đã tồn tại.');for(const n of books){const f=norm(n.folder);if(f===p||f.startsWith(p+'/')){n.folder=next+f.slice(p.length);n.modified=new Date().toISOString();}}folders=dirs.map(f=>f===p||f.startsWith(p+'/')?next+f.slice(p.length):f);if(path===p||path.startsWith(p+'/'))path=next+path.slice(p.length);changed();});
      card.ondragover=e=>e.preventDefault();card.ondrop=e=>{e.preventDefault();const n=books.find(n=>n.id===e.dataTransfer.getData('application/x-inkulator-book'));if(n){n.folder=p;n.modified=new Date().toISOString();changed();}};grid.append(card);
    }
    for(const n of books){if(query?!((n.title+' '+n.folder).toLocaleLowerCase().includes(query)):norm(n.folder)!==path)continue;
      const card=document.createElement('article');card.className='notebook-card'+(n.id===Store.book().id?' current':'');card.draggable=true;card.ondragstart=e=>e.dataTransfer.setData('application/x-inkulator-book',n.id);
      card.innerHTML='<button type="button" class="notebook-open"><canvas width="240" height="250"></canvas><strong>'+esc(n.title)+'</strong><small>'+n.pages.length+' trang'+(query&&n.folder?' · '+esc(n.folder):'')+'</small></button><div class="notebook-actions"><button type="button" data-do="rename" title="Đổi tên">Tên</button><button type="button" data-do="move" title="Chuyển thư mục">Chuyển</button><button type="button" data-do="delete" title="Xóa sổ tay">Xóa</button></div>';
      const canvas=card.querySelector('canvas'),ctx=canvas.getContext('2d'),p=n.pages[0];ctx.fillStyle='#fff';ctx.fillRect(0,0,240,250);ctx.save();const s=Math.min(220/p.width,235/p.height);ctx.translate((240-p.width*s)/2,6);ctx.scale(s,s);ctx.beginPath();ctx.rect(0,0,p.width,p.height);ctx.clip();for(const o of p.objects.slice(0,100)){if(o.type==='pdf'){if(o.data.preview){const img=new Image();img.onload=()=>{if(canvas.isConnected){ctx.save();ctx.setTransform(s,0,0,s,(240-p.width*s)/2,6);if(o.clip){ctx.beginPath();ctx.rect(o.position.x+o.clip.x,o.position.y+o.clip.y,o.clip.w,o.clip.h);ctx.clip();}ctx.globalCompositeOperation='destination-over';ctx.drawImage(img,o.position.x,o.position.y,o.size.w,o.size.h);ctx.restore();}};img.src=o.data.preview;}continue;}Renderer.drawObject(ctx,o);}ctx.restore();
      card.querySelector('.notebook-open').onclick=()=>{Store.save();Store.switchBook(books.indexOf(n));App.closePanel();document.getElementById('dialog').close('cancel');};
      card.querySelector('[data-do="rename"]').onclick=()=>edit('Tên sổ tay',n.title,v=>{n.title=name(v);n.modified=new Date().toISOString();changed();});
      card.querySelector('[data-do="move"]').onclick=()=>edit('Chuyển đến thư mục',norm(n.folder),v=>{n.folder=v;n.modified=new Date().toISOString();changed();},['',...dirs]);
      card.querySelector('[data-do="delete"]').onclick=()=>remove([n.id]).catch(e=>App.toast(e.message));grid.append(card);
    }
    if(!grid.childElementCount){const empty=document.createElement('p');empty.className='hint';empty.textContent=query?'Không tìm thấy tài liệu.':'Thư mục trống. Tạo thư mục con hoặc sổ tay mới ở đây.';grid.append(empty);}
  }
  async function open(){
    load();path='';query='';
    if(root.InkulatorDesktop?.documents)await DocumentFiles.flush();
    const done=App.dialog('Tài liệu của bạn','<section id="notebook-browser"><div class="notebook-toolbar"><input id="notebook-search" aria-label="Tìm tài liệu" placeholder="Tìm tên sổ tay, thư mục…"><button type="button" id="notebook-new">+ Sổ tay</button><button type="button" id="folder-new">+ Thư mục</button><button type="button" id="notebook-import">Mở tệp…</button><button type="button" id="notebook-clean">Dọn dẹp</button></div><div class="library-editor" hidden></div><div class="notebook-layout"><nav class="library-tree" aria-label="Cây thư mục"></nav><div class="notebook-content"><nav class="library-breadcrumb" aria-label="Đường dẫn"></nav><div class="notebook-grid"></div></div></div></section>','Đóng');
    const d=document.getElementById('dialog');d.classList.add('notebook-dialog');host=d.querySelector('#notebook-browser');
    host.querySelector('#notebook-search').oninput=e=>{query=e.target.value.trim().toLocaleLowerCase();render();};
    host.querySelector('#folder-new').onclick=()=>edit('Tên thư mục mới','',v=>{const p=norm((path?path+'/':'')+name(v));if(allFolders().includes(p))throw Error('Thư mục đã tồn tại.');folders.push(p);remember();render();});
    host.querySelector('#notebook-new').onclick=()=>edit('Tên sổ tay mới','Sổ tay mới',v=>{const n=Store.notebook(name(v));n.folder=path;Store.state.notebooks.push(n);Store.switchBook(Store.state.notebooks.length-1);changed();});
    host.querySelector('#notebook-import').onclick=()=>{d.close('cancel');DocumentFiles.open().catch(e=>App.toast(e.message));};
    host.querySelector('#notebook-clean').onclick=()=>remove(Store.state.notebooks.filter(n=>n.id!==Store.book().id).map(n=>n.id)).catch(e=>App.toast(e.message));
    render();try{return await done;}finally{d.classList.remove('notebook-dialog');}
  }
  root.NotebookLibrary={open,allFolders};
})(window);
