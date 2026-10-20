/* A bounded canvas timeline: particles → photograph → spinning bouquet → flower carpet → fall. */
(() => {
  'use strict';
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const ease=n=>1-(1-clamp(n))**3;
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const TAU=Math.PI*2;
  const sources=['rose','peony','chrysanthemum','daisy','cosmos','hibiscus'];
  let preload;
  function loadFlowers(){
    if(!preload)preload=Promise.all(sources.map(async name=>{
      const image=new Image();image.src=`assets/${name}.png`;
      try{await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.getContext('2d').drawImage(image,0,0,512,512);return canvas;}catch{return null;}
    })).then(images=>images.filter(Boolean));
    return preload;
  }
  class FloralEntrance {
    constructor({onReveal,onFinish}={}){
      this.root=document.getElementById('floral-entrance');this.canvas=document.getElementById('entrance-canvas');
      this.ctx=this.canvas.getContext('2d',{alpha:true});this.label=document.getElementById('entrance-label');
      this.progress=document.getElementById('entrance-progress');this.skip=document.getElementById('skip-entrance');
      this.onReveal=onReveal;this.onFinish=onFinish;this.motion=matchMedia('(prefers-reduced-motion: reduce)');
      this.running=false;this.runId=0;this.assets=[];
      this.skip.addEventListener('click',()=>this.finish());
      this.motion.addEventListener('change',()=>{if(this.motion.matches&&this.running)this.finish();});
      this.resize=()=>{if(this.running)this.measure();};window.addEventListener('resize',this.resize);
      document.addEventListener('visibilitychange',()=>{
        if(!this.running)return;
        cancelAnimationFrame(this.frame);this.lastTime=0;
        if(!document.hidden)this.frame=requestAnimationFrame(t=>this.tick(t));
      });
      document.addEventListener('keydown',event=>{if(this.running&&event.key==='Escape'){event.preventDefault();this.finish();}});
    }
    async start({gentle=false}={}){
      this.finish(false);const token=++this.runId;this.gentle=gentle;
      if(this.motion.matches||!this.ctx){this.onReveal?.();this.onFinish?.();return;}
      this.running=true;this.revealed=false;this.elapsed=0;this.lastTime=0;
      this.hadFocus=false;
      this.root.hidden=false;this.root.dataset.phase='particles';this.label.textContent='Một điều dịu dàng đang thành hình';
      this.skip.disabled=false;this.progress.style.transform='scaleX(0)';this.measure();
      this.frame=requestAnimationFrame(t=>this.tick(t));
      const images=await loadFlowers();
      if(this.running&&token===this.runId){this.assets=images;if(!images.length){this.finish();return;}this.sampleFlower();}
    }
    measure(){
      this.w=innerWidth;this.h=innerHeight;this.dpr=Math.min(devicePixelRatio||1,1.5);
      this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.heroSize=Math.min(this.w*.55,this.h*.38,310);
      this.makeParticles();this.makeCarpet();
      if(this.assets.length)this.sampleFlower();
    }
    makeParticles(){
      let seed=2010;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
      const count=this.w<700?1000:1800;
      this.particles=Array.from({length:count},(_,i)=>{
        const angle=random()*TAU,r=Math.sqrt(random());
        // A procedural rose target is available before the photo decodes, and for file:// canvas restrictions.
        const petal=.57+.43*Math.abs(Math.cos(angle*5+r*3));
        return{sx:(random()-.5)*this.w*1.3,sy:(random()-.5)*this.h*1.2,tx:Math.cos(angle)*r*petal,ty:Math.sin(angle)*r*petal,
          color:['#ffb4cf','#fff0da','#d9b1ff','#f48fae','#f4c68c'][i%5],size:.65+random()*1.2,phase:random()*TAU,delay:random()*.2};
      });
      this.stars=Array.from({length:90},()=>({x:random()*this.w,y:random()*this.h,r:random()*1.2+.3,phase:random()*TAU}));
    }
    sampleFlower(){
      if(!this.assets.length)return;
      try{
        const sample=document.createElement('canvas');const side=160;sample.width=sample.height=side;
        const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(this.assets[0],0,0,side,side);
        const pixels=ctx.getImageData(0,0,side,side).data,points=[],edges=[];
        for(let y=2;y<side-2;y++)for(let x=2;x<side-2;x++){
          const k=(y*side+x)*4;if(pixels[k+3]<150)continue;
          const point={x:(x-side/2)/(side/2),y:(y-side/2)/(side/2),color:`rgb(${pixels[k]},${pixels[k+1]},${pixels[k+2]})`};
          const left=k-8,right=k+8,up=k-side*8,down=k+side*8;
          const contrast=Math.abs(pixels[left]-pixels[right])+Math.abs(pixels[left+1]-pixels[right+1])+Math.abs(pixels[up]-pixels[down])+Math.abs(pixels[up+1]-pixels[down+1]);
          if(contrast>100||pixels[left+3]<100||pixels[right+3]<100)edges.push(point);
          else if((x+y)%3===0)points.push(point);
        }
        const all=points.length?points:edges;
        if(all.length)this.particles.forEach((p,i)=>{const pool=i%5===0||!edges.length?all:edges;const point=pool[(i*37)%pool.length];p.tx=point.x;p.ty=point.y;p.color=point.color;p.size=i%5===0?.65:.9;});
      }catch{/* Procedural flower still works if local-file pixel access is restricted. */}
    }
    makeCarpet(){
      const step=clamp(Math.min(this.w,this.h)*.16,76,155),cols=Math.ceil(this.w/step)+2,rows=Math.ceil(this.h/step)+2;
      const far=Math.hypot(this.w/2,this.h/2);
      this.flowers=[];
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const index=row*cols+col,x=(col-.5)*step+(row%2?step*.45:0),y=(row-.5)*step;
        const distance=Math.hypot(x-this.w/2,y-this.h/2)/far;
          this.flowers.push({x,y,size:step*(1.75+(index%5)*.08),rotation:Math.sin(index*2.4)*Math.PI,
          image:Math.floor(((Math.sin(index*12.9898+row*78.233)*43758.5453)%1+1)%1*6),delay:clamp(distance)*.48,fallDelay:((index*17)%23)/23*.35,spin:(index%2?1:-1)*(1+index%4)*.7});
      }
      this.flowers.sort((a,b)=>b.delay-a.delay);
    }
    drawImage(index,x,y,size,rotation=0,alpha=1){
      if(!this.assets.length||alpha<=0||size<1)return;
      const ctx=this.ctx;ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(rotation);
      ctx.drawImage(this.assets[index%this.assets.length],-size/2,-size/2,size,size);ctx.restore();
    }
    setPhase(phase,label){if(this.root.dataset.phase!==phase){this.root.dataset.phase=phase;this.label.textContent=label;}}
    reveal(){if(this.revealed)return;this.revealed=true;this.onReveal?.();}
    tick(now){
      if(!this.running)return;
      if(!this.lastTime)this.lastTime=now;
      this.elapsed+=Math.min(now-this.lastTime,50);this.lastTime=now;
      const t=this.elapsed,ctx=this.ctx,w=this.w,h=this.h,cx=w/2,cy=h*.47;
      const duration=this.gentle?1100:11400;
      if(t>=duration){this.finish();return;}
      this.progress.style.transform=`scaleX(${clamp(t/duration)})`;
      ctx.clearRect(0,0,w,h);
      if(this.gentle){
        this.setPhase('morph','Một đóa hoa, một lời thương dịu dàng.');
        ctx.fillStyle=`rgba(20,9,27,${1-smooth((t-450)/650)})`;ctx.fillRect(0,0,w,h);
        this.drawImage(0,cx,cy,this.heroSize,0,Math.sin(clamp(t/1100)*Math.PI));
        if(t>450)this.reveal();
        this.frame=requestAnimationFrame(n=>this.tick(n));return;
      }
      // The night dissolves while the flower carpet falls away, revealing the live garden below.
      const fall=clamp((t-8700)/2700),night=1-smooth(fall*2);
      if(night>0){
        const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.75);
        bg.addColorStop(0,`rgba(58,22,57,${night})`);bg.addColorStop(.6,`rgba(22,10,31,${night})`);bg.addColorStop(1,`rgba(9,6,17,${night})`);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
        ctx.save();ctx.globalAlpha=night;
        for(const star of this.stars){ctx.fillStyle=`rgba(245,213,237,${.18+.45*(.5+.5*Math.sin(t/800+star.phase))})`;ctx.beginPath();ctx.arc(star.x,star.y,star.r,0,TAU);ctx.fill();}ctx.restore();
      }
      if(t<4200){
        this.setPhase(t<2800?'particles':'morph',t<2800?'Một điều dịu dàng đang thành hình':'Từ những hạt sáng, một đóa hoa nở');
        const gather=ease(t/2700),morph=smooth((t-2700)/1300);
        const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,this.heroSize);glow.addColorStop(0,'#e6a0cc24');glow.addColorStop(1,'#b76de000');ctx.fillStyle=glow;ctx.fillRect(cx-this.heroSize,cy-this.heroSize,this.heroSize*2,this.heroSize*2);
        ctx.save();ctx.globalCompositeOperation='screen';
        for(const p of this.particles){
          const local=ease(clamp((t/2700-p.delay)/(1-p.delay))),swirl=(1-local)*2.8;
          const tx=p.tx*this.heroSize/2,ty=p.ty*this.heroSize/2;
          const x=mix(p.sx,tx,local),y=mix(p.sy,ty,local),angle=swirl+p.phase*.1*(1-gather);
          const jitter=Math.sin(t/480+p.phase)*(1-gather)*5;
          ctx.globalAlpha=(.35+.65*local)*(1-morph);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(cx+x*Math.cos(angle)-y*Math.sin(angle)+jitter,cy+x*Math.sin(angle)+y*Math.cos(angle),p.size*(.7+.4*local),0,TAU);ctx.fill();
        }ctx.restore();
        this.drawImage(0,cx,cy,this.heroSize*(.98+morph*.02),0,morph);
      }
      if(t>=4000&&t<6500){
        this.setPhase('bouquet','Từng lớp yêu thương, xoay thành một khu vườn');
        const stack=smooth((t-4000)/1400),exit=1-smooth((t-5900)/600);
        for(let i=9;i>=0;i--){const layer=clamp((stack*1.5-i*.055));const angle=t/1200*(i%2?1:-1)+i*TAU/9;const radius=this.heroSize*.25*layer;
          this.drawImage(i,cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius,this.heroSize*(.82+i*.035)*ease(layer*1.5),angle*.23,exit);
        }
        this.drawImage(0,cx,cy,this.heroSize*(1+stack*.12),t/3500,exit);
      }
      if(t>=5450){
        const spread=clamp((t-5450)/2650);
        if(t<8100)this.setPhase('spread','Cả một trời hoa, dành tặng bạn');
        else if(t<8700)this.setPhase('full','Rực rỡ như bạn. Dịu dàng như yêu thương.');
        else{this.setPhase('fall','Và đây là khu vườn của riêng bạn');this.reveal();}
        for(let i=0;i<this.flowers.length;i++){
          const f=this.flowers[i],growth=ease((spread-f.delay)/(1-f.delay));if(growth<=0)continue;
          const drop=clamp((fall-f.fallDelay)/(1-f.fallDelay));
          const spiral=(1-growth)*2.2,dx=f.x-cx,dy=f.y-cy;
          const x=cx+(dx*Math.cos(spiral)-dy*Math.sin(spiral))*growth+Math.sin(i*2.1+fall*5)*drop*70;
          const y=cy+(dx*Math.sin(spiral)+dy*Math.cos(spiral))*growth+(h+f.size*2)*drop**1.8;
          this.drawImage(f.image,x,y,f.size*(.15+.85*growth),f.rotation+(1-growth)*f.spin+t*.000015+drop*f.spin,1-smooth((drop-.78)/.22));
        }
      }
      this.frame=requestAnimationFrame(n=>this.tick(n));
    }
    finish(notify=true){
      if(!this.running)return;
      this.hadFocus=this.root.contains(document.activeElement);
      this.running=false;this.runId++;cancelAnimationFrame(this.frame);this.frame=0;
      this.root.hidden=true;this.root.dataset.phase='done';this.ctx?.clearRect(0,0,this.w||0,this.h||0);
      // Release per-run particles/sprites; decoded flower textures are shared with replays.
      this.particles=[];this.flowers=[];this.stars=[];
      if(notify){this.reveal();this.onFinish?.();}
    }
  }
  window.FloralEntrance=FloralEntrance;
})();
