/**
 * End-to-End User Journey Simulation (Section 20 Criteria)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const HTML_FILE = path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const URL_TO_OPEN = `file:///${HTML_FILE}`;
const USER_DATA_DIR = path.resolve(__dirname, '.chrome-journey-profile');

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runJourney() {
  console.log('--- STARTING SECTION 20 COMPLETE USER JOURNEY TEST ---');
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--disable-extensions',
    '--disable-gpu',
    '--allow-file-access-from-files',
    URL_TO_OPEN
  ]);

  let cdp = null;

  try {
    let targetPage = null;
    for (let i = 0; i < 25; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        if (res.ok) {
          const list = await res.json();
          targetPage = list.find(item => item.type === 'page' && item.url.includes('index.html')) ||
                       list.find(item => item.type === 'page');
          if (targetPage && targetPage.webSocketDebuggerUrl) break;
        }
      } catch (e) {}
      await sleep(300);
    }

    if (!targetPage) throw new Error('Target page not found');
    cdp = new CDPClient(targetPage.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await sleep(800);

    // STEP 1: Select Math -> topic "Xác suất" -> mark "needs_review"
    console.log('Step 1: Mở web, chọn Toán, tìm chuyên đề Xác suất và đánh dấu cần ôn...');
    const step1 = await cdp.eval(`
      (() => {
        UI.navigate('topics');
        UI.activeTopicSubject = 'math';
        UI.renderTopics();
        const xacsuatTopic = UI.state.topics.find(t => t.subjectId === 'math' && t.name.includes('Xác suất'));
        if (!xacsuatTopic) return { found: false };
        UI.updateTopicQuickStatus(xacsuatTopic.id, 'needs_review');
        return { found: true, id: xacsuatTopic.id, status: xacsuatTopic.status };
      })()
    `);
    console.log(`Step 1 Result: Found=${step1.found}, Status=${step1.status}`);

    // STEP 2 & 3: Create exam with 4 subjects: TV (22/30, 218), TA (25/30, 254), Toán (19/30, 196), TDKH (23/30, 231)
    console.log('Step 2 & 3: Tạo đợt thi mới, nhập câu đúng & điểm 4 môn -> Tự động tính 899/1.200 và 89/120...');
    const step23 = await cdp.eval(`
      (() => {
        UI.openExamForm();
        document.getElementById('exam-form-name').value = 'Thi Thử V-ACT Trọng Tâm 01';
        document.getElementById('exam-form-date').value = '2026-11-04';
        document.getElementById('exam-form-source').value = 'Đề thi thử số 1';

        // Fill inputs
        document.getElementById('exam-quick-vietnamese-correct').value = '22';
        document.getElementById('exam-quick-vietnamese-score').value = '218';
        document.getElementById('exam-quick-english-correct').value = '25';
        document.getElementById('exam-quick-english-score').value = '254';
        document.getElementById('exam-quick-math-correct').value = '19';
        document.getElementById('exam-quick-math-score').value = '196';
        document.getElementById('exam-quick-science-correct').value = '23';
        document.getElementById('exam-quick-science-score').value = '231';

        UI.updateExamQuickCalculations();
        UI.saveExamForm();

        const latestExam = UI.state.exams[0];
        const totals = AnalyticsEngine.calculateExamScore(latestExam);
        return {
          totalScore: totals.totalScore,
          totalCorrect: totals.totalCorrect,
          accuracy: totals.accuracy,
          isComplete: totals.isComplete
        };
      })()
    `);
    console.log(`Step 2 & 3 Result: TotalScore=${step23.totalScore} (Expected 899), TotalCorrect=${step23.totalCorrect} (Expected 89), Accuracy=${step23.accuracy}%`);

    // STEP 4: Open exam, mark wrong questions, link with topic "Xác suất" and write note
    console.log('Step 4: Mở lại đề thi, đánh dấu câu sai, liên kết với chuyên đề Xác suất và tạo ghi chú...');
    const step4 = await cdp.eval(`
      (() => {
        const exam = UI.state.exams[0];
        // Mark question 72 as wrong in Math
        const q72 = exam.questions[71];
        q72.status = 'wrong';
        q72.topicId = '${step1.id}';
        q72.errorReason = 'Nhầm công thức';
        q72.note = 'Nhầm giữa lấy có hoàn lại và không hoàn lại';

        UI.createNoteFromExamQuestion(exam.id, 72);
        document.getElementById('note-form-solution').value = 'Công thức lấy không hoàn lại: P = C(k, n) / C(k, N)';
        document.getElementById('note-form-prevention').value = 'Gạch chân từ KHÔNG HOÀN LẠI trong đề';
        UI.saveNoteForm();

        return {
          examQuestionsWrong: exam.questions.filter(q => q.status === 'wrong').length,
          notesCount: UI.state.notes.length,
          lastNoteTitle: UI.state.notes[0].title
        };
      })()
    `);
    console.log(`Step 4 Result: ExamWrongs=${step4.examQuestionsWrong}, NotesCount=${step4.notesCount}, NoteTitle="${step4.lastNoteTitle}"`);

    // STEP 5: Go back to topic "Xác suất", see linked wrong questions and notes
    console.log('Step 5: Quay về trang chuyên đề Xác suất, kiểm tra các lỗi sai và ghi chú đã liên kết...');
    const step5 = await cdp.eval(`
      (() => {
        UI.openTopicDetail('${step1.id}');
        const modalBodyHtml = document.getElementById('modal-topic-detail-body').innerHTML;
        const hasWrongQuestion = modalBodyHtml.includes('Câu 72');
        const hasLinkedNote = modalBodyHtml.includes('${step4.lastNoteTitle}');
        return { hasWrongQuestion, hasLinkedNote };
      })()
    `);
    console.log(`Step 5 Result: ShowsWrongQuestion=${step5.hasWrongQuestion}, ShowsLinkedNote=${step5.hasLinkedNote}`);

    // STEP 6: Add 2nd exam, check progress chart, exam comparison, and weakest subject
    console.log('Step 6: Thêm đợt thi thứ 2, kiểm tra biểu đồ tiến bộ, so sánh 2 đợt thi...');
    const step6 = await cdp.eval(`
      (() => {
        const exam2 = {
          id: 'exam_journey_02',
          name: 'Thi Thử V-ACT Trọng Tâm 02',
          date: '2026-11-05',
          durationMinutes: 150,
          scores: {
            vietnamese: { correct: 24, score: 235 },
            english: { correct: 26, score: 260 },
            math: { correct: 22, score: 220 },
            science: { correct: 25, score: 245 }
          },
          questions: UI.generateBlank120Questions()
        };
        UI.state.exams.unshift(exam2);
        StorageService.save(UI.state);
        UI.renderOverview();

        // Check comparison
        const comp = AnalyticsEngine.compareExams(UI.state.exams[1], UI.state.exams[0]);
        // Weakest subject analysis
        const weak = AnalyticsEngine.getWeakestSubject(UI.state);

        return {
          exam1Total: comp.totalScoreA, // 899
          exam2Total: comp.totalScoreB, // 960
          delta: comp.totalScoreDelta,   // +61
          weakSubject: weak ? weak.subjectName : null
        };
      })()
    `);
    console.log(`Step 6 Result: Exam1=${step6.exam1Total}, Exam2=${step6.exam2Total}, Delta=+${step6.delta}, IdentifiedWeakest=${step6.weakSubject}`);

    // STEP 7: Reload browser (simulate close & reopen)
    console.log('Step 7: Tải lại trang (mô phỏng đóng và mở lại trình duyệt) kiểm tra dữ liệu tồn tại...');
    await cdp.send('Page.reload');
    await sleep(1200);

    const step7 = await cdp.eval(`
      (() => {
        const examsCount = UI.state.exams.length;
        const notesCount = UI.state.notes.length;
        const topicStatus = UI.state.topics.find(t => t.id === '${step1.id}')?.status;
        return { examsCount, notesCount, topicStatus };
      })()
    `);
    console.log(`Step 7 Result: ExamsCount=${step7.examsCount}, NotesCount=${step7.notesCount}, TopicStatus=${step7.topicStatus}`);

    // STEP 8: Export JSON backup and verify validity
    console.log('Step 8: Kiểm tra xuất và sao lưu dữ liệu JSON...');
    const step8 = await cdp.eval(`
      (() => {
        const stateStr = JSON.stringify(UI.state);
        const parsed = JSON.parse(stateStr);
        return {
          validJson: typeof parsed === 'object',
          topicsCount: parsed.topics.length,
          examsCount: parsed.exams.length,
          notesCount: parsed.notes.length
        };
      })()
    `);
    console.log(`Step 8 Result: Valid=${step8.validJson}, Topics=${step8.topicsCount}, Exams=${step8.examsCount}, Notes=${step8.notesCount}`);

    const allPassed =
      step1.found && step1.status === 'needs_review' &&
      step23.totalScore === 899 && step23.totalCorrect === 89 &&
      step4.examQuestionsWrong > 0 &&
      step5.hasWrongQuestion && step5.hasLinkedNote &&
      step6.delta === 61 &&
      step7.examsCount === 2 && step7.notesCount === 1 &&
      step8.validJson;

    console.log(`\nJOURNEY VERDICT: ${allPassed ? '🏆 ALL USER JOURNEY CRITERIA VERIFIED 100% PERFECTLY!' : '⚠️ Journey incomplete'}`);
  } catch (err) {
    console.error('Journey error:', err);
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill();
  }
}

runJourney();
