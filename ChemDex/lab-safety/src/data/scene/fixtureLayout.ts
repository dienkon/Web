import type { ColliderBox } from '../../core/simulation/CollisionSystem';
export const FUME_HOOD_LAYOUT={position:[8.8,0,-3.5] as [number,number,number],rotationY:-Math.PI/2,size:[2.4,2.6,1.1] as const,workTop:.87,front:[8.2,1.2,-3.5] as [number,number,number]};
export const WASH_STATION_LAYOUT={position:[3.5,0,7.1] as [number,number,number],rotationY:Math.PI,size:[2,.9,.6] as const};
export const BUNSEN_LAYOUT={position:[3.5,.901,-2.03] as [number,number,number]};
export const BENCH_SINK_LAYOUT={position:[-1.35,.75992,.38] as [number,number,number],hole:{x:-1.35,z:.38,width:.3325,depth:.30375,radius:.025}};
export const EMERGENCY_SHOWER_LAYOUT={position:[-9.2,0,-4] as [number,number,number],rotationY:Math.PI/2,eyewash:[-8.92,1,-4] as [number,number,number],shower:[-8.4,2.335,-4] as [number,number,number]};
export const WASTE_CONTAINERS=[
 {id:'bin_glass',kind:'glass',title:'Hộp thủy tinh vỡ',position:[8.8,0,3.9] as [number,number,number],radius:.32},
 {id:'bin_chemical',kind:'chemical',title:'Thùng rắn nhiễm hóa chất',position:[8.8,0,4.55] as [number,number,number],radius:.31},
 {id:'bin_liquid',kind:'liquid',title:'Can chất thải lỏng',position:[8.8,0,5.2] as [number,number,number],radius:.27},
 {id:'bin_sharps',kind:'sharps',title:'Hộp vật sắc nhọn',position:[8.8,0,5.85] as [number,number,number],radius:.25},
 {id:'bin_domestic',kind:'domestic',title:'Thùng giấy sạch',position:[8.8,0,6.5] as [number,number,number],radius:.31},
] as const;
export function fixtureCollider(id:string,position:readonly number[],size:readonly number[],rotationY:number,frontClearance=0):ColliderBox{
 const c=Math.abs(Math.cos(rotationY)),s=Math.abs(Math.sin(rotationY));
 const width=size[0]*c+(size[2]+frontClearance*2)*s,depth=size[0]*s+(size[2]+frontClearance*2)*c;
 return {id,minX:position[0]-width/2,maxX:position[0]+width/2,minZ:position[2]-depth/2,maxZ:position[2]+depth/2};
}
