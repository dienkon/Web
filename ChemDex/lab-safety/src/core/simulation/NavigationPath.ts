import { INITIAL_COLLIDER_BOXES, INITIAL_COLLIDER_CYLINDERS, LAB_BOUNDS } from './CollisionSystem';
export type FloorPoint = [number, number];
export const NAV_STEP = 0.25;
const RADIUS = 0.34;
export function isWalkable(x: number, z: number) {
  if (x < LAB_BOUNDS.minX + RADIUS || x > LAB_BOUNDS.maxX - RADIUS || z < LAB_BOUNDS.minZ + RADIUS || z > LAB_BOUNDS.maxZ - RADIUS) return false;
  if (INITIAL_COLLIDER_BOXES.some(b => x > b.minX - RADIUS && x < b.maxX + RADIUS && z > b.minZ - RADIUS && z < b.maxZ + RADIUS)) return false;
  return !INITIAL_COLLIDER_CYLINDERS.some(c => Math.hypot(x - c.x, z - c.z) < c.radius + RADIUS);
}
export function hasWalkableSegment(a: FloorPoint, b: FloorPoint) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .04));
  for (let i = 0; i <= steps; i++) if (!isWalkable(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps)) return false;
  return true;
}
// Dijkstra with diagonal movement: shortest reachable approach on a 25cm grid.
// Every edge is collision tested, then visible segments are pulled taut.
export function findNavigationPath(start: FloorPoint, target: FloorPoint, reach = 1.55): FloorPoint[] {
  if (Math.hypot(start[0] - target[0], start[1] - target[1]) <= reach + 1e-8 && isWalkable(...start)) return [start];
  const point = (x:number,z:number):FloorPoint => [x*NAV_STEP,z*NAV_STEP];
  const key = (x:number,z:number) => `${x},${z}`;
  let sx=Math.round(start[0]/NAV_STEP),sz=Math.round(start[1]/NAV_STEP);
  if (!isWalkable(...point(sx,sz))) {
    let best=Infinity;
    for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
      const x=Math.round(start[0]/NAV_STEP)+dx,z=Math.round(start[1]/NAV_STEP)+dz,p=point(x,z),d=Math.hypot(p[0]-start[0],p[1]-start[1]);
      if(d<best&&isWalkable(...p)){best=d;sx=x;sz=z;}
    }
    if(!Number.isFinite(best))return [];
  }
  const origin=key(sx,sz),distances=new Map<string,number>([[origin,0]]),parents=new Map<string,string>(),coordinates=new Map<string,FloorPoint>([[origin,point(sx,sz)]]);
  const heap:{x:number;z:number;cost:number}[]=[];
  const push=(v:typeof heap[number])=>{heap.push(v);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].cost<=v.cost)break;heap[i]=heap[p];i=p;}heap[i]=v;};
  const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].cost<heap[c].cost)c++;if(heap[c].cost>=last.cost)break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;};
  push({x:sx,z:sz,cost:0});let end:string|null=null;
  while(heap.length){
    const current=pop(),id=key(current.x,current.z),p=point(current.x,current.z);
    if(current.cost!==distances.get(id))continue;
    if(Math.hypot(p[0]-target[0],p[1]-target[1])<=reach+1e-8){end=id;break;}
    for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
      if(!dx&&!dz)continue;
      const x=current.x+dx,z=current.z+dz,next=point(x,z);
      if(!hasWalkableSegment(p,next))continue;
      const cost=current.cost+Math.hypot(dx,dz)*NAV_STEP,nextId=key(x,z);
      if(cost>=(distances.get(nextId)??Infinity))continue;
      distances.set(nextId,cost);parents.set(nextId,id);coordinates.set(nextId,next);push({x,z,cost});
    }
  }
  if(!end)return [];
  const raw:FloorPoint[]=[];
  for(let id:string|undefined=end;id;id=parents.get(id))raw.push(coordinates.get(id)!);
  raw.reverse();if(hasWalkableSegment(start,raw[0]))raw.unshift(start);
  const route:FloorPoint[]=[raw[0]];
  for(let i=0;i<raw.length-1;){let next=raw.length-1;while(next>i+1&&!hasWalkableSegment(raw[i],raw[next]))next--;route.push(raw[next]);i=next;}
  return route;
}
