# Tiếp xúc, hợp nhất và hồi lưu theo chiều dài dọc thành bình

## Lỗi đã tái hiện

Transport dùng metric của thành nghiêng để tính vận tốc trượt nhưng dùng `y−contactRadius/scale` để xét chạm mặt nước. Điều này lấy contact radius nằm trên thành làm độ cao thẳng đứng, khiến giọt trên thành dốc bị return sớm. Evaporation/condensation recipient selection dùng cùng phép chiếu nên cũng có thể coi một giọt thực tế còn lộ ra là đã ngập.

Ngoài ra, coalescence xảy ra sau drainage check. Hai giọt nhỏ chưa chạm biên có thể nhập thành giọt có footprint lớn hơn, đã chạm biên, nhưng không được return cho tới bước sau. Trước sửa, reproducer với hai pinned caps1e−6g, center cách biên1.1 contact radius, sau một substep giữ2e−6g trên thành; trường hợp sloped wall r'=3 lại return1e−6g dù footprint chưa tới mặt nước.

## Hình học và tọa độ

[OpenStax Calculus3](https://openstax.org/books/calculus-volume-3/pages/6-6-surface-integrals) cho parametrization của surface of revolution. Với profile ứng dụng `X(y,theta)=[r(y)cos(theta),y,r(y)sin(theta)]`, đạo hàm trực tiếp cho

`ds² = (1+r'(y)²)dy² + r(y)²dtheta²`.

Phần meridian có `dS=sqrt(1+r'²)dy`. Trong mỗi straight contour segment, S(y) tuyến tính; cộng các đoạn cho chiều dài dọc thành chính xác của polyline. Đây là suy dẫn hình học của ứng dụng, không phải dữ liệu wetting/drag do nguồn công bố.

`wallSurfaceSection(points,y)` nay trả thêm `meridian` bên cạnh radius/slope/metric. `wallHeightAtMeridian(points,S)` là inverse piecewise-linear. Hai hàm dùng scene units, bỏ horizontal floor/rim faces như contourWallArea hiện có; ngoài contour dùng first/last metric extension như section lookup. Không gọi metric tại midpoint làm đại diện cho cả đoạn khi đi qua corner khác độ dốc.

Mọi chuyển m↔scene dùng `METERS_PER_SCENE_UNIT` từ code hiện tại (0.035m/scene tại vòng này), không nhúng một scale cũ vào test/geometry. Không thay global display scale hoặc profile calibration.

## Các hàm transport thay đổi

Với contact radius a_m, biên dưới y_b:

`touchesBottom = y<=y_b || S(y)−S(y_b) <= a_m/scale + geometryTolerance`.

Tolerance1e−10 ở scene arc coordinate giữ vai trò numerical geometry tolerance hiện có, không làm cutoff khối lượng. Predicate được dùng nhất quán cho initial inner contact, wet-condensation recipients, exposed evaporation và post-motion contact.

Khi receiver nhận được một phần, finite remainder được đặt tiếp tuyến với biên tại `y=S_inverse(S(y_b)+a_remaining/scale)`. Trên slope3, phần tăng độ cao là a_scene/sqrt(10), không phải a_scene. Không nâng giọt quá xa khỏi mặt nước hoặc xóa remainder khi receiver đầy.

Coalescence dùng `sqrt((r_mid*dtheta_short)²+(S_b−S_a)²)` cho overlap và mass-weighted S centroid, rồi inverse về y. Seam theta tiếp tục dùng periodic short arc. Meridian component là exact polyline arc; azimuth component vẫn là local product-metric approximation với representative midpoint radius. Đây **chưa** là geodesic solver cho giọt lớn, curved cap/contact line hoặc sharp-corner wetting.

Ngay sau merge, refresh contact radius và sliding flag theo mass/geometry mới, kiểm tra footprint và admit drainage trong cùng substep. Không tích phân thêm một dt chuyển động cho giọt mới nhập. Nếu drained hết thì thoát pair loop của site đó để không dùng một empty site hút giọt kế tiếp. Admission callback nhận đúng requested/cumulative mass/sensible energy/filmT; retained water và energy counters giữ finite receipts như trước.

Mass transfer/thermal models và declared mobility limits của vòng viscosity giữ paths riêng. Không tạo vapor/solid hoặc sample mới qua sự kiện hình học. Film temperature chung của transport được dùng cho drain enthalpy; chưa giải riêng nhiệt độ mỗi cap hoặc heat release của coalescence.

## Kiểm chứng và giới hạn

11 test mới kiểm tra tổng độ dài qua corner, inverse/cylinder/frustum/end extension, không return sớm trên slope, actual contact và drain sensible energy, partial admission/tangent remainder không nhảy lại, exposed drying, post-merge same-step return/no replay, finite rejected remainder, đúng một admission receipt, không false merge qua steep corner và mass-weighted S centroid. Fixtures dùng scale import từ source, không hardcode0.05m.

Targeted wall transport/finite wet condensation/finite evaporation giữ54 test đạt trước full suite. Assertions mass/enthalpy và admission không bị nới để đổi geometry. Renderer frame dùng section scalar như trước, không tạo bình/manager hoặc global geometry state. Các cache vẫn scoped transport call và bounded exact-y lookup.

Chưa mô hình hóa coalescence inertia/energy/contact-line dynamics, wetting qua horizontal rim faces, exact2D geodesics, glass/frost/headspace hoặc GPU visual QA. Fixed contact angles, cap-density approximation và nominal drag/speed vẫn cần calibration. Toàn mục tiêu chưa đạt.

Kết quả cuối: **162 file,1877/1877 test đạt trong90.37s**, TypeScript/lint, production build và diff whitespace check đạt. Không tăng timeout hoặc nới conservation assertions; Vite còn chunk warning. Tài liệu convection cũng bỏ scale0.05m cũ, trỏ tới source constant hiện tại0.035m; không thay scale trong runtime.

Cập nhật vòng sau: [wall-drop-advection.vi.md](./wall-drop-advection.vi.md) thay y-Euler motion bằng corner-event splitting theo actual remaining time của quasi-steady closure. Contact geometry và admission ở vòng này tiếp tục sở hữu mass/energy receipts.
