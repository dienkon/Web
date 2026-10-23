"""Crop the supplied artwork without regenerating it; retain its original pixels."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'assets/reference-panels.png').convert('RGBA')

def save_panel(name, box, outline):
    x, y, right, bottom = box
    image = source.crop(box)
    scale = 3
    mask = Image.new('L', (image.width * scale, image.height * scale))
    ImageDraw.Draw(mask).polygon([((px-x)*scale, (py-y)*scale) for px, py in outline], fill=255)
    image.putalpha(mask.resize(image.size, Image.Resampling.LANCZOS))
    image.save(root / 'assets' / name)

save_panel('frame-question.png', (32, 0, 1504, 558), [
    (38,432),(38,319),(68,289),(69,235),(137,165),(237,164),
    (161,145),(200,114),(245,95),(283,88),(277,53),(271,16),
    (310,15),(368,25),(421,44),(476,68),(496,40),(506,56),(511,73),
    (526,68),(536,86),(584,88),(606,85),(630,90),(631,77),(649,59),
    (715,59),(740,48),(758,45),(774,9),(788,44),(832,49),(818,61),
    (891,59),(913,78),(914,94),(964,93),(1021,49),(1010,85),
    (1046,86),(1049,113),(1088,111),(1105,125),(1125,142),
    (1152,111),(1141,159),(1418,163),(1469,235),(1470,289),
    (1499,320),(1499,432),(1470,462),(1470,505),(1418,555),
    (1037,555),(1008,546),(880,546),(856,555),(677,555),(652,546),
    (513,546),(486,555),(111,555),(66,507),(66,461),
])

# Each letter, wreath and cartridge remains part of its original answer artwork.
for letter, x, y in [('a', 32, 588), ('b', 776, 588), ('c', 32, 784), ('d', 776, 784)]:
    points = [(7,62),(49,8),(129,8),(154,24),(188,21),(230,21),
              (283,22),(294,22),(310,24),(565,24),(582,20),
              (667,23),(718,74),(721,103),(691,174),(217,174),
              (200,185),(180,179),(164,185),(149,174),(50,174),(7,131)]
    save_panel(f'frame-{letter}.png', (x, y, x+728, y+188), [(x+px,y+py) for px,py in points])

# Separate the crest and badges so larger text does not stretch the ornaments.
question = Image.open(root / 'assets/frame-question.png')
crest = question.copy()
crest_mask = Image.new('L', question.size)
draw = ImageDraw.Draw(crest_mask)
draw.rectangle((0, 0, 1472, 160), fill=255)
draw.polygon([(498,155),(524,193),(557,216),(915,216),(955,192),(976,157)], fill=255)
from PIL import ImageChops
crest.putalpha(ImageChops.multiply(question.getchannel('A'), crest_mask))
crest.crop((125, 0, 1125, 216)).save(root / 'assets/frame-question-crest.png')
body = question.crop((0, 160, 1472, 558))
# Reuse a clean section of the original top rail underneath the separate crest.
rail = question.crop((1078, 160, 1168, 224)).resize((1252, 64), Image.Resampling.LANCZOS)
body.paste(rail, (110, 0))
body.save(root / 'assets/frame-question-body.png')
for letter in 'abcd':
    panel = Image.open(root / f'assets/frame-{letter}.png')
    badge = panel.crop((0, 0, 230, 188))
    mask = Image.new('L', badge.size)
    ImageDraw.Draw(mask).polygon([(7,62),(49,8),(129,8),(180,62),(180,97),(205,86),(191,114),(224,112),(200,150),(189,171),(200,185),(180,179),(164,185),(149,174),(50,174),(7,131)], fill=255)
    badge.putalpha(ImageChops.multiply(badge.getchannel('A'), mask))
    badge.save(root / f'assets/frame-badge-{letter}.png')
Image.open(root / 'assets/frame-a.png').crop((235, 0, 728, 188)).save(root / 'assets/frame-answer-body.png')

print('Saved transparent frames, crests and badges under assets/.')
