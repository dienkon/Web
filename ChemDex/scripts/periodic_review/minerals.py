"""Representative minerals and schematic crystal habits, not atomic structures.

An element may be a trace constituent of the host mineral. This is stated in
the model caption instead of claiming a deposit of the pure element exists.
"""
MINERALS = {
 'beryl': ('Beryl', 'Be₃Al₂Si₆O₁₈', 'hexagonal', '#68b9b2', 'hexagonal'),
 'borax': ('Borax', 'Na₂B₄O₇·10H₂O', 'prismatic', '#d7e5ef', 'monoclinic'),
 'graphite': ('Graphite', 'C', 'plates', '#59626c', 'hexagonal'),
 'fluorite': ('Fluorite', 'CaF₂', 'octahedral', '#a77ae0', 'cubic'),
 'halite': ('Halite', 'NaCl', 'cubic', '#cce8ee', 'cubic'),
 'magnesite': ('Magnesite', 'MgCO₃', 'rhombohedral', '#d2cec0', 'trigonal'),
 'bauxite': ('Bauxite', 'Hỗn hợp gibbsite, boehmite, diaspore và tạp chất', 'aggregate', '#b86b42', 'mixture'),
 'quartz': ('Quartz', 'SiO₂', 'quartz', '#c3d9e8', 'trigonal'),
 'apatite': ('Fluorapatite', 'Ca₅(PO₄)₃F', 'hexagonal', '#6dafa3', 'hexagonal'),
 'sulfur': ('Sulfur tự sinh', 'S₈', 'bipyramid', '#e6c342', 'orthorhombic'),
 'sylvite': ('Sylvite', 'KCl', 'cubic', '#edc3b7', 'cubic'),
 'calcite': ('Calcite', 'CaCO₃', 'rhombohedral', '#e5d8b9', 'trigonal'),
 'thortveitite': ('Thortveitite', '(Sc,Y)₂Si₂O₇', 'prismatic', '#6c8470', 'monoclinic'),
 'rutile': ('Rutile', 'TiO₂', 'prismatic', '#9b5038', 'tetragonal'),
 'vanadinite': ('Vanadinite', 'Pb₅(VO₄)₃Cl', 'hexagonal', '#c54b29', 'hexagonal'),
 'chromite': ('Chromite', 'FeCr₂O₄', 'octahedral', '#51515d', 'cubic'),
 'pyrolusite': ('Pyrolusite', 'MnO₂', 'needles', '#596070', 'tetragonal'),
 'hematite': ('Hematite', 'Fe₂O₃', 'plates', '#75636b', 'trigonal'),
 'cobaltite': ('Cobaltite', 'CoAsS', 'cubic', '#9ca2b0', 'orthorhombic'),
 'pentlandite': ('Pentlandite', '(Fe,Ni)₉S₈', 'aggregate', '#b49a65', 'cubic'),
 'chalcopyrite': ('Chalcopyrite', 'CuFeS₂', 'bipyramid', '#c6a74b', 'tetragonal'),
 'sphalerite': ('Sphalerite', 'ZnS', 'tetrahedral', '#a68046', 'cubic'),
 'germanite': ('Germanite', 'Cu₂₆Fe₄Ge₄S₃₂', 'aggregate', '#ad7e72', 'cubic'),
 'arsenopyrite': ('Arsenopyrite', 'FeAsS', 'prismatic', '#a7aaad', 'monoclinic'),
 'clausthalite': ('Clausthalite', 'PbSe', 'cubic', '#8b939b', 'cubic'),
 'lepidolite': ('Lepidolite (nhóm mica lithium)', 'K(Li,Al)₃(Si,Al)₄O₁₀(F,OH)₂', 'plates', '#b190bc', 'monoclinic'),
 'celestine': ('Celestine', 'SrSO₄', 'blades', '#8cbedb', 'orthorhombic'),
 'xenotime': ('Xenotime-(Y)', 'YPO₄', 'bipyramid', '#af8c55', 'tetragonal'),
 'zircon': ('Zircon', 'ZrSiO₄', 'bipyramid', '#b88655', 'tetragonal'),
 'columbite': ('Columbite-(Fe)', 'FeNb₂O₆', 'prismatic', '#585361', 'orthorhombic'),
 'molybdenite': ('Molybdenite', 'MoS₂', 'plates', '#737b91', 'hexagonal'),
 'laurite': ('Laurite', 'RuS₂', 'octahedral', '#8e969f', 'cubic'),
 'native-platinum': ('Platinum tự sinh', 'Pt (thường chứa kim loại nhóm platinum khác)', 'nugget', '#afb4c1', 'cubic'),
 'acanthite': ('Acanthite', 'Ag₂S', 'prismatic', '#626374', 'monoclinic'),
 'cassiterite': ('Cassiterite', 'SnO₂', 'bipyramid', '#805342', 'tetragonal'),
 'stibnite': ('Stibnite', 'Sb₂S₃', 'needles', '#a6acbf', 'orthorhombic'),
 'calaverite': ('Calaverite', 'AuTe₂', 'prismatic', '#b3a571', 'monoclinic'),
 'pollucite': ('Pollucite', '(Cs,Na)₂Al₂Si₄O₁₂·2H₂O', 'aggregate', '#cbc5c7', 'cubic'),
 'barite': ('Barite', 'BaSO₄', 'blades', '#d6c5ab', 'orthorhombic'),
 'monazite': ('Monazite-(Ce)', '(Ce,La,Nd,Th)PO₄', 'prismatic', '#b98a4c', 'monoclinic'),
 'tantalite': ('Tantalite-(Fe)', 'FeTa₂O₆', 'prismatic', '#625964', 'orthorhombic'),
 'scheelite': ('Scheelite', 'CaWO₄', 'bipyramid', '#d2aa71', 'tetragonal'),
 'native-gold': ('Gold tự sinh', 'Au (có thể tạo hợp kim tự nhiên với Ag)', 'nugget', '#d9ac3b', 'cubic'),
 'cinnabar': ('Cinnabar', 'HgS', 'rhombohedral', '#b9303a', 'trigonal'),
 'galena': ('Galena', 'PbS', 'cubic', '#8c96a5', 'cubic'),
 'bismuthinite': ('Bismuthinite', 'Bi₂S₃', 'needles', '#9b9aab', 'orthorhombic'),
 'uraninite': ('Uraninite', 'UO₂₊ₓ (có sản phẩm phân rã và tạp chất)', 'cubic', '#45534a', 'cubic'),
 'thorite': ('Thorite', 'ThSiO₄', 'bipyramid', '#8d6548', 'tetragonal'),
 'spodumene': ('Spodumene', 'LiAlSi₂O₆', 'prismatic', '#b7c9a2', 'monoclinic'),
}

ASSIGNMENTS = {
 'Li': 'spodumene', 'Be': 'beryl', 'B': 'borax', 'C': 'graphite', 'F': 'fluorite',
 'Na': 'halite', 'Mg': 'magnesite', 'Al': 'bauxite', 'Si': 'quartz', 'P': 'apatite',
 'S': 'sulfur', 'Cl': 'halite', 'K': 'sylvite', 'Ca': 'calcite', 'Sc': 'thortveitite',
 'Ti': 'rutile', 'V': 'vanadinite', 'Cr': 'chromite', 'Mn': 'pyrolusite', 'Fe': 'hematite',
 'Co': 'cobaltite', 'Ni': 'pentlandite', 'Cu': 'chalcopyrite', 'Zn': 'sphalerite',
 'Ga': 'bauxite', 'Ge': 'germanite', 'As': 'arsenopyrite', 'Se': 'clausthalite',
 'Rb': 'lepidolite', 'Sr': 'celestine', 'Y': 'xenotime', 'Zr': 'zircon', 'Nb': 'columbite',
 'Mo': 'molybdenite', 'Ru': 'laurite', 'Rh': 'native-platinum', 'Pd': 'native-platinum',
 'Ag': 'acanthite', 'Cd': 'sphalerite', 'In': 'sphalerite', 'Sn': 'cassiterite',
 'Sb': 'stibnite', 'Te': 'calaverite', 'Cs': 'pollucite', 'Ba': 'barite',
 'La': 'monazite', 'Ce': 'monazite', 'Pr': 'monazite', 'Nd': 'monazite',
 'Sm': 'monazite', 'Eu': 'monazite', 'Gd': 'monazite', 'Tb': 'xenotime', 'Dy': 'xenotime',
 'Ho': 'xenotime', 'Er': 'xenotime', 'Tm': 'xenotime', 'Yb': 'xenotime', 'Lu': 'xenotime',
 'Hf': 'zircon', 'Ta': 'tantalite', 'W': 'scheelite', 'Re': 'molybdenite',
 'Os': 'native-platinum', 'Ir': 'native-platinum', 'Pt': 'native-platinum', 'Au': 'native-gold',
 'Hg': 'cinnabar', 'Tl': 'galena', 'Pb': 'galena', 'Bi': 'bismuthinite',
 'Po': 'uraninite', 'At': 'uraninite', 'Fr': 'uraninite', 'Ra': 'uraninite',
 'Ac': 'uraninite', 'Th': 'thorite', 'Pa': 'uraninite', 'U': 'uraninite',
}

TRACE = set('Ga Rb Cd In Pr Nd Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Re Rh Pd Os Ir Tl Po At Fr Ra Ac Pa'.split())


def mineral_for(symbol):
    key = ASSIGNMENTS.get(symbol)
    if not key:
        reason = ('Nguồn chủ yếu là khí quyển, nước hoặc nước muối; không có mẫu quặng riêng đại diện.'
                  if symbol in {'H', 'He', 'N', 'O', 'Ne', 'Ar', 'Br', 'Kr', 'I', 'Xe', 'Rn'}
                  else 'Nguyên tố nhân tạo hoặc chỉ có vết tự nhiên; không có quặng khai thác riêng để dựng mẫu.')
        return {'available': False, 'reason': reason}
    name, formula, habit, color, system = MINERALS[key]
    relation = ('Khoáng vật chứa nguyên tố dưới dạng thay thế, tạp chất hoặc sản phẩm phân rã; không phải quặng riêng của nguyên tố.'
                if symbol in TRACE else 'Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.')
    return {'available': True, 'id': key, 'name': name, 'formula': formula, 'habit': habit,
            'color': color, 'crystalSystem': system, 'relation': relation,
            'source': 'https://www.handbookofmineralogy.org/',
            'sourceSearch': f'https://rruff.info/{name.split(" ")[0]}',
            'model': f'/assets/periodic-table/minerals/{key}.glb',
            'preview': f'/assets/periodic-table/minerals/{key}.png',
            'disclaimer': 'Mô hình hình thái tinh thể được ChemDex dựng bằng hình học: minh họa hình dáng, màu sắc gần đúng; không phải ảnh quét mẫu thật, không theo tỉ lệ và không biểu diễn tọa độ mạng tinh thể thực nghiệm.'}
