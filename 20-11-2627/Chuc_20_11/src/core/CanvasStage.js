import { asset, memories } from '../config.js';
import { random } from '../effects/materials.js';

const tau=Math.PI*2;
const pollen=random(115);
const specks=Array.from({length:360},()=>[pollen(),pollen(),pollen(),pollen()]);

export class CanvasStage {
  pointer={x:0,y:0};
  clock=0;
  frameIndex=0;
  dragTarget=0;
  flowers=[];
  fallback=true;

  constructor(stage, redraw) {
    this.stage=stage;
    this.redraw=redraw;
    this.canvas=document.createElement('canvas');
    this.ctx=this.canvas.getContext('2d');
    this.images=new Map();
    this.resize();
    stage.append(this.canvas);
  }

  dispose(){this.canvas.remove();}
  setScene(index){this.index=index;this.frameIndex=0;this.lastTime=0;}
  setType(){}
  frame(index){this.frameIndex=index;}

  resize() {
    this.w=this.stage.clientWidth;
    this.h=this.stage.clientHeight;
    this.canvas.width=this.w;
    this.canvas.height=this.h;
    this.compact=this.w/this.h<1.08;
  }

  image(index) {
    if(!this.images.has(index)) {
      const image=new Image();
      image.addEventListener('load',this.redraw,{once:true});
      image.src=asset(memories[index].image);
      this.images.set(index,image);
    }
    return this.images.get(index);
  }

  pick(x,y) {
    const box=this.canvas.getBoundingClientRect();
    x-=box.left;
    y-=box.top;
    if(this.index===6) return this.flowers.find((plant)=>Math.hypot(x-plant.x,y-plant.y)<plant.r*1.55)?.i;
    if(this.index===4 && Math.abs(y-(this.compact?.61:.48)*this.h)<this.h*.18) {
      const index=this.frameIndex+Math.round((x-this.cx)/this.filmWidth);
      if(index>=0 && index<memories.length) return index;
    }
    if([1,3,5].includes(this.index) && Math.abs(x-this.cx)<this.w*.31 && y>this.h*.13 && y<this.h*.7) return 'next';
  }

  render(now,state,motion) {
    if(motion && this.lastTime) this.clock+=Math.min(50,now-this.lastTime)/1000;
    this.lastTime=now;
    const {ctx,w,h,clock,compact,index}=this;
    if(!ctx || !w || !h) return;
    this.cx=w*(compact?.5:.68);
    const cy=h*(compact?.31:.47);
    ctx.clearRect(0,0,w,h);
    ctx.globalAlpha=1;
    for(const [x,y,phase,shade] of specks) {
      const drift=(phase-.5)*(.1+clock*.002);
      const px=((x+drift+1)%1)*w+this.pointer.x*8*phase;
      const py=((y+Math.sin(phase*8+clock*.65)*.032+1)%1)*h;
      ctx.globalAlpha=(.49+.26*Math.sin(clock*.8+phase*18))*shade;
      ctx.fillStyle=shade>.53?'#ffcc8d':'#eab7f4';
      ctx.beginPath();ctx.arc(px,py,.35+shade*1.05,0,tau);ctx.fill();
    }
    ctx.globalAlpha=1;
    if(index===1 || index===2) this.heart(cy,state);
    if(index===2 || index===6 || index===7) this.butterflies(cy,state);
    if(index===3) {
      ctx.font=`italic ${Math.min(w*.044,h*.067)}px Georgia`;
      ctx.textAlign='center';ctx.fillStyle='#fff0ce';
      ctx.shadowColor='#141011';ctx.shadowBlur=8;
      ctx.fillText('Chúc mừng ngày',this.cx,h*.31);
      ctx.fillText('Nhà giáo Việt Nam 20/11',this.cx,h*.39);
      ctx.shadowBlur=0;
    }
    if(index===4) this.film(state);
    if(index===5) this.envelope(cy,state.opening);
    if(index===6) this.garden(state.growth);
    if(index===7) this.petals();
  }

  heart(cy,state) {
    const {ctx,w,h,clock,cx}=this;
    const scale=Math.min(w*.023,h*.013)*(1+.026*Math.sin(clock*2.1));
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*22);
    glow.addColorStop(0,'#dc8d4950');glow.addColorStop(1,'#d66e1400');
    ctx.fillStyle=glow;ctx.fillRect(cx-scale*22,cy-scale*22,scale*44,scale*44);
    for(const [x,y,f,s] of specks) {
      const a=x*tau;
      const thickness=.82+y*.2;
      const tX=cx+Math.sin(a)**3*16*scale*thickness;
      const tY=cy-(13*Math.cos(a)-5*Math.cos(a*2)-2*Math.cos(a*3)-Math.cos(a*4)-2)*scale*thickness;
      const cX=cx+Math.cos((Math.floor(f*18))*2.4+clock*.63)*w*.26;
      const cY=cy+Math.sin((Math.floor(f*18))*2.4+clock*.49)*h*.26;
      const x0=x*w+(tX-x*w)*state.heart;
      const y0=y*h+(tY-y*h)*state.heart;
      ctx.globalAlpha=(.45+s*.53)*(1-state.morph*.89);
      ctx.fillStyle=s>.68?'#fff3b2':'#ffc67c';
      const dx=(cX-x0)*state.morph,dy=(cY-y0)*state.morph;
      ctx.beginPath();ctx.arc(x0+dx,y0+dy,.7+s*1.7,0,tau);ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  butterflies(cy,state) {
    const {ctx,w,h,clock,cx,index}=this;
    const rand=random(219);
    for(let i=0;i<19;i++) {
      const phase=rand()*tau, speed=rand()*.48+.23;
      const size=4+rand()*9;
      const x=cx+Math.cos(phase+clock*speed)*w*(.07+rand()*.16);
      const y=(index===6?h*.57:cy)+Math.sin(phase+clock*speed*.76)*h*.16 - (index===7?state.flight*h*.10:0);
      const width=size*(.2+Math.abs(Math.sin(clock*(9+speed)+phase))*.8);
      ctx.globalAlpha=(index===2?state.morph:index===7?1-state.typeMorph:state.growth)*.76;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.cos(phase+clock*.8)*.45);
      ctx.fillStyle=i%3?'#ffd090':'#e9addb';
      for(const side of [-1,1]) {
        ctx.beginPath();ctx.moveTo(0,0);
        ctx.bezierCurveTo(side*width*.2,-size,side*width*1.46,-size*1.1,side*width*.92,-size*.22);
        ctx.bezierCurveTo(side*width,.58*size,side*width*.2,size,0,0);ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }

  film(state) {
    const {ctx,w,h,cx,compact}=this;
    this.filmWidth=Math.min(w*.54,h*.355);
    const artWidth=this.filmWidth*.92;
    const artHeight=artWidth*.645;
    const cy=h*(compact?.61:.48);
    for(let offset=-3;offset<=3;offset++) {
      const index=this.frameIndex+offset;
      if(index<0||index>=memories.length) continue;
      const image=this.image(index);
      ctx.save();
      ctx.translate(cx+offset*this.filmWidth*(1-state.roll*.8),cy+Math.sin(offset*.7)*artHeight*.34);
      ctx.rotate(Math.sin(offset*.5)*.14+state.roll*offset*.28+this.dragTarget*.06);
      ctx.scale(1-state.roll*.6,1-state.roll*.6);
      ctx.globalAlpha=(offset===0?1:.64)*(1-state.roll*.81);
      ctx.fillStyle='#151320';ctx.strokeStyle='#be9265';ctx.lineWidth=1;
      ctx.fillRect(-this.filmWidth*.5,-artHeight*.66,this.filmWidth,artHeight*1.32);
      ctx.strokeRect(-this.filmWidth*.5,-artHeight*.66,this.filmWidth,artHeight*1.32);
      if(image.complete&&image.naturalWidth) ctx.drawImage(image,-artWidth*.5,-artHeight*.5,artWidth,artHeight);
      ctx.fillStyle='#ba8d69';
      for(const sign of [-1,1]) for(let k=-3;k<=3;k++) ctx.fillRect(k*this.filmWidth*.125-3,sign*artHeight*.585-2,6,4);
      ctx.restore();
    }
  }

  envelope(cy,open) {
    const {ctx,cx,w,h}=this;
    const width=Math.min(w*.65,h*.53);
    const height=width*.623;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.085);ctx.shadowColor='#ffce7e64';ctx.shadowBlur=21;
    ctx.fillStyle='#d5ad7f';ctx.fillRect(-width*.5,-height*.5,width,height);
    ctx.shadowBlur=0;
    ctx.fillStyle='#fff1d8';ctx.fillRect(-width*.43,-height*(.46+open*.82),width*.86,height*.88);
    ctx.fillStyle='#e4c69e';ctx.fillRect(-width*.5,-height*.29,width,height*.79);
    for(const sign of [-1,1]) {
      ctx.beginPath();ctx.moveTo(sign*width*.5,-height*.5);ctx.lineTo(0,height*.14);ctx.lineTo(sign*width*.5,height*.5);
      ctx.closePath();ctx.fillStyle=sign===1?'#f4d6af':'#ecd1ad';ctx.fill();
    }
    ctx.beginPath();ctx.moveTo(-width*.5,-height*.5);ctx.lineTo(width*.5,-height*.5);ctx.lineTo(0,height*(.14-open*1.28));ctx.closePath();
    ctx.fillStyle='#fff0d6';ctx.fill();
    ctx.globalAlpha=1-open;
    ctx.fillStyle='#a62d42';ctx.beginPath();ctx.arc(0,height*.11,height*.16,0,tau);ctx.fill();
    const r=height*.08;
    ctx.translate(0,height*.104);
    ctx.beginPath();ctx.moveTo(0,r);
    ctx.bezierCurveTo(-r*2,-r*.44,-r*.71,-r*1.57,0,-r*.55);
    ctx.bezierCurveTo(r*.71,-r*1.57,r*2,-r*.44,0,r);ctx.fillStyle='#fb9b8f';ctx.fill();
    ctx.restore();
  }

  garden(growth) {
    this.flowers.length=0;
    const {ctx,w,h,clock}=this;
    const palette=['#ffc858','#db7198','#eda9d9','#ffd1af'];
    const rand=random(91);
    for(let i=0;i<32;i++) {
      const far=i<22;
      const x=w*(.06+rand()*.88);
      const base=h*(far?.58+rand()*.20:.69+rand()*.14);
      const length=h*(far?.035+rand()*.074:.095+rand()*.112);
      const radius=Math.min(w*.05,h*.033)*(far?.4+rand()*.57:.94+rand()*.4);
      const delay=rand()*.38;
      const f=Math.max(0,Math.min(1,(growth-delay)*1.6));
      const y=base-length*f;
      const top=x+Math.sin(clock+i)*5*f;
      ctx.beginPath();ctx.moveTo(x,base);ctx.quadraticCurveTo(x-8,y+length*.4,top,y);
      ctx.strokeStyle='#79a990';ctx.lineWidth=far?1:2;ctx.stroke();
      ctx.fillStyle=palette[i%4];
      for(let j=0;j<9;j++) {
        const a=j/9*tau;
        ctx.beginPath();ctx.ellipse(top+Math.cos(a)*radius*.58*f,y+Math.sin(a)*radius*.49*f,radius*.61*f,radius*.26*f,a,0,tau);ctx.fill();
      }
      ctx.beginPath();ctx.arc(top,y,radius*.27*f,0,tau);ctx.fillStyle=i%4===0?'#825237':'#ffd97e';ctx.fill();
      if(f>.35) this.flowers.unshift({x:top,y,r:radius,i});
    }
  }

  petals() {
    const {ctx,w,h,clock}=this;
    ctx.fillStyle='#e7aac5';
    ctx.globalAlpha=.46;
    for(const [x,y,r] of specks.slice(0,42)) {
      ctx.beginPath();ctx.ellipse(x*w+Math.sin(clock+x*10)*12,((y+clock*.029)%1)*h,2+r*3,1.4,r*20+clock,0,tau);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
}
