(function(root){
  "use strict";
  async function panel(anchor){
    const bridge=root.InkulatorDesktop?.calculators;
    const pop=App.popover(anchor,'<h3>Máy tính</h3><button id="native-web" class="full">580 · bản ngoại tuyến tích hợp</button><div id="native-calculator-list"></div>');
    pop.querySelector("#native-web").onclick=()=>{App.closePopover();CasioStudio.open();};
    const list=pop.querySelector("#native-calculator-list");
    if(!bridge){list.textContent="Máy 580/880 từ tệp EXE dùng trên bản Windows.";return;}
    const items=await bridge.list();
    if(pop.hidden||!list.isConnected)return;
    for(const item of items){const row=document.createElement("section");row.className="native-calculator-row";
      const label=document.createElement("strong");label.textContent=item.id==="580"?"fx-580VN X · Windows":"880BTG · BITEX Windows";row.append(label);
      const path=document.createElement("small");path.textContent=item.available?item.file:"Chưa tìm thấy EXE";row.append(path);
      for(const [text,fn] of [["Mở máy",()=>bridge.open(item.id)],["Chèn ảnh máy",async()=>{const value=await bridge.capture(item.id);const blob=await(await fetch(value.src)).blob();return ClipboardStudio.insertFile(new File([blob],"Casio-"+item.id+".png",{type:"image/png"}));}],["Chọn EXE…",()=>bridge.choose(item.id)]]){
        const b=document.createElement("button");b.textContent=text;b.dataset.nativeModel=item.id;b.dataset.nativeOp=text==="Mở máy"?"open":text==="Chèn ảnh máy"?"capture":"choose";b.disabled=!item.available&&text!=="Chọn EXE…";
        b.onclick=async()=>{b.disabled=true;try{await fn();App.closePopover();}catch(error){App.toast(error.message,7000);}finally{b.disabled=false;}};row.append(b);
      }list.append(row);
    }
    const r=anchor.getBoundingClientRect();pop.style.top=Math.max(12,Math.min(r.bottom+8,innerHeight-pop.offsetHeight-20))+"px";
  }
  function init(){const anchor=document.querySelector('.workspace-tabs [data-action="calculator"]'),button=document.createElement("button");button.dataset.action="calculator-models";button.title="Chọn máy tính 580 / 880";button.setAttribute("aria-label",button.title);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2h13v20H3zM6 5h7v4H6zM6 13h1M11 13h1M6 17h1M11 17h1M19 10l2 3 2-3"/></svg>';anchor.after(button);}
  root.NativeCalculators={init,panel};
})(window);
