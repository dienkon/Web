import re

with open("src/components/3d/LabEnvironment.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace getTeacherDialog usage
content = re.sub(
    r"const teacherDialog = getTeacherDialog\(player, tasks, currentPhase, completeTask, setCurrentPhase, endGame\);",
    r"const teacherDialog = PhaseEngine.getTeacherDialog(currentPhase, tasks, player, completeTask, setCurrentPhase, endGame);",
    content
)

# Replace getTeacherDialog definition
match_get_teacher = re.search(r"// Dynamic dialog evaluator.*?(?=// 30 Fixed Decorative Educational Chemistry Objects)", content, re.DOTALL)
if match_get_teacher:
    content = content.replace(match_get_teacher.group(0), "import { PhaseEngine } from '../../core/PhaseEngine';\n\n")

# 2. Extract components
teacher_match = re.search(r"const TeacherFallbackModel: React\.FC = \(\) => \{", content)
lab_env_match = re.search(r"export const LabEnvironment: React\.FC = \(\) => \{", content)

if teacher_match and lab_env_match:
    extracted = content[teacher_match.start():lab_env_match.start()]
    content = content[:teacher_match.start()] + content[lab_env_match.start():]
    
    extracted = extracted.replace("const TeacherModel = ", "export const TeacherModel = ")
    extracted = extracted.replace("const SideTable = ", "export const SideTable = ")
    
    with open("src/components/3d/LabEnvironmentPieces.tsx", "w", encoding="utf-8") as f:
        f.write("import React, { useMemo, useEffect } from 'react';\n")
        f.write("import { Box, Cylinder, Sphere, useGLTF } from '@react-three/drei';\n")
        f.write("import * as THREE from 'three';\n\n")
        f.write(extracted)

# 3. Replace DECORATIVE_ITEMS block
dec_map_start = re.search(r"\{DECORATIVE_ITEMS\.map", content)
if dec_map_start:
    open_braces = 0
    in_str = False
    escape = False
    end_idx = -1
    for i in range(dec_map_start.start(), len(content)):
        char = content[i]
        if char == '"' and not escape: in_str = not in_str
        if char == '\\': escape = not escape
        else: escape = False
        
        if not in_str:
            if char == '{': open_braces += 1
            elif char == '}': 
                open_braces -= 1
                if open_braces == 0:
                    end_idx = i + 1
                    break
    if end_idx != -1:
        content = content[:dec_map_start.start()] + "<LabDecorations />" + content[end_idx:]

dec_array_match = re.search(r"const DECORATIVE_ITEMS = \[.*?\];", content, re.DOTALL)
if dec_array_match:
    content = content.replace(dec_array_match.group(0), "")

# 4. Insert <InteractionManager />
return_match = re.search(r"return \(\s*<group", content)
if return_match:
    content = content[:return_match.end()] + ">\n      <InteractionManager />" + content[return_match.end()+1:]

# 5. Add imports
imports = """
import { LabDecorations } from './LabDecorations';
import { TeacherModel, SideTable } from './LabEnvironmentPieces';
import { InteractionManager } from './InteractionManager';
"""
import_match = re.search(r"import \{ InteractableItem \} from '\./InteractableItem';", content)
if import_match:
    content = content[:import_match.start()] + imports + import_match.group(0) + content[import_match.end():]

with open("src/components/3d/LabEnvironment.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Migration done")
