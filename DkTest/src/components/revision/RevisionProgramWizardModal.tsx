/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Multi-Step Revision Program Creation Wizard Modal
 */

import React, { useState, useMemo } from "react";
import {
  X,
  CheckCircle,
  Calendar,
  Clock,
  Sparkles,
  Target,
  Flame,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Award,
  Zap,
  RotateCcw,
} from "lucide-react";
import type {
  RevisionProgramConfigInput,
  RevisionProgramType,
  RevisionTask,
} from "../../types/revisionProgram";
import { scheduleRevisionTasks } from "../../services/revisionTaskScheduler";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentUid: string;
  studentUsername: string;
  onSubmit: (config: RevisionProgramConfigInput) => Promise<void>;
}

const PROGRAM_TYPES: Array<{
  type: RevisionProgramType;
  title: string;
  desc: string;
  badge: string;
  icon: any;
}> = [
  {
    type: "exam_countdown",
    title: "Đếm ngược kỳ thi mục tiêu",
    desc: "Chia 3 giai đoạn: Củng cố nền tảng → Luyện đề trọng tâm → Nước rút mô phỏng thời gian thực.",
    badge: "Phổ biến nhất",
    icon: Calendar,
  },
  {
    type: "weakness_remedy",
    title: "Khắc phục lỗ hổng kiến thức",
    desc: "Tập trung phân tích nguyên nhân sai lầm và luyện các câu tương tự để dứt điểm mất điểm oan.",
    badge: "Tăng điểm nhanh",
    icon: Target,
  },
  {
    type: "topic_deep_dive",
    title: "Đào sâu chuyên đề",
    desc: "Ôn tập tuần tự từng chuyên đề: Lý thuyết cốt lõi → Bài tập căn bản → Câu hỏi vận dụng cao.",
    badge: "Nền tảng vững",
    icon: BookOpen,
  },
  {
    type: "maintenance_spaced",
    title: "Ôn luyện ngắt quãng (Spaced)",
    desc: "Lặp lại kiến thức theo chu kỳ quên Ebbinghaus (1, 3, 7, 14, 28 ngày) để nhớ lâu bền vững.",
    badge: "Trí nhớ dài hạn",
    icon: RotateCcw,
  },
  {
    type: "speed_drill",
    title: "Luyện tốc độ & phản xạ",
    desc: "Rèn luyện làm bài trong áp lực thời gian ngắn, tối ưu hóa thao tác bấm máy tính và tư duy.",
    badge: "Phản xạ nhanh",
    icon: Zap,
  },
  {
    type: "retake_mastery",
    title: "Chinh phục đề thi cũ",
    desc: "Rà soát lại toàn bộ câu đã làm sai trong các bài thi thử trước để không lặp lại lỗi sai.",
    badge: "Rà soát lỗi",
    icon: Award,
  },
  {
    type: "comprehensive_prep",
    title: "Luyện thi toàn diện",
    desc: "Lộ trình 4 tuần cân bằng giữa ôn chuyên đề, rèn tốc độ và làm đề tổng hợp.",
    badge: "Toàn diện",
    icon: Sparkles,
  },
];

const SUBJECT_OPTIONS = ["Toán", "Vật Lý", "Hóa Học", "Sinh Học", "Tiếng Anh", "Tin Học"];

import { ALL_GRADE_12_TAXONOMIES } from "../../practice/curriculum/grade12Taxonomy";

const DEFAULT_TOPICS_BY_SUBJECT: Record<string, string[]> = {
  Toán: ALL_GRADE_12_TAXONOMIES.math.topics.map((t) => t.title),
  "Vật Lý": ALL_GRADE_12_TAXONOMIES.physics.topics.map((t) => t.title),
  "Hóa Học": ALL_GRADE_12_TAXONOMIES.chemistry.topics.map((t) => t.title),
  "Tin Học": ALL_GRADE_12_TAXONOMIES.computer_science.topics.map((t) => t.title),
  "Tiếng Anh": [
    "Từ vựng trọng tâm theo chủ đề",
    "Ngữ pháp các thì & Câu bị động",
    "Mệnh đề quan hệ & Câu điều kiện",
    "Giới từ & Cụm động từ",
  ],
};

export default function RevisionProgramWizardModal({
  isOpen,
  onClose,
  studentUid,
  studentUsername,
  onSubmit,
}: Props) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Form State
  const [programType, setProgramType] = useState<RevisionProgramType>("exam_countdown");
  const [subject, setSubject] = useState<string>("Toán");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [targetExamName, setTargetExamName] = useState<string>("Kỳ thi THPT Quốc Gia 2027");
  const [targetExamDate, setTargetExamDate] = useState<string>("2027-06-11");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(DEFAULT_TOPICS_BY_SUBJECT["Toán"] || []);
  const [customTopicInput, setCustomTopicInput] = useState<string>("");
  const [initialLevel, setInitialLevel] = useState<"foundation" | "intermediate" | "advanced">("intermediate");
  const [dailyMinutes, setDailyMinutes] = useState<number>(30);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Handle subject change
  const handleSubjectChange = (newSub: string) => {
    setSubject(newSub);
    const def = DEFAULT_TOPICS_BY_SUBJECT[newSub] || [`Trọng tâm chương 1 môn ${newSub}`];
    setSelectedTopics(def);
  };

  const handleToggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleAddCustomTopic = () => {
    if (customTopicInput.trim() && !selectedTopics.includes(customTopicInput.trim())) {
      setSelectedTopics([...selectedTopics, customTopicInput.trim()]);
      setCustomTopicInput("");
    }
  };

  const handleToggleDay = (day: number) => {
    if (weeklyDays.includes(day)) {
      if (weeklyDays.length > 1) {
        setWeeklyDays(weeklyDays.filter((d) => d !== day));
      }
    } else {
      setWeeklyDays([...weeklyDays, day]);
    }
  };

  // Preview scheduled tasks for Step 5
  const previewTasks = useMemo(() => {
    const config: RevisionProgramConfigInput = {
      studentUid,
      studentUsername,
      type: programType,
      title: customTitle.trim() || undefined,
      subject,
      targetExamName,
      targetExamDate,
      dailyTargetMinutes: dailyMinutes,
      weeklyDays,
      topics: selectedTopics,
      initialLevel,
    };
    return scheduleRevisionTasks("preview_prog", config);
  }, [
    studentUid,
    studentUsername,
    programType,
    customTitle,
    subject,
    targetExamName,
    targetExamDate,
    dailyMinutes,
    weeklyDays,
    selectedTopics,
    initialLevel,
  ]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        studentUid,
        studentUsername,
        type: programType,
        title: customTitle.trim() || undefined,
        subject,
        targetExamName: programType === "exam_countdown" ? targetExamName : undefined,
        targetExamDate: programType === "exam_countdown" ? targetExamDate : undefined,
        dailyTargetMinutes: dailyMinutes,
        weeklyDays,
        topics: selectedTopics,
        initialLevel,
      });
      onClose();
    } catch (err) {
      console.error("[Wizard] Error creating program:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tạo Lộ Trình Ôn Tập Cá Nhân Hóa
            </h3>
            <p className="text-xs text-slate-500">
              Bước {step}/5:{" "}
              {step === 1 && "Chọn mục tiêu & loại chương trình"}
              {step === 2 && "Chọn môn học & chuyên đề"}
              {step === 3 && "Đánh giá xuất phát điểm"}
              {step === 4 && "Thời gian biểu học tập"}
              {step === 5 && "Xem trước & Xác nhận lộ trình"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1">
          <div
            className="bg-indigo-600 h-1 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Program Type */}
          {step === 1 && (
            <div className="space-y-3">
              {/* Quick Presets */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Cấu hình nhanh mẫu (Quick Presets)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProgramType("weakness_remedy");
                      setSubject("Toán");
                      setSelectedTopics(DEFAULT_TOPICS_BY_SUBJECT["Toán"] || []);
                      setDailyMinutes(20);
                      setWeeklyDays([1, 2, 3, 4, 5]);
                      setInitialLevel("foundation");
                      setStep(4);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    🎯 Ôn câu sai cấp tốc (20p)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgramType("topic_deep_dive");
                      setSubject("Vật Lý");
                      setSelectedTopics(["Vật lý nhiệt & Nhiệt động lực học", "Khí lý tưởng & Các định luật chất khí"]);
                      setDailyMinutes(25);
                      setWeeklyDays([1, 3, 5]);
                      setInitialLevel("intermediate");
                      setStep(4);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    ⚛️ Nhiệt học & Khí lý tưởng (25p)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgramType("topic_deep_dive");
                      setSubject("Hóa Học");
                      setSelectedTopics(["Este - Lipit & Chất béo", "Xà phòng & Chất giặt rửa"]);
                      setDailyMinutes(25);
                      setWeeklyDays([2, 4, 6]);
                      setInitialLevel("intermediate");
                      setStep(4);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    🧪 Este - Lipit & Xà phòng (25p)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgramType("speed_drill");
                      setSubject("Toán");
                      setSelectedTopics(["Ứng dụng đạo hàm & Khảo sát hàm số"]);
                      setDailyMinutes(15);
                      setWeeklyDays([1, 2, 3, 4, 5]);
                      setInitialLevel("intermediate");
                      setStep(4);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    ⚡ Luyện phản xạ 15 phút
                  </button>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Hoặc chọn phương pháp ôn tập tùy chỉnh:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {PROGRAM_TYPES.map((pt) => {
                  const isSelected = programType === pt.type;
                  const Icon = pt.icon;
                  return (
                    <div
                      key={pt.type}
                      onClick={() => setProgramType(pt.type)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {pt.title}
                          </h4>
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                            {pt.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {pt.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Subject & Topics */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  1. Môn học ôn tập
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleSubjectChange(sub)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        subject === sub
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {programType === "exam_countdown" && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Kỳ thi mục tiêu
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Tên kỳ thi</label>
                      <input
                        type="text"
                        value={targetExamName}
                        onChange={(e) => setTargetExamName(e.target.value)}
                        placeholder="THPT Quốc Gia 2027..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Ngày thi dự kiến</label>
                      <input
                        type="date"
                        value={targetExamDate}
                        onChange={(e) => setTargetExamDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  2. Chuyên đề ôn tập trọng tâm
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(DEFAULT_TOPICS_BY_SUBJECT[subject] || []).map((top) => {
                    const isChecked = selectedTopics.includes(top);
                    return (
                      <label
                        key={top}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTopic(top)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{top}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    placeholder="Thêm chuyên đề khác..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTopic}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 rounded-xl hover:bg-indigo-100"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Initial Level & Intensity */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Chọn mức độ xuất phát điểm hiện tại của bạn:
              </p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    id: "foundation",
                    title: "Nền tảng cơ bản (Mục tiêu 6 - 7.5 điểm)",
                    desc: "Tập trung chắc chắn câu hỏi nhận biết và thông hiểu, tránh sai sót các câu dễ.",
                  },
                  {
                    id: "intermediate",
                    title: "Trung bình khá (Mục tiêu 7.5 - 8.5 điểm)",
                    desc: "Củng cố chắc kiến thức cơ bản và rèn luyện các dạng bài vận dụng mức độ vừa.",
                  },
                  {
                    id: "advanced",
                    title: "Nâng cao bứt phá (Mục tiêu 9 - 10 điểm)",
                    desc: "Thử thách liên tục với câu hỏi vận dụng cao (VDC), câu phân hóa và tối ưu thời gian.",
                  },
                ].map((lvl) => {
                  const isSelected = initialLevel === lvl.id;
                  return (
                    <div
                      key={lvl.id}
                      onClick={() => setInitialLevel(lvl.id as any)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                        {lvl.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{lvl.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Schedule Constraints */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  1. Thời gian bạn có thể dành mỗi ngày
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[20, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyMinutes(mins)}
                      className={`min-h-[44px] py-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center ${
                        dailyMinutes === mins
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {mins} phút
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  2. Các ngày trong tuần bạn sẽ học
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[
                    { id: 1, label: "T2" },
                    { id: 2, label: "T3" },
                    { id: 3, label: "T4" },
                    { id: 4, label: "T5" },
                    { id: 5, label: "T6" },
                    { id: 6, label: "T7" },
                    { id: 0, label: "CN" },
                  ].map((d) => {
                    const isSelected = weeklyDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDay(d.id)}
                        className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  3. Đặt tên riêng cho lộ trình (tùy chọn)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={`Lộ trình ôn tập: ${subject}`}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Preview & Confirm */}
          {step === 5 && (
            <div className="space-y-3">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                  Xem trước lộ trình dự kiến ({previewTasks.length} nhiệm vụ)
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  Lộ trình được sắp xếp tự động dựa trên thời gian biểu {dailyMinutes} phút/ngày của bạn. Bạn có thể hoãn hoặc hoàn thành linh hoạt khi học.
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {previewTasks.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {t.title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Hạn chót: {t.dueDate} • ~{t.estimatedMinutes} phút
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 shrink-0">
                      {t.targetQuestionsCount} câu
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all min-h-[44px]"
            >
              <span>Tiếp tục</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-50 min-h-[44px]"
            >
              {loading ? (
                <span>Đang khởi tạo lộ trình...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Kích hoạt Lộ trình Ôn tập</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
