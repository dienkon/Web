import urllib.request
import ssl
import sys
import re
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')
ROOT_FOLDER_ID = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa'
ctx = ssl._create_unverified_context()


def fetch_folder(folder_id):
    url = f'https://drive.google.com/embeddedfolderview?id={folder_id}#list'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req, context=ctx, timeout=20).read().decode('utf-8', errors='ignore')
    parts = html.split('<div class="flip-entry" id="entry-')[1:]
    items = []
    for p in parts:
        eid = p.split('"', 1)[0]
        href_m = re.search(r'<a href="([^"]+)"', p)
        href = href_m.group(1) if href_m else ''
        title_m = re.search(r'<div class="flip-entry-title">([^<]*)</div>', p)
        title = title_m.group(1) if title_m else ''
        icon_m = re.search(r'drive-thirdparty\.googleusercontent\.com/\d+/type/([^"]+)"', p)
        mime = icon_m.group(1) if icon_m else ('folder' if '/folders/' in href else 'unknown')
        mod_m = re.search(r'<div class="flip-entry-last-modified"><div>([^<]*)</div>', p)
        mod = mod_m.group(1) if mod_m else ''
        items.append({
            'id': eid,
            'name': title,
            'mime': mime,
            'isFolder': '/folders/' in href,
            'modified': mod
        })
    return items


def crawl_tree(root_id):
    root_items = fetch_folder(root_id)
    with ThreadPoolExecutor(max_workers=16) as ex:
        def process_node(node):
            if node['isFolder']:
                children = fetch_folder(node['id'])
                subfolders = [c for c in children if c['isFolder']]
                if subfolders:
                    list(ex.map(process_node, subfolders))
                node['children'] = children
            return node

        list(ex.map(process_node, root_items))
    return root_items


def natural_key(node):
    name = node['name'].strip()
    parts = name.split('.', 1)
    if parts[0].isdigit():
        return (0, int(parts[0]), name)
    return (1, 0, name)


def compact_node(node):
    if node['isFolder']:
        children = node.get('children', [])
        folders = sorted(
            [compact_node(c) for c in children if c['isFolder']],
            key=lambda x: natural_key({'name': x['n']})
        )
        files = []
        img_count = 0
        vid_count = 0
        for c in children:
            if not c['isFolder']:
                is_vid = 1 if ('video' in c['mime'] or c['name'].lower().endswith(('.mp4', '.mov', '.avi', '.mkv', '.webm'))) else 0
                if is_vid:
                    vid_count += 1
                else:
                    img_count += 1
                files.append([c['id'], c['name'], is_vid, c.get('modified', '')])
        total_img = img_count + sum(f.get('ti', 0) for f in folders)
        total_vid = vid_count + sum(f.get('tv', 0) for f in folders)
        cover_id = ''
        for f_item in files:
            if f_item[2] == 0:
                cover_id = f_item[0]
                break
        if not cover_id and files:
            cover_id = files[0][0]
        if not cover_id:
            for sf in folders:
                if sf.get('c'):
                    cover_id = sf['c']
                    break
        return {
            'id': node['id'],
            'n': node['name'].strip(),
            'm': node.get('modified', ''),
            'c': cover_id,
            'ti': total_img,
            'tv': total_vid,
            'f': folders,
            'items': files
        }


if __name__ == '__main__':
    print(f'Đang đồng bộ dữ liệu từ Google Drive ({ROOT_FOLDER_ID})...')
    tree = crawl_tree(ROOT_FOLDER_ID)
    root_folders = sorted(
        [compact_node(n) for n in tree if n['isFolder']],
        key=lambda x: natural_key({'name': x['n']})
    )
    data_obj = {
        'rootId': ROOT_FOLDER_ID,
        'syncedAt': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'totalImages': sum(f['ti'] for f in root_folders),
        'totalVideos': sum(f['tv'] for f in root_folders),
        'folders': root_folders
    }
    js_content = 'window.DRIVE_DATA = ' + json.dumps(data_obj, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open('drive-data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"Hoàn tất! Đã lưu {data_obj['totalImages']} ảnh và {data_obj['totalVideos']} video vào drive-data.js.")
