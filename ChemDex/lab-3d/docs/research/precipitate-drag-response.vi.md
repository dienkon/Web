# Đáp ứng vận tốc của hạt kết tủa

Đối chiếu 24/10/2026. Trước đây hạt giảm vận tốc bằng lerp với hệ số 4/s theo phương ngang và 5/s theo phương đứng, độc lập kích thước vật lý và độ nhớt. Hạt nano vẫn có thể mang vận tốc ban đầu trong nhiều khung hình dù thời gian đáp ứng vật lý nhỏ hơn nhiều.

Nguồn: [COMSOL — Particle Motion in a Fluid](https://doc.comsol.com/6.4/doc/com.comsol.help.particle/particle_ug_fluid_flow.08.36.html), mục Stokes Drag Law và Schiller–Naumann. Trong giới hạn Reynolds nhỏ, τ = ρ_p d²/(18μ), với d = 2r. Khối lượng của một glyph đại diện cho nhiều hạt không được dùng làm khối lượng quán tính của một hạt vật lý.

Ứng dụng dùng τ_Stokes chia cho hệ số lực cản Schiller–Naumann tại vận tốc trượt cố định trong bước. Hệ số dùng chung với bộ tính vận tốc lắng cuối: 1 + 0,15 Re^0,687 dưới Re = 1000, và 0,44 Re/24 trên nhánh Reynolds lớn theo [OpenFOAM](https://cpp.openfoam.org/v12/SchillerNaumann_8C_source.html). Lấy độ lớn vận tốc trượt hiện tại so với dòng chất lỏng, ít nhất bằng vận tốc lắng cuối, để chọn hệ số. Ở Reynolds hữu hạn, hệ số thay đổi trong chuyển động nên nghiệm này là xấp xỉ, chưa phải tích phân đầy đủ lực cản phi tuyến.

Với vận tốc đích v* và τ cố định trong bước Δt:

- v_mới = v* + (v_cũ − v*) exp(−Δt/τ).
- Δx = v* Δt + (v_cũ − v*) τ(1 − exp(−Δt/τ)).

Dùng expm1 và chuỗi ngắn cho Δt/τ nhỏ để tránh mất chữ số khi trừ hai lượng gần nhau. Cùng hệ số đáp ứng áp dụng cho ba trục. Vị trí dùng tích phân vận tốc, không dùng v_mới × Δt, để giữ phần dịch chuyển hữu hạn do vận tốc vào ban đầu. Brownian vẫn là gia số vị trí độc lập từ bán kính vật lý; mô hình khuếch tán quá tắt này phù hợp khi bước thời gian lớn hơn τ, chưa mô hình hóa Brownian có quán tính ở bước cực ngắn.

Vận tốc đích vẫn gồm dòng đối lưu minh họa và vận tốc lắng đã có. Hệ số giảm lắng khi agitation, quy tắc kéo cặn lên, kích thước hạt ban đầu và cường độ dòng chưa hiệu chuẩn thực nghiệm; thay bộ lọc không chứng minh các thành phần đó đã chính xác. Đặc biệt, chưa có trường vận tốc của dòng rót sau khi chạm dung dịch. Hạt bông/gel dùng cầu tương đương, chưa có lực cản theo hình dạng, khối lượng gia tăng, lực Basset hoặc hiệu chỉnh gần thành.

Để thao tác khuấy vẫn chuyển cặn vào huyền phù sau khi bỏ xung vận tốc giả lâu, nguồn entrainment đưa khối lượng đã lấy từ lớp cặn vào lớp trộn hữu hạn: thêm độ cao min(H/4; 0,1 scene) × agitation vào điểm phát từ đáy đã có. Đây là quy tắc vận chuyển minh họa, chưa suy ra từ ứng suất cắt hoặc mô hình xói mòn. Không tạo thêm chất rắn và không dùng thời gian đáp ứng giả để giữ hạt lơ lửng. Kiểm thử hồi quy AgBr xác nhận dung dịch trong sau lắng, đục khi khuấy và hết kết tủa khi hòa tan.

Kiểm thử đối chiếu τ giới hạn Stokes, tỷ lệ r²/μ và ρ_p, đáp ứng trong bước ngắn/dài, tích phân dịch chuyển và tính nhất quán khi chia nhỏ bước với lực cản hằng. Kiểm thử tích hợp kiểm tra vận tốc vào không còn tồn tại giả lâu ở CuS dưới micromet, bảo toàn khối lượng, vị trí tiếp xúc, Brownian và lifecycle. Không dùng các kiểm thử này để chứng minh trường dòng rót hoặc mọi kích thước hạt đã khớp thực nghiệm. Chưa xác minh GPU.

Cập nhật vòng shared carrier: [shared-liquid-motion.vi.md](./shared-liquid-motion.vi.md) thay hệ số0.4 của carrier bằng vận tốc đầy đủ, bỏ giảm settling theo agitation và thêm prescribed swirl chung cho bọt/kết tủa. Spatial carrier được lấy tại midpoint dự đoán; constant-target response vẫn là frozen-drag approximation. New glyph chỉ tích phân sau birth threshold, không replay whole credits cũ khi reservoir cạn. Entrainment/lift layer vẫn giữ closure cũ; chưa có shear/erosion hoặc calibrated vertical pumping.
