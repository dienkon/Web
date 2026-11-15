# Chi phí tiếp xúc rắn–lỏng — 15/11/2026

Lượt tổng sau khi tích hợp đạt 3.453/3.454 test. Ca Cu/H₂SO₄ đặc hoàn thành các bước hóa học nhưng vượt giới hạn 15 s của test. Khi chạy riêng, baseline chỉ mất 4,71 s; tải máy và cách chạy ảnh hưởng thời gian thực. Vì vậy không dùng chênh lệch giữa hai lượt đó để tuyên bố mức tăng tốc.

CPU profiler của route chỉ ra `clippedSolidVolume` là phần chiếm nhiều thời gian: khoảng 2,96 s self-time ở baseline. Hàm này phục vụ thể tích chất rắn ngập nước, mực chất lỏng và kiểm tra tiếp xúc; nó không thuộc solver va chạm Rapier.

## Thay đổi

- `stockGrainContacts` trả về ngay khi không có pose dương khớp công thức. API này chỉ trả ID carrier thật; dựng bố trí tĩnh không thể thêm ID. Truy vấn phần tiếp xúc tổng vẫn tính hình học tĩnh như trước.
- `clippedSolidVolume` phân loại tam giác theo đúng các nửa không gian và dấu biên hiện hành. Tam giác nằm hoàn toàn ngoài một mặt bị loại; tam giác nằm hoàn toàn trong mọi mặt cộng trực tiếp thể tích có dấu. Tam giác cắt qua biên giữ nguyên thuật toán cắt polygon. Không giảm số đỉnh, thay epsilon hay đổi phương trình phản ứng.

## Đối chiếu cùng dữ liệu

Script `scripts/benchmarkContactRoute.mjs` lấy source baseline từ commit cố định `16a97049`, chạy hai phiên bản trong cùng tiến trình, cùng dependency và dữ liệu. Thứ tự baseline/current đảo qua tám lượt sau warm-up. Các fixture là 195 truy vấn được lấy mẫu từ 100.176 lần gọi của route, và 40 snapshot tĩnh thật của route.

| Phép đo | Khối lượng công việc mỗi lượt | Median baseline | Median mới | Tỷ lệ |
| --- | --- | --- | --- | --- |
| Cắt thể tích | 195 truy vấn × 50 | 331,38 ms | 166,83 ms | 1,99× |
| Phân vùng tiếp xúc tĩnh | 40 snapshot × 30 | 245,27 ms | 150,52 ms | 1,63× |

Sai khác thể tích lớn nhất trong mẫu bằng zero; output phân vùng giống hệt. CPU median tương ứng 343,5 → 172 ms và 258 → 164 ms. Hai phép đo tách riêng: baseline phân vùng cũng dùng các dependency hiện hành, nên không nhân hai tỷ lệ để suy tốc độ toàn route.

Tái chạy từ `lab-3d`:

```powershell
node --import tsx scripts/benchmarkContactRoute.mjs
```

Artifact nằm trong `artifacts/contact-route-profile`: mẫu truy vấn, snapshot, số liệu A/B và ghi chú profiler. Sáu tệp test hình học/tiếp xúc đạt 44/44, gồm thể tích giải tích, khối quay, phoi Cu không lồi, giới hạn miệng bình, hai lớp chất lỏng, băng và tiêu hao theo hạt. Ca Cu/H₂SO₄ riêng đạt trong 2,855 s với timeout 15 s giữ nguyên. Kết quả tổng cuối nằm trong [kế hoạch nâng cấp](realism-upgrade-plan-2026-11-14.vi.md); các số trên không phải FPS của ứng dụng.
