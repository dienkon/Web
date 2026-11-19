import * as THREE from 'three';
import { drawnTexture, texturedSurface, glow } from '../effects/materials.js';

function triangle(points, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(),3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function seam(points, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .46 }));
}

export function makeEnvelope() {
  const group = new THREE.Group();
  const model = new THREE.Group();
  const light = glow('#df9c4d', 5.7);
  light.position.set(0, -.55, -1.5);
  light.material.uniforms.opacity.value = .29;
  group.add(light, model);
  const paper = texturedSurface('#fff1d9', '#ffffff', 23);
  const front = new THREE.MeshStandardMaterial({ color: '#f4d7aa', map: paper, roughness: .86, side: THREE.DoubleSide });
  const cream = new THREE.MeshStandardMaterial({ color: '#ffe6bb', map: paper, roughness: .88, side: THREE.DoubleSide });
  const back = new THREE.MeshStandardMaterial({ color: '#d7af80', map: paper, roughness: .86 });
  const inside = new THREE.Mesh(new THREE.BoxGeometry(4.12, 2.58, .08), back);
  inside.position.z = -.071;
  model.add(inside);
  const cardTexture = drawnTexture(512, 640, (ctx,w,h) => {
    ctx.fillStyle = '#fff0d5'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#ac755e'; ctx.lineWidth = 2; ctx.strokeRect(28,28,w-56,h-56);
    ctx.fillStyle = '#8d443b'; ctx.textAlign = 'center';
    ctx.font = 'italic 57px Georgia'; ctx.fillText('Kính gửi', w/2, 120);
    ctx.font = 'italic 43px Georgia'; ctx.fillText('thầy cô', w/2, 184);
    ctx.fillStyle = '#b78a71a0';
    for (let i=0;i<10;i++) ctx.fillRect(75,240+i*29, w-150-(i%3)*25,2);
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(3.65,4.45), new THREE.MeshStandardMaterial({
    map: cardTexture, roughness: .94, side: THREE.DoubleSide,
  }));
  model.add(card);
  model.add(triangle([[-2.06,-1.29,.071],[-2.06,1.29,.071],[.36,-.18,.113]], front));
  model.add(triangle([[2.06,1.29,.075],[2.06,-1.29,.075],[-.36,-.18,.113]], front));
  model.add(triangle([[-2.06,-1.29,.116],[2.06,-1.29,.116],[0,.52,.148]], cream));
  model.add(seam([[-2.06,-1.29,.123],[0,.52,.153],[2.06,-1.29,.123]], '#a16a4e'));
  const pivot = new THREE.Group();
  pivot.position.set(0,1.29,.158);
  pivot.add(triangle([[-2.06,0,0],[0,-1.76,.078],[2.06,0,0]], cream));
  pivot.add(seam([[-2.05,-.028,.019],[0,-1.72,.086],[2.05,-.028,.019]], '#ad755a'));
  model.add(pivot);

  const wax = new THREE.Group();
  const waxTexture = drawnTexture(256,256,(ctx,w,h) => {
    ctx.translate(w/2,h/2);
    const gradient=ctx.createRadialGradient(-30,-40,20,0,0,112);
    gradient.addColorStop(0,'#d95b57'); gradient.addColorStop(.72,'#b32436'); gradient.addColorStop(1,'#65192c');
    ctx.beginPath();
    for(let i=0;i<=160;i++) {
      const a=i/160*Math.PI*2;
      const radius=113 + Math.cos(a*8)*5 + Math.sin(a*13)*2;
      ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);
    }
    ctx.fillStyle=gradient;ctx.fill();
    ctx.beginPath();ctx.arc(0,0,79,0,Math.PI*2);
    ctx.strokeStyle='#ef797366';ctx.lineWidth=5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,44);
    ctx.bezierCurveTo(-116,-30,-37,-75,0,-25);
    ctx.bezierCurveTo(37,-75,116,-30,0,44);
    ctx.fillStyle='#ef9082';ctx.fill();
  });
  const waxFront = new THREE.Mesh(new THREE.PlaneGeometry(.97,.97), new THREE.MeshStandardMaterial({
    map: waxTexture, transparent: true, alphaTest: .12, roughness: .31, metalness: .13, side: THREE.DoubleSide,
  }));
  const waxDepth = new THREE.Mesh(new THREE.CylinderGeometry(.435,.45,.09,29), new THREE.MeshStandardMaterial({ color: '#871d31', roughness: .39 }));
  waxDepth.rotation.x = Math.PI / 2;
  waxFront.position.z = .05;
  wax.add(waxDepth, waxFront);
  model.add(wax);
  return {
    group,
    update(time, opening, compact, flightIn) {
      const advance = THREE.MathUtils.smoothstep(opening,.15,.86);
      const pull = THREE.MathUtils.smoothstep(opening,.39,.83);
      const seal = THREE.MathUtils.smoothstep(opening,0,.64);
      model.position.set(compact ? 0 : 3.05, (compact ? 1.43 : .15) + Math.sin(time*.75)*.13 - advance*.35, -3.6 * flightIn + advance * 1.1);
      model.rotation.set(Math.sin(time*.62)*.088, Math.sin(time*.51)*.24*(1-advance), -.09 + Math.sin(time*.7)*.026);
      model.scale.setScalar((compact ? .82 : 1.13) * (.28 + .72 * (1 - flightIn)));
      light.position.x = model.position.x;
      pivot.rotation.x = advance * 2.62;
      wax.position.set(seal*1.15, -.31 + seal*.55, .24 + seal*1.4);
      wax.rotation.set(seal*1.6,seal*.9,seal*2.1);
      wax.scale.setScalar(1 - seal*.98);
      card.visible = opening > .38;
      card.position.set(0, -.08 + pull * 1.9, -.004 + pull*.5);
      card.scale.set(1, .48 + pull*.49, 1);
      card.rotation.x = -.24 * (1-pull);
    },
  };
}
