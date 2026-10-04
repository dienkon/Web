# QUYẾT ĐỊNH KỸ THUẬT — VIRTUAL CHEMLAB

1. **Kiến trúc mô phỏng thời gian**:
   - Mọi tiến trình vật lý chất lỏng, phân rã hạt và phản ứng hóa học phải dựa trên `dt` và `timeScale` mô phỏng, dừng hoàn toàn khi `isSimulationPaused = true`.
   - Không sử dụng `Date.now()` để làm mốc nội suy thời gian cứng.

2. **Bảo toàn vật lý (Mass & Heat Conservation)**:
   - Thể tích chất lỏng được bảo toàn tuyệt đối: $\Delta V_{from} = \Delta V_{to} + \Delta V_{spill}$.
   - Trộn màu tuân theo định luật Beer–Lambert (hấp thụ ánh sáng quang phổ $A = -\ln(C)$), ngăn hiện tượng màu bị bợt hoặc đục xám khi pha loãng với nước trong.
   - Nhiệt lượng bảo toàn theo công thức truyền nhiệt: $T_{mix} = \frac{m_1 c_1 T_1 + m_2 c_2 T_2}{m_1 c_1 + m_2 c_2}$.

3. **Cơ chế đập tràn (Weir Flow) & Điểm trào tự nhiên**:
   - Thể tích giữ lại theo góc nghiêng $\theta$ được tính số học qua diện tích hình viên phân lát cắt $A(y)$.
   - Dòng chảy chỉ xuất hiện khi thể tích hiện tại vượt quá thể tích giữ lại: $V_{excess} = \max(0, V - V_{retained}(\theta))$.
   - Lưu lượng tuân theo phương trình đập tràn Francis: $Q = C_d \frac{2}{3} \sqrt{2g} b h^{3/2}$.

4. **Trải nghiệm học tập tại nhà (Teacher & Student Friendly)**:
   - Hỗ trợ đa thiết bị: Chuột (desktop PC), Touch/Bút (iPad, Tablet, Smartphone), Bàn phím (Laptop).
   - Thao tác kéo thả lẫn "chạm nguồn $\rightarrow$ chạm đích" giúp học sinh thao tác trên màn hình cảm ứng dễ dàng không bị trượt tay.
