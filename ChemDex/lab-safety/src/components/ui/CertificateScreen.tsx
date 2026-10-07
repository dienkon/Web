import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useStore } from '../../store/useStore';
import { Button } from '../../ui/Button';
import { vi } from '../../i18n/vi';
import { SAFETY_RULES } from '../../data/rules';
import {
  Award,
  Download,
  Share2,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const CertificateScreen: React.FC = () => {
  const score = useStore((s) => s.score);
  const errors = useStore((s) => s.errors);
  const mistakes = useStore((s) => s.mistakes);
  const startTime = useStore((s) => s.startTime);
  const endTime = useStore((s) => s.endTime);
  const character = useStore((s) => s.character);
  const startGame = useStore((s) => s.startGame);
  const setActiveRuleDialog = useStore((s) => s.setActiveRuleDialog);

  const certRef = useRef<HTMLDivElement>(null);

  // Trigger brand-colored confetti on load
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0EA5B7', '#1FA463', '#1F6FEB', '#F5A800'],
    });
  }, []);

  // Time spent formatting
  const totalSeconds = startTime && endTime ? Math.max(1, Math.floor((endTime - startTime) / 1000)) : 120;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  // Grade calculation
  const grade = score >= 95
    ? { title: vi.certificate.gradeExcellent, color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
    : score >= 85
    ? { title: vi.certificate.gradeGood, color: 'text-cyan-700 bg-cyan-50 border-cyan-300' }
    : { title: vi.certificate.gradePass, color: 'text-amber-700 bg-amber-50 border-amber-300' };

  // Certificate Unique ID: LS-YYYYMMDD-XXXXXX
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const certId = `LS-${dateStr}-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  // 6-Axis Competency Calculation
  // Axis: PPE, Chemical, Heat, Glass, FirstAid, Waste
  const categories = [
    { key: 'ppe', label: vi.certificate.axisPPE },
    { key: 'chemical', label: vi.certificate.axisChemical },
    { key: 'heat', label: vi.certificate.axisHeat },
    { key: 'glass', label: vi.certificate.axisGlass },
    { key: 'firstaid', label: vi.certificate.axisFirstAid },
    { key: 'waste', label: vi.certificate.axisWaste },
  ];

  const axisScores = categories.map((cat) => {
    const catErrors = mistakes.filter((m) => {
      const r = SAFETY_RULES.find((rule) => rule.id === m.ruleId);
      return r?.category === cat.key;
    }).length;
    // Base 100%, deduct 15% per category error, min 40%
    return Math.max(40, 100 - catErrors * 15);
  });

  // Calculate 6-axis polygon points on SVG
  const cx = 110;
  const cy = 110;
  const maxR = 80;
  const polygonPoints = axisScores.map((val, idx) => {
    const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
    const r = (val / 100) * maxR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  // "3 điều cần ôn" (extract up to 3 distinct rules from mistakes or fallback recommendations)
  const reviewRules = React.useMemo(() => {
    const mistakeRuleIds = Array.from(new Set(mistakes.map((m) => m.ruleId)));
    const selected = mistakeRuleIds.map((id) => SAFETY_RULES.find((r) => r.id === id)).filter(Boolean);
    if (selected.length < 3) {
      // Add standard key rules (e.g. 17 acid dilution, 4 goggles, 18 heating)
      const defaults = [17, 4, 18, 13, 24];
      for (const defId of defaults) {
        if (selected.length >= 3) break;
        const r = SAFETY_RULES.find((rule) => rule.id === defId);
        if (r && !selected.some((s) => s!.id === defId)) {
          selected.push(r);
        }
      }
    }
    return selected.slice(0, 3) as typeof SAFETY_RULES;
  }, [mistakes]);

  const handlePrintOrDownload = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#F7FAFD]/95 backdrop-blur-md overflow-y-auto p-4 sm:p-8 flex flex-col items-center select-none font-sans">
      
      <div className="w-full max-w-4xl space-y-6 my-auto">
        
        {/* ================= CERTIFICATE CARD (A4 Landscape aspect) ================= */}
        <div
          ref={certRef}
          className="relative bg-white rounded-3xl p-6 sm:p-10 border-4 border-slate-100 shadow-2xl overflow-hidden card-highlight"
        >
          {/* Top Cyan-to-Blue Rule Header */}
          <div className="absolute top-0 inset-x-0 h-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

          {/* Guilloche border watermark effect */}
          <div className="absolute inset-2 sm:inset-4 border-2 border-dashed border-cyan-500/20 rounded-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Left Certificate Info Column */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-50)] text-[var(--primary-600)] text-xs font-bold mb-3 border border-cyan-200">
                <ShieldCheck className="w-4 h-4" />
                <span>BỘ GIÁO DỤC & ĐÀO TẠO · CHEMDEX LAB</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--ink)] tracking-tight uppercase leading-tight mb-1">
                {vi.certificate.title}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--ink-2)] font-medium mb-6">
                {vi.certificate.subtitle}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-[var(--line)]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {vi.certificate.studentName}
                  </span>
                  <strong className="text-sm sm:text-base font-extrabold text-[var(--ink)]">
                    {character.name || 'Học Sinh'}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {vi.certificate.date}
                  </span>
                  <span className="text-sm font-bold text-[var(--ink)]">
                    {dateFormatted}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Thời gian hoàn thành
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-700">
                    {timeFormatted}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {vi.certificate.score}
                  </span>
                  <span className="text-base font-mono font-black text-amber-600">
                    {score}/100
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {vi.certificate.grade}
                  </span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-black border ${grade.color}`}>
                    {grade.title}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {vi.certificate.id}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {certId}
                  </span>
                </div>
              </div>
            </div>

            {/* Right 6-Axis Radar Visual */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-[220px] h-[220px] relative flex items-center justify-center">
                <svg width="220" height="220" className="overflow-visible">
                  {/* Background grid concentric circles */}
                  {[0.25, 0.5, 0.75, 1].map((scale) => (
                    <circle
                      key={scale}
                      cx={cx}
                      cy={cy}
                      r={maxR * scale}
                      fill="none"
                      stroke="#E3EBF2"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Axis Spokes */}
                  {categories.map((_, idx) => {
                    const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
                    return (
                      <line
                        key={idx}
                        x1={cx}
                        y1={cy}
                        x2={cx + maxR * Math.cos(angle)}
                        y2={cy + maxR * Math.sin(angle)}
                        stroke="#E3EBF2"
                        strokeWidth="1"
                      />
                    );
                  })}
                  {/* Radar Polygon Shape */}
                  <polygon
                    points={polygonPoints}
                    fill="rgba(14, 165, 183, 0.35)"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                  />
                  {/* Axis Labels */}
                  {categories.map((cat, idx) => {
                    const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
                    const lx = cx + (maxR + 18) * Math.cos(angle);
                    const ly = cy + (maxR + 18) * Math.sin(angle);
                    return (
                      <text
                        key={idx}
                        x={lx}
                        y={ly}
                        fontSize="9"
                        fontWeight="700"
                        fill="#4A5B6C"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {cat.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-2">
                Đánh giá năng lực thực hành 6 trục
              </span>
            </div>

          </div>
        </div>

        {/* ================= "3 ĐIỀU CẦN ÔN" REVIEW SECTION ================= */}
        <div className="white-glass rounded-2xl p-5 sm:p-6 border border-[var(--line)] shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--ink)] uppercase tracking-wider">
              {vi.certificate.reviewNeeded}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reviewRules.map((rule) => (
              <div
                key={rule.id}
                onClick={() => setActiveRuleDialog(rule)}
                className="p-3.5 bg-white rounded-xl border border-[var(--line)] hover:border-[var(--primary)] transition-all cursor-pointer shadow-xs active:scale-98 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--primary)] bg-[var(--primary-50)] px-2 py-0.5 rounded">
                      #{rule.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Xem lại</span>
                  </div>
                  <h4 className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--primary-600)] transition-colors">
                    {rule.title}
                  </h4>
                  <p className="text-[11px] text-[var(--ink-2)] mt-1 line-clamp-2">
                    {rule.why || rule.description}
                  </p>
                </div>
                <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[var(--primary)]">
                  <span>Mở thẻ quy tắc</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= ACTION BUTTONS ================= */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={handlePrintOrDownload}
          >
            {vi.certificate.downloadPDF}
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => startGame()}
          >
            {vi.certificate.playAgain}
          </Button>

          <a href="/lab-3d/">
            <Button
              variant="primary"
              size="md"
              icon={<ExternalLink className="w-4 h-4" />}
            >
              {vi.certificate.goToLab}
            </Button>
          </a>
        </div>

      </div>

    </div>
  );
};
