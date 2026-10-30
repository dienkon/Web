import type { ReactionCatalog } from '../shared/chemistry/reaction-catalog.mjs';
export function buildReactionCatalog(): ReactionCatalog;
export function generateCatalogFile(destination?: string): ReactionCatalog;
export function salt(cation: {formula:string;charge:number}, anion:string): string;
