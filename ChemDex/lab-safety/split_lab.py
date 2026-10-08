import re

file_path = "src/components/3d/LabEnvironment.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove DECORATIVE_ITEMS array
start_pattern = r"// 30 Fixed Decorative Educational Chemistry Objects.*?const DECORATIVE_ITEMS = \["
match = re.search(start_pattern, content, re.DOTALL)
if match:
    start_idx = match.start()
    # Find matching closing bracket
    open_brackets = 0
    in_str = False
    escape = False
    for i in range(match.end() - 1, len(content)):
        char = content[i]
        if char == '"' and not escape:
            in_str = not in_str
        if char == '\\':
            escape = not escape
        else:
            escape = False
            
        if not in_str:
            if char == '[': open_brackets += 1
            elif char == ']': 
                open_brackets -= 1
                if open_brackets == 0:
                    end_idx = i + 1
                    # check if there's a semicolon
                    if end_idx < len(content) and content[end_idx] == ';':
                        end_idx += 1
                    content = content[:start_idx] + content[end_idx:]
                    break

# 2. Extract Teacher models and SideTable
# They are defined before `export const LabEnvironment`
# Let's just find `const TeacherFallbackModel: React.FC = () => { ... }` up to `export const LabEnvironment`
teacher_start_match = re.search(r"const TeacherFallbackModel: React\.FC = \(\) => \{", content)
lab_env_match = re.search(r"export const LabEnvironment: React\.FC = \(\) => \{", content)

if teacher_start_match and lab_env_match:
    extracted_components = content[teacher_start_match.start():lab_env_match.start()]
    content = content[:teacher_start_match.start()] + content[lab_env_match.start():]
    
    with open("src/components/3d/LabEnvironmentPieces.tsx", "w", encoding="utf-8") as f:
        f.write("import React, { useMemo, useEffect } from 'react';\n")
        f.write("import { Box, Cylinder, Sphere, useGLTF } from '@react-three/drei';\n")
        f.write("import * as THREE from 'three';\n\n")
        f.write(extracted_components)

with open(file_path, "w", encoding="utf-8") as f:
    # also we need to add imports to LabEnvironment
    f.write(content)

print("Split successful.")
