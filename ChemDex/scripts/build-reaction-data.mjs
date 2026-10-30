import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCatalogFile } from './generate-reaction-catalog.mjs';
import { generateReactionChainsFile } from './generate-reaction-chains.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=generateCatalogFile();
const chains=generateReactionChainsFile(catalog);
fs.writeFileSync(path.join(root,'shared/reaction-data-summary.json'),JSON.stringify({schema:'chemdex.reaction-summary/1',catalogVersion:catalog.version,catalogDigest:chains.catalogDigest,reactionCount:catalog.count,netIonicCount:catalog.counts.netTransformations,chainCount:chains.count,speciesCount:catalog.species.length,families:catalog.counts.families},null,2)+'\n');
console.log(JSON.stringify({threeStepChains:chains.count,species:catalog.species.length}));
