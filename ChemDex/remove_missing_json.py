import json
import os
import glob

# Load manifest
manifest_path = r'data\manifest.json'
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# Find json files to remove
to_remove = []
for file in glob.glob(r'data\elements\*.json'):
    with open(file, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except:
            continue
        
    is_missing = False
    
    # Check if hasData is false
    if data.get('hasData') == False:
        is_missing = True
        
    # Check if physical is placeholder
    physical = data.get('physical', '')
    if 'Đang cập nhật' in physical or not physical:
        is_missing = True
        
    # Check if file size is very small (placeholder)
    if os.path.getsize(file) < 1500:
        is_missing = True
        
    if is_missing:
        to_remove.append(file)
        # Update manifest
        filename = os.path.basename(file)
        for item in manifest:
            if item.get('file') == f"elements/{filename}":
                item['hasData'] = False
                break

# Remove files
for file in to_remove:
    print(f"Removing {file}")
    os.remove(file)
    
# Save manifest
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    
print(f"Removed {len(to_remove)} files with missing information.")
