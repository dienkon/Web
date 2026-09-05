import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_text_from_docx(docx_path):
    try:
        with zipfile.ZipFile(docx_path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            for p in tree.iterfind('.//w:p', ns):
                texts = []
                for node in p.iterfind('.//w:t', ns):
                    if node.text:
                        texts.append(node.text)
                if texts:
                    paragraphs.append(''.join(texts))
            
            return '\n'.join(paragraphs)
    except Exception as e:
        return str(e)

if __name__ == '__main__':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    if len(sys.argv) > 1:
        print(extract_text_from_docx(sys.argv[1]))
