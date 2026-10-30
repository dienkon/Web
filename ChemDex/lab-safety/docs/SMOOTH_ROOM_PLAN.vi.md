# Đợt nâng cấp: phòng chi tiết, thao tác mượt

Ngày bắt đầu: 28/10/2026. Tiếp nối bộ model và chuyển động riêng từng tình huống.

## Mục tiêu và phạm vi

Giảm công việc vẽ và cấp phát liên tục khi đi trong phòng; giữ nguyên hình dáng, nhãn, vị trí tiếp xúc sàn/kệ, bản lề và tương tác hiện tại. Khung thực hành tiếp tục cố định. Số FPS trong Chrome trên máy phát triển chỉ dùng để đối chiếu cùng điều kiện, không đại diện điện thoại thật.

## Kế hoạch thực hiện

1. **Đo trước khi sửa.** Ghi renderer, bộ nhớ geometry/texture và thời gian khung hình ở giữa phòng, trước tủ đóng/mở, giá thủy tinh và khi cầm bình chữa cháy. Cố định viewport, chất lượng, vị trí và hướng nhìn; lưu JSON, ảnh đối chiếu.
2. **Ghế và vật lặp.** Gom năm nan chân và năm đệm chân ghế theo hình học dùng chung. Thử chia sẻ model chai/cốc trên kệ; gom phần đục theo từng cụm, để phần trong suốt còn được sắp thứ tự riêng. Giữ tên, bounds và metadata của từng vật để kiểm tra vị trí và tương tác.
3. **Nhãn và vòng đời tài nguyên.** Dùng chung hình học/material/nhãn của các bản sao tĩnh trong một cụm. Khi cụm bị tháo, giải phóng buffer của bản sao và nguồn đúng chủ sở hữu; kiểm tra đổi cảnh rồi quay lại.
4. **Ống bình chữa cháy.** Tạo buffer một lần, cập nhật đỉnh và pháp tuyến tại chỗ khi hai đầu thay đổi. Hai đầu ống vẫn khớp van và đầu phun; kiểm tra hình học hữu hạn, đổi dụng cụ, ngắm, rút chốt và phun thật.
5. **Đo lại và rà hình.** Chạy cùng bộ đo, so ảnh trước/sau ở các góc tủ/kệ/ghế. Kiểm tra mở tủ, số chai/cốc, tiếp xúc kệ/sàn, ngăn kéo, khung thực hành, reduced motion và thao tác chữa cháy. Chạy TypeScript, build và các bộ kiểm tra lõi phù hợp.

## Điều kiện nghiệm thu

- Giảm draw calls ở khu tủ/ghế so với baseline cùng hướng nhìn; giảm số tài nguyên lặp, không bỏ chi tiết model.
- Không tạo TubeGeometry mới liên tục khi cầm bình; buffer ổn định qua nhiều lần cập nhật và được dọn khi đổi dụng cụ.
- Không thay vị trí kệ, chai, cốc, ghế hay collider; không làm sai độ mở cánh tủ và hướng đầu phun.
- Các phép thử liên quan đều qua, không có lỗi runtime; lưu kết quả thực đo cùng những giới hạn còn lại.

## Trạng thái

- Đã hoàn tất năm bước; xem [số đo, ảnh và kiểm chứng](room-upgrade/README.md).
- Giữa phòng: 975 → 895 lượt vẽ. Góc tủ: 478 → 352 lượt vẽ, cùng DPR 0,85.
- Chai/cốc dùng chung tài nguyên; phần kính vẫn được sắp thứ tự riêng. Vị trí và bounds của 87 model không đổi.
- Ống bình cập nhật buffer tại chỗ; đối chiếu hình học với TubeGeometry và thử 1.000 lần dùng lại buffer.
- Các bộ browser liên quan, TypeScript, build và kiểm tra lõi được chạy lại; chi tiết và giới hạn nằm trong báo cáo.
