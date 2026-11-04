# -*- coding: utf-8 -*-
"""
JavaScript logic for V-ACT Study Tracker
Pure ES6+ with zero external dependencies.
"""

JS_CONTENT = r"""
/**
 * V-ACT STUDY TRACKER — CORE APPLICATION ENGINE
 * Pure Vanilla JavaScript ES6+
 */

(function () {
  'use strict';

  // --- 1. CONSTANTS & DEFAULT CONFIG ---
  const STORAGE_KEY = 'VACT_STUDY_TRACKER_DATA_V1';
  const SCHEMA_VERSION = '1.0.0';

  const SUBJECTS_CONFIG = [
    {
      id: 'vietnamese',
      name: 'Tiếng Việt',
      shortName: 'TV',
      totalQuestions: 30,
      maxScore: 300,
      qStart: 1,
      qEnd: 30,
      color: 'var(--subject-tv)',
      badgeClass: 'sub-tag-tv'
    },
    {
      id: 'english',
      name: 'Tiếng Anh',
      shortName: 'TA',
      totalQuestions: 30,
      maxScore: 300,
      qStart: 31,
      qEnd: 60,
      color: 'var(--subject-en)',
      badgeClass: 'sub-tag-en'
    },
    {
      id: 'math',
      name: 'Toán học',
      shortName: 'Toán',
      totalQuestions: 30,
      maxScore: 300,
      qStart: 61,
      qEnd: 90,
      color: 'var(--subject-ma)',
      badgeClass: 'sub-tag-ma'
    },
    {
      id: 'science',
      name: 'Tư duy khoa học',
      shortName: 'TDKH',
      totalQuestions: 30,
      maxScore: 300,
      qStart: 91,
      qEnd: 120,
      color: 'var(--subject-sc)',
      badgeClass: 'sub-tag-sc',
      subgroups: [
        { id: 'logic_stats', name: 'Logic và phân tích số liệu', qStart: 91, qEnd: 102, totalQuestions: 12 },
        { id: 'science_deduction', name: 'Suy luận khoa học', qStart: 103, qEnd: 120, totalQuestions: 18 }
      ]
    }
  ];

  // Helper for unique IDs
  function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Safe HTML Escaping (XSS Prevention)
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Safe basic markdown formatter (Bold, italic, code block, list)
  function formatMarkdownSafe(content) {
    if (!content) return '';
    let text = escapeHtml(content);

    // Code blocks ```code```
    text = text.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');
    // Inline code `code`
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    // Bold **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Unordered lists (- item)
    text = text.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul class="note-list">$1</ul>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  function formatDate(isoStr) {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return isoStr;
    }
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  }

  // --- 2. STORAGE SERVICE ---
  const StorageService = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return this.getInitialState();
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
          return this.getInitialState();
        }
        // Ensure all required collections exist
        if (!Array.isArray(parsed.topics)) parsed.topics = [];
        if (!Array.isArray(parsed.exams)) parsed.exams = [];
        if (!Array.isArray(parsed.notes)) parsed.notes = [];
        if (!Array.isArray(parsed.practiceSessions)) parsed.practiceSessions = [];
        if (!Array.isArray(parsed.activityLog)) parsed.activityLog = [];
        if (!parsed.settings) parsed.settings = { targetScore: 950, autoEstimateLinear: false };
        if (!parsed.metadata) {
          parsed.metadata = { appName: 'V-ACT Study Tracker', schemaVersion: SCHEMA_VERSION };
        }
        return parsed;
      } catch (err) {
        console.error('StorageService.load error:', err);
        return this.getInitialState();
      }
    },

    save(state) {
      const indicator = document.getElementById('save-status-indicator');
      const textSpan = indicator ? indicator.querySelector('.save-text') : null;
      if (indicator) {
        indicator.className = 'save-status-pill saving';
        if (textSpan) textSpan.textContent = 'Đang lưu...';
      }

      try {
        state.metadata = state.metadata || {};
        state.metadata.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

        if (indicator) {
          indicator.className = 'save-status-pill';
          if (textSpan) textSpan.textContent = 'Đã lưu';
        }
        return true;
      } catch (err) {
        console.error('StorageService.save error:', err);
        if (indicator) {
          indicator.className = 'save-status-pill error';
          if (textSpan) textSpan.textContent = 'Không thể lưu';
        }
        UI.showToast('Không thể lưu vào bộ nhớ trình duyệt! Hãy xuất dữ liệu sao lưu ngay.', 'error');
        return false;
      }
    },

    getInitialState() {
      return {
        metadata: {
          appName: 'V-ACT Study Tracker',
          schemaVersion: SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        settings: {
          targetScore: 950,
          theme: 'light',
          autoEstimateLinear: false
        },
        subjects: SUBJECTS_CONFIG,
        topics: window.DEFAULT_TOPICS || [],
        exams: [],
        practiceSessions: [],
        notes: [],
        activityLog: [
          {
            id: generateId('act'),
            timestamp: new Date().toISOString(),
            type: 'system_init',
            title: 'Khởi tạo hệ thống V-ACT Study Tracker',
            description: 'Đã thiết lập 4 môn thi và danh mục chuyên đề ôn tập chuẩn V-ACT.'
          }
        ]
      };
    },

    logActivity(state, type, title, description) {
      if (!Array.isArray(state.activityLog)) state.activityLog = [];
      state.activityLog.unshift({
        id: generateId('act'),
        timestamp: new Date().toISOString(),
        type,
        title,
        description
      });
      // Keep activity log capped at 80 items
      if (state.activityLog.length > 80) {
        state.activityLog = state.activityLog.slice(0, 80);
      }
    },

    exportJSON(state) {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const timePart = now.toTimeString().slice(0, 5).replace(':', '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `VACT_Backup_${datePart}_${timePart}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    exportCSV(state, type) {
      let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
      const now = new Date().toISOString().slice(0, 10);
      let filename = `VACT_${type}_${now}.csv`;

      // Helper to escape CSV cell (also prevents Excel formula injection)
      const sanitizeCell = (val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        if (/^[=+@-]/.test(str)) {
          str = "'" + str; // prevent formula execution in spreadsheet
        }
        return `"${str}"`;
      };

      if (type === 'exams') {
        const headers = ['Mã Đề', 'Tên Đề', 'Ngày Làm', 'Nguồn Đề', 'Thời Gian (phút)', 'Điểm TV', 'Đúng TV/30', 'Điểm TA', 'Đúng TA/30', 'Điểm Toán', 'Đúng Toán/30', 'Điểm TDKH', 'Đúng TDKH/30', 'Tổng Điểm', 'Tổng Đúng/120', 'Hoàn Chỉnh', 'Ghi Chú'];
        csvContent += headers.map(sanitizeCell).join(',') + '\r\n';

        state.exams.forEach(ex => {
          const scores = ex.scores || {};
          const totals = AnalyticsEngine.calculateExamScore(ex);
          const row = [
            ex.id,
            ex.name,
            ex.date,
            ex.source || '',
            ex.durationMinutes || '',
            scores.vietnamese?.score ?? '',
            scores.vietnamese?.correct ?? '',
            scores.english?.score ?? '',
            scores.english?.correct ?? '',
            scores.math?.score ?? '',
            scores.math?.correct ?? '',
            scores.science?.score ?? '',
            scores.science?.correct ?? '',
            totals.totalScore ?? '',
            totals.totalCorrect ?? '',
            totals.isComplete ? 'Hoàn chỉnh' : 'Tạm tính',
            ex.notes || ''
          ];
          csvContent += row.map(sanitizeCell).join(',') + '\r\n';
        });
      } else if (type === 'practice') {
        const headers = ['Mã Luyện', 'Ngày Luyện', 'Môn Học', 'Chuyên Đề', 'Số Câu Đúng', 'Tổng Số Câu', 'Tỷ Lệ Đúng (%)', 'Thời Gian (phút)', 'Tài Liệu / Nguồn', 'Ghi Chú'];
        csvContent += headers.map(sanitizeCell).join(',') + '\r\n';

        state.practiceSessions.forEach(p => {
          const topic = state.topics.find(t => t.id === p.topicId);
          const sub = SUBJECTS_CONFIG.find(s => s.id === p.subjectId);
          const acc = p.totalQuestions > 0 ? ((p.correctQuestions / p.totalQuestions) * 100).toFixed(1) : '0';
          const row = [
            p.id,
            p.date,
            sub ? sub.name : p.subjectId,
            topic ? topic.name : p.topicId,
            p.correctQuestions,
            p.totalQuestions,
            acc,
            p.durationMinutes || '',
            p.source || '',
            p.notes || ''
          ];
          csvContent += row.map(sanitizeCell).join(',') + '\r\n';
        });
      } else if (type === 'notes') {
        const headers = ['Mã Ghi Chú', 'Tiêu Đề', 'Môn Học', 'Chuyên Đề', 'Loại', 'Ưu Tiên', 'Trạng Thái Ôn', 'Số Lần Ôn', 'Nội Dung', 'Lời Giải / Chuẩn', 'Nguyên Nhân Sai', 'Cách Khắc Phục', 'Tags', 'Ngày Tạo', 'Cập Nhật'];
        csvContent += headers.map(sanitizeCell).join(',') + '\r\n';

        state.notes.forEach(n => {
          const topic = state.topics.find(t => t.id === n.topicId);
          const sub = SUBJECTS_CONFIG.find(s => s.id === n.subjectId);
          const row = [
            n.id,
            n.title,
            sub ? sub.name : n.subjectId,
            topic ? topic.name : '',
            n.type,
            n.priority,
            n.reviewStatus,
            n.reviewCount || 0,
            n.content || '',
            n.solution || '',
            n.rootCause || '',
            n.preventionMethod || '',
            (n.tags || []).join('; '),
            n.createdAt,
            n.updatedAt
          ];
          csvContent += row.map(sanitizeCell).join(',') + '\r\n';
        });
      } else if (type === 'topics') {
        const headers = ['Mã Chuyên Đề', 'Môn Học', 'Nhóm Chuyên Đề', 'Tên Chuyên Đề', 'Trạng Thái', 'Độ Nắm Vững (1-5)', 'Độ Ưu Tiên', 'Lượt Luyện', 'Số Câu Đúng', 'Số Lỗi Sai', 'Tỷ Lệ Đúng (%)', 'Lần Ôn Cuối'];
        csvContent += headers.map(sanitizeCell).join(',') + '\r\n';

        const stats = AnalyticsEngine.getTopicAnalytics(state);
        stats.forEach(t => {
          const sub = SUBJECTS_CONFIG.find(s => s.id === t.subjectId);
          const acc = t.totalQuestions > 0 ? ((t.correctCount / t.totalQuestions) * 100).toFixed(1) : 'N/A';
          const row = [
            t.id,
            sub ? sub.name : t.subjectId,
            t.groupName,
            t.name,
            t.status,
            t.masteryLevel,
            t.priority,
            t.practiceCount,
            t.correctCount,
            t.wrongCount,
            acc,
            t.lastReviewedDate || ''
          ];
          csvContent += row.map(sanitizeCell).join(',') + '\r\n';
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // --- 3. ANALYTICS ENGINE ---
  const AnalyticsEngine = {
    // Calculates total scores, accuracy, deltas for an exam
    calculateExamScore(exam) {
      if (!exam || !exam.scores) {
        return { totalScore: 0, totalCorrect: 0, totalQuestions: 120, accuracy: 0, isComplete: false, missingSubjects: ['vietnamese', 'english', 'math', 'science'] };
      }

      let totalScore = 0;
      let totalCorrect = 0;
      let completeCount = 0;
      const missingSubjects = [];

      SUBJECTS_CONFIG.forEach(sub => {
        const subData = exam.scores[sub.id];
        if (subData) {
          if (typeof subData.correct === 'number' && !isNaN(subData.correct)) {
            totalCorrect += Math.max(0, Math.min(30, subData.correct));
          }
          if (typeof subData.score === 'number' && !isNaN(subData.score)) {
            totalScore += Math.max(0, Math.min(300, subData.score));
            completeCount++;
          } else {
            missingSubjects.push(sub.name);
          }
        } else {
          missingSubjects.push(sub.name);
        }
      });

      const isComplete = completeCount === 4;
      const accuracy = totalCorrect > 0 ? (totalCorrect / 120) * 100 : 0;

      return {
        totalScore,
        totalCorrect,
        totalQuestions: 120,
        accuracy: Math.round(accuracy * 10) / 10,
        isComplete,
        missingSubjects,
        completeCount
      };
    },

    // Overview KPIs
    getOverviewKPIs(state) {
      const exams = state.exams || [];
      const completeExams = exams.filter(e => {
        const totals = this.calculateExamScore(e);
        return totals.isComplete;
      });

      // 1. Latest score
      let latestScore = null;
      let latestScoreText = '--';
      let latestExam = null;
      if (completeExams.length > 0) {
        // Sort by date desc
        const sorted = [...completeExams].sort((a, b) => new Date(b.date) - new Date(a.date));
        latestExam = sorted[0];
        const res = this.calculateExamScore(latestExam);
        latestScore = res.totalScore;
        latestScoreText = `${res.totalScore}/1.200`;
      } else if (exams.length > 0) {
        // Incomplete exam available
        const latestIncomplete = [...exams].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const res = this.calculateExamScore(latestIncomplete);
        latestScoreText = `${res.totalScore}* (tạm tính)`;
      }

      // 2. High score
      let highScore = 0;
      let highScoreText = '--';
      if (completeExams.length > 0) {
        completeExams.forEach(e => {
          const res = this.calculateExamScore(e);
          if (res.totalScore > highScore) highScore = res.totalScore;
        });
        highScoreText = `${highScore}/1.200`;
      }

      // 3. Total exams
      const totalExams = exams.length;

      // 4. Average accuracy %
      let avgAccuracyText = '--';
      if (exams.length > 0) {
        let grandCorrect = 0;
        let grandTotal = 0;
        exams.forEach(e => {
          const res = this.calculateExamScore(e);
          grandCorrect += res.totalCorrect;
          grandTotal += 120;
        });
        if (grandTotal > 0) {
          avgAccuracyText = `${((grandCorrect / grandTotal) * 100).toFixed(1)}%`;
        }
      }

      // 5. Mastered topics
      const topics = state.topics || [];
      const masteredCount = topics.filter(t => t.status === 'mastered').length;
      const totalTopics = topics.length;

      // 6. Unresolved error notes
      const notes = state.notes || [];
      const unresolvedErrors = notes.filter(n => n.type === 'wrong_question' && n.reviewStatus !== 'resolved').length;

      return {
        latestScore,
        latestScoreText,
        highScore,
        highScoreText,
        totalExams,
        avgAccuracyText,
        masteredCount,
        totalTopics,
        unresolvedErrors
      };
    },

    // Identify weakest subject
    getWeakestSubject(state) {
      const exams = state.exams || [];
      if (exams.length === 0) return null;

      const subStats = {};
      SUBJECTS_CONFIG.forEach(s => {
        subStats[s.id] = { correct: 0, total: 0, name: s.name, color: s.color };
      });

      exams.forEach(e => {
        if (!e.scores) return;
        SUBJECTS_CONFIG.forEach(s => {
          const sc = e.scores[s.id];
          if (sc && typeof sc.correct === 'number') {
            subStats[s.id].correct += sc.correct;
            subStats[s.id].total += 30;
          }
        });
      });

      const list = Object.keys(subStats)
        .map(key => {
          const item = subStats[key];
          const rate = item.total > 0 ? (item.correct / item.total) * 100 : 0;
          return { id: key, name: item.name, rate, total: item.total };
        })
        .filter(item => item.total > 0);

      if (list.length < 2) return null;

      list.sort((a, b) => a.rate - b.rate);
      const weakest = list[0];
      const others = list.slice(1);
      const avgOthers = others.reduce((acc, cur) => acc + cur.rate, 0) / others.length;

      if (weakest.rate < avgOthers - 3) {
        return {
          subjectName: weakest.name,
          weakRate: weakest.rate.toFixed(1),
          avgOtherRate: avgOthers.toFixed(1),
          diff: (avgOthers - weakest.rate).toFixed(1)
        };
      }
      return null;
    },

    // Topics needing attention
    getAttentionTopics(state, limit = 5) {
      const topicStats = this.getTopicAnalytics(state);
      // Prioritize topics with highest wrongCount or status 'needs_review'
      const filtered = topicStats.filter(t => t.wrongCount > 0 || t.status === 'needs_review' || t.priority === 'high');
      filtered.sort((a, b) => {
        if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
        if (a.status === 'needs_review' && b.status !== 'needs_review') return -1;
        if (b.status === 'needs_review' && a.status !== 'needs_review') return 1;
        return a.masteryLevel - b.masteryLevel;
      });
      return filtered.slice(0, limit);
    },

    // Due reviews today
    getDueReviews(state, limit = 5) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const topics = state.topics || [];
      const notes = state.notes || [];

      const dueTopics = topics.filter(t => {
        if (t.status === 'mastered') return false;
        if (t.nextReviewDate && t.nextReviewDate <= todayStr) return true;
        if (t.priority === 'high' && t.status === 'needs_review') return true;
        return false;
      });

      const dueNotes = notes.filter(n => {
        return n.type === 'wrong_question' && n.reviewStatus === 'not_reviewed';
      });

      return {
        dueTopics: dueTopics.slice(0, limit),
        dueNotes: dueNotes.slice(0, limit)
      };
    },

    // Topic Analytics Aggregator
    getTopicAnalytics(state) {
      const topics = state.topics || [];
      const exams = state.exams || [];
      const practices = state.practiceSessions || [];
      const notes = state.notes || [];

      // Map to accumulate
      const map = {};
      topics.forEach(t => {
        map[t.id] = {
          ...t,
          practiceCount: 0,
          practiceCorrect: 0,
          practiceTotal: 0,
          examWrongCount: 0,
          notesCount: 0,
          lastWrongDate: null
        };
      });

      // 1. Tally from practices
      practices.forEach(p => {
        if (map[p.topicId]) {
          map[p.topicId].practiceCount++;
          map[p.topicId].practiceCorrect += (p.correctQuestions || 0);
          map[p.topicId].practiceTotal += (p.totalQuestions || 0);
        }
      });

      // 2. Tally from exam questions
      exams.forEach(ex => {
        if (Array.isArray(ex.questions)) {
          ex.questions.forEach(q => {
            if (q.status === 'wrong' && q.topicId && map[q.topicId]) {
              map[q.topicId].examWrongCount++;
              if (!map[q.topicId].lastWrongDate || new Date(ex.date) > new Date(map[q.topicId].lastWrongDate)) {
                map[q.topicId].lastWrongDate = ex.date;
              }
            }
          });
        }
      });

      // 3. Tally notes
      notes.forEach(n => {
        if (n.topicId && map[n.topicId]) {
          map[n.topicId].notesCount++;
        }
      });

      return Object.values(map).map(t => {
        const totalQ = t.practiceTotal;
        const correctQ = t.practiceCorrect;
        const wrongQ = (t.practiceTotal - t.practiceCorrect) + t.examWrongCount;
        return {
          ...t,
          totalQuestions: totalQ,
          correctCount: correctQ,
          wrongCount: wrongQ
        };
      });
    },

    // Exam comparison
    compareExams(examA, examB) {
      const resA = this.calculateExamScore(examA);
      const resB = this.calculateExamScore(examB);

      const subjectsComp = SUBJECTS_CONFIG.map(sub => {
        const scA = examA.scores?.[sub.id] || {};
        const scB = examB.scores?.[sub.id] || {};

        const scoreA = typeof scA.score === 'number' ? scA.score : null;
        const scoreB = typeof scB.score === 'number' ? scB.score : null;
        const scoreDelta = (scoreA !== null && scoreB !== null) ? (scoreB - scoreA) : null;

        const correctA = typeof scA.correct === 'number' ? scA.correct : 0;
        const correctB = typeof scB.correct === 'number' ? scB.correct : 0;
        const correctDelta = correctB - correctA;

        return {
          subjectId: sub.id,
          name: sub.name,
          scoreA,
          scoreB,
          scoreDelta,
          correctA,
          correctB,
          correctDelta
        };
      });

      return {
        examA,
        examB,
        totalScoreA: resA.totalScore,
        totalScoreB: resB.totalScore,
        totalScoreDelta: resB.totalScore - resA.totalScore,
        totalCorrectA: resA.totalCorrect,
        totalCorrectB: resB.totalCorrect,
        totalCorrectDelta: resB.totalCorrect - resA.totalCorrect,
        isCompleteA: resA.isComplete,
        isCompleteB: resB.isComplete,
        subjects: subjectsComp
      };
    }
  };

  // --- 4. UI COMPONENT & RENDERER ---
  const UI = {
    state: null,
    currentView: 'overview',
    activeTopicSubject: 'vietnamese',
    activeTopicGroup: 'all',
    activeTopicStatus: 'all',
    topicSearchQuery: '',
    noteSubjectFilter: 'all',
    noteTypeFilter: 'all',
    noteStatusFilter: 'all',
    noteSearchQuery: '',
    selectedNoteId: null,
    chartTimeFilter: 'all',
    chartSubjectMetric: 'score', // 'score' | 'correct' | 'rate'
    visibleChartSubjects: { vietnamese: true, english: true, math: true, science: true },

    init(state) {
      this.state = state;
      this.bindNav();
      this.bindModals();
      this.bindGlobalEvents();
      this.navigate('overview');
      this.updateSidebarTarget();
    },

    // Navigation Switcher
    navigate(viewId) {
      this.currentView = viewId;

      // Update Nav active
      document.querySelectorAll('.nav-link').forEach(el => {
        if (el.getAttribute('data-view') === viewId) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      // Update Header Title
      const titles = {
        overview: { title: 'Tổng quan học tập', desc: 'Bảng theo dõi tiến độ và hiệu suất ôn thi V-ACT' },
        topics: { title: 'Chuyên đề ôn tập', desc: 'Quản lý kiến thức và mức độ thành thạo 4 môn thi' },
        exams: { title: 'Thi thử V-ACT', desc: 'Lịch sử và kết quả các đợt thi thử theo thang 1.200' },
        notes: { title: 'Sổ tay ghi chú & Lỗi sai', desc: 'Kho lưu trữ công thức, phương pháp và rút kinh nghiệm' },
        analytics: { title: 'Phân tích tiến bộ', desc: 'So sánh chi tiết các đợt thi và xu hướng cải thiện' },
        settings: { title: 'Sao lưu & Cài đặt', desc: 'Quản lý dữ liệu cục bộ, xuất nhập JSON/CSV và mục tiêu điểm' }
      };

      const meta = titles[viewId] || { title: 'V-ACT Study Tracker', desc: '' };
      const titleEl = document.getElementById('page-title');
      const descEl = document.getElementById('page-desc');
      if (titleEl) titleEl.textContent = meta.title;
      if (descEl) descEl.textContent = meta.desc;

      // Show view section
      document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
      const targetSec = document.getElementById(`view-${viewId}`);
      if (targetSec) targetSec.style.display = 'block';

      // Render view content
      this.renderCurrentView();

      // Close mobile sidebar if open
      const sb = document.getElementById('sidebar');
      const bdrop = document.getElementById('sidebar-backdrop');
      if (sb) sb.classList.remove('mobile-open');
      if (bdrop) bdrop.classList.remove('show');
    },

    renderCurrentView() {
      switch (this.currentView) {
        case 'overview':
          this.renderOverview();
          break;
        case 'topics':
          this.renderTopics();
          break;
        case 'exams':
          this.renderExams();
          break;
        case 'notes':
          this.renderNotes();
          break;
        case 'analytics':
          this.renderAnalytics();
          break;
        case 'settings':
          this.renderSettings();
          break;
      }
      this.updateSidebarTarget();
    },

    updateSidebarTarget() {
      const target = this.state.settings?.targetScore || 950;
      const kpis = AnalyticsEngine.getOverviewKPIs(this.state);
      const latest = kpis.latestScore || 0;

      const targetEl = document.getElementById('sb-target-val');
      const latestEl = document.getElementById('sb-latest-val');
      const progressEl = document.getElementById('sb-target-progress');

      if (targetEl) targetEl.textContent = target;
      if (latestEl) latestEl.textContent = latest ? `${latest}` : '--';
      if (progressEl) {
        const pct = Math.min(100, Math.round((latest / target) * 100));
        progressEl.style.width = `${pct}%`;
      }
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      let iconSvg = '';
      if (type === 'success') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      } else if (type === 'error') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      } else if (type === 'warning') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      } else {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
      }

      toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    },

    // --- 4.1 VIEW: OVERVIEW ---
    renderOverview() {
      const kpis = AnalyticsEngine.getOverviewKPIs(this.state);

      // KPI Elements
      const elLatest = document.getElementById('kpi-latest-score');
      const elHigh = document.getElementById('kpi-high-score');
      const elTotalExams = document.getElementById('kpi-total-exams');
      const elAvgAcc = document.getElementById('kpi-avg-acc');
      const elMastered = document.getElementById('kpi-mastered-topics');
      const elUnresolved = document.getElementById('kpi-unresolved-errors');

      if (elLatest) elLatest.textContent = kpis.latestScoreText;
      if (elHigh) elHigh.textContent = kpis.highScoreText;
      if (elTotalExams) elTotalExams.textContent = kpis.totalExams;
      if (elAvgAcc) elAvgAcc.textContent = kpis.avgAccuracyText;
      if (elMastered) elMastered.textContent = `${kpis.masteredCount}/${kpis.totalTopics}`;
      if (elUnresolved) elUnresolved.textContent = kpis.unresolvedErrors;

      // Smart Insight Banner
      const bannerEl = document.getElementById('overview-insight-banner');
      const weak = AnalyticsEngine.getWeakestSubject(this.state);
      if (bannerEl) {
        if (weak) {
          bannerEl.style.display = 'flex';
          bannerEl.className = 'insight-banner warning';
          bannerEl.innerHTML = `
            <div class="insight-banner-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="insight-content">
              <h4>Gợi ý trọng tâm: Cần cải thiện môn ${escapeHtml(weak.subjectName)}</h4>
              <p>Môn <strong>${escapeHtml(weak.subjectName)}</strong> hiện có tỷ lệ đúng <strong>${weak.weakRate}%</strong>, thấp hơn <strong>${weak.diff}%</strong> so với trung bình các môn khác (${weak.avgOtherRate}%). Hãy ưu tiên rà soát các chuyên đề còn yếu của môn này.</p>
            </div>
          `;
        } else if (kpis.totalExams === 0) {
          bannerEl.style.display = 'flex';
          bannerEl.className = 'insight-banner';
          bannerEl.innerHTML = `
            <div class="insight-banner-icon" style="color: var(--primary);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <div class="insight-content">
              <h4>Chào mừng bạn đến với V-ACT Study Tracker!</h4>
              <p>Hệ thống đã chuẩn bị sẵn danh mục chuyên đề ôn tập cho 4 phần thi V-ACT. Hãy tạo <strong>Đợt thi thử đầu tiên</strong> hoặc ghi chép buổi luyện tập để bắt đầu theo dõi tiến bộ!</p>
            </div>
          `;
        } else {
          bannerEl.style.display = 'none';
        }
      }

      // Render SVG Score Trend Chart
      this.renderScoreTrendChart();

      // Render 4-Subject Performance Chart
      this.renderSubjectPerformanceChart();

      // Render Attention Topics list
      this.renderAttentionTopics();

      // Render Due Reviews list
      this.renderDueReviews();
    },

    renderScoreTrendChart() {
      const container = document.getElementById('chart-score-trend-container');
      if (!container) return;

      const exams = [...(this.state.exams || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

      // Filter by days if needed
      let filtered = exams;
      if (this.chartTimeFilter !== 'all') {
        const days = parseInt(this.chartTimeFilter, 10);
        const cutoff = new Date(Date.now() - days * 86400000);
        filtered = exams.filter(e => new Date(e.date) >= cutoff);
      }

      // Only plot complete exams on official line
      const completeExams = filtered.filter(e => AnalyticsEngine.calculateExamScore(e).isComplete);

      if (completeExams.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 36px 16px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <h3>Chưa đủ dữ liệu biểu đồ</h3>
            <p>Biểu đồ tổng điểm chỉ vẽ các đợt thi đã nhập đầy đủ điểm cả 4 môn (thang 1.200).</p>
          </div>
        `;
        return;
      }

      const W = 680;
      const H = 240;
      const padLeft = 45;
      const padRight = 20;
      const padTop = 20;
      const padBottom = 35;
      const graphW = W - padLeft - padRight;
      const graphH = H - padTop - padBottom;

      const targetScore = this.state.settings?.targetScore || 950;
      const targetY = padTop + graphH - (targetScore / 1200) * graphH;

      // Generate points
      const n = completeExams.length;
      const points = completeExams.map((ex, idx) => {
        const x = n === 1 ? padLeft + graphW / 2 : padLeft + (idx / (n - 1)) * graphW;
        const sc = AnalyticsEngine.calculateExamScore(ex).totalScore;
        const y = padTop + graphH - (sc / 1200) * graphH;
        return { x, y, score: sc, exam: ex };
      });

      // SVG Path
      let pathD = '';
      points.forEach((pt, idx) => {
        if (idx === 0) pathD += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        else pathD += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      });

      // Area under curve
      let areaD = pathD;
      if (points.length > 1) {
        const last = points[points.length - 1];
        const first = points[0];
        areaD += ` L ${last.x.toFixed(1)} ${(padTop + graphH).toFixed(1)} L ${first.x.toFixed(1)} ${(padTop + graphH).toFixed(1)} Z`;
      }

      // Y-axis markers: 0, 300, 600, 900, 1200
      const yTicks = [0, 300, 600, 900, 1200];
      let gridLines = '';
      yTicks.forEach(tick => {
        const y = padTop + graphH - (tick / 1200) * graphH;
        gridLines += `
          <line x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="${tick === 0 ? '' : '3,3'}"/>
          <text x="${padLeft - 8}" y="${y + 4}" fill="#94A3B8" font-size="10.5" text-anchor="end" font-family="sans-serif">${tick}</text>
        `;
      });

      // Target score line
      const targetLine = `
        <line x1="${padLeft}" y1="${targetY}" x2="${W - padRight}" y2="${targetY}" stroke="#2563EB" stroke-width="1.5" stroke-dasharray="4,4"/>
        <text x="${W - padRight - 4}" y="${targetY - 5}" fill="#2563EB" font-size="11" font-weight="600" text-anchor="end" font-family="sans-serif">Mục tiêu: ${targetScore}</text>
      `;

      // Data dots and date labels
      let dotsSvg = '';
      let xLabelsSvg = '';
      points.forEach((pt, idx) => {
        dotsSvg += `
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4.5" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.5" class="chart-point" data-score="${pt.score}" data-name="${escapeHtml(pt.exam.name)}" data-date="${formatDate(pt.exam.date)}" style="cursor:pointer; transition: transform 0.15s ease;">
            <title>${escapeHtml(pt.exam.name)}: ${pt.score}/1.200 (${formatDate(pt.exam.date)})</title>
          </circle>
        `;
        if (n <= 8 || idx === 0 || idx === n - 1 || idx % Math.ceil(n / 6) === 0) {
          xLabelsSvg += `
            <text x="${pt.x.toFixed(1)}" y="${H - 10}" fill="#64748B" font-size="10.5" text-anchor="middle" font-family="sans-serif">${formatDate(pt.exam.date)}</text>
          `;
        }
      });

      container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="svg-chart" style="width:100%; height:auto;">
          <defs>
            <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2563EB" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          ${gridLines}
          ${targetLine}
          ${points.length > 1 ? `<path d="${areaD}" fill="url(#scoreAreaGrad)"/>` : ''}
          <path d="${pathD}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${dotsSvg}
          ${xLabelsSvg}
        </svg>
      `;
    },

    renderSubjectPerformanceChart() {
      const container = document.getElementById('chart-subjects-container');
      if (!container) return;

      const exams = [...(this.state.exams || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      if (exams.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 36px 16px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V9"/><path d="M15 17v-4"/></svg>
            <h3>Chưa có dữ liệu 4 môn</h3>
            <p>Nhập kết quả các đợt thi để xem biểu đồ so sánh chi tiết từng môn.</p>
          </div>
        `;
        return;
      }

      const W = 420;
      const H = 240;
      const padLeft = 35;
      const padRight = 15;
      const padTop = 20;
      const padBottom = 35;
      const graphW = W - padLeft - padRight;
      const graphH = H - padTop - padBottom;

      const metric = this.chartSubjectMetric; // 'score' | 'correct' | 'rate'
      let maxVal = 300;
      if (metric === 'correct') maxVal = 30;
      if (metric === 'rate') maxVal = 100;

      // Draw grid
      const yTicks = metric === 'score' ? [0, 100, 200, 300] : (metric === 'correct' ? [0, 10, 20, 30] : [0, 25, 50, 75, 100]);
      let gridLines = '';
      yTicks.forEach(tick => {
        const y = padTop + graphH - (tick / maxVal) * graphH;
        gridLines += `
          <line x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
          <text x="${padLeft - 6}" y="${y + 4}" fill="#94A3B8" font-size="10" text-anchor="end" font-family="sans-serif">${tick}</text>
        `;
      });

      // Lines for each subject
      let linesSvg = '';
      const colors = {
        vietnamese: '#4F46E5',
        english: '#059669',
        math: '#D97706',
        science: '#E11D48'
      };

      const n = exams.length;
      SUBJECTS_CONFIG.forEach(sub => {
        if (!this.visibleChartSubjects[sub.id]) return;

        const subPoints = [];
        exams.forEach((ex, idx) => {
          const sc = ex.scores?.[sub.id];
          if (!sc) return;
          let val = 0;
          if (metric === 'score') val = sc.score ?? 0;
          else if (metric === 'correct') val = sc.correct ?? 0;
          else val = (sc.correct / 30) * 100;

          const x = n === 1 ? padLeft + graphW / 2 : padLeft + (idx / (n - 1)) * graphW;
          const y = padTop + graphH - (val / maxVal) * graphH;
          subPoints.push({ x, y, val });
        });

        if (subPoints.length > 0) {
          let pathD = '';
          subPoints.forEach((pt, idx) => {
            if (idx === 0) pathD += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
            else pathD += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          });

          linesSvg += `
            <path d="${pathD}" fill="none" stroke="${colors[sub.id]}" stroke-width="2" stroke-linecap="round"/>
          `;

          subPoints.forEach(pt => {
            linesSvg += `
              <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3" fill="#FFFFFF" stroke="${colors[sub.id]}" stroke-width="2">
                <title>${sub.name}: ${pt.val}${metric === 'rate' ? '%' : ''}</title>
              </circle>
            `;
          });
        }
      });

      container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="svg-chart" style="width:100%; height:auto;">
          ${gridLines}
          ${linesSvg}
        </svg>
      `;
    },

    renderAttentionTopics() {
      const container = document.getElementById('overview-attention-list');
      if (!container) return;

      const topics = AnalyticsEngine.getAttentionTopics(this.state, 5);
      if (topics.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 24px 16px;">
            <p>Chưa có chuyên đề nào có số lỗi sai đáng chú ý. Bạn đang làm rất tốt!</p>
          </div>
        `;
        return;
      }

      let html = '';
      topics.forEach(t => {
        const sub = SUBJECTS_CONFIG.find(s => s.id === t.subjectId);
        html += `
          <div class="attention-item" onclick="UI.openTopicDetail('${t.id}')">
            <div class="attention-left">
              <span class="attention-title">${escapeHtml(t.name)}</span>
              <div class="attention-meta">
                <span class="badge ${sub ? sub.badgeClass : 'badge-gray'}">${sub ? sub.shortName : ''}</span>
                <span>${t.wrongCount} lỗi ghi nhận</span>
                <span>Độ nắm vững: ${t.masteryLevel}/5</span>
              </div>
            </div>
            <button class="btn btn-sm btn-outline" style="border-radius: 999px;">Ôn tập</button>
          </div>
        `;
      });
      container.innerHTML = html;
    },

    renderDueReviews() {
      const container = document.getElementById('overview-due-list');
      if (!container) return;

      const due = AnalyticsEngine.getDueReviews(this.state, 5);
      if (due.dueTopics.length === 0 && due.dueNotes.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 24px 16px;">
            <p>Hôm nay không có chuyên đề hoặc câu sai nào đến hạn ôn lại. Hãy dành thời gian luyện thêm đề mới!</p>
          </div>
        `;
        return;
      }

      let html = '';
      due.dueTopics.forEach(t => {
        html += `
          <div class="attention-item" onclick="UI.openTopicDetail('${t.id}')">
            <div class="attention-left">
              <span class="attention-title">📚 ${escapeHtml(t.name)}</span>
              <div class="attention-meta">
                <span class="badge badge-yellow">Chuyên đề cần ôn</span>
                <span>Ưu tiên: ${t.priority === 'high' ? 'Cao' : (t.priority === 'medium' ? 'TB' : 'Thấp')}</span>
              </div>
            </div>
            <button class="btn btn-sm btn-primary" style="border-radius: 999px;">Ôn ngay</button>
          </div>
        `;
      });

      due.dueNotes.forEach(n => {
        html += `
          <div class="attention-item" onclick="UI.openNoteDetail('${n.id}')">
            <div class="attention-left">
              <span class="attention-title">❌ ${escapeHtml(n.title)}</span>
              <div class="attention-meta">
                <span class="badge badge-red">Lỗi sai chưa ôn</span>
                <span>Lần ôn: ${n.reviewCount || 0}</span>
              </div>
            </div>
            <button class="btn btn-sm btn-outline" style="border-radius: 999px;">Xem lỗi</button>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    // --- 4.2 VIEW: CHUYÊN ĐỀ ÔN TẬP (TOPICS) ---
    renderTopics() {
      const activeSub = this.activeTopicSubject;
      const subConfig = SUBJECTS_CONFIG.find(s => s.id === activeSub) || SUBJECTS_CONFIG[0];

      // Update Subject Tab Buttons
      document.querySelectorAll('.topic-sub-tab').forEach(btn => {
        if (btn.getAttribute('data-sub') === activeSub) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Filter topics of this subject
      let topics = (this.state.topics || []).filter(t => t.subjectId === activeSub);

      // Subject stats banner
      const total = topics.length;
      const mastered = topics.filter(t => t.status === 'mastered').length;
      const inProgress = topics.filter(t => t.status === 'in_progress').length;
      const needsReview = topics.filter(t => t.status === 'needs_review').length;
      const notStarted = topics.filter(t => t.status === 'not_started').length;

      const statBanner = document.getElementById('topics-subject-stats');
      if (statBanner) {
        statBanner.innerHTML = `
          <div class="subject-stat-pill"><strong>${total}</strong> chuyên đề</div>
          <div class="subject-stat-pill"><span class="badge badge-green">✓ ${mastered} Đã nắm vững</span></div>
          <div class="subject-stat-pill"><span class="badge badge-blue">⚡ ${inProgress} Đang học</span></div>
          <div class="subject-stat-pill"><span class="badge badge-yellow">⚠ ${needsReview} Cần ôn lại</span></div>
          <div class="subject-stat-pill"><span class="badge badge-gray">○ ${notStarted} Chưa học</span></div>
        `;
      }

      // Group dropdown filter
      const groupSelect = document.getElementById('topic-filter-group');
      if (groupSelect) {
        const groups = [...new Set(topics.map(t => t.groupName))];
        let opts = '<option value="all">Tất cả nhóm</option>';
        groups.forEach(g => {
          opts += `<option value="${escapeHtml(g)}" ${this.activeTopicGroup === g ? 'selected' : ''}>${escapeHtml(g)}</option>`;
        });
        groupSelect.innerHTML = opts;
      }

      // Search & Status filters
      if (this.topicSearchQuery) {
        const q = this.topicSearchQuery.toLowerCase();
        topics = topics.filter(t => t.name.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
      }
      if (this.activeTopicStatus !== 'all') {
        topics = topics.filter(t => t.status === this.activeTopicStatus);
      }
      if (this.activeTopicGroup !== 'all') {
        topics = topics.filter(t => t.groupName === this.activeTopicGroup);
      }

      // Render Group Accordions
      const container = document.getElementById('topics-list-container');
      if (!container) return;

      if (topics.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <h3>Không tìm thấy chuyên đề phù hợp</h3>
            <p>Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ bớt bộ lọc nhóm / trạng thái.</p>
          </div>
        `;
        return;
      }

      // Group topics by groupName
      const groupsMap = {};
      topics.forEach(t => {
        if (!groupsMap[t.groupName]) groupsMap[t.groupName] = [];
        groupsMap[t.groupName].push(t);
      });

      let html = '';
      Object.keys(groupsMap).forEach(gName => {
        const gTopics = groupsMap[gName];
        html += `
          <div class="group-accordion">
            <div class="group-header expanded" onclick="this.classList.toggle('expanded'); this.nextElementSibling.style.display = this.classList.contains('expanded') ? 'grid' : 'none';">
              <div class="group-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span>${escapeHtml(gName)}</span>
                <span class="group-count">(${gTopics.length})</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="group-body">
              ${gTopics.map(t => this.renderTopicCard(t)).join('')}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    renderTopicCard(t) {
      const statusBadges = {
        mastered: '<span class="badge badge-green">Đã nắm vững</span>',
        in_progress: '<span class="badge badge-blue">Đang học</span>',
        needs_review: '<span class="badge badge-yellow">Cần ôn lại</span>',
        not_started: '<span class="badge badge-gray">Chưa học</span>'
      };

      const dots = [1, 2, 3, 4, 5].map(lvl => `
        <span class="mastery-dot ${lvl <= (t.masteryLevel || 1) ? 'active' : ''}"></span>
      `).join('');

      return `
        <div class="topic-card" onclick="UI.openTopicDetail('${t.id}')">
          <div class="topic-card-top">
            <div class="topic-card-header">
              <span class="topic-name">${escapeHtml(t.name)}</span>
              ${statusBadges[t.status] || ''}
            </div>
            <p class="topic-desc">${escapeHtml(t.description || 'Chưa có mô tả chi tiết.')}</p>
          </div>
          <div class="topic-card-bottom">
            <div class="mastery-dots" title="Độ thành thạo: ${t.masteryLevel || 1}/5">${dots}</div>
            <div>${t.wrongCount ? `<span style="color:var(--danger);font-weight:600;">${t.wrongCount} lỗi</span>` : '0 lỗi'}</div>
          </div>
        </div>
      `;
    },

    openTopicDetail(topicId) {
      const topic = (this.state.topics || []).find(t => t.id === topicId);
      if (!topic) return;

      const sub = SUBJECTS_CONFIG.find(s => s.id === topic.subjectId);
      const notes = (this.state.notes || []).filter(n => n.topicId === topicId);
      const practices = (this.state.practiceSessions || []).filter(p => p.topicId === topicId);

      // Wrong exam questions
      const wrongQuestions = [];
      (this.state.exams || []).forEach(ex => {
        if (Array.isArray(ex.questions)) {
          ex.questions.forEach(q => {
            if (q.status === 'wrong' && q.topicId === topicId) {
              wrongQuestions.push({ exam: ex, question: q });
            }
          });
        }
      });

      const modalTitle = document.getElementById('modal-topic-detail-title');
      const modalBody = document.getElementById('modal-topic-detail-body');

      if (modalTitle) modalTitle.textContent = `${sub ? sub.name : ''} — ${topic.name}`;

      const statusLabels = {
        mastered: 'Đã nắm vững',
        in_progress: 'Đang học',
        needs_review: 'Cần ôn lại',
        not_started: 'Chưa học'
      };

      if (modalBody) {
        modalBody.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div>
              <span class="badge ${sub ? sub.badgeClass : 'badge-gray'}">${sub ? sub.name : ''}</span>
              <span class="badge badge-gray" style="margin-left:6px;">${escapeHtml(topic.groupName)}</span>
              <p style="margin-top:8px; font-size:13.5px; color:var(--text-muted); line-height:1.5;">${escapeHtml(topic.description || '')}</p>
            </div>
            <button class="btn btn-sm btn-outline" onclick="UI.openEditTopicForm('${topic.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Sửa
            </button>
          </div>

          <!-- Quick Status & Mastery Update -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; background:#FAFBFD; padding:12px; border-radius:8px; border:1px solid var(--border); margin-bottom:20px;">
            <div>
              <label style="font-size:12px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">Trạng thái:</label>
              <select class="form-control" onchange="UI.updateTopicQuickStatus('${topic.id}', this.value)" style="padding:6px 10px;">
                <option value="not_started" ${topic.status === 'not_started' ? 'selected' : ''}>Chưa học</option>
                <option value="in_progress" ${topic.status === 'in_progress' ? 'selected' : ''}>Đang học</option>
                <option value="needs_review" ${topic.status === 'needs_review' ? 'selected' : ''}>Cần ôn lại</option>
                <option value="mastered" ${topic.status === 'mastered' ? 'selected' : ''}>Đã nắm vững</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">Độ thành thạo (1-5):</label>
              <select class="form-control" onchange="UI.updateTopicQuickMastery('${topic.id}', parseInt(this.value, 10))" style="padding:6px 10px;">
                <option value="1" ${topic.masteryLevel === 1 ? 'selected' : ''}>1 - Mới bắt đầu</option>
                <option value="2" ${topic.masteryLevel === 2 ? 'selected' : ''}>2 - Nắm cơ bản</option>
                <option value="3" ${topic.masteryLevel === 3 ? 'selected' : ''}>3 - Khá vững</option>
                <option value="4" ${topic.masteryLevel === 4 ? 'selected' : ''}>4 - Tốt, ít sai</option>
                <option value="5" ${topic.masteryLevel === 5 ? 'selected' : ''}>5 - Nắm vững hoàn toàn</option>
              </select>
            </div>
          </div>

          <!-- Action buttons -->
          <div style="display:flex; gap:10px; margin-bottom:20px;">
            <button class="btn btn-sm btn-primary" onclick="UI.openPracticeFormForTopic('${topic.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
              + Ghi nhận buổi luyện tập
            </button>
            <button class="btn btn-sm btn-secondary" onclick="UI.openNoteFormForTopic('${topic.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              + Thêm ghi chú / công thức
            </button>
          </div>

          <!-- Related Error Questions from Exams -->
          <h4 style="font-size:14px; font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <span style="color:var(--danger)">❌</span> Các câu làm sai trong đề thi thử (${wrongQuestions.length})
          </h4>
          ${wrongQuestions.length === 0 ? `
            <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:20px;">Chưa ghi nhận câu sai nào trong các đợt thi thử gắn với chuyên đề này.</p>
          ` : `
            <div class="table-responsive" style="margin-bottom:20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Đề thi</th>
                    <th>Câu số</th>
                    <th>Nguyên nhân</th>
                    <th>Ghi chú</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${wrongQuestions.map(item => `
                    <tr>
                      <td><strong>${escapeHtml(item.exam.name)}</strong></td>
                      <td><span class="badge badge-red">Câu ${item.question.qNum}</span></td>
                      <td>${escapeHtml(item.question.errorReason || 'Chưa phân loại')}</td>
                      <td>${escapeHtml(item.question.note || '--')}</td>
                      <td>
                        <button class="btn btn-sm btn-outline" onclick="UI.createNoteFromExamQuestion('${item.exam.id}', ${item.question.qNum})">Tạo ghi chú</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}

          <!-- Related Notes -->
          <h4 style="font-size:14px; font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <span>📝</span> Ghi chú & Lỗi sai liên quan (${notes.length})
          </h4>
          ${notes.length === 0 ? `
            <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:20px;">Chưa có ghi chú nào cho chuyên đề này.</p>
          ` : `
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">
              ${notes.map(n => `
                <div class="attention-item" onclick="UI.openNoteDetail('${n.id}')">
                  <div>
                    <strong>${escapeHtml(n.title)}</strong>
                    <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">
                      <span>${n.type}</span> • Lần ôn: ${n.reviewCount || 0}
                    </div>
                  </div>
                  <span class="badge ${n.reviewStatus === 'resolved' ? 'badge-green' : 'badge-yellow'}">${n.reviewStatus === 'resolved' ? 'Đã khắc phục' : 'Cần ôn'}</span>
                </div>
              `).join('')}
            </div>
          `}

          <!-- Practice History -->
          <h4 style="font-size:14px; font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <span>🎯</span> Lịch sử luyện tập chuyên đề (${practices.length})
          </h4>
          ${practices.length === 0 ? `
            <p style="font-size:12.5px; color:var(--text-muted);">Chưa có buổi luyện tập nào được ghi lại.</p>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Đúng / Tổng</th>
                    <th>Tỷ lệ</th>
                    <th>Thời gian</th>
                    <th>Tài liệu</th>
                  </tr>
                </thead>
                <tbody>
                  ${practices.map(p => {
                    const acc = p.totalQuestions > 0 ? Math.round((p.correctQuestions / p.totalQuestions) * 100) : 0;
                    return `
                      <tr>
                        <td>${formatDate(p.date)}</td>
                        <td><strong>${p.correctQuestions}/${p.totalQuestions}</strong></td>
                        <td><span class="badge ${acc >= 80 ? 'badge-green' : (acc >= 60 ? 'badge-blue' : 'badge-yellow')}">${acc}%</span></td>
                        <td>${p.durationMinutes ? `${p.durationMinutes}p` : '--'}</td>
                        <td>${escapeHtml(p.source || '--')}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        `;
      }

      this.showModal('modal-topic-detail');
    },

    updateTopicQuickStatus(topicId, newStatus) {
      const topic = (this.state.topics || []).find(t => t.id === topicId);
      if (!topic) return;
      topic.status = newStatus;
      topic.lastReviewedDate = new Date().toISOString();
      StorageService.save(this.state);
      this.renderTopics();
      this.showToast('Đã cập nhật trạng thái chuyên đề.', 'success');
    },

    updateTopicQuickMastery(topicId, newLevel) {
      const topic = (this.state.topics || []).find(t => t.id === topicId);
      if (!topic) return;
      topic.masteryLevel = Math.max(1, Math.min(5, newLevel));
      StorageService.save(this.state);
      this.renderTopics();
      this.showToast('Đã cập nhật độ thành thạo chuyên đề.', 'success');
    },

    // --- 4.3 VIEW: THI THỬ V-ACT (EXAMS) ---
    renderExams() {
      const container = document.getElementById('exams-table-body');
      if (!container) return;

      const exams = [...(this.state.exams || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

      if (exams.length === 0) {
        container.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <h3>Bạn chưa có đợt thi thử nào</h3>
                <p>Hãy thêm kết quả đầu tiên để bắt đầu theo dõi tiến bộ ôn thi V-ACT!</p>
                <button class="btn btn-primary" onclick="UI.openExamForm()">+ Thêm đợt thi thử</button>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      exams.forEach(ex => {
        const totals = AnalyticsEngine.calculateExamScore(ex);
        const sc = ex.scores || {};
        const wrongNoteCount = (this.state.notes || []).filter(n => n.examId === ex.id).length;

        html += `
          <tr>
            <td>
              <strong>${escapeHtml(ex.name)}</strong>
              <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(ex.source || 'Nguồn tự do')}</div>
            </td>
            <td>${formatDate(ex.date)}</td>
            <td>
              <strong>${totals.totalCorrect}/120</strong>
              <div style="font-size:11px; color:var(--text-muted);">${totals.accuracy}%</div>
            </td>
            <td>
              <span style="font-size:15px; font-weight:800; color:${totals.isComplete ? 'var(--primary)' : 'var(--warning)'};">
                ${totals.totalScore}
              </span>
              <span style="font-size:11.5px; color:var(--text-muted);">/1.200</span>
            </td>
            <td>
              <div style="display:flex; gap:4px; font-size:11.5px;">
                <span class="badge sub-tag-tv" title="Tiếng Việt">${sc.vietnamese?.score ?? '--'}</span>
                <span class="badge sub-tag-en" title="Tiếng Anh">${sc.english?.score ?? '--'}</span>
                <span class="badge sub-tag-ma" title="Toán">${sc.math?.score ?? '--'}</span>
                <span class="badge sub-tag-sc" title="Tư duy KH">${sc.science?.score ?? '--'}</span>
              </div>
            </td>
            <td>
              ${wrongNoteCount > 0 ? `<span class="badge badge-yellow">${wrongNoteCount} ghi chú</span>` : '<span style="color:var(--text-light)">0</span>'}
            </td>
            <td>
              <span class="badge ${totals.isComplete ? 'badge-green' : 'badge-yellow'}">
                ${totals.isComplete ? '✓ Hoàn chỉnh' : '⚠ Tạm tính'}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-sm btn-outline" onclick="UI.openExamDetail('${ex.id}')" title="Xem chi tiết">Chi tiết</button>
                <button class="btn btn-sm btn-icon" onclick="UI.openExamForm('${ex.id}')" title="Chỉnh sửa">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-sm btn-icon" onclick="UI.duplicateExam('${ex.id}')" title="Nhân bản">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="btn btn-sm btn-icon btn-danger" onclick="UI.confirmDeleteExam('${ex.id}')" title="Xóa đợt thi">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      container.innerHTML = html;
    },

    openExamForm(examId = null) {
      const isEdit = !!examId;
      const exam = isEdit ? (this.state.exams || []).find(e => e.id === examId) : null;

      document.getElementById('modal-exam-form-title').textContent = isEdit ? 'Chỉnh sửa đợt thi thử' : 'Thêm đợt thi thử mới';
      document.getElementById('exam-form-id').value = examId || '';
      document.getElementById('exam-form-name').value = exam?.name || '';
      document.getElementById('exam-form-date').value = exam?.date || new Date().toISOString().slice(0, 10);
      document.getElementById('exam-form-source').value = exam?.source || '';
      document.getElementById('exam-form-duration').value = exam?.durationMinutes || 150;
      document.getElementById('exam-form-notes').value = exam?.notes || '';

      const mode = exam?.mode || 'quick';
      this.setExamFormMode(mode);

      // Populate Mode A Quick inputs
      const sc = exam?.scores || {};
      ['vietnamese', 'english', 'math', 'science'].forEach(sId => {
        const correctInput = document.getElementById(`exam-quick-${sId}-correct`);
        const scoreInput = document.getElementById(`exam-quick-${sId}-score`);
        if (correctInput) correctInput.value = (sc[sId]?.correct !== undefined) ? sc[sId].correct : '';
        if (scoreInput) scoreInput.value = (sc[sId]?.score !== undefined) ? sc[sId].score : '';
      });

      this.updateExamQuickCalculations();

      // Initialize or load Mode B 120-question grid
      let questions = exam?.questions;
      if (!Array.isArray(questions) || questions.length !== 120) {
        questions = this.generateBlank120Questions();
        // If quick values exist, populate first N questions as correct
        if (sc.vietnamese?.correct) {
          for (let i = 0; i < sc.vietnamese.correct; i++) questions[i].status = 'correct';
        }
      }
      this.currentEditingQuestions = JSON.parse(JSON.stringify(questions));
      this.render120QuestionGrid();

      this.showModal('modal-exam-form');
    },

    setExamFormMode(mode) {
      this.currentExamFormMode = mode;
      document.querySelectorAll('.exam-mode-btn').forEach(btn => {
        if (btn.getAttribute('data-mode') === mode) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      const quickPane = document.getElementById('exam-mode-quick-pane');
      const gridPane = document.getElementById('exam-mode-grid-pane');
      if (quickPane) quickPane.style.display = mode === 'quick' ? 'block' : 'none';
      if (gridPane) gridPane.style.display = mode === 'detailed' ? 'block' : 'none';
    },

    generateBlank120Questions() {
      const list = [];
      for (let i = 1; i <= 120; i++) {
        let subId = 'vietnamese';
        if (i > 30 && i <= 60) subId = 'english';
        else if (i > 60 && i <= 90) subId = 'math';
        else if (i > 90) subId = 'science';

        list.push({
          qNum: i,
          subjectId: subId,
          status: 'ungraded', // 'correct' | 'wrong' | 'blank' | 'ungraded'
          topicId: null,
          errorReason: '',
          note: '',
          needsReview: false
        });
      }
      return list;
    },

    updateExamQuickCalculations() {
      let totalCorrect = 0;
      let totalScore = 0;
      let completeCount = 0;

      ['vietnamese', 'english', 'math', 'science'].forEach(sId => {
        const correctInput = document.getElementById(`exam-quick-${sId}-correct`);
        const scoreInput = document.getElementById(`exam-quick-${sId}-score`);
        const wrongTd = document.getElementById(`exam-quick-${sId}-wrong`);
        const accTd = document.getElementById(`exam-quick-${sId}-acc`);

        const cVal = correctInput && correctInput.value !== '' ? parseInt(correctInput.value, 10) : null;
        const sVal = scoreInput && scoreInput.value !== '' ? parseInt(scoreInput.value, 10) : null;

        if (cVal !== null && !isNaN(cVal)) {
          const clamped = Math.max(0, Math.min(30, cVal));
          totalCorrect += clamped;
          if (wrongTd) wrongTd.textContent = 30 - clamped;
          if (accTd) accTd.textContent = `${((clamped / 30) * 100).toFixed(1)}%`;
        } else {
          if (wrongTd) wrongTd.textContent = '--';
          if (accTd) accTd.textContent = '--';
        }

        if (sVal !== null && !isNaN(sVal)) {
          const clampedScore = Math.max(0, Math.min(300, sVal));
          totalScore += clampedScore;
          completeCount++;
        }
      });

      const totalCorrectTd = document.getElementById('exam-quick-total-correct');
      const totalScoreTd = document.getElementById('exam-quick-total-score');
      const totalAccTd = document.getElementById('exam-quick-total-acc');
      const deltaTargetTd = document.getElementById('exam-quick-delta-target');

      if (totalCorrectTd) totalCorrectTd.textContent = `${totalCorrect}/120`;
      if (totalAccTd) totalAccTd.textContent = `${((totalCorrect / 120) * 100).toFixed(1)}%`;
      if (totalScoreTd) {
        totalScoreTd.textContent = `${totalScore}/1.200 ${completeCount < 4 ? '(tạm tính)' : ''}`;
      }

      const target = this.state.settings?.targetScore || 950;
      if (deltaTargetTd) {
        const diff = totalScore - target;
        deltaTargetTd.textContent = `${diff >= 0 ? '+' : ''}${diff}`;
        deltaTargetTd.className = diff >= 0 ? 'delta-pill pos' : 'delta-pill neg';
      }
    },

    // Mode B: 120 Questions Matrix rendering
    render120QuestionGrid() {
      const container = document.getElementById('exam-grid-container');
      if (!container) return;

      const questions = this.currentEditingQuestions || [];

      // Render 4 sections
      const sections = [
        { name: 'Phần 1: Tiếng Việt (Câu 1 – 30)', start: 1, end: 30, subId: 'vietnamese' },
        { name: 'Phần 2: Tiếng Anh (Câu 31 – 60)', start: 31, end: 60, subId: 'english' },
        { name: 'Phần 3: Toán học (Câu 61 – 90)', start: 61, end: 90, subId: 'math' },
        { name: 'Phần 4: Tư duy khoa học (Câu 91 – 120)', start: 91, end: 120, subId: 'science' }
      ];

      let html = '';
      sections.forEach(sec => {
        const secQuestions = questions.slice(sec.start - 1, sec.end);
        const correctCount = secQuestions.filter(q => q.status === 'correct').length;
        const wrongCount = secQuestions.filter(q => q.status === 'wrong').length;
        const blankCount = secQuestions.filter(q => q.status === 'blank').length;

        html += `
          <div class="matrix-section">
            <div class="matrix-header">
              <h4>${sec.name}</h4>
              <div class="matrix-legend">
                <span class="legend-item"><span class="legend-dot" style="background:var(--success)"></span> Đúng: <strong>${correctCount}</strong></span>
                <span class="legend-item"><span class="legend-dot" style="background:var(--danger)"></span> Sai: <strong>${wrongCount}</strong></span>
                <span class="legend-item"><span class="legend-dot" style="background:#94A3B8"></span> Bỏ trống: <strong>${blankCount}</strong></span>
              </div>
            </div>
            ${sec.subId === 'science' ? `
              <div style="font-size:11.5px; color:var(--text-muted); margin-bottom:6px; display:flex; gap:16px;">
                <span>• Câu 91–102: Logic & Phân tích số liệu (12 câu)</span>
                <span>• Câu 103–120: Suy luận khoa học (18 câu)</span>
              </div>
            ` : ''}
            <div class="q-grid">
              ${secQuestions.map(q => `
                <button type="button" class="q-btn ${q.status} ${q.note || q.topicId ? 'has-note' : ''}" onclick="UI.toggleQuestionStatus(${q.qNum})">
                  ${q.qNum}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
      this.syncGridCountsToQuickInputs();
    },

    toggleQuestionStatus(qNum) {
      if (!this.currentEditingQuestions) return;
      const q = this.currentEditingQuestions[qNum - 1];
      if (!q) return;

      // Cycle: ungraded -> correct -> wrong -> blank -> ungraded
      const cycle = {
        ungraded: 'correct',
        correct: 'wrong',
        wrong: 'blank',
        blank: 'ungraded'
      };

      q.status = cycle[q.status] || 'correct';

      if (q.status === 'wrong') {
        this.openWrongQuestionDrawer(qNum);
      } else {
        const panel = document.getElementById('wrong-q-drawer-panel');
        if (panel && this.activeWrongQuestionNum === qNum) {
          panel.style.display = 'none';
        }
      }

      this.render120QuestionGrid();
    },

    openWrongQuestionDrawer(qNum) {
      const q = this.currentEditingQuestions[qNum - 1];
      if (!q) return;
      this.activeWrongQuestionNum = qNum;

      const panel = document.getElementById('wrong-q-drawer-panel');
      if (!panel) return;

      panel.style.display = 'block';
      const titleEl = document.getElementById('wrong-q-drawer-title');
      if (titleEl) titleEl.textContent = `Ghi nhận lỗi sai Câu ${qNum} (${q.subjectId.toUpperCase()})`;

      // Populate Topics dropdown for this subject
      const topicSelect = document.getElementById('wrong-q-topic-select');
      if (topicSelect) {
        const subTopics = (this.state.topics || []).filter(t => t.subjectId === q.subjectId);
        let opts = '<option value="">-- Chọn chuyên đề liên quan --</option>';
        subTopics.forEach(t => {
          opts += `<option value="${t.id}" ${q.topicId === t.id ? 'selected' : ''}>${escapeHtml(t.name)} (${escapeHtml(t.groupName)})</option>`;
        });
        topicSelect.innerHTML = opts;
      }

      const reasonSelect = document.getElementById('wrong-q-reason-select');
      if (reasonSelect) reasonSelect.value = q.errorReason || '';

      const noteInput = document.getElementById('wrong-q-note-input');
      if (noteInput) noteInput.value = q.note || '';

      const revCheck = document.getElementById('wrong-q-review-check');
      if (revCheck) revCheck.checked = !!q.needsReview;
    },

    saveWrongQuestionDrawer() {
      const qNum = this.activeWrongQuestionNum;
      if (!qNum || !this.currentEditingQuestions) return;
      const q = this.currentEditingQuestions[qNum - 1];
      if (!q) return;

      const topicSelect = document.getElementById('wrong-q-topic-select');
      const reasonSelect = document.getElementById('wrong-q-reason-select');
      const noteInput = document.getElementById('wrong-q-note-input');
      const revCheck = document.getElementById('wrong-q-review-check');

      q.topicId = topicSelect?.value || null;
      q.errorReason = reasonSelect?.value || '';
      q.note = noteInput?.value || '';
      q.needsReview = !!revCheck?.checked;

      document.getElementById('wrong-q-drawer-panel').style.display = 'none';
      this.render120QuestionGrid();
      this.showToast(`Đã lưu thông tin lỗi sai câu ${qNum}.`, 'success');
    },

    createNoteFromWrongQuestionDrawer() {
      const qNum = this.activeWrongQuestionNum;
      if (!qNum || !this.currentEditingQuestions) return;
      const q = this.currentEditingQuestions[qNum - 1];
      if (!q) return;

      this.saveWrongQuestionDrawer();

      // Open Note modal pre-populated
      const examName = document.getElementById('exam-form-name')?.value || 'Đề thi V-ACT';
      this.openNoteForm(null, {
        title: `Lỗi sai Câu ${qNum} — ${examName}`,
        subjectId: q.subjectId,
        topicId: q.topicId,
        questionNumber: qNum,
        type: 'wrong_question',
        rootCause: q.errorReason,
        content: q.note || `Lỗi sai ghi nhận tại câu ${qNum} môn ${q.subjectId}.`,
        priority: 'high',
        reviewStatus: 'not_reviewed'
      });
    },

    syncGridCountsToQuickInputs() {
      if (!this.currentEditingQuestions) return;
      const questions = this.currentEditingQuestions;

      const tvCorrect = questions.slice(0, 30).filter(q => q.status === 'correct').length;
      const enCorrect = questions.slice(30, 60).filter(q => q.status === 'correct').length;
      const maCorrect = questions.slice(60, 90).filter(q => q.status === 'correct').length;
      const scCorrect = questions.slice(90, 120).filter(q => q.status === 'correct').length;

      const inpTv = document.getElementById('exam-quick-vietnamese-correct');
      const inpEn = document.getElementById('exam-quick-english-correct');
      const inpMa = document.getElementById('exam-quick-math-correct');
      const inpSc = document.getElementById('exam-quick-science-correct');

      if (inpTv) inpTv.value = tvCorrect;
      if (inpEn) inpEn.value = enCorrect;
      if (inpMa) inpMa.value = maCorrect;
      if (inpSc) inpSc.value = scCorrect;

      this.updateExamQuickCalculations();
    },

    setAllQuestionsCorrect() {
      if (!this.currentEditingQuestions) return;
      this.currentEditingQuestions.forEach(q => q.status = 'correct');
      this.render120QuestionGrid();
      this.showToast('Đã đánh dấu tất cả 120 câu là đúng.', 'success');
    },

    resetAllQuestions() {
      if (!this.currentEditingQuestions) return;
      this.currentEditingQuestions.forEach(q => {
        q.status = 'ungraded';
        q.topicId = null;
        q.errorReason = '';
        q.note = '';
      });
      this.render120QuestionGrid();
      this.showToast('Đã đặt lại trạng thái 120 câu.', 'info');
    },

    saveExamForm() {
      const id = document.getElementById('exam-form-id').value;
      const name = document.getElementById('exam-form-name').value.trim();
      const date = document.getElementById('exam-form-date').value;
      const source = document.getElementById('exam-form-source').value.trim();
      const durationMinutes = parseInt(document.getElementById('exam-form-duration').value, 10) || 150;
      const notes = document.getElementById('exam-form-notes').value.trim();

      if (!name) {
        this.showToast('Vui lòng nhập tên đợt thi thử!', 'error');
        return;
      }
      if (!date) {
        this.showToast('Vui lòng chọn ngày thi!', 'error');
        return;
      }

      // Read quick score table
      const scores = {};
      let hasValidationError = false;

      ['vietnamese', 'english', 'math', 'science'].forEach(sId => {
        const correctVal = document.getElementById(`exam-quick-${sId}-correct`).value;
        const scoreVal = document.getElementById(`exam-quick-${sId}-score`).value;

        const cNum = correctVal !== '' ? parseInt(correctVal, 10) : 0;
        const sNum = scoreVal !== '' ? parseInt(scoreVal, 10) : null;

        // Validation test 5: correct <= 30, score <= 300
        if (cNum < 0 || cNum > 30) {
          this.showToast(`Số câu đúng của môn ${sId} phải từ 0 đến 30!`, 'error');
          hasValidationError = true;
          return;
        }
        if (sNum !== null && (sNum < 0 || sNum > 300)) {
          this.showToast(`Điểm V-ACT môn ${sId} phải từ 0 đến 300!`, 'error');
          hasValidationError = true;
          return;
        }

        scores[sId] = {
          correct: cNum,
          total: 30,
          score: sNum
        };
      });

      if (hasValidationError) return;

      const isEdit = !!id;
      const examId = isEdit ? id : generateId('exam');

      const examObj = {
        id: examId,
        name,
        date,
        source,
        durationMinutes,
        notes,
        mode: this.currentExamFormMode || 'quick',
        scores,
        questions: this.currentEditingQuestions || this.generateBlank120Questions(),
        updatedAt: new Date().toISOString()
      };

      if (!isEdit) {
        examObj.createdAt = new Date().toISOString();
        if (!Array.isArray(this.state.exams)) this.state.exams = [];
        this.state.exams.unshift(examObj);
        StorageService.logActivity(this.state, 'exam_created', `Thêm đợt thi thử: ${name}`, `Điểm tổng: ${AnalyticsEngine.calculateExamScore(examObj).totalScore}/1.200`);
      } else {
        const idx = this.state.exams.findIndex(e => e.id === id);
        if (idx !== -1) {
          examObj.createdAt = this.state.exams[idx].createdAt;
          this.state.exams[idx] = examObj;
          StorageService.logActivity(this.state, 'exam_updated', `Cập nhật đợt thi: ${name}`, 'Đã lưu các thay đổi về điểm và kết quả.');
        }
      }

      StorageService.save(this.state);
      this.closeModal('modal-exam-form');
      this.renderExams();
      this.renderOverview();
      this.showToast(`Đã lưu đợt thi "${name}" thành công!`, 'success');
    },

    openExamDetail(examId) {
      const exam = (this.state.exams || []).find(e => e.id === examId);
      if (!exam) return;

      const totals = AnalyticsEngine.calculateExamScore(exam);
      const sc = exam.scores || {};

      document.getElementById('modal-exam-detail-title').textContent = exam.name;
      const body = document.getElementById('modal-exam-detail-body');
      if (!body) return;

      const wrongQuestions = (exam.questions || []).filter(q => q.status === 'wrong');

      body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#FAFBFD; padding:16px; border-radius:10px; border:1px solid var(--border); margin-bottom:20px;">
          <div>
            <div style="font-size:12px; color:var(--text-muted);">TỔNG ĐIỂM V-ACT</div>
            <div style="font-size:28px; font-weight:800; color:${totals.isComplete ? 'var(--primary)' : 'var(--warning)'}; line-height:1.2;">
              ${totals.totalScore} <span style="font-size:14px; font-weight:500; color:var(--text-muted);">/1.200</span>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
              ${totals.isComplete ? '✓ Đầy đủ 4 môn thi' : `⚠ Chưa đủ điểm môn: ${totals.missingSubjects.join(', ')}`}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:var(--text-muted);">ĐỘ CHÍNH XÁC</div>
            <div style="font-size:22px; font-weight:700; color:var(--text-main);">${totals.totalCorrect}/120 (${totals.accuracy}%)</div>
            <div style="font-size:12px; color:var(--text-muted);">${formatDate(exam.date)} • ${exam.durationMinutes || 150} phút</div>
          </div>
        </div>

        <!-- 4 Subjects breakdown table -->
        <h4 style="font-size:14px; font-weight:700; margin-bottom:10px;">Điểm số chi tiết 4 phần thi</h4>
        <div class="table-responsive" style="margin-bottom:20px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Thành phần</th>
                <th>Số câu đúng</th>
                <th>Tỷ lệ đúng</th>
                <th>Điểm V-ACT</th>
                <th>Tối đa</th>
              </tr>
            </thead>
            <tbody>
              ${SUBJECTS_CONFIG.map(sub => {
                const sData = sc[sub.id] || {};
                const c = sData.correct ?? 0;
                const score = sData.score !== null && sData.score !== undefined ? sData.score : '--';
                return `
                  <tr>
                    <td><strong>${sub.name}</strong></td>
                    <td>${c} / 30</td>
                    <td>${((c / 30) * 100).toFixed(1)}%</td>
                    <td><strong style="color:${sub.color}">${score}</strong></td>
                    <td>300</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Wrong questions log -->
        <h4 style="font-size:14px; font-weight:700; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <span>Danh sách câu làm sai (${wrongQuestions.length})</span>
          ${wrongQuestions.length > 0 ? `<button class="btn btn-sm btn-outline" onclick="UI.createAllNotesFromExam('${exam.id}')">Tạo ghi chú cho tất cả lỗi</button>` : ''}
        </h4>
        ${wrongQuestions.length === 0 ? `
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">Tuyệt vời! Không có câu sai nào được ghi nhận trong đợt thi này.</p>
        ` : `
          <div class="table-responsive" style="margin-bottom:20px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Câu</th>
                  <th>Môn</th>
                  <th>Chuyên đề</th>
                  <th>Nguyên nhân sai</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${wrongQuestions.map(q => {
                  const topic = (this.state.topics || []).find(t => t.id === q.topicId);
                  const sub = SUBJECTS_CONFIG.find(s => s.id === q.subjectId);
                  return `
                    <tr>
                      <td><span class="badge badge-red">Câu ${q.qNum}</span></td>
                      <td><span class="badge ${sub ? sub.badgeClass : 'badge-gray'}">${sub ? sub.shortName : ''}</span></td>
                      <td>${topic ? escapeHtml(topic.name) : '<span style="color:var(--text-light)">Chưa gắn</span>'}</td>
                      <td>${escapeHtml(q.errorReason || '--')}</td>
                      <td>${escapeHtml(q.note || '--')}</td>
                      <td>
                        <button class="btn btn-sm btn-outline" onclick="UI.createNoteFromExamQuestion('${exam.id}', ${q.qNum})">📝 Thêm ghi chú</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn btn-secondary" onclick="UI.openExamForm('${exam.id}')">Chỉnh sửa kết quả</button>
          <button class="btn btn-primary" onclick="UI.closeModal('modal-exam-detail')">Đóng</button>
        </div>
      `;

      this.showModal('modal-exam-detail');
    },

    duplicateExam(examId) {
      const exam = (this.state.exams || []).find(e => e.id === examId);
      if (!exam) return;

      const dup = JSON.parse(JSON.stringify(exam));
      dup.id = generateId('exam');
      dup.name = `${dup.name} (Bản sao)`;
      dup.date = new Date().toISOString().slice(0, 10);
      dup.createdAt = new Date().toISOString();
      dup.updatedAt = new Date().toISOString();

      this.state.exams.unshift(dup);
      StorageService.save(this.state);
      this.renderExams();
      this.renderOverview();
      this.showToast(`Đã nhân bản đợt thi "${dup.name}".`, 'success');
    },

    confirmDeleteExam(examId) {
      const exam = (this.state.exams || []).find(e => e.id === examId);
      if (!exam) return;

      this.showConfirmDialog(
        `Xác nhận xóa đợt thi "${exam.name}"?`,
        'Các số liệu thống kê sẽ được tính toán lại. Các ghi chú đã tạo từ đợt thi này sẽ được bảo lưu an toàn (không bị xóa).',
        () => {
          this.state.exams = this.state.exams.filter(e => e.id !== examId);
          // Preserve linked notes safely (do not delete notes!)
          (this.state.notes || []).forEach(n => {
            if (n.examId === examId) {
              n.examTitle = exam.name; // preserve as text reference
              n.examId = null;
            }
          });
          StorageService.logActivity(this.state, 'exam_deleted', `Xóa đợt thi: ${exam.name}`, 'Đã xóa dữ liệu bài thi.');
          StorageService.save(this.state);
          this.renderExams();
          this.renderOverview();
          this.showToast(`Đã xóa đợt thi "${exam.name}".`, 'info');
        }
      );
    },

    // --- 4.4 VIEW: SỔ TAY GHI CHÚ (NOTEBOOK) ---
    renderNotes() {
      const container = document.getElementById('notes-list-container');
      if (!container) return;

      let notes = [...(this.state.notes || [])];

      // Filters
      if (this.noteSubjectFilter !== 'all') {
        notes = notes.filter(n => n.subjectId === this.noteSubjectFilter);
      }
      if (this.noteTypeFilter !== 'all') {
        notes = notes.filter(n => n.type === this.noteTypeFilter);
      }
      if (this.noteStatusFilter !== 'all') {
        notes = notes.filter(n => n.reviewStatus === this.noteStatusFilter);
      }
      if (this.noteSearchQuery) {
        const q = this.noteSearchQuery.toLowerCase();
        notes = notes.filter(n => {
          return n.title.toLowerCase().includes(q) ||
            (n.content && n.content.toLowerCase().includes(q)) ||
            (n.tags && n.tags.some(t => t.toLowerCase().includes(q)));
        });
      }

      // Sort notes: pinned first, then newest
      notes.sort((a, b) => {
        if (b.isPinned && !a.isPinned) return 1;
        if (!b.isPinned && a.isPinned) return -1;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });

      if (notes.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 32px 16px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <h3>Chưa có ghi chú nào</h3>
            <p>Hãy lưu lại công thức, mẹo giải hoặc rút kinh nghiệm từ các câu làm sai.</p>
            <button class="btn btn-sm btn-primary" onclick="UI.openNoteForm()">+ Tạo ghi chú mới</button>
          </div>
        `;
        document.getElementById('note-detail-pane').innerHTML = `
          <div class="empty-state" style="padding: 48px 16px;">
            <p>Chọn một ghi chú bên trái để xem chi tiết.</p>
          </div>
        `;
        return;
      }

      // Auto-select first note if none selected or invalid
      if (!this.selectedNoteId || !notes.some(n => n.id === this.selectedNoteId)) {
        this.selectedNoteId = notes[0].id;
      }

      let html = '';
      notes.forEach(n => {
        const sub = SUBJECTS_CONFIG.find(s => s.id === n.subjectId);
        const isActive = n.id === this.selectedNoteId;

        const typeLabels = {
          key_knowledge: '💡 Kiến thức',
          formula: '📐 Công thức',
          shortcut: '⚡ Mẹo nhanh',
          wrong_question: '❌ Lỗi sai',
          hard_question: '🎯 Câu khó',
          review_needed: '🔄 Cần ôn'
        };

        html += `
          <div class="note-card-item ${isActive ? 'active' : ''}" onclick="UI.selectNote('${n.id}')">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
              <span class="badge ${sub ? sub.badgeClass : 'badge-gray'}">${sub ? sub.shortName : ''}</span>
              <span style="font-size:11px; color:var(--text-muted);">${typeLabels[n.type] || ''}</span>
            </div>
            <div class="note-item-title">${escapeHtml(n.title)}</div>
            <div class="note-item-preview">${escapeHtml(n.content || '')}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted);">
              <span>Lần ôn: ${n.reviewCount || 0}</span>
              <span class="badge ${n.reviewStatus === 'resolved' ? 'badge-green' : 'badge-yellow'}">
                ${n.reviewStatus === 'resolved' ? 'Đã khắc phục' : (n.reviewStatus === 'understood' ? 'Đã hiểu' : 'Cần ôn')}
              </span>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
      this.renderSelectedNotePane();
    },

    selectNote(noteId) {
      this.selectedNoteId = noteId;
      this.renderNotes();
    },

    renderSelectedNotePane() {
      const pane = document.getElementById('note-detail-pane');
      if (!pane) return;

      const note = (this.state.notes || []).find(n => n.id === this.selectedNoteId);
      if (!note) {
        pane.innerHTML = '<div class="empty-state"><p>Chưa chọn ghi chú.</p></div>';
        return;
      }

      const sub = SUBJECTS_CONFIG.find(s => s.id === note.subjectId);
      const topic = (this.state.topics || []).find(t => t.id === note.topicId);

      pane.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span class="badge ${sub ? sub.badgeClass : 'badge-gray'}">${sub ? sub.name : ''}</span>
              ${topic ? `<span class="badge badge-gray">${escapeHtml(topic.name)}</span>` : ''}
              ${note.questionNumber ? `<span class="badge badge-red">Câu ${note.questionNumber}</span>` : ''}
            </div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); line-height:1.3;">
              ${escapeHtml(note.title)}
            </h2>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm btn-outline" onclick="UI.incrementNoteReview('${note.id}')" title="Ghi nhận đã ôn lại một lần">
              +1 Lần ôn (${note.reviewCount || 0})
            </button>
            <button class="btn btn-sm btn-icon" onclick="UI.openNoteForm('${note.id}')" title="Sửa ghi chú">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-sm btn-icon btn-danger" onclick="UI.confirmDeleteNote('${note.id}')" title="Xóa ghi chú">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <!-- Review status toggle bar -->
        <div style="display:flex; align-items:center; gap:12px; background:#FAFBFD; padding:10px 14px; border-radius:8px; border:1px solid var(--border); margin-bottom:18px;">
          <span style="font-size:12px; font-weight:600; color:var(--text-muted);">Trạng thái khắc phục:</span>
          <select class="form-control" style="width:auto; padding:4px 8px; font-size:12px;" onchange="UI.updateNoteReviewStatus('${note.id}', this.value)">
            <option value="not_reviewed" ${note.reviewStatus === 'not_reviewed' ? 'selected' : ''}>Chưa ôn</option>
            <option value="reviewing" ${note.reviewStatus === 'reviewing' ? 'selected' : ''}>Đang ôn</option>
            <option value="understood" ${note.reviewStatus === 'understood' ? 'selected' : ''}>Đã hiểu bài</option>
            <option value="resolved" ${note.reviewStatus === 'resolved' ? 'selected' : ''}>Đã khắc phục hoàn toàn</option>
          </select>
          <span style="font-size:11.5px; color:var(--text-muted); margin-left:auto;">Cập nhật: ${formatDateTime(note.updatedAt)}</span>
        </div>

        <!-- Note Main Content (Markdown Safe) -->
        <div style="font-size:14px; line-height:1.6; color:var(--text-main); margin-bottom:18px;">
          ${formatMarkdownSafe(note.content)}
        </div>

        <!-- Solution Callout -->
        ${note.solution ? `
          <div class="note-callout-solution">
            <strong style="color:var(--success); display:block; margin-bottom:4px;">✓ Lời giải / Kiến thức chuẩn:</strong>
            ${formatMarkdownSafe(note.solution)}
          </div>
        ` : ''}

        <!-- Error Root Cause & Prevention -->
        ${note.rootCause || note.preventionMethod ? `
          <div class="note-callout-error">
            ${note.rootCause ? `<div><strong style="color:var(--danger)">Nguyên nhân sai:</strong> ${escapeHtml(note.rootCause)}</div>` : ''}
            ${note.preventionMethod ? `<div style="margin-top:4px;"><strong style="color:#B91C1C">Cách phòng tránh:</strong> ${escapeHtml(note.preventionMethod)}</div>` : ''}
          </div>
        ` : ''}

        <!-- Tags -->
        ${Array.isArray(note.tags) && note.tags.length > 0 ? `
          <div class="tags-list">
            ${note.tags.map(t => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
      `;
    },

    incrementNoteReview(noteId) {
      const note = (this.state.notes || []).find(n => n.id === noteId);
      if (!note) return;
      note.reviewCount = (note.reviewCount || 0) + 1;
      note.lastReviewedDate = new Date().toISOString();
      note.updatedAt = new Date().toISOString();
      StorageService.save(this.state);
      this.renderNotes();
      this.showToast(`Đã ghi nhận lần ôn thứ ${note.reviewCount}.`, 'success');
    },

    updateNoteReviewStatus(noteId, status) {
      const note = (this.state.notes || []).find(n => n.id === noteId);
      if (!note) return;
      note.reviewStatus = status;
      note.updatedAt = new Date().toISOString();
      StorageService.save(this.state);
      this.renderNotes();
      this.showToast('Đã cập nhật trạng thái lỗi sai.', 'success');
    },

    openNoteForm(noteId = null, prefillData = null) {
      const isEdit = !!noteId;
      const note = isEdit ? (this.state.notes || []).find(n => n.id === noteId) : (prefillData || null);

      document.getElementById('modal-note-form-title').textContent = isEdit ? 'Chỉnh sửa ghi chú' : 'Tạo ghi chú mới';
      document.getElementById('note-form-id').value = noteId || '';
      document.getElementById('note-form-exam-id').value = note?.examId || '';
      document.getElementById('note-form-qnum').value = note?.questionNumber !== undefined && note?.questionNumber !== null ? note.questionNumber : '';
      document.getElementById('note-form-title').value = note?.title || '';
      document.getElementById('note-form-sub').value = note?.subjectId || 'vietnamese';
      document.getElementById('note-form-type').value = note?.type || 'key_knowledge';
      document.getElementById('note-form-priority').value = note?.priority || 'medium';
      document.getElementById('note-form-status').value = note?.reviewStatus || 'not_reviewed';
      document.getElementById('note-form-content').value = note?.content || '';
      document.getElementById('note-form-solution').value = note?.solution || '';
      document.getElementById('note-form-rootcause').value = note?.rootCause || '';
      document.getElementById('note-form-prevention').value = note?.preventionMethod || '';
      document.getElementById('note-form-tags').value = (note?.tags || []).join(', ');

      // Populate topic picker for chosen subject
      this.updateNoteFormTopicOptions(note?.subjectId || 'vietnamese', note?.topicId);

      this.showModal('modal-note-form');
    },

    updateNoteFormTopicOptions(subjectId, selectedTopicId = null) {
      const select = document.getElementById('note-form-topic');
      if (!select) return;
      const topics = (this.state.topics || []).filter(t => t.subjectId === subjectId);
      let opts = '<option value="">-- Không gắn chuyên đề --</option>';
      topics.forEach(t => {
        opts += `<option value="${t.id}" ${selectedTopicId === t.id ? 'selected' : ''}>${escapeHtml(t.name)} (${escapeHtml(t.groupName)})</option>`;
      });
      select.innerHTML = opts;
    },

    saveNoteForm() {
      const id = document.getElementById('note-form-id').value;
      const examId = document.getElementById('note-form-exam-id').value || null;
      const qNumVal = document.getElementById('note-form-qnum').value;
      const questionNumber = qNumVal ? parseInt(qNumVal, 10) : null;
      const title = document.getElementById('note-form-title').value.trim();
      const subjectId = document.getElementById('note-form-sub').value;
      const topicId = document.getElementById('note-form-topic').value || null;
      const type = document.getElementById('note-form-type').value;
      const priority = document.getElementById('note-form-priority').value;
      const reviewStatus = document.getElementById('note-form-status').value;
      const content = document.getElementById('note-form-content').value.trim();
      const solution = document.getElementById('note-form-solution').value.trim();
      const rootCause = document.getElementById('note-form-rootcause').value.trim();
      const preventionMethod = document.getElementById('note-form-prevention').value.trim();
      const tagsRaw = document.getElementById('note-form-tags').value;
      const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);

      if (!title) {
        this.showToast('Vui lòng nhập tiêu đề ghi chú!', 'error');
        return;
      }

      const isEdit = !!id;
      const noteId = isEdit ? id : generateId('note');

      const noteObj = {
        id: noteId,
        title,
        subjectId,
        topicId,
        examId,
        questionNumber,
        type,
        priority,
        reviewStatus,
        content,
        solution,
        rootCause,
        preventionMethod,
        tags,
        updatedAt: new Date().toISOString()
      };

      if (!isEdit) {
        noteObj.createdAt = new Date().toISOString();
        noteObj.reviewCount = 0;
        if (!Array.isArray(this.state.notes)) this.state.notes = [];
        this.state.notes.unshift(noteObj);
        StorageService.logActivity(this.state, 'note_created', `Thêm ghi chú: ${title}`, `Phần môn: ${subjectId}`);
      } else {
        const idx = this.state.notes.findIndex(n => n.id === id);
        if (idx !== -1) {
          noteObj.createdAt = this.state.notes[idx].createdAt;
          noteObj.reviewCount = this.state.notes[idx].reviewCount || 0;
          this.state.notes[idx] = noteObj;
        }
      }

      StorageService.save(this.state);
      this.closeModal('modal-note-form');
      this.selectedNoteId = noteId;
      this.renderNotes();
      this.showToast(`Đã lưu ghi chú "${title}".`, 'success');
    },

    confirmDeleteNote(noteId) {
      const note = (this.state.notes || []).find(n => n.id === noteId);
      if (!note) return;

      this.showConfirmDialog(
        `Xác nhận xóa ghi chú "${note.title}"?`,
        'Thao tác này không thể hoàn tác.',
        () => {
          this.state.notes = this.state.notes.filter(n => n.id !== noteId);
          StorageService.save(this.state);
          this.selectedNoteId = null;
          this.renderNotes();
          this.showToast('Đã xóa ghi chú.', 'info');
        }
      );
    },

    createNoteFromExamQuestion(examId, qNum) {
      const exam = (this.state.exams || []).find(e => e.id === examId);
      if (!exam) return;
      const q = (exam.questions || []).find(item => item.qNum === qNum);
      if (!q) return;

      this.openNoteForm(null, {
        title: `Lỗi sai Câu ${qNum} — ${exam.name}`,
        subjectId: q.subjectId,
        topicId: q.topicId,
        examId: exam.id,
        questionNumber: qNum,
        type: 'wrong_question',
        rootCause: q.errorReason || '',
        content: q.note || `Lỗi sai ghi nhận tại Câu ${qNum} trong đợt thi "${exam.name}".`,
        priority: 'high',
        reviewStatus: 'not_reviewed'
      });
    },

    createAllNotesFromExam(examId) {
      const exam = (this.state.exams || []).find(e => e.id === examId);
      if (!exam) return;
      const wrongs = (exam.questions || []).filter(q => q.status === 'wrong');
      if (wrongs.length === 0) return;

      let created = 0;
      wrongs.forEach(q => {
        // Check if note already exists for this exam question
        const exists = (this.state.notes || []).some(n => n.examId === exam.id && n.questionNumber === q.qNum);
        if (!exists) {
          this.state.notes.unshift({
            id: generateId('note'),
            title: `Lỗi sai Câu ${q.qNum} — ${exam.name}`,
            subjectId: q.subjectId,
            topicId: q.topicId,
            examId: exam.id,
            questionNumber: q.qNum,
            type: 'wrong_question',
            rootCause: q.errorReason || '',
            content: q.note || `Câu ${q.qNum} làm sai trong đề ${exam.name}.`,
            priority: 'high',
            reviewStatus: 'not_reviewed',
            reviewCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          created++;
        }
      });

      if (created > 0) {
        StorageService.save(this.state);
        this.showToast(`Đã tạo ${created} ghi chú lỗi sai vào Sổ tay.`, 'success');
      } else {
        this.showToast('Các câu sai này đã có sẵn ghi chú trong Sổ tay.', 'info');
      }
    },

    // --- 4.5 VIEW: PHÂN TÍCH TIẾN BỘ (ANALYTICS) ---
    renderAnalytics() {
      const exams = this.state.exams || [];
      const compSelectA = document.getElementById('comp-exam-a');
      const compSelectB = document.getElementById('comp-exam-b');

      if (compSelectA && compSelectB) {
        let opts = '';
        exams.forEach(ex => {
          opts += `<option value="${ex.id}">${escapeHtml(ex.name)} (${formatDate(ex.date)})</option>`;
        });
        compSelectA.innerHTML = opts;
        compSelectB.innerHTML = opts;

        // Default to first two exams if available
        if (exams.length >= 2) {
          compSelectA.value = exams[1].id;
          compSelectB.value = exams[0].id;
        }
      }

      this.updateExamComparison();
      this.renderAnalyticsTopicMatrix();
      this.renderAnalyticsSubjectSummaries();
      this.renderActivityTimeline();
    },

    updateExamComparison() {
      const container = document.getElementById('exam-comparison-result');
      if (!container) return;

      const idA = document.getElementById('comp-exam-a')?.value;
      const idB = document.getElementById('comp-exam-b')?.value;

      if (!idA || !idB || idA === idB) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 24px;">
            <p>Vui lòng chọn 2 đợt thi khác nhau để so sánh.</p>
          </div>
        `;
        return;
      }

      const examA = (this.state.exams || []).find(e => e.id === idA);
      const examB = (this.state.exams || []).find(e => e.id === idB);
      if (!examA || !examB) return;

      const comp = AnalyticsEngine.compareExams(examA, examB);

      const renderDelta = (delta) => {
        if (delta === null) return '--';
        if (delta > 0) return `<span class="delta-pill pos">+${delta}</span>`;
        if (delta < 0) return `<span class="delta-pill neg">${delta}</span>`;
        return `<span class="delta-pill zero">0</span>`;
      };

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Thành phần</th>
                <th>${escapeHtml(examA.name)}</th>
                <th>${escapeHtml(examB.name)}</th>
                <th>Thay đổi điểm</th>
                <th>Thay đổi câu đúng</th>
              </tr>
            </thead>
            <tbody>
              ${comp.subjects.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.scoreA !== null ? `${s.scoreA}đ (${s.correctA}/30)` : `Chưa có điểm (${s.correctA}/30)`}</td>
                  <td>${s.scoreB !== null ? `${s.scoreB}đ (${s.correctB}/30)` : `Chưa có điểm (${s.correctB}/30)`}</td>
                  <td>${renderDelta(s.scoreDelta)}</td>
                  <td>${renderDelta(s.correctDelta)}</td>
                </tr>
              `).join('')}
              <tr style="background:#FAFBFD; font-weight:700;">
                <td>TỔNG ĐIỂM V-ACT</td>
                <td>${comp.totalScoreA}/1.200</td>
                <td>${comp.totalScoreB}/1.200</td>
                <td>${renderDelta(comp.totalScoreDelta)}</td>
                <td>${renderDelta(comp.totalCorrectDelta)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    },

    renderAnalyticsTopicMatrix() {
      const container = document.getElementById('analytics-topic-matrix-body');
      if (!container) return;

      const stats = AnalyticsEngine.getTopicAnalytics(this.state);
      // Sort by wrongCount desc
      stats.sort((a, b) => b.wrongCount - a.wrongCount);

      if (stats.length === 0) {
        container.innerHTML = '<tr><td colspan="7">Chưa có dữ liệu chuyên đề.</td></tr>';
        return;
      }

      container.innerHTML = stats.slice(0, 15).map(t => {
        const sub = SUBJECTS_CONFIG.find(s => s.id === t.subjectId);
        const acc = t.totalQuestions > 0 ? ((t.correctCount / t.totalQuestions) * 100).toFixed(1) : 'N/A';
        return `
          <tr onclick="UI.openTopicDetail('${t.id}')" style="cursor:pointer;">
            <td><strong>${escapeHtml(t.name)}</strong></td>
            <td><span class="badge ${sub ? sub.badgeClass : 'badge-gray'}">${sub ? sub.shortName : ''}</span></td>
            <td>${t.practiceCount} lượt (${t.totalQuestions} câu)</td>
            <td>${acc !== 'N/A' ? `${acc}%` : '--'}</td>
            <td><strong style="color:var(--danger)">${t.wrongCount} lỗi</strong></td>
            <td>${t.masteryLevel}/5</td>
            <td>${formatDate(t.lastReviewedDate || t.lastWrongDate)}</td>
          </tr>
        `;
      }).join('');
    },

    renderAnalyticsSubjectSummaries() {
      const container = document.getElementById('analytics-subject-summaries');
      if (!container) return;

      const exams = this.state.exams || [];
      const topics = this.state.topics || [];

      let html = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">';

      SUBJECTS_CONFIG.forEach(sub => {
        let totalScore = 0;
        let scoreCount = 0;
        let totalCorrect = 0;
        let examCount = 0;

        exams.forEach(ex => {
          const sc = ex.scores?.[sub.id];
          if (sc) {
            if (typeof sc.correct === 'number') {
              totalCorrect += sc.correct;
              examCount++;
            }
            if (typeof sc.score === 'number') {
              totalScore += sc.score;
              scoreCount++;
            }
          }
        });

        const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '--';
        const avgCorrect = examCount > 0 ? (totalCorrect / examCount).toFixed(1) : '--';
        const subTopics = topics.filter(t => t.subjectId === sub.id);
        const mastered = subTopics.filter(t => t.status === 'mastered').length;

        html += `
          <div class="card" style="border-top:3px solid ${sub.color};">
            <h4 style="font-size:15px; font-weight:700; margin-bottom:12px; color:var(--text-main);">${sub.name}</h4>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted)">Điểm TB đạt được:</span>
                <strong>${avgScore} / 300</strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted)">Số câu đúng TB:</span>
                <strong>${avgCorrect} / 30</strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted)">Chuyên đề nắm vững:</span>
                <span class="badge badge-green">${mastered} / ${subTopics.length}</span>
              </div>
            </div>
          </div>
        `;
      });

      html += '</div>';
      container.innerHTML = html;
    },

    renderActivityTimeline() {
      const container = document.getElementById('analytics-activity-timeline');
      if (!container) return;

      const logs = this.state.activityLog || [];
      if (logs.length === 0) {
        container.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Chưa có nhật ký hoạt động nào.</p>';
        return;
      }

      container.innerHTML = logs.slice(0, 15).map(item => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-time">${formatDateTime(item.timestamp)}</div>
            <strong>${escapeHtml(item.title)}</strong>
            <p style="color:var(--text-muted); font-size:12.5px; margin-top:2px;">${escapeHtml(item.description || '')}</p>
          </div>
        </div>
      `).join('');
    },

    // --- 4.6 VIEW: SAO LƯU & CÀI ĐẶT (SETTINGS) ---
    renderSettings() {
      const targetInput = document.getElementById('setting-target-score');
      if (targetInput) targetInput.value = this.state.settings?.targetScore || 950;

      // Storage calculation
      const storageEl = document.getElementById('setting-storage-size');
      if (storageEl) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY) || '';
          const bytes = new Blob([raw]).size;
          const kb = (bytes / 1024).toFixed(1);
          const percent = ((bytes / (5 * 1024 * 1024)) * 100).toFixed(2);
          storageEl.textContent = `${kb} KB (khoảng ${percent}% dung lượng 5MB của trình duyệt)`;
        } catch (e) {
          storageEl.textContent = 'Không thể đo';
        }
      }
    },

    saveSettings() {
      const targetVal = parseInt(document.getElementById('setting-target-score').value, 10);
      if (!isNaN(targetVal) && targetVal >= 0 && targetVal <= 1200) {
        this.state.settings = this.state.settings || {};
        this.state.settings.targetScore = targetVal;
        StorageService.save(this.state);
        this.updateSidebarTarget();
        this.showToast('Đã lưu mục tiêu điểm mới!', 'success');
      } else {
        this.showToast('Mục tiêu điểm phải từ 0 đến 1.200!', 'error');
      }
    },

    // Import JSON File
    handleImportFileSelect(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const parsed = JSON.parse(content);

          // Validation
          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Dữ liệu JSON không hợp lệ.');
          }
          if (!Array.isArray(parsed.topics) && !Array.isArray(parsed.exams)) {
            throw new Error('File sao lưu thiếu các trường dữ liệu quan trọng.');
          }

          // Show preview modal
          this.importCandidateData = parsed;
          const previewBody = document.getElementById('import-preview-body');
          if (previewBody) {
            previewBody.innerHTML = `
              <p style="margin-bottom:12px;">Đã đọc thành công file sao lưu. Thông tin bản ghi tìm thấy:</p>
              <ul style="margin-left:20px; font-size:13.5px; line-height:1.8;">
                <li>Chuyên đề ôn tập: <strong>${parsed.topics?.length || 0}</strong></li>
                <li>Đợt thi thử V-ACT: <strong>${parsed.exams?.length || 0}</strong></li>
                <li>Ghi chú & lỗi sai: <strong>${parsed.notes?.length || 0}</strong></li>
                <li>Buổi luyện chuyên đề: <strong>${parsed.practiceSessions?.length || 0}</strong></li>
                <li>Phiên bản schema: <strong>${parsed.metadata?.schemaVersion || '1.0.0'}</strong></li>
              </ul>
            `;
          }
          this.showModal('modal-import-preview');
        } catch (err) {
          this.showToast(`Lỗi nhập file: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file, 'utf-8');
      e.target.value = ''; // reset file input
    },

    executeImport(mode) { // 'replace' | 'merge'
      if (!this.importCandidateData) return;
      const data = this.importCandidateData;

      if (mode === 'replace') {
        // Replace entire state
        this.state = data;
        if (!this.state.topics || this.state.topics.length === 0) {
          this.state.topics = window.DEFAULT_TOPICS || [];
        }
        StorageService.logActivity(this.state, 'data_import', 'Khôi phục toàn bộ từ bản sao lưu', 'Đã thay thế dữ liệu bằng bản sao lưu JSON.');
      } else {
        // Merge mode: preserve existing topics/exams, add new
        const existingExamIds = new Set((this.state.exams || []).map(e => e.id));
        const existingNoteIds = new Set((this.state.notes || []).map(n => n.id));
        const existingPracticeIds = new Set((this.state.practiceSessions || []).map(p => p.id));

        (data.exams || []).forEach(e => {
          if (!existingExamIds.has(e.id)) this.state.exams.unshift(e);
        });
        (data.notes || []).forEach(n => {
          if (!existingNoteIds.has(n.id)) this.state.notes.unshift(n);
        });
        (data.practiceSessions || []).forEach(p => {
          if (!existingPracticeIds.has(p.id)) this.state.practiceSessions.unshift(p);
        });

        StorageService.logActivity(this.state, 'data_import', 'Gộp dữ liệu từ bản sao lưu', 'Đã gộp thêm các bản ghi mới.');
      }

      StorageService.save(this.state);
      this.closeModal('modal-import-preview');
      this.renderCurrentView();
      this.showToast('Khôi phục dữ liệu thành công!', 'success');
      this.importCandidateData = null;
    },

    // Danger Zone: Reset
    executeDangerReset() {
      const confirmText = document.getElementById('danger-reset-phrase')?.value;
      if (confirmText !== 'XOA DU LIEU') {
        this.showToast('Cụm từ xác nhận không khớp! Vui lòng nhập đúng "XOA DU LIEU".', 'error');
        return;
      }

      this.state = StorageService.getInitialState();
      StorageService.save(this.state);
      this.closeModal('modal-danger-reset');
      this.renderCurrentView();
      this.showToast('Đã xóa toàn bộ dữ liệu và đặt lại trạng thái ban đầu.', 'info');
    },

    // Practice Sessions Modal
    openPracticeFormForTopic(topicId) {
      const topic = (this.state.topics || []).find(t => t.id === topicId);
      if (!topic) return;

      document.getElementById('practice-form-topic-id').value = topic.id;
      document.getElementById('practice-form-sub-id').value = topic.subjectId;
      document.getElementById('practice-form-topic-name').value = topic.name;
      document.getElementById('practice-form-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('practice-form-total').value = 40;
      document.getElementById('practice-form-correct').value = 32;
      document.getElementById('practice-form-duration').value = 45;
      document.getElementById('practice-form-source').value = '';
      document.getElementById('practice-form-notes').value = '';

      this.closeModal('modal-topic-detail');
      this.showModal('modal-practice-form');
    },

    savePracticeForm() {
      const topicId = document.getElementById('practice-form-topic-id').value;
      const subjectId = document.getElementById('practice-form-sub-id').value;
      const date = document.getElementById('practice-form-date').value;
      const total = parseInt(document.getElementById('practice-form-total').value, 10);
      const correct = parseInt(document.getElementById('practice-form-correct').value, 10);
      const duration = parseInt(document.getElementById('practice-form-duration').value, 10) || 0;
      const source = document.getElementById('practice-form-source').value.trim();
      const notes = document.getElementById('practice-form-notes').value.trim();

      if (isNaN(total) || total <= 0) {
        this.showToast('Tổng số câu phải lớn hơn 0!', 'error');
        return;
      }
      if (isNaN(correct) || correct < 0 || correct > total) {
        this.showToast('Số câu đúng không hợp lệ (phải từ 0 đến tổng số câu)!', 'error');
        return;
      }

      const sessionObj = {
        id: generateId('prac'),
        topicId,
        subjectId,
        date,
        totalQuestions: total,
        correctQuestions: correct,
        durationMinutes: duration,
        source,
        notes,
        createdAt: new Date().toISOString()
      };

      if (!Array.isArray(this.state.practiceSessions)) this.state.practiceSessions = [];
      this.state.practiceSessions.unshift(sessionObj);

      // Update topic stats safely (does not affect exams!)
      const topic = (this.state.topics || []).find(t => t.id === topicId);
      if (topic) {
        topic.lastReviewedDate = date;
        const rate = (correct / total) * 100;
        if (rate >= 80 && topic.status !== 'mastered') {
          topic.status = 'in_progress';
          topic.masteryLevel = Math.min(5, (topic.masteryLevel || 1) + 1);
        }
      }

      StorageService.logActivity(this.state, 'practice_logged', `Luyện chuyên đề: ${topic ? topic.name : topicId}`, `Kết quả: ${correct}/${total} (${((correct / total) * 100).toFixed(0)}%)`);
      StorageService.save(this.state);
      this.closeModal('modal-practice-form');
      this.renderCurrentView();
      this.showToast(`Đã lưu kết quả luyện tập: ${correct}/${total} câu (${((correct / total) * 100).toFixed(1)}%).`, 'success');
    },

    openNoteFormForTopic(topicId) {
      const topic = (this.state.topics || []).find(t => t.id === topicId);
      if (!topic) return;

      this.closeModal('modal-topic-detail');
      this.openNoteForm(null, {
        subjectId: topic.subjectId,
        topicId: topic.id,
        title: `Ghi nhớ: ${topic.name}`
      });
    },

    openEditTopicForm(topicId) {
      const topic = (this.state.topics || []).find(t => t.id === topicId);
      if (!topic) return;

      document.getElementById('modal-topic-form-title').textContent = 'Chỉnh sửa chuyên đề';
      document.getElementById('topic-form-id').value = topic.id;
      document.getElementById('topic-form-sub').value = topic.subjectId;
      document.getElementById('topic-form-group').value = topic.groupName;
      document.getElementById('topic-form-name').value = topic.name;
      document.getElementById('topic-form-desc').value = topic.description || '';
      document.getElementById('topic-form-priority').value = topic.priority || 'medium';
      document.getElementById('topic-form-status').value = topic.status || 'not_started';

      this.closeModal('modal-topic-detail');
      this.showModal('modal-topic-form');
    },

    openNewTopicForm() {
      document.getElementById('modal-topic-form-title').textContent = 'Thêm chuyên đề mới';
      document.getElementById('topic-form-id').value = '';
      document.getElementById('topic-form-sub').value = this.activeTopicSubject || 'vietnamese';
      document.getElementById('topic-form-group').value = '';
      document.getElementById('topic-form-name').value = '';
      document.getElementById('topic-form-desc').value = '';
      document.getElementById('topic-form-priority').value = 'medium';
      document.getElementById('topic-form-status').value = 'not_started';

      this.showModal('modal-topic-form');
    },

    saveTopicForm() {
      const id = document.getElementById('topic-form-id').value;
      const subjectId = document.getElementById('topic-form-sub').value;
      const groupName = document.getElementById('topic-form-group').value.trim();
      const name = document.getElementById('topic-form-name').value.trim();
      const description = document.getElementById('topic-form-desc').value.trim();
      const priority = document.getElementById('topic-form-priority').value;
      const status = document.getElementById('topic-form-status').value;

      if (!name) {
        this.showToast('Vui lòng nhập tên chuyên đề!', 'error');
        return;
      }
      if (!groupName) {
        this.showToast('Vui lòng nhập tên nhóm chuyên đề!', 'error');
        return;
      }

      const isEdit = !!id;
      const topicId = isEdit ? id : generateId('top_custom');

      if (!isEdit) {
        this.state.topics.push({
          id: topicId,
          subjectId,
          groupName,
          name,
          description,
          masteryLevel: 1,
          status,
          priority,
          lastReviewedDate: null,
          nextReviewDate: null
        });
        StorageService.logActivity(this.state, 'topic_created', `Thêm chuyên đề: ${name}`, `Môn: ${subjectId}`);
      } else {
        const topic = this.state.topics.find(t => t.id === id);
        if (topic) {
          topic.subjectId = subjectId;
          topic.groupName = groupName;
          topic.name = name;
          topic.description = description;
          topic.priority = priority;
          topic.status = status;
        }
      }

      StorageService.save(this.state);
      this.closeModal('modal-topic-form');
      this.renderTopics();
      this.showToast(`Đã lưu chuyên đề "${name}".`, 'success');
    },

    // Modal helpers
    showModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('show');
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
      }
    },

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
      }
    },

    showConfirmDialog(title, message, onConfirm) {
      const modal = document.getElementById('modal-confirm-delete');
      if (!modal) return;

      document.getElementById('confirm-delete-title').textContent = title;
      document.getElementById('confirm-delete-msg').textContent = message;

      const confirmBtn = document.getElementById('btn-confirm-delete-action');
      confirmBtn.onclick = () => {
        this.closeModal('modal-confirm-delete');
        onConfirm();
      };

      this.showModal('modal-confirm-delete');
    },

    // Global Events Binding
    bindNav() {
      document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const view = link.getAttribute('data-view');
          if (view) this.navigate(view);
        });
      });

      // Mobile Menu Hamburger
      const btnMobile = document.getElementById('btn-mobile-menu');
      const sb = document.getElementById('sidebar');
      const bdrop = document.getElementById('sidebar-backdrop');
      if (btnMobile && sb && bdrop) {
        btnMobile.addEventListener('click', () => {
          sb.classList.toggle('mobile-open');
          bdrop.classList.toggle('show');
        });
        bdrop.addEventListener('click', () => {
          sb.classList.remove('mobile-open');
          bdrop.classList.remove('show');
        });
      }
    },

    bindModals() {
      // ESC key closes any open modal
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-backdrop.show').forEach(m => {
            m.classList.remove('show');
          });
          document.body.style.overflow = '';
          const menu = document.getElementById('quick-add-menu');
          if (menu) menu.classList.remove('show');
        }
      });

      // Quick add dropdown toggle
      const btnQuickAdd = document.getElementById('btn-quick-add');
      const menuQuickAdd = document.getElementById('quick-add-menu');
      if (btnQuickAdd && menuQuickAdd) {
        btnQuickAdd.addEventListener('click', (e) => {
          e.stopPropagation();
          menuQuickAdd.classList.toggle('show');
        });
        document.addEventListener('click', () => {
          menuQuickAdd.classList.remove('show');
        });
      }
    },

    bindGlobalEvents() {
      // Live quick calculation triggers on exam form
      ['vietnamese', 'english', 'math', 'science'].forEach(sId => {
        const cInp = document.getElementById(`exam-quick-${sId}-correct`);
        const sInp = document.getElementById(`exam-quick-${sId}-score`);
        if (cInp) cInp.addEventListener('input', () => this.updateExamQuickCalculations());
        if (sInp) sInp.addEventListener('input', () => this.updateExamQuickCalculations());
      });

      // Topic Search & Filter
      const searchTopicInp = document.getElementById('topic-search-input');
      if (searchTopicInp) {
        searchTopicInp.addEventListener('input', (e) => {
          this.topicSearchQuery = e.target.value.trim();
          this.renderTopics();
        });
      }

      const statusTopicSelect = document.getElementById('topic-filter-status');
      if (statusTopicSelect) {
        statusTopicSelect.addEventListener('change', (e) => {
          this.activeTopicStatus = e.target.value;
          this.renderTopics();
        });
      }

      const groupTopicSelect = document.getElementById('topic-filter-group');
      if (groupTopicSelect) {
        groupTopicSelect.addEventListener('change', (e) => {
          this.activeTopicGroup = e.target.value;
          this.renderTopics();
        });
      }

      // Note Search & Filter
      const searchNoteInp = document.getElementById('note-search-input');
      if (searchNoteInp) {
        searchNoteInp.addEventListener('input', (e) => {
          this.noteSearchQuery = e.target.value.trim();
          this.renderNotes();
        });
      }

      const filterNoteSub = document.getElementById('note-filter-subject');
      if (filterNoteSub) {
        filterNoteSub.addEventListener('change', (e) => {
          this.noteSubjectFilter = e.target.value;
          this.renderNotes();
        });
      }

      const filterNoteType = document.getElementById('note-filter-type');
      if (filterNoteType) {
        filterNoteType.addEventListener('change', (e) => {
          this.noteTypeFilter = e.target.value;
          this.renderNotes();
        });
      }

      const filterNoteStatus = document.getElementById('note-filter-status');
      if (filterNoteStatus) {
        filterNoteStatus.addEventListener('change', (e) => {
          this.noteStatusFilter = e.target.value;
          this.renderNotes();
        });
      }

      // Note Form Subject change triggers topic options update
      const noteSubSelect = document.getElementById('note-form-sub');
      if (noteSubSelect) {
        noteSubSelect.addEventListener('change', (e) => {
          this.updateNoteFormTopicOptions(e.target.value);
        });
      }

      // Chart Filter buttons
      document.querySelectorAll('.chart-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('btn-primary'));
          btn.classList.add('btn-primary');
          this.chartTimeFilter = btn.getAttribute('data-days');
          this.renderScoreTrendChart();
        });
      });
    }
  };

  // Expose UI to window for inline onclick handlers
  window.UI = UI;
  window.StorageService = StorageService;
  window.AnalyticsEngine = AnalyticsEngine;

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    const initialState = StorageService.load();
    UI.init(initialState);
  });
})();
"""
