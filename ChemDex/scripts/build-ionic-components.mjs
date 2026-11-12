import fs from 'node:fs';
import {parseFormula} from '../shared/chemistry/formula.mjs';
const catalog=JSON.parse(fs.readFileSync('shared/reaction-catalog.generated.json','utf8'));
const entries={};
const key=counts=>JSON.stringify(Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)));
function add(formula,ions){
 const actual={};let charge=0;
 for(const ion of ions){
  if(!Number.isInteger(ion.count)||ion.count<1||!Number.isInteger(ion.charge))throw Error(`Invalid component ${formula}`);
  for(const [element,n]of Object.entries(parseFormula(ion.formula)))actual[element]=(actual[element]??0)+n*ion.count;
  charge+=ion.count*ion.charge;
 }
 if(charge!==0||key(actual)!==key(parseFormula(formula)))throw Error(`Unbalanced component registry ${formula}`);
 entries[formula]=ions;
}
for(const species of catalog.species)if(species.ions?.some(i=>i.charge>0&&i.formula!=='H'))add(species.formula,species.ions);
// Reviewed school-level oxidation-state component diagrams. These describe
// formula ratios, not freely dissolved ions or the local crystal coordination.
const oxides={Li2O:['Li',1,2,1],Na2O:['Na',1,2,1],K2O:['K',1,2,1],MgO:['Mg',2,1,1],CaO:['Ca',2,1,1],SrO:['Sr',2,1,1],BaO:['Ba',2,1,1],ZnO:['Zn',2,1,1],CdO:['Cd',2,1,1],Ag2O:['Ag',1,2,1],Cu2O:['Cu',1,2,1],CuO:['Cu',2,1,1],FeO:['Fe',2,1,1],Fe2O3:['Fe',3,2,3],Al2O3:['Al',3,2,3],Cr2O3:['Cr',3,2,3],NiO:['Ni',2,1,1],CoO:['Co',2,1,1],MnO:['Mn',2,1,1],MnO2:['Mn',4,1,2],TiO2:['Ti',4,1,2],SnO:['Sn',2,1,1],SnO2:['Sn',4,1,2],PbO:['Pb',2,1,1],PbO2:['Pb',4,1,2]};
for(const [formula,[element,charge,count,oxygen]]of Object.entries(oxides))add(formula,[{formula:element,charge,count},{formula:'O',charge:-2,count:oxygen}]);
add('Fe3O4',[{formula:'Fe',charge:2,count:1},{formula:'Fe',charge:3,count:2},{formula:'O',charge:-2,count:4}]);
add('Pb3O4',[{formula:'Pb',charge:2,count:2},{formula:'Pb',charge:4,count:1},{formula:'O',charge:-2,count:4}]);
for(const [formula,metal,count,charge]of [['Na2O2','Na',2,1],['K2O2','K',2,1],['BaO2','Ba',1,2],['CaO2','Ca',1,2]])add(formula,[{formula:metal,count,charge},{formula:'O2',count:1,charge:-2}]);
add('C14H14N3NaO3S',[{formula:'Na',count:1,charge:1},{formula:'C14H14N3O3S',count:1,charge:-1}]);
fs.writeFileSync('shared/ionic-components.generated.json',JSON.stringify({schema:'chemdex.ionic-components/1',interpretation:'Formula-ratio component diagrams. Not a prediction of dissolution, crystal coordination or electron density.',entries},null,2)+'\n');
console.log(`Validated ${Object.keys(entries).length} charge- and composition-balanced component definitions.`);
