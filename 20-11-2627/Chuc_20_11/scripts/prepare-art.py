"""Convert the approved image atlas and scene backplates into local WebP assets."""
import argparse
from pathlib import Path

from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("atlas", type=Path)
parser.add_argument("intro", type=Path)
parser.add_argument("classroom", type=Path, nargs="?")
parser.add_argument("garden", type=Path, nargs="?")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / "public" / "assets"
(root / "memories").mkdir(parents=True, exist_ok=True)

with Image.open(args.atlas) as image:
    atlas = image.convert("RGB")
    for index in range(16):
        row, column = divmod(index, 4)
        bounds = (
            round(column * atlas.width / 4) + 1,
            round(row * atlas.height / 4) + 1,
            round((column + 1) * atlas.width / 4) - 1,
            round((row + 1) * atlas.height / 4) - 1,
        )
        atlas.crop(bounds).save(root / "memories" / f"{index + 1:02}.webp", quality=90, method=6)

for name in ["intro", "classroom", "garden"]:
    source = getattr(args, name)
    if source:
        with Image.open(source) as image:
            art = image.convert("RGB")
            art.thumbnail((1800, 1250), Image.Resampling.LANCZOS)
            art.save(root / f"{name}.webp", quality=88, method=6)
