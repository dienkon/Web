import * as THREE from 'three';

/** An open hose with fixed topology. Deformation reuses every typed array and
 * frame vector; no GPU geometry is replaced during hand/camera movement. */
export class MutableTubeGeometry extends THREE.BufferGeometry {
 private readonly points = Array.from({length:4},(_,i)=>new THREE.Vector3(0,0,i/3));
 private readonly curve = new THREE.CatmullRomCurve3(this.points);
 private readonly lengths = new Float64Array(201);
 private readonly centers: THREE.Vector3[];
 private readonly tangents: THREE.Vector3[];
 private readonly normals: THREE.Vector3[];
 private readonly binormals: THREE.Vector3[];
 private readonly a = new THREE.Vector3();
 private readonly b = new THREE.Vector3();
 private readonly axis = new THREE.Vector3();
 private readonly rotation = new THREE.Matrix4();
 private initialized = false;

 constructor(private readonly segments=16,private readonly radius=.006,private readonly sides=6){
  super();
  this.centers=Array.from({length:segments+1},()=>new THREE.Vector3());
  this.tangents=this.centers.map(()=>new THREE.Vector3());
  this.normals=this.centers.map(()=>new THREE.Vector3());
  this.binormals=this.centers.map(()=>new THREE.Vector3());
  const vertices=(segments+1)*(sides+1),indices:number[]=[],uv=new Float32Array(vertices*2);
  for(let i=0;i<=segments;i++)for(let j=0;j<=sides;j++){
   const k=i*(sides+1)+j;uv[k*2]=i/segments;uv[k*2+1]=j/sides;
   if(i<segments&&j<sides){const b=k+sides+1;indices.push(k,b,k+1,b,b+1,k+1);}
  }
  this.setIndex(indices);
  this.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
  this.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
  this.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  this.update(this.points);
 }

 update(points:readonly THREE.Vector3[]){
  if(this.initialized&&points.every((p,i)=>p.distanceToSquared(this.points[i])<1e-12))return false;
  points.forEach((p,i)=>this.points[i].copy(p));
  this.initialized=true;
  // Match TubeGeometry's arc-length sampling, using a persistent lookup table.
  this.curve.getPoint(0,this.a);this.lengths[0]=0;
  for(let i=1;i<this.lengths.length;i++){
   this.curve.getPoint(i/(this.lengths.length-1),this.b);
   this.lengths[i]=this.lengths[i-1]+this.a.distanceTo(this.b);this.a.copy(this.b);
  }
  const total=this.lengths[this.lengths.length-1];
  for(let i=0;i<=this.segments;i++){
   const distance=total*i/this.segments;
   let lo=0,hi=this.lengths.length-1;
   while(lo+1<hi){const mid=(lo+hi)>>1;if(this.lengths[mid]<=distance)lo=mid;else hi=mid;}
   const span=this.lengths[hi]-this.lengths[lo];
   const t=(lo+(span>0?(distance-this.lengths[lo])/span:0))/(this.lengths.length-1);
   this.curve.getPoint(t,this.centers[i]);
   this.curve.getPoint(Math.max(0,t-.0001),this.a);this.curve.getPoint(Math.min(1,t+.0001),this.b);
   this.tangents[i].subVectors(this.b,this.a).normalize();
   if(this.tangents[i].lengthSq()<.5)this.tangents[i].set(0,0,1);
  }
  // Parallel transport avoids twisting a cross-section as the hands move.
  const first=this.tangents[0],x=Math.abs(first.x),y=Math.abs(first.y),z=Math.abs(first.z);
  if(z<=x&&z<=y)this.axis.set(0,0,1);else if(y<=x)this.axis.set(0,1,0);else this.axis.set(1,0,0);
  this.a.crossVectors(first,this.axis).normalize();this.normals[0].crossVectors(first,this.a);
  this.binormals[0].crossVectors(first,this.normals[0]);
  for(let i=1;i<=this.segments;i++){
   this.normals[i].copy(this.normals[i-1]);this.axis.crossVectors(this.tangents[i-1],this.tangents[i]);
   if(this.axis.lengthSq()>Number.EPSILON*Number.EPSILON){
    this.axis.normalize();this.rotation.makeRotationAxis(this.axis,Math.acos(THREE.MathUtils.clamp(this.tangents[i-1].dot(this.tangents[i]),-1,1)));
    this.normals[i].applyMatrix4(this.rotation);
   }
   this.binormals[i].crossVectors(this.tangents[i],this.normals[i]);
  }
  const position=this.getAttribute('position') as THREE.BufferAttribute,normal=this.getAttribute('normal') as THREE.BufferAttribute;
  for(let i=0;i<=this.segments;i++)for(let j=0;j<=this.sides;j++){
   const angle=j/this.sides*Math.PI*2,k=i*(this.sides+1)+j;
   this.a.copy(this.normals[i]).multiplyScalar(-Math.cos(angle)).addScaledVector(this.binormals[i],Math.sin(angle)).normalize();
   normal.setXYZ(k,this.a.x,this.a.y,this.a.z);this.b.copy(this.centers[i]).addScaledVector(this.a,this.radius);position.setXYZ(k,this.b.x,this.b.y,this.b.z);
  }
  position.needsUpdate=true;normal.needsUpdate=true;
  this.computeBoundingBox();this.computeBoundingSphere();
  return true;
 }
}
