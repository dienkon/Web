import json
import re
import os

with open('parsed_docx2.txt', 'r', encoding='utf-8') as f:
    text = f.read()

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

# split by element headers
element_chunks = {}
lines = text.split('\n')
current_el = None

for line in lines:
    line = line.strip()
    if line in elements_map:
        current_el = line
        element_chunks[current_el] = []
        continue
    if current_el:
        element_chunks[current_el].append(line)

def parse_preparations(lines):
    prep = {'lab': [], 'industry': []}
    current_mode = None
    current_item = None
    
    for l in lines:
        if not l.strip(): continue
        if l.startswith('a. Trong phòng thí nghiệm') or l.startswith('a. trong phòng thí nghiệm'):
            if current_item and current_mode:
                prep[current_mode].append(current_item)
                current_item = None
            current_mode = 'lab'
            continue
        elif l.startswith('b. Trong công nghiệp') or l.startswith('b. trong công nghiệp'):
            if current_item and current_mode:
                prep[current_mode].append(current_item)
                current_item = None
            current_mode = 'industry'
            continue
            
        if current_mode:
            if l.startswith('- ') or l.startswith('+ '):
                if current_item:
                    prep[current_mode].append(current_item)
                current_item = {'title': l[2:].strip(), 'equation': ''}
            else:
                if current_item:
                    eq = l.strip().replace('  ', ' → ')
                    if current_item['equation']:
                        # if there are multiple equations, append with <br> or just replace
                        current_item['equation'] += ' <br> ' + eq
                    else:
                        current_item['equation'] = eq
                else:
                    if l.startswith('Hầu như không được điều chế'):
                        prep[current_mode].append({'title': l.strip(), 'equation': ''})
    if current_item and current_mode:
        prep[current_mode].append(current_item)
    return prep

def parse_recognition(lines):
    # Usually: Cách 1, Cách 2... or just bullets
    tests = []
    current_test = None
    for l in lines:
        l = l.strip()
        if not l: continue
        if l.startswith('Cách '):
            if current_test: tests.append(current_test)
            current_test = {'title': l, 'reagent': '', 'result': '', 'equation': ''}
        elif l.startswith('- Cách nhận biết:') or l.startswith('- Thuốc thử:'):
            if not current_test: current_test = {'title': 'Nhận biết', 'reagent': '', 'result': '', 'equation': ''}
            current_test['reagent'] = l.split(':', 1)[1].strip()
        elif l.startswith('- Hiện tượng:'):
            if not current_test: current_test = {'title': 'Nhận biết', 'reagent': '', 'result': '', 'equation': ''}
            current_test['result'] = l.split(':', 1)[1].strip()
        elif l.startswith('- Phương trình hóa học:'):
            pass # the next line will be equation
        elif l.startswith('- Phươnh trình:'):
            pass
        elif '→' in l or '  ' in l or '+' in l:
            if not current_test: current_test = {'title': 'Nhận biết', 'reagent': '', 'result': '', 'equation': ''}
            eq = l.replace('  ', ' → ')
            if 'equation' not in current_test or not current_test['equation']:
                current_test['equation'] = eq
            else:
                current_test['equation'] += ' <br> ' + eq
    if current_test:
        tests.append(current_test)
    return tests

def extract_lists(lines):
    html = ''
    in_list = False
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith('- ') or line.startswith('+ '):
            if not in_list:
                html += f'<ul class=\"list-disc ml-5 space-y-2\">\n'
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

def parse_section(lines, keywords, stop_keywords):
    start = -1
    for i, l in enumerate(lines):
        if any(l.lower().startswith(k) for k in keywords):
            start = i
            break
    if start == -1: return []
    end = len(lines)
    for i in range(start+1, len(lines)):
        if any(lines[i].lower().startswith(k) for k in stop_keywords) or lines[i].lower() in ['4. tính chất', '5. điều chế', '6. phương trình', '7. ứng dụng', '8. tổng quan', '8. tóm lại', '* nhận biết', '*nhận biết']:
            end = i
            break
    return lines[start+1:end]

for el, clines in element_chunks.items():
    filename = 'data/elements/' + elements_map[el]
    if not os.path.exists(filename): continue
    
    with open(filename, 'r', encoding='utf-8') as f:
        j = json.load(f)
    
    # 1. Mạng tinh thể
    for l in clines:
        if l.startswith('- Mạng tinh thể:') or l.startswith('+ Mạng tinh thể:'):
            j['structureType'] = l.split(':', 1)[1].strip()
            break
            
    # 2. Đồng vị
    for l in clines:
        if l.startswith('Đồng vị:') or l.startswith('Đồng vị ổn định:'):
            if 'general' not in j: j['general'] = {}
            j['general']['isotope'] = l.split(':', 1)[1].strip()
            break
            
    # 3. Đơn chất, Hợp chất
    for l in clines:
        if l.startswith('Đơn chất:') or l.startswith('+ Đơn chất:'):
            if 'occurrence' not in j: j['occurrence'] = {}
            j['occurrence']['description'] = l.split(':', 1)[1].strip()
        if l.startswith('Hợp chất:') or l.startswith('+ Hợp chất:'):
            compounds_str = l.split(':', 1)[1].strip().strip('.')
            if 'occurrence' not in j: j['occurrence'] = {}
            j['occurrence']['compounds'] = [x.strip() for x in compounds_str.split(',') if x.strip()]

    all_headers = ['4. tính chất', '5. điều chế', '6. phương trình', '7. ứng dụng', '8. tổng quan', '8. tóm lại', '* nhận biết', '*nhận biết']
    
    # Physical
    phys_lines = parse_section(clines, ['a. tính chất vật lí', 'a. tính chất vật lý'], ['b. tính chất hóa học'] + all_headers)
    if phys_lines: j['physical'] = extract_lists(phys_lines)
    
    # Chemical
    chem_lines = parse_section(clines, ['b. tính chất hóa học'], all_headers)
    if chem_lines: j['chemical'] = extract_lists(chem_lines)
    
    # Preparations
    prep_lines = parse_section(clines, ['5. điều chế'], all_headers)
    if prep_lines:
        prep_obj = parse_preparations(prep_lines)
        if prep_obj['lab'] or prep_obj['industry']:
            j['preparations'] = prep_obj
            
    # Reactions
    rxn_lines = parse_section(clines, ['6. phương trình'], all_headers)
    if rxn_lines:
        j['reactions'] = []
        for r in rxn_lines:
            r = r.replace('→', '→').strip()
            if '→' not in r and '  ' in r: r = r.replace('  ', ' → ')
            if r: j['reactions'].append({'type': 'Phản ứng đặc trưng', 'eq': r, 'desc': ''})
            
    # Applications
    app_lines = parse_section(clines, ['7. ứng dụng'], all_headers)
    if app_lines:
        j['applications'] = []
        for a in app_lines:
            if a.startswith('- ') or a.startswith('+ '):
                j['applications'].append({'title': 'Ứng dụng', 'desc': a[2:].strip()})
                
    # Overview
    overview_lines = parse_section(clines, ['8. tổng quan', '8. tóm lại'], all_headers)
    if overview_lines:
        # put in notes
        notes_html = '<h4 class=\"text-white font-semibold mb-4\">Tổng quan</h4>\n'
        notes_html += extract_lists(overview_lines)
        j['notes'] = notes_html
        
    # Recognition
    recog_lines = parse_section(clines, ['* nhận biết', '*nhận biết'], all_headers)
    if recog_lines:
        recog_obj = parse_recognition(recog_lines)
        if recog_obj:
            j['recognition'] = recog_obj

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(j, f, ensure_ascii=False, indent=2)

print('Reparsing done')
