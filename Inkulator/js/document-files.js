(function(root){
  "use strict";
  let pending=Promise.resolve(),ready=false,last=new Map(),status="",folder="",failure=null,previewMemo=new Map(),devicePreferences=null;
  const native=()=>root.InkulatorDesktop?.documents;
  async function envelope(book){
    const data=Store.envelope(book);
    function clean(o){for(const key of Object.keys(o))if(key.startsWith('_'))delete o[key];if(o.type==='group')o.data.children.forEach(clean);}data.notebook.pages.forEach(p=>p.objects.forEach(clean));
    for(const [key,asset] of Object.entries(data.assets||{}))if(asset.inIDB&&!asset.data){const value=await AssetStorage.get(key);if(!value)throw Error("Thiếu dữ liệu PDF trong kho lưu. Chưa ghi đè tài liệu.");asset.data=value;}
    return data;
  }
  function sync(){
    if(!ready||!native())return pending;
    const books=Store.state.notebooks.map(book=>{const {assets,...content}=book;return {...Store.clone(content),assets:Object.fromEntries(Object.entries(assets||{}).map(([id,a])=>[id,{...a}]))};}),snapshot=Store.snapshot();
    status="Đang lưu tệp trên máy…";root.App?.updateSaveState();
    pending=pending.catch(()=>{}).then(async()=>{
      for(const book of books){const data=await envelope(book),raw=JSON.stringify(data),previews={};let stamp,page;
        if(book.id===Store.book().id&&!CanvasEngine.interacting){page=data.notebook.pages.find(p=>p.id===Store.current().id);if(page){stamp=JSON.stringify(page);if(previewMemo.get(page.id)!==stamp){try{const image=await CaptureStudio.pageImage(page);if(image)previews[page.id]=image;}catch(error){console.warn('Page preview:',error.message);}}}}
        if(last.get(book.id)===raw&&!Object.keys(previews).length)continue;
        const result=await native().save({raw,previews});last.set(book.id,raw);if(page&&previews[page.id])previewMemo.set(page.id,stamp);folder=result.folder;
      }
      failure=null;status="Đã lưu tệp trên máy";if(snapshot===Store.snapshot())Store.state.dirty=false;
    }).catch(error=>{failure=error;status="Chưa lưu tệp: "+error.message;root.App?.toast(status,7000);}).finally(()=>root.App?.updateSaveState());
    return pending;
  }
  async function init(){
    if(!native())return;
    InkulatorDesktop.onPrepareClose(async()=>{try{CanvasEngine.finishActive();Store.save();await root.DocumentFiles.flush();InkulatorDesktop.closeReady(true);}catch(error){App.toast(error.message,7000);InkulatorDesktop.closeReady(false);}});
    const list=await native().list();folder=list.folder;
    const legacy=localStorage.getItem('scrble-math-library-v1'),disk=[];
    for(const item of list.items){try{const file=await native().open(item.id);disk.push(Store.validate(JSON.parse(file.raw),true));}catch(error){App.toast('Chưa mở được một tài liệu: '+error.message,7000);}}
    if(disk.length){
      const currentId=Store.book().id,currentPage=Store.state.pageIndex,editing=Store.state.dirty;
      const blank=(!legacy||Store.state.loadError)&&!editing&&Store.state.notebooks.length===1&&Store.book().pages.every(p=>!p.objects.length&&!p.title);
      const merged=new Map((blank?[]:Store.state.notebooks).map(n=>[n.id,n]));
      for(const n of disk){const cached=merged.get(n.id);if(!cached||Date.parse(n.modified)>=Date.parse(cached.modified))merged.set(n.id,n);}
      Store.state.notebooks=[...merged.values()];const chosen=editing?currentId:(devicePreferences?.activeId||currentId);
      Store.state.active=Math.max(0,Store.state.notebooks.findIndex(n=>n.id===chosen));Store.state.pageIndex=Math.max(0,Math.min(editing?currentPage:(devicePreferences?.pageIndex??currentPage),Store.book().pages.length-1));
      if(!editing){Store.clearHistory();Store.state.selection=[];}Store.invalidateSnapshot();PageFlow.fit('page');Store.emit();
    }
    ready=true;await sync();
    if(legacy&&!failure&&(!Store.state.loadError||disk.length)){await native().backupCache(legacy);localStorage.removeItem('scrble-math-library-v1');Store.state.loadError=null;Store.save();}
    const button=document.createElement("button");button.className="icon-button";button.dataset.action="local-documents";button.title="Tài liệu trên máy";button.setAttribute("aria-label",button.title);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16v18H4zM8 7h8M8 11h8M8 15h6"/></svg>';document.querySelector("#file-tools").append(button);
  }
  async function saveAs(){
    if(!native())return Exporter.project(true);
    const raw=JSON.stringify(await envelope(Store.book()));const result=await native().save({raw,saveAs:true});
    if(result){last.set(Store.book().id,raw);status="Đã lưu tệp trên máy";App.updateSaveState();App.toast("Đã lưu: "+result.file);}
  }
  async function open(id){
    if(!native())return document.getElementById("open-file").click();
    await sync();if(failure)throw failure;
    const file=await native().open(id);if(!file)return;
    const book=Store.validate(JSON.parse(file.raw),true);await native().accept(file.token);
    const at=Store.state.notebooks.findIndex(n=>n.id===book.id);
    if(at<0)Store.state.notebooks.push(book);else Store.state.notebooks[at]=book;
    Store.switchBook(at<0?Store.state.notebooks.length-1:at);Store.save();App.closePanel();App.toast("Đã mở tài liệu trên máy.");
  }
  async function panel(){
    const list=await native().list(),host=document.createElement("section");host.className="local-documents";
    const dialog=document.getElementById("dialog");
    const promise=App.dialog("Tài liệu trên máy",'<div id="local-file-list"></div>',"Đóng");
    const target=dialog.querySelector("#local-file-list");
    const info=document.createElement("p");info.className="hint";info.textContent=list.folder;target.append(info);
    for(const [text,action] of [["Mở tệp khác…",()=>open()],["Lưu thành…",saveAs],["Mở thư mục tài liệu",()=>native().folder()]]){const b=document.createElement("button");b.type="button";b.textContent=text;b.onclick=()=>{dialog.close("cancel");Promise.resolve(action()).catch(e=>App.toast(e.message));};target.append(b);}
    for(const item of list.items){const b=document.createElement("button");b.type="button";b.className="document-file-row";b.textContent=item.title;b.title=item.file;b.onclick=()=>{dialog.close("cancel");open(item.id).catch(e=>App.toast(e.message));};target.append(b);}
    const recovery=await native().recovery(Store.book().id);
    if(recovery.length){const label=document.createElement("p");label.textContent="Khôi phục phiên bản của sổ hiện tại";target.append(label);for(const item of recovery){const b=document.createElement("button");b.type="button";b.className="document-file-row";b.textContent=new Date(item.stamp).toLocaleString("vi-VN");b.onclick=async()=>{dialog.close("cancel");try{const file=await native().restore({id:Store.book().id,name:item.name});const book=Store.validate(JSON.parse(file.raw),true);await sync();Store.transaction(()=>{Store.state.notebooks[Store.state.active]=book;Store.state.pageIndex=Math.min(Store.state.pageIndex,book.pages.length-1);});Store.state.selection=[];Store.invalidateSnapshot();PageFlow.fit("page");Store.emit();Store.save();App.toast("Đã khôi phục. Có thể Undo.");}catch(e){App.toast(e.message);}};target.append(b);}}
    return promise;
  }
  async function exportPackage(){await root.DocumentFiles.flush();const result=await native().export(Store.book().id);if(result)App.toast('Đã xuất gói .ink có ảnh/PDF gốc.');}
  async function location(){await root.DocumentFiles.flush();const result=await native().location();if(result){folder=result.folder;last.clear();previewMemo.clear();await sync();App.toast('Đã chuyển thư viện. Bản ở thư mục cũ vẫn được giữ.');}return result;}
  async function settings(){if(!native())return;const list=await native().list(),section=document.createElement('section');section.className='library-settings';section.innerHTML='<h3>Tài liệu trên máy</h3><p class="hint">Mỗi sổ có thư mục riêng; ảnh PNG/JPEG và PDF gốc lưu riêng, nét viết giữ trong gói nén để sửa tiếp.</p><label class="field"><span>Nơi lưu thư viện</span><input id="library-path" readonly></label><button id="library-change-location" class="secondary full">Đổi nơi lưu thư viện…</button><button id="library-open-location" class="secondary full">Mở thư mục tài liệu</button>';document.getElementById('panel-content').append(section);section.querySelector('#library-path').value=list.folder;section.querySelector('#library-change-location').onclick=async()=>{try{const r=await location();if(r)section.querySelector('#library-path').value=r.folder;}catch(e){App.toast(e.message,7000);}};section.querySelector('#library-open-location').onclick=()=>native().folder();}
  function loadPreferences(){
    if(!native())return;
    try{
      const v=JSON.parse(localStorage.getItem('inkulator-device-v2')||'null');if(!v||typeof v.activeId!=='string')return;
      devicePreferences={activeId:v.activeId,pageIndex:Number.isInteger(v.pageIndex)?v.pageIndex:0};
      const settings=Store.state.settings;
      for(const [key,value]of Object.entries(v.settings||{}))if(Object.hasOwn(settings,key)&&value!==null&&typeof value!=='object'&&typeof value===typeof settings[key])settings[key]=value;
      settings.gridSize=Math.max(10,Math.min(100,Number(settings.gridSize)||25));settings.autosave=Math.max(1000,Math.min(300000,Number(settings.autosave)||30000));settings.historyLimit=Math.max(10,Math.min(2000,Number(settings.historyLimit)||500));
      if(!['auto','economy','quality'].includes(settings.performance))settings.performance='auto';
      const presets={};for(const key of (root.InkBrush?.catalog.map(p=>p[0])||['ballpoint','fountain','pencil','marker'])){const p=v.settings?.penPresets?.[key];if(p&&/^#[a-f\d]{6}$/i.test(p.color)&&Number.isFinite(p.width)&&p.width>=.5&&p.width<=25&&Number.isFinite(p.opacity)&&p.opacity>=.1&&p.opacity<=1)presets[key]={color:p.color,width:p.width,opacity:p.opacity};}settings.penPresets=presets;const active=root.InkBrush?.catalog.some(p=>p[0]===settings.activePen)?settings.activePen:"ballpoint";Store.state.pen=active;if(presets[active])Object.assign(Store.state,presets[active]);
    }catch{}
  }
  root.DocumentFiles={init,sync,open,saveAs,panel,settings,exportPackage,location,loadPreferences,get initialized(){return ready;},get status(){return status;},flush:async()=>{if(native()&&!ready)throw Error("Thư viện tệp chưa sẵn sàng. Dùng Lưu bản snapshot để giữ bản sao.");await sync();await pending;if(failure)throw failure;if(native())await native().flush();}};
})(window);
