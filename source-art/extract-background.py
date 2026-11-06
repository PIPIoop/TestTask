"""Build the three vector background motifs from the exported Figma sheet."""

from pathlib import Path
from xml.etree import ElementTree as ET


HERE = Path(__file__).resolve().parent
ET.register_namespace("", "http://www.w3.org/2000/svg")
root = ET.parse(HERE / "figma-sheet.svg").getroot()


def markup(elements):
    return "".join(ET.tostring(element, encoding="unicode", method="xml").replace(' xmlns="http://www.w3.org/2000/svg"', "") for element in elements)


def selected(indices):
    return markup(root[index] for index in indices)


art = {
    "lilac": {
        "origin": (248.975, 2429),
        "topLeft": selected([6, 7, 8, 10]),
        "bottomLeft": selected([3, 4, 5]),
        "bottomRight": selected([9, 11]),
    },
    "apricot": {
        "origin": (1446.69, 2429),
        "topRight": markup([root[22][2]]),
        "bottomRight": markup([root[22][1], root[22][3]]),
    },
    "mint": {
        "origin": (2644.41, 2429),
        "topLeft": selected([16, 17, 18, 20]),
        "bottomLeft": selected([13, 14, 15]),
        "bottomRight": selected([19, 21]),
    },
}

parts = ["// Generated from source-art/figma-sheet.svg by source-art/extract-background.py.\n", "const backgroundArt = {\n"]
for palette, groups in art.items():
    origin = groups.pop("origin")
    parts.append(f"  {palette}: {{origin:[{origin[0]},{origin[1]}],")
    parts.extend(f"{name}:{value!r}," for name, value in groups.items())
    parts.append("},\n")
parts.append("};\n")
(HERE.parent / "dist" / "background-art.js").write_text("".join(parts), encoding="utf-8")
