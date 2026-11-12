// Split only top-level infobox parameters; preserve nested citations/templates.
export function parseWikiInfobox(text) {
  const start=String(text).search(/\{\{\s*infobox element\b/i);
  if(start<0)return {};
  let depth=0,links=0,begin=start,parts=[];
  for(let i=start;i<text.length;i++){
    const pair=text.slice(i,i+2);
    if(pair==='{{'){depth++;i++;continue;}
    if(pair==='}}'){depth--;if(!depth){parts.push(text.slice(begin,i));break;}i++;continue;}
    if(pair==='[['){links++;i++;continue;}
    if(pair===']]'){links--;i++;continue;}
    if(text[i]==='|'&&depth===1&&links===0){parts.push(text.slice(begin,i));begin=i+1;}
  }
  const fields={};
  for(const part of parts.slice(1)){
    const equal=part.indexOf('=');if(equal<0)continue;
    fields[part.slice(0,equal).trim().toLowerCase()]=part.slice(equal+1).trim();
  }
  return fields;
}
export const cleanWikiValue=value=>String(value??'')
 .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,'').replace(/<ref\b[^>]*\/>/gi,'')
 .replace(/<br\s*\/?>/gi,'; ').replace(/&nbsp;|&thinsp;/g,' ').replace(/&alpha;/g,'α').replace(/&beta;/g,'β')
 .replace(/''+/g,'').replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1')
 .replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
