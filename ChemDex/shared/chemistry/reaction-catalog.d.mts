export interface CatalogSpecies { formula:string; coefficient:number; phase:'s'|'l'|'g'|'aq'; }
export interface SourceReference { title:string; url:string; scope:string; }
export interface ReactionEntry { id:string; family:string; topic_vi:string; title_vi:string; equation:string; reactants:CatalogSpecies[]; products:CatalogSpecies[]; reversible:boolean; conditions:{description_vi:string;activation?:string;catalyst?:string}; observation_vi:string; explanation_vi:string; evidence:{type:string;scope:string;sourceIds:string[]}; transfers:{from:string;to:string;carrier:string;workup:string}[]; effects:{gases:string[];solids:string[];color:null;deltaH_kJ_per_mol:null;calibrated:boolean}; safety_vi:string; caveats:string[]; runtime:string;netTransformation:string;ionic:{equation:string}; }
export interface ReactionCatalog { schema:string; version:number;count:number;counts:{molecularReactions:number;netTransformations:number;families:Record<string,number>;runtimePrograms:number}; entries:ReactionEntry[];sources:Record<string,SourceReference>;species:{formula:string;defaultPhase:string}[]; }
export interface CatalogIndex {catalog:ReactionCatalog;byId:Map<string,ReactionEntry>;byReactants:Map<string,ReactionEntry[]>;outgoing:Map<string,any[]>;resolve:(value:unknown)=>string|null;}
export interface CatalogStep {reactionId:string;from:string;to:string;carrier:string;equation:string;latex:string;latexWithCondition:string;condition:string;explanation:string;workup:string;reagents:string[];evidence:ReactionEntry['evidence'];sourceReferences:SourceReference[];}
export interface ChainResult {status:string;error?:string;steps:CatalogStep[];substances?:string[];visited?:number;requiresWorkup?:boolean;source?:string;catalogVersion?:number;catalogCount?:number;note?:string;}
export function validateCatalog(catalog:ReactionCatalog):{valid:boolean;errors:string[];reactions:number;netTransformations:number};
export function createCatalogIndex(catalog:ReactionCatalog):CatalogIndex;
export function searchReactions(index:CatalogIndex,query?:string,options?:{family?:string;limit?:number;offset?:number}):{total:number;entries:ReactionEntry[]};
export function analyzeChain(index:CatalogIndex,input:string|string[]):ChainResult;
export function findChain(index:CatalogIndex,start:string,end:string,options?:{minSteps?:number;maxSteps?:number;maxVisited?:number}):ChainResult;
export function reactionStep(index:CatalogIndex,edge:any):CatalogStep;
export function solveCatalogRequest(index:CatalogIndex,body:any):ChainResult;
