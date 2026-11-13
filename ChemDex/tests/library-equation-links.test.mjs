import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['trung-tam/src/utils/remarkStudyLinks.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {default:plugin}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const links=node=>[...(node.type==='link'?[node.url]:[]),...(node.children??[]).flatMap(links)];

test('fenced and inline chemical equations become substance links without duplicate explicit lab links',()=>{
  const lab='/lab-3d/?experiment=acid_base_titration&observe=1';
  const tree={type:'root',children:[{type:'code',lang:'text',value:'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)'},{type:'paragraph',children:[{type:'link',url:lab,children:[{type:'text',value:'Quan sát'}]}]},{type:'paragraph',children:[{type:'inlineCode',value:'H^+(aq) + OH^-(aq) → H2O(l)'}]}]};
  plugin()(tree);
  assert.equal(tree.children[0].type,'paragraph');
  assert.ok(links(tree.children[0]).length>=4);
  assert.equal(links(tree).filter(url=>url===lab).length,1);
  const script={type:'root',children:[{type:'code',lang:'javascript',value:'2H2 + O2 -> 2H2O'},{type:'inlineCode',value:'return H2 + O2'}]};
  const original=structuredClone(script);plugin()(script);assert.deepEqual(script,original);
});

test('balanced equilibrium formulas are linked while an unsupported experiment stays absent',()=>{
  const tree={type:'root',children:[{type:'code',lang:'text',value:'CH3COOH(l) + C2H5OH(l) ⇌ CH3COOC2H5(l) + H2O(l)'}]};
  plugin()(tree);assert.equal(tree.children[0].type,'paragraph');
  assert.ok(links(tree).length>=3);assert.ok(links(tree).every(url=>!url.startsWith('/lab-3d/')));
});

test('element links respect Vietnamese and English word boundaries while retaining coefficients',()=>{
  const tree={type:'root',children:[{type:'paragraph',children:[{type:'text',value:'Carbon Có Cấu trúc Hồ tinh bột. Co và Ca. 2H2 + O2 → 2H2O'}]}]};
  plugin()(tree);
  const collect=node=>[...(node.type==='link'?[node.children.map(c=>c.value).join('')]:[]),...(node.children??[]).flatMap(collect)];
  assert.deepEqual(collect(tree),['Co','Ca','H₂','O₂','H₂O']);
  const text=node=>node.value??(node.children??[]).map(text).join('');
  assert.equal(text(tree),'Carbon Có Cấu trúc Hồ tinh bột. Co và Ca. 2H₂ + O₂ → 2H₂O');
});

test('hydrate water coefficients remain on the baseline and a period resolves to the same hydrate dossier',()=>{
  for(const formula of ['CuSO4·5H2O','CuSO4.5H2O']){
    const tree={type:'root',children:[{type:'paragraph',children:[{type:'text',value:formula}]}]};
    plugin()(tree);const node=tree.children[0].children.find(c=>c.type==='link');assert.ok(node);
    assert.equal(node.children[0].value,'CuSO₄·5H₂O');
    assert.match(node.url,/dong.*(?:sulfat|sunfat)|pentahi|ngam-nuoc|cuso4/i);
  }
});
