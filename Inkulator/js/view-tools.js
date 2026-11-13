(function(root){
  'use strict';
  function init(){
    const nav=document.querySelector('.canvas-navigation');
    nav.querySelectorAll('[data-action="zoom-in"],[data-action="zoom-out"],[data-action="fit"],[data-action="fit-width"]').forEach(b=>b.remove());
    const button=nav.querySelector('#zoom-button');button.dataset.action='zoom-options';button.title='Thu phóng';
    let z;try{z=Number(localStorage.getItem('inkulator-zoom'));}catch{}if(z>=.1&&z<=4)Store.state.viewport.zoom=z;
    PageFlow.keepZoom();
  }
  function zoomMenu(anchor){const pop=App.popover(anchor,'<h3>Thu phóng</h3><div class="field-row"><button data-action="zoom-out">−</button><input id="zoom-percent" aria-label="Mức thu phóng (%)" type="number" min="10" max="400" step="5" style="width:90px"><span>%</span><button data-action="zoom-in">+</button></div><div class="tiny-buttons"><button data-action="reset-zoom">100%</button><button data-action="fit-width">Vừa chiều rộng</button><button data-action="fit">Vừa trang</button></div>');const input=pop.querySelector('input');input.value=Math.round(Store.state.viewport.zoom*100);input.onchange=()=>{const z=Number(input.value)/100;if(z>=.1&&z<=4)CanvasEngine.zoomAt(z);};}
  function mountPlane(o,card){if(o.type!=='solid')return;const model=Geometry.mesh(o.data.kind,o.data.params),choices=model.faces.filter(f=>f.length>=3).map((f,i)=>({label:'Mặt '+f.map(v=>o.data.vertexLabels?.[v]||model.labels[v]||v).join(''),points:f.map(v=>model.vertices[v])}));
    for(const item of Constructions.build(o).items)if(item.type==='section')choices.push({label:'Thiết diện '+(item.label||''),points:item.points});
    if(!choices.length)return;const box=document.createElement('div');box.innerHTML='<h3>Nhìn vuông góc mặt phẳng</h3><label>Chọn mặt<select aria-label="Mặt phẳng để nhìn 2D"></select></label><div class="section-actions"><button type="button">Nhìn mặt này theo 2D</button><button type="button">Trở lại 3D</button></div>';const select=box.querySelector('select');choices.forEach((c,i)=>{const option=document.createElement('option');option.value=i;option.textContent=c.label;select.append(option);});let previous=null;
    const buttons=box.querySelectorAll('button');buttons[0].onclick=()=>{const p=choices[Number(select.value)].points,n=Geometry.cross(Geometry.sub(p[1],p[0]),Geometry.sub(p[2],p[0]));if(Geometry.norm(n)<1e-8)return App.toast('Mặt phẳng chưa xác định.');TeacherGeometry.cancel();previous||={rotation:[...o.data.rotation],projection:o.data.projection,drawing:o.rotation};Store.transaction(()=>{o.data.rotation=[Math.atan2(-n[2],Math.hypot(n[0],n[1])),Math.atan2(-n[0],n[1])];o.data.projection='orthographic';o.rotation=0;o.data.unfold=0;if(o.data.sectionSplit)o.data.sectionSplit.amount=0;});};buttons[1].onclick=()=>Store.transaction(()=>{o.data.rotation=previous?.rotation||Geometry.defaultRotation(o.data.kind);o.data.projection=previous?.projection||Geometry.defaultProjection(o.data.kind);o.rotation=previous?.drawing||0;});card.append(box);
  }
  root.ViewTools={init,zoomMenu,mountPlane};
})(window);
