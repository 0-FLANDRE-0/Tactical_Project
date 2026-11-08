#!/usr/bin/python3
"""Compose the fixed-camera WIP11D terrain QA screenshots."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/releases"
report = json.loads((OUT / "WIP11D-terrain-comparison.json").read_text())
zones = [zone["id"] for zone in report["zones"]]
variants = ["before", "normal", "terrain"]
thumb = (396, 271)
sheet = Image.new("RGB", (thumb[0] * 3, thumb[1] * len(zones)), (20, 28, 24))
draw = ImageDraw.Draw(sheet)
for row, zone in enumerate(zones):
    for column, variant in enumerate(variants):
        image = Image.open(OUT / f"WIP11D-{zone}-{variant}.png").convert("RGB")
        image.thumbnail(thumb, Image.Resampling.LANCZOS)
        x, y = column * thumb[0], row * thumb[1]
        sheet.paste(image, (x, y))
        draw.text((x + 7, y + 7), f"{zone} / {variant}", fill="white", stroke_width=2, stroke_fill="black")
sheet.save(OUT / "WIP11D-terrain-comparison.png", optimize=True)

gray = Image.new("L", (thumb[0] * 2, thumb[1] * 2), 20)
for index, zone in enumerate(zones):
    image = Image.open(OUT / f"WIP11D-{zone}-terrain.png").convert("L")
    image.thumbnail(thumb, Image.Resampling.LANCZOS)
    gray.paste(image, ((index % 2) * thumb[0], (index // 2) * thumb[1]))
gray.save(OUT / "WIP11D-terrain-grayscale.png", optimize=True)
print(json.dumps({"comparison": "tests/releases/WIP11D-terrain-comparison.png",
                  "grayscale": "tests/releases/WIP11D-terrain-grayscale.png"}))
