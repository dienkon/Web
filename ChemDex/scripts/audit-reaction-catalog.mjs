import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog } from '../shared/chemistry/reaction-catalog.mjs';
import { validateReactionChains } from './generate-reaction-chains.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'shared/reaction-catalog.generated.json'),'utf8'));
const chains=JSON.parse(fs.readFileSync(path.join(root,'shared/reaction-chains.generated.json'),'utf8'));
const reactionAudit=validateCatalog(catalog),chainAudit=validateReactionChains(catalog,chains);
const report={checkedAt:new Date().toISOString(),schema:catalog.schema,valid:reactionAudit.valid&&chainAudit.valid&&catalog.count>1000&&chains.count>1000,
  molecularReactions:reactionAudit.reactions,netIonicTransformations:reactionAudit.netTransformations,threeStepChains:chainAudit.chains,species:catalog.species.length,
  families:catalog.counts.families,sourceCount:Object.keys(catalog.sources).length,referencedSourceCount:new Set(catalog.entries.flatMap(r=>r.evidence.sourceIds)).size,evidenceTypes:Object.fromEntries([...new Set(catalog.entries.map(r=>r.evidence.type))].map(type=>[type,catalog.entries.filter(r=>r.evidence.type===type).length])),catalogDigest:chains.catalogDigest,
  errors:[...reactionAudit.errors,...chainAudit.errors],evidenceScope:'Structure, atom/charge conservation, curated exclusions, references and material links. Family-level sources do not establish individual experimental calibration.',
  runtimeScope:'Extended catalog entries are reference data; existing dedicated lab programs retain their own runtime and validation.'};
if(process.argv[2]){const out=path.resolve(process.argv[2]);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));if(!report.valid)process.exitCode=1;
