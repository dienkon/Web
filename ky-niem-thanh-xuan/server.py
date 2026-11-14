"""Local preview with fresh public Drive listings; writes use Apps Script."""
import argparse
import errno
import html
import http.server
import json
import os
import re
import ssl
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timezone
from pathlib import Path

ROOT_FOLDER_ID = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa'
PORT = int(os.environ.get('PORT', 8080))
BASE_DIR = Path(__file__).resolve().parent
try:
    import certifi
    TLS_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    TLS_CONTEXT = ssl.create_default_context()


def fetch_folder_live(folder_id):
    if not re.fullmatch(r'[\w-]+', folder_id):
        raise ValueError('ID thư mục không hợp lệ.')
    request = urllib.request.Request(
        'https://drive.google.com/embeddedfolderview?' + urllib.parse.urlencode({'id': folder_id}),
        headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'},
    )
    with urllib.request.urlopen(request, context=TLS_CONTEXT, timeout=30) as response:
        if urllib.parse.urlparse(response.url).hostname != 'drive.google.com':
            raise ValueError('Thư mục cần được chia sẻ công khai hoặc kết nối Apps Script.')
        document = response.read().decode('utf-8')
    if not re.search(r'class="flip-(?:entries|empty|list|grid)', document):
        raise ValueError('Không đọc được Drive. Kiểm tra quyền chia sẻ hoặc kết nối Apps Script.')
    folders, files = [], []
    for part in document.split('<div class="flip-entry" id="entry-')[1:]:
        file_id = part.split('"', 1)[0]
        if not re.fullmatch(r'[\w-]+', file_id):
            continue
        href_match = re.search(r'<a href="([^"]+)"', part)
        href = html.unescape(href_match.group(1)) if href_match else ''
        name_match = re.search(r'<div class="flip-entry-title">(.*?)</div>', part, re.S)
        name = html.unescape(re.sub(r'<[^>]+>', '', name_match.group(1))) if name_match else file_id
        modified_match = re.search(r'<div class="flip-entry-last-modified"><div>([^<]*)</div>', part)
        modified = html.unescape(modified_match.group(1)) if modified_match else ''
        if '/folders/' in href:
            folders.append({'id': file_id, 'n': name, 'm': modified})
        else:
            mime_match = re.search(r'/type/([^"?]+)', part)
            mime = html.unescape(mime_match.group(1)) if mime_match else ''
            extension = Path(name).suffix.lower()
            kind = (1 if mime.startswith('video/') or extension in {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'}
                    else 0 if mime.startswith('image/') or extension in {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif', '.tiff', '.bmp'}
                    else 2)
            files.append([file_id, name, kind, modified])
    title = re.search(r'<title>(.*?)</title>', document, re.S)
    name = html.unescape(title.group(1)).removesuffix(' - Google Drive') if title else None
    return {'id': folder_id, 'n': name, 'f': folders, 'items': files}


class LiveDriveHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store, max-age=0')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/.well-known/appspecific/com.chrome.devtools.json':
            self.send_response(204)
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        if parsed.path == '/favicon.ico':
            raw = (BASE_DIR / 'favicon.svg').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'image/svg+xml')
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if parsed.path.endswith('/api/status'):
            return self.send_json({'ok': True, 'mode': 'public-live-read', 'rootId': ROOT_FOLDER_ID,
                                   'writable': False, 'time': datetime.now(timezone.utc).isoformat()})
        if parsed.path.endswith('/api/live-folder'):
            folder_id = urllib.parse.parse_qs(parsed.query).get('id', [ROOT_FOLDER_ID])[0]
            try:
                folder = fetch_folder_live(folder_id)
                return self.send_json({'ok': True, 'folder': folder, 'nextPageToken': None})
            except (ValueError, urllib.error.URLError, TimeoutError) as error:
                return self.send_json({'ok': False, 'error': str(error)}, 502)
        if parsed.path.startswith('/api/'):
            return self.send_json({'ok': False, 'error': 'Endpoint không tồn tại.'}, 404)
        return super().do_GET()

    def do_POST(self):
        return self.send_json({'ok': False, 'error': 'Kết nối Apps Script để tải tệp và tạo thư mục.'}, 503)


def run_preview(open_browser=False):
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), LiveDriveHandler)
    except OSError as error:
        if not open_browser or error.errno not in (errno.EADDRINUSE, errno.EACCES, 10048, 10013):
            raise
        # The launcher can coexist with another local server without stopping it.
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), LiveDriveHandler)
    with server:
        url = f'http://localhost:{server.server_address[1]}/'
        print(f'12A1 Nha Co Nhau: {url}', flush=True)
        print('Keep this window open. Press Ctrl+C to stop.', flush=True)
        if open_browser:
            threading.Thread(target=webbrowser.open, args=(url,), daemon=True).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Open the 12A1 archive through a local HTTP server.')
    parser.add_argument('--open', action='store_true', dest='open_browser', help='Open the local website in your browser.')
    run_preview(parser.parse_args().open_browser)
