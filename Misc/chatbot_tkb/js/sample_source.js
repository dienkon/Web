// ============================================================
// TRỢ LÝ TKB - LỚP 12A1
// ============================================================
// Chức năng:
// - Xem lịch chiều hôm nay
// - Xem lịch sáng ngày học kế tiếp
// - Báo chiều trống
// - Nhắc học bài nếu sáng hôm sau có môn lý thuyết
// - Ghi chú riêng cho từng tiết chiều
// - Tự nhận đúng thứ + ngày theo múi giờ Việt Nam
// ============================================================


// ============================================================
// 1. GHI CHÚ RIÊNG TỪNG TIẾT CHIỀU
// ============================================================
// Note được gắn theo SỐ TIẾT.
//
// Ví dụ:
// 1: "Mang đề cương"
// 2: ""
// 3: "Nhớ nộp bài"
// 4: "Mang áo thể dục"
// 5: ""
//
// Không có note -> để "".
// ============================================================

const GHI_CHU_CHIEU = {
  1: "",
  2: "",
  3: "",
  4: "",
  5: ""
};


// ============================================================
// 2. TKB BUỔI SÁNG + CHIỀU
// ============================================================

const TKB_JSON = [

  // =========================
  // THỨ HAI
  // =========================

  // Sáng
  {
    thu: 1,
    buoi: "sang",
    tiet: 1,
    mon: "SHĐT"
  },
  {
    thu: 1,
    buoi: "sang",
    tiet: 2,
    mon: "Tin"
  },
  {
    thu: 1,
    buoi: "sang",
    tiet: 3,
    mon: "Sử"
  },
  {
    thu: 1,
    buoi: "sang",
    tiet: 4,
    mon: "Sử"
  },
  {
    thu: 1,
    buoi: "sang",
    tiet: 5,
    mon: "Hóa"
  },

  // Chiều
  {
    thu: 1,
    buoi: "chieu",
    tiet: 2,
    mon: "TD"
  },
  {
    thu: 1,
    buoi: "chieu",
    tiet: 3,
    mon: "TD"
  },
  {
    thu: 1,
    buoi: "chieu",
    tiet: 4,
    mon: "ANQP"
  },


  // =========================
  // THỨ BA
  // =========================

  // Sáng
  {
    thu: 2,
    buoi: "sang",
    tiet: 1,
    mon: "Lí"
  },
  {
    thu: 2,
    buoi: "sang",
    tiet: 2,
    mon: "Sinh"
  },
  {
    thu: 2,
    buoi: "sang",
    tiet: 3,
    mon: "Sinh"
  },
  {
    thu: 2,
    buoi: "sang",
    tiet: 4,
    mon: "Tin"
  },
  {
    thu: 2,
    buoi: "sang",
    tiet: 5,
    mon: "HĐ1"
  },

  // Chiều: trống


  // =========================
  // THỨ TƯ
  // =========================

  // Sáng
  {
    thu: 3,
    buoi: "sang",
    tiet: 1,
    mon: "Toán"
  },
  {
    thu: 3,
    buoi: "sang",
    tiet: 2,
    mon: "Toán"
  },
  {
    thu: 3,
    buoi: "sang",
    tiet: 3,
    mon: "TA"
  },
  {
    thu: 3,
    buoi: "sang",
    tiet: 4,
    mon: "Lí"
  },
  {
    thu: 3,
    buoi: "sang",
    tiet: 5,
    mon: "Lí"
  },

  // Chiều: trống


  // =========================
  // THỨ NĂM
  // =========================

  // Sáng
  {
    thu: 4,
    buoi: "sang",
    tiet: 1,
    mon: "Toán"
  },
  {
    thu: 4,
    buoi: "sang",
    tiet: 2,
    mon: "Toán"
  },
  {
    thu: 4,
    buoi: "sang",
    tiet: 3,
    mon: "Hóa"
  },
  {
    thu: 4,
    buoi: "sang",
    tiet: 4,
    mon: "Hóa"
  },
  {
    thu: 4,
    buoi: "sang",
    tiet: 5,
    mon: "Lí"
  },

  // Chiều: trống


  // =========================
  // THỨ SÁU
  // =========================

  // Sáng
  {
    thu: 5,
    buoi: "sang",
    tiet: 1,
    mon: "HĐ2"
  },
  {
    thu: 5,
    buoi: "sang",
    tiet: 2,
    mon: "TA"
  },
  {
    thu: 5,
    buoi: "sang",
    tiet: 3,
    mon: "TA"
  },
  {
    thu: 5,
    buoi: "sang",
    tiet: 4,
    mon: "Văn"
  },
  {
    thu: 5,
    buoi: "sang",
    tiet: 5,
    mon: "Văn"
  },

  // Chiều: trống


  // =========================
  // THỨ BẢY
  // =========================

  // Sáng
  {
    thu: 6,
    buoi: "sang",
    tiet: 1,
    mon: "Toán"
  },
  {
    thu: 6,
    buoi: "sang",
    tiet: 2,
    mon: "Văn"
  },
  {
    thu: 6,
    buoi: "sang",
    tiet: 3,
    mon: "Văn"
  },
  {
    thu: 6,
    buoi: "sang",
    tiet: 4,
    mon: "HĐ3"
  },
  {
    thu: 6,
    buoi: "sang",
    tiet: 5,
    mon: "SHL"
  }

  // Chiều: trống
];


// ============================================================
// 3. GIỜ CHIỀU
// ============================================================

const GIO_CHIEU = {
  1: {
    batDau: "12:45",
    ketThuc: "13:30"
  },

  2: {
    batDau: "13:35",
    ketThuc: "14:20"
  },

  3: {
    batDau: "14:40",
    ketThuc: "15:25"
  },

  4: {
    batDau: "15:30",
    ketThuc: "16:15"
  },

  5: {
    batDau: "16:25",
    ketThuc: "17:10"
  }
};


// ============================================================
// 4. MÔN LÝ THUYẾT
// ============================================================
// Chỉ dùng để quyết định có hiện "Nhớ ôn bài" hay không.
// Không liệt kê môn ra phần nhắc.
// ============================================================

const MON_LY_THUYET = [
  "Lí",
  "TA",
  "Sử",
  "Văn",
  "Sinh",
  "Hóa"
];


// ============================================================
// 5. CẤU HÌNH
// ============================================================

const TIMEZONE = "Asia/Ho_Chi_Minh";

const TAT_CA_TIET_CHIEU = [
  1,
  2,
  3,
  4,
  5
];

const TEN_THU = {
  0: "Chủ Nhật",
  1: "Thứ Hai",
  2: "Thứ Ba",
  3: "Thứ Tư",
  4: "Thứ Năm",
  5: "Thứ Sáu",
  6: "Thứ Bảy"
};

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};


// ============================================================
// 6. HÀM LẤY THÔNG TIN NGÀY THEO TIMEZONE
// ============================================================

function getDateParts(date) {

  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short"
    }).formatToParts(date);

  return Object.fromEntries(
    parts.map(part => [
      part.type,
      part.value
    ])
  );
}


// ============================================================
// 7. HÀM LẤY TKB
// ============================================================

function getSchedule(thu, buoi) {

  return TKB_JSON
    .filter(item =>
      Number(item.thu) === Number(thu) &&
      item.buoi === buoi
    )
    .sort((a, b) =>
      Number(a.tiet) - Number(b.tiet)
    );
}


// ============================================================
// 8. ESCAPE JSON
// ============================================================

function escapeJsonString(text) {

  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}


// ============================================================
// 9. THỜI GIAN HIỆN TẠI
// ============================================================

const now = new Date();

const currentParts =
  getDateParts(now);


// ============================================================
// 10. XÁC ĐỊNH THỨ HÔM NAY
// ============================================================

const thuHienTai =
  WEEKDAY_MAP[currentParts.weekday];


// ============================================================
// 11. NGÀY HÔM NAY
// ============================================================

const ngayHienTai =
  `${currentParts.day}/${currentParts.month}/${currentParts.year}`;


// ============================================================
// 12. TÍNH THỨ CỦA NGÀY HỌC KẾ TIẾP
// ============================================================
// Cực kỳ quan trọng:
//
// Thứ Hai  = 1 -> Thứ Ba    = 2
// Thứ Ba   = 2 -> Thứ Tư    = 3
// Thứ Tư   = 3 -> Thứ Năm   = 4
// Thứ Năm  = 4 -> Thứ Sáu   = 5
// Thứ Sáu  = 5 -> Thứ Bảy   = 6
// Thứ Bảy  = 6 -> Thứ Hai   = 1
// Chủ Nhật = 0 -> Thứ Hai   = 1
// ============================================================

let thuNgayMai;

if (thuHienTai === 6) {

  // Thứ Bảy -> Thứ Hai
  thuNgayMai = 1;

} else if (thuHienTai === 0) {

  // Chủ Nhật -> Thứ Hai
  thuNgayMai = 1;

} else {

  // Thứ Hai -> Thứ Ba
  // Thứ Ba -> Thứ Tư
  // ...
  // Thứ Sáu -> Thứ Bảy
  thuNgayMai = thuHienTai + 1;
}


// ============================================================
// 13. TÍNH NGÀY CỤ THỂ CỦA NGÀY HỌC KẾ TIẾP
// ============================================================
// Không tự tính thứ bằng ngày tháng.
// Dùng Date để đảm bảo ngày/thứ đồng bộ.
// ============================================================

const todayISO =
  `${currentParts.year}-${currentParts.month}-${currentParts.day}`;


// Dùng 12:00 để tránh lỗi chuyển ngày do DST/timezone
const baseDate =
  new Date(`${todayISO}T12:00:00+07:00`);

let daysToAdd = 1;

if (thuHienTai === 6) {

  // Thứ Bảy -> Thứ Hai
  daysToAdd = 2;

} else {

  // Các ngày khác -> ngày kế tiếp
  daysToAdd = 1;
}


const nextDate =
  new Date(
    baseDate.getTime() +
    daysToAdd * 86400000
  );


// Lấy thông tin ngày kế tiếp từ chính Date đó
const nextParts =
  getDateParts(nextDate);


// ============================================================
// 14. KIỂM TRA AN TOÀN THỨ / NGÀY
// ============================================================
// thuKeThucTe lấy từ nextDate.
// Dùng giá trị này thay vì tin tuyệt đối vào phép cộng ở trên.
// ============================================================

const thuKeThucTe =
  WEEKDAY_MAP[nextParts.weekday];


// ============================================================
// 15. GÁN THỨ NGÀY KẾ TIẾP CHUẨN
// ============================================================

const thuKeTiep =
  thuKeThucTe;

const ngayKeTiep =
  `${nextParts.day}/${nextParts.month}/${nextParts.year}`;


// ============================================================
// 16. LẤY LỊCH CHIỀU HÔM NAY
// ============================================================

const tietChieuHomNay =
  getSchedule(
    thuHienTai,
    "chieu"
  );


// ============================================================
// 17. LẤY LỊCH SÁNG NGÀY HỌC KẾ TIẾP
// ============================================================

const tietSangKeTiep =
  getSchedule(
    thuKeTiep,
    "sang"
  );


// ============================================================
// 18. TÌM TIẾT CHIỀU TRỐNG
// ============================================================
// Vẫn tính để Make có thể dùng.
// Nhưng KHÔNG hiển thị từng tiết trống trong message.
// ============================================================

const tietDaCo =
  new Set(
    tietChieuHomNay.map(item =>
      Number(item.tiet)
    )
  );

const tietChieuTrong =
  TAT_CA_TIET_CHIEU.filter(
    tiet => !tietDaCo.has(tiet)
  );


// ============================================================
// 19. KIỂM TRA CÓ MÔN LÝ THUYẾT NGÀY HỌC KẾ TIẾP
// ============================================================
// Chỉ cần biết có hay không.
// Không lấy tên môn để spam message.
// ============================================================

const coMonLyThuyetNgayMai =
  tietSangKeTiep.some(item =>
    MON_LY_THUYET.includes(item.mon)
  );


// ============================================================
// 20. BẮT ĐẦU MESSAGE
// ============================================================

let message =
  `☀️ LỊCH HỌC CHIỀU NAY\n` +
  `📅 ${TEN_THU[thuHienTai]}, ${ngayHienTai}`;


// ============================================================
// 21. CHIỀU HÔM NAY
// ============================================================

message +=
  `\n\n━━━━━━━━━━━━━━` +
  `\n📚 CHIỀU NAY`;


if (tietChieuHomNay.length === 0) {

  // Không liệt kê tiết 1,2,3,4,5
  message +=
    `\n🎉 Chiều nay trống!`;

} else {

  for (const item of tietChieuHomNay) {

    const tiet =
      Number(item.tiet);

    const gio =
      GIO_CHIEU[tiet];

    // Tên môn
    message +=
      `\n\n📖 Tiết ${tiet} — ${item.mon}`;

    // Giờ
    if (gio) {

      message +=
        `\n🕐 ${gio.batDau} → ${gio.ketThuc}`;
    }

    // Phòng
    if (
      typeof item.phong === "string" &&
      item.phong.trim() !== ""
    ) {

      message +=
        `\n🏫 ${item.phong.trim()}`;
    }

    // Giáo viên
    if (
      typeof item.giaoVien === "string" &&
      item.giaoVien.trim() !== ""
    ) {

      message +=
        `\n👨🏫 ${item.giaoVien.trim()}`;
    }

    // ========================================================
    // NOTE RIÊNG CỦA TIẾT
    // ========================================================

    const noteThuCong =
      typeof GHI_CHU_CHIEU[tiet] === "string"
        ? GHI_CHU_CHIEU[tiet].trim()
        : "";

    // Ưu tiên note thủ công
    if (noteThuCong) {

      message +=
        `\n📝 ${noteThuCong}`;

    } else if (
      typeof item.ghiChu === "string" &&
      item.ghiChu.trim() !== ""
    ) {

      // Nếu TKB có ghiChu thì dùng fallback
      message +=
        `\n📝 ${item.ghiChu.trim()}`;
    }
  }
}


// ============================================================
// 22. LỊCH SÁNG NGÀY HỌC KẾ TIẾP
// ============================================================

message +=
  `\n\n━━━━━━━━━━━━━━` +
  `\n📚 SÁNG ${TEN_THU[thuKeTiep].toUpperCase()}` +
  `\n📅 ${ngayKeTiep}`;


if (tietSangKeTiep.length === 0) {

  message +=
    `\n🎉 Không có tiết học buổi sáng.`;

} else {

  for (const item of tietSangKeTiep) {

    message +=
      `\n\n📖 Tiết ${item.tiet} — ${item.mon}`;
  }
}


// ============================================================
// 23. NHẮC HỌC BÀI
// ============================================================
// Chỉ nhắc chung.
// Không:
// - Liệt kê môn
// - Liệt kê tiết
// - Gán môn vào tiết trống
// ============================================================

if (coMonLyThuyetNgayMai) {

  message +=
    `\n\n━━━━━━━━━━━━━━` +
    `\n📖 NHẮC HỌC BÀI` +
    `\n👉 Nhớ tranh thủ ôn bài cho ngày mai nhé!`;
}


// ============================================================
// 24. KẾT
// ============================================================

message +=
  `\n\n🎒 Chuẩn bị sách vở trước khi đi học nhé!`;


// ============================================================
// 25. ESCAPE CHO MAKE / JSON
// ============================================================

const jsonSafeMessage =
  escapeJsonString(message);


// ============================================================
// 26. OUTPUT
// ============================================================

result = {

  // Message dạng đã escape
  data:
    jsonSafeMessage,

  // Message gốc
  message:
    message,

  // ==========================================================
  // HÔM NAY
  // ==========================================================

  thu:
    thuHienTai,

  tenThu:
    TEN_THU[thuHienTai],

  ngay:
    ngayHienTai,

  // ==========================================================
  // NGÀY HỌC KẾ TIẾP
  // ==========================================================

  thuKeTiep:
    thuKeTiep,

  tenThuKeTiep:
    TEN_THU[thuKeTiep],

  ngayKeTiep:
    ngayKeTiep,

  // ==========================================================
  // CHIỀU
  // ==========================================================

  soTietChieu:
    tietChieuHomNay.length,

  soTietChieuTrong:
    tietChieuTrong.length,

  // Danh sách này vẫn giữ cho Make nếu cần
  // Không hiển thị trực tiếp trong message.
  tietChieuTrong:
    tietChieuTrong.join(", "),

  // ==========================================================
  // HỌC BÀI
  // ==========================================================

  coMonLyThuyetNgayMai:
    coMonLyThuyetNgayMai
};
