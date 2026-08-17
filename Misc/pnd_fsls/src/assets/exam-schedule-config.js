// Cấu hình lịch thi dùng chung cho phần đếm ngược và danh sách môn thi.
// Khi lịch chính thức thay đổi, chỉ cần cập nhật tệp này.
window.PND_EXAM_SCHEDULE = Object.freeze({
  examLabel: "kỳ thi THPT 2027",
  headline: "Đếm ngược ngày thi tốt nghiệp THPT 2027",
  subtitle: "Lịch dự kiến • Khối A00",
  scheduleHeading: "Lịch thi tổng quan 2027 (Dự kiến)",
  schoolYearStartsAt: "2026-09-05T00:00:00+07:00",
  schoolYearStartLabel: "05/09/2026",
  targetExamId: "ngu-van",
  targetAt: "2027-06-11T07:30:00+07:00",
  exams: Object.freeze([
    Object.freeze({
      id: "ngu-van",
      name: "Ngữ văn",
      day: "11",
      monthLabel: "TH6",
      displayDate: "11/6/2027",
      time: "07:30",
      durationLabel: "120 phút",
      status: "Đang đếm ngược",
    }),
    Object.freeze({
      id: "toan",
      name: "Toán",
      day: "11",
      monthLabel: "TH6",
      displayDate: "11/6/2027",
      time: "14:20",
      durationLabel: "90 phút",
    }),
    Object.freeze({
      id: "tu-chon",
      name: "Bài thi Tự chọn (Vật lý/Hóa học)",
      day: "12",
      monthLabel: "TH6",
      displayDate: "12/6/2027",
      time: "07:30",
      durationLabel: "50 phút/môn",
    }),
  ]),
});