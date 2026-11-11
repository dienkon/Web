import io
import unittest
from unittest.mock import patch

import server


class Response(io.BytesIO):
    url = 'https://drive.google.com/embeddedfolderview'


class PublicDriveTests(unittest.TestCase):
    def test_rejects_login_and_error_pages(self):
        for page in [b'<html>Sign in</html>', b'<title>Not found</title>']:
            with patch('server.urllib.request.urlopen', return_value=Response(page)):
                with self.assertRaises(ValueError):
                    server.fetch_folder_live('valid-id')

    def test_empty_folder_is_valid(self):
        with patch('server.urllib.request.urlopen', return_value=Response(b'<title>Empty - Google Drive</title><div class="flip-entries"></div>')):
            data = server.fetch_folder_live('empty-id')
        self.assertEqual(data['items'], [])
        self.assertEqual(data['f'], [])
        self.assertEqual(data['n'], 'Empty')

    def test_lists_every_type_and_decodes_drive_names(self):
        page = '''<title>Live - Google Drive</title><div class="flip-entries">
        <div class="flip-entry" id="entry-folder"><a href="https://drive.google.com/drive/folders/folder"><div class="flip-entry-title">A &amp; B</div>
        <div class="flip-entry" id="entry-photo"><a href="https://drive.google.com/file/d/photo"><div class="flip-entry-title">photo.heic</div><img src="https://drive-thirdparty.googleusercontent.com/256/type/image/heic">
        <div class="flip-entry" id="entry-video"><a href="https://drive.google.com/file/d/video"><div class="flip-entry-title">clip.mov</div>
        <div class="flip-entry" id="entry-zip"><a href="https://drive.google.com/file/d/zip"><div class="flip-entry-title">data.zip</div></div>'''
        with patch('server.urllib.request.urlopen', return_value=Response(page.encode())):
            data = server.fetch_folder_live('valid-id')
        self.assertEqual(data['f'][0]['n'], 'A & B')
        self.assertEqual([item[2] for item in data['items']], [0, 1, 2])

    def test_invalid_id_does_not_make_network_request(self):
        with patch('server.urllib.request.urlopen') as fetch:
            with self.assertRaises(ValueError):
                server.fetch_folder_live("id&other=bad")
            fetch.assert_not_called()


if __name__ == '__main__':
    unittest.main()
