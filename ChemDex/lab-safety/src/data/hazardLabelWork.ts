import {drag,type PracticalWork} from './practicalWork';
import { publicAsset } from '../utils/publicAsset';
import { HAZARD_SYMBOLS } from './hazardSymbols';

export const HAZARD_LABEL_WORK: PracticalWork = {
 visualId:'instrument-hazard-labels',
 title:'Đối chiếu biểu tượng cảnh báo trong phòng thí nghiệm',
 objects: HAZARD_SYMBOLS.map((s,i)=>({id:s.id,label:s.name,model:'label',at:[220,240],image:publicAsset(s.image),fromStep:i,untilStep:i+1})),
 steps: HAZARD_SYMBOLS.map(s=>drag(s.id,[650,240],`Gắn biểu tượng: ${s.name}`,s.description)),
};
