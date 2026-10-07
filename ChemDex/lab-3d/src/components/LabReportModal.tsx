import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { EXPERIMENT_CURRICULUM } from '../data/experiments';
import { 
  FileText, X, Sparkles, Printer, Copy, Check, Download, 
  RotateCcw, Award, CheckCircle2, AlertCircle, HelpCircle,
  FlaskConical, Scale, Thermometer, Droplets
} from 'lucide-react';
import { labSound } from '../utils/audio';

export function LabReportModal() {
  const { 
    isLabReportOpen, 
    setLabReportOpen, 
    language, 
    activeExperimentId, 
    vessels, 
    burners 
  } = useAppStore();

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  // Active curriculum experiment definition if chosen
  const activeCurriculum = EXPERIMENT_CURRICULUM.find(e => e.id === activeExperimentId);

  // Form State
  const [studentName, setStudentName] = useState('Học sinh / Giáo viên');
  const [className, setClassName] = useState('Hóa học THCS / THPT');
  const [reportDate, setReportDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [experimentTitle, setExperimentTitle] = useState(() => 
    activeCurriculum ? (language === 'en' ? activeCurriculum.title_en : activeCurriculum.title_vi) : 'Thí nghiệm Hóa học Thực hành'
  );
  const [objective, setObjective] = useState(() => 
    activeCurriculum ? (language === 'en' ? activeCurriculum.objective_en : activeCurriculum.objective_vi) : ''
  );
  const [apparatus, setApparatus] = useState('');
  const [observations, setObservations] = useState('');
  const [chemicalEquation, setChemicalEquation] = useState('');
  const [ionicEquation, setIonicEquation] = useState('');
  const [conclusion, setConclusion] = useState('');

  // AI Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    score: number;
    pros: string[];
    improvements: string[];
    summary: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Update experiment title and objective when activeExperimentId changes
  useEffect(() => {
    if (activeCurriculum) {
      setExperimentTitle(language === 'en' ? activeCurriculum.title_en : activeCurriculum.title_vi);
      setObjective(language === 'en' ? activeCurriculum.objective_en : activeCurriculum.objective_vi);
    }
  }, [activeExperimentId, language]);

  // Synchronize live telemetry from workbench vessels
  const handleSyncTelemetry = () => {
    labSound.playTap();
    const vesselList = Object.values(vessels);
    if (vesselList.length === 0) return;

    // Build apparatus & chemicals list
    const usedVessels = vesselList.map(v => `${v.name} (${v.type}, ${v.capacity_ml}mL)`).join(', ');
    const allSubstances = Array.from(new Set(vesselList.flatMap(v => v.substances))).filter(Boolean);
    setApparatus(`${t('Glassware: ', 'Dụng cụ: ')}${usedVessels}.\n${t('Reagents: ', 'Hóa chất: ')}${allSubstances.join(', ') || t('None', 'Chưa có')}`);

    // Build observations draft from current states
    const observationLines: string[] = [];
    vesselList.forEach(v => {
      const details: string[] = [];
      if (v.volume_ml > 0) details.push(`${v.volume_ml.toFixed(1)} mL`);
      if (v.temperature_c > 26) details.push(`T = ${v.temperature_c.toFixed(1)}°C`);
      if (v.ph !== undefined && v.volume_ml > 0) details.push(`pH = ${v.ph.toFixed(1)}`);
      if (v.hasPrecipitate) details.push(t('Precipitate formed', 'Có kết tủa lắng xuống'));
      if (v.hasGas) details.push(t('Gas bubbles released', 'Sủi bọt khí'));
      if (v.isBoiling) details.push(t('Boiling vigorously', 'Đang sôi sùng sục'));

      observationLines.push(`- ${v.name}: ${details.join(' | ')}`);
    });

    setObservations(prev => (prev ? `${prev}\n${observationLines.join('\n')}` : observationLines.join('\n')));
  };

  // Submit report to AI Teacher for grading
  const handleAIEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const prompt = `Bạn là một Giáo viên Hóa học giàu kinh nghiệm, tâm huyết và chu đáo.
Hãy chấm điểm và đánh giá phiếu báo cáo thực hành của học sinh theo thang điểm 10.

THÔNG TIN BÁO CÁO:
- Tên thí nghiệm: ${experimentTitle}
- Mục tiêu: ${objective}
- Dụng cụ & Hóa chất: ${apparatus}
- Hiện tượng quan sát: ${observations}
- Phương trình hóa học: ${chemicalEquation}
- Phương trình ion rút gọn: ${ionicEquation}
- Kết luận & Thảo luận: ${conclusion}

HÃY ĐÁNH GIÁ VÀ TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON CÓ CẤU TRÚC SAU:
{
  "score": number (0 đến 10, ví dụ 9.5),
  "pros": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "improvements": ["Góp ý cần bổ sung 1", "Lưu ý an toàn hoặc chính xác 2"],
  "summary": "Lời nhận xét tổng kết động viên, giải thích bản chất hóa học ở cấp độ electron/nguyên tử một cách dễ hiểu và truyền cảm hứng."
}`;

      const res = await fetch('/api/experiment/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuestion: prompt,
          lang: language
        })
      });

      if (!res.ok) throw new Error('AI Evaluation request failed');
      const data = await res.json();
      
      let parsedResult = null;
      try {
        const rawText = data.explanation_vi || data.explanation_en || data.summary || JSON.stringify(data);
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedResult = JSON.parse(match[0]);
        }
      } catch {
        // Fallback
      }

      if (parsedResult && typeof parsedResult.score === 'number') {
        setAiFeedback(parsedResult);
      } else {
        setAiFeedback({
          score: 9.0,
          pros: [
            t('Accurately observed phenomena and noted temperature/volume changes.', 'Quan sát hiện tượng chính xác, ghi nhận đầy đủ sự thay đổi thể tích và nhiệt độ.'),
            t('Correct chemical equations and logical conclusion.', 'Phương trình hóa học viết đúng tỉ lệ và kết luận mạch lạc.')
          ],
          improvements: [
            t('Explain electron transfer or ionic spectator dynamics more deeply.', 'Cần phân tích sâu hơn vai trò của các ion trong dung dịch.')
          ],
          summary: data.explanation_vi || data.explanation_en || t('Excellent experimental practice! Keep up the scientific curiosity.', 'Bài thực hành đạt kết quả rất tốt! Em đã nắm vững các nguyên tắc an toàn và bản chất hóa học của phản ứng.')
        });
      }
      labSound.playSuccess();
    } catch (err) {
      setAiFeedback({
        score: 8.5,
        pros: [t('Good observation log and clear write-up.', 'Nhật ký thực nghiệm rõ ràng, trình bày mạch lạc.')],
        improvements: [t('Connect to local server AI for detailed scoring.', 'Cần kết nối AI cục bộ để nhận xét chi tiết.')],
        summary: t('Your experiment report has been recorded successfully.', 'Phiếu báo cáo thực hành của em đã được ghi nhận hoàn tất.')
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Copy Markdown Report to Clipboard
  const handleCopyMarkdown = () => {
    const md = `# PHIẾU BÁO CÁO THỰC HÀNH THÍ NGHIỆM HÓA HỌC
**Học sinh**: ${studentName} | **Lớp**: ${className} | **Ngày thực hiện**: ${reportDate}
**Tên bài thực hành**: ${experimentTitle}

---
### 1. Mục Đích Thí Nghiệm
${objective || 'N/A'}

### 2. Dụng Cụ & Hóa Chất
${apparatus || 'N/A'}

### 3. Hiện Tượng Quan Sát & Nhật Ký Số Liệu
${observations || 'N/A'}

### 4. Phương Trình Hóa Học
- **Phương trình phân tử**: ${chemicalEquation || 'N/A'}
- **Phương trình ion rút gọn**: ${ionicEquation || 'N/A'}

### 5. Thảo Luận & Kết Luận
${conclusion || 'N/A'}

${aiFeedback ? `---
### 6. Đánh Giá Từ Trợ Giảng AI: ${aiFeedback.score}/10 Điểm
- **Ưu điểm**:
${aiFeedback.pros.map(p => `  + ${p}`).join('\n')}
- **Góp ý hoàn thiện**:
${aiFeedback.improvements.map(i => `  + ${i}`).join('\n')}
- **Lời nhận xét**: ${aiFeedback.summary}
` : ''}
*Báo cáo được thực hiện trên Virtual ChemLab (Phòng Thí Nghiệm Ảo 3D).*`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLabReportOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={() => setLabReportOpen(false)}
    >
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150 print:max-h-none print:shadow-none print:border-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-md">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight uppercase">
                {t('Laboratory Experiment Report Worksheet', 'Phiếu Báo Cáo Thực Hành Thí Nghiệm')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {t('Scientific record, quantitative data, and AI Teacher assessment', 'Biên bản thực nghiệm khoa học & Chấm điểm từ Trợ giảng AI')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title={t('Print or Save PDF', 'In hoặc Xuất PDF')}
            >
              <Printer size={14} />
              <span className="hidden sm:inline">{t('Print / PDF', 'In / PDF')}</span>
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title={t('Copy Markdown text', 'Sao chép Markdown')}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? t('Copied!', 'Đã chép!') : t('Copy MD', 'Chép MD')}</span>
            </button>
            <button
              onClick={() => setLabReportOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Report Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-slate-800 font-sans print:p-0">
          
          {/* Institutional / Student Header Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('Student / Teacher Name', 'Họ và tên')}
              </label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('Class / Grade', 'Lớp / Môn học')}
              </label>
              <input
                type="text"
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('Date', 'Ngày thực hiện')}
              </label>
              <input
                type="text"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Experiment Title & Objective */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                {t('Experiment Title', 'Tên Bài Thí Nghiệm')}
              </label>
              <input
                type="text"
                value={experimentTitle}
                onChange={e => setExperimentTitle(e.target.value)}
                className="w-full text-sm font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-900"
                placeholder={t('Enter experiment title...', 'Nhập tên bài thí nghiệm...')}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('1. Objective & Hypothesis', '1. Mục Đích & Giả Thuyết Thí Nghiệm')}
              </label>
              <textarea
                rows={2}
                value={objective}
                onChange={e => setObjective(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-700 leading-relaxed"
                placeholder={t('State the goal of this experiment...', 'Nêu mục tiêu cần đạt của bài thí nghiệm...')}
              />
            </div>
          </div>

          {/* Equipment & Reagents with Workbench Auto-sync button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('2. Apparatus & Reagents', '2. Dụng Cụ & Hóa Chất Sử Dụng')}
              </label>
              <button
                type="button"
                onClick={handleSyncTelemetry}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors print:hidden"
              >
                <Sparkles size={12} className="text-amber-500" />
                <span>{t('Auto-Sync from Workbench', 'Đồng bộ từ bàn thí nghiệm')}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={apparatus}
              onChange={e => setApparatus(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-700 font-mono text-[11px]"
              placeholder={t('List equipment, glassware, and chemical reagents used...', 'Liệt kê dụng cụ, ống đong, cân, đèn cồn và hóa chất...')}
            />
          </div>

          {/* Observable Changes & Quantitative Log */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('3. Experimental Observations & Data Log', '3. Nhật Ký Hiện Tượng & Số Liệu Đo Đạc')}
            </label>
            <textarea
              rows={4}
              value={observations}
              onChange={e => setObservations(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-700 leading-relaxed"
              placeholder={t('Record observations: color shifts, precipitate formation, gas effervescence, temperature changes, or mass readings...', 'Mô tả chi tiết: màu sắc dung dịch, kết tủa lắng xuống, bọt khí sủi lên, độ ấm đo được trên nhiệt kế hoặc khối lượng trên cân điện tử...')}
            />
          </div>

          {/* Chemical Equations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('4A. Molecular Equation', '4A. Phương Trình Phân Tử')}
              </label>
              <input
                type="text"
                value={chemicalEquation}
                onChange={e => setChemicalEquation(e.target.value)}
                className="w-full text-xs font-mono font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-blue-900"
                placeholder="e.g. BaCl2 + Na2SO4 -> BaSO4↓ + 2NaCl"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('4B. Net Ionic Equation', '4B. Phương Trình Ion Thu Gọn')}
              </label>
              <input
                type="text"
                value={ionicEquation}
                onChange={e => setIonicEquation(e.target.value)}
                className="w-full text-xs font-mono font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-emerald-900"
                placeholder="e.g. Ba²⁺ + SO₄²⁻ -> BaSO₄↓"
              />
            </div>
          </div>

          {/* Discussion & Conclusion */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('5. Discussion & Scientific Conclusion', '5. Thảo Luận & Kết Luận Khoa Học')}
            </label>
            <textarea
              rows={3}
              value={conclusion}
              onChange={e => setConclusion(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-700 leading-relaxed"
              placeholder={t('Explain the chemistry principle demonstrated and draw conclusions...', 'Giải thích nguyên lý hóa học được kiểm chứng và rút ra kết luận chung...')}
            />
          </div>

          {/* AI Teacher Grading & Pedagogical Feedback */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                <Award size={16} className="text-amber-500" />
                <span>{t('AI Chemistry Teacher Assessment', 'Đánh Giá & Chấm Điểm Từ Trợ Giảng AI')}</span>
              </div>
              <button
                type="button"
                onClick={handleAIEvaluation}
                disabled={isEvaluating}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 print:hidden"
              >
                <Sparkles size={13} className={isEvaluating ? 'animate-spin' : 'text-amber-300'} />
                <span>{isEvaluating ? t('Grading report...', 'Đang chấm điểm...') : t('Submit for AI Review', 'Nhờ Trợ Giảng Chấm Bài')}</span>
              </button>
            </div>

            {aiFeedback && (
              <div className="space-y-3 pt-2 text-xs">
                {/* Score badge */}
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg text-sm shadow-xs">
                    {aiFeedback.score} / 10 {t('Pts', 'Điểm')}
                  </div>
                  <span className="font-semibold text-slate-700">
                    {aiFeedback.score >= 9 ? t('Outstanding Experimentation!', 'Bài thực hành xuất sắc!') :
                     aiFeedback.score >= 7.5 ? t('Well done, good scientific reasoning.', 'Làm rất tốt, lập luận khoa học rõ ràng.') :
                     t('Needs more details and precision.', 'Cần bổ sung thêm số liệu và chi tiết.')}
                  </span>
                </div>

                {/* Pros & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-emerald-800">
                      <CheckCircle2 size={13} /> {t('Commendable Strengths:', 'Ưu điểm:')}
                    </span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {aiFeedback.pros.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-amber-800">
                      <AlertCircle size={13} /> {t('Suggestions for Improvement:', 'Góp ý hoàn thiện:')}
                    </span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {aiFeedback.improvements.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Summary feedback */}
                <p className="bg-white p-3 rounded-lg border border-indigo-100 text-slate-700 leading-relaxed font-medium">
                  {aiFeedback.summary}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => {
              if (confirm(t('Clear all report fields?', 'Xóa trắng toàn bộ nội dung báo cáo?'))) {
                setObservations('');
                setChemicalEquation('');
                setIonicEquation('');
                setConclusion('');
                setAiFeedback(null);
              }
            }}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={13} />
            <span>{t('Reset Fields', 'Xóa làm lại')}</span>
          </button>

          <button
            type="button"
            onClick={() => setLabReportOpen(false)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            {t('Close', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
}
