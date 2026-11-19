import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { tribute } from '../config.js';
import { makeSky, disposeTree, random } from '../effects/materials.js';
import { makeParticles, makeRipples, makeFinalHeart } from '../effects/particles.js';
import { makeSwarm } from '../effects/flight.js';
import { makeFilm } from '../scenes/FilmScene.js';
import { makeEnvelope } from '../scenes/LetterScene.js';
import { makeClassroom } from '../scenes/ClassroomScene.js';
import { makeGarden } from '../scenes/FlowerScene.js';

const backplates = new Set([0,3,6,7]);
const flightPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,0,0), new THREE.Vector3(-.32,.11,.16),
  new THREE.Vector3(.16,.56,.38), new THREE.Vector3(.74,.48,.94), new THREE.Vector3(.44,.91,1.46),
]);

function fallingPetals() {
  const rand = random(2027), data = [];
  for (let i = 0; i < 130; i++) data.push((rand() - .5) * 20,rand(),(rand() - .7) * 7);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
  const material = new THREE.ShaderMaterial({
    uniforms:{clock:{value:0},enabled:{value:0},ratio:{value:1}},
    transparent:true,depthWrite:false,
    vertexShader:`
      uniform float clock,ratio; varying float turn;
      void main(){
        vec3 p=position;
        p.x+=sin(clock*.68+position.x)*.63;
        p.y=5.0-fract(position.y+clock*(.034+mod(abs(position.x),1.)*.022))*10.;
        vec4 v=modelViewMatrix*vec4(p,1.);
        turn=clock*.95+position.x*2.;
        gl_Position=projectionMatrix*v;
        gl_PointSize=clamp((9.+3.*sin(position.x))*ratio*11./max(4.,-v.z),2.,16.);
      }
    `,
    fragmentShader:`
      uniform float enabled; varying float turn;
      void main(){
        vec2 p=gl_PointCoord-.5;
        p=mat2(cos(turn),sin(turn),-sin(turn),cos(turn))*p;
        float d=length(p*vec2(2.65+abs(sin(turn*1.3)),4.5));
        float a=(1.-smoothstep(.6,1.,d))*enabled;
        gl_FragColor=vec4(mix(vec3(.77,.43,.59),vec3(1.,.78,.60),p.x+.5),a);
      }
    `,
  });
  const points = new THREE.Points(geometry,material);
  points.frustumCulled=false;
  return points;
}

export class SceneManager {
  static create(stage, performance, onRedraw, lost) {
    const canvas = document.createElement('canvas');
    const settings = { alpha:true, antialias:performance.tier!=='mobile', powerPreference:'high-performance' };
    const context = canvas.getContext('webgl2',settings);
    if (!context) return null;
    return new SceneManager(stage,canvas,context,settings,performance,onRedraw,lost);
  }

  constructor(stage,canvas,context,settings,performance,onRedraw,lost) {
    this.stage = stage;
    this.performance = performance;
    this.onRedraw = onRedraw;
    this.renderer = new THREE.WebGLRenderer({ canvas,context,...settings });
    this.renderer.setClearColor(0,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46,1,.1,76);
    this.flightOffset = new THREE.Vector3();
    this.clock = 0;
    this.elapsed = 0;
    this.pointer = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.click = new THREE.Vector2();
    this.ray = new THREE.Raycaster();
    canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();lost();},{once:true});
    this.sky=makeSky();
    this.particles=makeParticles(tribute.quality.ultra.particles);
    this.ripple=makeRipples();
    this.finalHeart=makeFinalHeart();
    this.swarm=makeSwarm();
    this.petals=fallingPetals();
    this.ambient=new THREE.HemisphereLight('#ffecc9','#9a729f',2.10);
    const moon = this.moon = new THREE.DirectionalLight('#ffd5a2',2.5);
    moon.position.set(2,5,6);
    const fill = this.fill = new THREE.DirectionalLight('#a0b5f4',1.1);
    fill.position.set(-4,1,-3);
    this.scene.add(this.sky,this.particles.points,this.ripple,this.finalHeart,this.swarm.group,this.petals,this.ambient,moon,fill);
    this.composer = null;
    stage.append(canvas);
    this.useQuality();
  }

  createBloom() {
    this.composer=new EffectComposer(this.renderer);
    this.renderPass=new RenderPass(this.scene,this.camera);
    this.bloom=new UnrealBloomPass(new THREE.Vector2(this.width,this.height),.52,.47,.46);
    this.output=new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
  }

  removeBloom() {
    this.bloom?.dispose();
    this.output?.dispose();
    this.composer?.dispose();
    this.composer=null;
    this.bloom=null;
    this.output=null;
  }

  useQuality() {
    const quality=this.performance.quality;
    this.ratio=this.performance.ratio;
    this.renderer.setPixelRatio(this.ratio);
    this.particles.uniforms.pixelRatio.value=this.ratio;
    this.petals.material.uniforms.ratio.value=this.ratio;
    this.finalHeart.material.uniforms.ratio.value=this.ratio;
    this.particleCount=quality.particles;
    if (!quality.bloom) this.removeBloom();
    this.resize();
    document.body.dataset.quality=this.performance.tier;
  }

  resize() {
    this.width=this.stage.clientWidth;
    this.height=this.stage.clientHeight;
    if (!this.height || !this.width) return;
    this.compact=this.width/this.height<1.08;
    this.camera.aspect=this.width/this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width,this.height,false);
    this.composer?.setPixelRatio(this.ratio);
    this.composer?.setSize(this.width,this.height);
    this.sky.material.uniforms.aspect.value=this.camera.aspect;
    this.positionType();
  }

  setScene(index) {
    this.detach();
    this.index=index;
    this.elapsed=0;
    this.filmPosition=this.filmTarget=0;
    this.focus=this.focusTarget=0;
    this.drag=this.dragTarget=0;
    this.lastTime=0;
    this.performance.reset();
    this.sky.visible=!backplates.has(index);
    this.ambient.intensity=index===5?1.38:2.10;
    this.moon.intensity=index===5?1.42:2.5;
    this.fill.intensity=index===5?.52:1.1;
    if (index === 3) this.local=makeClassroom(this.onRedraw);
    if (index === 4) this.local=makeFilm(this.onRedraw);
    if (index === 5) this.local=makeEnvelope();
    if (index === 6) {
      this.local=makeGarden(this.performance.quality.flowers);
      this.particles.seeds(this.local.positions);
    }
    if (this.local) this.scene.add(this.local.group);
  }

  detach() {
    if (!this.local) return;
    this.local.close?.();
    this.scene.remove(this.local.group);
    disposeTree(this.local.group);
    this.local=null;
  }

  dispose() {
    this.detach();
    this.removeBloom();
    disposeTree(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  setType(lines,element) {
    this.typeBox=element;
    this.typeAspect=this.particles.type(lines);
    this.positionType();
  }

  positionType() {
    if (!this.typeBox || ![0,7].includes(this.index) || !this.typeAspect) return;
    const box=this.typeBox.getBoundingClientRect();
    const height=2*12*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
    const size=Math.min(height*box.height/this.height*.72, height*this.camera.aspect*.92/this.typeAspect);
    this.particles.uniforms.typeSize.value=size;
    this.particles.uniforms.typeCenter.value.set(0,(.5-(box.top+box.height*.5)/this.height)*height,0);
    this.particles.uniforms.typeCenter.value.x=((box.left+box.width*.5)/this.width-.5)*height*this.camera.aspect;
    if(this.index===7) {
      const date=document.querySelector('.final-date').getBoundingClientRect();
      this.finalHeart.position.y=(.5-(date.top-31)/this.height)*height;
    }
  }

  frame(index,focus=false) {
    this.filmTarget=index;
    this.focusTarget=focus ? 1 : 0;
  }

  pick(clientX,clientY) {
    const box=this.renderer.domElement.getBoundingClientRect();
    this.click.set((clientX-box.left)/box.width*2-1,-(clientY-box.top)/box.height*2+1);
    this.ray.setFromCamera(this.click,this.camera);
    if (this.index===4) return this.ray.intersectObjects(this.local.frames.filter((frame)=>frame.visible))[0]?.object.userData.memory;
    if (this.index===6) {
      const hit=this.ray.intersectObjects(this.local.meshes)[0];
      return hit?.object.userData.plants[hit.instanceId]?.wish;
    }
    if (this.index===3) return this.ray.intersectObject(this.local.book).length ? 'next' : undefined;
    if ((this.index===1 || this.index===5) && Math.abs(this.click.x-(this.compact?0:.31))<.46 && Math.abs(this.click.y-(this.compact?.27:0))<.57) return 'next';
  }

  render(now,s,motion) {
    const frameTime=this.lastTime ? now-this.lastTime : 16.67;
    this.lastTime=now;
    const dt=Math.min(50,frameTime)/1000;
    if (motion) this.clock+=dt;
    this.elapsed += motion ? dt : 0;
    if (motion && !document.hidden && this.performance.observe(frameTime)) this.useQuality();
    const t=this.clock;
    const compact=this.compact;
    const index=this.index;
    const follow=1-Math.exp(-dt*3.5);
    this.look.lerp(this.pointer,follow);
    const still=motion ? 0 : 1;
    const center=compact ? 0 : 3.03;
    const lift=compact ? 1.35 : .10;
    const freeze=index===7;
    const parallax=motion && !freeze ? 1 : 0;
    const flying=index===2;
    if (flying) flightPath.getPoint(THREE.MathUtils.clamp(s.flight/1.5,0,1),this.flightOffset);
    else this.flightOffset.set(0,0,0);
    this.camera.position.set(
      this.look.x*.41*parallax + this.flightOffset.x*.29 + (index===3 ? Math.sin(t*.17)*.14*parallax : 0),
      this.look.y*.29*parallax + this.flightOffset.y*.31 + (index===6 ? .28*s.growth : 0),12-s.camera,
    );
    this.camera.lookAt(0,0,0);
    const U=this.particles.uniforms;
    U.clock.value=t;
    U.still.value=still;
    U.heart.value=(index===1||index===2||index===7)?s.heart:0;
    U.morph.value=(index===2||index===7)?s.morph:0;
    U.flight.value=s.flight;
    U.sink.value=index===6?s.sink:0;
    U.burst.value=s.burst;
    U.orbit.value=index===1 ? Math.sin(t*.5)*.49*parallax : 0;
    U.textMorph.value=index===7||index===0?s.typeMorph:0;
    U.density.value=[.34,1,.81,.68,.61,.62,1,1][index];
    U.strength.value=[.55,.96,.92,.62,.45,.61,.72,.96][index];
    if(index===2) U.strength.value*=1-THREE.MathUtils.smoothstep(s.morph,.76,1)*.87;
    if(index===6) U.strength.value*=1-s.growth*.82;
    if(index===7) U.strength.value*=s.typeOpacity;
    if(index===0&&s.typeOpacity>0) U.strength.value*=1+s.typeOpacity*.65;
    this.particles.drawCount([0,3,4,5].includes(index)&&s.burst<.025&&s.typeOpacity===0 ? Math.min(1020,this.particleCount) : this.particleCount);
    this.particles.points.position.set(
      index===1||index===2 ? center+this.flightOffset.x : 0,
      index===1||index===2 ? lift+this.flightOffset.y : index===3 ? s.burst*-2.1 : 0,
      this.flightOffset.z,
    );
    if(index===1||index===2) this.particles.points.scale.setScalar(compact ? .84 : 1.1);
    else this.particles.points.scale.setScalar(1);
    this.ripple.visible=index===1;
    this.ripple.position.x=center;
    this.ripple.position.y=lift-2.25;
    this.ripple.material.uniforms.clock.value=t;
    this.ripple.material.uniforms.strength.value=s.heart*.8;
    this.finalHeart.visible=index===7;
    this.finalHeart.material.uniforms.clock.value=t;
    this.finalHeart.material.uniforms.opacity.value=motion?THREE.MathUtils.smoothstep(this.elapsed,4.3,6.5)*.79:.75;

    this.swarm.group.position.set(
      index===7||index===6 ? 0 : index===3 ? -1.9 : center+this.flightOffset.x,
      index===7 ? 1.2+s.flight*.36 : index===6 ? -1.1 : index===3 ? -.6 : lift+this.flightOffset.y,
      this.flightOffset.z,
    );
    this.swarm.group.scale.setScalar(index===3?.48:index===6?.9:index===7?1.05:compact?.84:1.1);
    this.swarm.update(t,
      index===2 ? THREE.MathUtils.smoothstep(s.morph,.71,1) :
      index===3 ? .67 : index===6 ? .84*s.growth : index===7 ? (1-s.typeMorph)*.91 : 0,
      index===2||index===7?s.flight:index===3?.55:1.15,
    );
    this.petals.visible=index===5||index===6||index===7;
    this.petals.material.uniforms.clock.value=t;
    this.petals.material.uniforms.enabled.value=index===5?.56:index===6?.36:.74;
    this.sky.material.uniforms.clock.value=t;
    this.sky.material.uniforms.mood.value= index===5?.54:index===4?.24:index===2?.4:0;
    if(index===3) this.local.update(t,motion?this.elapsed:10,s.book,this.width,this.height,this.camera);
    if(index===4) {
      const factor=motion ? 1-Math.exp(-dt*8) : 1;
      this.filmPosition+=(this.filmTarget-this.filmPosition)*factor;
      this.focus+=(this.focusTarget-this.focus)*factor;
      this.drag+=(this.dragTarget-this.drag)*factor;
      this.local.update(t,this.filmPosition,this.focus,s.roll,this.drag,compact);
    }
    if(index===5) this.local.update(t,s.opening,compact,s.enter);
    if(index===6) this.local.update(t,s.growth);
    if(this.sky.visible && this.performance.quality.bloom) {
      if (!this.composer) { this.createBloom(); this.resize(); }
      this.bloom.strength=index===1?.52:index===2?.46:index===5?.115:.21;
      this.composer.render();
    } else {
      this.renderer.render(this.scene,this.camera);
    }
  }
}
