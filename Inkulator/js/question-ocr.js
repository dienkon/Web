(function(root){
 "use strict";
 function label(text){
  const plain=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const questions=[...plain.matchAll(/\b(?:cau|bai|question)\s*[:.]?\s*(\d{1,4})\b/gi)].map(m=>Number(m[1]));
  const parts=[...plain.matchAll(/(?:^|[\s;])([a-h]|i{1,3}|iv|v)\s*[).:](?=\s|$)/gi)].map(m=>m[1].toLowerCase());
  for(const match of plain.matchAll(/\by\s+([a-h](?:\s*[,;]\s*[a-h])*)/gi))parts.push(...match[1].split(/\s*[,;]\s*/).map(s=>s.toLowerCase()));
  const nums=[...new Set(questions)].slice(0,4),items=[...new Set(parts)].slice(0,8);
  return nums.length?'Câu '+nums.join(', ')+(items.length?' · ý '+items.join(', '):''):items.length?'Ý '+items.join(', '):'';
 }
 async function pdfText(region,page){
  const box=region.world,items=[];
  const overlaps=(a,b)=>a.x+a.w>=b.x&&a.x<=b.x+b.w&&a.y+a.h>=b.y&&a.y<=b.y+b.h;
  for(const o of page.objects){
   if(o.visible===false||!page.layers.some(l=>l.id===o.layer&&l.visible))continue;
   if(o.type==='text'&&overlaps({...o.position,...o.size},box)){items.push({x:o.position.x,y:o.position.y,text:o.data.text});continue;}
   if(o.type!=='pdf')continue;
   const doc=await PDFStudio.getDocument(o),p=await doc.getPage(o.data.pageNumber),viewport=p.getViewport({scale:1,rotation:o.data.pageRotation}),content=await p.getTextContent();
   for(const item of content.items){if(!item.str)continue;const [a,b,c,d,x,y]=item.transform,height=Math.max(1,Math.hypot(c,d)),width=Math.max(1,item.width),angle=Math.atan2(b,a),dx=Math.cos(angle)*width,dy=Math.sin(angle)*width,hx=-Math.sin(angle)*height,hy=Math.cos(angle)*height;
    const points=[[x,y],[x+dx,y+dy],[x+dx+hx,y+dy+hy],[x+hx,y+hy]].map(q=>{const v=viewport.convertToViewportPoint(...q);return Renderer.worldPoint(o,{x:v[0]/viewport.width*o.size.w,y:v[1]/viewport.height*o.size.h});});
    const xs=points.map(q=>q.x),ys=points.map(q=>q.y),rect={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
    if(overlaps(rect,box))items.push({x:rect.x,y:rect.y,text:item.str});
   }
  }
  items.sort((a,b)=>Math.abs(a.y-b.y)<4?a.x-b.x:a.y-b.y);return items.map(item=>item.text).join('\n').slice(0,12000);
 }
 async function recognize(region){
  const page=Store.book().id===region.bookId&&Store.book().pages.find(p=>p.id===region.pageId);if(!page)return {label:'',text:'',engine:''};
  let text='';try{text=await pdfText(region,page);if(label(text))return {label:label(text),text,engine:'PDF / văn bản'};}catch{}
  if(root.InkulatorDesktop?.questionOCR){try{const result=await InkulatorDesktop.questionOCR(region.src);if(result.text)text=result.text;if(label(text))return {label:label(text),text,engine:'Windows OCR'};}catch{}}
  const bridge=root.InkulatorDesktop?.gemini||root.GeminiWeb;
  if(navigator.onLine!==false&&bridge&&!root.TeachingAI?.busy){try{if((await bridge.status()).configured){const answer=await bridge.ask({action:'question',src:region.src,model:Store.state.settings.geminiModel||'gemini-3.5-flash-lite'});text=answer.transcription||answer.title||text;return {label:label(text)||label(answer.title),text,engine:'Gemini OCR'};}}catch{}}
  return {label:label(text),text,engine:text?'OCR':''};
 }
 root.QuestionOCR={label,recognize,pdfText};
})(typeof window!=="undefined"?window:globalThis);
