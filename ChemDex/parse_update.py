import json
import re
import os

with open('parsed_docx2.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

elements_map = {
    'HYDROGEN': '001_H.json',
    'SODIUM': '011_Na.json',
    'POTASSIUM': '019_K.json',
    'MAGNESIUM': '012_Mg.json',
    'CALSIUM': '020_Ca.json',
    'BARIUM': '056_Ba.json',
    'ALUMINIUM': '013_Al.json',
    'CARBON': '006_C.json'
}

current_element = None
data = {}

for line in lines:
    line = line.strip()
    if not line: continue
    
    # Check if line is an element name
    is_element = False
    for k in elements_map.keys():
        if line.startswith(k):
            current_element = k
            data[current_element] = {'lines': []}
            is_element = True
            break
            
    if is_element:
        continue
        
    if current_element:
        data[current_element]['lines'].append(line)

def parse_section(lines, header_prefixes):
    start = -1
    for i, l in enumerate(lines):
        if any(l.lower().startswith(h.lower()) for h in header_prefixes):
            start = i
            break
    if start == -1: return [], len(lines)
    
    end = len(lines)
    for i in range(start + 1, len(lines)):
        # Next section starts with a number or specific keyword
        if re.match(r'^\d+\.', lines[i]) or lines[i].startswith('* Nhận biết') or lines[i].startswith('Đồng vị:') or lines[i].startswith('Đơn chất:') or lines[i].startswith('Hợp chất:') or lines[i].startswith('- Mạng tinh thể:') or lines[i].startswith('+ Mạng tinh thể:'):
            end = i
            break
    return lines[start:end], start

def extract_lists_and_paragraphs(lines, ul_class='list-disc ml-5 space-y-2'):
    html = ''
    in_list = False
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith('- ') or line.startswith('+ '):
            if not in_list:
                html += f'<ul class=\"{ul_class}\">\n'
                in_list = True
            html += f'  <li>{line[2:].strip()}</li>\n'
        else:
            if in_list:
                html += '</ul>\n'
                in_list = False
            html += f'<p>{line}</p>\n'
    if in_list:
        html += '</ul>\n'
    return html

for el, info in data.items():
    filename = 'data/elements/' + elements_map[el]
    if not os.path.exists(filename): continue
    
    with open(filename, 'r', encoding='utf-8') as f:
        j = json.load(f)
        
    lines = info['lines']
    
    # 1. Mạng tinh thể
    for l in lines:
        if l.startswith('- Mạng tinh thể:') or l.startswith('+ Mạng tinh thể:'):
            j['structureType'] = l.split(':', 1)[1].strip()
            break
            
    # 2. Đồng vị
    for l in lines:
        if l.startswith('Đồng vị:') or l.startswith('Đồng vị ổn định:'):
            if 'general' not in j: j['general'] = {}
            j['general']['isotope'] = l.split(':', 1)[1].strip()
            break
            
    # 3. Đơn chất, Hợp chất
    for l in lines:
        if l.startswith('Đơn chất:') or l.startswith('+ Đơn chất:'):
            if 'occurrence' not in j: j['occurrence'] = {}
            j['occurrence']['description'] = l.split(':', 1)[1].strip()
        if l.startswith('Hợp chất:') or l.startswith('+ Hợp chất:'):
            compounds_str = l.split(':', 1)[1].strip().strip('.')
            if 'occurrence' not in j: j['occurrence'] = {}
            j['occurrence']['compounds'] = [x.strip() for x in compounds_str.split(',') if x.strip()]
            
    # 4. Tính chất vật lí
    phys_lines, _ = parse_section(lines, ['a. Tính chất vật lí', 'a. tính chất vật lí'])
    if phys_lines:
        j['physical'] = extract_lists_and_paragraphs(phys_lines[1:])
        
    # 5. Tính chất hóa học
    chem_lines, _ = parse_section(lines, ['b. Tính chất hóa học'])
    if chem_lines:
        j['chemical'] = extract_lists_and_paragraphs(chem_lines[1:])
        
    # 6. Điều chế
    prep_lines, _ = parse_section(lines, ['5. Điều chế'])
    if prep_lines:
        j['preparations'] = []
        current_prep = None
        for p in prep_lines[1:]:
            if p.startswith('a. ') or p.startswith('b. '):
                continue
            if p.startswith('- ') or p.startswith('+ '):
                if current_prep: j['preparations'].append(current_prep)
                current_prep = {'title': p[2:].strip(), 'desc': '', 'equation': ''}
            elif current_prep:
                if '→' in p or '  ' in p:
                    current_prep['equation'] = p.replace('  ', ' → ').strip()
                else:
                    current_prep['desc'] += p + '\n'
        if current_prep: j['preparations'].append(current_prep)
        
    # 7. Phương trình mô phỏng
    rxn_lines, _ = parse_section(lines, ['6. Phương trình'])
    if rxn_lines:
        j['reactions'] = []
        for r in rxn_lines[1:]:
            r = r.replace('→', '→').strip()
            if '→' not in r and '  ' in r:
                r = r.replace('  ', ' → ')
            if r:
                j['reactions'].append({'type': 'Phản ứng đặc trưng', 'eq': r, 'desc': ''})
                
    # 8. Ứng dụng
    app_lines, _ = parse_section(lines, ['7. Ứng dụng'])
    if app_lines:
        j['applications'] = []
        for a in app_lines[1:]:
            if a.startswith('- ') or a.startswith('+ '):
                j['applications'].append({'title': 'Ứng dụng', 'desc': a[2:].strip()})
                
    # 9. Tổng quan & Nhận biết
    notes_lines, _ = parse_section(lines, ['8. Tổng quan', '8. Tóm lại'])
    nb_lines, _ = parse_section(lines, ['* Nhận biết', '*Nhận biết'])
    
    notes_html = ''
    if notes_lines:
        notes_html += '<h4 class=\"text-white font-semibold mb-4\">Tổng quan</h4>\n'
        notes_html += extract_lists_and_paragraphs(notes_lines[1:])
    if nb_lines:
        notes_html += '<h4 class=\"text-white font-semibold mb-4 mt-6\">Nhận biết</h4>\n'
        notes_html += extract_lists_and_paragraphs(nb_lines[1:])
        
    if notes_html:
        j['notes'] = notes_html

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(j, f, ensure_ascii=False, indent=2)

print('Done')
