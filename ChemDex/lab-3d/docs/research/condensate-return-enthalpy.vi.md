# Nước ngưng tụ hồi lưu mang nhiệt độ riêng

## Sai lệch đã xác nhận

`returnWallWater` cũ cộng mass/moles/volume rồi giữ nguyên nhiệt độ bulk. Với 50 g nước + glass heat capacity 33.2 J/K ở 100°C, thêm 1 g nước hồi lưu ở 25°C theo cách đó tự tạo **313.8 J** so với incoming enthalpy `m*Cp*T_in`. Mô hình cũng chưa đưa lượng nước flash khi hồi lưu về lại finite vapor budget; sức chứa chỉ xét trước khi nhận nước, chưa xét melting/freezing sau khi trộn.

[MIT, Control volume form of the conservation laws](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node19.html) là nguồn nguyên lý năng lượng đi cùng dòng khối lượng. Phép tính dưới đây là reduced bulk model của ứng dụng: Cp nước/ice/glass như hiện hữu, h_liquid≈Cp*T với mốc 0°C; không phải full compressed-liquid EOS hay số đo thực nghiệm của thành bình.

## Hàm và hợp đồng

`returnWallWater(vessel, mass_g, temperature_c?) -> VesselState` nhận một **receipt nước lỏng đã được caller trừ khỏi wall ledger**. Caller truyền nhiệt độ nước; nếu bỏ qua chỉ được lấy `wallCondensation.innerWall_c`. Thiếu cả hai không được đoán bằng nhiệt độ bulk. Dữ liệu không hợp lệ giữ nguyên object/inventory.

1. Clone composition, thêm đúng water mass/moles và volume ở giả định 1 g/mL, cập nhật aqueous concentrations. Canonical water identity được dùng để không tách nhầm alias thành dung môi khác.
2. Tham chiếu tạm mass mới ở T_bulk, sau đó gọi shared thermal solver với `Q_correction = m*Cp*(T_in−T_bulk)`. Phép hiệu chỉnh này đưa vào đúng incoming enthalpy `m*Cp*T_in`, không cấp thêm latent heat: nước đã ngưng tụ ở wall từ trước.
3. Thermal solver có thể hòa nhiệt, làm tan/đông nước hoặc flash trên glass rất nóng và khi dilution hạ boiling point. Inventory/latent/sensible sinks tiếp tục đi qua một đường nhiệt chung. Kiểm tra nhiệt dung sau thêm mass phải bằng C_old+m*Cp; không để một opaque liquid thiếu composition bị đổi Cp/volume khi chỉ có receipt mới được materialize.
4. Giữ cờ boiling chỉ khi mẫu còn ở boiling threshold sau trộn; cold return có thể làm mẫu subcool. Helper không tự giải gas pressure; route chung cập nhật pressure sau mọi thay đổi.

`wallReturnCapacityG(vessel, T_in, available_g) -> number` preview pure cùng phép hòa nhiệt/chuyển pha. Nếu toàn bộ available mass thỏa liquid surface capacity thì nhận; nếu không, bisection 44 lần giữ một receipt có thể nhận. Phần chưa nhận **ở lại bead pool**. Preview không commit heat, mass hay history lần hai.

Sức chứa ở đây dùng `occupiedLiquidVolume`, tức liquid/contact surface + submerged displacement theo hình học hiện hữu. Không thay hàm này bằng toàn bộ thể tích đá nước kể cả phần chưa ngập: đá có phần nhô khỏi nước và vật rắn có thể nằm cao hơn mặt liquid. Một receiver chỉ có ice ban đầu có liquid volume zero, nhưng thêm nước ấm có thể làm tan ice và tăng liquid level tới brim; không được coi nó có thể nhận toàn bộ nominal capacity như một bình rỗng. Accretion/rim deformation của ice chưa được giải.

`stepWallCondensation` tính exterior transport/latent packet trước, preview chính packet nhiệt mà real route sẽ áp, rồi xác định giới hạn inner drain trên trạng thái nhận đó. Điều này tránh rút nước khỏi wall trước khi biết bulk sau cooling/melting có nhận được không. Subzero/ngoài liquid-water interface giữ nước trong wall ledger, chưa tự suy frost hay source phase mới.

`WallCondensationState.returnedSensibleEnergy_J` là cumulative `m_return*Cp*T_innerWall`, mốc 0°C; bắt đầu được ghi từ phiên bản có field này, không backfill lịch sử thiếu dữ liệu. Đây là **enthalpy đi cùng mass**, không phải Q nhiệt truyền qua wall, và không được cộng latent condensation thêm một lần vào sample. `heatTransferredToSample_J` vẫn ghi exterior latent term riêng như trước.

`routeWaterVaporToWall` truyền T_innerWall đã chụp cho receipt. Đếm delta cumulative evaporation qua return step để đưa nước vừa flash vào cùng shared vapor budget; condenser và final external sink chỉ được dùng lượng đó một lần. Returned-water counter vẫn ghi gross receipt; nếu nước flash lại, gross evaporation cũng tăng tương ứng, nên kinetics replay có thể trừ source/sink đúng thay vì tạo lại nước.

## Kiểm chứng

`wall_return_energy.test.ts` kiểm tra phantom heat 313.8 J, cold/hot thermal mixing và input immutability; solute dilution; cold return tắt stale boiling; incoming heat tiêu vào melting; post-mixing ice/liquid displacement admission; hot dry flash và shared vapor sink không lặp; giữ unadmitted beads và unsupported-temperature receipts; live-store source/wall/outflow conservation qua nhiều frame; dữ liệu thiếu/invalid không đổi inventory.

Energy assertion dùng stored sensible + ice fusion reference và outgoing vapor enthalpy theo cùng bulk model. Các test không giả định phần đá nước chưa ngập cũng chiếm chỗ của chất lỏng, không chỉ đọc lại field energy do implementation tự gán.

Kết quả: **144 file, 1638/1638 test đạt** với `npm test -- --maxWorkers=1`, gồm 9 ca mới. `npm run lint` và `npm run build` đạt; Vite còn cảnh báo chunk >500 kB, Node test runner có cảnh báo localStorage experimental. Chưa có WebGL QA.

## Phần còn mở

Nhiệt độ wall vẫn là resistance/algebraic closure, không có thermal inertia; chưa giải năng lượng cần đổi nhiệt độ film đang giữ, cooling của incoming vapor trước khi ngưng tụ, đối lưu dọc film hoặc heat transfer rate khi giọt hòa vào bulk. Giọt return được coi hòa nhiệt tức thời trong packet, không phải resolved interfacial transient. Cp/volume vẫn approximate, freezing bình kín/đa chất còn hạn chế. Finite coolant, water activity/đa dung môi, retained gas/vent flow, frost, rim runoff và WebGL vẫn mở. Toàn mục tiêu realism chưa đạt.
