/** Metres. Cabinets face into the room; local +Z is the front. */
export const STORAGE_CABINETS = [
 {id:'cab_flammable',title:'Tủ dung môi dễ cháy',label:'DỄ CHÁY',color:'#d8ac45',position:[9.4,0,-.6] as [number,number,number]},
 {id:'cab_acid',title:'Tủ axit ăn mòn',label:'AXIT',color:'#5f98b8',position:[9.4,0,.6] as [number,number,number]},
 {id:'cab_base',title:'Tủ bazơ ăn mòn',label:'BAZƠ',color:'#549c93',position:[9.4,0,1.8] as [number,number,number]},
] as const;
export const CABINET_SIZE = [1.1,1.8,.65] as const;
export const STORAGE_RACK = {id:'shelf_general',position:[9.5,0,3.2] as [number,number,number],size:[1.2,2.2,.45] as const,shelves:[.4,.85,1.3,1.75]};
export function storageCollider(position:readonly number[],size:readonly number[],id:string) {
 return {id,minX:position[0]-size[2]/2-(id.startsWith('cab_')?.065:0),maxX:position[0]+size[2]/2,minZ:position[2]-size[0]/2,maxZ:position[2]+size[0]/2};
}
