"""Explicit, reviewed AMCSD selections for common teaching substances.

Uses the already pinned Larixite database and exporter. Never infers a cell from
the formula, substitutes a hydrate or selects the first search result at runtime.
"""
import importlib.util
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import gemmi

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('crystal_export', ROOT/'scripts/compile-crystal-data.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)

# slug: (AMCSD id, exact formula, phase name, selection reason/conditions)
SELECTED = {
 'cuprite': (7351,'Cu2O','Cuprite · Cu₂O','Phân tích mật độ điện tích Cu2O; pha cuprite, không phải CuO.'),
 'tenorite': (18033,'CuO','Tenorite · CuO','Bản cấu trúc tenorite; thông số đơn tà, không dùng mạng NaCl.'),
 'corundum': (9325,'Al2O3','Corundum · α-Al₂O₃','Pha alpha; không đại diện gamma alumina.'),
 'periclase': (501,'MgO','Periclase · MgO','24 °C, 1 atm; standard mount.'),
 'zincite': (5203,'ZnO','Zincite · ZnO','Mẫu 293 K, model 2-c; pha wurtzite.'),
 'portlandite': (117,'CaO2H2','Portlandite · Ca(OH)₂','Mẫu 25 °C, có vị trí hydrogen; đây là chất rắn, không phải nước vôi trong.'),
 'nitratine': (9441,'NaNO3','Nitratine · NaNO₃','Nhiễu xạ neutron, mẫu 20 °C.'),
 'niter': (13162,'KNO3','KNO₃ · mẫu 25 °C','Giữ nhãn pha của bài gốc; không dùng pha gamma thay cho mẫu này.'),
 'sassolite': (9809,'BO3H3','Sassolite · H₃BO₃','Mẫu 105 K, multipole refinement; không tự gán điều kiện phòng.'),
 'chalcanthite': (10779,'CuSO9H10','Chalcanthite · CuSO₄·5H₂O','Mẫu hydrogen trong nghiên cứu neutron; không dùng mẫu thay thế deuterium.'),
 'siderite': (101,'FeCO3','Siderite · FeCO₃','Bản tổng hợp carbonate rhombohedral; chưa gán nhiệt độ đo.'),
 'cerussite': (11016,'PbCO3','Cerussite · PbCO₃','Tinh chỉnh đơn tinh thể neutron; cấu trúc kiểu aragonite.'),
 'anglesite': (5558,'PbSO4','Anglesite · PbSO₄','Tinh chỉnh nhóm sulfate; không lấy bản ghi bị thiếu O.'),
 'witherite': (235,'BaCO3','Witherite · BaCO₃','Mẫu trong nghiên cứu carbonate orthorhombic.'),
 'strontianite': (234,'SrCO3','Strontianite · SrCO₃','Chọn mẫu đúng tỉ lượng; không dùng mẫu pha Ca.'),
 'massicot': (10011,'PbO','Massicot · β-PbO','Pha trực thoi; khác litharge tứ phương.'),
 'bunsenite': (11371,'NiO','Bunsenite · NiO','Cấu trúc trung bình kiểu rocksalt từ tài liệu tổng hợp; không mô tả méo từ giảo.'),
 'otavite': (103,'CdCO3','Otavite · CdCO₃','Bản tổng hợp carbonate; không dùng dung dịch rắn Mg-Cd.'),
 'greenockite': (15177,'CdS','Greenockite · CdS','Pha wurtzite; CdS còn có pha zincblende.'),
 'arcanite': (9456,'K2SO4','Arcanite · K₂SO₄','Bản xác định lại cấu trúc potassium sulfate.'),
 'thenardite': (5113,'Na2SO4','Thenardite · Na₂SO₄','Pha khan; không thay cho mirabilite ngậm nước.'),
 'anhydrite': (19829,'CaSO4','Anhydrite · CaSO₄','Pha khan; không thay cho gypsum.'),
 'sellaite': (9163,'MgF2','Sellaite · MgF₂','Cấu trúc kiểu rutile từ bản tinh chỉnh tọa độ.'),
 'villiaumite': (9251,'NaF','Villiaumite · NaF','Mẫu 29,6 °C; cấu trúc rocksalt.'),
 'lime': (8276,'CaO','Lime · CaO','Mẫu 298 K; dây nung PtRh10% được nêu trong nguồn.'),
 'sodium-bromide': (9258,'NaBr','NaBr · rocksalt','Mẫu 31,5 °C; cấu trúc rocksalt.'),
 'potassium-bromide': (11995,'KBr','KBr · rocksalt','Lattice constants of binary alkali halides; không tự gán nhiệt độ.'),
 'lithium-chloride': (11343,'LiCl','LiCl · rocksalt','Bản tài liệu tổng hợp; không coi là đo độc lập của ChemDex.'),
 'hydrophilite': (11763,'CaCl2','Hydrophilite · CaCl₂','Pha CaCl2 khan, rutile biến dạng.'),
 'tolbachite': (1544,'CuCl2','Tolbachite · CuCl₂','Pha CuCl2 khan; không dùng cho CuCl2·2H2O.'),
 'molysite': (12857,'FeCl3','Molysite · FeCl₃','Tinh chỉnh mẫu bản mỏng FeCl3 khan.'),
 'salammoniac': (15628,'NH4Cl','Salammoniac · NH₄Cl','Tinh chỉnh định hướng NH4; giữ occupancy từ bản gốc.'),
 'lopezite': (14228,'K2Cr2O7','Lopezite · K₂Cr₂O₇','Bản tinh chỉnh cấu trúc; không trộn với beta-K2Cr2O7.'),
 'lead-iodide': (11793,'PbI2','PbI₂ · kiểu CdI₂','Bản tổng hợp cấu trúc lớp; PbI2 có các polytype khác.'),
 'chalcocyanite': (14619,'CuSO4','Chalcocyanite · CuSO₄','Tinh chỉnh CuSO4 khan; không thay cho tinh thể pentahydrate màu xanh.'),
 'silver-chloride': (15197,'AgCl','AgCl · Phase I','Mẫu 0,0 GPa; pha I.'),
 'silver-bromide': (15213,'AgBr','AgBr · Phase I','Mẫu 0,0 GPa; pha I.'),
 'silver-iodide': (15225,'AgI','AgI · Phase II','Mẫu 0,0 GPa; giữ nhãn pha II của bản ghi gốc.'),
}

EXPANSION_FILE = ROOT/'data/substance-crystal-expansion.selections.json'
if EXPANSION_FILE.exists():
    expansion = json.loads(EXPANSION_FILE.read_text(encoding='utf-8'))
    if set(expansion) & set(SELECTED):
        raise ValueError('Expansion must not overwrite previously reviewed selections')
    SELECTED.update(expansion)

def counts(formula):
    matches = list(re.finditer(r'([A-Z][a-z]?)(\d*)', formula))
    if ''.join(m.group() for m in matches) != formula: raise ValueError(formula)
    return {m[1]:int(m[2] or 1) for m in matches}

def main():
    conn=sqlite3.connect(exporter.DB); conn.row_factory=sqlite3.Row
    dbhash=hashlib.sha256(exporter.DB.read_bytes()).hexdigest()
    expected=json.loads((ROOT/'data/crystal-catalog.json').read_text(encoding='utf-8'))['transportSha256']
    if dbhash!=expected: raise ValueError('AMCSD snapshot hash changed; review selections before export')
    catalog={'schema':'chemdex.substance-crystals/1','date':'2026-11-12','structures':[], 'elements':{}, 'transport':exporter.TRANSPORT,'transportSha256':dbhash}
    cold_elements={'Ar':'solid-argon','Kr':'solid-krypton','Ne':'solid-neon','Xe':'solid-xenon','He':'solid-helium','N':'solid-nitrogen-alpha','Cl':'solid-chlorine','Br':'solid-bromine','F':'solid-fluorine-alpha','O':'solid-oxygen-beta'}
    audit=[]
    for slug,(ident,formula,name,note) in SELECTED.items():
        data=exporter.extract(conn,ident)
        # Resolve the actual, unmodified operations instead of trusting legacy
        # text labels (e.g. "P a 3" in the source means centrosymmetric Pa-3).
        group=gemmi.find_spacegroup_by_ops(gemmi.GroupOps([gemmi.Op(op) for op in data['symmetryOperations']]))
        if group is None: raise ValueError(f'{slug}: symmetry operations have no verified space group setting')
        data.update({'spaceGroupOriginal':data['spaceGroup'], 'spaceGroup':group.xhm(), 'spaceGroupNumber':group.number})
        expected=counts(formula); actual=data['cellComposition']
        if set(actual)!=set(expected): raise ValueError(f'{slug}: missing/extra atoms: {actual} vs {expected}')
        ratios=[actual[e]/n for e,n in expected.items()]
        if max(ratios)-min(ratios)>0.015: raise ValueError(f'{slug}: occupancy/composition mismatch {actual}')
        data.update({'id':'chat-'+slug,'mineralName':name,'note':note})
        prefix='/assets/periodic-table/crystals/'+data['id']
        meta={k:data[k] for k in ('id','amcsdId','mineralName','formula','spaceGroup','spaceGroupOriginal','spaceGroupNumber','cell','volume','siteCount','mixedSiteCount','reference','source','evidence','note','limitations')}
        meta.update({'data':prefix+'.json','cif':prefix+'.cif','model':prefix+'.glb','preview':prefix+'.png'})
        exporter.dump(ROOT/meta['data'].lstrip('/'),data)
        (ROOT/meta['cif'].lstrip('/')).write_bytes(exporter.cif_text(data).encode())
        catalog['structures'].append(meta)
        for symbol, selection in cold_elements.items():
            if selection == slug:
                catalog['elements'][symbol] = meta
        audit.append({'id':data['id'],'amcsdId':data['amcsdId'],'expectedFormula':formula,'cellComposition':actual,'spaceGroupOriginal':data['spaceGroupOriginal'],'spaceGroup':data['spaceGroup'],'spaceGroupNumber':data['spaceGroupNumber'],'decision':note,'reference':data['reference']})
    exporter.dump(ROOT/'data/substance-crystal-models.json',catalog)
    target=ROOT/'docs/learning-expansion/2026-11-12';target.mkdir(parents=True,exist_ok=True)
    exporter.dump(target/'substance-crystal-selection.json',audit)
    print(json.dumps({'structures':len(catalog['structures'])}))

if __name__=='__main__': main()
