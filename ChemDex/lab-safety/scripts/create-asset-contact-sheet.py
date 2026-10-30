"""QA overview assembled from browser renders, without changing the assets."""
import json
import re
import unicodedata
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path(__file__).resolve().parent.parent / 'docs' / 'asset-studies'
ids = []
report_names = ['all-assets-browser-checks.json'] if (folder / 'all-assets-browser-checks.json').exists() else ['browser-checks.json', 'ppe-browser-checks.json', 'fixtures-browser-checks.json', 'architecture-browser-checks.json', 'actors-browser-checks.json']
for name in report_names:
    report_path = folder / name
    if not report_path.exists():
        continue
    report = json.loads(report_path.read_text(encoding='utf-8'))
    if not report.get('passed'):
        raise RuntimeError(f'Asset review failed: {name}')
    ids.extend(row['id'] for row in report['snapshots'] if row['id'] not in ids)
columns, width, height = 4, 400, 385
sheet = Image.new('RGB', (columns * width, ((len(ids) + columns - 1) // columns) * height), '#f3f7f6')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 18)
for i, asset_id in enumerate(ids):
    x, y = i % columns * width, i // columns * height
    source = Image.open(folder / f'{asset_id}-three-quarter.png').convert('RGB')
    source = source.crop((70, 100, 940, 825))
    source.thumbnail((width - 16, height - 42))
    sheet.paste(source, (x + (width - source.width) // 2, y + 8))
    draw.text((x + 16, y + height - 30), asset_id, fill='#34535d', font=font)
sheet.save(folder / 'asset-contact-sheet.jpg', quality=91)
print(folder / 'asset-contact-sheet.jpg')

catalog = (folder.parent.parent / 'src/components/3d/assets/assetCatalog.tsx').read_text(encoding='utf-8')
catalog_ids = re.findall(r"\{id:'([^']+)',title:'[^']+',group:'[^']+'", catalog)
if report_names == ['all-assets-browser-checks.json'] and set(ids) != set(catalog_ids):
    raise RuntimeError('QA report does not cover the current asset catalog')
for asset_id in ids:
    for angle in ['front', 'three-quarter', 'back', 'top']:
        if not (folder / f'{asset_id}-{angle}.png').is_file():
            raise RuntimeError(f'Missing QA image: {asset_id}/{angle}')
groups = {}
for asset_id, title, group in re.findall(r"\{id:'([^']+)',title:'([^']+)',group:'([^']+)'", catalog):
    if asset_id in ids:
        groups.setdefault(group, []).append(asset_id)
for group, members in groups.items():
    group_sheet = Image.new('RGB', (columns * width, ((len(members) + columns - 1) // columns) * height), '#f3f7f6')
    group_draw = ImageDraw.Draw(group_sheet)
    for i, asset_id in enumerate(members):
        x, y = i % columns * width, i // columns * height
        group_sheet.paste(sheet.crop((ids.index(asset_id) % columns * width, ids.index(asset_id) // columns * height, ids.index(asset_id) % columns * width + width, ids.index(asset_id) // columns * height + height)), (x, y))
    slug = re.sub(r'[^a-z0-9]+', '-', ''.join(c for c in unicodedata.normalize('NFD', group.lower().replace('đ', 'd')) if unicodedata.category(c) != 'Mn')).strip('-')
    group_sheet.save(folder / f'contact-{slug}.jpg', quality=91)
print(f'{len(ids)} reviewed variants in {len(groups)} category sheets')
