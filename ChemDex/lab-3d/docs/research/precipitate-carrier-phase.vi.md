# Kết tủa cần có carrier lỏng trước khi dùng liquid transport

## Lỗi và phân biệt trạng thái

Fluid helper trước đây luôn có reference viscosity/density ngay cả khi contents không còn liquid. Geometry surface còn có thể cao hơn đáy do occupied solid/ice volume. Vì vậy một bình cạn nước vẫn có thể phát glyph kết tủa, nhận liquid Brownian/drag và agitation entrainment như đang có nước. Zero liquid volume làm target cloudiness bằng0 nhưng smoothing có thể giữ haze cũ; nó chưa ngăn particle dynamics sai môi trường.

Vòng này truyền **carrier mode theo phase inventory**, không chỉ nhìn fill height hoặc nhiệt độ. Giữ nguyên chemical solid inventory: không dissolve, tạo thêm solvent, chuyển chemical phase hay debit nhiệt qua particle renderer.

## Phân loại bulk carrier

`suspensionFluidProperties(contents,volume_ml,T_c)` thêm carrierMode, carrierModel và liquidMass_g. Known liquid là positive finite bulk rows phase l/aq. Water-ice là positive bulk H2O phase s. Filter/foam-held material và gas không trở thành bulk carrier.

|Mode|Điều kiện và ý nghĩa|
|---|---|
|liquid|Có positive liquid volume và known liquid mass; slush có cả nước lỏng/băng vẫn dùng bulk liquid approximation|
|frozen-matrix|Không có positive liquid carrier nhưng có explicit bulk water ice|
|dry-residue|Không có liquid carrier và không có water-ice matrix|

Legacy positive-volume snapshots có unknown phase giữ liquid proxy và model=unknown-phase-liquid-proxy. Không suy diễn rằng bare H2O luôn là ice/dry chỉ vì thiếu phase. Unknown mixtures/phase data chưa được xác minh bởi mode này. Numeric viscosity/density reference fields vẫn có thể tồn tại cho diagnostics; sự tồn tại một fallback number không cho phép liquid force chạy trong dry/frozen mode.

## PrecipitationSystem và chuyển trạng thái

`PrecipitationSimulationParams.carrierMode` là optional enum liquid/dry-residue/frozen-matrix. Manager luôn truyền kết quả từ post-thermal contents/volume. Direct legacy calls không có mode dùng dry-residue khi explicit volume_ml=0, còn lại giữ liquid compatibility; caller biết có ice phải truyền frozen-matrix để không dùng dry projection.

Trong dry-residue mode, model biểu diễn **bulk dry residue** bằng sediment bed có đúng declared target mass. Existing particles và pending reservoirs chuyển sang bed, liquid cloudiness và agitation entrainment về0, geometry thickness dùng cùng density/profile function của liquid bed. Không gọi liquid flow/Brownian/drag hoặc phát glyph suspension. Đây là một coarse dry-bed projection, không phải nghiệm đường bay aerosol, adhesion lên kính hoặc động lực powder deposition. Các material locations khác đã được excluded trước đó, không bị kéo về bulk qua branch này.

Trong frozen-matrix mode, giữ existing particle positions và toàn lượng rắn/pending/bed; triệt tiêu particle velocity, tăng age theo elapsed time, không emit hay dùng liquid transport/entrainment. Liquid cloudiness về0; ice appearance thuộc phase renderer khác. Chất rắn mới được chemistry khai báo vẫn có trong reservoir, không trở thành liquid nucleation giả. Khi liquid carrier trở lại, transport/pending sampling tiếp tục từ state giữ lại.

Không tuyên bố freeze luôn engulf particles tại chỗ. [NASA — Particle Engulfment and Pushing by Solidifying Interfaces](https://ntrs.nasa.gov/api/citations/20150019322/downloads/20150019322.pdf) mô tả việc mặt đông đặc có thể đẩy hoặc giữ hạt tùy điều kiện interface. Vì ứng dụng chưa giải front velocity/geometry/interfacial data, frozen-matrix là **held unresolved representation**, không suy ra particle redistribution từ một bulk temperature. Không mô phỏng hạt lắng qua băng bằng Stokes-water làm phương án thay thế.

Khi thêm lại liquid vào dry bed, bed không tự biến thành suspended glyphs. Chemistry có thể dissolve theo ledger riêng; stirring dùng finite entrainment closure hiện có để chuyển mass bed→suspension. Không reset đồng hồ để che phase transition; FIFO snapshots của vòng trước giữ mode và source amount đúng interval đã nhận.

## API theo ID và kiểm chứng

`effects.forVessel(id).inspect().state.suspensionCarrier` cho current inventory classification `{mode,model,liquidMass_g}`. `precipitationTiming[].carrierMode` là mode **đã tích phân** của từng species system, có thể chậm hơn current inventory khi có exceptional backlog; pendingTime_s công khai độ trễ. Inspect không tạo apparatus hoặc manager.

Manager cũng chỉ chạy underwater bubble glyphs khi carrierMode=liquid. Known dry/frozen inventory thắng một positive legacy occupied/display volume: không giữ bọt cũ hoặc tạo reaction bubbles như thể đang ngập trong nước. Đây là hủy display state khi mất liquid domain, không xóa gas inventory hoặc coi khí phản ứng đã biến mất. Gas/phase ledger và external gas visual routes tiếp tục sở hữu lượng chất của chúng; chưa bổ sung gas-pocket transport trong ice hoặc dry powder.

11 test mới kiểm tra phase classification/slush, gas/filter exclusion, unknown-phase legacy proxy, wet→dry finite bed/no liquid forces/clock continuity, standalone zero volume, dry→liquid không tự resuspend rồi finite stirring, frozen hold→thaw, solid reservoir trong matrix, actual manager/inspect đúngID không sửa ledger, và reset/không phát bọt trong dry/frozen samples còn positive legacy volume. Các assertion mass/clock không được nới để xử lý dry/frozen branch.

Chưa có particle rejection/engulfment front, slush obstacle field, dry granular/aerosol/adhesion transport, validated solvent transport, measured particle distributions/drag hoặc GPU visual QA. Mode labels không làm những phần đó thành mô hình đã được hiệu chuẩn. Toàn mục tiêu chưa đạt.

Kết quả bản cuối: **165 file,1906/1906 test đạt trong98.17s**, TypeScript/lint, production build và diff whitespace check đạt. Không tăng timeout/tolerance. Vite còn cảnh báo chunk lớn; chưa có empirical calibration hoặc GPU visual proof cho dry/frozen representation.
