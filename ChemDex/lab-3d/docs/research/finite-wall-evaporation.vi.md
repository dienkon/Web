# Giọt đọng tự nguội khi bay hơi: nhiệt dung và enthalpy hữu hạn

Chiều condensation trên nước đọng hiện đã giữ incoming vapor enthalpy và tách bare glass; xem [finite-wet-condensation.vi.md](./finite-wet-condensation.vi.md). Các ghi chú bên dưới về condensation route cũ là trạng thái trước mở rộng đó; finite glass inertia vẫn chưa được giải.

## Vấn đề đã sửa

Đường pressure-driven trước đã tôn trọng độ ẩm và diện tích giọt, nhưng giữ giọt ở nhiệt độ cố định trong drying segment. Inner latent work được ghi như nhiệt lấy từ phòng không giới hạn; outer latent work còn trừ vào bulk một lần nữa, dù film có nhiệt dung riêng. Điều đó cho phép giọt khô mà không giảm nhiệt độ và làm sai nguồn năng lượng khi các node đã được ghép conduction hữu hạn.

Drying segment mới lấy outgoing enthalpy từ sensible storage của chính film. Giọt nguội đi, saturation pressure giảm và flux được đánh giá lại. Shared vapor packet và nước hồi lưu dùng nhiệt độ/enthalpy lúc phát ra, không dùng nhiệt độ cuối bước cho toàn lượng nước đã chuyển.

## Cơ sở và phạm vi

[MIT D-Lab — Heat and mass transport model of clay-pot evaporative coolers](https://d-lab.mit.edu/sites/default/files/inline-files/A%20heat%20and%20mass%20transport%20model%20of%20clay%20pot%20evaporative%20coolers%20for%20vegetable%20storage_International%20Journal%20of%20Heat%20and%20Mass%20Transfer%20.pdf) trình bày cooling do mất latent heat và cân bằng heat/mass. [ASHRAE — Evaporative air-cooling equipment](https://handbook.ashrae.org/Handbooks/S24/SI/S24_Ch41/S24_Ch41_si.aspx) mô tả tương tác heat/mass và adiabatic evaporative processes. Những nguồn này hỗ trợ nguyên lý; không cung cấp wetting, coefficient truyền khối hoặc thermal resistance được đo cho apparatus của app.

Đây là finite-film **adiabatic segment giữa các conductive steps**. Không đồng nhất dewpoint của gas với wet-bulb: nếu chỉ film mất nhiệt mà không được cấp sensible heat trong segment, nó có thể tiến tới dewpoint của gas boundary. Trong runtime, bước `stepWetWallThermal` còn trao đổi nhiệt với mẫu/không khí; nghiệm dài hạn phụ thuộc cả hai quá trình và temporal refinement. Chưa có một nghiệm đồng thời đầy đủ của glass/airflow/film/condensation.

## Phương trình

Mỗi side có một film temperature dùng chung cho các bead, kể cả phần film không exposed nhưng còn chung node nhiệt. Chỉ bead exposed được bay hơi. Với góc tiếp xúc/mật độ cố định và common cube-root exposure x:

```text
m_i(x) = max[0, cbrt(m_i,0) − x]^3
dx/dt = A(1g) j(T) / 3
dM_evap/dt = 3 sum[max(0, cbrt(m_i,0)−x)^2] dx/dt
Cp M_total dT/dt = −L(T) dM_evap/dt
dI/dt = T dM_evap/dt
```

j(T) là pressure-driven flux g/(m²s) từ closure trước, dùng saturation pressure tại T đang thay đổi. Cp vẫn4.184J/(gK); L(T) từ IAPWS saturation đã có. Fixed contact angle70°, density1000kg/m³ và hm vẫn nominal, không phải số đo.

`evaporateWallFilm()` tích phân [x,temperatureDrop,I] bằng adaptive RK4 step doubling. Theo dõi drop riêng tránh mất latent enthalpy khi một cap rất nhỏ chỉ làm node lớn nguội dưới một ulp của nhiệt độ tuyệt đối. Không commit state thử. Relative accuracy theo cap scale và emission moment, absolute temperature control; domain/numerical failure trả nguyên inventory với valid=false. Giới hạn liquid-water0°C giữ nước còn lại và báo liquid-floor; không tự mô phỏng frost/sublimation. Saturated gas có zero sink. Trong domain được hỗ trợ, không vượt inventory hoặc tiếp tục làm khô bằng nguồn nhiệt không tồn tại.

Outgoing energy được lấy bằng stable stored-energy difference:

```text
H_vapor = Cp [M0 (T0−Tfinal) + M_evap Tfinal]
H_vapor,sensible = Cp I
M_final Cp T_final + H_vapor = M0 Cp T0
```

Tích phân I giữ emitted T trung bình theo mass cho particle/gas routing. Không lấy final colder film T hoặc hot bulk T làm nhiệt độ chung cho toàn packet.

## API cụ thể

`evaporateWallFilm({masses_g, totalMass_g, temperature_c, dt, boundary})` trong `src/science/wallFilmEvaporation.ts`:

- masses_g: chỉ các caps exposed, g; totalMass_g: toàn node film, gồm cả protected water.
- boundary: gasTemperature_c, waterPressure_Pa, airSpeed_m_s.
- Output: valid, masses_g, temperature_c, evaporated_g, vaporEnergy_J, vaporSensibleEnergy_J, vaporTemperatureMass_c_g và limitedBy (none/equilibrium/liquid-floor/unsupported).

`transportWallBeads()` nhận `evaporationBoundary`. Mỗi transport substep đưa exposed masses thật vào solver; không debit chìm/chạm receiving pool lần hai. Flux-only legacy option vẫn giữ isothermal geometric contract cho caller cần nó; runtime condensation dùng finite boundary.

Nucleation deposition vào node ở nhiệt độ interface đầu segment; film được mix bằng enthalpy trước drainage. Mỗi lần drain ghi `Cp*m*T_at_drain`, rồi motion/coalescence dùng T mới. Output thêm temperature_c, vaporEnergy_J, vaporSensibleEnergy_J, vaporTemperatureMass_c_g, drainedSensibleEnergy_J và evaporationThermalLimit. Unknown evaporation boundary có thể giữ evaporation mà không cản một drainage/motion hợp lệ.

`stepWallCondensation()` trả thêm wallEvaporatedEnergy_J, wallEvaporatedTemperatureMass_c_g và returnedTemperature_c. returnedTemperature_c lấy từ tổng drained sensible enthalpy chia Cp*drained mass, có thể cao hơn Tfilm cuối bước vì giọt đã rời sớm. Header compatibility như wallEvaporatedStep_g vẫn chỉ là actual mass.

Wet-film temperature có state: nếu caller không cung cấp wallTemperatures, giữ T của film đang có nước. Không ép film vừa nguội trở về nominal dry-wall temperature ở bước sau. Chỉ khi chưa có film thì nominal resistance approximation khởi tạo interface. Caller có nhiệt độ interface đã giải có thể cung cấp explicit wallTemperatures.

## Admission, routing và counters

Water return capacity được kiểm tra theo cumulative mass/enthalpy receipt, không theo toàn bộ lượng nước ở final film T. Có fast path khi cả lượng liquid0°C cũng vừa receiver; trường hợp khác callback preview/bisect actual weighted return enthalpy cho từng drain. Below-zero wall temperature vẫn ngoài liquid-return closure và không được nhận như một giọt nước lỏng. Phần không được nhận giữ trên bead boundary, không tạo overflow/spill giả.

Inner outgoing packet dùng integrated vapor energy/moment, rồi cùng shared wall/reaction/thermal source tới condenser/exhaust. Outer drying cập nhật ambient sink và energy counter riêng. Không trừ latent heat của outer drying vào mẫu thêm lần nữa; conduction đã là nguồn nhiệt hữu hạn cho film ở thermal stage. Inner drying không ghi negative heatRejected_J như một room heater nữa. Condensation latent-heat route cũ vẫn riêng, chưa giải đồng thời finite condensation warming.

Wall state bổ sung innerMassTransferVaporEnergy_J, outerMassTransferVaporEnergy_J, innerDryingLimit, outerDryingLimit và outerDrainedSensibleEnergy_J. returnedSensibleEnergy_J dùng actual drain integral. massTransferModel hiện là finite-film-pressure-driven-cap. Các field đọc qua `effects.forVessel(id).inspect().state.wall`; không spawn vessel hoặc sửa mẫu khi inspect.

## Kiểm chứng và giới hạn còn lại

15 test mới gồm independent fine RK4 theo mass/T/energy coordinates, saturation zero, dewpoint approach,0°C floor, protected capacity, time subdivision, micro inventory/sub-ulp cooling enthalpy, invalid-data rollback, actual transport deposition/drain energy, persisted cooled T, vapor formation enthalpy/moment, exterior no double bulk debit, mass-weighted return energy và live-store đúng ID.

Các test cũ được sửa đúng source heat budget: bỏ kỳ vọng film giữ25°C khi đã bay hơi; exterior latent work đến từ film storage. Dữ liệu test room-temperature drying phải khởi tạo wall film ở room temperature, không dùng wall temperature khởi tạo từ mẫu85°C rồi dựa vào runtime ép về25°C. Không nới tolerance conservation hoặc bỏ kiểm tra không replay nguồn.

Bulk/conduction và mass-transfer vẫn operator-split; motion/condensation source dùng closure representative nodes. Chưa có measured wetting/hm, spatial gradients, glass inertia đầy đủ, simultaneous condensation warming, retained headspace/finite carrier capacity, frost hoặc GPU visual QA. Mô hình đã tiến triển nguồn nhiệt/mass hữu hạn; chưa chứng minh toàn bộ hệ thống đúng thực nghiệm tuyệt đối.

Sau thay đổi cuối: **155 file, 1765/1765 test đạt**, TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; hình ảnh GPU chưa được xác minh.
