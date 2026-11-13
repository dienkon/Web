"""Export explicitly reviewed COD entries, retaining the original CIF verbatim.

Gemmi expands the actual CIF symmetry and resolves special-position duplicates.
Both the full elemental inventory and declared formula-units Z must agree with
the reviewed molecular identity. A formula alone never selects an entry.
"""
import hashlib
import html
import json
import math
from pathlib import Path
import re
import unicodedata
import gemmi
from crystal_hydrogen import published_hydrogen_bonds

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT/'.cache/cod-research'
REPORT = ROOT/'docs/molecular-crystal-upgrade/2026-11-12'

def string(block, *tags):
    for tag in tags:
        raw=block.find_value(tag)
        if raw and raw not in ('.','?'):
            return gemmi.cif.as_string(raw).strip()
    return None

def number(block, *tags):
    value=string(block,*tags)
    if not value: return None
    parsed=gemmi.cif.as_number(value)
    return parsed if math.isfinite(parsed) else None

def readable(value):
    if value is None:return None
    value=html.unescape(value)
    value=re.sub(r'\\"([AEIOUYaeiouy])',lambda m:unicodedata.normalize('NFC',m[1]+'\u0308'),value)
    value=re.sub(r'\\([abgdp])(?=[^A-Za-z]|$)',lambda m:{'a':'α','b':'β','g':'γ','d':'δ','p':'π'}[m[1]],value)
    return re.sub(r'~(\d+)~',lambda m:m[1].translate(str.maketrans('0123456789','₀₁₂₃₄₅₆₇₈₉')),value)

def formula_counts(formula):
    matches=list(re.finditer(r'([A-Z][a-z]?)(\d*)',formula))
    if ''.join(m.group()for m in matches)!=formula: raise ValueError('Use an explicit expanded formula')
    out={}
    for match in matches:out[match[1]]=out.get(match[1],0)+int(match[2]or 1)
    return out

def extract(selection):
    ident=str(selection['codId'])
    exclusions=json.loads((ROOT/'data/crystal-source-exclusions.json').read_text(encoding='utf-8'))
    if any(row['provider']=='COD' and row['id']==ident for row in exclusions): raise ValueError('Source excluded after scientific review: '+ident)
    cached=CACHE/f'{ident}.cif'
    raw=(cached if cached.exists() else ROOT/f'assets/periodic-table/crystals/cod-{ident}.cif').read_bytes()
    transport_file=CACHE/f'{ident}.transport.json'
    transport=json.loads(transport_file.read_text(encoding='utf-8')) if transport_file.exists() else {'url':selection.get('transport',f'https://www.crystallography.net/cod/{ident}.cif'),'sha256':selection['sha256']}
    digest=hashlib.sha256(raw).hexdigest()
    if digest!=transport['sha256']: raise ValueError('CIF transport checksum changed')
    if selection.get('sha256') and digest!=selection['sha256']: raise ValueError('Reviewed CIF revision changed')
    block=gemmi.cif.read_string(raw.decode('utf-8')).sole_block()
    small=gemmi.make_small_structure_from_block(block)
    if not small.spacegroup: raise ValueError('Unresolved CIF space group')
    problems=small.check_spacegroup()
    if problems: raise ValueError('Inconsistent CIF space group: '+problems)
    if not small.sites: raise ValueError('No atom sites')
    operators=[gemmi.Op(op) for op in small.symops] if small.symops else list(small.spacegroup.operations())
    group=gemmi.find_spacegroup_by_ops(gemmi.GroupOps(operators))
    if group is None or group.number!=small.spacegroup.number: raise ValueError('Symmetry operations do not confirm the group')
    unit=small.cell
    sites=[]
    for site in small.sites:
        if site.element.name=='D': raise ValueError('Deuterated sample is not the reviewed hydrogen compound')
        sites.append({'label':site.label,'element':site.element.name,'fractional':list(site.fract),
            'occupancy':site.occ,'disorderGroup':site.disorder_group,'uIso':site.u_iso})
    atoms=[]
    for site in small.get_all_unit_cell_sites():
        frac=[v%1 for v in site.fract]
        position=unit.orthogonalize(gemmi.Fractional(*frac))
        atoms.append({'label':site.label,'element':site.element.name,'fractional':frac,
            'position':list(position),'occupancy':site.occ,'disorderGroup':site.disorder_group})
    groups=[]
    for atom in atoms:
        if not 0<atom['occupancy']<=1.001: raise ValueError('Unsupported occupancy')
        grouped=next((g for g in groups if all(min(abs(a-b),1-abs(a-b))<2e-5 for a,b in zip(g[0]['fractional'],atom['fractional']))),None)
        if grouped is None:groups.append([atom])
        else:grouped.append(atom)
    if any(sum(a['occupancy']for a in g)>1.002 for g in groups): raise ValueError('Overfilled coincident sites')
    actual={}
    for atom in atoms:actual[atom['element']]=actual.get(atom['element'],0)+atom['occupancy']
    expected=formula_counts(selection['formula'])
    if set(actual)!=set(expected): raise ValueError(f'Missing/extra elements: {actual} vs {expected}')
    ratios=[actual[e]/n for e,n in expected.items()]
    if max(ratios)-min(ratios)>.015: raise ValueError(f'Expanded occupancy/composition mismatch: {actual}')
    z=number(block,'_cell_formula_units_Z')
    if z is not None and any(abs(r-z)>.015 for r in ratios): raise ValueError(f'Formula-unit count disagrees with Z={z}: {actual}')
    declared_volume=number(block,'_cell_volume')
    if declared_volume and abs(unit.volume-declared_volume)/declared_volume>.005: raise ValueError('Declared CIF volume disagrees with metric')
    temperature=string(block,'_diffrn_ambient_temperature','_cell_measurement_temperature')
    pressure=string(block,'_diffrn_ambient_pressure','_cell_measurement_pressure')
    hydrogen_method=string(block,'_atom_sites_solution_hydrogens','_refine_ls_hydrogen_treatment')
    reference={'authors':[readable(gemmi.cif.as_string(v).strip()) for v in block.find_values('_publ_author_name')],
        'title':readable(string(block,'_publ_section_title')),'journal':readable(string(block,'_journal_name_full')),
        'year':number(block,'_journal_year'),'volume':string(block,'_journal_volume'),
        'pages':'–'.join(filter(None,[string(block,'_journal_page_first'),string(block,'_journal_page_last')])),
        'doi':string(block,'_journal_paper_doi')}
    if not reference['authors']or not reference['title']:raise ValueError('No attributable structure publication')
    data={'id':'cod-'+ident,'codId':ident,'referenceId':'cod:'+ident,'mineralName':selection['name'],
        'formula':selection['formula'],'sourceFormula':string(block,'_chemical_formula_sum'),
        'subjectIds':selection['subjectIds'],'spaceGroup':group.xhm(),'spaceGroupNumber':group.number,
        'cell':dict(zip(('a','b','c','alpha','beta','gamma'),unit.parameters)),
        'basis':unit.orth.mat.tolist(),'volume':unit.volume,'declaredVolume':declared_volume,
        'symmetryOperations':[op.triplet()for op in operators],'asymmetricSites':sites,'atoms':atoms,
        'siteCount':len(groups),'speciesPositionCount':len(atoms),'cellComposition':actual,
        'mixedSiteCount':sum(len(g)>1 for g in groups),'formulaUnitsZ':z,
        'conditions':{'temperatureK':temperature,'pressureKPa':pressure,'hydrogenTreatment':hydrogen_method},
        'reference':reference,'source':f'https://www.crystallography.net/cod/{ident}.html',
        'transport':transport['url'],'transportSha256':digest,'evidence':'published-structure',
        'note':selection['note'],'limitations':selection.get('limitations',''),
        'coordinatePrecision':'Original CIF lexical precision and uncertainties are retained in the downloadable CIF.'}
    hydrogen_geometry=published_hydrogen_bonds(block,unit,operators,atoms)
    if hydrogen_geometry:data['hydrogenBondGeometry']=hydrogen_geometry
    prefix='/assets/periodic-table/crystals/'+data['id']
    meta={k:data[k]for k in ('id','codId','referenceId','mineralName','formula','subjectIds','spaceGroup','spaceGroupNumber','cell','volume','siteCount','mixedSiteCount','conditions','reference','source','transport','transportSha256','evidence','note','limitations','coordinatePrecision')}
    meta.update({'data':prefix+'.json','cif':prefix+'.cif','model':prefix+'.glb','preview':prefix+'.png'})
    return data,meta,raw

def main():
    selections=json.loads((ROOT/'data/cod-crystal-selections.json').read_text(encoding='utf-8'))
    catalog={'schema':'chemdex.cod-crystals/1','date':'2026-11-12','structures':[]}
    audit=[]
    for selection in selections:
        if not re.fullmatch(r'[a-f0-9]{64}',selection.get('sha256','')):raise ValueError('Every published selection must pin its original CIF checksum')
        data,meta,raw=extract(selection)
        (ROOT/meta['data'].lstrip('/')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (ROOT/meta['cif'].lstrip('/')).write_bytes(raw)
        catalog['structures'].append(meta)
        audit.append({'codId':data['codId'],'sha256':data['transportSha256'],'cellComposition':data['cellComposition'],
            'formulaUnitsZ':data['formulaUnitsZ'],'conditions':data['conditions'],'decision':data['note']})
    (ROOT/'data/cod-crystal-models.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    REPORT.mkdir(parents=True,exist_ok=True)
    (REPORT/'cod-selection-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'structures':len(catalog['structures'])}))

if __name__=='__main__':main()
