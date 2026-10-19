import type { Point } from '../../data/practicalWork';

export function pathLength(path:Point[]){return path.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);}
export function pointAlong(path:Point[],distance:number):Point {
 if(!path.length)return [0,0];
 let left=Math.max(0,distance);
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(left<=length&&length)return [a[0]+(b[0]-a[0])*left/length,a[1]+(b[1]-a[1])*left/length];left-=length;}
 return path[path.length-1];
}
/** Progress along a forgiving ribbon. Excursions pause progress rather than erase it. */
export function traceStroke(path:Point[],distance:number,from:Point,to:Point,tolerance=42){
 const total=pathLength(path);let progress=Math.min(total,Math.max(0,distance)),offPath=false;
 const samples=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/8));
 const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));
 for(let sample=1;sample<=samples;sample++){
  const x=from[0]+(to[0]-from[0])*sample/samples,y=from[1]+(to[1]-from[1])*sample/samples;
  let offset=0,bestDistance=Infinity,bestProgress=progress;
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],length=lengths[i-1],dx=b[0]-a[0],dy=b[1]-a[1];
   if(!length)continue;
   const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(length*length)));
   const candidate=offset+t*length,d=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
   // Nearby bends may be rounded. Distant portions cannot be jumped to.
   if(candidate>=progress-16&&candidate<=progress+Math.max(48,tolerance*1.6)&&d<bestDistance){bestDistance=d;bestProgress=candidate;}
   offset+=length;
  }
  if(bestDistance>tolerance){offPath=true;break;}
  progress=Math.max(progress,bestProgress);
 }
 return {distance:Math.min(total,progress),offPath,complete:total>0&&progress>=total-6};
}

export interface StirState { angle:number; lastAngle:number|null; progress:number }
export const emptyStir=():StirState=>({angle:0,lastAngle:null,progress:0});
/** Signed angular displacement rejects shaking and stationary holds. Either direction works. */
export function stirMotion(state:StirState,point:Point,center:Point,radius:number,turns=1):StirState {
 const dx=point[0]-center[0],dy=point[1]-center[1],r=Math.hypot(dx,dy);
 if(r<radius*.35||r>radius*1.35)return {...state,lastAngle:null};
 const theta=Math.atan2(dy,dx);
 if(state.lastAngle===null)return {...state,lastAngle:theta};
 let delta=theta-state.lastAngle;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;
 // A jump across the bowl is not a stirring stroke.
 if(Math.abs(delta)>Math.PI*.55)return {...state,lastAngle:theta};
 const angle=state.angle+delta;
 return {angle,lastAngle:theta,progress:Math.abs(angle)/(Math.PI*2*turns)>=.999999?1:Math.abs(angle)/(Math.PI*2*turns)};
}
