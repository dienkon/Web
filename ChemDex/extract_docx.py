import zipfile
import xml.etree.ElementTree as ET

z = zipfile.ZipFile(r'd:\VsCode\Web\MyWeb\ChemDex\docs\tổng hợp các chất (1).docx')
xml_content = z.read('word/document.xml')
doc = ET.fromstring(xml_content)

ns = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math'
}

paragraphs = []
for p in doc.findall('.//w:p', ns):
    para_text = ''
    # We need to iterate over all elements in the paragraph in order
    for node in p.iter():
        if node.tag == f"{{{ns['w']}}}t":
            if node.text:
                para_text += node.text
        elif node.tag == f"{{{ns['m']}}}t":
            if node.text:
                para_text += node.text
    if para_text:
        paragraphs.append(para_text)

with open('parsed_docx_full.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(paragraphs))
    
print("Extracted to parsed_docx_full.txt")
