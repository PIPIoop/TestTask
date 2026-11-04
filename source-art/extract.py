"""Extract individual objects from the flattened Figma SVG sheet.

bboxes.json contains browser-computed getBBox values for top-level SVG elements.
The sheet has no semantic object groups, so the named regions below define the
object boundaries. This script keeps original vector paths and clip paths.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "dist" / "figma-assets.js"
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

regions = {
    "large": {
        "book": (320, 4950, 1900, 6300),
        "phone": (1950, 5250, 2920, 6050),
        "puzzle": (3000, 5350, 3760, 6000),
        "coin": (3900, 5450, 4400, 5900),
        "headphones": (370, 6350, 1450, 7350),
        "lamp": (1720, 6000, 2920, 7350),
        "flowers": (2930, 6250, 3760, 7250),
        "planner": (3750, 6600, 4620, 7350),
        "notebook": (250, 7450, 1720, 8400),
        "pen": (1690, 7600, 2400, 8250),
        "bookBg": (320, 9000, 1900, 10280),
        "phoneBg": (1950, 9300, 2920, 10020),
        "puzzleBg": (3000, 9360, 3760, 9970),
        "coinBg": (3900, 9470, 4400, 9900),
        "headphonesBg": (370, 10380, 1450, 11330),
        "lampBg": (1720, 9990, 2920, 11400),
        "flowersBg": (2930, 10280, 3760, 11300),
        "plannerBg": (3750, 10660, 4620, 11400),
        "notebookBg": (250, 11480, 1720, 12420),
        "penBg": (1690, 11690, 2400, 12280),
    },
    "small": {
        "book": (5430, 3630, 6320, 4360),
        "phone": (6450, 3850, 7010, 4310),
        "puzzle": (7070, 3860, 7560, 4260),
        "coin": (7650, 3900, 7980, 4230),
        "headphones": (5500, 4500, 6190, 5100),
        "lamp": (6320, 4300, 7020, 5180),
        "flowers": (7030, 4520, 7580, 5180),
        "planner": (7520, 4760, 8060, 5190),
        "notebook": (5400, 5200, 6300, 5890),
        "pen": (6420, 5330, 6940, 5850),
        "bookBg": (5430, 6690, 6320, 7540),
        "phoneBg": (6450, 6920, 7020, 7420),
        "puzzleBg": (7070, 6920, 7570, 7410),
        "coinBg": (7650, 7000, 7990, 7360),
        "headphonesBg": (5500, 7630, 6200, 8270),
        "lampBg": (6320, 7490, 7040, 8330),
        "flowersBg": (7030, 7590, 7580, 8260),
        "plannerBg": (7520, 7840, 8080, 8300),
        "notebookBg": (5400, 8410, 6300, 9020),
        "penBg": (6420, 8530, 6940, 8960),
    },
}


def serialized(element: ET.Element) -> str:
    return ET.tostring(element, encoding="unicode").replace(
        f' xmlns="{SVG_NS}"', ""
    )


root = ET.parse(HERE / "figma-sheet.svg").getroot()
boxes = json.loads((HERE / "bboxes.json").read_text(encoding="utf-8"))
definitions = {
    element.attrib["id"]: element
    for element in root.iter()
    if element.tag.endswith("clipPath") and "id" in element.attrib
}

result = {}
for size, named_regions in regions.items():
    result[size] = {}
    for name, (x1, y1, x2, y2) in named_regions.items():
        selected = []
        for item in boxes:
            bounds = item.get("b")
            if not bounds or item["tag"] == "defs":
                continue
            x, y, width, height = bounds
            if x >= x1 and y >= y1 and x + width <= x2 and y + height <= y2:
                selected.append((item["i"], bounds))
        if not selected:
            raise ValueError(f"No vector elements found for {size}/{name}")
        markup = "".join(serialized(root[index]) for index, _ in selected)
        clip_ids = sorted(set(re.findall(r"url\(#([^)]+)\)", markup)))
        defs = "".join(serialized(definitions[clip_id]) for clip_id in clip_ids)
        left = min(b[0] for _, b in selected)
        top = min(b[1] for _, b in selected)
        right = max(b[0] + b[2] for _, b in selected)
        bottom = max(b[1] + b[3] for _, b in selected)
        result[size][name] = {
            "box": [round(left, 3), round(top, 3), round(right - left, 3), round(bottom - top, 3)],
            "defs": defs,
            "markup": markup,
        }
        print(size, name, len(selected), "paths")

OUT.write_text(
    "// Generated from source-art/figma-sheet.svg; run source-art/extract.py to refresh.\n"
    "const figmaAssets = " + json.dumps(result, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print("Wrote", OUT, OUT.stat().st_size, "bytes")
