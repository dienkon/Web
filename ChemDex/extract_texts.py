import os
import zipfile
import xml.etree.ElementTree as ET

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

files = ['004_Be.docx', '005_B.docx', '006_C.docx', '007_N.docx', '008_O.docx', '009_F.docx', '010_Ne.docx']
base_dir = r'd:\VsCode\Web\MyWeb\ChemDex\Các nguyên tố hóa học trong bảng tuần hoàn'
out_dir = r'd:\VsCode\Web\MyWeb\ChemDex\scratch'
if not os.path.exists(out_dir): os.makedirs(out_dir)

for f in files:
    path = os.path.join(base_dir, f)
    text = extract_text_from_docx(path)
    out_path = os.path.join(out_dir, f.replace('.docx', '.txt'))
    with open(out_path, 'w', encoding='utf-8') as out: out.write(text)
print('Done')
