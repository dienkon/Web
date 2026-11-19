import * as THREE from 'three';
import { asset, memories } from '../config.js';
import { drawnTexture, glow, texturedSurface } from '../effects/materials.js';
import { makeSwarm, swarmPoint } from '../effects/flight.js';

const greeting = ['Chúc mừng ngày', 'Nhà giáo Việt Nam', '20/11'];

export function makeClassroom(onRedraw) {
  const group = new THREE.Group();
  const boardTexture = drawnTexture(768,392,(ctx,w,h) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff4da';
    ctx.strokeStyle = '#fff4dad8';
    ctx.lineWidth = 1.65;
    ctx.shadowColor = '#fff6d292';
    ctx.shadowBlur = 3;
    greeting.forEach((line,i) => {
      ctx.font = i === 2 ? 'italic 83px Georgia' : 'italic 64px Georgia';
      ctx.fillText(line,w/2,105+i*101);
    });
    ctx.beginPath();
    ctx.moveTo(256,329); ctx.quadraticCurveTo(394,311,510,329); ctx.stroke();
  });
  const progress = { value: 0 };
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { progress, ink: { value: boardTexture } },
    vertexShader: `varying vec2 coords; void main(){coords=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform float progress; uniform sampler2D ink; varying vec2 coords;
      void main(){
        vec4 tone=texture2D(ink,coords);
        float y=(1.-coords.y)*3.;
        float order=(floor(y)+coords.x*.9)/3.;
        float powder=.67+.33*fract(sin(dot(floor(coords*vec2(768.,392.)),vec2(23.619,65.12)))*19991.29);
        gl_FragColor=vec4(tone.rgb,tone.a*powder*smoothstep(order-.025,order+.007,progress));
        #include <colorspace_fragment>
      }
    `,
  }));
  group.add(chalk);

  const table = new THREE.Group();
  group.add(table);
  const wood = texturedSurface('#8d593a', '#e0a874', 50);
  const desktop = new THREE.Mesh(new THREE.BoxGeometry(4.05,.16,2.15), new THREE.MeshStandardMaterial({
    color: '#bb8257', map: wood, roughness: .82,
  }));
  desktop.position.set(0,-.15,.28);
  table.add(desktop);
  const chalkStick = new THREE.Mesh(new THREE.CylinderGeometry(.032,.034,.35,12), new THREE.MeshStandardMaterial({color:'#fcf5dc',roughness:.98}));
  chalkStick.rotation.set(.1,0,Math.PI/2.6);
  chalkStick.position.set(-1.53,-.03,.64);
  const sponge = new THREE.Group();
  const eraser = new THREE.Mesh(new THREE.BoxGeometry(.45,.095,.18), new THREE.MeshStandardMaterial({color:'#ae7852',map:wood,roughness:.9}));
  const felt = new THREE.Mesh(new THREE.BoxGeometry(.45,.057,.18), new THREE.MeshStandardMaterial({color:'#586356',roughness:1}));
  felt.position.y=-.066;
  sponge.add(eraser,felt);
  sponge.position.set(-1.49,.034,.36);
  sponge.rotation.y=-.3;
  table.add(chalkStick,sponge);

  const book = new THREE.Group();
  book.position.set(.26,.01,.22);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(2.36,.11,1.5), new THREE.MeshStandardMaterial({ color: '#433c4b' }));
  book.add(cover);
  const pageTexture = drawnTexture(512,512,(ctx,w,h) => {
    ctx.fillStyle='#ffedc7';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#846b9c4d';ctx.lineWidth=2;
    for(let i=0;i<13;i++) {
      ctx.beginPath();ctx.moveTo(12,65+i*31);ctx.lineTo(w-12,65+i*31);ctx.stroke();
    }
    ctx.fillStyle='#6f557c';
    ctx.font='italic 48px Georgia';ctx.fillText('Ký ức',61,100);
    ctx.strokeStyle='#a94c5680';
    ctx.beginPath();ctx.moveTo(48,0);ctx.lineTo(48,h);ctx.stroke();
  });
  const sheets = new THREE.MeshStandardMaterial({ color: '#f5e6ca', map: pageTexture, roughness: .86, side: THREE.DoubleSide });
  for (const sign of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(1.12,1.42), sheets);
    page.rotation.x = -Math.PI/2;
    page.position.set(sign*.56,.067,0);
    book.add(page);
  }
  const hinge = new THREE.Group();
  hinge.position.y = .082;
  const page = new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.39,12,1),sheets);
  const points = page.geometry.attributes.position;
  for(let i=0;i<points.count;i++) points.setZ(i,Math.sin((points.getX(i)+.55)*2.85)*.094);
  page.geometry.computeVertexNormals();
  page.rotation.x = -Math.PI/2;
  page.position.x = .55;
  hinge.add(page);
  book.add(hinge);
  table.add(book);
  const visitor = makeSwarm(1);
  const nest = new THREE.Vector3();
  visitor.group.scale.setScalar(.73);
  table.add(visitor.group);

  const dustLight = glow('#ffb878',4);
  dustLight.position.set(-3,.4,-2);
  dustLight.material.uniforms.opacity.value = .2;
  group.add(dustLight);
  const windowRay = new THREE.Mesh(new THREE.PlaneGeometry(8,4.8),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{clock:{value:0}},
    vertexShader:`varying vec2 coords;void main(){coords=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      uniform float clock;varying vec2 coords;
      void main(){
        float q=coords.y+coords.x*.64+.018*sin(clock*.53+coords.x*2.);
        float beam=exp(-abs(q-.79)*26.)*.18+exp(-abs(q-.61)*33.)*.10;
        float fade=sin(coords.x*3.14159)*sin(coords.y*3.14159);
        gl_FragColor=vec4(1.,.69,.38,beam*fade);
      }
    `,
  }));
  windowRay.position.set(-2.1,.57,1.2);
  group.add(windowRay);
  const photos = new THREE.Group();
  const prints = [0,4,12].map((index) => {
    const map = new THREE.TextureLoader().load(asset(memories[index].image), onRedraw);
    map.colorSpace = THREE.SRGBColorSpace;
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(1.03,.69),new THREE.MeshBasicMaterial({
      map, side:THREE.DoubleSide, transparent:true, depthWrite:false,
    }));
    photos.add(photo);
    return photo;
  });
  table.add(photos);

  return {
    group,
    book: desktop,
    update(time, elapsed, open, width, height, camera) {
      const compact = width / height < 1.08;
      const worldHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      const worldWidth = worldHeight * width / height;
      const artZoom = Math.max(width/1536,height/1024);
      const artX = (width-1536*artZoom)*(compact ? .60 : .5);
      const artY = (height-1024*artZoom)*.50;
      chalk.position.set(
        ((artX + 1045*artZoom)/width-.5)*worldWidth,
        (.5-(artY + 372*artZoom)/height)*worldHeight,
        .02,
      );
      chalk.scale.set(Math.min(4,475*artZoom/width*worldWidth),Math.min(2.24,300*artZoom/height*worldHeight),1);
      chalk.rotation.z = -.021;
      progress.value = Math.max(0, Math.min(1.04,(elapsed-.24)*.31));
      table.position.set(compact ? 0 : 3.45, compact ? -.03 : -2.75, 3.9 + open*.9 + Math.sin(time*.35)*.08);
      table.rotation.set(.12, -.24 + Math.sin(time*.25)*.09, -.07);
      table.scale.setScalar(compact ? .62 : .89);
      hinge.rotation.z = open*2.88 + Math.max(0,Math.sin(time*.8))*.23;
      windowRay.material.uniforms.clock.value=time;
      const approach=THREE.MathUtils.smoothstep(elapsed,1.35,4.4);
      const spread=1-approach;
      const flutter=time*(.38+spread*.6);
      swarmPoint(0,flutter,spread,nest);
      visitor.group.position.set(.62-spread*1.71,.17+spread*1.55+open*.32,.22-spread*.75);
      visitor.group.position.addScaledVector(nest,-.73);
      visitor.update(flutter,Math.min(1,elapsed*.65)*(1-open*.92),spread);
      photos.visible=open>.08;
      prints.forEach((photo,index)=>{
        const rising=THREE.MathUtils.smoothstep(open,index*.10,.82+index*.06);
        photo.position.set(.25+(index-1)*1.29*rising,.12+rising*(1.35+index*.39),.3+rising*(1.65+index*.22));
        photo.rotation.set(-Math.PI*.5*(1-rising),-.3+index*.27,(index-1)*.25*rising);
        photo.material.opacity=THREE.MathUtils.smoothstep(rising,0,.26);
      });
    },
  };
}
