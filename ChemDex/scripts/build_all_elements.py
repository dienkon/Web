import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
WORD_DIR = ROOT / "Các nguyên tố hóa học trong bảng tuần hoàn"
ELEMENT_DIR = ROOT / "data" / "elements"
MANIFEST_PATH = ROOT / "data" / "manifest.json"
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

ROMAN_GROUPS = {
    "IA": 1,
    "IIA": 2,
    "IIIB": 3,
    "IVB": 4,
    "VB": 5,
    "VIB": 6,
    "VIIB": 7,
    "VIIIB": 8,
    "IB": 11,
    "IIB": 12,
    "IIIA": 13,
    "IVA": 14,
    "VA": 15,
    "VIA": 16,
    "VIIA": 17,
    "VIIIA": 18,
}

METALLOIDS = {"B", "Si", "Ge", "As", "Sb", "Te", "Po"}
NONMETALS = {"H", "C", "N", "O", "P", "S", "Se"}
HALOGENS = {"F", "Cl", "Br", "I", "At", "Ts"}
NOBLE_GASES = {"He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"}
ALKALI = {"Li", "Na", "K", "Rb", "Cs", "Fr"}
ALKALINE_EARTH = {"Be", "Mg", "Ca", "Sr", "Ba", "Ra"}
LANTHANIDES = {
    "La",
    "Ce",
    "Pr",
    "Nd",
    "Pm",
    "Sm",
    "Eu",
    "Gd",
    "Tb",
    "Dy",
    "Ho",
    "Er",
    "Tm",
    "Yb",
    "Lu",
}
ACTINIDES = {
    "Ac",
    "Th",
    "Pa",
    "U",
    "Np",
    "Pu",
    "Am",
    "Cm",
    "Bk",
    "Cf",
    "Es",
    "Fm",
    "Md",
    "No",
    "Lr",
}
TRANSITION = {
    "Sc",
    "Ti",
    "V",
    "Cr",
    "Mn",
    "Fe",
    "Co",
    "Ni",
    "Cu",
    "Zn",
    "Y",
    "Zr",
    "Nb",
    "Mo",
    "Tc",
    "Ru",
    "Rh",
    "Pd",
    "Ag",
    "Cd",
    "Hf",
    "Ta",
    "W",
    "Re",
    "Os",
    "Ir",
    "Pt",
    "Au",
    "Hg",
}


def category_for(symbol, current="unknown"):
    if symbol in METALLOIDS:
        return "a-kim"
    if symbol in NONMETALS:
        return "phi-kim"
    if symbol in HALOGENS:
        return "halogen"
    if symbol in NOBLE_GASES:
        return "khi-hiem"
    if symbol in ALKALI:
        return "kiem"
    if symbol in ALKALINE_EARTH:
        return "kiem-tho"
    if symbol in LANTHANIDES:
        return "lanthanide"
    if symbol in ACTINIDES:
        return "actinide"
    if symbol in TRANSITION:
        return "chuyen-tiep"
    return current or "unknown"


def read_docx_lines(path):
    with zipfile.ZipFile(path) as docx:
        xml = docx.read("word/document.xml")
    root = ET.fromstring(xml)
    lines = []
    for para in root.iter(W_NS + "p"):
        parts = []
        for node in para.iter():
            if node.tag.endswith("}t") and node.text:
                parts.append(node.text)
            elif node.tag.endswith("}tab"):
                parts.append("\t")
            elif node.tag.endswith("}br") or node.tag.endswith("}cr"):
                parts.append("\n")
        text = "".join(parts).strip()
        if text:
            lines.append(text)
    return lines


def clean_item(text):
    return text.strip().lstrip("-•* ").strip()


def split_list(text):
    text = text.strip().rstrip(".")
    return [part.strip() for part in re.split(r"[,;]\s*", text) if part.strip()]


def has_equation(text):
    return "→" in text or "⇌" in text or re.search(r"\b[A-Z][A-Za-z0-9₂₃₄₅₆₇₈₉₀\(\)]*\s*\+", text)


def html_list(lines, indent="    "):
    items = [clean_item(line) for line in lines if clean_item(line)]
    if not items:
        return ""
    body = "\n".join(f'{indent}  <li>{item}</li>' for item in items)
    return f'\n{indent}<ul class="list-disc ml-5 space-y-2">\n{body}\n{indent}</ul>\n  '


def notes_html(lines):
    items = [clean_item(line) for line in lines if clean_item(line)]
    if not items:
        return ""
    body = "\n".join(f"  <li>{item}</li>" for item in items)
    return (
        '<h4 class="text-white font-semibold mb-4">Tổng quan</h4>\n'
        '<ul class="list-disc ml-5 space-y-2">\n'
        f"{body}\n"
        "</ul>\n"
    )


def empty_element(number, symbol, meta):
    return {
        "number": number,
        "symbol": symbol,
        "nameVi": meta.get("nameVi", ""),
        "nameEn": meta.get("nameEn", ""),
        "mass": None,
        "category": category_for(symbol, meta.get("category", "unknown")),
        "hasData": True,
        "file": f"elements/{number:03d}_{symbol}.json",
        "general": {
            "latinName": "",
            "englishName": meta.get("nameEn", ""),
            "electronConfig": "",
            "isotope": "",
            "group": None,
            "period": None,
            "state": "",
            "oxidation": "",
            "electronegativity": None,
            "density": "",
            "meltingPoint": "",
            "boilingPoint": "",
            "crystalStructure": "",
        },
        "history": {
            "discoverer": "",
            "year": None,
            "discoveryLocation": "",
            "description": "",
        },
        "structure": {
            "protons": number,
            "neutrons": None,
            "electrons": number,
            "electronShells": [],
            "shells": [],
            "valenceElectrons": None,
            "lattice": "",
            "nucleus": {"proton": number, "neutron": None},
        },
        "occurrence": {"description": "", "simple": [], "compounds": [], "ores": []},
        "naturalState": {},
        "physical": "",
        "chemical": "",
        "reactions": [],
        "applications": [],
        "notes": "",
        "preparations": {"lab": [], "industry": []},
        "recognition": [],
    }


def segment(lines):
    sections = {
        "title": [],
        "general": [],
        "history": [],
        "structure": [],
        "occurrence": [],
        "isotopes": [],
        "physical": [],
        "chemical": [],
        "prep_lab": [],
        "prep_industry": [],
        "recognition": [],
        "reactions": [],
        "applications": [],
        "notes": [],
    }
    current = "title"
    in_prep = False
    in_props = False
    for line in lines:
        low = line.lower()
        if line == "Thông tin chung":
            current = "general"
            in_prep = False
            in_props = False
            continue
        if line == "Lịch sử khám phá":
            current = "history"
            in_prep = False
            in_props = False
            continue
        if line.startswith("3. Cấu tạo"):
            current = "structure"
            in_prep = False
            in_props = False
            continue
        if line.startswith("a. Cấu tạo"):
            current = "structure"
            continue
        if line.startswith("b. Trạng thái"):
            current = "occurrence"
            continue
        if line.startswith("c. Đồng vị"):
            current = "isotopes"
            continue
        if line == "Tính chất":
            in_props = True
            in_prep = False
            continue
        if in_props and "tính chất vật" in low:
            current = "physical"
            continue
        if in_props and "tính chất hóa" in low:
            current = "chemical"
            continue
        if line == "Điều chế":
            current = "prep_industry"
            in_prep = True
            in_props = False
            continue
        if in_prep and "phòng thí nghiệm" in low:
            current = "prep_lab"
            continue
        if in_prep and "công nghiệp" in low:
            current = "prep_industry"
            continue
        if line == "Nhận biết":
            current = "recognition"
            in_prep = False
            in_props = False
            continue
        if line == "Phương trình":
            current = "reactions"
            in_prep = False
            in_props = False
            continue
        if line == "Ứng dụng thực tế" or line == "Ứng dụng":
            current = "applications"
            in_prep = False
            in_props = False
            continue
        if "tổng quan" in low and len(line) < 40:
            current = "notes"
            in_prep = False
            in_props = False
            continue
        sections[current].append(line)
    return sections


def parse_general(data, lines):
    for line in lines:
        if line.startswith("Tên Latin:"):
            data["general"]["latinName"] = line.split(":", 1)[1].strip()
        elif line.startswith("Tên tiếng Anh:") or line.startswith("Tên Tiếng Anh:"):
            value = line.split(":", 1)[1].strip()
            data["general"]["englishName"] = value
            data["nameEn"] = value or data["nameEn"]
        elif line.startswith("Đồng vị:"):
            data["general"]["isotope"] = line.split(":", 1)[1].strip()
        elif line.startswith("Vị trí:"):
            value = line.split(":", 1)[1].strip()
            group = re.search(r"Nhóm\s+([IVX]+[AB]?)", value)
            period = re.search(r"Chu kỳ\s+(\d+)", value)
            if group:
                data["general"]["group"] = ROMAN_GROUPS.get(group.group(1), data["general"]["group"])
            if period:
                data["general"]["period"] = int(period.group(1))
        elif line.startswith("Số Oxy hóa:") or line.startswith("Số oxi hóa:"):
            data["general"]["oxidation"] = line.split(":", 1)[1].strip()
        elif line.startswith("Độ âm điện:"):
            value = line.split(":", 1)[1].strip()
            try:
                data["general"]["electronegativity"] = float(value.replace(",", "."))
            except ValueError:
                data["general"]["electronegativity"] = value


def parse_history(data, lines):
    desc = []
    in_desc = False
    for line in lines:
        if line.startswith("Phát hiện bởi:"):
            data["history"]["discoverer"] = line.split(":", 1)[1].strip()
        elif line.startswith("Năm công bố:"):
            value = line.split(":", 1)[1].strip()
            if re.fullmatch(r"-?\d{1,4}", value):
                data["history"]["year"] = int(value)
            else:
                data["history"]["year"] = value
        elif line.startswith("Nơi khám phá:"):
            data["history"]["discoveryLocation"] = line.split(":", 1)[1].strip()
        elif line.startswith("Mô tả:"):
            in_desc = True
            desc.append(line.split(":", 1)[1].strip())
        elif in_desc:
            desc.append(line)
    data["history"]["description"] = " ".join(part for part in desc if part)


def parse_structure(data, lines):
    for line in lines:
        if line.startswith("Hoạt họa cấu hình e:") or line.startswith("Cấu hình e:"):
            data["general"]["electronConfig"] = line.split(":", 1)[1].strip()
        elif line.startswith("Mô hình mạng tinh thể:") or line.startswith("Loại mạng:"):
            value = line.split(":", 1)[1].strip()
            data["structureType"] = value
            data["general"]["crystalStructure"] = value
            data["structure"]["lattice"] = value
        elif line.startswith("Nguyên tử khối:"):
            match = re.search(r"\d+(?:[.,]\d+)?", line)
            if match:
                data["mass"] = float(match.group(0).replace(",", "."))
        elif line.startswith("Vỏ nguyên tử:"):
            match = re.search(r"\d+", line)
            if match:
                data["structure"]["electrons"] = int(match.group(0))
        elif line.startswith("Hạt nhân:"):
            proton = re.search(r"(\d+)\s*proton", line)
            neutron = re.search(r"(\d+)\s*neutron", line)
            if proton:
                data["structure"]["protons"] = int(proton.group(1))
                data["structure"]["nucleus"]["proton"] = int(proton.group(1))
            if neutron:
                data["structure"]["neutrons"] = int(neutron.group(1))
                data["structure"]["nucleus"]["neutron"] = int(neutron.group(1))
        elif re.match(r"^[K-Z]:\s*\d+", line):
            shells = [int(part.split(":", 1)[1].strip()) for part in line.split("|") if ":" in part]
            data["structure"]["electronShells"] = shells
            data["structure"]["shells"] = shells
            if shells:
                data["structure"]["valenceElectrons"] = shells[-1]


def parse_occurrence(data, lines):
    for line in lines:
        if line.startswith("Trạng thái:"):
            data["occurrence"]["description"] = line.split(":", 1)[1].strip()
        elif line.startswith("Có trong:"):
            data["occurrence"]["ores"] = split_list(line.split(":", 1)[1])
        elif line.startswith("Đơn chất:"):
            data["occurrence"]["simple"] = split_list(line.split(":", 1)[1])
        elif line.startswith("Hợp chất:"):
            data["occurrence"]["compounds"] = split_list(line.split(":", 1)[1])


def parse_physical_metadata(data, lines):
    for line in lines:
        text = clean_item(line)
        if text.startswith("Khối lượng riêng:"):
            data["general"]["density"] = text.split(":", 1)[1].strip()
        elif text.startswith("Nhiệt độ nóng chảy:"):
            data["general"]["meltingPoint"] = text.split(":", 1)[1].strip()
        elif text.startswith("Nhiệt độ sôi:"):
            data["general"]["boilingPoint"] = text.split(":", 1)[1].strip()


def parse_preparations(lines):
    items = []
    current = None
    for line in lines:
        text = clean_item(line)
        if not text:
            continue
        if has_equation(text):
            if current is None:
                current = {"title": "Điều chế", "equation": "", "desc": ""}
            current["equation"] = f'{current["equation"]} <br> {text}'.strip(" <br>")
            continue
        if current is None:
            current = {"title": text, "equation": "", "desc": ""}
        elif current["equation"]:
            current["desc"] = f'{current["desc"]} {text}'.strip()
        else:
            items.append(current)
            current = {"title": text, "equation": "", "desc": ""}
    if current:
        items.append(current)
    return items


def parse_recognition(lines):
    items = []
    for line in lines:
        text = clean_item(line)
        if not text:
            continue
        if ":" in text:
            title, desc = text.split(":", 1)
            item = {"title": title.strip(), "reagent": "", "result": desc.strip(), "equation": ""}
        else:
            item = {"title": "Nhận biết", "reagent": text, "result": "", "equation": ""}
        if has_equation(text):
            item["equation"] = text
            if item["title"] == "Nhận biết":
                item["reagent"] = ""
        items.append(item)
    return items


def parse_reactions(lines):
    reactions = []
    current_type = "Phản ứng đặc trưng"
    pending_desc = ""
    for line in lines:
        text = clean_item(line)
        if not text:
            continue
        if "→" in text or "⇌" in text:
            reactions.append({"type": current_type, "equation": text, "desc": pending_desc})
            pending_desc = ""
        elif text.endswith(":"):
            pending_desc = text
        else:
            current_type = text
            pending_desc = ""
    return reactions


def parse_applications(lines):
    apps = []
    for line in lines:
        text = clean_item(line)
        if not text:
            continue
        if ":" in text:
            title, desc = text.split(":", 1)
            apps.append({"title": title.strip(), "desc": desc.strip()})
        else:
            apps.append({"title": "Ứng dụng", "desc": text})
    return apps


def build_element(docx_path, manifest_by_number):
    number_text, symbol = docx_path.stem.split("_", 1)
    number = int(number_text)
    meta = manifest_by_number.get(number, {})
    data = empty_element(number, symbol, meta)

    existing_path = ELEMENT_DIR / f"{number:03d}_{symbol}.json"
    existing = {}
    if existing_path.exists():
        existing = json.loads(existing_path.read_text(encoding="utf-8"))
        for key in ("naturalState", "assets", "assetFolder", "images"):
            if key in existing:
                data[key] = existing[key]

    sections = segment(read_docx_lines(docx_path))
    if sections["title"]:
        match = re.match(r"^(.+?)\s*\(([^)]+)\)", sections["title"][0])
        if match:
            data["nameVi"] = match.group(1).strip()

    parse_general(data, sections["general"])
    parse_history(data, sections["history"])
    parse_structure(data, sections["structure"])
    parse_occurrence(data, sections["occurrence"])
    for line in sections["isotopes"]:
        if line.startswith("Đồng vị:"):
            data["general"]["isotope"] = line.split(":", 1)[1].strip()
            break

    parse_physical_metadata(data, sections["physical"])
    data["physical"] = html_list(sections["physical"])
    data["chemical"] = html_list(sections["chemical"])
    data["preparations"] = {
        "lab": parse_preparations(sections["prep_lab"]),
        "industry": parse_preparations(sections["prep_industry"]),
    }
    data["recognition"] = parse_recognition(sections["recognition"])
    data["reactions"] = parse_reactions(sections["reactions"])
    data["applications"] = parse_applications(sections["applications"])
    data["notes"] = notes_html(sections["notes"])

    data["category"] = category_for(symbol, data.get("category", "unknown"))
    data["file"] = f"elements/{number:03d}_{symbol}.json"
    data["hasData"] = True
    return data


def validate(manifest, strict_paths):
    errors = []
    for path in sorted(strict_paths):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path}: invalid JSON: {exc}")
            continue
        match = re.match(r"^(\d{3})_([A-Z][a-z]?)\.json$", path.name)
        if not match:
            errors.append(f"{path}: invalid filename")
            continue
        number, symbol = int(match.group(1)), match.group(2)
        if data.get("number") != number:
            errors.append(f"{path}: number mismatch")
        if data.get("symbol") != symbol:
            errors.append(f"{path}: symbol mismatch")
        for field in ("reactions", "applications", "recognition"):
            if not isinstance(data.get(field, []), list):
                errors.append(f"{path}: {field} must be array")
        if not isinstance(data.get("preparations", {}), dict):
            errors.append(f"{path}: preparations must be object")
    for item in manifest:
        if item.get("hasData") and item.get("file"):
            target = ROOT / "data" / item["file"]
            if not target.exists():
                errors.append(f"manifest {item.get('symbol')}: file missing: {item.get('file')}")
    return errors


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest_by_number = {int(item["number"]): item for item in manifest}
    processed = []

    for docx_path in sorted(WORD_DIR.glob("*.docx")):
        data = build_element(docx_path, manifest_by_number)
        output_path = ELEMENT_DIR / f'{data["number"]:03d}_{data["symbol"]}.json'
        output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        meta = manifest_by_number.get(data["number"])
        if meta:
            meta["symbol"] = data["symbol"]
            meta["nameVi"] = data["nameVi"] or meta.get("nameVi", data["nameEn"])
            meta["nameEn"] = data["nameEn"] or meta.get("nameEn", data["nameVi"])
            meta["category"] = data["category"]
            meta["hasData"] = True
            meta["file"] = data["file"]
        processed.append(f'{data["number"]:03d}_{data["symbol"]}')

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    strict_paths = [
        ELEMENT_DIR / f"{item}.json"
        for item in processed
    ]
    errors = validate(manifest, strict_paths)
    if errors:
        print("VALIDATION FAILED")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)
    print(f"Processed {len(processed)} Word files.")
    print(", ".join(processed))
    print("Validation passed.")


if __name__ == "__main__":
    main()
