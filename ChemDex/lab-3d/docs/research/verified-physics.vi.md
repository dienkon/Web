# Nâng cấp vật lí có kiểm chứng

## Quy ước và chứng cứ

Lõi vật lí mới dùng m, kg, s, K, mol, J, Pa. Cảnh giữ 0,035 m/đơn vị qua adapter. Pha rắn/lỏng/khí tách khỏi cấu trúc dung dịch/huyền phù/gel/bọt/cặn. Các giá trị ma sát, khối lượng vỏ và cấp vật liệu chưa đo luôn mang trạng thái `estimated`.

Baseline trước thay đổi: 2.470/2.470 test qua (`artifacts/verified-physics/baseline.json`). Không suy ra độ chính xác thực nghiệm từ test phần mềm.

## Theo dõi các mốc

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| 1 | Kiểm kê, đơn vị, hồ sơ vật thể, nguồn và giới hạn | Đã có registry và audit; kiểm chứng vật thể tiếp tục ở mốc 2 |
| 2 | Runtime Worker/Rapier, tiếp xúc, cầm/thả, liên kết | Có đường chạy thử nghiệm; chưa bật mặc định |
| 3 | Kho chất, lực đẩy, dòng vận chuyển, quần thể có trọng số | Có lực đẩy/drag, chiếm chỗ động và rót thụ động; chưa hiệu chuẩn toàn bộ dòng/hạt |
| 4 | Nhiệt, pha, khí và hóa học liên thông | Có mô hình tham chiếu hữu hạn và đồng hồ hạt cố định; hóa học/nhiệt chính vẫn ở runtime cũ |
| 5 | Hai gói dụng cụ và mẫu mới | Có palette và bàn đo tham chiếu cho cả hai gói; phụ kiện 3D vẫn là hình bao |

## Mốc 1

- 184 hồ sơ: 15 loại bình, 24 dụng cụ/phụ kiện, 7 mẫu vật liệu, 94 mục hóa chất, 38 profile sản phẩm, 6 nhóm môi trường.
- Mỗi hồ sơ có ID ổn định, hành vi, tình huống kiểm chứng, nguồn nếu có và giới hạn. Các loại chưa chọn thiết bị thật chưa có chứng nhận thực nghiệm.
- Shell va chạm bình lấy cùng contour và phép biến đổi dung tích với renderer; chia thành nêm lồi để giữ lòng rỗng.
- Bộ cầm/thả đổi gia tốc SI sang thước cảnh, giữ vận tốc ngang; class vật lí cũ đổi xung lượng và năng lượng va chạm tại biên SI.
- 35 test mục tiêu qua, gồm rơi tự do theo nghiệm độc lập, registry, mass/inertia, hồi quy cầm/thả và canary.

## Nguồn

- [SCHOTT BOROFLOAT](https://www.schott.com/en-us/products/borofloat/technical-details): mật độ 2.230 kg/m³ tại 25 °C, nhiệt dung 830 J/(kg·K) trong 20–100 °C, độ dẫn nhiệt 1,2 W/(m·K) tại 90 °C. Dùng hằng số rút gọn; không chứng nhận thủy tinh thực của mọi bình.
- [IAPWS](https://iapws.org/documents/release): mô hình nước và hơi nước.
- [NIST, nhiệt nóng chảy băng](https://nvlpubs.nist.gov/nistpubs/jres/23/jresv23n6p643_A1b.pdf): tham chiếu 333.500 J/kg.
- [Dow PMX-200 100 cSt](https://www.dow.com/en-us/pdp.xiameter-pmx-200-silicone-fluid-100-cst.01013190z.html): cấp dầu silicone tham chiếu. Không dùng chung cho mọi dầu silicone.
- [NIST hiệu chuẩn thể tích](https://nvlpubs.nist.gov/nistpubs/ir/2019/NIST.IR.7383-2019.pdf): phân biệt chứa/nhả và nhiệt độ hiệu chuẩn.

## Chạy lại

```powershell
node --import tsx scripts/auditPhysicalCoverage.ts
npx vitest run tests/physical_foundation.test.ts tests/held_object_controller.test.ts tests/damage_and_physics.test.ts tests/canaries_k1_to_k5.test.ts --maxWorkers=2
```

Không ghi đè các artifact hiệu năng lịch sử. Báo cáo mới nằm dưới `artifacts/verified-physics`.

## Runtime cơ học

Rapier 0.21.0 được khóa trong lockfile và tải trong Worker riêng khi bật mục **Vật lí**. UI gửi lệnh có thứ tự; 120 tick/s độc lập FPS. Khối lượng vỏ và mẫu được cộng đúng một lần, trọng tâm/quán tính cập nhật khi lượng mẫu thay đổi. Collider thủy tinh là shell nêm rỗng theo contour dùng chung; phụ kiện mới vẫn là hình bao ước lượng và được ghi rõ trong giao diện.

Mỗi yêu cầu Worker nhận tối đa 1/30 giây ở tốc độ 1× (bốn bước), giữ thời gian chờ để tránh một batch dài chặn lệnh và snapshot. Khi máy thiếu CPU, thời gian mô phỏng có thể chậm hơn đồng hồ thực. Pause xóa thời gian đang chờ ở bridge; khi resume không chạy bù các thao tác cũ. Kiểm tra riêng bao phủ chậm phản hồi và pause trong lúc chờ.

Vật được giữ bằng lực lò xo có giới hạn; lực và mômen được bỏ khi thả nhưng vận tốc được giữ. CCD bật cho thân động. Joint cầu có API attach/detach ở runtime. Snapshot WASM có version và bản Rapier; khôi phục được kiểm tra bằng trajectory và byte snapshot giống nhau. Pose/vận tốc SI của bình được lưu cùng mẫu trong record hiện hữu.

Theo [điều kiện Rapier](https://rapier.rs/docs/user_guides/javascript/determinism/), cùng phiên bản/thứ tự tạo vật là cần thiết; đầu vào cũng phải được tạo bằng phép tính tái lập giữa nền tảng. Shell hiện còn tính bằng `Math.sin/cos`, chưa có bảng hình học chuẩn hóa đã kiểm tra chéo trình duyệt. Test FPS và snapshot cùng môi trường chưa chứng nhận tái lập tuyệt đối giữa mọi máy.

10 test runtime qua: rơi tự do sai số dưới 1% ở fixture, bước 120 Hz qua 20/30/60/120 FPS, miệng rỗng/đáy bình, pause, thứ tự lệnh, lưu/khôi phục và không cộng khối lượng lặp. Audit Chrome desktop 1440×1000 và viewport cảm ứng 390×844 bật Worker và kiểm tra pause không tăng tick; không có page error. Viewport điện thoại trên Chrome desktop không thay thế đo trên điện thoại thật hoặc Safari.

Chưa chứng nhận hiệu năng 20 bình/50 mảnh hoặc sức bền thực nghiệm; hình bao dụng cụ, trọng tâm chất lỏng khi dao động và va chạm của phụ kiện cần kiểm chứng tiếp. Các phần hóa học/nhiệt hiện có chưa chuyển toàn bộ vào Worker. Giữ feature flag tắt mặc định cho đến khi vượt đủ nghiệm thu.

## Vật chất chuyển động và mặt đỡ

- Mẫu rắn bổ sung có khối lượng và quán tính từ thể tích SI, chuyển động tự do, lực đẩy theo thể tích hộp thực sự ngập và drag cầu tương đương có giới hạn năng lượng. Drag không được coi là hiệu chuẩn cho khối hộp hoặc mọi hình thái hạt.
- Phép tính thể tích hộp ngập dùng tích phân giải tích; miền gần song song khó điều kiện giữ đường cắt tam giác độc lập. Test đối chiếu 120 tổ hợp hướng/độ sâu.
- Snapshot rắn tương đối với bình đi vào cùng `stockImmersion` dùng cho mực nước, sức chứa và dòng rót. Không cộng thể tích khối rắn vào kho chất lỏng. Chuyển động đầy đủ dùng quaternion cả ở chuyển đổi tọa độ.
- Bình tự lật phát packet hữu hạn qua `releasePourLiquid`, giữ vận tốc nguồn và thời gian bay; không tạo vũng ngay khi rời miệng. Cd, dòng hai pha và dòng do slosh vẫn chưa hiệu chuẩn.
- Bàn tham chiếu cao 0,90 m; đây là lựa chọn của mô hình, không phải chuẩn phổ quát. Sàn, thân tủ và mặt đỡ trong cảnh/Rapier dùng cùng kích thước. Vũng khác tầng không nhập vào nhau; giọt/mảnh vỡ ở sàn không bị nâng về bàn.
- `MatterLedger` là API giao dịch SI nguyên tử, có receipt chống lặp sau reload, theo dõi nguyên tố/điện tích/enthalpy. Đây chưa phải thay thế toàn bộ ledger hóa học đang chạy trong store.

## Nhiệt, khí và hai gói mới

Bàn kiểm chứng trong mục **Vật lí** chạy trên Worker, dùng cùng tick/pause/time scale:

| Phép đo | Mẫu và mô hình | Kiểm tra |
|---|---|---|
| Lực kế | Thủy tinh, thép, Al, polyethylene ngập hoàn toàn trong nước/glycerol/dầu silicone | Trọng lượng trừ lực đẩy Archimedes |
| Cảm biến áp suất | 1 mmol khí lí tưởng trong 25 mL kín | P tỉ lệ T tuyệt đối, n và V cố định |
| Bóng hút pipet | Khí đẳng nhiệt, nước nguồn 20 mL, bóng 10 mL/bóp 3 mL | Giữ n khí và tổng nước; tiến tới cân bằng cột áp |
| Bể điều nhiệt | 0,5 kg nước bể và 0,1 kg mẫu, nguồn tối đa 100 W | Điện năng = nhiệt tích trữ + nhiệt truyền mẫu + mất ra phòng |
| Bình thu khí | Khí lí tưởng không tan, mặt phân cách ngập cố định 2 cm | n nguồn + n thu và nước bình + nước chậu không đổi |
| Độ nhớt | Hạt cầu bán kính 5 µm trong ba chất lỏng tham chiếu | Vận tốc Stokes và Reynolds trong miền áp dụng |
| Băng nước | 5 g băng ban đầu −10 °C, cấp 20 W | Enthalpy, nhiệt ẩn và lượng rắn/lỏng |

Nút băng còn tạo mẫu nước–đá trong lab qua runtime chuyển pha hiện hữu. Các phép đo tham chiếu dùng mẫu riêng; chúng chưa có nghĩa năm phụ kiện hình bao đã nối thành bộ thiết bị thật trong cảnh. Thay đổi nhiệt độ bằng slider là thay điều kiện fixture, không mô phỏng một nguồn nhiệt vô hạn tác động lên bình đang chọn.

Hệ hạt hiện hữu được tách bước định lượng khỏi callback vẽ, dùng `PhysicalEffectsRuntime` 120 Hz. Renderer đăng ký mô hình và chỉ upload trạng thái. Runtime này vẫn ở luồng chính để giữ đúng liên kết với các bộ giải hóa học/nhiệt hiện hữu; chưa tuyên bố đã chuyển hết mô phỏng vào Worker.

## Lưu và khôi phục

Record v4 lưu pose/vận tốc SI cùng vật chất của mẫu, các vật bổ sung, seed, tick và kho của các fixture. Đọc được v3/v2; không ghi đè bản v3. Undo/Redo phục hồi cấu hình vật lí và khởi tạo lại nhánh Worker theo revision. Bản khởi tạo rỗng không được ghi đè các fixture đang chờ khôi phục; mỗi lần chạy fixture có revision riêng.

Lưu phòng lab là snapshot số liệu chuyển động; tiếp xúc được dựng lại khi mở trang. Chỉ API `PhysicsRuntime.save/restore` dùng snapshot WASM mới được test tiếp tục byte/trajectory giống hệt. Không coi hai cơ chế là cùng một mức tái lập.

## Kiểm chứng và phần còn lại

Kết quả nằm trong `artifacts/verified-physics`: registry, JSON test, audit Chrome desktop/cảm ứng, ảnh giao diện và CPU. Audit giao diện kiểm tra bật/pause, sáu phép đo hữu hạn và tải lại giữ vật/thời gian. Hồi quy hạt khi nghiêng kiểm tra bốn bình; không có lỗi JavaScript/WebGL.

Lần kiểm tra cuối: 2.530/2.530 test qua (loại `performance.smoke.test.ts` để không ghi đè artifact hiệu năng cũ), `npm run lint` và `npm run build` qua. `interaction-audit.json` kiểm tra chuột thật qua Playwright và sự kiện touch qua CDP: pointer bắt đầu kéo bình, Worker báo đang cầm rồi nhả, pose/vận tốc hữu hạn. Không suy ra đã kiểm chứng mọi dụng cụ hay mọi trình duyệt từ hai ca này. Build còn cảnh báo kích thước bundle; Worker Rapier khoảng 4,45 MB trước gzip.

Benchmark 20 bình/50 mảnh, ba fixture dòng và hai fixture nhiệt **chưa đạt ngân sách tương tác**. `runtime-cpu.json` đo Node CPU cho bốn tick và snapshot, loại trừ renderer, vận chuyển Worker và hóa học cũ; không phải FPS hoặc số đo trên điện thoại. Các lần phát triển có tải nền/cấu hình khác nhau, không dùng các file trước/sau để tuyên bố mức tăng tốc có kiểm soát.

Lần đo hiện tại trên môi trường phát triển: median 174,55 ms, p95 195,51 ms; đây là chi phí CPU của fixture, chưa phải số đo khung hình end-to-end.

Những hạng mục chưa hoàn tất để nghiệm thu toàn kế hoạch:

1. Chuyển quyền sở hữu nhiệt/hóa học và vận chuyển còn lại vào runtime chung, cùng một giao dịch cho mọi sự kiện ghép.
2. Hình học, liên kết thao tác và hiệu chuẩn thiết bị cho các phụ kiện; mảnh/bột chuyển động, bít cửa và giao diện hai pha tổng quát.
3. Slosh tác động lên áp suất/dòng, wetting, dòng nhớt/mao dẫn, khí hòa tan và hệ số thực nghiệm có dữ liệu kiểm tra độc lập.
4. Ghép trao đổi nhiệt của các khối rắn mới với mẫu đang phản ứng; chuẩn hóa thông số của từng hóa chất, dụng cụ theo nguồn cụ thể.
5. Giảm chi phí tiếp xúc của shell, đạt ngân sách đầy đủ trên máy tham chiếu và thử Safari/điện thoại thật.

Không gắn nhãn “đã đúng thực tế toàn hệ thống” cho trạng thái hiện tại.
