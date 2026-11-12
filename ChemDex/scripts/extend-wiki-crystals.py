"""Additional Wiki-compared phases; distinguish measured sites from prototypes."""
import importlib.util
import json
from pathlib import Path
import sqlite3
import gemmi

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('crystal_compiler',ROOT/'scripts/compile-crystal-data.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
wiki={r['symbol']:r for r in json.loads((ROOT/'data/wiki-crystal-reference.json').read_text(encoding='utf8'))['elements']}

def prototype(symbol,cell,group,positions,pearson,note):
    reference=wiki[symbol]
    unit=gemmi.UnitCell(*cell);ops=list(gemmi.find_spacegroup_by_name(group).operations())
    atoms=[];sites=[]
    for i,position in enumerate(positions):
        label=symbol+str(i+1)
        sites.append({'label':label,'element':symbol,'fractional':position,'occupancy':1})
        seen=[]
        for op in ops:
            frac=[v%1 for v in op.apply_to_xyz(position)]
            frac=[0.0 if min(v,1-v)<2e-6 else round(v,8) for v in frac]
            if any(all(min(abs(a-b),1-abs(a-b))<2e-5 for a,b in zip(frac,old)) for old in seen):continue
            seen.append(frac)
            xyz=unit.orthogonalize(gemmi.Fractional(*frac))
            atoms.append({'label':label,'element':symbol,'fractional':frac,'position':[round(v,7) for v in xyz],'occupancy':1})
    identifier=f'wiki-{symbol.lower()}-{reference["revisionId"]}'
    return {'id':'nguyen-to-'+symbol.lower(),'symbol':symbol,'referenceId':identifier,'amcsdId':None,
        'mineralName':reference['name'],'formula':symbol,'spaceGroup':group,
        'cell':dict(zip(['a','b','c','alpha','beta','gamma'],cell)),
        'basis':unit.orth.mat.tolist(),'volume':unit.volume,'declaredVolume':unit.volume,
        'symmetryOperations':[op.triplet() for op in ops],'asymmetricSites':sites,'atoms':atoms,
        'siteCount':len(atoms),'speciesPositionCount':len(atoms),'cellComposition':{symbol:len(atoms)},'mixedSiteCount':0,
        'source':reference['article'],'transport':reference['template'],
        'reference':{'authors':['John W. Arblaster'],'title':'Selected Values of the Crystallographic Properties of Elements; thông số được Wikipedia trích dẫn, tại 20 °C (Ra: gần nhiệt độ phòng). Vị trí Wyckoff lý tưởng của prototype '+pearson+'.',
            'journal':'ASM International, ISBN 978-1-62708-155-9','year':2018,'volume':'','pages':''},
        'evidence':'reference-prototype','pearsonSymbol':pearson,'note':note,
        'limitations':'Tọa độ Wyckoff lý tưởng được dựng từ prototype và thông số mạng được trích dẫn; không phải bộ tinh chỉnh vị trí nguyên tử thực nghiệm độc lập.',
        'coordinatePrecision':'Ideal prototype coordinates; the number of shown digits is not experimental uncertainty.',
        'validation':{'operatorCount':len(ops),'maxSiteOccupancy':1,'cellVolumeRelativeError':0}}

conn=sqlite3.connect(base.DB);conn.row_factory=sqlite3.Row
mn=base.extract(conn,9311);mn['id']='nguyen-to-mn';mn['symbol']='Mn';mn['referenceId']='amcsd:0009311';mn['note']='Pha α-Mn, I-43m: 58 nguyên tử trong ô lập phương quy ước, 29 trong ô nguyên thủy. BCC ở đây là mạng Bravais, không phải ô BCC đơn giản chỉ có 2 nguyên tử.'
measured=[mn]
for symbol,ident in [('Np',11263),('Pu',11265),('Am',11202)]:
    data=base.extract(conn,ident);data['id']='nguyen-to-'+symbol.lower();data['symbol']=symbol;data['referenceId']=f'amcsd:{ident:07d}'
    data['note']='Pha đơn chất theo bản ghi công bố; không phải mô hình quặng. Giữ đúng pha nhiệt độ phòng, không thay bằng dạng lập phương ở nhiệt độ cao.'
    measured.append(data)
structures=[*measured,
    prototype('Tc',[2.7412,2.7412,4.3990,90,90,120],'P 63/m m c',[[1/3,2/3,1/4]],'hP2','HCP hai lớp AB, hai nguyên tử/ô. Thông số Wiki tại 20 °C; không dùng cùng một hình học cho DHCP.'),
    prototype('Pm',[3.6393,3.6393,11.739,90,90,120],'P 63/m m c',[[0,0,0],[1/3,2/3,3/4]],'hP4','DHCP bốn lớp ABAC, bốn nguyên tử/ô; không thay bằng HCP hai nguyên tử.'),
    prototype('Ra',[5.148,5.148,5.148,90,90,90],'I m -3 m',[[0,0,0]],'cI2','Wiki ghi BCC nhưng dòng Pearson cF4 không phù hợp. Dùng mạng BCC (Im-3m, cI2) theo phần mô tả và nguồn chuyên ngành; không dựng FCC theo dòng Pearson mâu thuẫn.'),
    prototype('Pa',[3.921,3.921,3.235,90,90,90],'I 4/m m m',[[0,0,0]],'tI2','Mạng tứ phương tâm khối: a = b khác c, không dùng khối lập phương BCC thay thế.'),
]
for symbol,cell,group,positions,pearson,citation in [
    ('Po',[3.359,3.359,3.359,90,90,90],'P m -3 m',[[0,0,0]],'cP1','R. J. DeSando and R. C. Lange, J. Inorg. Nucl. Chem. 1966, 28, 1837.'),
    ('Cm',[3.496,3.496,11.331,90,90,120],'P 63/m m c',[[0,0,0],[1/3,2/3,3/4]],'hP4','B. B. Cunningham and J. C. Wallmann, J. Inorg. Nucl. Chem. 1964, 26, 271.'),
    ('Bk',[3.416,3.416,11.069,90,90,120],'P 63/m m c',[[0,0,0],[1/3,2/3,3/4]],'hP4','J. R. Peterson, J. A. Fahey and R. D. Baybarz, J. Inorg. Nucl. Chem. 1971, 33, 3345–3351; DOI 10.1016/0022-1902(71)80656-5.'),
]:
    data=prototype(symbol,cell,group,positions,pearson,'Wiki cho kiểu mạng; hằng số ô lấy từ bảng chuyên ngành WebElements. Điều kiện nhiệt độ không được ghi trong bảng đã dùng; không tự gán 20 °C.')
    data['referenceId']='webelements-'+symbol.lower()+'-2026-11-12'
    data['source']='https://www.webelements.com/'+wiki[symbol]['name'].lower()+'/crystal_structure.html'
    if symbol=='Bk':data['source']='https://webelements.co.uk/berkelium/crystal_structure.html'
    data['transport']=data['source']
    data['reference']={'authors':['WebElements / Mark J. Winter'],'title':wiki[symbol]['name']+' — crystal structures; tài liệu được trang liệt kê: '+citation,'journal':'University of Sheffield / WebElements','year':2026,'volume':'','pages':''}
    data['primaryReference']=citation
    data['limitations']='Vị trí Wyckoff lý tưởng của prototype; thông số ô mạng do WebElements tổng hợp. Không phải bộ tinh chỉnh nguyên tử thực nghiệm riêng của ChemDex.'
    if symbol in ['Cm','Bk']:data['note']+=' DHCP có 4 lớp ABAC, 4 nguyên tử/ô; không coi nhãn hcp viết gọn là ô HCP hai nguyên tử.'
    if symbol=='Po':data['note']+=' Pha α-Po có mạng lập phương đơn giản cP1, một nguyên tử/ô; không dùng pha β dạng thoi thay thế.'
    structures.append(data)
assert [s['siteCount'] for s in structures]==[58,8,16,4,2,4,2,2,1,4,4]
out=ROOT/'assets/periodic-table/crystals';metas=[]
for data in structures:
    prefix='/assets/periodic-table/crystals/'+data['id']
    meta={k:data.get(k) for k in ['id','symbol','referenceId','amcsdId','mineralName','formula','spaceGroup','cell','volume','siteCount','mixedSiteCount','reference','source','evidence','note','limitations','pearsonSymbol','primaryReference']}
    meta.update({'data':prefix+'.json','cif':prefix+'.cif','model':prefix+'.glb','preview':prefix+'.png','wiki':wiki[data['symbol']]})
    base.dump(out/(data['id']+'.json'),data)
    if data['amcsdId']:
        cif=base.cif_text(data)
    else:
        quote=gemmi.cif.quote
        lines=['# Reference prototype from published lattice parameters; not a refined experimental atomic model.',
            'data_'+data['referenceId'], '_database_code_ChemDex '+quote(data['referenceId']),
            '_chemical_formula_sum '+quote(data['formula']), '_symmetry_space_group_name_H-M '+quote(data['spaceGroup'])]
        for key,value in data['cell'].items():lines.append(f'_cell_{"length" if key in "abc" else "angle"}_{key} {value}')
        lines+=['_publ_section_title '+quote(data['reference']['title']),
            '_chemdex_model_limitations '+quote(data['limitations']),
            '_chemdex_parameter_source_url '+quote(data['source']),
            '_journal_name_full '+quote(data['reference']['journal']),
            '_journal_year '+str(data['reference']['year']),'loop_','_publ_author_name']+[quote(author) for author in data['reference']['authors']]
        lines+=['loop_','_space_group_symop_operation_xyz']+[quote(op) for op in data['symmetryOperations']]
        lines+=['loop_','_atom_site_label','_atom_site_type_symbol','_atom_site_fract_x','_atom_site_fract_y','_atom_site_fract_z','_atom_site_occupancy']
        for site in data['asymmetricSites']:lines.append(' '.join([site['label'],site['element']]+[str(v) for v in site['fractional']]+['1']))
        cif='\n'.join(lines)+'\n';gemmi.cif.read_string(cif)
    (out/(data['id']+'.cif')).write_bytes(cif.encode())
    metas.append(meta)
base.dump(ROOT/'data/wiki-crystal-models.json',{'date':'2026-11-12','structures':metas,'elements':{s['symbol']:s for s in metas}})
print(json.dumps({'additionalPhases':len(metas),'publishedStructures':len(measured),'experimentalMnSites':58,'referencePrototypes':len(metas)-len(measured)}))
