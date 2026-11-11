"""Read every source paragraph in document order; never interpret it as code."""
import hashlib
import json
import re
import zipfile
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'docs/periodic-table-audit/2026-11-11'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
SUP = str.maketrans('0123456789+-', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻')
SUB = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')


def source_records():
    records = []
    for file in sorted((ROOT / 'DATA PERIOD TABLE').glob('*.docx')):
        with zipfile.ZipFile(file) as doc:
            xml = ET.fromstring(doc.read('word/document.xml'))
            lines = []
            for para in xml.iter(W + 'p'):
                parts = []
                for run in para.iter(W + 'r'):
                    value = ''.join(n.text or '' for n in run.iter(W + 't'))
                    align = run.find(f'{W}rPr/{W}vertAlign')
                    if align is not None:
                        value = value.translate(SUP if align.get(W + 'val') == 'superscript' else SUB)
                    parts.append(value)
                # OMML is extracted explicitly rather than silently dropped.
                parts += [n.text or '' for n in para.iter('{http://schemas.openxmlformats.org/officeDocument/2006/math}t')]
                text = ''.join(parts).strip()
                if text:
                    lines.append({'line': len(lines) + 1, 'text': text})
            records.append({'file': file.name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                            'paragraphs': lines, 'mathCount': len(xml.findall('.//{http://schemas.openxmlformats.org/officeDocument/2006/math}oMath')),
                            'additionalParts': [n for n in doc.namelist() if re.match(r'word/(?:comments|footnotes|endnotes|header|footer)', n) and n.endswith('.xml')]})
    if len(records) != 118 or [int(r['file'][:3]) for r in records] != list(range(1, 119)):
        raise ValueError('Expected exactly 118 ordered source documents')
    return records


def plain_html(s):
    s = re.sub(r'<sup[^>]*>(.*?)</sup>', lambda m: unescape(re.sub('<[^>]+>', '', m[1])).translate(SUP), s, flags=re.S | re.I)
    s = re.sub(r'<sub[^>]*>(.*?)</sub>', lambda m: unescape(re.sub('<[^>]+>', '', m[1])).translate(SUB), s, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', unescape(re.sub('<[^>]+>', ' ', s))).strip()


def rsc_facts():
    cache = ROOT / '.cache/periodic-table-review/rsc'
    if not (cache / 'retrieval.json').exists():
        return json.loads((AUDIT / 'reference-facts.json').read_text(encoding='utf-8'))
    retrieval = json.loads((cache / 'retrieval.json').read_text(encoding='utf-8'))
    result = {}
    for row in retrieval:
        if row['status'] != 'retrieved':
            raise ValueError('Missing RSC reference ' + row['symbol'])
        html = (cache / f"{row['z']:03d}.html").read_text(encoding='utf-8')
        facts = {}
        for table in re.findall(r'<table\b[^>]*>(.*?)</table>', html, flags=re.S):
            cells = [plain_html(s) for s in re.findall(r'<td\b[^>]*>(.*?)</td>', table, flags=re.S)]
            if 'Electron configuration' in cells:
                for i in range(0, len(cells) - 1, 2):
                    facts[cells[i]] = cells[i + 1]
        # Pauling electronegativity lives in another, small atomic-data table.
        for label, value in re.findall(r'<td\b[^>]*>((?:(?!</td>).)*)</td>\s*<td\b[^>]*>(.*?)</td>', html, flags=re.S):
            if plain_html(label).startswith('Electronegativity'):
                facts['electronegativity'] = plain_html(value)
        if facts.get('Atomic number') != str(row['z']):
            raise ValueError('Mismatched reference page ' + row['symbol'])
        result[row['symbol']] = {**row, 'sha256': hashlib.sha256(html.encode()).hexdigest(), 'facts': facts}
    return result


if __name__ == '__main__':
    from chemistry import check_equation
    records = source_records()
    (AUDIT / 'sources').mkdir(parents=True, exist_ok=True)
    for row in records:
        (AUDIT / 'sources' / (Path(row['file']).stem + '.txt')).write_text('\n'.join(f"{p['line']:03d}: {p['text']}" for p in row['paragraphs']) + '\n', encoding='utf-8')
    (AUDIT / 'source-inventory.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    refs = rsc_facts()
    (AUDIT / 'reference-facts.json').write_text(json.dumps(refs, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for row in records:
        for p in row['paragraphs']:
            if '→' in p['text'] or '⇌' in p['text']:
                eq = p['text'].split(':', 1)[-1].strip()
                check = check_equation(eq)
                if check['status'] != 'balanced':
                    print(row['file'], p['line'], eq, json.dumps(check, ensure_ascii=False))
