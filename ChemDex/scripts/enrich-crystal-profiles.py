"""Apply the reviewed crystal/photo catalog after the DOCX profile compiler.

Idempotent overlay: original source audit stays historical; every one of the
118 current profiles receives a separate, substance-named follow-up audit.
"""
import hashlib
import json
from pathlib import Path
import re
import time

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'docs/library-crystal-upgrade/2026-11-11'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,value):
    p.parent.mkdir(parents=True,exist_ok=True)
    content=(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
    temporary=p.with_name(p.name+'.tmp')
    for attempt in range(5):
        try:
            temporary.write_bytes(content)
            temporary.replace(p)
            break
        except OSError:
            if attempt==4:raise
            time.sleep(.2*(attempt+1))
def slug(s):
    import unicodedata
    s=unicodedata.normalize('NFKD',s.replace('đ','d').replace('Đ','D'))
    return re.sub('[^a-z0-9]+','-',s.encode('ascii','ignore').decode().lower()).strip('-')

def main():
    catalog=read(ROOT/'data/crystal-catalog.json')
    photos=read(ROOT/'data/mineral-image-provenance.json') if (ROOT/'data/mineral-image-provenance.json').exists() else {'minerals':[]}
    photos={r['id']:r for r in photos['minerals']}
    changes=[]
    for meta in read(ROOT/'data/manifest.json'):
        file=ROOT/'data'/meta['file'];profile=read(file)
        before=hashlib.sha256(file.read_bytes()).hexdigest()
        symbol=profile['symbol'];mineral=profile['occurrence']['mineral']
        crystal=catalog['elements'].get(symbol)
        if crystal:profile['structure']['publishedCrystal']=crystal
        else:profile['structure'].pop('publishedCrystal',None)
        profile['structure']['publishedCrystalStatus']='available' if crystal else 'Chưa có bản ghi tọa độ phù hợp đã duyệt; không thay bằng pha áp suất/nhiệt độ khác.'
        morphology=[b for b in profile.get('mediaBlocks',[]) if b.get('type')!='crystal']
        profile['mediaBlocks']=[]
        profile['images']=[im for im in profile.get('images',[]) if im.get('role')!='natural-mineral']
        phases=[];photo=None
        if mineral['available']:
            key=mineral['id']
            phases=[catalog['minerals'][phase] for phase in (catalog['bauxitePhases'] if key=='bauxite' else [key])]
            mineral['publishedCrystals']=phases
            photo=photos.get(key)
            if key=='bauxite':mineral['crystallographyNote']=catalog['mixtureNote']
            if key=='tantalite':
                mineral['name']='Tantalite (nhóm khoáng vật)'
                mineral['formula']='(Fe,Mn)(Ta,Nb)₂O₆; mô hình nguyên tử dùng mẫu tantalite-(Mn)'
                for block in morphology:
                    if block.get('type')=='model':
                        block['title']='Hình thái minh họa · Tantalite (nhóm khoáng vật)'
                        block['desc']=mineral['formula']+'. '+mineral['relation']+' '+mineral['disclaimer']
            for phase in phases:
                profile['mediaBlocks'].append({'type':'crystal','section':'structure',
                    'title':f'Mạng tinh thể · {phase["mineralName"]}', 'src':phase['data'],'crystal':phase,
                    'desc':'Cấu trúc tuần hoàn theo tọa độ công bố; không phải ảnh quét bề mặt mẫu quặng.'})
            if photo:
                mineral['photoSource']=photo['source']
                if photo['status']=='downloaded':
                    picture={'src':photo['file'],'role':'natural-mineral','title':mineral['name'],
                        'desc':f'Ảnh mẫu tham chiếu {mineral["name"]}; ảnh và CIF có thể thuộc các mẫu khác nhau. '+mineral['relation'],
                        'source':photo['source'],'author':photo['author'],'license':photo['license'],'licenseUrl':photo.get('licenseUrl','')}
                    profile['images'].append(picture)
                    # Preserve the element specimen image, adding the actual mineral as natural occurrence.
                    profile['naturalState'].update({'image':photo['file'],'alt':mineral['name']+' — ảnh mẫu khoáng vật tham chiếu',
                        'caption':picture['desc'],'source':photo['source'],'author':photo['author'],
                        'license':photo['license'],'licenseUrl':photo.get('licenseUrl','')})
        profile['mediaBlocks']+=morphology
        profile['sources']=[s for s in profile['sources'] if s.get('role')!='crystallography']
        if crystal or phases:
            profile['sources'] += [{'title':'AMCSD — cấu trúc tinh thể đã công bố (qua Larixite)',
                'url':'https://xraypy.github.io/larixite/','role':'crystallography'}]
        audit_slug=slug(profile['nameVi']+'-'+symbol)
        audit_file=f'docs/library-crystal-upgrade/2026-11-11/nguyen-to/{audit_slug}/audit.md'
        profile['review']['crystalPhotoAudit']=audit_file
        write(file,profile)
        entry={'symbol':symbol,'file':str(file.relative_to(ROOT)).replace('\\','/'),'audit':audit_file,
            'elementCrystal':crystal['amcsdId'] if crystal else None,
            'mineralPhases':[p['amcsdId'] for p in phases],
            'photo':photo,'beforeSha256':before,'afterSha256':hashlib.sha256(file.read_bytes()).hexdigest()}
        changes.append(entry)
        lines=[f'# {profile["nameVi"]} ({symbol}) — kiểm duyệt mạng tinh thể và ảnh', '',
            f'- File: `data/{meta["file"]}`.',
            '- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.',
            '- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.',
            '- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.', '', '## Đơn chất', '']
        if crystal:lines += [f'- AMCSD {crystal["amcsdId"]}; {crystal["mineralName"]}; nhóm không gian {crystal["spaceGroup"]}.',
            f'- Ô mạng: {crystal["cell"]}; V = {crystal["volume"]:.6f} Å³.',f'- {crystal["note"] or "Giữ nguyên dạng cấu trúc của mẫu trong nguồn."}',
            f'- Điều kiện và ghi chú bản gốc: {crystal["reference"]["title"].replace(chr(10)," ")}.']
        else:lines += ['- Không có bản ghi tọa độ phù hợp đã duyệt. Không lấy tọa độ khoáng vật thay cho mạng của đơn chất, không gán tinh thể cho chất khí/lỏng hoặc nguyên tố chưa đo được.']
        lines += ['', '## Khoáng vật / quặng', '']
        if phases:
            if mineral.get('crystallographyNote'):lines.append('- '+mineral['crystallographyNote'])
            lines.append('- Quan hệ với nguyên tố: '+mineral['relation'])
            for phase in phases:
                lines += [f'- {phase["mineralName"]}: AMCSD {phase["amcsdId"]}, công thức mẫu `{phase["formula"]}`, {phase["siteCount"]} vị trí/ô, {phase["mixedSiteCount"]} vị trí hỗn hợp.',
                    f'  - Lưu ý: {phase["note"] or "Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng."}',
                    f'  - Giới hạn: {phase["limitations"] or "Không thêm vị trí nguyên tử ngoài bản ghi đã công bố."}',
                    f'  - Bài gốc: {phase["reference"]["authors"]}, {phase["reference"]["year"]}, {phase["reference"]["title"].replace(chr(10)," ")}.']
        else:lines.append('- '+mineral['reason'])
        lines += ['', '## Ảnh trạng thái tự nhiên', '']
        if photo:lines += [f'- Trạng thái: {photo["status"]}; [trang nguồn]({photo["source"]}).',
            f'- Tác giả: {photo.get("author","không lưu cục bộ")}; giấy phép: {photo.get("license","chỉ liên kết")}.',
            '- Mô tả nguồn: '+photo.get('description',photo.get('reason','')),
            '- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.']
        else:lines.append('- Giữ ảnh đơn chất có nguồn hoặc sơ đồ có nhãn; không tạo ảnh giả mẫu tự nhiên cho nguyên tố không có quặng.')
        lines += ['', '## Kiểm tra và giới hạn', '', '- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.',
            '- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.',
            '- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.', '']
        target=ROOT/audit_file;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(('\n'.join(lines)).encode())
    # Per-file hashes are against the first pre-overlay input, retained on idempotent reruns.
    manifest_path=REPORT/'profile-change-manifest.json'
    if manifest_path.exists():
        previous={e['symbol']:e for e in read(manifest_path)}
        for entry in changes:entry['beforeSha256']=previous.get(entry['symbol'],entry)['beforeSha256']
    write(manifest_path,changes)
    print(json.dumps({'profiles':len(changes),'elementCrystals':sum(bool(e['elementCrystal']) for e in changes),'mineralBindings':sum(bool(e['mineralPhases']) for e in changes),'mineralPhotos':sum(bool(e['photo'] and e['photo']['status']=='downloaded') for e in changes)}))

if __name__=='__main__':main()
