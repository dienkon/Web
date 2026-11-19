import { gsap } from 'gsap';
import { tribute } from '../config.js';

export const settled = {
  0: { camera: 0, heart: 0, morph: 0, flight: 0, sink: 0, burst: 0, roll: 0, opening: 0, book: 0, growth: 0, typeMorph: 0, typeOpacity: 0, enter: 0 },
  1: { camera: 0, heart: 1, morph: 0, flight: 0, sink: 0, burst: 0 },
  2: { camera: .72, heart: 1, morph: 1, flight: 1.25, sink: 0, burst: 0 },
  3: { camera: .14, book: 0, burst: 0 },
  4: { camera: .25, roll: 0, enter: 0, burst: 0 },
  5: { camera: .15, opening: 0, enter: 0, burst: 0 },
  6: { camera: -.36, heart: 0, morph: 0, sink: 1, growth: 1, burst: 0 },
  7: { camera: 0, heart: 1, morph: 1, flight: 1.2, sink: 0, typeMorph: 1, burst: 0 },
};

export class TimelineManager {
  state = { ...settled[0] };
  motion = true;

  constructor(wash, redraw) { this.wash = wash; this.redraw = redraw; }

  cancel() {
    this.active?.kill();
    this.active = null;
    gsap.set(this.wash, { opacity: 0 });
  }

  complete() {
    this.active?.progress(1);
  }

  scene(to, from, flipType, flightComplete) {
    const s = this.state;
    this.cancel();
    Object.assign(s, settled[0], settled[to]);
    if (!this.motion) {
      if (to === 7) flipType();
      this.redraw();
      return;
    }
    const duration = tribute.transition;
    const tl = this.active = gsap.timeline({ onUpdate: this.redraw });
    switch (to) {
      case 1:
        Object.assign(s, { heart: 0, camera: -2.35, burst: .72 });
        tl.to(s,{heart:1,camera:0,burst:0,duration,ease:'power2.inOut'});
        break;
      case 2:
        Object.assign(s,{ morph:0,flight:0,camera:0,burst:0 });
        tl.to(s,{burst:.11,duration:.27,ease:'power3.out'})
          .to(s,{morph:1,burst:0,duration:duration*.91,ease:'power2.inOut'},.19)
          .to(s,{flight:1.45,camera:1.15,duration:tribute.butterflyFlight-1.1,ease:'sine.inOut'},.68)
          .call(flightComplete,[],tribute.butterflyFlight);
        break;
      case 3:
        s.camera=from===2 ? -1.18 : -.72;
        tl.to(this.wash,{opacity:from===2 ? .66 : .19,duration:.34,ease:'sine.out'},0)
          .to(this.wash,{opacity:0,duration:1.2,ease:'sine.out'},.34)
          .to(s,{camera:.14,duration,ease:'power2.out'},0);
        break;
      case 4:
        s.camera=-1.45;
        s.enter=1;
        tl.to(s,{camera:.25,enter:0,duration,ease:'power2.out'});
        break;
      case 5:
        s.enter=1;
        tl.to(s,{enter:0,duration,ease:'power3.out'});
        break;
      case 6:
        Object.assign(s,{sink:.002,growth:0,camera:1.6});
        tl.to(s,{sink:1,duration:1.85,ease:'sine.inOut'})
          .to(s,{growth:1,duration:3.25,ease:'power1.out'},.88)
          .to(s,{camera:-.36,duration:3.1,ease:'sine.out'},.05);
        break;
      case 7:
        Object.assign(s,{typeMorph:0,typeOpacity:1,camera:0,flight:.65});
        tl.to(s,{typeMorph:1,flight:1.45,duration:2.25,ease:'power2.inOut'})
          .to(s,{typeMorph:.13,flight:2.4,duration:.55,ease:'power2.in'},3.85)
          .call(flipType)
          .to(s,{typeMorph:1,typeOpacity:.48,duration:1.65,ease:'power2.out'})
          .to(s,{typeOpacity:0,duration:1.75,ease:'sine.in'});
        break;
      default:
        this.redraw();
    }
  }

  before(next, current, callback) {
    this.cancel();
    if (!this.motion || ![[0,1],[3,4],[4,5],[5,6]].some(([a,b]) => a===current && b===next)) {
      callback();
      return;
    }
    const s = this.state;
    const tl = this.active = gsap.timeline({ onUpdate: this.redraw, onComplete: callback });
    if (current===0) {
      s.typeMorph=1;
      s.typeOpacity=1;
      tl.to(s,{typeMorph:0,burst:.23,duration:.67,ease:'power2.in'},0);
      return;
    }
    if (current===3) tl.to(s,{book:1,burst:.87,duration:.88,ease:'power2.inOut'});
    if (current===4) tl.to(s,{roll:1,burst:.84,duration:1.32,ease:'power2.inOut'});
    if (current===5) tl.to(s,{burst:1,duration:.82,ease:'power2.in'});
    tl.to(this.wash,{opacity:current === 4 ? .13 : .27,duration:.32}, '<.35');
  }

  open(callback) {
    this.cancel();
    const s = this.state;
    if (!this.motion) {
      s.opening=1;
      callback();
      this.redraw();
      return;
    }
    this.active = gsap.timeline({ onComplete: callback, onUpdate: this.redraw })
      .to(s,{opening:1,duration:2.05,ease:'power2.inOut'})
      .to(s,{burst:.7,duration:.6,ease:'power2.out'},.25)
      .to(s,{burst:0,duration:1,ease:'power2.in'},.87);
  }
}
