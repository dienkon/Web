(function(root){
  "use strict";
  async function panel(anchor){
    const bridge=root.InkulatorDesktop?.calculators;
    const pop=App.popover(anchor,'<h3>Máy tính & công thức</h3><div id="native-calculator-list"></div><div class="panel-divider"></div><button id="native-web" class="menu-item">Casio 580 · bản web ngoại tuyến</button><button class="menu-item" data-action="calculator-tools">Máy tính khoa học</button><button class="menu-item" data-action="formula">Soạn công thức đẹp</button><button class="menu-item" data-action="panel" data-panel="math">Công cụ toán · phương trình, tích phân…</button>');
    pop.querySelector("#native-web").onclick=()=>{App.closePopover();CasioStudio.open();};
    const list=pop.querySelector("#native-calculator-list");
    if(!bridge){list.textContent="Máy Casio 580 / 880 dùng trên bản Windows.";return;}
    let items;try { items=await bridge.list(); } catch(error) { list.textContent=error.message; return; }
    if(pop.hidden||!list.isConnected)return;
    for(const item of items){const row=document.createElement("section");row.className="native-calculator-row";
      const label=document.createElement("strong");label.textContent=item.id==="580"?"fx-580VN X · Windows":"880BTG · BITEX Windows";row.append(label);
      const path=document.createElement("small");path.textContent=item.available?"Sẵn sàng trên Windows":"Chưa tìm thấy EXE";path.title=item.file;row.append(path);
      for(const [text,fn] of [["Mở máy",()=>bridge.open(item.id)],["Chèn ảnh máy",async()=>{const value=await bridge.capture(item.id);const blob=await(await fetch(value.src)).blob();return ClipboardStudio.insertFile(new File([blob],"Casio-"+item.id+".png",{type:"image/png"}));}],["Chọn EXE…",()=>bridge.choose(item.id)]]){
        const b=document.createElement("button");b.textContent=text;b.dataset.nativeModel=item.id;b.dataset.nativeOp=text==="Mở máy"?"open":text==="Chèn ảnh máy"?"capture":"choose";b.disabled=!item.available&&text!=="Chọn EXE…";
        b.onclick=async()=>{b.disabled=true;try{await fn();App.closePopover();}catch(error){App.toast(error.message,7000);}finally{b.disabled=false;}};row.append(b);
      }list.append(row);
    }
    const r=anchor.getBoundingClientRect();pop.style.top=Math.max(12,Math.min(r.bottom+8,innerHeight-pop.offsetHeight-20))+"px";
  }
  function init(){const anchor=document.querySelector('.workspace-tabs [data-action="calculator"]');anchor.title="Máy tính & công thức · Casio 580 / 880";anchor.setAttribute("aria-label",anchor.title);}
  root.NativeCalculators={init,panel};
})(window);
