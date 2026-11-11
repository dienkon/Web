"""Validate the complete published periodic table, media and source traceability."""
import hashlib
import importlib.util
import json
import math
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/periodic_review'))
from chemistry import check_equation

AUDIT = ROOT / 'docs/periodic-table-audit/2026-11-11'
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
spec = importlib.util.spec_from_file_location('periodic_import', ROOT / 'scripts/rebuild-periodic-table.py')
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)
errors, counts = [], {'profiles': 0, 'equations': 0, 'isotopes': 0, 'modelBindings': 0, 'images': 0, 'glbModels': 0}


def require(ok, message):
    if not ok: errors.append(message)


def local_asset(url, context):
    require(isinstance(url, str) and url.startswith('/assets/periodic-table/'), f'{context}: not a local reviewed asset: {url}')
    p = ROOT / str(url).lstrip('/')
    require(p.is_file() and p.stat().st_size > 0, f'{context}: missing asset {url}')


manifest = read(ROOT / 'data/manifest.json')
sources = {r['file']: r for r in read(AUDIT / 'source-inventory.json')}
refs = read(AUDIT / 'reference-facts.json')
shared = {r['symbol']: r for r in read(ROOT / 'shared/elements.json')}
weights = {r['symbol']: r for r in read(ROOT / 'shared/atomic-weights.json')['elements']}
require(len(manifest) == 118 and sorted(r['number'] for r in manifest) == list(range(1, 119)), 'Manifest is not all 118 elements')
for meta in manifest:
    r = read(ROOT / 'data' / meta['file'])
    symbol, z = r['symbol'], r['number']
    prefix = f'{z:03d}_{symbol}'
    counts['profiles'] += 1
    require(meta['hasData'] and r['hasData'] and meta['symbol'] == symbol, f'{symbol}: manifest mismatch')
    for key in ['physical', 'chemical', 'notes', 'history', 'recognition', 'preparations', 'applications', 'isotopes', 'sources']:
        require(bool(r.get(key)), f'{symbol}: missing {key}')
    require(r['structure']['protons'] == z == r['structure']['electrons'], f'{symbol}: proton/electron mismatch')
    require(sum(r['structure']['shells']) == z, f'{symbol}: shell count mismatch')
    require(compiler.shells_for(r['general']['electronConfig'], z) == r['structure']['shells'], f'{symbol}: config mismatch')
    if symbol in weights: require(r['mass'] == weights[symbol]['value'] == shared[symbol]['mass'], f'{symbol}: CIAAW mismatch')
    rawgroup = refs[symbol]['facts']['Group']
    require(r['general']['group'] == (int(rawgroup) if rawgroup.isdigit() else None), f'{symbol}: group mismatch')
    cas = r['general']['CAS']
    if re.fullmatch(r'\d{2,7}-\d{2}-\d', cas):
        digits = cas.replace('-', '')
        require(sum(int(v)*(i+1) for i, v in enumerate(digits[:-1][::-1])) % 10 == int(digits[-1]), f'{symbol}: invalid CAS checksum')
    else: require(False, f'{symbol}: malformed CAS')
    source = sources.get(r['review']['sourceFile'])
    require(source and source['sha256'] == r['review']['sourceSha256'], f'{symbol}: source provenance mismatch')
    sourcefile = ROOT / 'DATA PERIOD TABLE' / source['file']
    if sourcefile.exists(): require(hashlib.sha256(sourcefile.read_bytes()).hexdigest() == source['sha256'], f'{symbol}: source file changed')
    require((AUDIT / 'files' / (prefix+'.md')).exists(), f'{symbol}: missing per-file audit')
    detailed = read(AUDIT / 'files' / (prefix+'.json'))
    require(detailed['paragraphCount'] == len(source['paragraphs']), f'{symbol}: paragraph coverage mismatch')
    for eq in detailed['publishedEquations']:
        counts['equations'] += 1
        check = check_equation(eq['equation'])
        require(check['status'] == 'balanced', f'{symbol}:{eq["sourceLine"]}: {eq["equation"]} {check}')
        require(bool(eq['condition']) and eq['kind'] in {'nuclear','physical','formal','chemical'}, f'{symbol}: missing equation context')
        require(any(p['line'] == eq['sourceLine'] for p in source['paragraphs']), f'{symbol}: equation has no source paragraph')
    for isotope in r['isotopes']:
        counts['isotopes'] += 1
        require(isotope['protons'] == z and isotope['massNumber'] - z == isotope['neutrons'], f'{symbol}: isotope mismatch')
        require(bool(isotope['source']) and bool(isotope['halfLifeDisplay']), f'{symbol}: isotope source/display missing')
    local_asset(r['naturalState']['image'], symbol)
    counts['images'] += 1
    local_asset(f'/assets/periodic-table/diagrams/{prefix}.svg', symbol)
    mineral = r['occurrence']['mineral']
    if mineral['available']:
        counts['modelBindings'] += 1
        require(z < 93, f'{symbol}: fabricated synthetic-element ore')
        local_asset(mineral['model'], symbol)
        local_asset(mineral['preview'], symbol)
        morphology = next((b for b in r['mediaBlocks'] if b['type'] == 'model'), None)
        require(morphology and morphology['preview'] == mineral['preview'], f'{symbol}: model poster mismatch')
    else: require(bool(mineral['reason']), f'{symbol}: no reason for absent ore')

for model in read(ROOT / 'data/mineral-models.json')['models']:
    data = (ROOT / model['model'].lstrip('/')).read_bytes()
    magic, version, length, jsonlength, chunktype = struct.unpack_from('<5I', data)
    require(magic == 0x46546c67 and version == 2 and length == len(data) and chunktype == 0x4e4f534a, f'{model["id"]}: invalid GLB header')
    doc = json.loads(data[20:20+jsonlength])
    require(doc['extras']['disclaimer'] == model['disclaimer'], f'{model["id"]}: model provenance lost')
    for accessor in doc['accessors']:
        require(accessor['count'] > 0 and all(math.isfinite(v) for v in accessor.get('min', []) + accessor.get('max', [])), f'{model["id"]}: invalid geometry')
    counts['glbModels'] += 1

for photo in read(ROOT / 'data/element-image-provenance.json')['elements']:
    if photo['status'] == 'downloaded':
        data = (ROOT / photo['file'].lstrip('/')).read_bytes()
        require(hashlib.sha256(data).hexdigest() == photo['sha256'], f'{photo["symbol"]}: image hash mismatch')
        require(bool(photo['author']) and bool(photo['license']) and bool(photo['source']), f'{photo["symbol"]}: missing image attribution')

report = {'date': '2026-11-11', 'valid': not errors, **counts, 'sourceDocuments': len(sources), 'sourceParagraphs': sum(len(r['paragraphs']) for r in sources.values()), 'errors': errors,
          'scope': 'All published profiles, source SHA-256, atomic/electron/nuclear conservation, equation conditions, isotope identities, local images, attribution and GLB structure. Not an experimental certification of every claim.'}
(AUDIT / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(0 if not errors else 1)
