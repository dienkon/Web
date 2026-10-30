import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createCatalogIndex } from '../shared/chemistry/reaction-catalog.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const catalogDigest=catalog=>createHash('sha256').update(JSON.stringify(catalog)).digest('hex');

// Enumerate actual simple paths. No randomly paired reactions, repeated
// intermediates, or artificial variants are inserted to reach a target count.
export function buildReactionChains(catalog){
  const index=createCatalogIndex(catalog),chains=[];
  for(const start of [...index.outgoing.keys()].sort()){
    function walk(current,edges,substances){
      if(edges.length===3){
        const reactionIds=edges.map(edge=>edge.reactionId);
        const id=`chain_${createHash('sha256').update(JSON.stringify([substances,reactionIds])).digest('hex').slice(0,16)}`;
        chains.push({id,substances,reactionIds});return;
      }
      for(const edge of index.outgoing.get(current)??[]){
        if(substances.includes(edge.to)||edges.some(previous=>previous.reactionId===edge.reactionId))continue;
        walk(edge.to,[...edges,edge],[...substances,edge.to]);
      }
    }
    walk(start,[],[start]);
  }
  return {schema:'chemdex.chains/1',version:1,catalogVersion:catalog.version,catalogDigest:catalogDigest(catalog),count:chains.length,
    selectionPolicy:'Toàn bộ đường đi đơn giản 3 bước từ graph đã gộp các lựa chọn có cùng chất đầu/cuối ở mỗi cạnh. Mỗi bước tham chiếu một phương trình thật trong catalog; không lặp chất trung gian hoặc phản ứng để kéo dài chuỗi.',
    workupPolicy:'Các bước là chuỗi chuyển hóa học tập; có thể cần tách, rửa, đổi môi trường, khí quyển hoặc năng lượng. Không phải công thức trộn một bình hoặc SOP đã hiệu chuẩn.',chains};
}

export function validateReactionChains(catalog,data){
  const index=createCatalogIndex(catalog),errors=[],ids=new Set(),paths=new Set();
  if(data.schema!=='chemdex.chains/1'||data.catalogDigest!==catalogDigest(catalog))errors.push('Chain catalog is stale or has an unsupported schema');
  if(data.count!==data.chains?.length)errors.push('Chain count does not match data');
  for(const chain of data.chains??[]){
    if(ids.has(chain.id))errors.push(`Duplicate chain ID ${chain.id}`);ids.add(chain.id);
    const key=JSON.stringify([chain.substances,chain.reactionIds]);if(paths.has(key))errors.push(`Duplicate chain ${chain.id}`);paths.add(key);
    if(chain.reactionIds.length!==3||chain.substances.length!==4||new Set(chain.substances).size!==4||new Set(chain.reactionIds).size!==3)errors.push(`Invalid/simple-path length ${chain.id}`);
    for(let step=0;step<chain.reactionIds.length;step++){
      const reaction=index.byId.get(chain.reactionIds[step]);
      if(!reaction?.transfers.some(edge=>edge.from===chain.substances[step]&&edge.to===chain.substances[step+1]))errors.push(`Broken material link ${chain.id} step ${step+1}`);
    }
  }
  return {valid:errors.length===0,errors,chains:paths.size};
}

export function generateReactionChainsFile(catalog,destination){
  const result=buildReactionChains(catalog),audit=validateReactionChains(catalog,result);
  if(!audit.valid||result.count<=1000)throw new Error(`Chain gate failed: ${JSON.stringify(audit.errors)}; count=${result.count}`);
  fs.writeFileSync(destination??path.join(root,'shared/reaction-chains.generated.json'),JSON.stringify(result,null,2)+'\n');return result;
}
