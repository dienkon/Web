/**
 * Central State Store & Extended Color System
 */

export const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/60",
    text: "text-blue-900 dark:text-blue-100",
    accent: "bg-blue-500",
    hex: "#3b82f6",
    name: "Xanh dương",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800/60",
    text: "text-sky-900 dark:text-sky-100",
    accent: "bg-sky-500",
    hex: "#0ea5e9",
    name: "Xanh trời",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-cyan-200 dark:border-cyan-800/60",
    text: "text-cyan-900 dark:text-cyan-100",
    accent: "bg-cyan-500",
    hex: "#06b6d4",
    name: "Xanh lơ (Cyan)",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-200 dark:border-teal-800/60",
    text: "text-teal-900 dark:text-teal-100",
    accent: "bg-teal-500",
    hex: "#14b8a6",
    name: "Xanh mòng két",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    text: "text-emerald-900 dark:text-emerald-100",
    accent: "bg-emerald-500",
    hex: "#10b981",
    name: "Lục bảo",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800/60",
    text: "text-green-900 dark:text-green-100",
    accent: "bg-green-500",
    hex: "#22c55e",
    name: "Xanh lá",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  lime: {
    bg: "bg-lime-50 dark:bg-lime-950/40",
    border: "border-lime-200 dark:border-lime-800/60",
    text: "text-lime-900 dark:text-lime-100",
    accent: "bg-lime-500",
    hex: "#84cc16",
    name: "Chanh cốm",
    badge: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-200 dark:border-yellow-800/60",
    text: "text-yellow-900 dark:text-yellow-100",
    accent: "bg-yellow-500",
    hex: "#eab308",
    name: "Vàng chanh",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
    text: "text-amber-900 dark:text-amber-100",
    accent: "bg-amber-500",
    hex: "#f59e0b",
    name: "Hổ phách",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800/60",
    text: "text-orange-900 dark:text-orange-100",
    accent: "bg-orange-500",
    hex: "#f97316",
    name: "Cam tươi",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
    text: "text-rose-900 dark:text-rose-100",
    accent: "bg-rose-500",
    hex: "#f43f5e",
    name: "Hồng đào",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800/60",
    text: "text-red-900 dark:text-red-100",
    accent: "bg-red-500",
    hex: "#ef4444",
    name: "Đỏ tươi",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-800/60",
    text: "text-pink-900 dark:text-pink-100",
    accent: "bg-pink-500",
    hex: "#ec4899",
    name: "Hồng phấn",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  },
  fuchsia: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    border: "border-fuchsia-200 dark:border-fuchsia-800/60",
    text: "text-fuchsia-900 dark:text-fuchsia-100",
    accent: "bg-fuchsia-500",
    hex: "#d946ef",
    name: "Hồng tím",
    badge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800/60",
    text: "text-purple-900 dark:text-purple-100",
    accent: "bg-purple-500",
    hex: "#a855f7",
    name: "Tím mộng",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800/60",
    text: "text-violet-900 dark:text-violet-100",
    accent: "bg-violet-500",
    hex: "#8b5cf6",
    name: "Tím violet",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800/60",
    text: "text-indigo-900 dark:text-indigo-100",
    accent: "bg-indigo-500",
    hex: "#6366f1",
    name: "Chàm",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-800 dark:text-slate-200",
    accent: "bg-slate-500",
    hex: "#64748b",
    name: "Xám đá (Slate)",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  stone: {
    bg: "bg-stone-100 dark:bg-stone-800/60",
    border: "border-stone-300 dark:border-stone-700",
    text: "text-stone-800 dark:text-stone-200",
    accent: "bg-stone-500",
    hex: "#78716c",
    name: "Xám cuội (Stone)",
    badge: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  },
  neutral: {
    bg: "bg-zinc-100 dark:bg-zinc-800/60",
    border: "border-zinc-300 dark:border-zinc-700",
    text: "text-zinc-800 dark:text-zinc-200",
    accent: "bg-zinc-500",
    hex: "#71717a",
    name: "Trung tính",
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

/**
 * Returns safe styling object for a given color key or custom HEX
 */
export function getColorConfig(colorKeyOrHex) {
  if (!colorKeyOrHex) return COLOR_MAP.blue;
  if (COLOR_MAP[colorKeyOrHex]) return COLOR_MAP[colorKeyOrHex];

  // If user provided a custom hex like #10b981 or rgb
  if (typeof colorKeyOrHex === "string" && colorKeyOrHex.startsWith("#")) {
    const hex = colorKeyOrHex;
    // Calculate contrast luminance: (r*299 + g*587 + b*114) / 1000
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2) || "0", 16);
    const g = parseInt(cleanHex.substring(2, 4) || "0", 16);
    const b = parseInt(cleanHex.substring(4, 6) || "0", 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    const isDarkText = yiq >= 128;

    return {
      bg: "bg-slate-50 dark:bg-slate-900",
      border: "border-slate-300 dark:border-slate-700",
      text: isDarkText ? "text-slate-900" : "text-white",
      accent: "bg-slate-500",
      hex,
      name: "Tùy chỉnh",
      badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
      isCustomHex: true,
      customHex: hex,
    };
  }

  return COLOR_MAP.blue;
}

export const DEFAULT_LESSONS = [
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", category: "coding", hidden: false, priority: "high" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", category: "study", hidden: false, priority: "medium" },
  { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald", category: "rest", hidden: false, priority: "low" },
  { id: "theduc", subject: "Thể Dục & SH", teacher: "Vận động", room: "Ngoài trời", color: "teal", category: "exercise", hidden: false, priority: "medium" },
  { id: "ngutrua", subject: "Ngủ Trưa", teacher: "-", room: "Giường", color: "slate", category: "rest", hidden: false, priority: "low" },
  { id: "xemlai", subject: "Xem Lại & Ngủ", teacher: "-", room: "Giường", color: "stone", category: "study", hidden: false, priority: "low" },
  { id: "ansang", subject: "Ăn sáng, Chill", teacher: "-", room: "Phòng khách", color: "amber", category: "rest", hidden: false, priority: "low" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", category: "study", hidden: false, priority: "high" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788518478271", subject: "Tăng tiết", teacher: "Trường", room: "Lớp A", color: "rose", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", category: "study", hidden: false, priority: "high" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", category: "study", hidden: false, priority: "high" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", category: "study", hidden: false, priority: "high" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "A103", color: "lime", category: "study", hidden: false, priority: "medium" },
];

export const DEFAULT_TIMETABLE_HOURS = [
  { id: "slot_1788517789258_43861f", label: "Sáng", start: "06:50", end: "11:30" },
  { id: "slot_1788517838207_40110c", label: "Nghỉ trưa", start: "11:30", end: "12:30" },
  { id: "slot_1788517869598_d1b302", label: "Ca trưa 1", start: "12:30", end: "13:30" },
  { id: "slot_1788517959150_53969e", label: "Ca trưa 2", start: "13:30", end: "14:20" },
  { id: "slot_1788518108124_e0b154", label: "Off trưa", start: "14:20", end: "14:40" },
  { id: "slot_1788518132491_21a17d", label: "Ca chiều 1", start: "14:40", end: "15:25" },
  { id: "slot_1788518172082_d3b144", label: "Ca chiều 2", start: "15:30", end: "16:15" },
  { id: "slot_1788518192797_12cd30", label: "Off chiều", start: "16:15", end: "16:25" },
  { id: "slot_1788518243515_3203bb", label: "Ca chiều 3", start: "16:25", end: "17:10" },
  { id: "slot_1788518269348_5562db", label: "Ca chiều 4", start: "17:10", end: "18:00" },
  { id: "slot_1788518299952_dcf9fd", label: "Ca tối 1", start: "18:00", end: "19:30" },
  { id: "slot_1788518334577_5c40d0", label: "Ca tối 2", start: "19:30", end: "21:00" },
  { id: "slot_1788518354908_1e45d4", label: "Off tối", start: "21:00", end: "21:30" },
  { id: "slot_1788518378812_8138fc", label: "Ca tối 3", start: "21:30", end: "23:00" },
];

export const DEFAULT_TIMETABLE_DATA = [
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "1-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "2-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "3-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "4-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "5-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "6-slot_1788517789258_43861f" },
  { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald", slotId: "0-slot_1788517789258_43861f" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", slotId: "1-slot_1788517959150_53969e" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", slotId: "1-slot_1788518172082_d3b144" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", slotId: "1-slot_1788518132491_21a17d" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "1-slot_1788517869598_d1b302" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "1-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "2-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "3-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "4-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "5-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "6-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "0-slot_1788518299952_dcf9fd" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "1-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "3-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "2-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "4-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "5-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "6-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "0-slot_1788518334577_5c40d0" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "1-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "2-slot_1788518378812_8138fc" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "3-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "4-slot_1788518378812_8138fc" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "5-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "6-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "0-slot_1788518378812_8138fc" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "2-slot_1788517869598_d1b302" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "3-slot_1788517869598_d1b302" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "4-slot_1788517869598_d1b302" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518172082_d3b144" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "0-slot_1788517869598_d1b302" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "6-slot_1788517869598_d1b302" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "2-slot_1788517959150_53969e" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518132491_21a17d" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "4-slot_1788517959150_53969e" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788517959150_53969e" },
  { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "A103", color: "lime", slotId: "5-slot_1788517959150_53969e" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "0-slot_1788518132491_21a17d" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "0-slot_1788517959150_53969e" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "3-slot_1788517959150_53969e" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "2-slot_1788518132491_21a17d" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518132491_21a17d" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "5-slot_1788518132491_21a17d" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518172082_d3b144" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "2-slot_1788518172082_d3b144" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "0-slot_1788518172082_d3b144" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "5-slot_1788517869598_d1b302" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "5-slot_1788518172082_d3b144" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518132491_21a17d" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518172082_d3b144" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "1-slot_1788518269348_5562db" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "2-slot_1788518269348_5562db" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "1-slot_1788518243515_3203bb" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "2-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518269348_5562db" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "4-slot_1788518269348_5562db" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "5-slot_1788518269348_5562db" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "6-slot_1788518269348_5562db" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518243515_3203bb" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "4-slot_1788518243515_3203bb" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "6-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "5-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "0-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "0-slot_1788518269348_5562db" },
];

class AppStore {
  constructor() {
    const now = new Date();
    this.state = {
      lessons: [...DEFAULT_LESSONS],
      timeSlots: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_HOURS)),
      schedule: DEFAULT_TIMETABLE_DATA.map((item) => ({
        ...item,
        status: "planned",
        priority: "medium",
        isFocus: false,
        tags: [],
        notes: "",
        manualSplit: false,
      })),
      settings: {
        theme: "light", // STRICT DEFAULT LIGHT MODE
        themePreset: "ocean",
        zoomLevel: "normal",
        dayStart: "06:30",
        dayEnd: "23:30",
        weekStartsOn: 1,
        libraryCollapsed: false,
        autoMergeBlocks: true,
        showHiddenLessons: false,
      },
      snapshots: [],
      goals: [
        { id: "g1", subject: "CODE", targetHours: 8 },
        { id: "g2", subject: "Tiếng Anh", targetHours: 6 },
        { id: "g3", subject: "ĐGNL", targetHours: 10 },
      ],
      history: [],
      currentWeekOffset: 0,
      selectedDayMobile: now.getDay(),
      activeFilter: "all",
      selectedCells: new Set(),
      focusSession: null,
      analyticsGrouping: "subject-teacher-room",
      analyticsTab: "overview",
    };
    this.subscribers = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  hydrate(importedData) {
    if (!importedData || typeof importedData !== "object") return;
    if (Array.isArray(importedData.lessons)) {
      this.state.lessons = importedData.lessons.map((l) => ({
        ...l,
        category: l.category || "study",
        hidden: Boolean(l.hidden),
        color: l.color || "blue",
      }));
    }
    if (Array.isArray(importedData.timeSlots)) this.state.timeSlots = importedData.timeSlots;
    if (Array.isArray(importedData.schedule)) {
      this.state.schedule = importedData.schedule.map((item) => ({
        ...item,
        status: item.status || "planned",
        priority: item.priority || "medium",
        isFocus: Boolean(item.isFocus),
        tags: Array.isArray(item.tags) ? item.tags : [],
        notes: item.notes || "",
        manualSplit: Boolean(item.manualSplit),
        color: item.color || "blue",
      }));
    }
    if (importedData.settings) {
      this.state.settings = { ...this.state.settings, ...importedData.settings };
    }
    if (Array.isArray(importedData.snapshots)) this.state.snapshots = importedData.snapshots;
    if (Array.isArray(importedData.goals)) this.state.goals = importedData.goals;
    if (Array.isArray(importedData.history)) this.state.history = importedData.history;
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.state);
      } catch (err) {
        console.error("Store subscriber error:", err);
      }
    });
  }
}

export const store = new AppStore();
