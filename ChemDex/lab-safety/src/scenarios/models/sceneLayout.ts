import type { LabScenario, PropKind, ScenarioVector } from '../types';

type Layout = { size:[number,number]; offsets:ScenarioVector[]; props?:PropKind[] };
/** Actual footprints: no arbitrary floating Y offsets and no miniature cupboard on a tray. */
export const SCENARIO_LAYOUTS:Record<string,Layout> = {
 'unknown-bottle':{size:[1.3,.7],offsets:[[-.43,.002,.08],[0,0,-.04],[.4,0,.03]]},
 'cracked-glass':{size:[1.4,.75],offsets:[[-.43,0,0],[0,.001,.13],[.44,0,-.04]],props:['glass','shard','waste']},
 'gas-hose':{size:[1.55,.85],offsets:[[-.25,0,.02],[.5,0,-.12],[-.58,0,-.23]],props:['hose','burner','valve']},
 'hot-glass':{size:[1.35,.8],offsets:[[-.38,0,-.12],[.05,0,.05],[.45,0,.05]],props:['hotplate','beaker','tongs']},
 'incompatible-storage':{size:[1.45,.75],offsets:[[-.42,.012,0],[0,.012,0],[.45,0,.02]]},
 'pipette-bulb':{size:[1.4,.75],offsets:[[-.28,.006,.06],[.1,0,.08],[.45,0,-.12]],props:['pipette','bulb','bottle']},
 'centrifuge-balance':{size:[1.5,.85],offsets:[[-.5,0,.02],[0,0,-.06],[.52,.002,.12]],props:['tube','centrifuge','label']},
 'blocked-exit':{size:[1.55,.95],offsets:[[-.45,0,.1],[.45,.002,-.25],[.35,0,.23]]},
 'eye-protection':{size:[1.4,.75],offsets:[[-.42,0,.04],[0,0,-.08],[.48,0,0]],props:['goggles','beaker','eyewash']},
 'dirty-gloves':{size:[1.4,.8],offsets:[[-.44,0,.05],[0,0,.12],[.47,0,-.1]],props:['gloves','phone','sink']},
 'waste-mixing':{size:[1.5,.9],offsets:[[-.53,.002,.12],[-.05,0,-.08],[.5,0,.12]]},
 'vacuum-check':{size:[1.5,.85],offsets:[[-.42,0,-.07],[.15,0,-.05],[.23,0,.29]],props:['vacuumFlask','hose','barrier']},
 'reagent-return':{size:[1.4,.75],offsets:[[-.45,0,-.09],[0,0,.07],[.43,.006,.1]]},
 'crowded-bench':{size:[1.5,.85],offsets:[[-.5,0,.06],[.48,0,.27],[0,0,-.1]],props:['backpack','bottle','hose']},
 'shutdown-check':{size:[1.35,.75],offsets:[[-.43,0,-.05],[0,0,.03],[.46,.002,.08]]},
};
export function getScenarioLayout(scenario:LabScenario):Layout {
 return SCENARIO_LAYOUTS[scenario.id]??{size:[1.4,.8],offsets:scenario.clues.map((_,i)=>[(i-1)*.42,0,0])};
}
