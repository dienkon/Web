import os
import re

directories = ["src"]
for root, dirs, files in os.walk(directories[0]):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            new_content = content
            # equipment replacements
            equipment = ["hasGoggles", "hasLabCoat", "hasGloves", "hasMask", "hairTied", "hasClosedShoes"]
            for eq in equipment:
                new_content = re.sub(rf"player\.{eq}", f"player.equipment.{eq}", new_content)

            # inventory replacements
            inventory = ["hasFireExtinguisher", "hasSweeper", "isHoldingTrash", "heldTrashType"]
            for inv in inventory:
                new_content = re.sub(rf"player\.{inv}", f"player.inventory.{inv}", new_content)

            # flags replacements
            flags = ["fireExtinguished", "trashCount", "trash1Picked", "trash2Picked", "trash3Picked"]
            for fl in flags:
                new_content = re.sub(rf"player\.{fl}", f"player.flags.{fl}", new_content)

            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
