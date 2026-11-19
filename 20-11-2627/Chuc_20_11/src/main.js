import { gsap } from 'gsap';
import { asset, chapters, letter, memories, tribute, wishes } from './config.js';
import { AudioManager } from './core/AudioManager.js';
import { PerformanceManager } from './core/PerformanceManager.js';
import { TimelineManager } from './core/TimelineManager.js';
import { SceneManager } from './core/SceneManager.js';
import { CanvasStage } from './core/CanvasStage.js';
import './styles/index.css';

const id = (name) => document.getElementById(name);
const stage = id('stage');
const opening = document.querySelector('.opening');
const art = document.querySelector('.art');
const wash = document.querySelector('.light-wash');
const dialog = id('memory-dialog');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const performance = new PerformanceManager();
const audio = new AudioManager();
let world;
let chapter = 0;
let memory = 0;
let motion = !reduced.matches;
let draw = 0;
let reading = false;
let pending = '';
let wishTimer;
let photoTimer;
let wheelTime = 0;
let gesture;
let dialogGesture;
let openPress;
let pressedBackdrop = false;
let focusReturn;
let typeIsGreeting = false;
const visited = new Set();
const readyArt = new Set();
for (const [name, color] of Object.entries(tribute.colors)) {
  document.documentElement.style.setProperty(`--${name}`, color);
}

function schedule() {
  if (!draw && !document.hidden) draw = requestAnimationFrame(render);
}

function render(time) {
  draw = 0;
  world?.render(time, timeline.state, motion && !dialog.open);
  if (motion && !dialog.open) schedule();
}

const timeline = new TimelineManager(wash, schedule);
timeline.motion = motion;

function makeWorld() {
  if (!world) {
    try {
      world = SceneManager.create(stage, performance, schedule, () => {
        world?.dispose();
        world = null;
        makeFallback();
        world.setScene(chapter);
        world.frame(memory, dialog.open);
        schedule();
      });
    } catch {
      world = null;
    }
    if (!world) makeFallback();
  }
}

function makeFallback() {
  world = new CanvasStage(stage, schedule);
  document.body.dataset.quality = 'canvas';
  document.body.dataset.finaleParticles = 'false';
}

function preloadArt(path) {
  if (readyArt.has(path)) return;
  readyArt.add(path);
  const image = new Image();
  image.src = asset(path);
}

function button(label, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

function stopLabel(number) {
  return String(number).padStart(2, '0');
}

const stops = chapters.map(({ stop, title }, index) => {
  const element = button(stop, () => interactAndGo(index, { direct: true }));
  element.className = 'stop';
  element.setAttribute('aria-label', `Ga ${index + 1}. ${title}`);
  id('stops').append(element);
  return element;
});

const flowerButtons = wishes.map((wish, index) => {
  const element = button('', () => showWish(index));
  element.className = 'icon-button';
  element.title = wish;
  element.setAttribute('aria-label', wish);
  const mark = document.querySelector('.brand-mark svg').cloneNode(true);
  mark.style.transform = `rotate(${index % 2 ? 16 : -10}deg)`;
  mark.style.color = ['#f5cf76', '#eda1b7', '#efb7e7', '#ffe1b4'][index % 4];
  element.append(mark);
  id('flower-options').append(element);
  return element;
});

function paragraphs(element, text) {
  element.replaceChildren(...text.map((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    return p;
  }));
}

id('letter-title').textContent = tribute.teachers ? `Kính gửi ${tribute.teachers}!` : letter.greeting;
paragraphs(id('letter-copy'), [
  ...letter.paragraphs, [tribute.signature, tribute.className, tribute.school].filter(Boolean).join(' · '),
]);
id('letter-copy').lastElementChild.className = 'signature';
if (tribute.school || tribute.className) {
  document.querySelector('.paper-date').textContent = ['20 tháng 11', tribute.className, tribute.school].filter(Boolean).join(' · ');
}

function clearWish() {
  clearTimeout(wishTimer);
  gsap.killTweensOf(id('wish'));
  id('wish').hidden = true;
  for (const element of flowerButtons) element.removeAttribute('data-active');
}

function showWish(index) {
  clearWish();
  const wish = id('wish');
  const selected = index % wishes.length;
  wish.textContent = wishes[selected];
  wish.hidden = false;
  flowerButtons[selected].dataset.active = 'true';
  audio.cue('spark');
  if (motion) {
    gsap.killTweensOf(wish);
    gsap.fromTo(wish, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .42 });
    wishTimer = setTimeout(() => {
      gsap.to(wish, { opacity: 0, y: -7, duration: .65, onComplete: clearWish });
    }, 5300);
  } else gsap.set(wish, { clearProps: 'opacity,transform' });
}

function openLetter() {
  if (chapter !== 5 || reading || pending) return;
  pending = 'letter';
  audio.cue('page');
  timeline.open(() => {
    if (chapter !== 5 || pending !== 'letter') return;
    pending = '';
    reading = true;
    id('back').setAttribute('aria-label','Đóng lá thư');
    id('letter').hidden = false;
    id('narrative').hidden = true;
    id('letter').scrollTop = 0;
    id('letter-title').focus({ preventScroll:true });
    if (motion) reveal(id('letter'), .62);
  });
}

function reveal(element, duration = .66) {
  gsap.killTweensOf(element);
  gsap.fromTo(element, { opacity:0, y:12 }, { opacity:1, y:0, duration, clearProps:'opacity,y', ease:'power2.out' });
}

function syncUI(focus) {
  const current=chapters[chapter];
  document.body.dataset.scene=chapter;
  id('back').hidden=chapter===0;
  id('back').setAttribute('aria-label','Quay lại ga trước');
  document.body.dataset.finaleParticles='false';
  document.title = chapter ? `${current.stop} · Chuyến tàu ký ức` : 'Chuyến tàu ký ức · 20/11';
  const plate = { 0:'intro.webp',3:'classroom.webp',6:'garden.webp',7:'garden.webp' }[chapter];
  art.style.backgroundImage=plate ? `url("${asset(plate)}")` : 'none';
  if (chapter===1 || chapter===2) preloadArt('classroom.webp');
  if (chapter===5) preloadArt('garden.webp');
  opening.hidden=chapter!==0;
  gsap.killTweensOf(opening);
  gsap.set(opening,{clearProps:'opacity,transform'});
  id('narrative').hidden=chapter===0||chapter===7;
  id('finale').hidden=chapter!==7;
  id('letter').hidden=true;
  gsap.killTweensOf(id('letter'));
  gsap.set(id('letter'),{clearProps:'opacity,transform'});
  id('film-controls').hidden=chapter!==4;
  id('flower-options').hidden=chapter!==6;
  const hint=id('scene-hint');
  hint.hidden=!current.hint;
  hint.textContent=current.hint??'';
  if (chapter>0 && chapter<7) {
    id('chapter-kicker').textContent=current.stop;
    id('chapter-title').textContent=current.title;
    paragraphs(id('chapter-lines'),current.lines);
    id('advance').textContent=current.action;
    if (motion) {
      reveal(id('narrative'));
      gsap.fromTo(id('chapter-lines').children, { opacity:0, y:8 },
        { opacity:1, y:0, duration:.7, delay:.24, stagger:chapter===1||chapter===3 ? 1.05 : .16, clearProps:'opacity,y' });
    } else gsap.set(id('narrative'),{clearProps:'opacity,transform'});
    if (focus) id('chapter-title').focus({preventScroll:true});
  } else if (chapter===7) {
    if (motion) reveal(document.querySelector('.finale-copy'), .95);
    if (focus) id('final-title').focus({preventScroll:true});
  } else if (focus) id('begin').focus({preventScroll:true});

  if (chapter===4) updateMemory(0);
  id('journey-count').textContent=`${stopLabel(chapter+1)} / ${stopLabel(chapters.length)}`;
  id('stops').style.setProperty('--progress',`${chapter / (chapters.length-1) * 100}%`);
  stops.forEach((stop,index)=>{
    stop.toggleAttribute('aria-current',index===chapter);
    if(index===chapter) stop.setAttribute('aria-current','step');
    stop.dataset.visited=String(visited.has(index));
  });
}

function setType(greeting) {
  typeIsGreeting=greeting;
  if (chapter!==7) return;
  const box= document.querySelector(greeting?'#final-title':'.final-date');
  world.setType(greeting?['CHÚC MỪNG NGÀY','NHÀ GIÁO VIỆT NAM']:['20.11'],box);
  document.body.dataset.finaleParticles=String(!greeting && !world.fallback && motion);
}

function enter(index, { focus = true, read = false } = {}) {
  const previous=chapter;
  clearTimeout(photoTimer);
  clearWish();
  if (dialog.open) dialog.close();
  pending='';
  reading=false;
  chapter=index;
  visited.add(index);
  world.setScene(index);
  syncUI(focus);
  if (index===7) {
    setType(false);
    document.fonts.ready.then(() => { if (chapter===7) setType(typeIsGreeting); });
  }
  timeline.scene(index, previous,
    () => setType(true),
    () => { if (chapter===2 && motion && !document.hidden) enter(3, { focus: false }); },
  );
  if (index===5 && read) openLetter();
  audio.scene(index);
  schedule();
}

function go(index, options = {}) {
  const target = Math.max(0, Math.min(chapters.length - 1, index));
  if (target===chapter && !reading && !options.read && !pending) return;
  if (options.direct) { enter(target, options); return; }
  if (pending) return;
  pending='next';
  if (motion && chapter===0 && target===1) {
    world.setType(['CHUYẾN TÀU','KÝ ỨC'],id('opening-title'));
    gsap.to(opening,{opacity:0,y:-12,duration:.6,ease:'power2.in'});
  }
  if (motion && chapter===5 && target===6 && reading) {
    gsap.to(id('letter'),{opacity:0,y:-17,duration:.64,ease:'sine.in'});
  }
  timeline.before(target, chapter, () => enter(target, options));
}

function interactAndGo(index, options) {
  if (audio.enabled && !audio.ctx && index!==0) {
    audio.unlock().then(() => { syncAudio(); audio.scene(chapter); });
  }
  go(index, options);
}

function advance() {
  if (chapter===5 && !reading) { openLetter(); return; }
  if (chapter<7) interactAndGo(chapter+1);
}

function updateMemory(index, focus = false) {
  memory = (index + memories.length) % memories.length;
  world.frame(memory,focus);
  const { title, caption, image } = memories[memory];
  id('film-open').textContent = `${stopLabel(memory+1)} / ${memories.length} · ${title}`;
  id('film-open').setAttribute('aria-label', `Phóng lớn ảnh ${title}`);
  if (dialog.open) {
    const photo=id('memory-image');
    photo.alt=tribute.illustratedMemories ? `Minh họa ${title.toLocaleLowerCase('vi')}` : title;
    photo.src=asset(image);
    id('memory-index').textContent=`${tribute.illustratedMemories ? 'Ảnh minh họa' : 'Ảnh lớp'} · ${stopLabel(memory+1)} / ${memories.length}`;
    id('memory-title').textContent=title;
    id('memory-caption').textContent=caption;
  }
  schedule();
}

function showPhoto(index=memory) {
  if (chapter!==4 || dialog.open) return;
  clearTimeout(photoTimer);
  focusReturn=document.activeElement?.tagName==='BUTTON'?document.activeElement:id('film-open');
  updateMemory(index,true);
  const commit = () => {
    if(chapter!==4 || dialog.open) return;
    dialog.showModal();
    updateMemory(memory,true);
    dialog.querySelector('.memory-close').focus();
  };
  if (motion && !world.fallback) photoTimer=setTimeout(commit,400);
  else commit();
}

function stepFilm(delta) {
  clearTimeout(photoTimer);
  updateMemory(memory+delta,dialog.open);
}

function syncAudio() {
  id('sound').setAttribute('aria-pressed',String(audio.enabled));
  id('sound').setAttribute('aria-label',audio.enabled?'Tắt âm thanh':'Bật âm thanh');
}

function setMotion(value) {
  motion=value;
  const button=id('motion');
  button.setAttribute('aria-pressed',String(!motion));
  button.setAttribute('aria-label',motion?'Tạm dừng chuyển động':'Tiếp tục chuyển động');
  document.body.dataset.motion=motion?'running':'paused';
  timeline.motion=motion;
  if (!motion) {
    if (pending) timeline.complete();
    else timeline.active?.pause();
    gsap.killTweensOf([id('narrative'), ...id('chapter-lines').children,document.querySelector('.finale-copy'),id('letter')]);
    gsap.set([id('narrative'), ...id('chapter-lines').children,document.querySelector('.finale-copy')],{clearProps:'opacity,transform'});
    gsap.set(id('letter'),{clearProps:'opacity,transform'});
    document.body.dataset.finaleParticles='false';
  } else {
    if (chapter===7 && timeline.state.typeOpacity>0) setType(typeIsGreeting);
    if (!document.hidden) timeline.active?.resume();
  }
  schedule();
}

id('begin').addEventListener('click',() => interactAndGo(1));
id('back').addEventListener('click',() => {
  if (reading) enter(5);
  else interactAndGo(chapter-1,{direct:true});
});
id('advance').addEventListener('click',advance);
id('send').addEventListener('click',() => go(6));
for (const element of document.querySelectorAll('[data-go]')) {
  element.addEventListener('click',() => interactAndGo(Number(element.dataset.go),{direct:true,read:element.hasAttribute('data-read')}));
}
id('film-prev').addEventListener('click',() => stepFilm(-1));
id('film-next').addEventListener('click',() => stepFilm(1));
const filmOpen=id('film-open');
filmOpen.addEventListener('pointerdown',(event)=>{
  if(event.pointerType==='touch') openPress={id:event.pointerId,x:event.clientX,y:event.clientY};
});
filmOpen.addEventListener('pointercancel',()=>{openPress=null;});
filmOpen.addEventListener('pointerup',(event)=>{
  if(!openPress || openPress.id!==event.pointerId) return;
  const distance=Math.hypot(event.clientX-openPress.x,event.clientY-openPress.y);
  openPress=null;
  if(distance>18) return;
  clearTimeout(photoTimer);
  // A synthetic click can be suppressed after a touch drag. Keep taps usable in that case.
  photoTimer=setTimeout(()=>showPhoto(),85);
});
filmOpen.addEventListener('click',() => showPhoto());
id('memory-prev').addEventListener('click',() => stepFilm(-1));
id('memory-next').addEventListener('click',() => stepFilm(1));
dialog.querySelector('.memory-close').addEventListener('click',() => dialog.close());
dialog.addEventListener('pointerdown',(event)=>{pressedBackdrop=event.target===dialog;});
dialog.addEventListener('click',(event) => {
  if (pressedBackdrop && event.target===dialog) dialog.close();
  pressedBackdrop=false;
});
dialog.addEventListener('close',()=>{
  pressedBackdrop=false;
  world.frame(memory,false);
  if (chapter===4 && focusReturn instanceof HTMLElement) focusReturn.focus({preventScroll:true});
  schedule();
});

id('sound').addEventListener('click',async () => {
  audio.enabled=!audio.enabled;
  syncAudio();
  if (audio.enabled) { await audio.unlock(); audio.scene(chapter); }
  else audio.apply();
  syncAudio();
});
id('motion').addEventListener('click',() => setMotion(!motion));
reduced.addEventListener('change',(event) => setMotion(!event.matches));
const full=id('fullscreen');
full.hidden=!document.fullscreenEnabled;
full.addEventListener('click',()=>{
  const task=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  task.catch(()=>{});
});
document.addEventListener('fullscreenchange',()=>full.setAttribute('aria-label',document.fullscreenElement?'Thoát toàn màn hình':'Toàn màn hình'));
document.addEventListener('visibilitychange',()=>{
  audio.apply();
  if(document.hidden) {
    if(draw) cancelAnimationFrame(draw);
    draw=0;
    timeline.active?.pause();
  } else {
    if (motion) timeline.active?.resume();
    world.lastTime=0;
    schedule();
  }
});

window.addEventListener('keydown',(event)=>{
  if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return;
  if(dialog.open) {
    if(event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault();
      stepFilm(event.key==='ArrowRight'?1:-1);
    }
    return;
  }
  if (reading && event.key==='Escape') { enter(5); return; }
  if (reading && !['ArrowLeft','ArrowRight'].includes(event.key)) return;
  if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
    event.preventDefault();
    const direction=event.key==='ArrowRight'?1:-1;
    if(chapter===4) stepFilm(direction);
    else if(direction===1) advance();
    else interactAndGo(chapter-1,{direct:true});
  } else if(event.key==='PageDown' || event.key==='PageUp') {
    event.preventDefault();
    interactAndGo(chapter+(event.key==='PageDown'?1:-1),{direct:true});
  }
});

window.addEventListener('pointermove',(event)=>{
  if (!world || (event.pointerType==='touch' && !gesture)) return;
  const bounds=stage.getBoundingClientRect();
  world.pointer.x=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
  world.pointer.y=Math.max(-1,Math.min(1,1-(event.clientY-bounds.top)/bounds.height*2));
},{passive:true});
stage.addEventListener('pointerdown',(event)=>{
  if(!event.isPrimary || event.button!==0) return;
  gesture={x:event.clientX,y:event.clientY,index:memory,pointer:event.pointerId};
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener('pointermove',(event)=>{
  if(chapter!==4 || !gesture || gesture.pointer!==event.pointerId) return;
  const delta=event.clientX-gesture.x;
  world.dragTarget=Math.max(-1,Math.min(1,delta/155));
  if(Math.abs(delta)>34) updateMemory(gesture.index-Math.round(delta/105));
  schedule();
});
stage.addEventListener('pointerup',(event)=>{
  if (!gesture || gesture.pointer!==event.pointerId) return;
  const dx = event.clientX-gesture.x, dy=event.clientY-gesture.y;
  gesture=null;
  world.dragTarget=0;
  if(Math.abs(dx)>28 || Math.abs(dy)>28) {
    if(chapter!==4 && event.pointerType==='touch' && Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.35) {
      if(dx>0) interactAndGo(chapter-1,{direct:true});
      else advance();
    }
    schedule();
    return;
  }
  const selected=world.pick(event.clientX,event.clientY);
  if(selected==='next') advance();
  else if(chapter===4 && Number.isInteger(selected)) showPhoto(selected);
  else if(chapter===6 && Number.isInteger(selected)) showWish(selected);
});
stage.addEventListener('pointercancel',()=>{gesture=null;world.dragTarget=0;schedule();});
stage.addEventListener('wheel',(event)=>{
  if(chapter!==4) return;
  event.preventDefault();
  const value=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  if(Math.abs(value)<2 || event.timeStamp-wheelTime<155) return;
  wheelTime=event.timeStamp;
  stepFilm(Math.sign(value));
},{passive:false});

dialog.addEventListener('touchstart',(event)=>{dialogGesture=event.changedTouches[0]?.clientX;},{passive:true});
dialog.addEventListener('touchend',(event)=>{
  const delta=event.changedTouches[0]?.clientX-dialogGesture;
  if(Math.abs(delta)>42) stepFilm(delta>0?-1:1);
},{passive:true});

makeWorld();
enter(0,{focus:false});
setMotion(motion);
new ResizeObserver(()=>{
  world?.resize();
  schedule();
}).observe(stage);

if (motion) {
  gsap.fromTo(opening.children,{opacity:0,y:9},{opacity:1,y:0,duration:.7,stagger:.085,clearProps:'opacity,y',ease:'power2.out'});
}
