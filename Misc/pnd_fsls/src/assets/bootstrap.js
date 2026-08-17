// Luồng thoát độc lập với Firebase module, để nút Thoát luôn hoạt động.
window.PND_BUILD = "5.33.4";

// Tinh chỉnh select khảo sát ngay từ khung giao diện đầu tiên. Vẫn dùng
// native <select> để giữ khả năng truy cập và bàn phím, chỉ thay lớp trình bày.
function syncRankingEventSelect() {
  const select = document.getElementById("ranking-event-select");
  const shell = select?.closest(".ranking-event-select-shell");
  const helper = document.getElementById("ranking-event-helper");
  if (!select || !shell) return;

  const hasEvent = Array.from(select.options).some(
    (option) => String(option.value || "").trim().length > 0,
  );
  const loading = Array.from(select.options).some((option) =>
    String(option.textContent || "").toLowerCase().includes("đang tải"),
  );
  if (select.disabled === hasEvent) select.disabled = !hasEvent;
  shell.classList.toggle("is-empty", !hasEvent);
  const busyValue = loading ? "true" : "false";
  if (select.getAttribute("aria-busy") !== busyValue)
    select.setAttribute("aria-busy", busyValue);
  if (helper) {
    helper.textContent = loading
      ? "Đang tải danh sách khảo sát…"
      : hasEvent
        ? "Chọn một khảo sát để xem thành tích và thứ hạng."
        : "Chưa có khảo sát nào được công bố.";
  }
}

function watchRankingEventSelect() {
  syncRankingEventSelect();
  const select = document.getElementById("ranking-event-select");
  if (!select || select.dataset.pndUiReady === "1") return;
  select.dataset.pndUiReady = "1";
  new MutationObserver(syncRankingEventSelect).observe(select, {
    childList: true,
    subtree: true,
  });
  select.addEventListener("change", syncRankingEventSelect);
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", watchRankingEventSelect, {
    once: true,
  });
else watchRankingEventSelect();

// Tải mã xóa dữ liệu chỉ khi Admin bấm nút, không làm tăng thời gian tải trang.
window.xoaTatCaBaiNop = async function () {
  try {
    const tools = await import(
      new URL("assets/admin-grading-tools.js", document.baseURI).href,
    );
    return await tools.xoaTatCaBaiNop();
  } catch (error) {
    console.error("Không tải được công cụ quản lý bài nộp:", error);
    if (window.Swal)
      await Swal.fire(
        "Không thể mở thao tác",
        "Hãy tải lại trang rồi thử lại.",
        "error",
      );
  }
};
window.thoatPhongThi = async function () {
  if (window.phienThiDangNop) {
    if (window.Swal) {
      await Swal.fire({
        icon: "info",
        title: "Đang nộp bài",
        text: "Vui lòng chờ hệ thống xác nhận lưu bài.",
        confirmButtonColor: "#8C5F3B",
      });
    } else {
      alert("Đang nộp bài. Vui lòng chờ hệ thống xác nhận.");
    }
    return;
  }

  const coPhienMayChu = Boolean(
    window.phienThiHienTai && window.phienThiHienTai.status === "dang_lam",
  );
  let dongYThoat = false;
  if (window.Swal) {
    const ketQua = await Swal.fire({
      icon: "warning",
      title: "Thoát khỏi bài thi?",
      text: coPhienMayChu
        ? "Bạn có thể vào lại sau, nhưng đồng hồ vẫn tiếp tục tính theo giờ máy chủ."
        : "Bài làm hiện tại sẽ không được nộp và các câu đã chọn sẽ bị xóa.",
      showCancelButton: true,
      confirmButtonText: "Thoát bài thi",
      cancelButtonText: "Tiếp tục làm",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#8C5F3B",
      allowOutsideClick: false,
    });
    dongYThoat = ketQua.isConfirmed;
  } else {
    dongYThoat = window.confirm(
      coPhienMayChu
        ? "Thoát tạm thời? Khi vào lại, đồng hồ vẫn tiếp tục tính."
        : "Thoát khỏi bài thi? Bài làm hiện tại sẽ bị xóa.",
    );
  }
  if (!dongYThoat) return;

  // Ưu tiên bộ dọn phiên đầy đủ; nếu module lỗi thì vẫn có lớp dự phòng bên dưới.
  if (typeof window.ketThucPhienThi === "function") {
    if (coPhienMayChu && typeof window.luuBanNhapBaiThi === "function")
      window.luuBanNhapBaiThi();
    window.ketThucPhienThi("exams", {
      giuBanNhap: coPhienMayChu,
      giuPhienMayChu: coPhienMayChu,
    });
    if (typeof window.taiDanhSachDeThi === "function")
      await window.taiDanhSachDeThi();
    return;
  }

  if (window.dongHoDemNguoc) clearInterval(window.dongHoDemNguoc);
  if (window.vongLapQuetGianLan) clearInterval(window.vongLapQuetGianLan);
  window.antiCheatDangBat = false;
  document.body.style.userSelect = "auto";
  if (typeof window.giaiPhongKhoaTabThi === "function")
    window.giaiPhongKhoaTabThi();
  [
    "deThiDangLam_ID",
    "deThiDangLam_DapAn",
    "deThiDangLam_BatDau",
    "deThiDangLam_HanChot",
  ].forEach((khoa) => localStorage.removeItem(khoa));
  window.location.href = "pnd_master.html?build=5.33.4";
};