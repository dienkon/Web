import references from '../../../shared/study-references.generated.json';
import { resolveLabExperiment, isLinkableStudyEquation } from '../../../shared/chemistry/study-links.mjs';

const formulas = references.formulas as Record<string,string>;
const scientistNames = references.scientistNames as Record<string,string>;
const namePattern = Object.keys(scientistNames).sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
const subscript = (formula: string) => formula.split(/[·.]/).map((part,index)=>{
  const prefix=index>0?part.match(/^\d+/)?.[0]??'':'';
  return prefix+part.slice(prefix.length).replace(/\d/g,n=>'₀₁₂₃₄₅₆₇₈₉'[Number(n)]);
}).join('·');
function linkedText(value: string): any[] {
  const output: any[] = [];
  const formulaPattern = '(?:\\d+(?:\\.\\d+)?)?(?:\\([A-Z][A-Za-z0-9]*\\)\\d*|[A-Z][a-z]?\\d*)+(?:[·.]\\d*(?:[A-Z][a-z]?\\d*)+)?';
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${namePattern}|${formulaPattern})(?![\\p{L}\\p{N}_])`, 'gu');
  let cursor = 0;
  for (const match of value.matchAll(regex)) {
    const scientist = scientistNames[match[0]];
    const coefficient = scientist ? '' : match[0].match(/^\d+(?:\.\d+)?/)?.[0] ?? '';
    const formula = match[0].slice(coefficient.length);
    const slug = scientist ?? formulas[formula] ?? formulas[formula.replaceAll('.','·')];
    if (!slug) continue;
    if (match.index! > cursor) output.push({type:'text',value:value.slice(cursor,match.index)});
    if (coefficient) output.push({type:'text',value:coefficient});
    output.push({type:'link',url:`/trung-tam/tai-lieu-so/${encodeURIComponent(slug)}/`,children:[{type:'text',value:scientist ? match[0] : subscript(formula)}]});
    cursor = match.index! + match[0].length;
  }
  output.push({type:'text',value:value.slice(cursor)});
  return output;
}

export default function remarkStudyLinks() {
  return (tree: any) => {
    const labTargets = new Set<string>();
    const findExplicitLinks = (node: any) => {
      if (node.type === 'link' && node.url?.startsWith('/lab-3d/')) labTargets.add(node.url);
      node.children?.forEach(findExplicitLinks);
    };
    findExplicitLinks(tree);
    const equationNodes = (value: string) => {
      const readable = isLinkableStudyEquation(value) ? value.replace(/->/g,'→').replace(/\^(\d*)([+-])/g, (_match, digits, sign) => digits.replace(/\d/g, (n: string) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(n)]) + (sign === '+' ? '⁺' : '⁻')) : value;
      const linked = linkedText(readable);
      const lab = resolveLabExperiment(value.trim());
      if (lab && !labTargets.has(lab.href)) {
        linked.push({type:'text',value:' · '},{type:'link',url:lab.href,children:[{type:'text',value:'⚗ Quan sát trong Lab 3D'}]});
        labTargets.add(lab.href);
      }
      return linked;
    };
    const walk = (parent: any) => {
      if (!parent.children || ['link','linkReference','code','inlineCode','html','heading'].includes(parent.type)) return;
      const children: any[] = [];
      for (const node of parent.children) {
        if (node.type === 'text') {
          children.push(...equationNodes(node.value));
        } else if ((node.type === 'inlineCode' || (node.type === 'code' && (!node.lang || ['text','chem','chemistry'].includes(node.lang)))) && isLinkableStudyEquation(node.value)) {
          const linked = equationNodes(node.value);
          children.push(...(node.type === 'code' ? [{type:'paragraph',children:linked}] : linked));
        } else if (['math','inlineMath'].includes(node.type) && /^\\ce\{[^{}]+\}$/.test(node.value.trim())) {
          const equation = node.value.trim().slice(4,-1);
          const linked = equationNodes(equation.replace(/->/g,'→'));
          children.push(...(node.type === 'math' ? [{type:'paragraph',children:linked}] : linked));
        } else { walk(node); children.push(node); }
      }
      parent.children = children;
    };
    walk(tree);
  };
}
