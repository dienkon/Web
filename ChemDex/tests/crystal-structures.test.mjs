import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCIF,symmetryOperator} from '../shared/chemistry/cif.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const catalog=read('data/crystal-catalog.json');
const dataFor=id=>read(`assets/periodic-table/crystals/${id}.json`);

test('published phases have correct cell populations, including DHCP and noncubic cells',()=>{
  for(const [id,count] of Object.entries({'halite':8,'fluorite':12,'quartz':9,'calcite':30,'sulfur':128,'nguyen-to-si':8,'nguyen-to-la':4,'nguyen-to-pr':4,'nguyen-to-nd':4,'graphite':4}))
    assert.equal(dataFor(id).siteCount,count,id);
  const quartz=dataFor('quartz');assert.equal(quartz.cell.gamma,120);
  // A 120-degree hexagonal cell has b_x = -b/2 and b_y = sqrt(3)*b/2.
  assert.ok(Math.abs(quartz.basis[0][1]+quartz.cell.b/2)<1e-8);
  assert.ok(Math.abs(quartz.basis[1][1]-Math.sqrt(3)*quartz.cell.b/2)<1e-8);
  assert.deepEqual(catalog.bauxitePhases,['gibbsite','boehmite','diaspore']);
  assert.match(catalog.minerals.tantalite.mineralName,/Mn/);
  assert.match(catalog.minerals.calaverite.note,/trung bình/);
});

test('all exported CIFs reproduce independent Gemmi-expanded positions and full cell metric',()=>{
  for(const meta of catalog.structures){
    const reference=dataFor(meta.id),parsed=parseCIF(fs.readFileSync('.'+meta.cif,'utf8'));
    assert.equal(parsed.atoms.length,reference.atoms.length,meta.id);
    assert.deepEqual(parsed.cell,reference.cell,meta.id);
    assert.deepEqual(parsed.bonds,[],'crystal distances must not be labelled chemical bonds');
    for(const atom of reference.atoms){
      const candidate=parsed.atoms.find(a=>a.elem===atom.element&&a.label===atom.label&&Math.hypot(a.x-atom.position[0],a.y-atom.position[1],a.z-atom.position[2])<.0003&&Math.abs(a.occupancy-atom.occupancy)<1e-8);
      assert.ok(candidate,`${meta.id}: ${atom.label} ${atom.fractional}`);
    }
  }
});

test('published symmetry operators preserve each experimental cell metric',()=>{
  const length=(basis,v)=>Math.hypot(...basis.map(row=>row.reduce((sum,a,i)=>sum+a*v[i],0)));
  for(const meta of catalog.structures){
    const data=dataFor(meta.id),v=[.137,.231,.359],original=length(data.basis,v);
    for(const expression of data.symmetryOperations){
      const op=symmetryOperator(expression),zero=op([0,0,0]),transformed=op(v).map((x,i)=>x-zero[i]);
      assert.ok(Math.abs(length(data.basis,transformed)-original)<.00015,`${meta.id}: ${expression}`);
    }
  }
});

test('crystal transport keeps occupancy, limitations, references and binary asset provenance',()=>{
  assert.equal(catalog.structures.length,122);
  for(const meta of catalog.structures){
    const data=dataFor(meta.id);
    assert.ok(data.reference.authors.length&&data.reference.title&&data.reference.year,meta.id);
    assert.ok(data.validation.cellVolumeRelativeError<.015,meta.id);
    assert.ok(data.validation.maxSiteOccupancy<=1.025,meta.id);
    assert.ok(Object.values(data.cellComposition).every(n=>n>0),meta.id);
    const glb=fs.readFileSync('.'+meta.model);
    assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(8),glb.length);
    const doc=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
    assert.ok(doc.nodes.some(n=>n.extras?.amcsdId===meta.amcsdId&&n.extras?.spaceGroup===meta.spaceGroup),meta.id);
    assert.ok(fs.statSync('.'+meta.preview).size>3000,meta.id);
  }
  assert.ok(dataFor('pentlandite').mixedSiteCount>0);
  assert.match(dataFor('lepidolite').limitations,/tọa độ H/);
});

test('CIF parser respects arbitrary column order, uncertainties and fractional symmetry offsets',()=>{
  const raw=`data_test
_cell_length_a 4.0(2)
_cell_length_b 5
_cell_length_c 6
_cell_angle_alpha 90
_cell_angle_beta 110
_cell_angle_gamma 90
_symmetry_space_group_name_H-M 'P -1'
loop_
_symmetry_equiv_pos_as_xyz
'x,y,z'
'-x,-y,-z'
loop_
_atom_site_occupancy
_atom_site_fract_z
_atom_site_label
_atom_site_fract_x
_atom_site_type_symbol
_atom_site_fract_y
0.5 0.3 Fe1 -0.1 Fe 0.2
`;
  const model=parseCIF(raw);assert.equal(model.atoms.length,2);assert.equal(model.atoms[0].occupancy,.5);
  assert.ok(Math.abs(model.atoms[0].x-(.9*4+.3*6*Math.cos(110*Math.PI/180)))<1e-10);
  assert.deepEqual(symmetryOperator('1/2+x, -y, z')([.1,.2,.3]),[.6,-.2,.3]);
  assert.throws(()=>symmetryOperator('globalThis.process.exit(),y,z'));
  assert.throws(()=>symmetryOperator('2*x,y,z'));
  assert.throws(()=>parseCIF(raw.replace("'x,y,z'\n'-x,-y,-z'", "'x,y,z'\n'-x,-y,-z'\n'bad,y,z'")));
  assert.throws(()=>parseCIF(raw.replace('_cell_angle_beta 110','_cell_angle_beta ?')));
  assert.throws(()=>parseCIF(raw.replace("loop_\n_symmetry_equiv_pos_as_xyz\n'x,y,z'\n'-x,-y,-z'\n",'')));
  assert.throws(()=>parseCIF(raw+'\ndata_other\n'));
});
