# PROMPT: CƠ CHẾ RÓT & HIỆU ỨNG CHẤT LỎNG — VIRTUAL CHEMLAB
### (vật lý thật · hiệu ứng đẹp · chạy mượt trên mọi thiết bị)

> **Cách dùng:** dán từ mục "VAI TRÒ" trở xuống cho AI coding agent đang mở repo `chemlab`. Prompt này độc lập; nếu repo đã có thư mục `src/vfx/` từ prompt VFX trước thì tái sử dụng (noise GLSL, ParticlePool, quality tier, PostFX), nếu chưa thì tự tạo bản tối thiểu.

---

## VAI TRÒ

Bạn là Senior Graphics + Gameplay Engineer (Three.js / React Three Fiber / WebGL2 / mobile web). Nhiệm vụ: **thiết kế lại toàn bộ cơ chế rót** của Virtual ChemLab thành một hệ thống thống nhất, có vật lý đáng tin, hiệu ứng chất lỏng đẹp như phòng lab thật, điều khiển tự nhiên bằng **chuột, cảm ứng, bút và bàn phím**, và chạy tốt từ điện thoại tầm trung đến máy bàn. Không phá logic hóa học và API store hiện có.

---

## 1. KIỂM TOÁN CƠ CHẾ RÓT HIỆN TẠI (đã đọc code — xác nhận lại khi làm)

Repo có **4 hệ rót tách rời, không dùng chung vật lý/dữ liệu**:

| Hệ | File | Cách hoạt động | Vấn đề đã xác định |
|---|---|---|---|
| **A. Rót theo độ nghiêng** | `Vessels.tsx` (Beaker/Flask/TestTube/GraduatedCylinder) + `engine/interactionEngine.ts#calculatePourPhysics` + `store.transferLiquidContinuous` | `useFrame` tính `isPouring` từ `tiltAngle`, gọi `transferLiquidContinuous` mỗi frame | **Không thể kích hoạt:** `tiltAngle` là `useState(0)` và `setTiltAngle` chỉ được gọi để *giảm* (`prev - delta*2.5`); **`VesselTiltGizmo` không được mount ở đâu**. Tính năng tồn tại trong code nhưng người dùng không với tới được. Ngưỡng nghiêng là nội suy tuyến tính 1.22→0.42 rad chứ không dựa hình học bình. Lưu lượng là hàm của góc chứ không của cột áp. |
| **B. Rót kéo-thả bình → bình** | `PouringBottle.tsx#VesselPourAnimation` + `store.startVesselPourAnimation / updatePourVolumeProgress / finishVesselPourAnimation / pourVessel` | Timeline cứng 2.8 s bằng `Date.now()`; một **bình giả** (cylinder bán kính 0.75) bay tới rồi nghiêng; dòng chảy là một cylinder xoay cố định | (1) Bình thật **vẫn nằm trên bàn** trong lúc bình giả bay (cả hai cùng hiện). (2) Bình giả luôn là cylinder dù nguồn là ống nghiệm/bình tam giác. (3) Dòng chảy **không nhắm** vào miệng đích. (4) **Lỗi cộng dồn thể tích:** `updatePourVolumeProgress` mỗi frame đọc `to.volume_ml` *mới nhất* rồi cộng `total × progress` (đã là tổng tích lũy) ⇒ bình đích đầy gần như tức thì; nguồn thì về 0 đúng hạn; sau đó `pourVessel` chạy trên phần còn lại của nguồn (có thể ≈0 ⇒ `return` sớm) ⇒ kết quả phản ứng phụ thuộc may rủi của frame cuối. (5) Hook `useFrame` nằm **sau** `if (!fromVessel \|\| !toVessel) return null`. (6) Không tôn trọng `timeScale`/pause. |
| **C. Thêm hóa chất (chai/thìa/ống nhỏ giọt)** | `PouringBottle.tsx#AddingAnimation` + `store.triggerPour/clearPour/mixSubstances` | Timeline cứng 3.1 s, `Date.now()`, gọi `setVesselState` **mỗi frame** để tăng thể tích | Chai luôn bay từ phía +X; dòng chảy cố định; `Math.random()` trong JSX của hạt rắn ⇒ **nhảy ngẫu nhiên mỗi lần render**; thể tích rắn tính bằng mL (`amount` 10 ⇒ +10 mL); không có nắp chai; giọt chất chỉ thị đồng nhịp 0.5 s cố định. |
| **D. Rót ra bàn / tràn** | `transferLiquidContinuous(toId=null)`, `addSpill` | Tạo vũng tại **vị trí bình nguồn**, không phải điểm dòng chảy chạm bàn | Vũng không khớp điểm rơi; không có dòng chảy lan trên mặt bàn. |

**Lỗi dùng chung cần sửa:**
- `transferLiquidContinuous`: màu đích `to.liquidColor || from.liquidColor` (không trộn); **không cập nhật `contents` (mol, khối lượng từng chất)**; không trộn nhiệt độ; gọi `evaluateLocalChemistry` gần như mọi frame khi `accepted_ml > 0.8`; áp kết quả phản ứng **tức thời** (bỏ qua `activeKinetics`/progress); thể tích tràn dùng `to.position` chứ không phải mép miệng.
- Điều khiển **chỉ có chuột**: kéo-thả hóa chất dùng HTML5 `draggable`/`dataTransfer` (App.tsx) — **không đáng tin trên cảm ứng**; bình tự "hạ nghiêng" khi `!isSelected && !isHovered` ⇒ **cảnh cảm ứng không có hover** nên hành vi sai; `VesselTiltGizmo` dùng `window` `pointermove` kiểu `MouseEvent`, không `setPointerCapture`, không `touch-action: none`.
- Layout cố định `w-72` / `w-80` hai sidebar; canvas không dùng `dvh`, safe-area, không xử lý mất ngữ cảnh WebGL; `powerPreference: 'high-performance'` luôn bật (tốn pin di động); `frameloop` luôn chạy dù cảnh tĩnh.
- `three ≥ r163` **chỉ còn WebGL2** ⇒ thiết bị không có WebGL2 cần màn hình báo lỗi thân thiện, không để trắng trang.

---

## 2. MỤC TIÊU & RÀNG BUỘC KHÔNG ĐƯỢC PHÁ

**Mục tiêu:** một `PourController` duy nhất điều khiển **mọi** kiểu rót; vật lý chạy bằng **hàm thuần TypeScript có test**; hiển thị đọc từ cùng trạng thái; thể tích/mol/nhiệt/màu được **bảo toàn**; điều khiển nhất quán trên mọi thiết bị.

**Ràng buộc:**
1. Giữ API hiện có của `useAppStore` (thêm được, không đổi tên/xóa). Các hàm cũ (`startVesselPourAnimation`, `triggerPour`, `mixSubstances`, `pourVessel`…) được giữ làm **adapter** gọi vào hệ mới.
2. Không asset ngoài (texture/HDRI/âm thanh) — sinh bằng code. Chạy được offline.
3. Mọi diễn biến theo **thời gian mô phỏng** (`dt × timeScale`, dừng khi `isSimulationPaused`), **không** dùng `Date.now()`. Dùng bước thời gian cố định (accumulator 1/60 s, tối đa 5 bước/frame) để kết quả không phụ thuộc FPS.
4. Không `any` mới; `npm run lint` và `npm run build` phải sạch; hàm vật lý thuần có unit test (thêm `vitest`).
5. Không cấp phát đối tượng trong `useFrame` (Vector3/Color/Object3D/mảng mới).
6. Không đổi schema lưu `persistence.ts` theo kiểu làm hỏng dữ liệu cũ; trạng thái rót là **tạm thời**, không lưu, không nằm trong snapshot undo cho đến khi **commit** (1 snapshot/lần rót).

---

## 3. KIẾN TRÚC MỤC TIÊU

```
src/pour/
  physics/
    profiles.ts        // VesselProfile cho beaker/flask/test_tube/cylinder/reagent_bottle: r(y), H, lip, mouthR, spout
    retained.ts        // bảng V_giữ_lại(θ) tính số học lúc khởi tạo (cache theo loại bình)
    flow.ts            // lưu lượng đập tràn (weir), độ nhớt, glug, wall-cling
    ballistics.ts      // quỹ đạo dòng chảy, điểm rơi, phân loại (vào miệng / vành / bàn)
    mixing.ts          // bảo toàn thể tích, mol, khối lượng, nhiệt, màu (Beer–Lambert)
    solids.ts          // rơi, nảy, chìm/nổi của rắn
    step.ts            // reducer thuần: (state, input, dt) -> {state, events}
  controller/
    PourController.ts  // máy trạng thái + hàng đợi sự kiện
    modes.ts           // HAND_TILT, ASSIST, STOCK_BOTTLE, DROPPER, SOLID, TABLE, ROD_GUIDED, FUNNEL
    store-bridge.ts    // 1 chỗ duy nhất ghi vào useAppStore (applyPourStep, commitPour, cancelPour)
  input/
    PourInput.tsx      // Pointer Events thống nhất: chuột/cảm ứng/bút/bàn phím
    PourHandle.tsx     // tay cầm nghiêng 3D + dial 2D cho cảm ứng
    ChemicalDragLayer.tsx // thay HTML5 DnD bằng pointer-drag + "chạm chọn → chạm đích"
  render/
    PourStream.tsx     // ống dòng chảy (vertex shader), vỡ giọt, gợn
    ImpactFX.tsx       // gợn tròn, vương miện, bong bóng cuốn theo
    WallFilm.tsx       // màng ướt + giọt chảy trên thành kính, giọt cuối miệng bình
    SpillFlow.tsx      // vũng lan trên mặt bàn có dòng chảy
    SolidFall.tsx, DropperDrop.tsx, StockBottle.tsx, Spatula.tsx
  audio/PourAudio.ts   // âm rót có cao độ theo mức đầy, glug, nhỏ giọt, nảy
  hud/PourHUD.tsx      // thể tích, lưu lượng, góc, gợi ý thao tác (i18n vi/en)
  debug/pourGallery.tsx// ?pour=1: thử mọi chế độ, bật vẽ quỹ đạo/điểm rơi
```

**Quy tắc dữ liệu:** `PourController` chạy vật lý → phát `events` (`contact`, `overflow`, `spill`, `bottle:glug`, `drop`, `pourEnd`…) → (a) `store-bridge` ghi trạng thái hóa học, (b) renderer/âm thanh/rung đọc cùng sự kiện. Không component nào tự cộng trừ thể tích.

---

## 4. ĐẶC TẢ VẬT LÝ

### 4.1 Hình học & điểm trào
Mỗi loại bình có `VesselProfile` (mặt tròn xoay, đơn vị scene; kèm `SCENE_UNIT_CM` suy từ `capacity_ml` để quy ra SI):
```ts
interface VesselProfile {
  H: number;                       // chiều cao lòng trong
  r: (y: number) => number;        // bán kính lòng trong theo độ cao (beaker: hằng; Erlenmeyer: côn + cổ; ống nghiệm: trụ + đáy bán cầu)
  lipLocal: [number, number, number]; // điểm trào (mép miệng/mỏ rót) trong tọa độ bình
  mouthR: number;                  // bán kính miệng để bắt dòng khi là bình đích
  spoutWidth: number;              // bề rộng mỏ rót hiệu dụng (beaker có mỏ, ống nghiệm không)
}
```

### 4.2 Khi nào chất lỏng trào (thay cho ngưỡng nội suy tuyến tính)
Mặt thoáng luôn **nằm ngang trong thế giới**. Trong hệ tọa độ bình, pháp tuyến mặt thoáng `n = R⁻¹·(0,1,0)`; thể tích bên dưới mặt phẳng `n·p ≤ c` là tích phân các lát cắt đĩa — mỗi lát là **hình viên phân**:
```ts
// diện tích phần đĩa bán kính R có u <= s  (u là tọa độ dọc hướng nghiêng)
export function segArea(R: number, s: number): number {
  if (s <= -R) return 0;
  if (s >= R) return Math.PI * R * R;
  return R * R * Math.acos(-s / R) + s * Math.sqrt(R * R - s * s); // dA/ds = 2√(R²−s²) ✓
}
// V(n, c) = ∫₀ᴴ A(y) dy với lát y: nx·x+nz·z ≤ c − ny·y  ⇒ s = (c − ny·y)/hypot(nx,nz)
```
- `solveLevel(profile, n, V)`: tìm `c` bằng chia đôi sao cho `V(n,c)=V` (dùng để vẽ **mặt thoáng nghiêng đúng** và clipping plane).
- `retainedVolume(profile, θ)`: `V(n(θ), n·lip)` — thể tích tối đa còn giữ được khi mặt thoáng chạm điểm trào. Tính bảng 64 mẫu θ∈[0,π] lúc khởi tạo, nội suy khi chạy.
- `V_dư = max(0, V − V_giữ_lại(θ))`. **Chỉ khi V_dư > 0 mới có dòng chảy** ⇒ bình đầy trào sớm, bình cạn phải nghiêng nhiều — đúng thực tế, tự nhiên đủ cả hình học từng loại bình.

### 4.3 Lưu lượng (đập tràn)
Rót qua mép là dòng qua đập: `Q = Cd · (2/3)·√(2g) · b · h^{3/2}`, với cột áp `h = V_dư / A_mặt_thoáng(θ)` và bề rộng `b = spoutWidth` (không có mỏ: `b = min(2R, 2√(2R·h))`).
- Tính ở SI (đã quy đổi bằng `SCENE_UNIT_CM`), kẹp `Q ∈ [0.15, 60] mL/s`.
- `viscosity` (đa số dung dịch loãng ≈1; thêm trường tùy chọn cho H₂SO₄ đặc ≈ nhớt hơn ⇒ `Cd` nhỏ, dòng dày, chậm).
- **Hệ số tăng tốc cho trải nghiệm** `pourTimeCompression` (mặc định 1; tự đưa lên ≤ 2.5 nếu 100 mL mất > 12 s ở tư thế nghiêng tối ưu) hiển thị rõ trên HUD, không làm sai vật lý nội bộ.
- **Teapot effect / bám thành:** khi `h` rất nhỏ (< ~1.2 mm) hoặc `Q < Q_bám` dòng **không bật ra** mà bám mép chảy xuống thành *ngoài* bình, rồi nhỏ giọt: phát `wallDrip` (vẽ ở `WallFilm`), đồng thời một phần thể tích rơi xuống bàn/đích theo `wallDrip` → nếu bình đích không nằm dưới thì **nhỏ ra bàn**.
- **Glug (chai cổ hẹp đầy):** khi `θ` lớn và miệng hẹp, lưu lượng dao động theo chu kỳ (`~2–6 Hz`) vì không khí phải chui ngược vào: `Q *= 0.55 + 0.45·sin²(πf t)` kèm sự kiện `glug` cho âm thanh + bong bóng ngược trong chai.

### 4.4 Quỹ đạo dòng chảy & điểm rơi
- Vận tốc ra: `v0 = max(0.12, √(2g·h)·0.7)` (m/s), hướng = hướng ra ngoài vuông góc mép miệng, ép xuống theo góc nghiêng.
- Phương trình: `p(t) = p0 + v·t + ½·g·t²`. Giải thời điểm chạm mặt phẳng đích `y_t`:
```ts
const t = (vy + Math.sqrt(vy*vy + 2*G*(y0 - yT))) / G;  // yT = mặt thoáng đích | vành miệng | mặt bàn
```
- Phân loại điểm rơi: (a) trong `mouthR − bề dày thành` ⇒ **vào bình**; (b) trúng **vành/thành ngoài** ⇒ chảy dọc thành (`WallFilm`) rồi rơi xuống bàn, một phần vào bình nếu vành thấp; (c) ngoài ⇒ **tràn xuống bàn** tại **đúng điểm rơi** (`addSpill` ở điểm đó, kèm `splash`). Miệng hẹp (ống nghiệm, bình tam giác) đòi hỏi ngắm chuẩn hoặc **phễu** (xem mode FUNNEL).
- Mỗi frame **ngắm lại** (đích có thể đang kéo/di chuyển).

### 4.5 Bình đích, tràn, hơi/bọt
- Đích nhận `accepted = min(Q·dt, dung_tích_còn)`; phần còn lại `overflow` tràn **qua vành tại phía điểm rơi** (không phải `to.position`), chảy xuống thành ngoài rồi ra bàn.
- **Bọt cuốn theo (entrainment):** số bong bóng sinh ra ∝ `Q·v_chạm·(1+ độ_cao_rơi)`; chất có `foaming` hoặc có gas thì tăng. Bọt nổi lên mặt, tan dần.
- Chất lỏng nóng (≥ 60 °C): hơi bốc lên từ dòng chảy và khi chạm.
- **Rót axit đặc vào nước / nước vào axit đặc:** kết nối `safetyEngine` — thao tác đúng quy trình (axit chảy dọc **đũa thủy tinh**, mode ROD_GUIDED) giảm bắn tóe, thao tác sai kích hoạt cảnh nổ của hệ VFX.

### 4.6 Bảo toàn (BẮT BUỘC có test)
```ts
// mỗi bước: chuyển dV từ nguồn sang đích/bàn
dn_i = n_i_from * (dV / V_from)             // mol từng chất, theo tỉ lệ
dm   = dV * ρ_from                          // khối lượng
V_to += accepted;  V_from -= dV;  V_spill += (dV - accepted)
T_to = (m_to·c_to·T_to + dm_acc·c_from·T_from) / (m_to·c_to + dm_acc·c_from)   // c≈4.18 J/g·K cho dung dịch nước
```
**Màu (hấp thụ Beer–Lambert, không lerp RGB):** chuyển sRGB → tuyến tính, `A = −ln(max(ε, C))` mỗi kênh, trộn **theo thể tích** `A_mix = (V₁A₁ + V₂A₂)/(V₁+V₂)` (nước trong A=0 ⇒ pha loãng làm nhạt đúng quy luật), rồi `C = exp(−A_mix)` → sRGB. Hai dung dịch cùng màu pha ⇒ giữ nguyên màu, không bị đục.
**Test bất biến:** `|ΔV_nguồn + ΔV_đích + ΔV_tràn| < 1e-6 mL`; không NaN; không thể tích âm; tổng mol từng chất không đổi; chạy 10 000 kịch bản ngẫu nhiên (property test) ở `dt` ngẫu nhiên 1–100 ms.

### 4.7 Khi nào chạy phản ứng
`evaluateLocalChemistry` **chỉ gọi khi bộ chất của đích thay đổi** (cạnh lên: chất mới lần đầu chạm) và 1 lần khi kết thúc rót — tối đa 4 lần/giây. Kết quả đi qua `activeKinetics` (có `progress`), **không** áp tức thời. `startProgress` theo tỉ lệ chất đã vào để rót chậm ⇒ phản ứng diễn ra *trong lúc rót* (màu loang từ điểm rót, sủi bọt khi có axit chạm đá vôi…).

---

## 5. CÁC CHẾ ĐỘ RÓT

| Mode | Điều khiển | Hành vi |
|---|---|---|
| **HAND_TILT** (rót tay) | Giữ bình để nhấc (nhấc lên 0.35), kéo di chuyển; nghiêng bằng tay cầm 3D / dial / phím; nhả ⇒ bình hạ xuống mượt | Vật lý đầy đủ §4. Có **hỗ trợ ngắm** (từ tắt đến mạnh): lực hút nhẹ đưa mép bình tới trên miệng đích. |
| **ASSIST** (rót hộ) | Kéo bình thả lên đích, hoặc chạm nguồn → chạm đích → **giữ nút "Rót"** hoặc thanh trượt tốc độ | **Chính bình thật** (bỏ bình giả) nâng lên, bay cung tới mép đích, nghiêng, rót, về chỗ cũ. Vẫn đi qua cùng vật lý §4 (tilt do controller tự điều khiển để đạt lưu lượng mục tiêu). Nhả nút ⇒ ngừng/ngẩng bình, đã rót bao nhiêu giữ bấy nhiêu. |
| **STOCK_BOTTLE** (chai gốc) | Kéo/chạm hóa chất → chọn lượng (5/10/25/50/tùy chỉnh, dùng thanh trượt) → rót | Chai bay tới, **tháo nút đặt lên bàn**, nghiêng, rót đúng lượng (giọt cuối đọng ở miệng chai rồi rơi), đóng nút. Nhãn chai hướng về camera. |
| **DROPPER** (ống nhỏ giọt/pipette) | Chạm giữ để bóp, nhả để dừng; hoặc "nhỏ N giọt" | Giọt hình thành ở đầu mũi (cầu phồng → thắt cổ → rơi kéo giãn), ~0.05 mL/giọt, đếm giọt trên HUD, chấm màu loang khi chạm (chất chỉ thị như phenolphtalein hiện **vệt hồng tan**). |
| **SOLID** (thìa / panh / viên) | Chọn khối lượng (g), không phải mL | Bột: lượng vật chất tạo đống trên thìa, gõ ⇒ rơi từng nhúm, bụi bốc nhẹ, có thể **nổi/chìm** theo khối lượng riêng; mảnh kim loại (Mg, Zn, Na…) dùng panh, rơi + nảy + chìm; **thể tích rắn không cộng vào mL chất lỏng** (sửa quy ước hiện tại), nhưng làm dâng mực nước theo thể tích chiếm chỗ. |
| **TABLE** (đổ ra bàn/chậu) | Nghiêng bình không có đích | Vũng hình thành tại điểm rơi, **lan dần** (độ nhớt), chảy theo địa hình nhẹ, cảnh báo nếu hóa chất nguy hiểm; có nút lau (`cleanSpills`). |
| **ROD_GUIDED** (rót dọc đũa) | Đặt đũa thủy tinh chạm miệng bình, rót | Dòng chảy dán theo đũa (laminar, không bắn); chấm điểm "đúng quy trình" khi pha loãng axit. |
| **FUNNEL** (phễu) | Kéo phễu vào miệng bình hẹp | Miệng bắt dòng tăng, chảy chậm hơn, có xoáy nhẹ. (P2 — làm sau cùng) |

---

## 6. ĐẶC TẢ HIỂN THỊ (đẹp, chân thực, rẻ)

### 6.1 Dòng chảy `PourStream`
- **Một mesh ống 24 đoạn dựng sẵn**; vị trí đỉnh tính trong **vertex shader** theo quỹ đạo parabol (uniform `p0, v0, g, tLand`) — không dựng lại geometry trên CPU.
- Bán kính theo bảo toàn lưu lượng `r(s) = r0·√(v0/v(s))` (dòng mảnh dần khi rơi), nhiễu pháp tuyến cuộn để có độ bóng chất lỏng; tô màu bằng vật liệu `MeshPhysicalMaterial` + `onBeforeCompile` (Fresnel, hấp thụ theo độ dày, **env map** phản chiếu đèn ống).
- **Vỡ giọt (Rayleigh–Plateau):** vượt chiều dài vỡ `L_b ∝ r·√(We)`, hoặc khi Q thấp ⇒ chuyển sang **chuỗi giọt** (InstancedMesh hình giọt nước, kéo giãn theo vận tốc).
- Ba chế độ: *laminar mảnh* (Q thấp, thủy tinh nhìn xuyên), *dày ổn định*, *hỗn loạn* (Q cao, gợn sóng, bắn tia bên).

### 6.2 Điểm chạm `ImpactFX`
- **Gợn tròn** lan trên mặt thoáng (shader đồng tâm, biên độ ∝ động lượng), vài đợt tắt dần.
- **Vương miện/giọt bắn** khi dòng mạnh hoặc rơi từ cao (hạt đạn đạo, nhỏ, ít).
- **Bong bóng cuốn xuống** rồi nổi lên (xem §4.5).
- **Đám màu loang** (`uInject`): chất lỏng màu khác chảy vào tạo vệt màu xoáy rồi hòa dần (curl noise), không đổi màu "bật công tắc".
- Mực nước đích **dâng mượt** theo `V` thật, mặt thoáng giữ **nằm ngang** khi bình đang nghiêng (clipping plane theo `solveLevel`), meniscus cong ở thành.

### 6.3 Bình nguồn
- Khi nghiêng, mặt chất lỏng **nằm ngang**, **sóng sánh** (lò xo giảm chấn theo gia tốc/góc), bọt/bóng khí chạy về phía mỏ rót; cột chất lỏng thu nhỏ đúng `V`.
- Hạt rắn/kết tủa **không trôi theo** khi chỉ rót phần trong suốt (phần rắn nằm lại; chỉ khi nghiêng mạnh mới trượt) — cơ chế gạn (decantation) là điểm cộng.
- **Giọt cuối cùng** đọng ở mép rồi rơi; vệt ướt trên thành ngoài (`WallFilm`: mask ướt giảm dần theo thời gian + giọt chảy xuống nhờ noise/thời gian).

### 6.4 Chai gốc, thìa, ống nhỏ giọt, panh
Mô hình thật hơn (LatheGeometry, nhãn canvas có tên + ký hiệu GHS, nút mài); animation dùng đường cong (CatmullRom + easeInOut), không dùng `lerp` thẳng; **chai luôn đến từ phía gần camera nhất** (không cố định +X) và tự né vật cản (bình khác, đèn cồn).

### 6.5 Vũng tràn `SpillFlow`
Hình dạng không đều (mask noise), lan dần theo độ nhớt, mép sáng viền, **phản chiếu** môi trường, dính vết bắn nhỏ; bay hơi dần; hóa chất nguy hiểm có viền cảnh báo; hơi/khói nhẹ nếu axit đặc.

### 6.6 Phản hồi hệ thống
Camera có thể tự dịch nhẹ để thấy miệng đích (tắt được); HUD hiển thị mL đã rót/mục tiêu, lưu lượng, góc; đường **ngắm quỹ đạo** (vạch chấm) và **vòng điểm rơi** (xanh = vào bình, vàng = sát vành, đỏ = ra bàn) hiện khi bắt đầu nghiêng.

---

## 7. ĐIỀU KHIỂN ĐA THIẾT BỊ

**Nguyên tắc:** một lớp `PourInput` dùng **Pointer Events** duy nhất; không `onMouse*` rời rạc.
- Canvas: `touch-action: none`, `overscroll-behavior: none`, `-webkit-user-select:none`, `-webkit-touch-callout:none`; `setPointerCapture` khi bắt đầu kéo.
- **Cảm ứng:** 1 ngón vào khoảng trống = orbit; 1 ngón vào bình = nhấc/kéo; **2 ngón** = zoom + pan; **chạm giữ 350 ms** vào bình = chọn → hiện **dial nghiêng 2D** (vòng cung, vùng chạm ≥ 48 px) và nút "Rót" lớn ở mép ngón cái; ưu tiên thao tác một tay. Có chế độ **"chạm chọn → chạm đích"** thay cho kéo-thả (cho người khó kéo).
- **Chuột:** kéo giữ bình + **chuột phải kéo dọc** hoặc cuộn bánh xe để nghiêng; tay cầm nghiêng 3D vẫn dùng được.
- **Bút/touch laptop:** như cảm ứng, nhận áp lực (nếu có) cho lưu lượng.
- **Bàn phím:** `Tab` chọn bình, `Enter` nhấc, `↑/↓` hoặc `Q/E` nghiêng, `Space` rót (giữ), `Esc` hủy; vòng focus rõ; `aria-live` thông báo "Đã rót 25 mL từ cốc A sang bình B".
- **Hover không bắt buộc:** thay logic `!isHovered` hạ bình bằng trạng thái rõ ràng (`held`, `released`); nhả ⇒ bình tự về tư thế thẳng.
- **Chống nhầm:** ngưỡng kéo 6 px (cảm ứng) / 3 px (chuột) để phân biệt chạm và kéo; không để orbit camera cướp thao tác khi đang cầm bình.
- **Kéo hóa chất từ sidebar:** bỏ HTML5 DnD, dùng pointer-drag tự vẽ "bóng kéo" (ghost) bám ngón tay, highlight bình có thể đổ; hỗ trợ "chạm hóa chất → chạm bình".
- **Rung (haptics):** `navigator.vibrate` (Android) nhịp ngắn khi chạm đích/glug/tràn; **iOS không hỗ trợ ⇒ bỏ qua êm**, không báo lỗi.

---

## 8. TƯƠNG THÍCH MỌI THIẾT BỊ

**Ma trận hỗ trợ tối thiểu:** Chrome/Edge/Firefox/Safari desktop (2 bản gần nhất); iOS/iPadOS Safari ≥ 15.4; Android Chrome ≥ 100 (RAM ≥ 3 GB); màn hình 320 px → 4K; cả dọc/ngang; có/không chuột.

1. **WebGL2 bắt buộc** (three r185). Nếu `getContext('webgl2')` thất bại ⇒ hiển thị màn hình hướng dẫn (song ngữ), không lỗi trắng trang. Lắng nghe `webglcontextlost`/`restored`: dừng vòng lặp, tái tạo texture/geometry dùng chung khi khôi phục, **giữ nguyên trạng thái store**.
2. **Chất lượng tự động** (`PerformanceMonitor` của drei + thăm dò ban đầu `renderer.capabilities`, `deviceMemory`, `hardwareConcurrency`, `pointer: coarse`): `low / medium / high`. Mặc định điện thoại = `medium` hoặc `low`; người dùng đổi tay được; lưu lựa chọn.
3. **Tiết kiệm pin/nhiệt:** `<Canvas frameloop="demand">` + `invalidate()` chỉ khi có thứ động (rót, phản ứng, đèn cồn, kéo, camera damping); cảnh tĩnh ⇒ 0 FPS. Bỏ `powerPreference:'high-performance'` trên thiết bị cảm ứng (dùng `default`). `dpr` giới hạn: low 1, medium 1.5, high 2. Tắt `antialias` khi dùng SMAA/FXAA.
4. **Ngân sách theo bậc:**

| | Low | Medium | High |
|---|---|---|---|
| Dòng chảy | ống 12 đoạn, không vỡ giọt shader, giọt tối đa 24 | 24 đoạn, giọt 64 | 32 đoạn, giọt 160 |
| Kính | alpha + Fresnel + env (giả) | transmission nửa độ phân giải | transmission đầy đủ |
| Bóng khí/bọt đồng thời | ≤ 120 | ≤ 400 | ≤ 1200 |
| Gợn mặt nước | texture tĩnh quay | shader 1 sóng | shader nhiều sóng + normal |
| Post FX | tắt | SMAA | Bloom + SMAA + AO nhẹ |
| Wall film / vũng lan | tắt/đơn giản | bật | bật + phản chiếu |

5. **Không dùng tính năng dễ lỗi:** kiểm tra `EXT_color_buffer_float`/`OES_texture_float_linear` trước khi dùng texture float (ưu tiên half-float hoặc mã hóa RGBA8); không dựa vào `highp` trong fragment trên GPU cũ (khai báo `precision highp float` có kiểm tra `getShaderPrecisionFormat`); tránh vòng lặp biến thiên trong shader; không dùng derivative nếu không cần.
6. **Giao diện responsive:** dưới 768 px hai sidebar thành **bottom sheet / drawer** có thể vuốt; HUD rót đặt trong vùng ngón cái; dùng `100dvh`, `env(safe-area-inset-*)`, `viewport-fit=cover`; không cuộn ngang ở 320 px; chữ ≥ 14 px; chạm ≥ 44–48 px; hỗ trợ xoay màn hình (resize + giữ camera).
7. **`prefers-reduced-motion`:** tắt rung camera/nhấp nháy, giảm dao động; **`prefers-color-scheme`** cho HUD (không đổi cảnh).
8. **Hiệu năng bộ nhớ:** vật liệu/geometry dùng chung, dispose đầy đủ; không rò khi rót 200 lần liên tiếp (`renderer.info.memory` ổn định).
9. **Tab ẩn/nền:** clamp `dt` tối đa 0.1 s, bước cố định có `substeps` giới hạn ⇒ quay lại tab không "nhảy vọt".
10. **Tai nghe/loa:** `AudioContext` chỉ tạo/resume sau tương tác đầu tiên (chính sách autoplay iOS); có nút tắt tiếng đã có (`soundEnabled`).

---

## 9. ÂM THANH & NGÔN NGỮ

- **`PourAudio`** (WebAudio, sinh bằng code): nhiễu trắng → băng thông; **cao độ tăng dần khi bình đích đầy** (cột không khí phía trên ngắn lại — âm "ục ục → rì rì" quen thuộc); biên độ theo `Q`; **glug** khi chai cổ hẹp; nhỏ giọt "tách" (sin ngắn + noise); rắn rơi nảy; chạm kính "tinh"; tràn "ào" ngắn. Tất cả pause/resume theo `isSimulationPaused`, tốc độ theo `timeScale`.
- Mọi chuỗi giao diện có `vi` và `en` (hàm `t()` hiện có); số theo `Intl.NumberFormat`.

---

## 10. MÔ HÌNH DỮ LIỆU (thêm, không phá)

```ts
type PourMode = 'HAND_TILT'|'ASSIST'|'STOCK_BOTTLE'|'DROPPER'|'SOLID'|'TABLE'|'ROD_GUIDED'|'FUNNEL';
interface PourSession {
  id: string; mode: PourMode;
  sourceId: string; targetId: string | null;
  tilt: number; targetTilt: number;       // rad
  lift: number;                            // 0..1
  requestedVolume_ml?: number;             // STOCK_BOTTLE / DROPPER
  transferred_ml: number; spilled_ml: number;
  flow_ml_s: number; wallClinging: boolean;
  aim: { landing: [number,number,number]; kind: 'inside'|'rim'|'table' };
  assist: 'off'|'low'|'high';
  startedAt: number;                       // thời gian mô phỏng, không phải Date.now
}
// store (thêm): pour: PourSession | null; beginPour(); setPourTilt(); setPourAssist(); endPour(); cancelPour();
// events: bus nhẹ (mitt-like) cho renderer/âm thanh/haptics
```
`cancelPour()` (undo, xóa bình, reset, đổi thí nghiệm) phải dọn sạch hạt/âm thanh và trả bình về tư thế gốc **mà không mất/dư thể tích**.

---

## 11. KIỂM THỬ & NGHIỆM THU

**Unit (vitest):** `segArea` (so tích phân số), `retainedVolume` (cylinder: đối chiếu công thức đóng), `solveLevel` (round-trip), weir `Q(h)` đơn điệu, `ballistics` (rơi tự do ↔ nghiệm giải tích), bảo toàn V/mol/khối lượng/nhiệt, trộn màu (A trộn với nước trong ⇒ A giảm đúng tỉ lệ), 10 000 kịch bản ngẫu nhiên không NaN.
**Tích hợp:** rót đủ 50 mL beaker→beaker: kết thúc `V_nguồn=0 ±0.01`, `V_đích=50 ±0.01`, phản ứng kích hoạt đúng **một lần** + một lần cuối; rót vào ống nghiệm ngắm lệch ⇒ vũng xuất hiện **đúng điểm rơi**; đích đầy ⇒ tràn qua vành, tổng bảo toàn; undo giữa chừng ⇒ không rò.
**E2E (Playwright, thiết bị giả lập):** Desktop Chrome/Firefox/WebKit, iPhone 14 (Safari), Pixel 7 (Chrome), iPad. Mỗi thiết bị chạy kịch bản: chọn bình → nghiêng → rót → kiểm trạng thái; chụp ảnh các mốc (0, 25, 50, 100 % tiến độ); so sánh ảnh (ngưỡng); không lỗi console; không cuộn ngang.
**Hiệu năng:** desktop tầm trung ≥ 55 FPS khi rót + phản ứng sủi; điện thoại tầm trung ≥ 30 FPS tier medium/low; thời gian từ chạm đến phản hồi hình ảnh < 100 ms; không rò bộ nhớ sau 200 lần rót; cảnh tĩnh ≈ 0 FPS (đo số frame trong 5 s).
**Trải nghiệm:** 100 mL rót hết trong 6–12 s ở tư thế thuận; người dùng mới rót thành công lần đầu không cần hướng dẫn (có gợi ý hiện ngắn, tắt được); mọi thao tác làm được **chỉ bằng một ngón tay** hoặc **chỉ bàn phím**.

---

## 12. CÁCH LÀM VIỆC

1. Đọc lại các file ở §1, ghi các sai khác vào `agent/NOTES.md`.
2. Làm theo thứ tự: **(1)** sửa lỗi cộng dồn & hook trong hệ B và C để có nền ổn định → **(2)** hàm vật lý thuần + test → **(3)** `PourController` + `store-bridge` + adapter cho API cũ → **(4)** input đa thiết bị → **(5)** render dòng chảy/va chạm/màng ướt → **(6)** chế độ chai gốc/ống nhỏ giọt/rắn → **(7)** âm thanh/haptics/HUD → **(8)** tối ưu theo bậc + kiểm thử thiết bị → **(9)** mode FUNNEL và ROD_GUIDED.
3. Sau mỗi bước: `lint`, `test`, `build`, chụp ảnh kiểm tra; commit nhỏ. Ghi lựa chọn kỹ thuật có đánh đổi vào `agent/DECISIONS.md`.
4. Thiếu thông tin về một chi tiết hình ảnh ⇒ chọn giá trị hợp lý, đặt thành hằng số có tên ở đầu file để chỉnh; chỉ hỏi lại khi bị chặn hẳn.
