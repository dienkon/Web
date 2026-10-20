(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const draftKey='vuon-thuong-draft-v2';
  let gift=GiftData.normalize(),photoBusy=false,saving=false,ready=false,mode='desktop',draftTimer,pendingId=null,pendingSnapshot=null;
  try{const stored=JSON.parse(localStorage.getItem(draftKey)||'null');if(stored)gift=GiftData.normalize(stored);}catch{/* Storage is optional. */}
  const fields=Object.keys(GiftData.defaults).filter(key=>key!=='photoBase64');
  function fillForm(){for(const key of fields)$(key).value=gift[key];updatePhoto();}
  function updatePhoto(){const exists=!!gift.photoBase64;$('photo-thumb').hidden=!exists;$('photo-empty').hidden=exists;$('remove-photo').hidden=!exists;if(exists)$('photo-thumb').src=gift.photoBase64;else $('photo-thumb').removeAttribute('src');$('photo-info').textContent=exists?`Ảnh đã tối ưu · khoảng ${Math.ceil(gift.photoBase64.length/1024)} KB base64`:'JPG, PNG, WebP · tự động tối ưu';}
  function sendPreview(action){if(ready)$('gift-preview').contentWindow.postMessage({type:'garden-preview',gift,action},location.origin);}
  function saveDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{localStorage.setItem(draftKey,JSON.stringify(gift));$('draft-status').textContent='Đã giữ bản nháp trên thiết bị này';}catch{$('draft-status').textContent='Không lưu được bản nháp trên thiết bị này';}},350);}
  function changed(){sendPreview();saveDraft();$('saved-result').hidden=true;pendingId=null;pendingSnapshot=null;if(!saving){$('save-status').textContent='';$('save-status').classList.remove('error');}}
  function readForm(){for(const key of fields)gift[key]=$(key).value;gift=GiftData.normalize(gift);}
  fillForm();
  $('creator-form').addEventListener('input',event=>{
    const previous=gift.recipient;const oldSalutation=`Gửi ${previous}, người luôn xứng đáng được yêu thương`,oldTitle=`Gửi ${previous} thương,`;
    readForm();
    if(event.target.id==='recipient'){
      if(gift.salutation===GiftData.defaults.salutation||gift.salutation===oldSalutation)gift.salutation=gift.recipient?`Gửi ${gift.recipient}, người luôn xứng đáng được yêu thương`:GiftData.defaults.salutation;
      if(gift.letterTitle===GiftData.defaults.letterTitle||gift.letterTitle===oldTitle)gift.letterTitle=gift.recipient?`Gửi ${gift.recipient} thương,`:GiftData.defaults.letterTitle;
      $('salutation').value=gift.salutation;$('letterTitle').value=gift.letterTitle;
    }
    changed();
  });
  $('creator-photo').addEventListener('change',async()=>{
    const file=$('creator-photo').files[0];if(!file||photoBusy)return;photoBusy=true;$('creator-photo').disabled=true;$('remove-photo').disabled=true;$('saved-result').hidden=true;$('publish').disabled=true;$('photo-info').textContent='Đang tối ưu ảnh…';
    try{gift.photoBase64=await GiftData.compressPhoto(file);updatePhoto();changed();}
    catch(error){updatePhoto();$('photo-info').textContent=error.message;}
    finally{photoBusy=false;$('creator-photo').disabled=false;$('remove-photo').disabled=false;$('publish').disabled=saving;$('creator-photo').value='';}
  });
  $('remove-photo').addEventListener('click',()=>{gift.photoBase64='';updatePhoto();changed();});
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===$('gift-preview').contentWindow&&event.data?.type==='garden-ready'){ready=true;sendPreview();}});
  $('gift-preview').addEventListener('load',()=>{ready=true;sendPreview();fitPreview();});
  function fitPreview(){const stage=$('preview-stage');const width=mode==='desktop'?1280:390,height=mode==='desktop'?960:844;const scale=Math.min(stage.clientWidth/width,stage.clientHeight/height);const frame=$('gift-preview');frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.style.setProperty('--preview-scale',scale);}
  new ResizeObserver(fitPreview).observe($('preview-stage'));
  function setView(value){mode=value;$('desktop-view').setAttribute('aria-pressed',String(value==='desktop'));$('mobile-view').setAttribute('aria-pressed',String(value==='mobile'));fitPreview();}
  $('desktop-view').addEventListener('click',()=>setView('desktop'));$('mobile-view').addEventListener('click',()=>setView('mobile'));
  $('preview-replay').addEventListener('click',()=>sendPreview('replay'));
  $('preview-letter').addEventListener('click',()=>{sendPreview('letter');if(innerWidth<741)$('preview-stage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});});
  $('reset-draft').addEventListener('click',()=>{gift=GiftData.normalize();fillForm();changed();});
  $('local-note').hidden=!['localhost','127.0.0.1',''].includes(location.hostname);
  $('creator-form').addEventListener('submit',async event=>{
    event.preventDefault();if(saving||photoBusy)return;
    readForm();if(!gift.headline.trim()||!gift.message.trim()){status('Bạn cần nhập tiêu đề và lời chúc.',true);return;}
    if(location.protocol==='file:'){status('Mở bản GitHub Pages bằng liên kết bên dưới để lưu thiệp và tạo link tặng.',true);return;}
    const snapshot=JSON.stringify(gift),data=JSON.parse(snapshot);
    if(pendingSnapshot!==snapshot){pendingSnapshot=snapshot;pendingId=crypto.randomUUID().replaceAll('-','');}
    const requestId=pendingId;
    saving=true;$('publish').disabled=true;$('publish').textContent='Đang lưu yêu thương…';status('Đang lưu ảnh và lời chúc vào Firestore…');
    try{
      const id=await GiftStore.save(data,requestId);
      if(JSON.stringify(gift)!==snapshot){status('Đã lưu phiên bản trước. Nội dung vừa đổi cần được lưu lại để tạo link mới.');return;}
      const url=new URL('index.html',location.href);url.searchParams.set('gift',id);
      $('gift-link').value=url.href;$('open-gift').href=url.href;$('saved-result').hidden=false;status('Đã lưu thiệp và ảnh thành công. Link tặng đã sẵn sàng.');
    }catch(error){status(error.message,true);}
    finally{saving=false;$('publish').disabled=photoBusy;$('publish').textContent='Lưu thiệp & tạo link tặng ↗';}
  });
  function status(message,error=false){$('save-status').textContent=message;$('save-status').classList.toggle('error',error);}
  $('copy-link').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('gift-link').value);status('Đã sao chép link tặng.');}
    catch{$('gift-link').focus();$('gift-link').select();status('Bạn nhấn Ctrl+C hoặc giữ để sao chép đường dẫn.');}
  });
  fitPreview();
})();
