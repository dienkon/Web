/**
 * Central State Store
 */

export const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/60",
    text: "text-blue-900 dark:text-blue-100",
    accent: "bg-blue-500",
    hex: "#3b82f6",
    name: "Xanh dương",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    text: "text-emerald-900 dark:text-emerald-100",
    accent: "bg-emerald-500",
    hex: "#10b981",
    name: "Lục",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
    text: "text-amber-900 dark:text-amber-100",
    accent: "bg-amber-500",
    hex: "#f59e0b",
    name: "Hổ phách",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
    text: "text-rose-900 dark:text-rose-100",
    accent: "bg-rose-500",
    hex: "#f43f5e",
    name: "Hồng đỏ",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800/60",
    text: "text-purple-900 dark:text-purple-100",
    accent: "bg-purple-500",
    hex: "#a855f7",
    name: "Tím",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800/60",
    text: "text-indigo-900 dark:text-indigo-100",
    accent: "bg-indigo-500",
    hex: "#6366f1",
    name: "Chàm",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-800 dark:text-slate-200",
    accent: "bg-slate-500",
    hex: "#64748b",
    name: "Xám",
  },
};

export const DEFAULT_LESSONS = [
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo" },
        { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald" },
        { id: "theduc", subject: "Thể Dục & SH", teacher: "Vận động", room: "Ngoài trời", color: "blue" },
        { id: "ngutrua", subject: "Ngủ Trưa", teacher: "-", room: "Giường", color: "slate" },
        { id: "xemlai", subject: "Xem Lại & Ngủ", teacher: "-", room: "Giường", color: "slate" },
        { id: "ansang", subject: "Ăn sáng, Chill", teacher: "-", room: "Phòng khách", color: "slate" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple" },
        { id: "l_1788518478271", subject: "Tăng tiết", teacher: "Trường", room: "", color: "rose" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber" },
        { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "", color: "amber" },
      ];

export const DEFAULT_TIMETABLE_HOURS = [
        { id: "slot_1788517789258_43861f", label: "Sáng", start: "06:50", end: "11:30" },
        { id: "slot_1788517838207_40110c", label: "Nghỉ trưa", start: "11:30", end: "12:30" },
        { id: "slot_1788517869598_d1b302", label: "Ca trưa 1", start: "12:30", end: "13:30" },
        { id: "slot_1788517959150_53969e", label: "Ca trưa  2", start: "13:30", end: "14:20" },
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
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "1-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "2-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "3-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "4-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "5-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "6-slot_1788517789258_43861f" },
        { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald", slotId: "0-slot_1788517789258_43861f" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple", slotId: "1-slot_1788517959150_53969e" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple", slotId: "1-slot_1788518172082_d3b144" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple", slotId: "1-slot_1788518132491_21a17d" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "1-slot_1788517869598_d1b302" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "1-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "2-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "3-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "4-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "5-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "6-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "0-slot_1788518299952_dcf9fd" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "1-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "3-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "2-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "4-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "5-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "6-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "0-slot_1788518334577_5c40d0" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "1-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "2-slot_1788518378812_8138fc" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "3-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "4-slot_1788518378812_8138fc" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "5-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "6-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "0-slot_1788518378812_8138fc" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "2-slot_1788517869598_d1b302" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "3-slot_1788517869598_d1b302" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "4-slot_1788517869598_d1b302" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518172082_d3b144" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "0-slot_1788517869598_d1b302" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "6-slot_1788517869598_d1b302" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "2-slot_1788517959150_53969e" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518132491_21a17d" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "4-slot_1788517959150_53969e" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788517959150_53969e" },
        { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "", color: "amber", slotId: "5-slot_1788517959150_53969e" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "0-slot_1788518132491_21a17d" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "0-slot_1788517959150_53969e" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "3-slot_1788517959150_53969e" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "2-slot_1788518132491_21a17d" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518132491_21a17d" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "5-slot_1788518132491_21a17d" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518172082_d3b144" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "2-slot_1788518172082_d3b144" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "0-slot_1788518172082_d3b144" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "5-slot_1788517869598_d1b302" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "5-slot_1788518172082_d3b144" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518132491_21a17d" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518172082_d3b144" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "1-slot_1788518269348_5562db" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "2-slot_1788518269348_5562db" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "1-slot_1788518243515_3203bb" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "2-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518269348_5562db" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "4-slot_1788518269348_5562db" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "5-slot_1788518269348_5562db" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "6-slot_1788518269348_5562db" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518243515_3203bb" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "4-slot_1788518243515_3203bb" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "6-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "5-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "0-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "0-slot_1788518269348_5562db" },
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
      })),
      settings: {
        theme: "light", // STRICT DEFAULT LIGHT MODE
        themePreset: "ocean",
        zoomLevel: "normal",
        dayStart: "06:30",
        dayEnd: "23:30",
        weekStartsOn: 1,
        libraryCollapsed: false,
      },
      snapshots: [],
      goals: [
        { id: "g1", subject: "CODE", targetHours: 8 },
        { id: "g2", subject: "IELTS", targetHours: 6 },
        { id: "g3", subject: "DGNL", targetHours: 10 },
      ],
      history: [],
      currentWeekOffset: 0,
      selectedDayMobile: now.getDay(),
      activeFilter: "all",
      selectedCells: new Set(),
      focusSession: null,
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
    if (Array.isArray(importedData.lessons)) this.state.lessons = importedData.lessons;
    if (Array.isArray(importedData.timeSlots)) this.state.timeSlots = importedData.timeSlots;
    if (Array.isArray(importedData.schedule)) this.state.schedule = importedData.schedule;
    if (importedData.settings) this.state.settings = { ...this.state.settings, ...importedData.settings };
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
