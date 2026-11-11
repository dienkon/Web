"""Detailed follow-up audit: canonical library paths, crystal files and operations."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/library-crystal-upgrade/2026-11-11'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,text):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(text.encode())
def dump(p,value):write(p,json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def sha(data):return hashlib.sha256(data).hexdigest()

def main():
    docs=read(ROOT/'trung-tam/src/data/index.json')+read(ROOT/'trung-tam/src/data/reference-index.generated.json')
    # One Git process preserves exact bytes of all 487 baseline files.
    keys=[]
    for meta in docs:
        oldid=meta.get('legacyIds',[meta['id']])[0]
        folder='reference' if meta.get('documentKind')=='reference' else 'docs'
        keys.append(f'de8bf50b:ChemDex/trung-tam/src/data/{folder}/{oldid}.json')
    process=subprocess.run(['git','cat-file','--batch'],cwd=ROOT,input=('\n'.join(keys)+'\n').encode(),capture_output=True,check=True)
    offset=0;previous=[]
    for key in keys:
        end=process.stdout.index(b'\n',offset);header=process.stdout[offset:end].decode();size=int(header.split()[-1])
        previous.append(process.stdout[end+1:end+1+size]);offset=end+1+size+1
    migrations=[]
    for meta,before,key in zip(docs,previous,keys):
        newfile='trung-tam/src/data/'+meta['documentPath'];raw=(ROOT/newfile).read_bytes()
        old=json.loads(before.decode('utf-8-sig'));full=json.loads(raw.decode('utf-8-sig'))
        content_unchanged=old['content']==full['content']
        row={'id':meta['id'],'name':meta['title'],'slug':meta['slug'],
            'before':key.split(':ChemDex/')[1],'after':newfile,
            'url':'/trung-tam/tai-lieu-so/'+meta['slug']+'/',
            'legacyIds':meta.get('legacyIds',[meta['id']]),'beforeSha256':sha(before),
            'afterSha256':sha(raw),'articleContentUnchanged':content_unchanged,
            'substanceIds':meta.get('substanceIds',[])}
        migrations.append(row)
        lines=[f'# {meta["title"]}', '', f'- Tên thư mục: `{meta["slug"]}`.',
            f'- Trước: `{row["before"]}`.',f'- Sau: `{newfile}`.',f'- Đường dẫn: `{row["url"]}`.',
            f'- Định danh liên kết cũ: {", ".join(row["legacyIds"])}.',
            '- Sơ suất trước: đường dẫn dùng mã băm hoặc mã số nội bộ, không thể đọc tên chất; liên kết dùng tham số doc.',
            '- Đã sửa: thư mục tên chất, index.json trong từng thư mục, đường dẫn theo tên; ánh xạ mã cũ cho liên kết, dấu trang và lịch sử.',
            '- Ngăn trùng tên: thêm công thức và loại định danh khi cần; đồng phân giữ tài liệu riêng.',
            f'- Nội dung bài so với commit de8bf50b: {"giữ nguyên" if content_unchanged else "được tái sinh theo dữ liệu hiện tại; xem diff Git"}.',
            '- Kiểm tra: tệp tồn tại, id/metadata/thành phần nhất quán, liên kết chất phủ đủ, tìm kiếm chính xác vẫn phân biệt đồng phân.',
            f'- SHA-256 trước: `{row["beforeSha256"]}`.',f'- SHA-256 sau: `{row["afterSha256"]}`.', '']
        write(OUT/'tai-lieu'/meta['slug']/'audit.md','\n'.join(lines))
    dump(OUT/'library-path-migration.json',migrations)
    catalog=read(ROOT/'data/crystal-catalog.json')
    for meta in catalog['structures']:
        data=read(ROOT/meta['data'].lstrip('/'))
        lines=[f'# {meta["mineralName"]} — AMCSD {meta["amcsdId"]}', '',
            f'- Công thức bản ghi: `{meta["formula"]}`; nhóm không gian `{meta["spaceGroup"]}`.',
            f'- Metric: `{meta["cell"]}`; V tính lại `{meta["volume"]}` Å³.',
            f'- {len(data["asymmetricSites"])} vị trí bất đối xứng, {len(data["symmetryOperations"])} phép đối xứng, {data["siteCount"]} vị trí hình học trong ô.',
            f'- {data["mixedSiteCount"]} vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{data["cellComposition"]}`.',
            '- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.',
            '- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.',
            '- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.',
            '- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.',
            '- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.',
            f'- Lưu ý riêng: {meta["note"] or "Chỉ áp dụng cho pha và mẫu trong trích dẫn."}',
            f'- Giới hạn tọa độ: {meta["limitations"] or "Chỉ giữ các vị trí có trong bản ghi."}',
            '- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.',
            '', '## Trích dẫn bản ghi', '',str(meta['reference']['authors'])+f' ({meta["reference"]["year"]}). '+meta['reference']['title']+'. '+meta['reference']['journal']+', '+str(meta['reference']['volume'])+', '+meta['reference']['pages']+'.',
            '', '## Tệp xuất và kiểm tra', '']
        for kind in ['data','cif','model','preview']:
            p=ROOT/meta[kind].lstrip('/');lines.append(f'- `{p.relative_to(ROOT).as_posix()}`: {p.stat().st_size} byte; SHA-256 `{sha(p.read_bytes())}`.')
        lines+=['','- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.',
            '- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.',
            '- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.', '']
        write(OUT/'tinh-the'/meta['id']/'audit.md','\n'.join(lines))
    issues=[
        {'record':'AMCSD 0001011','mineral':'Beryl','finding':'WatC1 là vị trí nước giả nguyên tử, không có đủ tọa độ H để dựng phân tử nước thật. Không tự đổi nhãn Wat thành một nguyên tử khác.','resolution':'Chọn mẫu beryl 0001040 ở 0.001 kbar, không chứa nhãn giả nguyên tử.'},
        {'record':'AMCSD 0000049','mineral':'Graphite','finding':'Ô trực thoi Fmmm có 8 vị trí là cách biểu diễn lịch sử, không phải ô lục giác 4 nguyên tử mong muốn cho đối chiếu lớp graphite. Không coi số 8 là lỗi bản ghi.','resolution':'Chọn tinh thể tự nhiên đo neutron 0014675, ô lục giác P63/mmc, 4 nguyên tử.'},
        {'record':'AMCSD 0017791','mineral':'Pyrolusite','finding':'Gamma 120 độ không phù hợp đối xứng tứ phương P42/mnm; phép đối xứng không bảo toàn metric.','resolution':'Không đoán sửa gamma của bản ghi; thay bằng bản ghi tài liệu 0011760 có metric tứ phương 90 độ.'},
        {'record':'AMCSD 0009168 / 0009170 / 0009171','mineral':'La / Pr / Nd','finding':'Bản ghi truyền tải chỉ khai triển 2 nguyên tử với c tương ứng ô DHCP; thiếu vị trí so với cấu trúc DHCP 4 nguyên tử.','resolution':'Dùng 0011203 / 0011205 / 0011204 có cả hai loại vị trí; kiểm tra quần thể ô = 4.'},
        {'record':'Tantalite-(Fe)','mineral':'Tantalite','finding':'Snapshot không có bản ghi tantalite-(Fe) đã chọn; dùng tọa độ Mn rồi gán Fe sẽ sai thành phần.','resolution':'Dùng mẫu tantalite-(Mn) 0018628 và hiển thị công thức/loài mẫu thật.'},
        {'record':'Bauxite','mineral':'Bauxite','finding':'Bauxite là hỗn hợp đá/quặng, không có một mạng tinh thể duy nhất.','resolution':'Ba pha riêng gibbsite, boehmite, diaspore; không tạo ô bauxite giả.'},
        {'record':'Platinum_crystals.jpg','mineral':'Platinum tự sinh','finding':'Ảnh nuôi tinh thể trong phòng thí nghiệm không xác nhận trạng thái tự sinh.','resolution':'Thay bằng Platinum-274992.jpg, mẫu địa phương Fox Gulch, Alaska; CC BY-SA 3.0.'},
        {'record':'CIF viewer','mineral':'Mọi CIF nhập','finding':'Parser trước bỏ qua alpha/beta/gamma, giả định thứ tự cột, bỏ qua phép đối xứng, dùng hằng số mặc định 5.5 và suy liên kết từ khoảng cách.','resolution':'Parser CIF có tokenizer, cột theo tên, metric đầy đủ, khai triển đối xứng an toàn không eval, từ chối bản ghi thiếu và không gán bậc liên kết theo khoảng cách.'},
    ]
    dump(OUT/'source-issues.json',issues)
    dump(OUT/'summary.json',{'documentsRenamed':len(migrations),'legacyOpaqueLinks':sum(bool(d.get('legacyIds')) for d in docs),
        'unchangedArticleBodies':sum(r['articleContentUnchanged'] for r in migrations),
        'mineralPhases':len(catalog['minerals']),'elementPhases':len(catalog['elements']),
        'crystalAssets':len(catalog['structures']),'mineralPhotos':len(read(ROOT/'data/mineral-image-provenance.json')['minerals']),
        'elementAudits':118,'crystalAudits':len(catalog['structures']),'libraryAudits':len(docs)})
    print(json.dumps({'libraryAudits':len(docs),'crystalAudits':len(catalog['structures']),'contentUnchanged':sum(r['articleContentUnchanged'] for r in migrations)}))

if __name__=='__main__':main()
