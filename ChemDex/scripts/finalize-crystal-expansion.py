"""Review exclusions against the pinned source before the normal crystal export."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
target = ROOT / 'data/substance-crystal-expansion.selections.json'
selected = json.loads(target.read_text(encoding='utf-8'))
selected['nahcolite'] = [17923, 'NaHCO3', 'Nahcolite · NaHCO₃', 'Bản cấu trúc đầy đủ H, C, O, Na; loại bản ghi 9267 thiếu tọa độ hydrogen.']
selected['barium-oxide'] = [18197, 'BaO', 'BaO · pha rocksalt', 'Bản nghiên cứu cấu trúc oxide kim loại kiềm thổ; không dùng bản ghi 11278 là BaS.']
selected['solid-nitrogen-alpha'] = [11249, 'N', 'α-Nitrogen rắn · 4,2 K', 'Cấu trúc trung bình Pa-3 với tám vị trí N trong ô mạng; không dùng mô hình P213 cũ hoặc tâm phân tử thay nguyên tử.']
rejected = [
    {'slug': 'theophrastite', 'amcsdId': 9939, 'reason': 'Ni(OH)2 nhưng không có tọa độ hydrogen; các bản ghi thay thế đã kiểm tra cũng thiếu H.'},
    {'slug': 'strontium-hydroxide', 'amcsdId': 10677, 'reason': 'Sr(OH)2 nhưng bản ghi không có tọa độ hydrogen.'},
    {'slug': 'ice-ih', 'amcsdId': 18366, 'reason': 'Tọa độ vị trí đặc biệt H2 bị làm tròn không nhất quán với đối xứng; khai triển tạo H14O4 thay vì H8O4. Không tự sửa tọa độ.'},
    {'slug': 'chromium-chloride', 'amcsdId': 17459, 'reason': 'Khai triển nguyên trạng tạo Cr9Cl18, không phải CrCl3. Không tự sửa tọa độ hay nhóm không gian.'},
]
for item in rejected:
    selected.pop(item['slug'], None)
# Ordered Ice II has complete proton positions. It is a separate, explicitly
# labelled pressure phase, never an automatic replacement for ambient Ice Ih.
selected['ice-ii'] = [18367, 'H2O', 'Băng II · −75 °C · 0,3 GPa', 'Pha áp suất cao có proton có trật tự; 12 O và 24 H trong ô mạng. Không mô tả nước lỏng hay băng Ih ở áp suất thường.']
target.write_text(json.dumps(selected, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
report = ROOT / 'docs/learning-expansion/2026-11-12/crystal-exclusions.json'
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps({'rejected': rejected, 'identityWarnings': [
    'Không suy đồng nhất phân tử từ công thức thực nghiệm: C5H8 của adamantane không phải isoprene.',
    'Không dùng bản ghi mercury cyanide chỉ ghi Hg làm tinh thể thủy ngân.',
    'Không dùng sodium periodate thiếu O làm sodium iodide.',
    'Không dùng ammonium azide/ammonia chỉ ghi N làm nitrogen rắn.',
    'Không gán pha rắn lạnh/áp suất cao thành pha ổn định ở nhiệt độ phòng.'
]}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'selected': len(selected), 'excluded': len(rejected)}))
