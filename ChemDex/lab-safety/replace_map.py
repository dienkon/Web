import re

file_path = "src/components/3d/LabEnvironment.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the map block
map_start = r"\{DECORATIVE_ITEMS\.map\(\(item\) => \("
match = re.search(map_start, content)
if match:
    start_idx = match.start()
    open_brackets = 0
    in_str = False
    escape = False
    for i in range(match.start(), len(content)):
        char = content[i]
        if char == '"' and not escape:
            in_str = not in_str
        if char == '\\':
            escape = not escape
        else:
            escape = False
            
        if not in_str:
            if char == '{': open_brackets += 1
            elif char == '}': 
                open_brackets -= 1
                if open_brackets == 0:
                    end_idx = i + 1
                    content = content[:start_idx] + "<LabDecorations />" + content[end_idx:]
                    break

# Add imports
imports = """
import { LabDecorations } from './LabDecorations';
import { TeacherModel, SideTable } from './LabEnvironmentPieces';
"""

# Insert imports at the top
import_idx = content.find("import { InteractableItem }")
if import_idx != -1:
    content = content[:import_idx] + imports + content[import_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Map replaced successfully.")
