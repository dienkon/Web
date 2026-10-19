import type { Point, WorkPlacement } from '../../data/practicalWork';
export interface PracticalResult { completedSteps:number; totalSteps:number; mistakes:number; hints:number; score:number; mode:'guided'|'independent' }
export const practicalScore=(mistakes:number,hints:number)=>Math.max(0,100-Math.max(0,mistakes)*5-Math.max(0,hints)*2);
export function placementAt(point:Point,placements:WorkPlacement[],radius=38){return placements.find(p=>Math.hypot(point[0]-p.target[0],point[1]-p.target[1])<=(p.radius??radius));}
export function segmentDistance(p:Point,a:Point,b:Point){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
/** Validate the whole sampled movement, so hitting checkpoints cannot skip a bend. */
export function followsSegment(from:Point,to:Point,start:Point,end:Point,tolerance=34){
 const samples=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/12));
 for(let i=0;i<=samples;i++){const p:Point=[from[0]+(to[0]-from[0])*i/samples,from[1]+(to[1]-from[1])*i/samples];if(segmentDistance(p,start,end)>tolerance)return false;}
 return true;
}
