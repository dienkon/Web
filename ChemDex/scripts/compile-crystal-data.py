"""Export selected published AMCSD structures from Larixite's public SQLite snapshot.

Run with Python 3.12 + gemmi==0.7.5. The database is a cache, not a runtime dependency.
Coordinates retain Larixite's 1/4,000,000 fractional quantization; uncertainties
and thermal ellipsoids cannot be recovered from that transport and are not invented.
"""
import argparse
import base64
import hashlib
import itertools
import json
import math
from pathlib import Path
import re
import sqlite3
import struct
import gemmi

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / '.cache/crystal-research/amcsd_cif2.db'
OUT = ROOT / 'assets/periodic-table/crystals'
REPORT = ROOT / 'docs/library-crystal-upgrade/2026-11-11'
TRANSPORT = 'https://docs.xrayabsorption.org/databases/amcsd_cif2.db'
UPSTREAM = 'https://rruff.geo.arizona.edu/AMS/amcsd.php'

# Selection is explicit: no first-hit search or automatic high-pressure substitution.
MINERALS = {
    'beryl':1040, 'borax':9647, 'graphite':14675, 'fluorite':8645,
    'halite':3397, 'magnesite':990, 'gibbsite':10761, 'boehmite':19146,
    'diaspore':7340, 'quartz':789, 'apatite':1256, 'sulfur':10058,
    'sylvite':3201, 'calcite':984, 'thortveitite':1160, 'rutile':1736,
    'vanadinite':5225, 'chromite':4961, 'pyrolusite':11760, 'hematite':143,
    'cobaltite':883, 'pentlandite':437, 'chalcopyrite':9476, 'sphalerite':110,
    'germanite':959, 'arsenopyrite':112, 'clausthalite':10048,
    'lepidolite':640, 'celestine':5112, 'xenotime':1706, 'zircon':697,
    'columbite':1436, 'molybdenite':9788, 'laurite':10195,
    'native-platinum':14947, 'acanthite':10584, 'cassiterite':9162,
    'stibnite':8636, 'calaverite':9826, 'pollucite':159, 'barite':5144,
    'monazite':1700, 'tantalite':18628, 'scheelite':13201,
    'native-gold':13108, 'cinnabar':12137, 'galena':10046,
    'bismuthinite':3562, 'uraninite':11728, 'thorite':9633, 'spodumene':355,
}
ELEMENTS = {
    'Li':11220, 'Be':12878, 'B':9230, 'C':14675, 'Na':11223,
    'Mg':12871, 'Al':11136, 'Si':12843, 'P':11250, 'S':10058,
    'K':13214, 'Ca':13147, 'Sc':9167, 'Ti':20263, 'V':14111,
    'Cr':11209, 'Fe':8169, 'Co':9140, 'Ni':13097, 'Cu':13087,
    'Zn':12940, 'Ga':10597, 'Ge':12844, 'As':12835,
    'Se':12674, 'Rb':12170, 'Sr':13142, 'Y':9166, 'Zr':11201,
    'Nb':11224, 'Mo':12937, 'Ru':11191, 'Rh':14948, 'Pd':11155,
    'Ag':13118, 'Cd':12941, 'In':14125, 'Sn':11248, 'Sb':12838,
    'Te':11258, 'I':11273, 'Cs':11211, 'Ba':13145,
    'La':11203, 'Ce':9169, 'Pr':11205, 'Nd':11204, 'Sm':9181,
    'Eu':9172, 'Gd':11176, 'Tb':9174, 'Dy':11172, 'Ho':9176,
    'Er':11174, 'Tm':9178, 'Yb':9179, 'Lu':9180,
    'Hf':11178, 'Ta':11230, 'W':8068, 'Re':11190, 'Os':11188,
    'Ir':14950, 'Pt':14947, 'Au':13108, 'Tl':11197, 'Pb':12874,
    'Bi':12841, 'Ac':11134, 'Th':11162, 'U':11262,
}
NOTES = {
    'bauxite':'Bauxite là hỗn hợp đá/quặng. Ba mô hình gibbsite, boehmite và diaspore là các pha riêng, không phải một ô mạng chung của bauxite.',
    'lepidolite':'Mẫu lepidolite 3T cụ thể; nhóm mica lithium có nhiều polytype. Không áp cấu trúc 3T cho mọi mẫu lepidolite.',
    'tantalite':'Dùng mẫu tantalite-(Mn) có công thức đo Mn0.88Fe0.09(Ta1.72Nb0.28)O6; không gán tọa độ này cho tantalite-(Fe).',
    'calaverite':'Chỉ biểu diễn cấu trúc trung bình tuần hoàn trong bản ghi CIF; không tái dựng đầy đủ điều biến bất tương xứng của calaverite.',
    'uraninite':'Pha UO2 tham chiếu theo tài liệu tổng hợp; quặng uraninite tự nhiên có thể không đúng tỉ lượng, chứa tạp chất và tổn thương phóng xạ.',
    'native-gold':'Pha Au tham chiếu; không mô phỏng hợp kim Au–Ag hay hình dạng hạt vàng tự nhiên.',
    'native-platinum':'Pha Pt tham chiếu; không mô phỏng hợp kim hoặc vị trí nguyên tố vết trong platinum tự sinh.',
    'C':'Đây là graphite; carbon còn có kim cương và các dạng thù hình khác.',
    'B':'Dạng alpha boron rhombohedral trong bản ghi; không đại diện mọi dạng thù hình của boron.',
    'P':'Đây là phosphorus đen; không đại diện phosphorus trắng hoặc đỏ.',
    'Cs':'Bản ghi đo ở 78 K; ô mạng này không phải phép đo ở nhiệt độ phòng.',
    'Rb':'Bản ghi ghi rõ hằng số mạng ở 297 K là giá trị ước lượng; giữ nguyên ghi chú nguồn.',
    'boehmite':'Độ chiếm chỗ H theo bản ghi là 0,04; đây là mô hình tinh chỉnh được công bố, không bổ sung các vị trí H chưa được xác định.',
    'pollucite':'Bản ghi không định vị H của nước; không tự thêm các nguyên tử H vào mô hình.',
}

def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode())

def decode(value, count, default=None):
    if value in (None, '0', 0):
        return [default] * count
    raw = base64.b64decode(value)
    values = [x[0]/4e6 for x in struct.iter_unpack('<i', raw)]
    if len(values) != count or any(v in (2,3) for v in values):
        raise ValueError('Missing or inconsistent fractional coordinates / occupancy')
    return values

def number(value):
    return float(str(value).split('(')[0])

def extract(conn, ident):
    row = dict(conn.execute('''select cif.*, minerals.name,spacegroups.hm_notation,
        spacegroups.symmetry_xyz,publications.journalname,publications.year,
        publications.volume,publications.page_first,publications.page_last
        from cif join minerals on minerals.id=cif.mineral_id
        join spacegroups on spacegroups.id=cif.spacegroup_id
        join publications on publications.id=cif.publication_id where cif.id=?''', (ident,)).fetchone())
    authors = [r[0] for r in conn.execute('''select authors.name from authors
        join publication_authors on authors.id=publication_authors.author_id
        where publication_id=? order by authors.id''', (row['publication_id'],))]
    labels = json.loads(row['atoms_sites'])
    n = len(labels)
    xyz = [decode(row['atoms_'+axis], n) for axis in 'xyz']
    occ = decode(row['atoms_occupancy'], n, 1)
    cell = [number(row[k]) for k in ('a','b','c','alpha','beta','gamma')]
    unit = gemmi.UnitCell(*cell)
    matrix = unit.orth.mat.tolist()
    ops = json.loads(row['symmetry_xyz'])
    operators = [gemmi.Op(op) for op in ops]
    sites, expanded = [], []
    for i,label in enumerate(labels):
        match = re.match(r'([A-Z][a-z]?)', label)
        if not match: raise ValueError(f'Unknown atom type {label}')
        element = match[1]
        if gemmi.Element(element).atomic_number == 0 and element.startswith(('O','H','C','S','B','N','F','P','I')):
            element=element[0] # e.g. Oa/Ob are oxygen site labels, not elements
        if gemmi.Element(element).atomic_number == 0: raise ValueError(label)
        site = {'label':label, 'element':element, 'fractional':[xyz[k][i] for k in range(3)], 'occupancy':occ[i]}
        if not 0 <= occ[i] <= 1.001: raise ValueError(f'Invalid occupancy {label}:{occ[i]}')
        sites.append(site)
        seen = []
        for op in operators:
            frac = [v % 1 for v in op.apply_to_xyz(site['fractional'])]
            frac = [0.0 if min(v,1-v) < 2e-6 else round(v,8) for v in frac]
            if any(all(min(abs(a-b),1-abs(a-b))<2e-5 for a,b in zip(frac,old)) for old in seen):continue
            seen.append(frac)
            position = unit.orthogonalize(gemmi.Fractional(*frac))
            expanded.append({'element':element,'label':label,'fractional':frac,
                'position':[round(v,7) for v in position], 'occupancy':occ[i]})
    # Coincident distinct chemical species describe disorder, not simultaneous full atoms.
    groups = []
    for atom in expanded:
        group = next((g for g in groups if all(abs(a-b)<2e-5 for a,b in zip(g[0]['fractional'],atom['fractional']))),None)
        if group is None: groups.append([atom])
        else: group.append(atom)
    max_occupancy = max(sum(a['occupancy'] for a in g) for g in groups)
    if max_occupancy > 1.025: raise ValueError(f'Overoccupied site in AMCSD {ident}: {max_occupancy}')
    composition = {}
    for atom in expanded:composition[atom['element']] = round(composition.get(atom['element'],0)+atom['occupancy'],6)
    declared = number(row['cell_volume'])
    if abs(unit.volume-declared)/unit.volume > .015: raise ValueError(f'Cell volume mismatch {ident}')
    title = row['pub_title'].strip()
    if 'H' in re.findall(r'[A-Z][a-z]?',row['formula']) and 'H' not in composition:
        missing_h='Nguồn có H trong công thức nhưng không cho tọa độ H; mô hình chỉ vẽ các vị trí đã công bố.'
    else:missing_h=''
    reference = {'authors':authors,'title':title,'journal':row['journalname'],
        'year':row['year'],'volume':row['volume'],'pages':f"{row['page_first']}–{row['page_last']}"}
    return {'amcsdId':f'{ident:07d}','mineralName':row['name'],'formula':row['formula'],
        'spaceGroup':re.sub(r'\s*%var\d+%', '',row['hm_notation']),
        'cell':dict(zip(('a','b','c','alpha','beta','gamma'),cell)),
        'volume':unit.volume,'declaredVolume':declared,'basis':matrix,
        'symmetryOperations':ops,'asymmetricSites':sites,'atoms':expanded,
        'siteCount':len(groups),'speciesPositionCount':len(expanded),
        'cellComposition':composition,'mixedSiteCount':sum(len(g)>1 for g in groups),
        'reference':reference,'source':UPSTREAM,'transport':TRANSPORT,
        'limitations':missing_h,
        'coordinatePrecision':'Larixite fractional coordinate quantization: 0.00000025; standard uncertainties unavailable in this transport.',
        'evidence':'literature-compilation' if 'Second edition. Interscience' in title else 'published-structure',
        'validation':{'operatorCount':len(operators),'maxSiteOccupancy':max_occupancy,
            'cellVolumeRelativeError':abs(unit.volume-declared)/unit.volume}}

def cif_text(data):
    quote = gemmi.cif.quote
    lines = ['# Exported from the Larixite AMCSD snapshot; original reference retained.',
        '# Coordinates quantized to 1/4000000 by the transport; no fabricated uncertainties.',
        f"data_amcsd_{data['amcsdId']}", f"_database_code_amcsd {data['amcsdId']}",
        '_chemical_name_mineral '+quote(data['mineralName']),
        '_chemical_formula_sum '+quote(data['formula']),
        '_symmetry_space_group_name_H-M '+quote(data['spaceGroup'])]
    for key,val in data['cell'].items():lines.append(f"_cell_{'length' if key in 'abc' else 'angle'}_{key} {val:.9g}")
    lines += [f"_cell_volume {data['volume']:.9g}", 'loop_', '_publ_author_name']
    lines += [quote(a) for a in data['reference']['authors']]
    for key,field in [('_journal_name_full','journal'),('_journal_year','year'),('_journal_volume','volume'),('_publ_section_title','title')]:
        value=quote(str(data['reference'][field]))
        lines.append(key+ ('\n' if value.startswith(';') else ' ') +value)
    lines += ['loop_','_space_group_symop_operation_xyz']+[quote(op) for op in data['symmetryOperations']]
    lines += ['loop_','_atom_site_label','_atom_site_type_symbol','_atom_site_fract_x','_atom_site_fract_y','_atom_site_fract_z','_atom_site_occupancy']
    for s in data['asymmetricSites']:
        lines.append(' '.join([s['label'],s['element']]+[f'{v:.9g}' for v in s['fractional']]+[f"{s['occupancy']:.9g}"]))
    text = '\n'.join(lines)+'\n'
    gemmi.cif.read_string(text) # independently tokenize every exported CIF before writing
    return text

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--database', type=Path, default=DB)
    args=parser.parse_args()
    conn=sqlite3.connect(args.database); conn.row_factory=sqlite3.Row
    dbhash=hashlib.sha256(args.database.read_bytes()).hexdigest()
    catalog={'schema':'chemdex.published-crystals/1','date':'2026-11-11',
        'transport':TRANSPORT,'transportSha256':dbhash,'gemmiVersion':gemmi.__version__,
        'minerals':{},'elements':{},'structures':[]}
    for category,selections in [('minerals',MINERALS),('elements',ELEMENTS)]:
        for key,ident in selections.items():
            slug = key if category=='minerals' else 'nguyen-to-'+key.lower()
            data=extract(conn,ident)
            if category=='elements' and set(data['cellComposition'])!={key}:raise ValueError(f'Impure element record: {key}')
            data['id']=slug
            data['note']=NOTES.get(key,'')
            prefix=f'/assets/periodic-table/crystals/{slug}'
            meta={k:data[k] for k in ('id','amcsdId','mineralName','formula','spaceGroup','cell','volume','siteCount','mixedSiteCount','reference','source','evidence','note','limitations')}
            meta.update({'data':prefix+'.json','cif':prefix+'.cif','model':prefix+'.glb','preview':prefix+'.png'})
            catalog[category][key]=meta
            catalog['structures'].append(meta)
            dump(OUT/(slug+'.json'),data)
            (OUT/(slug+'.cif')).write_bytes(cif_text(data).encode())
    catalog['bauxitePhases']=['gibbsite','boehmite','diaspore']
    catalog['mixtureNote']=NOTES['bauxite']
    dump(ROOT/'data/crystal-catalog.json',catalog)
    dump(REPORT/'crystal-selection.json',catalog)
    print(json.dumps({'mineralPhases':len(MINERALS),'elementPhases':len(ELEMENTS),'structures':len(catalog['structures']),'databaseSha256':dbhash}))

if __name__=='__main__':main()
