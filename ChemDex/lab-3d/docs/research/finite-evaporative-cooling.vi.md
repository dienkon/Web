# Bay hơi hữu hạn: nhiệt dung giảm và năng lượng hơi mang đi

## Sai lệch thực tế đã đo trong code cũ

Sau vòng L(T), `applyThermalEnergy` vẫn freeze nhiệt dung và L tại đầu mỗi ambient evaporation packet. Với cùng 100 g nước ở 80°C, cùng bay hơi 5 g, nguồn sensible heat bằng zero:

| Chia packet | T cuối cũ (°C) | Latent work cũ (J) |
| --- | ---: | ---: |
| 1 | 54.4451823723 | 11540.5556407 |
| 10 | 53.5635742067 | 11686.3875429 |
| 100 | 53.4725685215 | 11701.6003389 |

Chênh gần 1°C xuất hiện chỉ do chia nhỏ cùng lượng nước mất, không phải thay môi trường. `sensibleEnergy_J + latentEnergy_J = heat` chưa đủ làm bằng chứng năng lượng của hệ mở: khối lượng hơi rời bình cũng mang sensible enthalpy của lượng nước đó.

## Mô hình và nguồn

[MIT, Control volume form of the conservation laws](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node19.html) là nguồn nguyên lý cân bằng năng lượng có enthalpy đi cùng dòng khối lượng. L(T) tiếp tục theo [IAPWS SR1-86(1992)](https://iapws.org/technical-guidance/release/Supp-sat). Các phương trình giảm dưới đây là phép suy cho **bulk Cp hằng** hiện hữu của ứng dụng; không phải full IAPWS EOS hay công thức được trích nguyên văn từ MIT.

Gọi e là tổng gram nước đã bay hơi trong packet; C0 là nhiệt dung ban đầu J/K; c=4.184 J/g/K. Phần nhiệt dung của glass/solute/ice chưa rời bình giữ nguyên, chỉ liquid water giảm:

`C(e) = C0 − c*e`, `dT/de = −L(T)/C(e)`.

Tách biến:

`integral(T_final,T_initial, dT/L(T)) = −log1p(−c*e/C0)/c`.

Với nhiệt độ thấp nhất 0°C của liquid-water closure:

`e_floor = C0/c * [−expm1(−c*integral(0,T_initial,dT/L(T)))]`.

Không được dùng phần năng lượng dưới 0°C để bay hơi thêm; freezing/sublimation là nhánh khác. Đây là chặn miền của solver, không phải khẳng định một giọt thực luôn dừng bay hơi khi vừa tới 0°C.

## Hợp đồng hàm

`evaporativeCooling(T_c, capacity_J_K, water_g, requested_g)` là hàm pure, không tìm hay tạo vessel, không tính source rate và không đổi composition trực tiếp. Trả T cuối, lượng thực đã bay hơi, nhiệt dung còn lại, latent work, sensible enthalpy do hơi mang ra và lý do giới hạn (`none`, `inventory`, `liquid-floor`, `unsupported`). Validate số hữu hạn, lượng không âm và nhiệt dung có thể chứa lượng nước khai báo. Không commit một kết quả tích phân dở dang khi solver thất bại.

- Tích phân adaptive Gauss 8/4, maximum depth 12; bracket temperature drop và Newton có chặn, tối đa 48 lần. `log1p`/`expm1` giữ độ chính xác khi packet rất nhỏ.
- Giới hạn theo nguồn nước và nhiệt lượng dẫn đến 0°C; khi đạt floor, suy lượng nước thực từ integral, không lấy requested mass rồi clamp nhiệt độ để che thiếu năng lượng.
- Chia riêng endpoint 0–0.01°C, nơi liquid-water L(T) hiện hữu dùng constant triple-point value. Nếu không tách kink đã biết này, adaptive quadrature có thể thất bại và để mẫu mắc ở trên 0°C.
- Latent work là `integral(T_final,T_initial,C(T)dT)`, với `C(T)=C0*exp(−c*integral(T,T_initial,dtheta/L(theta)))`.
- Stored sensible loss (mốc 0°C, cùng Cp bulk) bằng `C0*(T_initial−T_final)+c*e*T_final`. Trừ latent work cho sensible enthalpy `c*integral T(e)de` do hơi mang ra; không gán toàn bộ phần năng lượng mất khỏi mẫu là latent.

`applyThermalEnergy` vẫn áp gói sensible heat trước rồi mới giải ambient evaporation, nhưng ambient phase không còn freeze C/L trong packet. Source inventory, moles, solute concentration, volume và cumulative evaporation được cập nhật một lần từ mass thật trả về. Boiling giữ plateau hiện hữu, đồng thời ghi sensible enthalpy của nước rời tại boiling temperature. Fusion vẫn đi qua water/ice ledger.

`ThermalStep` bổ sung hai đại lượng J cho đối soát:

- `storedSensibleEnergyChange_J`: C_final*T_final − C_initial*T_initial, bao gồm thay đổi nhiệt dung do nước rời hoặc ice/liquid partition.
- `vaporSensibleEnergy_J`: sensible enthalpy nước mang ra với mốc 0°C và Cp bulk hằng; không phải tổng enthalpy hơi IAPWS hay kinetic energy của plume.

Hợp đồng cân bằng trong reduced model:

`netHeat = storedSensibleEnergyChange + latentEnergy + vaporSensibleEnergy + outsideModelEnergyIncrement`.

`latentEnergy_J` gồm fusion và vaporization work như trước. `sensibleEnergy_J` giữ hợp đồng cũ `netHeat−latent−outside`; sau thay đổi nó bằng **stored sensible change + outgoing sensible enthalpy**, không được hiểu riêng là thay đổi năng lượng còn nằm trong bình.

## Kiểm chứng

`evaporative_cooling.test.ts` dùng một integrator RK4 riêng theo mass, không dùng quadrature/root production, đối chiếu T và cả latent/carried energy. Cùng fixture trên cho khoảng **53.4624240046°C**, 11703.2979813 J latent work và 1399.5052484 J carried sensible, ổn định khi chia 1/10/100 packet.

Các ca khác: floor 0°C và mass giới hạn không phụ thuộc chia packet; analytic constant-L endpoint; mẫu nước rất nhỏ có holder heat; solute mass/Cp giữ nguyên; external heat rồi evaporation; fusion + evaporation; boiling/dryout advection; sealed samples và malformed inputs. Test gốc bỏ phép kiểm tra sai `C_initial*deltaT = latent` khi C đang giảm, thay bằng energy balance của hệ mở, không nới tolerance để giữ kết quả cũ.

Kết quả: **143 file, 1629/1629 test đạt** với `npm test -- --maxWorkers=1`, gồm 10 ca mới. Sau khi nối Cp helper vào shared bulk constant, bộ 10 ca được xác nhận lại. `npm run lint` và `npm run build` đạt; Vite còn cảnh báo chunk >500 kB, Node runner có cảnh báo localStorage experimental. Chưa có WebGL QA.

## Miền chưa giải

Packet splitting invariance ở đây là **cùng tổng khối lượng bay hơi được yêu cầu, không thêm nhiệt giữa các packet**. Toàn flux theo thời gian còn phụ thuộc các phép split convection/heat/source và mass-transfer closure; không suy từ test này rằng mọi FPS có cùng kết quả toàn hệ ở mọi trạng thái.

Cp bulk vẫn hằng, h_liquid≈Cp*T cho bookkeeping; nó không bằng toàn bộ saturated/compressed-liquid enthalpy IAPWS ở mọi T/P. Surface area, water activity/đa dung môi và mass-transfer hm chưa được hiệu chuẩn. Thành bình/film return, finite coolant, retained gas/vent flow, frost và WebGL vẫn mở. Toàn mục tiêu realism chưa đạt.
