import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Sparkles, X, Hand } from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';
import { reactionRuntime2D } from '../../vfx/ReactionRuntime2D';

interface ShowcaseStep {
  delayMs: number;
  caption_vi: string;
  caption_en: string;
  run: (ctx: Record<string, string>) => void;
}

interface ShowcaseScenario {
  id: string;
  title_vi: string;
  title_en: string;
  subtitle_vi: string;
  subtitle_en: string;
  steps: ShowcaseStep[];
}

const SCENARIOS: ShowcaseScenario[] = [
  {
    id: 'golden-rain',
    title_vi: 'Mưa vàng PbI₂ (Độ tan theo nhiệt độ)',
    title_en: 'PbI₂ Golden Rain Crystallization',
    subtitle_vi: 'Kết tủa vàng → Đun nóng hòa tan hoàn toàn → Làm nguội kết tinh vảy lục giác',
    subtitle_en: 'Yellow precipitate → Heat to dissolve clear → Cool down to sparkle',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Chuẩn bị cốc Pb(NO₃)₂ trên bếp từ gia nhiệt và ống chứa KI.',
        caption_en: 'Setting up Pb(NO₃)₂ beaker on burner and KI reagent beaker.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.burner = st.addEquipment('bunsen_burner', 200, 295);
          ctx.beakerA = st.addEquipment('beaker', 180, 130);
          ctx.beakerB = st.addEquipment('beaker', 400, 155);
          useLabStore.getState().addChemicalToEquipment(ctx.beakerA, 'chem-pbno32', 40);
          useLabStore.getState().addChemicalToEquipment(ctx.beakerB, 'chem-ki', 40);
        },
      },
      {
        delayMs: 1600,
        caption_vi: 'Rót dung dịch KI vào Pb(NO₃)₂ — tạo lớp vảy kết tủa PbI₂ vàng rực loang xuống đáy.',
        caption_en: 'Pouring KI into Pb(NO₃)₂ — vivid yellow PbI₂ clouds spread and precipitate.',
        run: (ctx) => {
          useLabStore.getState().triggerDirectPour(ctx.beakerB, ctx.beakerA);
        },
      },
      {
        delayMs: 3600,
        caption_vi: 'Bật đèn Bunsen đun nóng tới 85°C — tinh thể PbI₂ tan dần tạo dung dịch trong suốt.',
        caption_en: 'Igniting Bunsen burner to 85°C — PbI₂ crystals dissolve completely into clear liquid.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.toggleHeat(ctx.burner);
          const cur = st.equipment[ctx.beakerA];
          if (cur) {
            useLabStore.setState((s) => ({
              equipment: {
                ...s.equipment,
                [ctx.beakerA]: { ...cur, temperature_c: 86 },
              },
            }));
          }
        },
      },
      {
        delayMs: 4200,
        caption_vi: 'Tắt nhiệt — dung dịch nguội xuống, kết tinh lại các tinh thể vảy vàng lấp lánh (Golden Rain).',
        caption_en: 'Cooling off — shimmering hexagonal golden PbI₂ plates recrystallize slowly.',
        run: (ctx) => {
          const st = useLabStore.getState();
          if (st.equipment[ctx.burner]?.isOn) st.toggleHeat(ctx.burner);
          const cur = st.equipment[ctx.beakerA];
          if (cur) {
            useLabStore.setState((s) => ({
              equipment: {
                ...s.equipment,
                [ctx.beakerA]: { ...cur, temperature_c: 24 },
              },
            }));
            reactionRuntime2D.triggerController(cur, 'pbi2_golden_rain', {
              targetColorHex: cur.liquidColorHex,
            });
          }
        },
      },
    ],
  },
  {
    id: 'sodium-water',
    title_vi: 'Natri + Nước Phenolphthalein',
    title_en: 'Sodium + Water Phenolphthalein',
    subtitle_vi: 'Viên Na nóng chảy chạy trên mặt thoáng kèm dải màu hồng cánh sen loang dần',
    subtitle_en: 'Molten Na skitters on meniscus leaving diffusing magenta phenolphthalein ribbons',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Pha nước cất kèm vài giọt chỉ thị Phenolphthalein không màu.',
        caption_en: 'Preparing distilled water with colorless Phenolphthalein indicator.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.beaker = st.addEquipment('beaker', 270, 175);
          useLabStore.getState().addDistilledWater(ctx.beaker, 85);
          useLabStore.getState().addChemicalToEquipment(ctx.beaker, 'chem-phenolphthalein', 3);
        },
      },
      {
        delayMs: 1600,
        caption_vi: 'Thả viên kim loại Natri — sủi khí H₂ mạnh, bùng tia lửa vàng cam & dải kiềm hồng loang khắp cốc!',
        caption_en: 'Dropping metallic Na — H₂ effervescence, orange flame + spreading magenta trail!',
        run: (ctx) => {
          useLabStore.getState().addChemicalToEquipment(ctx.beaker, 'chem-na', undefined, 0.8);
          const eq = useLabStore.getState().equipment[ctx.beaker];
          if (eq) {
            reactionRuntime2D.triggerController(eq, 'na_water_skitter', {
              hasPhenolphthalein: true,
              targetColorHex: '#ec4899',
            });
          }
        },
      },
    ],
  },
  {
    id: 'titration-plume',
    title_vi: 'Chuẩn độ Axit-Bazơ (Loang màu cục bộ)',
    title_en: 'Acid-Base Titration Dye Plume',
    subtitle_vi: 'Nhỏ NaOH từng phần: tia hồng đậm loang ở bề mặt rồi khuấy tan, cho đến điểm tương đương',
    subtitle_en: 'Drops form localized magenta plumes that vanish until equivalence endpoint',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Chuẩn bị bình nón chứa 50 mL HCl 0.1M + Phenolphthalein.',
        caption_en: 'Preparing 50 mL HCl 0.1M + Phenolphthalein in flask.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.flask = st.addEquipment('erlenmeyer_flask', 265, 180);
          useLabStore.getState().addChemicalToEquipment(ctx.flask, 'chem-hcl', 50);
          useLabStore.getState().addChemicalToEquipment(ctx.flask, 'chem-phenolphthalein', 2);
        },
      },
      {
        delayMs: 1400,
        caption_vi: 'Nhỏ 25 mL NaOH — loang vệt chỉ thị cục bộ rồi trung hòa thành không màu khi khuấy.',
        caption_en: 'Adding 25 mL NaOH — transient pink plume appears then clears upon mixing.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.addChemicalToEquipment(ctx.flask, 'chem-naoh', 25);
          st.toggleStir(ctx.flask);
        },
      },
      {
        delayMs: 2600,
        caption_vi: 'Thêm NaOH vượt điểm tương đương (pH > 9.4) — toàn bộ dung dịch chuyển sang hồng cánh sen!',
        caption_en: 'Passing equivalence point (pH > 9.4) — Beer-Lambert magenta persists throughout.',
        run: (ctx) => {
          useLabStore.getState().addChemicalToEquipment(ctx.flask, 'chem-naoh', 32);
        },
      },
    ],
  },
  {
    id: 'copper-hno3',
    title_vi: 'Đồng + Axit Nitric đặc (Khí NO₂)',
    title_en: 'Copper + Conc. HNO₃ (NO₂ Evolution)',
    subtitle_vi: 'Phản ứng oxi hóa khử tạo ion [Cu(H₂O)₆]²⁺ xanh lam loang dần và khí NO₂ nâu đỏ',
    subtitle_en: 'Diffusing blue Cu²⁺ ions & dense swirling reddish-brown NO₂ fumes',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Cho lá đồng Cu vào bình tam giác đặt trên bàn.',
        caption_en: 'Adding metallic Cu foil into reaction flask.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.flask = st.addEquipment('erlenmeyer_flask', 270, 170);
          useLabStore.getState().addChemicalToEquipment(ctx.flask, 'chem-cu', undefined, 2.0);
        },
      },
      {
        delayMs: 1300,
        caption_vi: 'Rót axit HNO₃ 65% — dung dịch chuyển xanh lam đậm, khí nâu đỏ NO₂ bốc cuồn cuộn.',
        caption_en: 'Pouring HNO₃ — emerald-blue Cu²⁺ solution blooms while brown NO₂ plumes rise.',
        run: (ctx) => {
          useLabStore.getState().addChemicalToEquipment(ctx.flask, 'chem-hno3', 40);
        },
      },
    ],
  },
  {
    id: 'silver-mirror',
    title_vi: 'Phản ứng Tráng Gương (Tollens)',
    title_en: 'Tollens Silver Mirror Test',
    subtitle_vi: 'Phức [Ag(NH₃)₂]⁺ bị khử bởi Glucozo khi đun ấm, phủ lớp bạc sáng lên thành ống nghiệm',
    subtitle_en: 'Warm glucose reduces [Ag(NH₃)₂]⁺ to deposit a gleaming silver film inside glass',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Chuẩn bị AgNO₃ + NH₃ tạo thuốc thử Tollens trong cốc.',
        caption_en: 'Preparing Tollens reagent (AgNO₃ + NH₃) in beaker.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.burner = st.addEquipment('bunsen_burner', 280, 290);
          ctx.beaker = st.addEquipment('beaker', 260, 125);
          useLabStore.getState().addChemicalToEquipment(ctx.beaker, 'chem-agno3', 30);
          useLabStore.getState().addChemicalToEquipment(ctx.beaker, 'chem-nh3', 35);
          useLabStore.getState().toggleHeat(ctx.burner);
          const warm = useLabStore.getState().equipment[ctx.beaker];
          if (warm) {
            useLabStore.setState((s) => ({
              equipment: {
                ...s.equipment,
                [ctx.beaker]: { ...warm, temperature_c: 58 },
              },
            }));
          }
        },
      },
      {
        delayMs: 3400,
        caption_vi: 'Thêm Glucozo vào dung dịch ấm 58°C — bạc kim loại kết tủa từ từ, phủ dần thành lớp gương bạc óng ánh.',
        caption_en: 'Adding Glucose into 58°C warm bath — metallic Ag gradually plates onto inner vessel walls.',
        run: (ctx) => {
          useLabStore.getState().addChemicalToEquipment(ctx.beaker, 'chem-c6h12o6', 25);
        },
      },
    ],
  },
  {
    id: 'iodine-clock',
    title_vi: 'Đồng hồ Iot (Phản ứng dao động màu trễ)',
    title_en: 'Landolt Iodine Clock Flash',
    subtitle_vi: 'Pha KI + H₂SO₄ + Na₂S₂O₃ + Hồ tinh bột → Rót H₂O₂ → Trễ pha trong suốt rồi chuyển xanh đen đột ngột',
    subtitle_en: 'KI + H₂SO₄ + Na₂S₂O₃ + Starch → Pour H₂O₂ → Clear induction delay then sudden blue-black flash',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Chuẩn bị dung dịch KI, H₂SO₄, Na₂S₂O₃ (chất trì hoãn) và hồ tinh bột trong cốc.',
        caption_en: 'Preparing KI, H₂SO₄, thiosulfate scavenger, and starch indicator beaker alongside H₂O₂.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.beakerA = st.addEquipment('beaker', 180, 145);
          ctx.beakerB = st.addEquipment('beaker', 395, 145);
          const store = useLabStore.getState();
          store.addChemicalToEquipment(ctx.beakerA, 'chem-ki', 30);
          store.addChemicalToEquipment(ctx.beakerA, 'chem-h2so4', 25);
          store.addChemicalToEquipment(ctx.beakerA, 'chem-na2s2o3', 8);
          store.addChemicalToEquipment(ctx.beakerA, 'chem-starch', 15);
          store.addChemicalToEquipment(ctx.beakerB, 'chem-h2o2', 25);
        },
      },
      {
        delayMs: 1400,
        caption_vi: 'Rót H₂O₂ — Na₂S₂O₃ khử ngay I₂ mới sinh nên dung dịch giữ nguyên trong suốt trước khi bùng phát màu xanh đen!',
        caption_en: 'Pouring H₂O₂ — thiosulfate scavenges nascent I₂ during induction, then excess I₂ + Starch flashes deep blue-black!',
        run: (ctx) => {
          useLabStore.getState().triggerDirectPour(ctx.beakerB, ctx.beakerA);
        },
      },
    ],
  },
  {
    id: 'elephant-foam',
    title_vi: 'Voi phun kem đánh răng (Phân hủy H₂O₂ xúc tác KI + SDS)',
    title_en: 'Elephant Toothpaste Exothermic Foam',
    subtitle_vi: 'H₂O₂ + chất tạo bọt SDS → Xúc tác KI phân hủy sinh cột bọt O₂ trắng xóa kèm hơi nước tỏa nhiệt',
    subtitle_en: 'H₂O₂ + SDS surfactant → KI catalyst triggers rapid O₂ foam column and exothermic steam',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Chuẩn bị bình tam giác chứa H₂O₂ đậm đặc và chất hoạt động bề mặt SDS.',
        caption_en: 'Preparing Erlenmeyer flask with H₂O₂ + SDS surfactant and KI catalyst beaker.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.flask = st.addEquipment('erlenmeyer_flask', 190, 140);
          ctx.beakerKI = st.addEquipment('beaker', 410, 155);
          const store = useLabStore.getState();
          store.addChemicalToEquipment(ctx.flask, 'chem-h2o2', 60);
          store.addChemicalToEquipment(ctx.flask, 'chem-sds', 20);
          store.addChemicalToEquipment(ctx.beakerKI, 'chem-ki', 25);
        },
      },
      {
        delayMs: 1500,
        caption_vi: 'Rót KI xúc tác vào H₂O₂ + SDS — phản ứng phân hủy tỏa nhiệt giải phóng khí O₂ đẩy cột bọt xốp dâng cao!',
        caption_en: 'Pouring KI catalyst into H₂O₂ + SDS — rapid exothermic decomposition raises tall cellular O₂ foam!',
        run: (ctx) => {
          useLabStore.getState().triggerDirectPour(ctx.beakerKI, ctx.flask);
        },
      },
    ],
  },
  {
    id: 'amphoteric-cascade',
    title_vi: 'Hiđroxit lưỡng tính Al(OH)₃ (Kết tủa → Tan trong kiềm dư)',
    title_en: 'Amphoteric Al(OH)₃ Cascade',
    subtitle_vi: 'AlCl₃ + NaOH vừa đủ → Kết tủa keo trắng Al(OH)₃ → Thêm NaOH dư → Hòa tan tạo NaAlO₂ trong suốt',
    subtitle_en: 'AlCl₃ + stoichiometric NaOH → White Al(OH)₃ gel → Excess NaOH dissolves into clear NaAlO₂',
    steps: [
      {
        delayMs: 250,
        caption_vi: 'Chuẩn bị cốc AlCl₃ và dung dịch NaOH.',
        caption_en: 'Setting up AlCl₃ beaker and stoichiometric NaOH beaker.',
        run: (ctx) => {
          const st = useLabStore.getState();
          st.resetWorkbench();
          ctx.beakerAl = st.addEquipment('beaker', 180, 145);
          ctx.beakerNaOH = st.addEquipment('beaker', 395, 145);
          const store = useLabStore.getState();
          store.addChemicalToEquipment(ctx.beakerAl, 'chem-alcl3', 20);
          store.addChemicalToEquipment(ctx.beakerNaOH, 'chem-naoh', 55);
        },
      },
      {
        delayMs: 1500,
        caption_vi: 'Rót NaOH vừa đủ — tạo kết tủa keo trắng Al(OH)₃ lơ lửng trong dung dịch.',
        caption_en: 'Pouring stoichiometric NaOH — white gelatinous Al(OH)₃ precipitates cleanly.',
        run: (ctx) => {
          useLabStore.getState().triggerDirectPour(ctx.beakerNaOH, ctx.beakerAl);
        },
      },
      {
        delayMs: 2800,
        caption_vi: 'Tiếp tục thêm NaOH dư — kết tủa Al(OH)₃ tan hết tạo dung dịch natri aluminat NaAlO₂ trong suốt!',
        caption_en: 'Adding excess NaOH — amphoteric Al(OH)₃ redissolves completely into clear NaAlO₂!',
        run: (ctx) => {
          useLabStore.getState().addChemicalToEquipment(ctx.beakerAl, 'chem-naoh', 40);
        },
      },
    ],
  },
];

export const AutoShowcaseWorkspace: React.FC = () => {
  const { isShowcaseActive, setShowcaseActive, language } = useLabStore();
  const vi = language === 'vi';
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const ctxRef = useRef<Record<string, string>>({});
  const timerRef = useRef<number | null>(null);

  const scenario = SCENARIOS[scenarioIndex] ?? SCENARIOS[0];
  const currentStep = stepIndex >= 0 ? scenario.steps[stepIndex] : null;

  const scheduleNext = useCallback(
    (sIdx: number, nextStepIdx: number) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const sc = SCENARIOS[sIdx];
      if (!sc || nextStepIdx >= sc.steps.length) return;
      const step = sc.steps[nextStepIdx];
      timerRef.current = window.setTimeout(() => {
        step.run(ctxRef.current);
        setStepIndex(nextStepIdx);
        if (nextStepIdx === 0) {
          requestAnimationFrame(() => {
            useLabStore.getState().requestFitWorkbench();
          });
        }
        scheduleNext(sIdx, nextStepIdx + 1);
      }, step.delayMs);
    },
    []
  );

  useEffect(() => {
    if (!isShowcaseActive) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }
    ctxRef.current = {};
    setStepIndex(-1);
    if (playing) {
      scheduleNext(scenarioIndex, 0);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isShowcaseActive, scenarioIndex, playing, scheduleNext]);

  if (!isShowcaseActive) return null;

  return (
    <div className="relative z-20 shrink-0 px-2.5 sm:px-4 py-2 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-700/80 shadow-lg select-none">
      <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/70 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={15} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold truncate">
              {vi ? scenario.title_vi : scenario.title_en}
            </h3>
            <p className="hidden sm:block text-[11px] text-slate-300 truncate">
              {vi ? scenario.subtitle_vi : scenario.subtitle_en}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
            title={playing ? (vi ? 'Tạm dừng' : 'Pause') : (vi ? 'Phát tiếp' : 'Play')}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={() => {
              ctxRef.current = {};
              setStepIndex(-1);
              setPlaying(true);
              scheduleNext(scenarioIndex, 0);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            title={vi ? 'Chạy lại kịch bản' : 'Replay'}
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setScenarioIndex((i) => (i + 1) % SCENARIOS.length)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            title={vi ? 'Thí nghiệm tiếp theo' : 'Next Demo'}
          >
            <SkipForward size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowcaseActive(false)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
            title={vi ? 'Giữ bàn hiện tại để tự thao tác' : 'Take Over Bench'}
          >
            <Hand size={12} />
            <span className="hidden sm:inline">{vi ? 'Tự thao tác' : 'Take Over'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowcaseActive(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
            aria-label="Close showcase"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="flex items-center gap-1.5 pt-2 overflow-x-auto no-scrollbar">
        {SCENARIOS.map((sc, idx) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => setScenarioIndex(idx)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              idx === scenarioIndex
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {idx + 1}. {vi ? sc.title_vi.split(' (')[0] : sc.title_en.split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Live Narration Caption */}
      {currentStep && (
        <div className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-100 flex items-center justify-between gap-2">
          <span>{vi ? currentStep.caption_vi : currentStep.caption_en}</span>
          <span className="font-mono text-[11px] text-emerald-400 shrink-0 font-bold">
            {stepIndex + 1}/{scenario.steps.length}
          </span>
        </div>
      )}
      </div>
    </div>
  );
};
