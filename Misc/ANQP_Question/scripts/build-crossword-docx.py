"""Build the teacher handout from the current crossword source data.

Run using the Python bundled with the Codex primary runtime.
"""
from pathlib import Path
import json
import subprocess
import unicodedata

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies'
NODE = RUNTIME / 'node/bin/node.exe'
SOURCE = ROOT / 'src/crossword-data.mjs'
OUTPUT = ROOT / 'output/Cau_hoi_va_dap_an_o_chu_DUKICH.docx'
script = 'const m = await import(' + json.dumps(SOURCE.as_uri()) + '); console.log(JSON.stringify({rows:m.crosswordRows, keyword:m.crosswordKeyword}));'
data = json.loads(subprocess.run([str(NODE), '--input-type=module', '-e', script], check=True, capture_output=True, text=True, encoding='utf-8').stdout)
rows = data['rows']


def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text).upper().replace('Đ', 'D') if 'A' <= c <= 'Z')


def font(run, size=None, bold=None):
    run.font.name = 'Arial'
    run.font.color.rgb = RGBColor(0, 0, 0)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    rf = run._element.get_or_add_rPr().rFonts
    rf.set(qn('w:ascii'), 'Arial')
    rf.set(qn('w:hAnsi'), 'Arial')
    rf.set(qn('w:eastAsia'), 'Arial')


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(.7)
section.bottom_margin = Inches(.7)
section.left_margin = Inches(.8)
section.right_margin = Inches(.8)
for name, size in [('Normal', 12), ('Title', 22), ('Subtitle', 13), ('Heading 1', 16), ('Heading 2', 14)]:
    style = doc.styles[name]
    style.font.name = 'Arial'
    style.font.size = Pt(size)
    style.font.color.rgb = RGBColor(0, 0, 0)
    style.font.underline = False
    style.paragraph_format.space_after = Pt(7 if name == 'Normal' else 10)
    style.paragraph_format.line_spacing = 1.1
    rf = style.element.get_or_add_rPr().rFonts
    rf.set(qn('w:ascii'), 'Arial')
    rf.set(qn('w:hAnsi'), 'Arial')
    rf.set(qn('w:eastAsia'), 'Arial')
    for attr in ['themeColor', 'themeTint', 'themeShade']:
        color = style.element.find('.//' + qn('w:color'))
        if color is not None:
            color.attrib.pop(qn('w:' + attr), None)
    pp = style.element.find(qn('w:pPr'))
    if pp is not None:
        for border in pp.findall(qn('w:pBdr')):
            pp.remove(border)
doc.styles['Heading 1'].paragraph_format.space_before = Pt(16)
doc.styles['Heading 2'].paragraph_format.space_before = Pt(13)


def p(text='', label=None, keep=False):
    para = doc.add_paragraph()
    para.paragraph_format.keep_together = keep
    if label:
        font(para.add_run(label + ' '), bold=True)
    font(para.add_run(text))
    return para


def heading(text, level=1):
    para = doc.add_heading(text, level=level)
    for run in para.runs:
        font(run, bold=True)
    return para


def clue_header(row, label):
    heading(f'Hàng {row["id"]} {label}', 2)
    p(row['prompt'], label='Câu hỏi', keep=True)


def answer_details(row):
    word = normalize(row['answer'])
    keypos = row['keywordIndex'] + 1
    p(row['hint'], label='Gợi ý', keep=True)
    p(row['answer'] + '.', label='Đáp án', keep=True)
    p(f'{word}, gồm {len(word)} ô. Lấy chữ thứ {keypos}, được chữ {word[keypos-1]}.', label='Điền ô chữ', keep=True)


doc.add_paragraph('Câu hỏi và đáp án trò chơi ô chữ', style='Title')
p('Bản dành cho giáo viên và người dẫn trò chơi. Tài liệu gồm đủ sáu hàng ngang, hình gợi ý, câu hỏi trắc nghiệm, hướng dẫn diễn tả bằng hành động và đáp án ghép từ khóa DUKICH.')

heading('Cách tổ chức')
for text in [
    'Cho người chơi chọn hàng ngang, đọc câu hỏi và xem hình hoặc phần diễn tả tương ứng. Chỉ dùng gợi ý khi cần.',
    'Ở hàng 4 và hàng 5, giao riêng hướng dẫn cho người diễn. Người diễn không nói thành tiếng và không đọc đáp án cho người chơi.',
    'Chấp nhận câu trả lời có dấu hoặc không dấu, có hoặc không có khoảng trắng. Khi đếm ô, bỏ dấu tiếng Việt và khoảng trắng; Đ được tính là D.',
    'Những chữ lấy từ sáu hàng theo thứ tự 1 đến 6 tạo thành từ khóa. Người chơi có thể nhập DU KÍCH hoặc DUKICH.',
]:
    para = p(text)
    para.paragraph_format.left_indent = Inches(.15)

heading('Bảng đáp án nhanh')
headers = ['Hàng', 'Đáp án', 'Điền vào ô', 'Số ô', 'Vị trí lấy chữ', 'Chữ khóa']
widths = [.48, 1.34, 1.42, .58, 1.03, .68]
table = doc.add_table(rows=1, cols=len(headers))
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
for cell, width, text in zip(table.rows[0].cells, widths, headers):
    cell.width = Inches(width)
    cell.text = text
for row in rows:
    word = normalize(row['answer'])
    values = [str(row['id']), row['answer'], word, str(len(word)), str(row['keywordIndex']+1), word[row['keywordIndex']]]
    cells = table.add_row().cells
    for cell, width, text in zip(cells, widths, values):
        cell.width = Inches(width)
        cell.text = text
for ri, tr in enumerate(table.rows):
    for ci, cell in enumerate(tr.cells):
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        props = cell._tc.get_or_add_tcPr()
        borders = OxmlElement('w:tcBorders')
        for side in ['top', 'left', 'bottom', 'right']:
            edge = OxmlElement('w:' + side)
            edge.set(qn('w:val'), 'single')
            edge.set(qn('w:sz'), '6')
            edge.set(qn('w:color'), 'D9D9D9')
            borders.append(edge)
        props.append(borders)
        margins = OxmlElement('w:tcMar')
        for side in ['top', 'left', 'bottom', 'right']:
            margin = OxmlElement('w:' + side)
            margin.set(qn('w:w'), '100')
            margin.set(qn('w:type'), 'dxa')
            margins.append(margin)
        props.append(margins)
        if ri == 0:
            shade = OxmlElement('w:shd')
            shade.set(qn('w:fill'), 'E5E5E5')
            props.append(shade)
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT if ci in [1, 2] else WD_ALIGN_PARAGRAPH.CENTER
            para.paragraph_format.space_after = Pt(2)
            para.paragraph_format.space_before = Pt(2)
            for run in para.runs:
                font(run, 11, ri == 0)
    trpr = tr._tr.get_or_add_trPr()
    no_split = OxmlElement('w:cantSplit')
    trpr.append(no_split)
repeat = OxmlElement('w:tblHeader')
table.rows[0]._tr.get_or_add_trPr().append(repeat)
p('Từ khóa cuối cùng là DU KÍCH. Dạng điền không dấu và không khoảng trắng là DUKICH.')

doc.add_page_break()
heading('Câu hỏi chi tiết các hàng 1 và 2')
row = rows[0]
clue_header(row, 'Nhìn hình đoán từ')
photo = doc.add_paragraph()
photo.alignment = WD_ALIGN_PARAGRAPH.CENTER
pic = photo.add_run().add_picture(str(ROOT / row['image'].removeprefix('./')), width=Inches(4.1))
pic._inline.docPr.set('descr', row['alt'])
photo.paragraph_format.space_after = Pt(9)
answer_details(row)

row = rows[1]
clue_header(row, 'Câu hỏi trắc nghiệm')
for letter, option in zip('ABCD', row['options']):
    p(f'{letter}. {option}')
answer_details(row)
p('Theo thứ tự lựa chọn gốc, đáp án là A. Hậu cần. Trên web, các lựa chọn được xáo trộn nên cần đối chiếu nội dung thay vì cố định chữ A.', keep=True)

doc.add_page_break()
heading('Câu hỏi chi tiết các hàng 3 đến 5')
row = rows[2]
clue_header(row, 'Câu hỏi trắc nghiệm')
for letter, option in zip('ABCD', row['options']):
    p(f'{letter}. {option}')
answer_details(row)
p('Theo thứ tự lựa chọn gốc, đáp án là B. Đoàn kết. Trên web, các lựa chọn được xáo trộn nên cần đối chiếu nội dung thay vì cố định chữ B.', keep=True)

for row in rows[3:5]:
    clue_header(row, 'Diễn tả bằng hành động')
    p(row['performerInstructions'], label='Hướng dẫn người diễn', keep=True)
    answer_details(row)

doc.add_page_break()
heading('Câu hỏi chi tiết hàng 6 và từ khóa')
row = rows[5]
clue_header(row, 'Đuổi hình bắt chữ')
pair = doc.add_paragraph()
pair.alignment = WD_ALIGN_PARAGRAPH.CENTER
for index, image in enumerate(row['images']):
    if index:
        font(pair.add_run('  +  '), 22, True)
    pic = pair.add_run().add_picture(str(ROOT / image['src'].removeprefix('./')), width=Inches(2.45))
    pic._inline.docPr.set('descr', image['alt'])
pair.paragraph_format.space_after = Pt(10)
answer_details(row)
p('Hình bên trái gợi tiếng HÀNH. Hình bên phải là quân cờ, gợi tiếng QUÂN. Ghép theo thứ tự từ trái sang phải được HÀNH QUÂN.', label='Giải thích hình', keep=True)

heading('Câu hỏi từ khóa')
p('Từ sáu chữ đã lấy ở các hàng ngang, em hãy tìm từ khóa gồm sáu chữ cái.', label='Câu hỏi', keep=True)
p('D + U + K + I + C + H = DUKICH.', label='Ghép chữ', keep=True)
p('DU KÍCH.', label='Đáp án', keep=True)
p('Chấp nhận DU KÍCH, DU KICH hoặc DUKICH. Cụm từ có hai tiếng và được điền thành sáu ô khi bỏ dấu, bỏ khoảng trắng.', label='Cách nhập', keep=True)

heading('Đối chiếu khi chấm')
p('Giữ nguyên thứ tự sáu hàng trong bảng đáp án. Vị trí lấy chữ được đếm từ trái sang phải, bắt đầu ở ô thứ nhất. Chữ xuất hiện ở vị trí đó trong từ đã bỏ dấu mới là chữ dùng để ghép từ khóa.')
p('Ví dụ, hàng 1 điền DIADAO vào sáu ô; chữ thứ tư là D. Hàng 6 điền HANHQUAN vào tám ô; chữ thứ tư là H.')

doc.core_properties.title = 'Câu hỏi và đáp án trò chơi ô chữ'
doc.core_properties.subject = 'Bản dành cho giáo viên và người dẫn trò chơi'
doc.core_properties.author = ''
doc.core_properties.keywords = 'ô chữ, DUKICH, giáo dục quốc phòng và an ninh'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUTPUT)
print(OUTPUT)
print('Rows:', len(rows), 'keyword:', ''.join(normalize(r['answer'])[r['keywordIndex']] for r in rows))
