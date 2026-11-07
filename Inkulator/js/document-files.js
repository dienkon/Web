(function(root){
  "use strict";
  let pending=Promise.resolve(),ready=false,last=new Map(),status="",folder="",failure=null;
  const native=()=>root.InkulatorDesktop?.documents;
  async function envelope(book){
    const data=Store.envelope(book);
    for(const [key,asset] of Object.entries(data.assets||{}))if(asset.inIDB&&!asset.data){const value=await AssetStorage.get(key);if(!value)throw Error("Thiếu dữ liệu PDF trong kho lưu. Chưa ghi đè tài liệu.");asset.data=value;}
    return data;
  }
  function sync(){
    if(!ready||!native())return pending;
    const books=Store.state.notebooks.map(book=>Store.clone(book)),snapshot=Store.snapshot();
    status="Đang lưu tệp trên máy…";root.App?.updateSaveState();
    pending=pending.catch(()=>{}).then(async()=>{
      for(const book of books){const raw=JSON.stringify(await envelope(book));if(last.get(book.id)===raw)continue;const result=await native().save({raw});last.set(book.id,raw);folder=result.folder;}
      failure=null;status="Đã lưu tệp trên máy";if(snapshot===Store.snapshot())Store.state.dirty=false;
    }).catch(error=>{failure=error;status="Chưa lưu tệp: "+error.message;root.App?.toast(status,7000);}).finally(()=>root.App?.updateSaveState());
    return pending;
  }
  async function init(){
    if(!native())return;
    InkulatorDesktop.onPrepareClose(async()=>{try{CanvasEngine.finishActive();Store.save();await root.DocumentFiles.flush();InkulatorDesktop.closeReady(true);}catch(error){App.toast(error.message,7000);InkulatorDesktop.closeReady(false);}});
    const list=await native().list();folder=list.folder;
    const hasLocal=!!localStorage.getItem("scrble-math-library-v1");
    if(!hasLocal&&list.items.length){
      const recovered=[];
      for(const item of list.items){try{const file=await native().open(item.id);recovered.push(Store.validate(JSON.parse(file.raw),true));}catch{}}
      if(recovered.length){Store.state.notebooks=recovered;Store.state.active=0;Store.state.pageIndex=0;Store.clearHistory();Store.invalidateSnapshot();PageFlow.fit("page");Store.emit();}
    }
    ready=true;await sync();
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
  root.DocumentFiles={init,sync,open,saveAs,panel,get status(){return status;},flush:async()=>{if(native()&&!ready)throw Error("Thư viện tệp chưa sẵn sàng. Dùng Lưu bản snapshot để giữ bản sao.");await sync();await pending;if(failure)throw failure;if(native())await native().flush();}};
})(window);
