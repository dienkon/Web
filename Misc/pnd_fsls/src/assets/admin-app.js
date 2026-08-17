import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  initializePndAppCheck,
  userHasAdminClaim,
} from "./firebase-security.js?v=5.33.4";

const firebaseConfig = {
  apiKey: "AIzaSyDJu0I8tPq88gDDzjD53CkAPKlPl4Vd9Zs",
  authDomain: "pndteam-ac43b.firebaseapp.com",
  projectId: "pndteam-ac43b",
  storageBucket: "pndteam-ac43b.firebasestorage.app",
  messagingSenderId: "504130270745",
  appId: "1:504130270745:web:786924d35bc84ef3d11c88",
};

const LOCAL_KEY = "pnd_local_exams";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
initializePndAppCheck(app);

const $ = (id) => document.getElementById(id);
let parsedExam = null;
let currentUser = null;
let canWriteCloud = false;
let scoringConfigValid = false;
let editing = null;
let inventory = [];

const SUBJECT_LABELS = {
  math: "Toán",
  physics: "Vật lý",
  chemistry: "Hóa học",
  english: "Tiếng Anh",
  other: "Khác",
};
const FORMAT_LABELS = { none: "", hsa: "HSA", tsa: "TSA", vact: "V-ACT" };

function searchableText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function normalizeSubjectCategory(value, fallbackText = "") {
  const key = searchableText(value).replace(/[\s_-]+/g, "");
  if (["math", "toan", "toanhoc"].includes(key)) return "math";
  if (["physics", "ly", "vatly", "vatli"].includes(key)) return "physics";
  if (["chemistry", "hoa", "hoahoc"].includes(key)) return "chemistry";
  if (["english", "anh", "tienganh"].includes(key)) return "english";
  const text = searchableText(`${value} ${fallbackText}`);
  if (/\b(toan|math)\b/.test(text)) return "math";
  if (/\b(vat ly|vat li|physics|mon ly|mon li)\b/.test(text)) return "physics";
  if (/\b(hoa hoc|chemistry|mon hoa)\b/.test(text)) return "chemistry";
  if (/\b(tieng anh|english|mon anh)\b/.test(text)) return "english";
  return "other";
}

function normalizeExamFormat(value, fallbackText = "") {
  const text = searchableText(`${value} ${fallbackText}`).replace(
    /[_-]+/g,
    " ",
  );
  if (/\bhsa\b/.test(text)) return "hsa";
  if (/\btsa\b/.test(text)) return "tsa";
  if (/\bv\s*act\b|\bvact\b/.test(text)) return "vact";
  return "none";
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

function makeId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readLocalExams() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLocalExams(exams) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(exams));
}

function normalizeExam(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("JSON phải là một đối tượng đề thi.");
  }
  const title = String(raw.title || raw.tenDeThi || "").trim();
  const questions = raw.questions;
  if (!title) throw new Error("Thiếu trường title (tên đề thi).");
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Trường questions phải là một mảng có ít nhất 1 câu.");
  }

  const normalizedQuestions = questions.map((question, index) => {
    if (!question || typeof question !== "object")
      throw new Error(`Câu ${index + 1}: dữ liệu không hợp lệ.`);
    const sourceType = String(question.type || "")
      .trim()
      .toUpperCase();
    const type = ["TLN", "TRA_LOI_NGAN", "TRẢ LỜI NGẮN"].includes(sourceType)
      ? "DN"
      : sourceType;
    const prompt = String(question.prompt || question.cau_hoi || "").trim();
    if (!["TN", "DN", "DS", "TL"].includes(type)) {
      throw new Error(`Câu ${index + 1}: type phải là TN, DS, DN/TLN hoặc TL.`);
    }
    if (!prompt) throw new Error(`Câu ${index + 1}: thiếu prompt.`);
    let correctAnswer = question.correctAnswer ?? question.dapAnDung ?? "";
    if (
      type !== "TL" &&
      (correctAnswer === "" ||
        correctAnswer === null ||
        correctAnswer === undefined)
    ) {
      throw new Error(`Câu ${index + 1}: thiếu correctAnswer.`);
    }

    let options;
    let statements;
    if (type === "TN") {
      options = question.options;
      if (!options || typeof options !== "object" || Array.isArray(options)) {
        throw new Error(`Câu ${index + 1}: câu TN phải có options A, B, C, D.`);
      }
      for (const key of ["A", "B", "C", "D"]) {
        if (!String(options[key] ?? "").trim())
          throw new Error(`Câu ${index + 1}: thiếu lựa chọn ${key}.`);
      }
      correctAnswer = String(correctAnswer).trim().toUpperCase();
      if (!["A", "B", "C", "D"].includes(correctAnswer)) {
        throw new Error(
          `Câu ${index + 1}: correctAnswer phải là A, B, C hoặc D.`,
        );
      }
      options = Object.fromEntries(
        ["A", "B", "C", "D"].map((key) => [key, String(options[key])]),
      );
    } else if (type === "DS") {
      statements = question.statements;
      if (!Array.isArray(statements) || statements.length !== 4) {
        throw new Error(
          `Câu ${index + 1}: câu DS phải có đúng 4 phần tử trong statements.`,
        );
      }
      statements = statements.map((statement, statementIndex) => {
        const text =
          typeof statement === "string" ? statement : statement?.text;
        if (!String(text || "").trim())
          throw new Error(
            `Câu ${index + 1}, ý ${statementIndex + 1}: thiếu nội dung.`,
          );
        return {
          id: String(statement?.id || ["a", "b", "c", "d"][statementIndex]),
          text: String(text),
        };
      });
      if (!Array.isArray(correctAnswer) || correctAnswer.length !== 4) {
        throw new Error(
          `Câu ${index + 1}: correctAnswer của câu DS phải là mảng 4 giá trị T/F.`,
        );
      }
      correctAnswer = correctAnswer.map((value, answerIndex) => {
        const normalized = String(value).trim().toUpperCase();
        if (["T", "TRUE", "Đ", "ĐÚNG"].includes(normalized)) return "T";
        if (["F", "FALSE", "S", "SAI"].includes(normalized)) return "F";
        throw new Error(
          `Câu ${index + 1}, đáp án ý ${answerIndex + 1}: chỉ nhận T/F hoặc Đúng/Sai.`,
        );
      });
    } else if (type === "DN") {
      correctAnswer = String(correctAnswer).trim();
    } else {
      correctAnswer = String(correctAnswer || "").trim();
    }

    const defaultPoints = { TN: 1, DS: 1, DN: 1, TL: 1 }[type];
    const points = Number(
      question.points ?? question.maxPoints ?? defaultPoints,
    );
    if (!Number.isFinite(points) || points < 0)
      throw new Error(`Câu ${index + 1}: points phải là số không âm.`);

    return {
      id: question.id ?? index + 1,
      type,
      topic: String(question.topic || question.chuyenDe || "Tổng hợp"),
      prompt,
      points,
      ...(question.image
        ? {
            image: String(question.image),
            imageAlt: String(question.imageAlt || "Hình câu hỏi"),
          }
        : {}),
      ...(options ? { options } : {}),
      ...(statements ? { statements } : {}),
      correctAnswer,
      ...(type === "DN" && Array.isArray(question.acceptedAnswers)
        ? { acceptedAnswers: question.acceptedAnswers.map(String) }
        : {}),
      ...(type === "DN" && Number.isFinite(Number(question.tolerance))
        ? { tolerance: Math.max(0, Number(question.tolerance)) }
        : {}),
      ...(String(question.explanation || question.solution || "").trim()
        ? {
            explanation: String(
              question.explanation || question.solution,
            ).trim(),
          }
        : {}),
      ...(type === "TL" ? { manualGrading: true, maxPoints: points } : {}),
    };
  });

  const duration = Math.max(
    1,
    Math.min(
      600,
      Number(raw.durationMinutes || raw.thoiGianLamBai || 90) || 90,
    ),
  );
  const subject =
    String(raw.subject || raw.monHoc || "Tổng hợp").trim() || "Tổng hợp";
  const classificationText = `${title} ${subject}`;
  return {
    id: String(raw.id || makeId()),
    title,
    subject,
    subjectCategory: normalizeSubjectCategory(
      raw.subjectCategory || raw.phanLoaiMon || subject,
      classificationText,
    ),
    examFormat: normalizeExamFormat(
      raw.examFormat || raw.kyThi || raw.examType,
      classificationText,
    ),
    code: String(raw.code || raw.maDe || "").trim(),
    durationMinutes: duration,
    deadline: String(raw.deadline || raw.hanChot || "").trim(),
    attemptPolicy:
      String(raw.attemptPolicy || "").toLowerCase() === "single" ||
      (!raw.attemptPolicy && Boolean(raw.deadline || raw.hanChot))
        ? "single"
        : "multiple",
    questions: normalizedQuestions,
    scoring: {
      maxScore: 10,
      trueFalseTiers: {
        0: 0,
        1: 0.1,
        2: 0.25,
        3: 0.5,
        4: 1,
      },
      mode: raw.scoring?.typeTotals
        ? "custom-10"
        : normalizedQuestions.some((question) => question.type === "DS")
          ? "bgd-2025"
          : "normalized-10",
      ...(raw.scoring?.typeTotals && typeof raw.scoring.typeTotals === "object"
        ? {
            typeTotals: Object.fromEntries(
              ["TN", "DS", "DN", "TL"].map((type) => [
                type,
                Math.max(0, Number(raw.scoring.typeTotals[type]) || 0),
              ]),
            ),
          }
        : {}),
    },
  };
}

function showStatus(message, type = "ok") {
  const node = $("status");
  node.className = `status show ${type}`;
  node.textContent = message;
}

function validTypeTotals(questions = [], scoring = {}) {
  const source = scoring?.typeTotals;
  if (!source || typeof source !== "object") return null;
  const counts = questions.reduce(
    (result, question) => {
      const type = String(question.type || "TN").toUpperCase();
      result[type] = (result[type] || 0) + 1;
      return result;
    },
    { TN: 0, DS: 0, DN: 0, TL: 0 },
  );
  const totals = Object.fromEntries(
    ["TN", "DS", "DN", "TL"].map((type) => [type, Number(source[type])]),
  );
  if (
    Object.values(totals).some((value) => !Number.isFinite(value) || value < 0)
  )
    return null;
  if (Math.abs(totals.DS - counts.DS) > 0.001) return null;
  if (
    ["TN", "DS", "DN", "TL"].some(
      (type) => counts[type] === 0 && totals[type] > 0.001,
    )
  )
    return null;
  if (
    Math.abs(
      Object.values(totals).reduce((sum, value) => sum + value, 0) - 10,
    ) > 0.001
  )
    return null;
  return totals;
}

function standardMaxPoints(questions = [], scoring = {}) {
  const targetMax = 10;
  const maxPoints = new Array(questions.length).fill(0);
  const types = questions.map((question) =>
    String(question.type || "TN").toUpperCase(),
  );
  const configuredTotals = validTypeTotals(questions, scoring);
  if (configuredTotals) {
    ["TN", "DS", "DN", "TL"].forEach((type) => {
      const indexes = types
        .map((value, index) => (value === type ? index : -1))
        .filter((index) => index >= 0);
      if (!indexes.length) return;
      if (type === "DS") {
        indexes.forEach((index) => {
          maxPoints[index] = 1;
        });
        return;
      }
      const weights = indexes.map((index) =>
        Math.max(
          0,
          Number(questions[index].points ?? questions[index].maxPoints ?? 1) ||
            0,
        ),
      );
      const totalWeight =
        weights.reduce((sum, value) => sum + value, 0) || indexes.length;
      indexes.forEach((index, position) => {
        maxPoints[index] =
          (configuredTotals[type] *
            (weights[position] ||
              (weights.every((value) => value === 0) ? 1 : 0))) /
          totalWeight;
      });
    });
    return maxPoints;
  }
  if (types.includes("DS")) {
    const fixed = [];
    const flexible = [];
    types.forEach((type, index) => {
      if (type === "DS") {
        maxPoints[index] = 1;
        fixed.push(index);
      } else if (type === "TN") {
        maxPoints[index] = 0.25;
        fixed.push(index);
      } else flexible.push(index);
    });
    let fixedTotal = maxPoints.reduce((sum, value) => sum + value, 0);
    if (fixedTotal > targetMax) {
      const scale = targetMax / fixedTotal;
      fixed.forEach((index) => {
        maxPoints[index] *= scale;
      });
      fixedTotal = targetMax;
    }
    const remaining = Math.max(0, targetMax - fixedTotal);
    if (flexible.length) {
      const weights = flexible.map((index) =>
        Math.max(
          0,
          Number(questions[index].points ?? questions[index].maxPoints ?? 1) ||
            0,
        ),
      );
      const totalWeight =
        weights.reduce((sum, value) => sum + value, 0) || flexible.length;
      flexible.forEach((index, position) => {
        maxPoints[index] =
          (remaining *
            (weights[position] ||
              (weights.every((value) => value === 0) ? 1 : 0))) /
          totalWeight;
      });
    } else if (fixedTotal < targetMax) {
      const tn = types
        .map((type, index) => (type === "TN" ? index : -1))
        .filter((index) => index >= 0);
      const adjustable = tn.length ? tn : fixed;
      const bonus = adjustable.length
        ? (targetMax - fixedTotal) / adjustable.length
        : 0;
      adjustable.forEach((index) => {
        maxPoints[index] += bonus;
      });
    }
  } else {
    const weights = questions.map((question) =>
      Math.max(0, Number(question.points ?? question.maxPoints ?? 1) || 0),
    );
    const totalWeight =
      weights.reduce((sum, value) => sum + value, 0) || questions.length || 1;
    weights.forEach((weight, index) => {
      maxPoints[index] =
        (targetMax *
          (weight || (weights.every((value) => value === 0) ? 1 : 0))) /
        totalWeight;
    });
  }
  return maxPoints;
}

function currentQuestionPoints(exam, fallbackPoints = []) {
  return exam.questions.map((question, index) => {
    if (String(question.type || "TN").toUpperCase() === "DS") return 1;
    const input = document.getElementById(`question-score-${index}`);
    const value = Number(
      input ? input.value : (fallbackPoints[index] ?? question.points ?? 0),
    );
    return Number.isFinite(value) && value >= 0 ? Number(value.toFixed(3)) : 0;
  });
}

function totalsFromQuestionPoints(exam, points) {
  return exam.questions.reduce(
    (totals, question, index) => {
      const type = String(question.type || "TN").toUpperCase();
      totals[type] = (totals[type] || 0) + (Number(points[index]) || 0);
      return totals;
    },
    { TN: 0, DS: 0, DN: 0, TL: 0 },
  );
}

function updateScoringSummary() {
  if (!parsedExam) return;
  const points = currentQuestionPoints(parsedExam);
  const totals = totalsFromQuestionPoints(parsedExam, points);
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const remaining = Number((10 - total).toFixed(2));
  const counts = parsedExam.questions.reduce(
    (result, question) => {
      const type = String(question.type || "TN").toUpperCase();
      result[type] = (result[type] || 0) + 1;
      return result;
    },
    { TN: 0, DS: 0, DN: 0, TL: 0 },
  );
  $("score-total-tn").value = Number(totals.TN.toFixed(2));
  $("score-total-ds").value = Number(totals.DS.toFixed(2));
  $("score-total-dn").value = Number(totals.DN.toFixed(2));
  $("score-total-tl").value = Number(totals.TL.toFixed(2));
  const summary = $("score-total-summary");
  const valid = Math.abs(remaining) <= 0.001;
  scoringConfigValid = valid;
  $("save-local").disabled = !valid;
  $("save-cloud").disabled = !valid || !canWriteCloud;
  const detail = `TN ${counts.TN} câu = ${Number(totals.TN.toFixed(2))}đ · DS ${counts.DS} câu = ${Number(totals.DS.toFixed(2))}đ · TLN ${counts.DN} câu = ${Number(totals.DN.toFixed(2))}đ · TL ${counts.TL} câu = ${Number(totals.TL.toFixed(2))}đ`;
  summary.className = `status show ${valid ? "ok" : "error"}`;
  summary.textContent = valid
    ? `Tổng điểm: 10/10 · Có thể lưu đề · ${detail}`
    : `Tổng điểm: ${Number(total.toFixed(2))}/10 · ${remaining > 0 ? `còn thiếu ${remaining}` : `đang vượt ${Math.abs(remaining)}`} điểm · ${detail}`;

  points.forEach((value, index) => {
    const node = document.getElementById(`preview-score-${index}`);
    if (node) node.textContent = `tối đa ${Number(value.toFixed(2))} điểm`;
  });
}

function readScoringConfig(exam, points) {
  const totals = totalsFromQuestionPoints(exam, points);
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 10) > 0.001)
    throw new Error(
      `Tổng điểm các phần phải đúng 10. Hiện tại đang là ${Number(total.toFixed(2))}.`,
    );
  return {
    maxScore: 10,
    mode: "custom-10",
    typeTotals: Object.fromEntries(
      Object.entries(totals).map(([type, value]) => [
        type,
        Number(value.toFixed(2)),
      ]),
    ),
    trueFalseTiers: { 0: 0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1 },
  };
}

function renderMath() {
  if (typeof window.renderMathInElement !== "function") return;
  window.renderMathInElement($("question-preview"), {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
  });
}

function renderPreview(exam) {
  $("metadata").hidden = false;
  $("save-actions").hidden = false;
  $("preview").classList.add("show");
  $("exam-title").value = exam.title;
  $("exam-subject").value = exam.subject;
  $("exam-subject-category").value = exam.subjectCategory || "other";
  $("exam-format").value = exam.examFormat || "none";
  $("exam-code").value = exam.code;
  $("exam-duration").value = exam.durationMinutes;
  $("exam-deadline").value = String(exam.deadline || "").slice(0, 16);
  $("attempt-policy").value =
    exam.attemptPolicy || (exam.deadline ? "single" : "multiple");
  const maxPoints = standardMaxPoints(exam.questions, exam.scoring || {});
  $("question-count").textContent = `${exam.questions.length} câu · thang 10`;
  $("question-preview").innerHTML = exam.questions
    .map(
      (q, index) => `
        <article class="question">
            <div class="question-top"><span>Câu ${index + 1}</span><span>·</span><span>${escapeHtml(q.type)}</span><span>·</span><span>${escapeHtml(q.topic)}</span><span>·</span>${
              q.type === "DS"
                ? `<span id="preview-score-${index}">chấm mặc định · tối đa 1 điểm</span>`
                : `<label style="display:inline-flex;align-items:center;gap:6px;font-weight:700">Điểm câu này <input id="question-score-${index}" class="question-score-input" data-question-index="${index}" type="number" min="0" max="10" step="0.01" value="${Number(maxPoints[index].toFixed(2))}" style="width:76px;padding:6px 8px;border:1px solid #d8c2aa;border-radius:8px;background:#fff"><span id="preview-score-${index}">tối đa ${Number(maxPoints[index].toFixed(2))} điểm</span></label>`
            }</div>
            <p>${escapeHtml(q.prompt)}</p>
            ${
              q.options
                ? `<div class="options">${Object.entries(q.options)
                    .map(
                      ([key, value]) =>
                        `<div class="option"><b>${key}.</b> ${escapeHtml(value)}</div>`,
                    )
                    .join("")}</div>`
                : ""
            }
            ${q.statements ? `<div class="options">${q.statements.map((statement) => `<div class="option"><b>${escapeHtml(statement.id)}.</b> ${escapeHtml(statement.text)}</div>`).join("")}</div>` : ""}
            ${q.type === "TL" ? '<div class="option" style="margin-top:10px">Câu tự luận · chờ giáo viên chấm</div>' : ""}
        </article>`,
    )
    .join("");
  updateScoringSummary();
  setTimeout(renderMath, 0);
}

function syncMetadata() {
  if (!parsedExam) throw new Error("Hãy kiểm tra JSON trước khi lưu.");
  const title = $("exam-title").value.trim();
  const duration = Number($("exam-duration").value);
  if (!title) throw new Error("Tên đề thi không được để trống.");
  if (!Number.isFinite(duration) || duration < 1 || duration > 600)
    throw new Error("Thời gian phải từ 1 đến 600 phút.");
  const questionPoints = currentQuestionPoints(parsedExam);
  const questions = parsedExam.questions.map((question, index) => ({
    ...question,
    points: questionPoints[index],
    ...(question.type === "TL" ? { maxPoints: questionPoints[index] } : {}),
  }));
  return {
    ...parsedExam,
    title,
    subject: $("exam-subject").value.trim() || "Tổng hợp",
    subjectCategory: $("exam-subject-category").value,
    examFormat: $("exam-format").value,
    code: $("exam-code").value.trim(),
    durationMinutes: duration,
    questions,
    scoring: readScoringConfig({ ...parsedExam, questions }, questionPoints),
    attemptPolicy:
      $("attempt-policy").value === "single" ? "single" : "multiple",
    ...($("exam-deadline").value
      ? { deadline: $("exam-deadline").value + ":00" }
      : {}),
  };
}

function parseEditor() {
  try {
    const rawText = $("json-input").value.trim();
    if (!rawText) throw new Error("Bạn chưa chọn file hoặc dán JSON.");
    parsedExam = normalizeExam(JSON.parse(rawText));
    renderPreview(parsedExam);
    showStatus(
      `JSON hợp lệ: ${parsedExam.questions.length} câu, thời gian ${parsedExam.durationMinutes} phút, thang điểm 10.`,
    );
  } catch (error) {
    parsedExam = null;
    $("metadata").hidden = true;
    $("save-actions").hidden = true;
    $("preview").classList.remove("show");
    showStatus(error.message, "error");
  }
}

async function loadText(text, fileName = "") {
  $("json-input").value = text;
  if (fileName) showStatus(`Đã đọc ${fileName}. Hệ thống đang kiểm tra…`);
  parseEditor();
}

function resetEditor() {
  parsedExam = null;
  scoringConfigValid = false;
  editing = null;
  $("json-input").value = "";
  $("json-file").value = "";
  $("status").className = "status";
  $("metadata").hidden = true;
  $("save-actions").hidden = true;
  $("preview").classList.remove("show");
  $("editing-banner").classList.remove("show");
  $("exam-deadline").value = "";
  $("attempt-policy").value = "multiple";
  $("exam-subject-category").value = "other";
  $("exam-format").value = "none";
  ["tn", "ds", "dn", "tl"].forEach((type) => {
    const input = $(`score-total-${type}`);
    input.value = 0;
  });
  $("score-total-summary").className = "status show";
  $("score-total-summary").textContent = "Tổng điểm: 0/10";
  $("save-local").disabled = true;
  $("save-cloud").disabled = true;
}

function legacyAnswers(exam) {
  return exam.questions.map((q) => ({
    loaiCauHoi: q.type,
    dapAnDung: q.correctAnswer,
    chuyenDe: q.topic || "Tổng hợp",
  }));
}

function firestorePayload(exam) {
  const questionTypeCounts = exam.questions.reduce((counts, question) => {
    const type = String(question.type || "TN").toUpperCase();
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  return {
    schemaVersion: 5,
    publicMetadata: true,
    sourceFormat: "native-json",
    tenDeThi: exam.title,
    title: exam.title,
    monHoc: exam.subject,
    subject: exam.subject,
    subjectCategory: exam.subjectCategory || "other",
    examFormat: exam.examFormat || "none",
    maDe: exam.code,
    code: exam.code,
    thoiGianLamBai: exam.durationMinutes,
    durationMinutes: exam.durationMinutes,
    questionCount: exam.questions.length,
    questionTypeCounts,
    maxScore: 10,
    contentRef: exam.id,
    attemptPolicy: exam.attemptPolicy === "single" ? "single" : "multiple",
    status: "published",
    ...(exam.deadline ? { hanChot: exam.deadline } : {}),
  };
}

function contentPayload(exam) {
  const publicQuestions = exam.questions.map((question) => {
    const {
      correctAnswer,
      acceptedAnswers,
      tolerance,
      explanation,
      ...publicQuestion
    } = question;
    return publicQuestion;
  });
  return {
    schemaVersion: 5,
    examId: exam.id,
    questions: publicQuestions,
    scoring: exam.scoring,
    capNhat: serverTimestamp(),
  };
}

function answerPayload(exam) {
  return {
    schemaVersion: 4,
    examId: exam.id,
    title: exam.title,
    scoring: exam.scoring,
    answers: exam.questions.map((question) => ({
      id: question.id,
      type: question.type,
      points: question.points,
      correctAnswer: question.correctAnswer,
      ...(question.acceptedAnswers
        ? { acceptedAnswers: question.acceptedAnswers }
        : {}),
      ...(Number.isFinite(question.tolerance)
        ? { tolerance: question.tolerance }
        : {}),
      ...(question.explanation ? { explanation: question.explanation } : {}),
      ...(question.type === "TL"
        ? { maxPoints: question.maxPoints || question.points }
        : {}),
    })),
    capNhat: serverTimestamp(),
  };
}

async function saveLocal() {
  try {
    const exam = syncMetadata();
    const exams = readLocalExams();
    if (editing?.source === "local") {
      const index = exams.findIndex((item) => item.id === editing.id);
      if (index >= 0)
        exams[index] = { ...exam, id: editing.id, updatedAt: Date.now() };
    } else {
      exams.unshift({ ...exam, id: makeId(), createdAt: Date.now() });
    }
    writeLocalExams(exams);
    await Swal.fire({
      icon: "success",
      title: "Đã lưu local",
      text: "Đề đã xuất hiện trong Kho đề trên trình duyệt này.",
      confirmButtonColor: "#8c5f3b",
    });
    resetEditor();
    await loadInventory();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function saveCloud() {
  if (!canWriteCloud) {
    await Swal.fire({
      icon: "warning",
      title: "Cần tài khoản quản trị",
      html: 'Đăng nhập tại <a href="pnd_master.html?auth=login">trang chính</a> bằng tài khoản Admin rồi quay lại đây.',
    });
    return;
  }
  try {
    const exam = syncMetadata();
    const payload = firestorePayload(exam);
    $("save-cloud").disabled = true;
    $("save-cloud").textContent = "Đang lưu…";
    const batch = writeBatch(db);
    const examRef =
      editing?.source === "cloud"
        ? doc(db, "KhoDeThi", editing.id)
        : doc(collection(db, "KhoDeThi"));
    const cloudExam = {
      ...payload,
      id: examRef.id,
      contentRef: examRef.id,
      ...(editing?.source === "cloud"
        ? { capNhat: serverTimestamp() }
        : { ngayTao: serverTimestamp() }),
    };
    batch.set(examRef, cloudExam);
    batch.set(
      doc(db, "NoiDungDeThi", examRef.id),
      contentPayload({ ...exam, id: examRef.id }),
    );
    batch.set(doc(db, "DapAnDeThi", examRef.id), {
      ...answerPayload({ ...exam, id: examRef.id }),
      examId: examRef.id,
    });
    await batch.commit();
    await Swal.fire({
      icon: "success",
      title: editing?.source === "cloud" ? "Đã cập nhật đề" : "Đã đăng đề",
      text: "Dữ liệu đã được lưu vào Firestore.",
      confirmButtonColor: "#8c5f3b",
    });
    resetEditor();
    await loadInventory();
  } catch (error) {
    showStatus(`Không thể lưu Firestore: ${error.message}`, "error");
  } finally {
    $("save-cloud").disabled = !canWriteCloud || !scoringConfigValid;
    $("save-cloud").textContent = "Đăng lên Firestore";
  }
}

function editExam(source, id) {
  const item = inventory.find(
    (exam) => exam.source === source && exam.id === id,
  );
  if (!item) return;
  editing = { source, id };
  parsedExam = normalizeExam(item.exam);
  $("json-input").value = JSON.stringify(parsedExam, null, 2);
  $("editing-text").textContent =
    `Đang sửa: ${parsedExam.title} (${source === "local" ? "local" : "Firestore"})`;
  $("editing-banner").classList.add("show");
  renderPreview(parsedExam);
  if (item.exam.deadline || item.exam.hanChot) {
    $("exam-deadline").value = String(
      item.exam.deadline || item.exam.hanChot,
    ).slice(0, 16);
  }
  showStatus(
    "Đã nạp đề vào trình chỉnh sửa. Kiểm tra rồi bấm nút lưu phù hợp.",
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteExam(source, id) {
  const item = inventory.find(
    (exam) => exam.source === source && exam.id === id,
  );
  if (!item) return;
  if (source !== "local" && !canWriteCloud) {
    await Swal.fire(
      "Không có quyền",
      "Tài khoản hiện tại chưa được cấp quyền Admin.",
      "warning",
    );
    return;
  }
  const result = await Swal.fire({
    icon: "warning",
    title: "Xóa đề này?",
    text: item.exam.title,
    showCancelButton: true,
    confirmButtonText: "Xóa",
    cancelButtonText: "Giữ lại",
    confirmButtonColor: "#b42318",
  });
  if (!result.isConfirmed) return;
  if (source === "local") {
    writeLocalExams(readLocalExams().filter((exam) => exam.id !== id));
  } else {
    const batch = writeBatch(db);
    batch.delete(doc(db, "KhoDeThi", id));
    batch.delete(doc(db, "NoiDungDeThi", id));
    batch.delete(doc(db, "DapAnDeThi", id));
    await batch.commit();
  }
  if (editing?.source === source && editing?.id === id) resetEditor();
  await loadInventory();
}

async function deleteAllLegacyExams() {
  const legacyItems = inventory.filter((item) => item.source === "legacy");
  if (!legacyItems.length) {
    await Swal.fire(
      "Không còn PDF cũ",
      "Kho đề hiện không có document định dạng PDF cũ.",
      "info",
    );
    return;
  }
  if (!canWriteCloud) {
    await Swal.fire(
      "Không có quyền",
      "Tài khoản hiện tại chưa được cấp quyền Admin.",
      "warning",
    );
    return;
  }
  const result = await Swal.fire({
    icon: "warning",
    title: `Xóa ${legacyItems.length} đề PDF cũ?`,
    html: "Chỉ các document <b>không có questions</b> sẽ bị xóa. Đề JSON mới được giữ nguyên.<br><span style='font-size:11px;color:#b42318'>Thao tác này không thể hoàn tác.</span>",
    showCancelButton: true,
    confirmButtonText: "Xóa tất cả PDF cũ",
    cancelButtonText: "Hủy",
    confirmButtonColor: "#b42318",
  });
  if (!result.isConfirmed) return;

  try {
    $("delete-legacy-btn").disabled = true;
    for (let offset = 0; offset < legacyItems.length; offset += 200) {
      const batch = writeBatch(db);
      legacyItems.slice(offset, offset + 200).forEach((item) => {
        batch.delete(doc(db, "KhoDeThi", item.id));
        batch.delete(doc(db, "NoiDungDeThi", item.id));
        batch.delete(doc(db, "DapAnDeThi", item.id));
      });
      await batch.commit();
    }
    await Swal.fire({
      icon: "success",
      title: "Đã dọn PDF cũ",
      text: `Đã xóa ${legacyItems.length} đề định dạng cũ khỏi KhoDeThi.`,
      confirmButtonColor: "#8c5f3b",
    });
    await loadInventory();
  } catch (error) {
    showStatus(`Không thể xóa PDF cũ: ${error.message}`, "error");
  } finally {
    $("delete-legacy-btn").disabled = !canWriteCloud;
  }
}

async function optimizeCloudExams() {
  const candidates = inventory.filter(
    (item) => item.source === "cloud" && item.needsOptimization,
  );
  if (!candidates.length) {
    await Swal.fire(
      "Kho đề đã tối ưu",
      "Không còn đề JSON nào lưu câu hỏi chung với metadata.",
      "success",
    );
    return;
  }
  if (!canWriteCloud) {
    await Swal.fire(
      "Không có quyền",
      "Tài khoản hiện tại chưa được cấp quyền Admin.",
      "warning",
    );
    return;
  }
  const result = await Swal.fire({
    icon: "question",
    title: `Tối ưu ${candidates.length} đề JSON?`,
    html: "Hệ thống sẽ tách metadata nhẹ khỏi nội dung câu hỏi. Học sinh chỉ tải câu hỏi sau khi xác nhận bắt đầu.<br><span style='font-size:11px;color:#667085'>Đáp án và kết quả cũ vẫn được giữ nguyên.</span>",
    showCancelButton: true,
    confirmButtonText: "Tối ưu ngay",
    cancelButtonText: "Để sau",
    confirmButtonColor: "#8c5f3b",
  });
  if (!result.isConfirmed) return;

  try {
    $("optimize-cloud-btn").disabled = true;
    for (let offset = 0; offset < candidates.length; offset += 150) {
      const batch = writeBatch(db);
      candidates.slice(offset, offset + 150).forEach((item) => {
        const exam = { ...item.exam, id: item.id };
        const original = item.originalMetadata || {};
        const metadata = {
          ...firestorePayload(exam),
          id: item.id,
          contentRef: item.id,
          ...(original.ngayTao ? { ngayTao: original.ngayTao } : {}),
          capNhat: serverTimestamp(),
        };
        batch.set(doc(db, "KhoDeThi", item.id), metadata);
        batch.set(doc(db, "NoiDungDeThi", item.id), contentPayload(exam));
        batch.set(doc(db, "DapAnDeThi", item.id), answerPayload(exam));
      });
      await batch.commit();
    }
    await Swal.fire({
      icon: "success",
      title: "Đã tối ưu kho đề",
      text: `${candidates.length} đề đã được tách metadata, nội dung và đáp án bảo mật.`,
      confirmButtonColor: "#8c5f3b",
    });
    await loadInventory();
  } catch (error) {
    showStatus(`Không thể tối ưu kho đề: ${error.message}`, "error");
  } finally {
    $("optimize-cloud-btn").disabled = !canWriteCloud;
  }
}

function renderInventory() {
  const term = $("search-input").value.trim().toLowerCase();
  const filtered = inventory.filter((item) =>
    searchableText(
      `${item.exam.title} ${item.exam.subject} ${SUBJECT_LABELS[item.exam.subjectCategory] || "Khác"} ${FORMAT_LABELS[item.exam.examFormat] || ""}`,
    ).includes(searchableText(term)),
  );
  const legacyCount = inventory.filter(
    (item) => item.source === "legacy",
  ).length;
  const optimizationCount = inventory.filter(
    (item) => item.source === "cloud" && item.needsOptimization,
  ).length;
  $("delete-legacy-btn").hidden = legacyCount === 0;
  $("delete-legacy-btn").disabled = !canWriteCloud;
  $("delete-legacy-btn").textContent = `Xóa tất cả PDF cũ (${legacyCount})`;
  $("optimize-cloud-btn").hidden = !canWriteCloud || optimizationCount === 0;
  $("optimize-cloud-btn").disabled = !canWriteCloud;
  $("optimize-cloud-btn").textContent = `Tối ưu tải đề (${optimizationCount})`;
  if (!filtered.length) {
    $("exam-list").innerHTML =
      '<div class="empty">Chưa có đề phù hợp.<br>Hãy nạp JSON ở khung bên trái.</div>';
    return;
  }
  $("exam-list").innerHTML = filtered
    .map(
      (item) => `
        <article class="exam-card">
            <span class="source ${item.source}">${item.source === "local" ? "Local" : item.source === "legacy" ? "PDF cũ · Firestore" : "JSON · Firestore"}</span>
            <h3>${escapeHtml(item.exam.title)}</h3>
            <div class="exam-meta">${escapeHtml(SUBJECT_LABELS[item.exam.subjectCategory] || "Khác")}${FORMAT_LABELS[item.exam.examFormat] ? ` · ${escapeHtml(FORMAT_LABELS[item.exam.examFormat])}` : ""} · ${item.exam.questions?.length || item.exam.questionCount || 0} câu · ${item.exam.durationMinutes || 90} phút${item.needsOptimization ? " · Cần tối ưu" : ""}</div>
            <div class="card-actions">${
              item.source === "local" || canWriteCloud
                ? `
                ${item.source === "legacy" ? "" : `<button class="edit" data-action="edit" data-source="${item.source}" data-id="${escapeHtml(item.id)}">Chỉnh sửa</button>`}
                <button class="delete" data-action="delete" data-source="${item.source}" data-id="${escapeHtml(item.id)}">Xóa</button>`
                : '<span class="exam-meta">Chỉ tài khoản Admin được chỉnh sửa</span>'
            }
            </div>
        </article>`,
    )
    .join("");
}

async function loadInventory() {
  $("exam-list").innerHTML = '<div class="empty">Đang đọc kho đề…</div>';
  inventory = readLocalExams().map((exam) => {
    const classificationText = `${exam.title || ""} ${exam.subject || exam.monHoc || ""}`;
    return {
      source: "local",
      id: exam.id,
      exam: {
        ...exam,
        subjectCategory: normalizeSubjectCategory(
          exam.subjectCategory ||
            exam.phanLoaiMon ||
            exam.subject ||
            exam.monHoc,
          classificationText,
        ),
        examFormat: normalizeExamFormat(
          exam.examFormat || exam.kyThi || exam.examType,
          classificationText,
        ),
      },
    };
  });
  if (currentUser) {
    try {
      const answerMap = new Map();
      const contentMap = new Map();
      if (canWriteCloud) {
        const [answerSnapshot, contentSnapshot] = await Promise.all([
          getDocs(collection(db, "DapAnDeThi")),
          getDocs(collection(db, "NoiDungDeThi")).catch((error) => {
            console.warn(
              "Chưa đọc được NoiDungDeThi. Hãy triển khai rules V5.13:",
              error.message,
            );
            return null;
          }),
        ]);
        answerSnapshot.forEach((record) =>
          answerMap.set(record.id, record.data()),
        );
        contentSnapshot?.forEach((record) =>
          contentMap.set(record.id, record.data()),
        );
      }
      const snapshot = await getDocs(collection(db, "KhoDeThi"));
      snapshot.forEach((record) => {
        const data = record.data();
        const isNative =
          Array.isArray(data.questions) ||
          data.sourceFormat === "native-json" ||
          Boolean(data.contentRef) ||
          Number(data.schemaVersion) >= 5;
        if (isNative) {
          const answerData = answerMap.get(record.id);
          const contentData = contentMap.get(data.contentRef || record.id);
          const answers = Array.isArray(answerData?.answers)
            ? answerData.answers
            : [];
          const publicQuestions = Array.isArray(contentData?.questions)
            ? contentData.questions
            : Array.isArray(data.questions)
              ? data.questions
              : [];
          const questions = publicQuestions.map((question, index) => ({
            ...question,
            ...(answers[index] || {}),
          }));
          inventory.push({
            source: "cloud",
            id: record.id,
            needsOptimization:
              Array.isArray(data.questions) || data.publicMetadata !== true,
            originalMetadata: data,
            exam: {
              id: record.id,
              title: data.title || data.tenDeThi,
              subject: data.subject || data.monHoc || "Tổng hợp",
              subjectCategory: normalizeSubjectCategory(
                data.subjectCategory ||
                  data.phanLoaiMon ||
                  data.subject ||
                  data.monHoc,
                `${data.title || data.tenDeThi || ""} ${data.subject || data.monHoc || ""}`,
              ),
              examFormat: normalizeExamFormat(
                data.examFormat || data.kyThi || data.examType,
                `${data.title || data.tenDeThi || ""} ${data.subject || data.monHoc || ""}`,
              ),
              code: data.code || data.maDe || "",
              durationMinutes:
                data.durationMinutes || data.thoiGianLamBai || 90,
              questions,
              questionCount: Number(data.questionCount) || questions.length,
              scoring:
                answerData?.scoring || contentData?.scoring || data.scoring,
              deadline: data.hanChot || "",
              attemptPolicy:
                data.attemptPolicy || (data.hanChot ? "single" : "multiple"),
            },
          });
        } else {
          const legacyAnswers = Array.isArray(data.dapAn) ? data.dapAn : [];
          inventory.push({
            source: "legacy",
            id: record.id,
            exam: {
              id: record.id,
              title: data.tenDeThi || data.title || `PDF cũ ${record.id}`,
              subject: "Định dạng PDF cũ",
              code: data.maDe || data.code || "",
              durationMinutes:
                data.thoiGianLamBai || data.durationMinutes || 60,
              questions: legacyAnswers.map((answer, index) => ({
                id: index + 1,
                correctAnswer: answer,
              })),
            },
          });
        }
      });
    } catch (error) {
      showStatus(`Không đọc được Firestore: ${error.message}`, "error");
    }
  }
  renderInventory();
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  canWriteCloud = false;
  if (user) {
    try {
      canWriteCloud = await userHasAdminClaim(user);
    } catch (error) {
      console.error("Không đọc được quyền Admin:", error);
    }
  }

  if (!canWriteCloud) {
    $("auth-badge").textContent = user
      ? `${user.email} · Không có quyền`
      : "Chưa đăng nhập";
    showStatus(
      "Khu vực quản lý đề chỉ dành cho Admin. Đang chuyển về trang chính…",
      "error",
    );
    window.setTimeout(
      () => window.location.replace("pnd_master.html?access=admin-required"),
      700,
    );
    return;
  }

  document.body.classList.remove("auth-pending");
  $("auth-badge").textContent = `${user.email} · Admin`;
  $("save-cloud").disabled = !canWriteCloud || !scoringConfigValid;
  loadInventory();
});

$("pick-file").addEventListener("click", () => $("json-file").click());
$("json-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  await loadText(await file.text(), file.name);
});

const dropzone = $("dropzone");
for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
}
dropzone.addEventListener("drop", async (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".json"))
    return showStatus("Chỉ nhận file có đuôi .json", "error");
  await loadText(await file.text(), file.name);
});

$("validate-btn").addEventListener("click", parseEditor);
$("clear-btn").addEventListener("click", resetEditor);
$("cancel-edit").addEventListener("click", resetEditor);
$("save-local").addEventListener("click", saveLocal);
$("save-cloud").addEventListener("click", saveCloud);
$("question-preview").addEventListener("input", (event) => {
  if (event.target.classList.contains("question-score-input"))
    updateScoringSummary();
});
$("refresh-btn").addEventListener("click", loadInventory);
$("optimize-cloud-btn").addEventListener("click", optimizeCloudExams);
$("delete-legacy-btn").addEventListener("click", deleteAllLegacyExams);
$("search-input").addEventListener("input", renderInventory);
$("exam-deadline").addEventListener("change", (event) => {
  if (event.target.value) $("attempt-policy").value = "single";
});
$("exam-list").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit")
    editExam(button.dataset.source, button.dataset.id);
  if (button.dataset.action === "delete")
    deleteExam(button.dataset.source, button.dataset.id);
});
