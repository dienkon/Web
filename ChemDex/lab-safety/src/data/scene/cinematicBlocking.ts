import type { CinematicId } from '../../types';
type Offset = [number,number];
interface Blocking { start:Offset; end:Offset; friend:Offset; move:[number,number]; gesture:'reach'|'warn'; friendGesture:'reach'|'warn' }
/** Offsets in free aisle space, in metres. Every scene has a deliberate action and timing. */
export const CINEMATIC_BLOCKING:Record<string,Blocking> = {
 fire:{start:[0,1.1],end:[-.5,2.8],friend:[1.45,1.9],move:[9,13],gesture:'reach',friendGesture:'warn'},
 electrical:{start:[-.4,1.35],end:[-.9,2.15],friend:[1.2,1.65],move:[4,7],gesture:'warn',friendGesture:'warn'},
 fume:{start:[-1.8,.6],end:[-2,.95],friend:[-1.9,1.9],move:[3,6],gesture:'warn',friendGesture:'warn'},
 evacuation:{start:[1,0],end:[-1.5,.1],friend:[2,.65],move:[4.5,11.5],gesture:'warn',friendGesture:'warn'},
 'unknown-bottle':{start:[-.25,1.12],end:[-.7,1.5],friend:[1.25,1.45],move:[4,6.5],gesture:'warn',friendGesture:'warn'},
 'cracked-glass':{start:[-.35,1.15],end:[-.35,1.15],friend:[1.35,1.6],move:[5,8],gesture:'warn',friendGesture:'warn'},
 'gas-hose':{start:[-.65,1.15],end:[-.85,1.75],friend:[1.25,1.7],move:[3.5,6.5],gesture:'warn',friendGesture:'warn'},
 'hot-glass':{start:[.35,1.1],end:[.7,1.55],friend:[-1.25,1.5],move:[4.5,6.5],gesture:'reach',friendGesture:'warn'},
 'incompatible-storage':{start:[-.8,1.25],end:[-1.1,1.25],friend:[.8,1.65],move:[6,8],gesture:'warn',friendGesture:'warn'},
 'pipette-bulb':{start:[.2,1.18],end:[.2,1.18],friend:[1.25,1.6],move:[4,8],gesture:'reach',friendGesture:'warn'},
 'centrifuge-balance':{start:[-.3,1.22],end:[-.55,1.45],friend:[1.3,1.7],move:[4.5,7.5],gesture:'warn',friendGesture:'warn'},
 'blocked-exit':{start:[1.5,.15],end:[1.1,-.7],friend:[1.75,.9],move:[6,10],gesture:'warn',friendGesture:'warn'},
 'eye-protection':{start:[0,1.2],end:[0,1.2],friend:[-1.3,1.5],move:[4,8],gesture:'reach',friendGesture:'warn'},
 'dirty-gloves':{start:[-.15,1.22],end:[-.6,1.4],friend:[1.35,1.65],move:[5,8],gesture:'warn',friendGesture:'warn'},
 'waste-mixing':{start:[-1,.3],end:[-1.3,.3],friend:[-1.5,1.25],move:[4,7],gesture:'warn',friendGesture:'warn'},
 'vacuum-check':{start:[-.3,1.2],end:[-.55,1.6],friend:[1.35,1.75],move:[4,7],gesture:'warn',friendGesture:'warn'},
 'reagent-return':{start:[.25,1.15],end:[.25,1.15],friend:[-1.3,1.55],move:[4,8],gesture:'warn',friendGesture:'warn'},
 'crowded-bench':{start:[-.1,1.3],end:[-.75,1.5],friend:[1.3,1.65],move:[5,9],gesture:'reach',friendGesture:'warn'},
 'shutdown-check':{start:[-.25,1.2],end:[.7,1.2],friend:[-1.3,1.7],move:[5,10],gesture:'warn',friendGesture:'warn'},
};
export function getCinematicBlocking(id:CinematicId) { return CINEMATIC_BLOCKING[id.replace('scenario:','')]??CINEMATIC_BLOCKING.fire; }
