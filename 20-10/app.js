'use strict';

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let toastTimer;
const isPreview = new URLSearchParams(location.search).has('preview') && window.parent !== window;
let personal = GiftData.normalize();
function updateGreeting() {
  for (const key of ['eyebrow','day','month','caption','salutation','subtitle','buttonText','footer','letterEyebrow','signoff','paperBottom']) $(key).textContent=personal[key];
  $('letter-title').textContent=personal.letterTitle;
  $('letter-copy').textContent=personal.message;
  $('signature').textContent=personal.sender;
  $('date').setAttribute('aria-label',`Ngày ${personal.day} tháng ${personal.month}`);
  const line=document.createElement('span');line.textContent=personal.headline;line.className='headline-first';
  const second=document.createElement('span');second.textContent=personal.headlineSecond+' ';
  const accent=document.createElement('em');accent.textContent=personal.headlineAccent;second.append(accent);
  $('greeting').replaceChildren(line,document.createElement('br'),second);
  document.body.dataset.theme=personal.theme;document.body.dataset.effect=personal.effect;document.body.dataset.fontSize=personal.fontSize;
  $('portrait-image').hidden=!personal.photoBase64;
  if(personal.photoBase64)$('portrait-image').src=personal.photoBase64;else $('portrait-image').removeAttribute('src');
  $('portrait-placeholder').hidden=!!personal.photoBase64;$('portrait-placeholder').style.display=personal.photoBase64?'none':'';
  document.title=personal.recipient?`Gửi ${personal.recipient} · Vườn thương`:'20/10 · Một vườn dịu dàng';
}
updateGreeting();
new ResizeObserver(()=>{
  $('garden').style.setProperty('--content-height',`${Math.ceil(document.querySelector('.dedication').getBoundingClientRect().height+145)}px`);
}).observe(document.querySelector('.dedication'));
if(isPreview){
  document.body.classList.add('preview-mode');
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==location.origin||!event.data||event.data.type!=='garden-preview')return;
    personal=GiftData.normalize(event.data.gift);updateGreeting();
    if(event.data.action==='letter')showDialog('letter-dialog');
    if(event.data.action==='replay')$('replay').click();
  });
  window.parent.postMessage({type:'garden-ready'},location.origin);
}else{
  const id=new URLSearchParams(location.search).get('gift');
  if(id)loadGift(id);
  else {
    // Preserve older links made before Firestore was added.
    try{const legacy=new URLSearchParams(location.hash.slice(1)).get('gift');if(legacy){const value=JSON.parse(legacy);personal=GiftData.normalize(value);if(personal.recipient){personal.salutation=`Gửi ${personal.recipient}, người luôn xứng đáng được yêu thương`;personal.letterTitle=`Gửi ${personal.recipient} thương,`;}updateGreeting();}}catch{toast('Link cũ không hợp lệ. Bạn có thể tạo thiệp mới.');}
  }
}
async function loadGift(id){
  document.body.classList.add('gift-loading');$('cloud-state').hidden=false;$('retry-gift').hidden=true;
  $('cloud-title').textContent='Đang mở khu vườn của bạn…';$('cloud-message').textContent='Một chút dịu dàng đang trên đường đến.';
  try{personal=await GiftStore.load(id);updateGreeting();$('cloud-state').hidden=true;document.body.classList.remove('gift-loading');playEntrance();}
  catch(error){$('cloud-title').textContent='Chưa mở được tấm thiệp';$('cloud-message').textContent=error.message;$('retry-gift').hidden=false;}
}
$('retry-gift').addEventListener('click',()=>loadGift(new URLSearchParams(location.search).get('gift')));

// Each flower is an independent transparent image, with its own opening and breeze.
const blooms = [
  [-1,17,160,'daisy',-18,0.1],[10,4,110,'cosmos',20,.5],[20,-3,180,'daisy',15,.8],[31,-5,170,'cosmos',-15,1.1],
  [43,-7,140,'daisy',10,1.4],[58,-6,180,'cosmos',20,1],[72,-4,150,'daisy',-12,.7],[87,5,100,'cosmos',13,.4],[100,12,160,'daisy',-20,.2],
  [3,37,145,'cosmos',-24,.8],[14,23,165,'daisy',15,1.2],[23,11,115,'hibiscus',-15,1.3],[6,59,170,'hibiscus',-20,1.1],
  [18,46,142,'cosmos',25,1.6],[2,79,185,'daisy',-12,.7],[13,69,125,'cosmos',14,1.4],[22,88,190,'daisy',18,1.7],
  [8,99,185,'cosmos',-5,1.1],[30,105,170,'cosmos',13,1.9],[43,107,170,'daisy',-18,2.2],[58,108,170,'cosmos',14,2.3],
  [70,104,185,'daisy',-20,2],[85,99,190,'cosmos',18,1.5],[99,89,190,'daisy',-15,.8],[92,68,170,'cosmos',24,1],
  [79,86,145,'hibiscus',12,1.9],[82,43,148,'daisy',-20,1.6],[98,46,175,'hibiscus',18,.7],[87,22,170,'cosmos',-12,1.2],
  [97,30,85,'daisy',14,.3],[3,27,55,'cosmos',20,.6],[25,30,66,'cosmos',-10,1.6],[76,13,80,'hibiscus',10,1.5],
  [9,88,56,'daisy',15,1.4],[28,74,60,'cosmos',-12,2],[73,70,60,'cosmos',20,2],[94,6,57,'daisy',-20,.3],
  [16,92,60,'hibiscus',10,1.4],[91,83,56,'cosmos',15,1.7],[37,98,75,'cosmos',-15,2.2],[65,97,80,'cosmos',20,2.1]
];
function createGarden() {
  const root = $('botanicals');
  const fragment = document.createDocumentFragment();
  blooms.forEach(([x,y,size,type,rotation,delay],i) => {
    const stem = document.createElement('div');
    stem.className = 'stem';
    const angle = x < 50 ? -38 + x / 2 : 38 - (100-x) / 2;
    const mobileX = y > 10 && y < 90 ? (x < 35 ? x * .22 - 8 : x > 65 ? 108 - (100-x) * .22 : x) : x;
    stem.style.cssText = `--x:${x}%;--mobile-x:${mobileX}%;--y:${y}%;--length:${160+size}px;--angle:${angle}deg;--delay:${delay/2}s`;
    for (let j=0;j<3;j++) {
      const leaf=document.createElement('i');leaf.className='leaf';
      leaf.style.cssText=`--at:${35+j*24}%;--turn:${j%2 ? 190 : -25}deg`;
      stem.append(leaf);
    }
    const bloom = document.createElement('div');
    bloom.className=`bloom ${size < 85 ? 'far' : size > 170 ? 'near' : ''}`;
    bloom.style.cssText=`--x:${x}%;--mobile-x:${mobileX}%;--y:${y}%;--size:${size}px;--rotation:${rotation}deg;--delay:${delay}s;--sway:${7+i%6}s`;
    const reveal = document.createElement('div');reveal.className='bloom-reveal';
    const img=document.createElement('img');img.src=`assets/${type}.png`;img.alt='';img.draggable=false;
    reveal.append(img);bloom.append(reveal);fragment.append(stem,bloom);
  });
  root.replaceChildren(fragment);
}
createGarden();
for (let i=0;i<32;i++) {
  const fly=document.createElement('span');fly.className='firefly';
  fly.style.cssText=`--x:${12+(i*31.7)%76}%;--y:${5+(i*17.3)%90}%;--size:${i%4===0 ? 3 : 2}px;--duration:${3+i%5}s;--delay:${-i*.63}s`;
  $('fireflies').append(fly);
}
for(let i=0;i<13;i++) {
  const petal=document.createElement('span');petal.className='petal';
  petal.style.cssText=`--left:${(i*19.3)%100}%;--size:${8+i%4*4}px;--duration:${16+i%6*2}s;--delay:${-i*2.7}s`;
  $('falling-petals').append(petal);
}

function toast(message) { $('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3600); }
function showDialog(id) { $(id).showModal(); }
$('open-letter').addEventListener('click',()=>{burst(innerWidth/2,innerHeight/2,28);showDialog('letter-dialog');});
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
});
$('portrait').addEventListener('click',()=>{
  if(isPreview)return;
  location.href='create.html';
});
$('replay').addEventListener('click',()=>{
  playEntrance();
});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Trình duyệt này chưa hỗ trợ toàn màn hình.');}catch{toast('Không thể mở toàn màn hình trong trình duyệt này.');}
});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Thoát toàn màn hình':'Xem toàn màn hình');});
if(!reducedMotion.matches && matchMedia('(pointer: fine)').matches) {
  $('garden').addEventListener('pointermove',e=>{const x=(e.clientX/innerWidth-.5)*-9,y=(e.clientY/innerHeight-.5)*-7;$('botanicals').style.setProperty('--mx',`${x}px`);$('botanicals').style.setProperty('--my',`${y}px`);});
}
$('garden').addEventListener('click',event=>{
  if(reducedMotion.matches||event.target.closest('button,a'))return;
  for(let i=0;i<7;i++){const spark=document.createElement('span');spark.className='touch-spark';spark.textContent=i%2?'✧':'·';spark.style.cssText=`left:${event.clientX}px;top:${event.clientY}px;--dx:${Math.cos(i)*65}px;--dy:${Math.sin(i)*65-25}px`;document.body.append(spark);setTimeout(()=>spark.remove(),1200);}
});

// The supplied song is the main soundtrack. Resume from the paused position.
const backgroundMusic=$('background-music');
backgroundMusic.volume=.55;
function updateMusicButton(){
  const playing=!backgroundMusic.paused&&!backgroundMusic.error;
  $('sound').setAttribute('aria-pressed',String(playing));
  $('sound').setAttribute('aria-label',`${playing?'Tắt':'Bật'} nhạc: Bật Tình Yêu Lên`);
}
backgroundMusic.addEventListener('play',updateMusicButton);
backgroundMusic.addEventListener('pause',updateMusicButton);
backgroundMusic.addEventListener('error',()=>{updateMusicButton();toast('Không tải được bài Bật Tình Yêu Lên. Bạn kiểm tra mạng rồi thử lại nhé.');});
$('sound').addEventListener('click',async()=>{
  const button=$('sound');button.disabled=true;
  try{
    if(backgroundMusic.paused){if(backgroundMusic.error)backgroundMusic.load();await backgroundMusic.play();}
    else backgroundMusic.pause();
  }catch{toast('Chưa thể bật bài Bật Tình Yêu Lên. Bạn thử chạm lại nút nhạc nhé.');}
  finally{updateMusicButton();button.disabled=false;}
});

// Blooming butterflies and a brief petal burst give the entrance and letter their own moments.
function burst(x,y,count=18){
  if(reducedMotion.matches||personal.effect==='gentle')return;
  for(let i=0;i<count;i++){
    const p=document.createElement('span');p.className='burst-petal';
    const angle=i/count*Math.PI*2,distance=85+Math.random()*140;
    p.style.cssText=`left:${x}px;top:${y}px;--dx:${Math.cos(angle)*distance}px;--dy:${Math.sin(angle)*distance}px;--spin:${Math.random()*500}deg;--delay:${Math.random()*.18}s`;
    document.body.append(p);setTimeout(()=>p.remove(),2200);
  }
}
for(let i=0;i<3;i++){
  const butterfly=document.createElement('span');butterfly.className='butterfly';butterfly.setAttribute('aria-hidden','true');
  butterfly.style.cssText=`--flight-delay:${-i*8}s;--flight-time:${22+i*6}s;--flight-top:${20+i*23}%`;
  butterfly.append(document.createElement('i'),document.createElement('i'));$('garden').append(butterfly);
}

let entranceFocus=null;
const floralEntrance=new FloralEntrance({
  onReveal:()=>{
    document.body.classList.remove('entrance-active');document.body.classList.add('entrance-revealed');
    createGarden();document.querySelectorAll('.intro').forEach(el=>{el.style.animation='none';void el.offsetWidth;el.style.animation='';});
  },
  onFinish:()=>{
    document.body.classList.remove('entrance-active');$('garden').inert=false;
    if(floralEntrance.hadFocus||entranceFocus?.id==='replay'){
      (entranceFocus?.isConnected&&entranceFocus!==document.body?entranceFocus:$('open-letter')).focus({preventScroll:true});
    }
    entranceFocus=null;
  }
});
function playEntrance(){
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  if(!isPreview)window.scrollTo({top:0,behavior:'instant'});
  entranceFocus=document.activeElement;$('garden').inert=true;
  document.body.classList.add('entrance-active');document.body.classList.remove('entrance-revealed');
  floralEntrance.start({gentle:personal.effect==='gentle'});
}
// Editing remains immediate; the preview's replay button runs the complete entrance on demand.
if(!isPreview&&!new URLSearchParams(location.search).get('gift'))playEntrance();
