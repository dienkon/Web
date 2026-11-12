import * as THREE from 'three';

// Viewing studio only. Kept separate from the scientific specimen coordinates.
export function specimenEnvironment(object, up = 'y') {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const scale = Math.max(size.x, size.y, size.z, 1);
  const studio = new THREE.Group(); studio.name = 'Không gian trưng bày';
  const material = (color, roughness = .75, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const add = (geometry, mat, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x,y,z); mesh.receiveShadow = true; studio.add(mesh); return mesh;
  };
  const floor = material('#b6cbd0'), edge = material('#607f88', .35, .35), glass = material('#deedf0', .2, .1);
  add(new THREE.BoxGeometry(scale*7,scale*.07,scale*6),floor,0,-scale*.10,0);
  add(new THREE.CylinderGeometry(scale*.72,scale*.78,scale*.11,64),edge,0,-scale*.02,0);
  add(new THREE.CylinderGeometry(scale*.69,scale*.69,scale*.035,64),glass,0,scale*.05,0);
  add(new THREE.BoxGeometry(scale*7,scale*3,scale*.07),material('#cfdee0'),0,scale*1.4,-scale*2.8);
  // Rack and sealed sample containers provide scale cues without depicting reagents.
  add(new THREE.BoxGeometry(scale*.9,scale*.06,scale*.35),edge,scale*1.55,0,-scale*.9);
  for (let i=0;i<4;i++) {
    add(new THREE.CylinderGeometry(scale*.07,scale*.07,scale*.36,20),glass,scale*(1.25+i*.2),scale*.20,-scale*.9);
    add(new THREE.CylinderGeometry(scale*.077,scale*.077,scale*.035,20),material('#438999'),scale*(1.25+i*.2),scale*.40,-scale*.9);
  }
  if (up === 'z') { studio.rotation.x = Math.PI/2; studio.position.set(center.x,center.y,bounds.min.z-scale*.10); }
  else studio.position.set(center.x,bounds.min.y-scale*.10,center.z);
  studio.userData.interpretation = 'Illustrative display studio; not part of crystal geometry or measured specimen.';
  return studio;
}
