import references from '../../../shared/study-references.generated.json';
import { resolveLabExperiment } from '../../../shared/chemistry/study-links.mjs';

const formulas = references.formulas as Record<string,string>;
const scientistNames = references.scientistNames as Record<string,string>;
const namePattern = Object.keys(scientistNames).sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
const subscript = (formula: string) => formula.replace(/\d/g, n => '₀₁₂₃₄₅₆₇₈₉'[Number(n)]);
function linkedText(value: string): any[] {
  const output: any[] = [];
  const regex = new RegExp(`${namePattern}|(?:\\([A-Z][A-Za-z0-9]*\\)\\d*|[A-Z][a-z]?\\d*)+(?:[·.]\\d*(?:[A-Z][a-z]?\\d*)+)?`, 'g');
  let cursor = 0;
  for (const match of value.matchAll(regex)) {
    const scientist = scientistNames[match[0]];
    const slug = scientist ?? formulas[match[0]];
    if (!slug) continue;
    if (match.index! > cursor) output.push({type:'text',value:value.slice(cursor,match.index)});
    output.push({type:'link',url:`/trung-tam/tai-lieu-so/${encodeURIComponent(slug)}/`,children:[{type:'text',value:scientist ? match[0] : subscript(match[0])}]});
    cursor = match.index! + match[0].length;
  }
  output.push({type:'text',value:value.slice(cursor)});
  return output;
}

export default function remarkStudyLinks() {
  return (tree: any) => {
    const walk = (parent: any) => {
      if (!parent.children || ['link','linkReference','code','inlineCode','html','heading'].includes(parent.type)) return;
      const children: any[] = [];
      for (const node of parent.children) {
        if (node.type === 'text') {
          const linked = linkedText(node.value);
          const lab = resolveLabExperiment(node.value.trim());
          if (lab) linked.push({type:'text',value:' · '},{type:'link',url:lab.href,children:[{type:'text',value:'⚗ Quan sát trong Lab 3D'}]});
          children.push(...linked);
        } else if (['math','inlineMath'].includes(node.type) && /^\\ce\{[^{}]+\}$/.test(node.value.trim())) {
          const equation = node.value.trim().slice(4,-1);
          const linked = linkedText(equation.replace(/->/g,'→'));
          const lab = resolveLabExperiment(equation);
          if (lab) linked.push({type:'text',value:' · '},{type:'link',url:lab.href,children:[{type:'text',value:'⚗ Quan sát trong Lab 3D'}]});
          children.push(...(node.type === 'math' ? [{type:'paragraph',children:linked}] : linked));
        } else { walk(node); children.push(node); }
      }
      parent.children = children;
    };
    walk(tree);
  };
}
