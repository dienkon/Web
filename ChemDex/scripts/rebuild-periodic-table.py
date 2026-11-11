"""Rebuild all 118 profiles, with source-level and field-level audit trails.

Run fetch-periodic-references.mjs and fetch-element-images.mjs first when
refreshing remote evidence. Rebuilding itself is offline and deterministic.
"""
import csv
import hashlib
import html
import importlib.util
import json
import re
import sys
import unicodedata
from decimal import Decimal, InvalidOperation
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'periodic_review'))
from chemistry import check_equation, SUB, SUP
from editorial import DECISIONS, SOURCE_LINKS, EXTRA_SOURCES
from extract import ROOT, AUDIT, source_records, rsc_facts
from minerals import mineral_for

DATE = '2026-11-11'
NUCLIDE = re.compile(r'([⁰¹²³⁴⁵⁶⁷⁸⁹]+)(ᵐ?)([A-Z][a-z]?)')
SUP_DIGITS = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')
NOBLE_SHELLS = {'He': [2], 'Ne': [2, 8], 'Ar': [2, 8, 8], 'Kr': [2, 8, 18, 8], 'Xe': [2, 8, 18, 18, 8], 'Rn': [2, 8, 18, 32, 18, 8]}
GROUPS = {'alkali': 'kiem', 'alkaline_earth': 'kiem-tho', 'transition_metal': 'chuyen-tiep',
          'post_transition': 'kim-loai-sau-chuyen-tiep', 'metalloid': 'a-kim', 'reactive_nonmetal': 'phi-kim',
          'halogen': 'halogen', 'noble_gas': 'khi-hiem', 'lanthanide': 'lanthanide', 'actinide': 'actinide'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def value_after(lines, *prefixes):
    for row in lines:
        if row['text'].startswith(prefixes):
            return row['text'].split(':', 1)[-1].strip()
    return ''


def sections_for(lines):
    sections = {k: [] for k in ['title', 'general', 'history', 'structure', 'occurrence', 'isotopes', 'physical', 'chemical', 'lab', 'industry', 'recognition', 'reactions', 'applications', 'notes']}
    current = 'title'
    for row in lines:
        s = unicodedata.normalize('NFC', row['text'].strip().rstrip(':')).casefold()
        if s == 'thông tin chung': current = 'general'
        elif s == 'lịch sử khám phá': current = 'history'
        elif re.match(r'(?:3\.\s*|a\.\s*)cấu tạo', s): current = 'structure'
        elif s.startswith('b. trạng thái'): current = 'occurrence'
        elif s.startswith('c. đồng vị'): current = 'isotopes'
        elif s == 'tính chất': continue
        elif s.startswith('tính chất vật'): current = 'physical'
        elif s.startswith('tính chất hóa'): current = 'chemical'
        elif s == 'điều chế': current = 'industry'
        elif re.fullmatch(r'điều chế (?:trong )?công nghiệp', s): current = 'industry'
        elif re.fullmatch(r'điều chế (?:trong )?phòng thí nghiệm', s): current = 'lab'
        elif s == 'nhận biết': current = 'recognition'
        elif s == 'phương trình' and row['text'].strip().endswith(':') and current in {'lab', 'industry', 'recognition'}: continue
        elif s == 'phương trình': current = 'reactions'
        elif s in ('ứng dụng', 'ứng dụng thực tế'): current = 'applications'
        elif re.fullmatch(r'(?:9\.\s*)?tổng quan', s): current = 'notes'
        else: sections[current].append(row)
    return sections


def split_items(text):
    # A comma inside a formula or mineral-composition parenthesis is not a list separator.
    out, chunk, depth = [], [], 0
    for char in text.rstrip('.…'):
        if char in '([': depth += 1
        if char in ')]': depth -= 1
        if char in ',;' and depth == 0:
            if ''.join(chunk).strip(): out.append(''.join(chunk).strip())
            chunk = []
        else: chunk.append(char)
    if ''.join(chunk).strip(): out.append(''.join(chunk).strip())
    return out


def shells_for(config, z):
    named = re.search(r'\[(He|Ne|Ar|Kr|Xe|Rn)\]', config)
    shells = list(NOBLE_SHELLS[named[1]]) if named else []
    for shell, orbital, count in re.findall(r'(\d+)([spdfg])([⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)', config):
        shell, count = int(shell), int(count.translate(SUP))
        while len(shells) < shell: shells.append(0)
        shells[shell - 1] += count
    if sum(shells) != z:
        raise ValueError(f'Configuration has {sum(shells)} electrons, expected {z}: {config}')
    return shells


def normalize_equation(text):
    text = text.strip()
    if ':' in text and ('→' in text.split(':', 1)[1] or '⇌' in text.split(':', 1)[1]):
        text = text.split(':', 1)[1].strip()
    # Beta decay emits an electron antineutrino, even when elementary sources omit it.
    if 'β⁻' in text and 'ν' not in text:
        text += ' + ν̅ₑ'
    # Radiative neutron capture must dispose of the excitation energy.
    if re.search(r'[¹n]|\bn\b', text) and re.fullmatch(r'.*\+\s*(?:¹n|n)\s*→\s*[⁰¹²³⁴⁵⁶⁷⁸⁹]+[A-Z][a-z]?', text):
        text += ' + γ'
    # Convert counts only inside chemical formulae, not coefficients, isotope
    # mass numbers or electron charges.
    if not NUCLIDE.search(text):
        text = re.sub(r'(?<=[A-Za-z)\]])\d+', lambda m: m[0].translate(str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')), text)
    return re.sub(r'\s+', ' ', text)


def conditions(eq, context, symbol, z):
    """Reviewed qualitative conditions; exact process parameters aren't invented."""
    ascii_eq = eq.translate(SUB)
    left, right = re.split(r'→|⇌', ascii_eq, maxsplit=1)
    def identities(side):
        return {re.sub(r'^\d+(?:/\d+)?', '', term.strip()).replace('↑', '').replace('↓', '').replace('(g)', '').replace('(l)', '').replace('(s)', '').replace('(aq)', '') for term in side.split(' + ')}
    L, R = identities(left), identities(right)
    nuclear = bool(NUCLIDE.search(eq))
    if nuclear:
        if len(re.split(r'\s+\+\s+', left)) == 1:
            return 'Phân rã phóng xạ tự phát; chu kỳ bán rã phụ thuộc đồng vị.', 'nuclear'
        if re.search(r'(?:¹n|\bn\b)', left):
            return 'Chiếu neutron trong cơ sở nghiên cứu; bắt neutron và phát gamma nếu không có sản phẩm bay hơi.', 'nuclear'
        return 'Bắn phá bia hạt nhân bằng chùm ion trong máy gia tốc; kênh tạo hạt nhân phụ thuộc năng lượng và đồng vị bia.', 'nuclear'
    if z >= 104 or symbol in {'At', 'Fr'}:
        return 'Sơ đồ hệ số hình thức/dự đoán; chưa xác nhận quy trình phản ứng trực tiếp trên mẫu vĩ mô.', 'formal'
    if any(ion in eq for ion in ['Ge⁴⁺', 'Zr⁴⁺', 'Hf⁴⁺', 'Nb⁵⁺', 'Ta⁵⁺', 'Ru⁴⁺', 'Sb⁵⁺', 'Ti⁴⁺']):
        return 'Sơ đồ ion giản lược: trong nước tồn tại phức aquo/hydroxo; oxide hydrate hoặc kết tủa thực tế phụ thuộc pH và phối tử. Không xem đây là phép thử đặc hiệu.', 'formal'
    if 'GaN' in R and 'N2' in L: return 'Sơ đồ thành phần; N₂ phải được hoạt hóa hoặc dùng điều kiện chuyên biệt, không mặc định phản ứng trực tiếp ở điều kiện thường.', 'formal'
    if 'hν' in eq or '*' in eq or re.search(r'→\s*\w+[⁺⁻].*e⁻', eq):
        return 'Kích thích, ion hóa hoặc kết hợp bức xạ trong pha khí; cần cung cấp/trao đổi năng lượng.', 'physical'
    if eq == '2Na + He → Na₂He': return 'Áp suất trên 113 GPa; hợp chất bền ở điều kiện áp suất cao.', 'chemical'
    if 'OF2' in right: return 'F₂ tác dụng với dung dịch NaOH loãng; có thể đồng thời tạo O₂.', 'chemical'
    if 'KrF2' in right: return 'Hỗn hợp Kr/F₂ ở nhiệt độ thấp, kích thích bằng UV hoặc phóng điện; KrF₂ kém bền.', 'chemical'
    if 'XeF' in right: return 'Đun nóng Xe và F₂ trong thiết bị phù hợp; sản phẩm phụ thuộc tỉ lệ F₂/Xe, nhiệt độ và áp suất.', 'chemical'
    if 'XeF' in left and 'H2O' in L: return 'Thủy phân trong nước; phản ứng tạo HF.', 'chemical'
    if 'Ni(CO)' in ascii_eq:
        return ('Gia nhiệt khoảng 180–200 °C để phân hủy carbonyl.' if 'Ni(CO)' in left else 'CO tiếp xúc Ni tinh khiết khoảng 50–60 °C; quy trình Mond.'), 'chemical'
    if 'NH3' in right and 'N2' in L and 'H2' in L: return 'Xúc tác sắt, nhiệt độ và áp suất cao; phản ứng thuận nghịch (Haber–Bosch).', 'chemical'
    if 'CH4' in L and 'H2O' in L: return 'Hơi nước, xúc tác Ni, khoảng 700–1000 °C; phản ứng thuận nghịch.', 'chemical'
    if 'SO2' in L and 'O2' in L and 'SO3' in R: return 'Xúc tác V₂O₅, khoảng 400–450 °C; phản ứng thuận nghịch.', 'chemical'
    if 'C2H4' in L and 'H2' in L: return 'Xúc tác Ni (hoặc Pd/Pt), gia nhiệt; hydrogen hóa liên kết đôi.', 'chemical'
    if 'H2O2' in L and 'H2O' in R and 'O2' in R and len(left.split(' + ')) == 1: return 'MnO₂ xúc tác; tốc độ phụ thuộc nồng độ và nhiệt độ.', 'chemical'
    if 'NaClO3' in right or 'NaBrO3' in right or 'NaIO3' in right: return 'Dung dịch kiềm nóng, đậm đặc; tự oxi hóa–khử halogen.', 'chemical'
    if 'NaClO' in right or 'NaBrO' in right: return 'Dung dịch kiềm loãng, lạnh; không gia nhiệt để tránh tạo halate.', 'chemical'
    if 'NaIO' in right: return 'Dung dịch kiềm lạnh; hypoiodite chỉ là sản phẩm trung gian, dễ chuyển thành iodide/iodate.', 'chemical'
    if 'Pt' in L and 'HNO3' in L and 'HCl' in L: return 'Nước cường toan; phương trình tổng quát cho nhánh tạo NO, không phải cơ chế một bước.', 'chemical'
    if 'Au' in L and 'HNO3' in L and 'HCl' in L: return 'Nước cường toan; phương trình tổng quát cho nhánh tạo NO.', 'chemical'
    if 'HNO3' in L:
        return ('HNO₃ đặc, tạo NO₂.' if 'NO2' in right else 'HNO₃ loãng, tạo NO; khí NO có thể bị oxi hóa tiếp ngoài không khí.'), 'chemical'
    if 'H2SO4' in L and 'SO2' in R: return 'H₂SO₄ đặc, nóng; acid đóng vai trò chất oxi hóa.', 'chemical'
    if 'HCl' in L and 'MnO2' in left: return 'HCl đặc, đun nóng.', 'chemical'
    if 'Pt' in left and 'HCl' in L: return 'Nước cường toan; phương trình tổng quát cho nhánh tạo NO, không phải cơ chế một bước.', 'chemical'
    if 'Au' in left and 'HCl' in L: return 'Nước cường toan; phương trình tổng quát cho nhánh tạo NO.', 'chemical'
    if 'Au³⁺' in eq: return 'Dung dịch acid có Au(III) và Fe(II); biểu diễn ion giản lược, bỏ qua phối tử.', 'chemical'
    if 'CN' in eq: return 'Dung dịch cyanide kiềm; đây là cân bằng tạo phức hoặc phản ứng thế, không phải toàn bộ quy trình hòa tách.', 'chemical'
    if 'Ni(C' in right and 'N2O2' in left: return 'Dung dịch kiềm/ammonia với dimethylglyoxime; tạo phức kết tủa đỏ.', 'chemical'
    if 'AgCl' in left and 'NH3' in left: return 'Dung dịch NH₃ dư; cân bằng tạo phức diamminesilver(I).', 'chemical'
    if 'SCN' in eq: return 'Dung dịch acid chứa Fe(III) và thiocyanate; cân bằng tạo phức phụ thuộc nồng độ và môi trường.', 'chemical'
    if 'SO2' in L and ('SeO2' in left or 'TeO2' in left): return 'Dung dịch nước có tính acid, sục SO₂; oxi hóa SO₂ thành sulfate.', 'chemical'
    if L == {'H2O'}: return 'Điện phân nước có chất điện ly; tách riêng khí ở hai điện cực.', 'chemical'
    if L == {'C', 'H2O'}: return 'Hơi nước đi qua carbon nung nóng; phản ứng khí hóa thuận nghịch.', 'chemical'
    if L == {'C', 'CO2'}: return 'Nhiệt độ cao (cân bằng Boudouard); phản ứng thuận nghịch phụ thuộc nhiệt độ và áp suất.', 'chemical'
    if 'Al' in L and any('O' in term and term not in {'O2', 'H2O'} for term in L): return 'Khơi mào phản ứng nhiệt nhôm; chất đầu khan, phản ứng tự tỏa nhiệt mạnh.', 'chemical'
    if 'H2' in R and ('HCl' in L or 'H2SO4' in L):
        if 'Ti' in L: return 'HCl nóng, khử oxygen/không khí; phản ứng bị chi phối bởi lớp thụ động TiO₂.', 'chemical'
        if re.search(r'\bV\b', left): return 'HCl trong điều kiện loại oxygen; lớp thụ động và nhiệt độ ảnh hưởng tốc độ.', 'chemical'
        return 'Dung dịch acid loãng, không oxi hóa; bề mặt kim loại phải tiếp xúc được với acid.', 'chemical'
    if 'H2' in R and 'H2O' in L:
        if 'NaOH' in L: return 'Dung dịch NaOH, lớp oxide bảo vệ được hòa tan; sản phẩm aluminate/beryllate trong nước.', 'chemical'
        if 'Mg' in L:
            return ('Hơi nước nóng, nung kim loại.' if '(g)' in left else 'Nước nóng; với nước lạnh phản ứng rất chậm do lớp hydroxide bảo vệ.'), 'chemical'
        return 'Tiếp xúc với nước; tốc độ phụ thuộc nhiệt độ, kích thước và lớp oxide bề mặt.', 'chemical'
    if 'e⁻' in eq:
        if 'Ga' in eq or 'In' in eq or 'Tl' in eq: return 'Điện phân dung dịch muối thích hợp; thế điện cực và vật liệu điện cực quyết định sản phẩm.', 'chemical'
        return 'Điện cực của bình điện phân; muối khan nóng chảy đối với kim loại hoạt động mạnh, không dùng dung dịch nước để thu kim loại.', 'chemical'
    if len(left.split(' + ')) == 1 and ('Cl2' in R and not any(x in left for x in ['PtCl', 'KrF', 'XeF'])):
        return 'Điện phân muối khan nóng chảy; không điện phân dung dịch nước để thu kim loại kiềm/kiềm thổ.', 'chemical'
    if left.strip() == '2H2O': return 'Điện phân nước có chất điện ly, tách riêng khí ở hai điện cực.', 'chemical'
    if left.strip() == '2HF': return 'Điện phân HF khan/KHF₂ nóng chảy, thiết bị chuyên dụng; không điện phân dung dịch HF trong nước.', 'chemical'
    if 'Al2O3' in left and 'Al' in R and 'CO2' in R:
        return 'Điện phân Al₂O₃ hòa tan trong cryolite nóng chảy, anot carbon bị tiêu hao (Hall–Héroult).', 'chemical'
    if 'NaCl' in left and 'NaOH' in R and 'Cl2' in R: return 'Điện phân dung dịch NaCl đậm đặc có màng ngăn, tách sản phẩm hai điện cực.', 'chemical'
    if '↓' in eq or re.search(r'[⁺⁻]', eq):
        if 'OH⁻' in eq or 'NaOH' in L:
            return 'Dung dịch nước, điều chỉnh pH; tránh dư kiềm nếu hydroxide có tính lưỡng tính. Phép thử không luôn đặc hiệu.', 'chemical'
        return 'Dung dịch nước; pH, nồng độ và ion gây nhiễu ảnh hưởng kết tủa/cân bằng.', 'chemical'
    if 'H2' in L and 'O2' in L: return 'Khơi mào bằng nhiệt hoặc tia lửa; phản ứng cháy tỏa nhiệt.', 'chemical'
    if 'H2' in L and 'Cl2' in L: return 'Ánh sáng khơi mào phản ứng chuỗi; sản phẩm là HCl.', 'chemical'
    if 'H2' in L and 'F2' in L: return 'Phản ứng rất mạnh khi tiếp xúc, không cần xúc tác hay đun nóng.', 'chemical'
    if 'H2' in L and any(x in left for x in ['Br2', 'I2']): return 'Gia nhiệt; phản ứng thuận nghịch, mức chuyển hóa phụ thuộc nhiệt độ.', 'chemical'
    if any(x in left for x in ['CO3', '(OH)', 'KClO3', 'KMnO4', 'NH4NO2', 'NH4Cl', 'Ag2O', 'HgO', 'XeO3']) and len(left.split(' + ')) == 1:
        return 'Gia nhiệt để phân hủy; nhiệt độ phụ thuộc chất và áp suất khí sản phẩm.', 'chemical'
    if '(OH)' in left and ('HCl' in L or 'H2SO4' in L): return 'Dung dịch acid; phản ứng trung hòa, tốc độ phụ thuộc độ tan của chất rắn.', 'chemical'
    if 'NaOH' in L and '(OH)' in left: return 'Dung dịch kiềm dư; hòa tan hydroxide lưỡng tính tạo phức hydroxo.', 'chemical'
    if 'NaOH' in L and 'O' in left and 'H2O' in R: return 'Kiềm đậm đặc, gia nhiệt hoặc nóng chảy tùy oxide; không mặc định xảy ra nhanh trong dung dịch loãng.', 'chemical'
    if any(x in left for x in ['Fe2O3', 'WO3', 'MoO', 'CoO', 'NiO', 'GeO2', 'RuO2', 'IrO2', 'OsO4']) and any(x in left for x in ['H2', 'CO', 'Al', ' C']):
        return 'Gia nhiệt; môi trường khử, thành phần khí và việc loại nước/CO₂ chi phối mức khử.', 'chemical'
    if L.intersection({'Ca', 'Mg', 'Na', 'Al', 'La'}) and any(x in left for x in ['Cl', 'F', 'O']): return 'Chất đầu khan, gia nhiệt trong môi trường trơ/chân không; phản ứng luyện kim hoặc khử halide.', 'chemical'
    if left.strip().startswith('C') and 'H2' in L and 'CH4' in R: return 'Nhiệt độ cao, xúc tác kim loại; sơ đồ tổng quát, mức chuyển hóa phụ thuộc điều kiện.', 'chemical'
    if 'O2' in L: return 'Gia nhiệt/khơi mào cháy; sản phẩm phụ thuộc lượng oxygen và trạng thái của mẫu.', 'chemical'
    if 'Cl2' in L or 'Br2' in L or 'F2' in L or 'I2' in L:
        return 'Chất đầu khan, tiếp xúc halogen có kiểm soát; thường gia nhiệt, sản phẩm phụ thuộc tỉ lệ và nhiệt độ.', 'chemical'
    if 'H2O' in L and any(x in left for x in ['CaO', 'SO3', 'P4O10', 'SeO2']): return 'Tiếp xúc với nước; phản ứng/hydrat hóa tỏa nhiệt hoặc tạo cân bằng acid.', 'chemical'
    if len(left.split(' + ')) > 1: return 'Gia nhiệt hoặc môi trường phản ứng chuyên dụng; đây là phương trình tổng quát, không phải quy trình thao tác.', 'chemical'
    return 'Gia nhiệt hoặc điều kiện chuyên dụng theo quá trình đã mô tả; không suy ra tốc độ từ hệ số phản ứng.', 'chemical'


def equation_record(row, sec, symbol, z, title=''):
    eq = normalize_equation(row['text'])
    check = check_equation(eq)
    condition, kind = conditions(eq, title, symbol, z)
    if check['status'] != 'balanced':
        raise ValueError(f'{symbol}:{row["line"]} {eq}: {check}')
    return {'equation': eq, 'condition': condition, 'kind': kind, 'sourceLine': row['line'],
            'sourceSection': sec, 'balance': check, 'conditionBasis': 'Biên tập theo loại phản ứng và ngữ cảnh; không phải hiệu chuẩn thực nghiệm.'}


def list_html(rows, section, symbol, z):
    parts = []
    for row in rows:
        if '→' in row['text'] or '⇌' in row['text']:
            r = equation_record(row, section, symbol, z)
            parts.append(f'<li class="source-equation">{html.escape(r["equation"])}<small>{html.escape(r["condition"])}</small></li>')
        else:
            text = row['text']
            if section == 'physical' and (z >= 100 or symbol in {'At', 'Fr'}) and re.search(r'nhiệt độ|khối lượng riêng', text, re.I) and not re.search(r'dự đoán|ước tính|chưa', text, re.I):
                text = 'Ước tính trong tài liệu, chưa đo trên mẫu vĩ mô: ' + text
            parts.append('<li>' + html.escape(text) + '</li>')
    return '<ul class="element-prose-list">' + ''.join(parts) + '</ul>' if parts else ''


def method_cards(rows, section, symbol, z):
    cards, current = [], None
    for row in rows:
        text = row['text']
        if text.rstrip(':').lower() in ('phương trình', 'phương trình hóa học', 'một phản ứng đơn giản', 'một phản ứng minh họa'):
            continue
        is_eq = '→' in text or '⇌' in text
        new_group = text.startswith('Nhận biết ') or (current and current['equations'] and not is_eq and text.endswith(':'))
        if current is None or new_group:
            if current: cards.append(current)
            current = {'title': text.rstrip(':') if not is_eq else 'Phương trình minh họa', 'desc': '', 'result': '', 'equations': [], 'sourceLines': []}
            if not is_eq:
                current['sourceLines'].append(row['line'])
                continue
        current['sourceLines'].append(row['line'])
        if is_eq: current['equations'].append(equation_record(row, section, symbol, z, current['title']))
        elif text.startswith('Hiện tượng:'): current['result'] += (' ' if current['result'] else '') + text.split(':', 1)[1].strip()
        else: current['desc'] += (' ' if current['desc'] else '') + text
    if current: cards.append(current)
    for card in cards:
        card['equation'] = card['equations'][0]['equation'] if card['equations'] else ''
    return cards


def isotope_records(sections, symbol, z, reference, nuclei):
    mentioned = sorted({int(m[1].translate(SUP)) for row in sections['isotopes'] + sections['general'] for m in NUCLIDE.finditer(row['text']) if m[3] == symbol and not m[2]})
    selected = {a for (s, a), row in nuclei.items() if s == symbol and row['abundance']}
    selected.update(a for a in mentioned if (symbol, a) in nuclei)
    if z >= 104:
        selected = {a for a in selected if (symbol, a) in nuclei}
    for m in NUCLIDE.finditer(reference['facts'].get('Key isotopes', '')):
        if (symbol, int(m[1].translate(SUP))) in nuclei:
            selected.add(int(m[1].translate(SUP)))
    out = []
    for a in sorted(selected):
        r = nuclei[(symbol, a)]
        half = r['half_life']
        stable = half == 'STABLE'
        source = SOURCE_LINKS['iaea']
        note = ''
        if (symbol, a) == ('Ge', 76):
            stable, half, note, source = False, 'Cỡ 10²¹ năm', 'Phân rã beta kép đã quan sát; nhãn STABLE trong bảng ground-states không đủ để kết luận bền tuyệt đối.', SOURCE_LINKS['germanium76']
        if (symbol, a) == ('Xe', 124):
            stable, half, note, source = False, 'Cỡ 10²² năm', 'Bắt hai electron đã quan sát; số đo phụ thuộc thí nghiệm.', SOURCE_LINKS['xenon124']
        half_text = 'Bền (chưa quan sát phân rã)' if stable else (f'{half} {r["unit_hl"]}'.strip() if half else 'Chưa có giá trị trong bản đối chiếu')
        display = half_text
        if not stable and half and source == SOURCE_LINKS['iaea']:
            units = {'Y': 'năm', 'D': 'ngày', 'H': 'giờ', 'M': 'phút', 'm': 'phút', 'S': 's'}
            unit = units.get(r['unit_hl'], r['unit_hl'])
            display = f'{half} {unit}'
            try:
                exponent = Decimal(half).as_tuple().exponent
                unc = r['unc_hl']
                if unc.isdigit(): display = f'{half} ± {Decimal(unc).scaleb(exponent)} {unit}'
                elif re.fullmatch(r'\+\d+-\d+', unc):
                    high, low = re.findall(r'\d+', unc)
                    display = f'{half} (+{Decimal(high).scaleb(exponent)}/−{Decimal(low).scaleb(exponent)}) {unit}'
            except InvalidOperation: pass
            if r['operator_hl']: display = r['operator_hl'] + ' ' + display
        out.append({'isotope': str(a).translate(SUP_DIGITS) + symbol, 'massNumber': a, 'protons': z, 'neutrons': a - z,
                    'stable': stable, 'abundancePercent': r['abundance'] or None, 'halfLifeDisplay': display,
                    'halfLife': half_text, 'halfLifeUncertainty': r['unc_hl'] or None,
                    'halfLifeQualifier': r['operator_hl'] or None, 'decay': r['decay_1'] or None,
                    'source': source, 'note': note})
    unsupported = [a for a in mentioned if (symbol, a) not in nuclei]
    return out, unsupported


def diff(before, after, path=''):
    changes = []
    if isinstance(before, dict) and isinstance(after, dict):
        for key in sorted(set(before) | set(after)):
            changes += diff(before.get(key), after.get(key), f'{path}.{key}'.strip('.'))
    elif before != after:
        changes.append({'field': path, 'before': before, 'after': after})
    return changes


def main():
    sources = read(AUDIT / 'source-inventory.json') if '--snapshot' in sys.argv else source_records()
    refs = rsc_facts()
    public_path = ROOT / '.cache/periodic-table-review/pubchem-elements.json'
    if not public_path.exists(): public_path = AUDIT / 'references/pubchem-elements.json'
    public = read(public_path)['Table']
    pubchem = {r['Cell'][1]: dict(zip(public['Columns']['Column'], r['Cell'])) for r in public['Row']}
    nuclear_path = ROOT / '.cache/periodic-table-review/iaea-ground-states.csv'
    if not nuclear_path.exists(): nuclear_path = AUDIT / 'references/iaea-ground-states.csv'
    nuclei = {(r['symbol'], int(r['z']) + int(r['n'])): r for r in csv.DictReader(nuclear_path.open(encoding='utf-8')) if int(r['z']) > 0}
    shared = {r['symbol']: r for r in read(ROOT / 'shared/elements.json')}
    weights = {r['symbol']: r for r in read(ROOT / 'shared/atomic-weights.json')['elements']}
    photos = {r['symbol']: r for r in read(ROOT / 'data/element-image-provenance.json')['elements']}
    baseline_file = AUDIT / 'baseline-profiles.json'
    if baseline_file.exists(): baseline = read(baseline_file)
    else:
        baseline = {p.stem.split('_')[1]: read(p) for p in (ROOT / 'data/elements').glob('*.json')}
        write(baseline_file, baseline)
    manifests, audits, mineral_catalog = [], [], {}
    (AUDIT / 'files').mkdir(parents=True, exist_ok=True)
    for source in sources:
        symbol = source['file'].split('_')[1].split('.')[0]
        z = int(source['file'][:3])
        edits = []
        rows = [dict(row) for row in source['paragraphs']]
        for line, replacement, reason in DECISIONS.get(symbol, []):
            original = next(r['text'] for r in rows if r['line'] == line)
            edits.append({'line': line, 'before': original, 'after': replacement, 'reason': reason})
            if replacement is None: rows = [r for r in rows if r['line'] != line]
            else: next(r for r in rows if r['line'] == line)['text'] = replacement
        sec = sections_for(rows)
        reference = refs[symbol]
        facts = reference['facts']
        old = shared[symbol]
        config = re.sub(r'(?<=[⁰¹²³⁴⁵⁶⁷⁸⁹])(\d+[spdfg])', r' \1', facts['Electron configuration'])
        if z >= 104: config += ' (dự đoán)'
        shells = shells_for(config, z)
        isotopes, unsupported = isotope_records(sec, symbol, z, reference, nuclei)
        nucleus_text = value_after(sec['structure'], 'Hạt nhân:')
        nucleus = NUCLIDE.search(nucleus_text)
        reference_isotope = NUCLIDE.search(facts.get('Key isotopes', ''))
        sample_a = int((nucleus or reference_isotope)[1].translate(SUP)) if (nucleus or reference_isotope) else (isotopes[0]['massNumber'] if isotopes else None)
        isotope_label = str(sample_a).translate(SUP_DIGITS) + symbol if sample_a else ''
        weight = weights.get(symbol)
        mass = weight['value'] if weight else sample_a
        mass_text = weight['text'] if weight else f'[{sample_a}] — số khối đồng vị tham chiếu, không phải nguyên tử khối chuẩn'
        group = int(facts['Group']) if facts['Group'].isdigit() else None
        series = 'Lanthanide' if 57 <= z <= 71 else 'Actinide' if 89 <= z <= 103 else ''
        state = {'Solid': 'Rắn', 'Gas': 'Khí', 'Liquid': 'Lỏng'}.get(facts.get('State at 20°C'), 'Chưa xác định')
        if z >= 100 or symbol in {'At', 'Fr'}:
            state = 'Chưa đo trạng thái vĩ mô; các giá trị pha chỉ là dự đoán'
        if symbol == 'Og': state = 'Chưa xác định thực nghiệm trên mẫu vĩ mô'
        en_value = pubchem[symbol]['Electronegativity']
        en = float(en_value) if en_value and z < 95 and symbol not in {'Pm'} else None
        en_note = 'Thang Pauling; số liệu tổng hợp PubChem.' if en is not None else 'Chưa có giá trị Pauling đủ cơ sở trong bản đối chiếu; không coi 0 là giá trị đã đo.'
        if symbol in {'At', 'Fr'}: en_note = 'Giá trị ước tính; không phải phép đo trên mẫu vĩ mô.'
        lattice = value_after(sec['structure'], 'Loại mạng:') or value_after(sec['structure'], 'Mô hình mạng tinh thể:')
        mineral = mineral_for(symbol)
        if mineral['available']: mineral_catalog[mineral['id']] = mineral
        isotope_text = ', '.join(r['isotope'] for r in isotopes)
        g = {'latinName': value_after(sec['general'], 'Tên Latin:'), 'englishName': old['name_en'],
             'electronConfig': config, 'isotope': isotope_text, 'group': group, 'groupLabel': str(group) if group else series,
             'series': series, 'period': int(facts['Period']), 'state': state,
             'oxidation': value_after(sec['general'], 'Số Oxy hóa:', 'Số oxi hóa:'), 'electronegativity': en,
             'electronegativityNote': en_note,
             'density': value_after(sec['physical'], 'Khối lượng riêng:', 'Khối lượng riêng khoảng'),
             'meltingPoint': value_after(sec['physical'], 'Nhiệt độ nóng chảy:', 'Nhiệt độ nóng chảy khoảng'),
             'boilingPoint': value_after(sec['physical'], 'Nhiệt độ sôi:', 'Nhiệt độ sôi khoảng'),
             'crystalStructure': lattice, 'CAS': facts.get('CAS number', '')}
        if symbol == 'H': g['CAS'] = '1333-74-0'
        g['density'] = re.sub(r'^Khối lượng riêng\s*(?:khoảng|:)\s*', '', g['density'], flags=re.I)
        for target, key in [('meltingPoint', 'Melting point'), ('boilingPoint', 'Boiling point')]:
            if not g[target]: g[target] = facts[key].split(',')[0].replace('Unknown', 'Chưa xác định thực nghiệm')
            if z >= 100 or symbol in {'At', 'Fr'}: g[target] = 'Chưa xác định thực nghiệm trên mẫu vĩ mô'
        if not g['density']: g['density'] = facts.get('Density (g cm−³)', 'Unknown').replace('Unknown', 'Chưa xác định thực nghiệm') + ' g/cm³ (theo bảng RSC)'
        if z >= 100: g['density'] = 'Chưa xác định thực nghiệm trên mẫu vĩ mô'
        if symbol == 'He': g['meltingPoint'] = 'Không hóa rắn ở áp suất khí quyển; pha rắn cần áp suất cao, giá trị phụ thuộc áp suất.'
        if symbol == 'C': g['meltingPoint'] = 'Ở áp suất khí quyển carbon thăng hoa; nhiệt độ chuyển pha phụ thuộc dạng thù hình và áp suất.'
        if symbol == 'P':
            g['meltingPoint'] = 'Phosphorus trắng: khoảng 44,1 °C; các dạng thù hình khác có tính chất chuyển pha khác.'
            g['boilingPoint'] = 'Phosphorus trắng: khoảng 280,5 °C (áp suất khí quyển).'
        history_desc = [r['text'].removeprefix('Mô tả:').strip() for r in sec['history'] if not r['text'].startswith(('Phát hiện bởi:', 'Phát hiện:', 'Năm công bố:', 'Nơi khám phá:'))]
        history = {'discoverer': value_after(sec['history'], 'Phát hiện bởi:', 'Phát hiện:'), 'year': value_after(sec['history'], 'Năm công bố:'), 'discoveryLocation': value_after(sec['history'], 'Nơi khám phá:'), 'description': ' '.join(history_desc)}
        occurrence = {'description': value_after(sec['occurrence'], 'Trạng thái:'),
                      'simple': split_items(value_after(sec['occurrence'], 'Đơn chất:')),
                      'compounds': split_items(value_after(sec['occurrence'], 'Hợp chất:', 'Hợp chất phổ biến:')),
                      'ores': split_items(value_after(sec['occurrence'], 'Có trong:')),
                      'details': [r['text'] for r in sec['occurrence']], 'mineral': mineral}
        reactions, current_title = [], 'Phản ứng đặc trưng'
        for row in sec['reactions']:
            if '→' in row['text'] or '⇌' in row['text']:
                reactions.append({'type': current_title, 'desc': '', **equation_record(row, 'reactions', symbol, z, current_title)})
            elif row['text'].startswith(('Xúc tác:', 'Điều kiện:', 'Nhiệt độ:', 'Áp suất:')) and reactions:
                reactions[-1]['sourceCondition'] = row['text']
            else: current_title = row['text'].rstrip(':')
        applications = []
        for row in sec['applications']:
            title, sep, desc = row['text'].partition(':')
            applications.append({'title': title if sep else 'Ứng dụng', 'desc': desc.strip() if sep else title, 'sourceLine': row['line']})
        stem = f'{z:03d}_{symbol}'
        diagram = f'/assets/periodic-table/diagrams/{stem}.svg'
        photo = photos[symbol]
        image = photo.get('file', diagram)
        captions = {'N': 'Nitrogen ở pha lỏng, được giữ trong bình cách nhiệt; không phải trạng thái ở nhiệt độ phòng.',
                    'O': 'Oxygen lỏng màu xanh nhạt; không phải trạng thái ở nhiệt độ phòng.',
                    'F': 'Fluorine lỏng ở −196 °C; ở nhiệt độ phòng fluorine là khí.',
                    'P': 'Phosphorus đỏ; màu và cấu trúc khác phosphorus trắng và đen.',
                    'Sn': 'Hai dạng thù hình của tin: β-tin trắng và α-tin xám.',
                    'Po': 'Lớp polonium lắng đọng trên lá đồng thau; không phải khối polonium nguyên chất lớn.',
                    'Ra': 'Một lượng rất nhỏ radium mạ trên lá copper, có lớp phủ bảo vệ.',
                    'U': 'Mẫu uranium kim loại trong cơ sở nghiên cứu; không phải quặng uraninite.'}
        caption = captions.get(symbol, f'Ảnh tham chiếu mẫu {old["name_en"]} ({symbol}); xem mô tả mẫu, tác giả và giấy phép tại trang ảnh gốc.') if photo['status'] == 'downloaded' else 'Sơ đồ định danh và lớp electron; không phải ảnh mẫu vật thật.'
        natural = {'image': image, 'alt': f'{old["name_en"]}: ' + ('ảnh tham chiếu từ Commons' if photo['status'] == 'downloaded' else 'sơ đồ minh họa nguyên tố'),
                   'kind': 'photo' if photo['status'] == 'downloaded' else 'diagram', 'source': photo.get('source', ''),
                   'caption': caption,
                   'credit': ' · '.join(filter(None, [photo.get('author'), photo.get('license')]))}
        profile = {'number': z, 'symbol': symbol, 'nameVi': old['name_vi'], 'nameEn': old['name_en'], 'mass': mass,
                   'massStandardText': mass_text, 'massStandardSource': SOURCE_LINKS['atomicWeights'] if weight else reference['url'],
                   'massKind': 'standard-atomic-weight' if weight else 'reference-isotope-mass-number',
                   'category': GROUPS.get(old['category'], 'unknown'), 'hasData': True, 'file': f'elements/{stem}.json',
                   'general': g, 'history': history,
                   'structure': {'protons': z, 'electrons': z, 'neutrons': sample_a - z if sample_a else None,
                                 'nucleusIsotope': isotope_label, 'nucleusNote': 'Số neutron chỉ thuộc đồng vị tham chiếu; các đồng vị khác có số neutron khác.',
                                 'nucleus': {'proton': z, 'neutron': sample_a - z if sample_a else None},
                                 'electronShells': shells, 'shells': shells, 'valenceElectrons': shells[-1],
                                 'valenceNote': 'Số electron ở lớp ngoài cùng; không đồng nhất với hóa trị, đặc biệt với kim loại chuyển tiếp.',
                                 'lattice': lattice, 'latticeEvidence': 'predicted' if z >= 100 else 'phase-dependent' if z in {1,2,6,7,8,9,15,16,32,50,80} else 'source-reviewed'},
                   'structureType': lattice, 'occurrence': occurrence, 'naturalState': natural,
                   'isotopes': isotopes, 'isotopeNote': 'Danh sách chọn lọc; không phải toàn bộ đồng vị đã biết. Hàm lượng tự nhiên thay đổi theo nguồn mẫu; thông số IAEA ground-states và hiệu chỉnh nghiên cứu được dẫn ở từng dòng.',
                   'physical': list_html(sec['physical'], 'physical', symbol, z), 'chemical': list_html(sec['chemical'], 'chemical', symbol, z),
                   'reactions': reactions, 'preparations': {'lab': method_cards(sec['lab'], 'lab', symbol, z), 'industry': method_cards(sec['industry'], 'industry', symbol, z)},
                   'recognition': method_cards(sec['recognition'], 'recognition', symbol, z),
                   'applications': applications, 'notes': list_html(sec['notes'], 'notes', symbol, z),
                   'images': [{'src': image, 'title': f'{old["name_vi"]} ({symbol})', 'desc': natural['caption'],
                               'source': natural['source'], 'author': photo.get('author', 'ChemDex'), 'license': photo.get('license', 'ChemDex schematic diagram'), 'licenseUrl': photo.get('licenseUrl', '')}],
                   'mediaBlocks': ([{'type': 'model', 'section': 'structure', 'title': f'Mẫu khoáng vật 3D · {mineral["name"]}',
                                    'src': mineral['model'], 'preview': mineral['preview'], 'desc': mineral['formula'] + '. ' + mineral['relation'] + ' ' + mineral['disclaimer']}]
                                   if mineral['available'] else []),
                   'sources': [{'title': source['file'] + ' — tài liệu người dùng', 'url': '', 'sha256': source['sha256']},
                               {'title': 'Royal Society of Chemistry — thông tin nguyên tố', 'url': reference['url']},
                               {'title': 'PubChem — dữ liệu bảng tuần hoàn', 'url': SOURCE_LINKS['pubchem']},
                               {'title': 'CIAAW — nguyên tử khối chuẩn', 'url': SOURCE_LINKS['atomicWeights']},
                               {'title': 'IAEA — thông số hạt nhân', 'url': SOURCE_LINKS['iaea']},
                               {'title': 'NIST — cấu hình electron và đồng vị tham chiếu', 'url': SOURCE_LINKS['nist']}],
                   'review': {'date': DATE, 'sourceFile': source['file'], 'sourceSha256': source['sha256'],
                              'auditFile': f'docs/periodic-table-audit/{DATE}/files/{stem}.md',
                              'scope': 'Đã nhập lại toàn bộ tài liệu; kiểm tra bảo toàn và dữ liệu tham chiếu. Các sơ đồ hình thức được phân biệt; nguồn nhóm không chứng minh từng phản ứng thực nghiệm.'}}
        profile['sources'] += [{'title': key, 'url': SOURCE_LINKS[key]} for key in EXTRA_SOURCES.get(symbol, [])]
        # All source equations (including history and property prose) are audited.
        original_equations = []
        final_equations = []
        for section, paragraphs in sec.items():
            if section in {'isotopes', 'general'}: continue
            for row in paragraphs:
                if '→' in row['text'] or '⇌' in row['text']:
                    final_equations.append({'section': section, **equation_record(row, section, symbol, z)})
        for row in source['paragraphs']:
            if '→' in row['text'] or '⇌' in row['text']:
                original_equations.append({'line': row['line'], 'text': row['text'], **check_equation(row['text'].split(':', 1)[-1].strip())})
        changes = diff(baseline.get(symbol, {}), profile)
        original_sec = sections_for(source['paragraphs'])
        comparisons = []
        source_fields = {
            'electronConfig': value_after(original_sec['structure'], 'Cấu hình electron:', 'Hoạt họa cấu hình e:', 'Cấu hình e:'),
            'crystalStructure': value_after(original_sec['structure'], 'Loại mạng:') or value_after(original_sec['structure'], 'Mô hình mạng tinh thể:'),
            'electronegativity': value_after(original_sec['general'], 'Độ âm điện:'),
            'groupLabel': value_after(original_sec['general'], 'Vị trí:'),
            'state': value_after(original_sec['occurrence'], 'Trạng thái:'),
        }
        for field, original in source_fields.items():
            comparisons.append({'field': field, 'sourceText': original, 'publishedValue': g.get(field),
                                'reason': 'Chuẩn hóa/đối chiếu theo nguồn được ghi trong hồ sơ; khác cách ghi không tự động có nghĩa bản nguồn sai.'})
        isotope_comparisons = []
        bymass = {r['massNumber']: r for r in isotopes}
        for row in original_sec['isotopes']:
            m = NUCLIDE.match(row['text'])
            if m and m[3] == symbol:
                current = bymass.get(int(m[1].translate(SUP)))
                isotope_comparisons.append({'line': row['line'], 'sourceText': row['text'], 'reference': current,
                                            'assessment': 'Không có trong snapshot đối chiếu; chưa công bố như số liệu đã xác nhận.' if not current else
                                            'Sửa phân loại bền: đã quan sát phân rã.' if 'đồng vị bền' in row['text'].lower() and not current['stable'] and 'từng' not in row['text'].lower() else
                                            'Dùng thông số tham chiếu bên cạnh; tỉ lệ gần đúng trong tài liệu có thể khác theo nguồn mẫu.'})
        audit = {'symbol': symbol, 'number': z, 'source': source['file'], 'sourceSha256': source['sha256'],
                 'paragraphCount': len(source['paragraphs']), 'sectionCounts': {k: len(v) for k, v in sec.items()},
                 'editorialDecisions': edits, 'sourceFactComparisons': comparisons, 'isotopeComparisons': isotope_comparisons,
                 'originalEquations': original_equations, 'publishedEquations': final_equations,
                 'unsupportedIsotopeNumbers': unsupported, 'fieldChanges': changes,
                 'media': {'image': photo, 'mineral': mineral}, 'reference': {'RSC': reference, 'PubChem': pubchem[symbol]},
                 'limits': ['Đọc và kiểm tra văn bản OOXML; không sửa hoặc render lại DOCX gốc.',
                            'Kiểm tra bảo toàn không thay thế xác nhận khả năng xảy ra, tính chọn lọc hoặc cơ chế.',
                            'Mô tả lịch sử/ứng dụng được biên tập từ tài liệu; không coi mọi câu đã được xác nhận bởi một thí nghiệm riêng.',
                            'Không suy quặng riêng từ một nguyên tố chỉ xuất hiện dạng vết hoặc từ sản phẩm phân rã.']}
        write(ROOT / f'data/elements/{stem}.json', profile)
        write(AUDIT / 'files' / f'{stem}.json', audit)
        (AUDIT / 'sources' / f'{stem}.txt').write_text('\n'.join(f"{r['line']:03d}: {r['text']}" for r in source['paragraphs']) + '\n', encoding='utf-8')
        lines = [f'# Audit {source["file"]}', '', f'Ngày kiểm duyệt: {DATE}. SHA-256: `{source["sha256"]}`.', '',
                 f'Đã đọc {len(source["paragraphs"])} đoạn. Hồ sơ đầu ra: `data/elements/{stem}.json`. Cập nhật đè toàn bộ trường nội dung.', '',
                 '## Phát hiện và quyết định cụ thể', '']
        for edit in edits:
            lines += [f'### Đoạn {edit["line"]}', '', '**Gốc:** ' + edit['before'], '', '**Xử lý:** ' + (edit['after'] or 'Loại khỏi nội dung giảng dạy; giữ nguyên trong bản nguồn và audit.'), '', '**Lý do:** ' + edit['reason'], '']
        if not edits: lines += ['Không có sửa câu riêng bằng danh sách biên tập. Các hiệu chỉnh dữ liệu tham chiếu, đồng vị và định dạng bên dưới vẫn áp dụng.', '']
        lines += ['## Kiểm tra dữ liệu và định dạng', '',
                  f'- Nguyên tử trung hòa: {z} proton, {z} electron; các lớp {shells}, tổng {sum(shells)}.',
                  f'- Hạt nhân minh họa: {isotope_label}, {sample_a-z if sample_a else "?"} neutron. Không làm tròn nguyên tử khối trung bình để suy neutron.',
                  f'- Nguyên tử khối: {mass_text}. Nguyên tử khối tương đối không có đơn vị; g/mol dành cho khối lượng mol.',
                  f'- Cấu hình: {config}. Nguồn RSC; Lr dùng 7p¹, các nguyên tố siêu nặng có nhãn dự đoán.',
                  f'- Nhóm: {group if group else series}; chu kỳ {g["period"]}. Nhóm VIIIB cũ tách thành 8/9/10; không gán cả họ f vào một nhóm số.',
                  f'- Độ âm điện: {en if en is not None else "chưa xác định"}; {en_note}',
                  f'- Đồng vị: {len(isotopes)} bản ghi chọn lọc từ IAEA; giữ nguồn riêng cho ngoại lệ phân rã kép.',
                  '- Chuẩn hóa chỉ số dưới, số khối trên, điện tích; tách từng phương trình trong điều chế và ghép đúng hiện tượng nhận biết.',
                  '- Phương trình có điều kiện định tính; không điền nhiệt độ/áp suất số khi nguồn không đủ cơ sở.',
                  '- HTML từ văn bản nguồn được escape; nội dung tài liệu không được thực thi như chỉ dẫn.', '']
        if unsupported:
            lines += ['Các số khối được nêu trong nguồn nhưng không có trong snapshot IAEA: ' + ', '.join(map(str, unsupported)) + '. Không công bố chu kỳ bán rã như số đo đã xác minh; việc thiếu bản ghi không chứng minh đồng vị không tồn tại.', '']
        lines += ['## Đối chiếu từng trường trong tài liệu', '', '| Trường | Bản nguồn | Dữ liệu đưa lên web |', '|---|---|---|']
        lines += [f'| {r["field"]} | {str(r["sourceText"]).replace("|", "/")} | {str(r["publishedValue"]).replace("|", "/")} |' for r in comparisons]
        lines += ['', 'Khác biệt trong bảng có thể là chuẩn hóa cách ghi, không phải mọi khác biệt đều là sai khoa học.', '', '## Đối chiếu diễn giải đồng vị', '']
        for r in isotope_comparisons:
            current = r['reference']
            lines += [f'- Đoạn {r["line"]}: {r["sourceText"]}', '  - ' + r['assessment']]
            if current: lines += [f'  - Tham chiếu: {current["isotope"]}; {current["halfLifeDisplay"]}; hàm lượng {current["abundancePercent"] or "không ghi"} %. [Nguồn]({current["source"]}).']
        lines += ['## Phương trình trong từng vị trí', '', '| Đoạn | Bản gốc | Kiểm tra gốc | Bản đưa lên web / xử lý |', '|---|---|---|---|']
        byline = {r['sourceLine']: r for r in final_equations}
        for eq in original_equations:
            published = byline.get(eq['line'])
            treatment = (published['equation'] + ' — ' + published['kind'] + '; ' + published['condition']) if published else 'Không là phương trình xuất bản; xem quyết định hoặc phần đồng vị/sơ đồ.'
            lines.append(f'| {eq["line"]} | {eq["text"].replace("|", "/")} | {eq["status"]} {eq.get("delta", "")} | {treatment.replace("|", "/")} |')
        lines += ['', '## Ảnh và mô hình', '', f'- Ảnh: {photo["status"]}; ' + (photo.get('source') or photo.get('reason', '')), f'- Mô hình: ' + (mineral.get('name', '') + ' — ' + mineral.get('relation', '') if mineral['available'] else mineral['reason']),
                  '- Mô hình tự dựng là hình thái khoáng vật, màu gần đúng; không phải quét mẫu thật hay dữ liệu tọa độ tinh thể.', '', '## Nguồn đối chiếu', '']
        lines += [f'- [{s["title"]}]({s["url"]})' for s in profile['sources'] if s['url']]
        lines += ['', '## Thay đổi so với hồ sơ cũ', '', f'{len(changes)} trường thêm/thay đổi; cặp trước/sau đầy đủ nằm trong `{stem}.json` bên cạnh báo cáo này.', '']
        lines += [f'- `{c["field"]}`' for c in changes]
        lines += ['', '## Phạm vi và giới hạn', ''] + [f'- {v}' for v in audit['limits']]
        (AUDIT / 'files' / f'{stem}.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
        manifests.append({k: profile[k] for k in ['number', 'symbol', 'nameVi', 'nameEn', 'category', 'hasData', 'file']})
        audits.append({'number': z, 'symbol': symbol, 'source': source['file'], 'paragraphs': len(source['paragraphs']),
                       'editorialDecisions': len(edits), 'equations': len(final_equations), 'fieldChanges': len(changes),
                       'audit': f'files/{stem}.md', 'unconfirmedIsotopes': unsupported})
        # Keep the other ChemDex consumers in sync without deleting their fields.
        old.update({'name_en': profile['nameEn'], 'electronConfig': config, 'mass': mass,
                    'massKind': profile['massKind'], 'group': group, 'groupLabel': g['groupLabel'], 'period': g['period'],
                    'electronegativity': en, 'sourceFile': '/' + 'data/' + profile['file'],
                    'applications': [a['desc'] for a in applications], 'stateNote': state,
                    'phase_STP': None if z >= 100 or symbol in {'At', 'Fr'} else old.get('phase_STP'),
                    'sources': [s for s in profile['sources'] if s['url']]})
        temperature = re.search(r'[−-]?\d+(?:[.,]\d+)?', g['meltingPoint'])
        old['meltingPoint'] = float(temperature[0].replace('−', '-').replace(',', '.')) if temperature and z < 100 and symbol not in {'C', 'He', 'At', 'Fr'} else None
        old['meltingPointNote'] = g['meltingPoint'] if old['meltingPoint'] is None or symbol == 'P' else ''
        old['meltingPointSource'] = reference['url']
    write(ROOT / 'data/manifest.json', manifests)
    write(ROOT / 'shared/elements.json', list(shared.values()))
    write(ROOT / 'data/mineral-models.json', {'date': DATE, 'models': list(mineral_catalog.values())})
    # Keep the subsequent published-structure review on every DOCX replay.
    if (ROOT / 'data/crystal-catalog.json').exists():
        import importlib.util
        overlay_spec = importlib.util.spec_from_file_location('crystal_overlay', ROOT / 'scripts/enrich-crystal-profiles.py')
        overlay = importlib.util.module_from_spec(overlay_spec)
        overlay_spec.loader.exec_module(overlay)
        overlay.main()
    write(AUDIT / 'source-inventory.json', sources)
    write(AUDIT / 'reference-facts.json', refs)
    write(AUDIT / 'summary.json', {'date': DATE, 'files': len(sources), 'paragraphs': sum(a['paragraphs'] for a in audits),
                                 'equations': sum(a['equations'] for a in audits), 'editorialDecisions': sum(a['editorialDecisions'] for a in audits),
                                 'profilesOverwritten': 118, 'mineralModels': len(mineral_catalog), 'elementsWithMineralModels': len([1 for s in shared if mineral_for(s)['available']]),
                                 'elements': audits})
    print(json.dumps({'profiles': len(manifests), 'equations': sum(a['equations'] for a in audits), 'editorialDecisions': sum(a['editorialDecisions'] for a in audits), 'minerals': len(mineral_catalog)}))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    main()
