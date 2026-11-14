import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  FlaskConical,
  GitBranch,
  Play,
  X,
  Flame,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Loader2,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';
import { useLabEnvironment } from '../../store/useLabEnvironment';
import { formatFormulaUnicode } from '../../chemistry/core/formula';
import {
  CATEGORY_LABELS_VI,
  CurriculumReactionEntry,
  FAMILY_LABELS_VI,
  foldVi,
  LoadedReactionHubBundle,
  loadReactionHubBundle,
  ReactionEntry,
  ChainResult,
} from '../../data/reactionCatalogLoader';
import { runReactionOnWorkbench2D } from '../../engine/workbenchReactionBridge';
import { EquipmentType } from '../../types/equipment';

interface ReactionLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HubTab = 'curriculum' | 'catalog' | 'chains';

const CHAIN_QUICK_EXAMPLES = [
  'Cu -> CuSO4 -> Cu(OH)2 -> CuO -> Cu',
  'Fe -> FeCl2 -> Fe(OH)2 -> Fe(OH)3 -> Fe2O3',
  'CaCO3 -> CO2 -> Na2CO3 -> BaCO3',
  'Al -> AlCl3 -> Al(OH)3 -> NaAlO2',
  'S -> SO2 -> H2SO4 -> BaSO4',
];

export const ReactionLibraryModal: React.FC<ReactionLibraryModalProps> = ({ isOpen, onClose }) => {
  const language = useLabStore((s) => s.language);
  const setMobilePanel = useLabStore((s) => s.setMobilePanel);
  const { labTheme } = useLabEnvironment();
  const isDark = labTheme === 'dark';
  const vi = language === 'vi';

  const [bundle, setBundle] = useState<LoadedReactionHubBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>('curriculum');
  const [vesselChoice, setVesselChoice] = useState<EquipmentType>('beaker');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Tab 1: 131 THPT curriculum
  const [currQuery, setCurrQuery] = useState('');
  const [currGrade, setCurrGrade] = useState<number | 'all'>('all');
  const [currCategory, setCurrCategory] = useState<string>('all');
  const [selectedCurrId, setSelectedCurrId] = useState<string>('hcl_naoh');

  // Tab 2: 1,300 shared catalog
  const [catQuery, setCatQuery] = useState('');
  const [catFamily, setCatFamily] = useState<string>('all');
  const [catLimit, setCatLimit] = useState<number>(40);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Tab 3: Chains
  const [chainMode, setChainMode] = useState<'analyze' | 'find'>('analyze');
  const [chainInput, setChainInput] = useState('Cu -> CuSO4 -> Cu(OH)2 -> CuO -> Cu');
  const [findStart, setFindStart] = useState('Fe');
  const [findEnd, setFindEnd] = useState('Fe2O3');
  const [findMinSteps, setFindMinSteps] = useState(3);
  const [chainResult, setChainResult] = useState<ChainResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadReactionHubBundle()
      .then((loaded) => {
        if (cancelled) return;
        setBundle(loaded);
        if (loaded.curriculum.length && !loaded.curriculum.some((c) => c.id === selectedCurrId)) {
          setSelectedCurrId(loaded.curriculum[0].id);
        }
        if (loaded.catalog.entries.length && !selectedCatId) {
          setSelectedCatId(loaded.catalog.entries[0].id);
        }
        setChainResult(loaded.analyzeChain(loaded.index, chainInput));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredCurriculum = useMemo(() => {
    if (!bundle) return [];
    const q = foldVi(currQuery).replace(/\s+/g, '');
    return bundle.curriculum.filter((item) => {
      if (currGrade !== 'all' && !(item.suggestedGrades || []).includes(currGrade)) return false;
      if (currCategory !== 'all' && item.category !== currCategory) return false;
      if (!q) return true;
      const hay = foldVi(`${item.title_vi} ${item.equation} ${item.topic_vi ?? ''} ${item.observation_vi ?? ''}`).replace(/\s+/g, '');
      return hay.includes(q);
    });
  }, [bundle, currQuery, currGrade, currCategory]);

  const selectedCurr: CurriculumReactionEntry | undefined = useMemo(() => {
    return (
      filteredCurriculum.find((item) => item.id === selectedCurrId) ||
      bundle?.curriculum.find((item) => item.id === selectedCurrId) ||
      filteredCurriculum[0]
    );
  }, [filteredCurriculum, bundle, selectedCurrId]);

  const catalogSearchResult = useMemo(() => {
    if (!bundle) return { total: 0, entries: [] as ReactionEntry[] };
    return bundle.searchReactions(bundle.index, catQuery, {
      family: catFamily,
      limit: catLimit,
      offset: 0,
    });
  }, [bundle, catQuery, catFamily, catLimit]);

  const selectedCatalogEntry: ReactionEntry | undefined = useMemo(() => {
    if (!bundle) return undefined;
    return (
      catalogSearchResult.entries.find((e) => e.id === selectedCatId) ||
      (selectedCatId ? bundle.index.byId.get(selectedCatId) : undefined) ||
      catalogSearchResult.entries[0]
    );
  }, [bundle, catalogSearchResult, selectedCatId]);

  const selectedCatalogGuide = useMemo(() => {
    if (!bundle || !selectedCatalogEntry) return null;
    try {
      return bundle.reactionGuide(selectedCatalogEntry);
    } catch {
      return null;
    }
  }, [bundle, selectedCatalogEntry]);

  if (!isOpen) return null;

  const surfaceCls = isDark
    ? 'bg-slate-900 text-slate-100 border-slate-700'
    : 'bg-white text-slate-900 border-slate-200';
  const mutedCardCls = isDark
    ? 'bg-slate-800/80 border-slate-700/80 text-slate-200'
    : 'bg-slate-50 border-slate-200/90 text-slate-800';
  const inputCls = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  const handleRunCurriculumOnBench = (entry: CurriculumReactionEntry) => {
    runReactionOnWorkbench2D(
      {
        id: entry.id,
        title_vi: entry.title_vi,
        equation: entry.equation,
        reactants: entry.reactants,
        simulationDoses: entry.simulationDoses,
        conditions: entry.conditions,
        category: entry.category,
      },
      { vesselType: vesselChoice }
    );
    setMobilePanel(null);
    onClose();
  };

  const handleRunCatalogOnBench = (entry: ReactionEntry) => {
    runReactionOnWorkbench2D(
      {
        id: entry.id,
        title_vi: entry.title_vi,
        equation: entry.equation,
        reactants: entry.reactants.map((r) => ({
          formula: r.formula,
          coeff: r.coefficient,
          phase: r.phase,
        })),
        conditions: {
          description_vi: entry.conditions?.description_vi,
          catalyst: entry.conditions?.catalyst ?? null,
          activation: entry.conditions?.activation ?? null,
          heating:
            entry.family === 'thermal' ||
            entry.family === 'esterification' ||
            entry.conditions?.activation === 'heat' ||
            /đun|nhiệt|nóng/i.test(entry.conditions?.description_vi || ''),
        },
        family: entry.family,
      },
      { vesselType: vesselChoice }
    );
    setMobilePanel(null);
    onClose();
  };

  const handleRunChainStep = (reactionId: string) => {
    const entry = bundle?.index.byId.get(reactionId);
    if (entry) handleRunCatalogOnBench(entry);
  };

  const handleSolveChain = () => {
    if (!bundle) return;
    if (chainMode === 'analyze') {
      setChainResult(bundle.analyzeChain(bundle.index, chainInput));
    } else {
      setChainResult(bundle.findChain(bundle.index, findStart, findEnd, { minSteps: findMinSteps }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={vi ? 'Kho Phương Trình & Thí Nghiệm Lab-3D' : 'Reaction Equations & Experiments Hub'}
        className={`w-full max-w-6xl h-[92vh] sm:h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${surfaceCls}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {/* Top Modal Header */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {vi ? 'Kho Phương Trình & Thí Nghiệm Chuẩn THPT' : 'Reaction Equations & Guided Lab Hub'}
              </h2>
              <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {bundle
                  ? vi
                    ? `${bundle.curriculum.length} bài thực hành SGK · ${bundle.catalog.count.toLocaleString()} phương trình chuẩn · Tìm chuỗi tổng hợp`
                    : `${bundle.curriculum.length} curriculum protocols · ${bundle.catalog.count.toLocaleString()} verified equations · Chain solver`
                  : vi
                    ? 'Đang tải kho dữ liệu phản ứng hóa học...'
                    : 'Loading chemistry reaction catalog...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`hidden sm:flex items-center gap-1 p-0.5 rounded-lg border text-[11px] font-semibold ${mutedCardCls}`}>
              <button
                type="button"
                onClick={() => setVesselChoice('beaker')}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  vesselChoice === 'beaker' ? 'bg-blue-600 text-white' : ''
                }`}
              >
                {vi ? 'Cốc 250mL' : 'Beaker'}
              </button>
              <button
                type="button"
                onClick={() => setVesselChoice('test_tube')}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  vesselChoice === 'test_tube' ? 'bg-blue-600 text-white' : ''
                }`}
              >
                {vi ? 'Ống nghiệm' : 'Tube'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={vi ? 'Đóng kho phản ứng' : 'Close reaction library'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Primary Tabs */}
        <div
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b overflow-x-auto no-scrollbar shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'
          }`}
        >
          {[
            {
              id: 'curriculum' as const,
              icon: <FlaskConical className="w-3.5 h-3.5" />,
              label: vi
                ? `Thí nghiệm SGK (${bundle?.curriculum.length ?? 131})`
                : `Curriculum (${bundle?.curriculum.length ?? 131})`,
            },
            {
              id: 'catalog' as const,
              icon: <Compass className="w-3.5 h-3.5" />,
              label: vi
                ? `Kho phương trình (${bundle?.catalog.count ?? 1300})`
                : `Equations (${bundle?.catalog.count ?? 1300})`,
            },
            {
              id: 'chains' as const,
              icon: <GitBranch className="w-3.5 h-3.5" />,
              label: vi ? 'Chuỗi phản ứng & Tìm chuỗi' : 'Reaction Chains',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setMobileShowDetail(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        {loadError && (
          <div className="m-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {vi ? 'Không thể tải dữ liệu kho phản ứng:' : 'Failed to load reaction library:'} {loadError}
          </div>
        )}

        {!bundle && !loadError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span>{vi ? 'Đang lập chỉ mục 1.300 phương trình & 131 thí nghiệm...' : 'Indexing 1,300 equations...'}</span>
          </div>
        )}

        {/* TAB 1: 131 THPT Curriculum Protocols */}
        {bundle && activeTab === 'curriculum' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            {/* Left List Column */}
            <div
              className={`${
                mobileShowDetail ? 'hidden lg:flex' : 'flex'
              } lg:w-[400px] xl:w-[430px] flex-col border-b lg:border-b-0 lg:border-r min-h-0 flex-1 lg:flex-initial ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className={`p-3 border-b space-y-2 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={currQuery}
                    onChange={(e) => setCurrQuery(e.target.value)}
                    placeholder={vi ? 'Tìm phương trình, tên bài, chất (AgNO3, tráng bạc...)' : 'Search equation or reagent...'}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-emerald-500/40 ${inputCls}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {(['all', 10, 11, 12] as const).map((g) => (
                    <button
                      key={String(g)}
                      type="button"
                      onClick={() => setCurrGrade(g)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        currGrade === g
                          ? 'bg-emerald-600 text-white'
                          : isDark
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {g === 'all' ? (vi ? 'Tất cả lớp' : 'All') : `Lớp ${g}`}
                    </button>
                  ))}
                  <select
                    aria-label={vi ? 'Lọc theo loại phản ứng' : 'Filter by category'}
                    value={currCategory}
                    onChange={(e) => setCurrCategory(e.target.value)}
                    className={`ml-auto px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${inputCls}`}
                  >
                    {Object.entries(CATEGORY_LABELS_VI).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredCurriculum.map((item) => {
                  const active = selectedCurr?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedCurrId(item.id);
                        setMobileShowDetail(true);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                          : `${mutedCardCls} hover:border-emerald-400/70`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-xs font-bold line-clamp-1">{item.title_vi}</span>
                        {item.suggestedGrades?.length ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-600/15 text-emerald-600 shrink-0 font-bold">
                            L{item.suggestedGrades.join(',')}
                          </span>
                        ) : null}
                      </div>
                      <div className={`text-[11px] font-mono truncate ${isDark ? 'text-sky-300' : 'text-blue-700'}`}>
                        {formatFormulaUnicode(item.equation)}
                      </div>
                      {item.conditions?.heating && (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold text-orange-500">
                          <Flame className="w-3 h-3" /> {vi ? 'Cần đun nóng' : 'Heating required'}
                        </span>
                      )}
                    </button>
                  );
                })}
                {filteredCurriculum.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8">
                    {vi ? 'Không tìm thấy thí nghiệm phù hợp.' : 'No matching curriculum reactions.'}
                  </p>
                )}
              </div>
            </div>

            {/* Right Detail Column */}
            <div className={`${mobileShowDetail ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4`}>
              {selectedCurr && (
                <>
                  <button
                    type="button"
                    onClick={() => setMobileShowDetail(false)}
                    className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-emerald-600 self-start"
                  >
                    <ChevronLeft className="w-4 h-4" /> {vi ? 'Quay lại danh sách (131)' : 'Back to list'}
                  </button>

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {selectedCurr.topic_vi && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 font-bold">
                            {selectedCurr.topic_vi}
                          </span>
                        )}
                        {selectedCurr.thermochemistry?.deltaH_kJ_per_mol_reaction != null && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-mono font-bold">
                            ΔH° = {selectedCurr.thermochemistry.deltaH_kJ_per_mol_reaction.toFixed(1)} kJ/mol
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold leading-snug">{selectedCurr.title_vi}</h3>
                      <div className={`p-2.5 rounded-xl border font-mono text-xs sm:text-sm font-bold break-words ${mutedCardCls}`}>
                        {formatFormulaUnicode(selectedCurr.equation)}
                      </div>
                      {selectedCurr.ionic && (
                        <div className={`text-xs font-mono ${isDark ? 'text-sky-300' : 'text-blue-700'}`}>
                          <strong>Ion rút gọn:</strong> {formatFormulaUnicode(selectedCurr.ionic)}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRunCurriculumOnBench(selectedCurr)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer shrink-0"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{vi ? 'Thử trên bàn 2D' : 'Run on 2D Bench'}</span>
                    </button>
                  </div>

                  {/* Conditions + Phenomenon */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border space-y-1 ${mutedCardCls}`}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> {vi ? 'Hiện tượng quan sát' : 'Observable Changes'}
                      </div>
                      <p className="text-xs leading-relaxed">{selectedCurr.observation_vi || '—'}</p>
                    </div>
                    <div className={`p-3 rounded-xl border space-y-1 ${mutedCardCls}`}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                        {vi ? 'Bản chất & Điều kiện' : 'Mechanism & Conditions'}
                      </div>
                      <p className="text-xs leading-relaxed">{selectedCurr.explanation_vi || '—'}</p>
                      {selectedCurr.conditions?.description_vi && (
                        <p className="text-[11px] text-amber-600 font-semibold mt-1">
                          ĐK: {selectedCurr.conditions.description_vi}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detailed 4 Stages (Lab-3D observationGuide parity) */}
                  {selectedCurr.observationGuide && (
                    <div className={`p-3.5 rounded-xl border space-y-2.5 ${mutedCardCls}`}>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-600">
                        {vi ? 'Diễn biến 4 giai đoạn chi tiết (Động học Lab-3D)' : '4-Stage Reaction Progression'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {selectedCurr.observationGuide.contact_vi && (
                          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                            <strong className="block text-[11px] text-emerald-600 mb-0.5">1. Tiếp xúc pha</strong>
                            {selectedCurr.observationGuide.contact_vi}
                          </div>
                        )}
                        {selectedCurr.observationGuide.evolution_vi && (
                          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                            <strong className="block text-[11px] text-emerald-600 mb-0.5">2. Chuyển hóa & Hiện tượng</strong>
                            {selectedCurr.observationGuide.evolution_vi}
                          </div>
                        )}
                        {selectedCurr.observationGuide.standing_vi && (
                          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                            <strong className="block text-[11px] text-emerald-600 mb-0.5">3. Lắng tụ / Ổn định</strong>
                            {selectedCurr.observationGuide.standing_vi}
                          </div>
                        )}
                        {selectedCurr.observationGuide.timing_vi && (
                          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                            <strong className="block text-[11px] text-emerald-600 mb-0.5">4. Ghi chú động học</strong>
                            {selectedCurr.observationGuide.timing_vi}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Steps & Doses */}
                  {selectedCurr.steps?.length ? (
                    <div className={`p-3.5 rounded-xl border space-y-2 ${mutedCardCls}`}>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider">
                        {vi ? 'Quy trình tiến hành thí nghiệm' : 'Laboratory Procedure'}
                      </h4>
                      <ol className="space-y-1.5 text-xs list-decimal list-inside">
                        {selectedCurr.steps.map((st) => (
                          <li key={st.order} className="leading-relaxed">
                            {st.instruction_vi}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {/* Safety + Sources */}
                  {(selectedCurr.safety_vi || selectedCurr.sources?.length) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                      {selectedCurr.safety_vi && (
                        <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>{selectedCurr.safety_vi}</span>
                        </div>
                      )}
                      {selectedCurr.sources?.length ? (
                        <div className="flex flex-wrap items-center gap-2 ml-auto">
                          {selectedCurr.sources.slice(0, 2).map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-teal-600 hover:underline font-semibold"
                            >
                              Tài liệu {i + 1} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 1,300 Extended Equations Catalog */}
        {bundle && activeTab === 'catalog' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            <div
              className={`${
                mobileShowDetail ? 'hidden lg:flex' : 'flex'
              } lg:w-[400px] xl:w-[430px] flex-col border-b lg:border-b-0 lg:border-r min-h-0 flex-1 lg:flex-initial ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className={`p-3 border-b space-y-2 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={catQuery}
                    onChange={(e) => {
                      setCatQuery(e.target.value);
                      setCatLimit(40);
                    }}
                    placeholder={vi ? 'Tìm 1.300 phương trình (FeCl3, CuSO4, Cr, este...)' : 'Search 1,300 reactions...'}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-emerald-500/40 ${inputCls}`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={vi ? 'Nhóm phản ứng' : 'Reaction family'}
                    value={catFamily}
                    onChange={(e) => {
                      setCatFamily(e.target.value);
                      setCatLimit(40);
                    }}
                    className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${inputCls}`}
                  >
                    <option value="all">Tất cả nhóm ({bundle.catalog.count})</option>
                    {Object.entries(bundle.catalog.counts.families).map(([fam, count]) => (
                      <option key={fam} value={fam}>
                        {FAMILY_LABELS_VI[fam] || fam} ({count})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 shrink-0">
                    {catalogSearchResult.total} KQ
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {catalogSearchResult.entries.map((entry) => {
                  const active = selectedCatalogEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setSelectedCatId(entry.id);
                        setMobileShowDetail(true);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                          : `${mutedCardCls} hover:border-emerald-400/70`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-xs font-bold line-clamp-1">{entry.title_vi}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 shrink-0 font-semibold">
                          {FAMILY_LABELS_VI[entry.family] || entry.family}
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono truncate ${isDark ? 'text-sky-300' : 'text-blue-700'}`}>
                        {formatFormulaUnicode(entry.equation)}
                      </div>
                    </button>
                  );
                })}
                {catalogSearchResult.total > catalogSearchResult.entries.length && (
                  <button
                    type="button"
                    onClick={() => setCatLimit((l) => Math.min(200, l + 40))}
                    className="w-full py-2 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    + Xem thêm ({catalogSearchResult.total - catalogSearchResult.entries.length} phương trình)
                  </button>
                )}
              </div>
            </div>

            <div className={`${mobileShowDetail ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4`}>
              {selectedCatalogEntry && (
                <>
                  <button
                    type="button"
                    onClick={() => setMobileShowDetail(false)}
                    className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-emerald-600 self-start"
                  >
                    <ChevronLeft className="w-4 h-4" /> {vi ? 'Quay lại kho phương trình' : 'Back to equations'}
                  </button>

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600">
                        {FAMILY_LABELS_VI[selectedCatalogEntry.family] || selectedCatalogEntry.family} · {selectedCatalogEntry.topic_vi}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold">{selectedCatalogEntry.title_vi}</h3>
                      <div className={`p-2.5 rounded-xl border font-mono text-xs sm:text-sm font-bold break-words ${mutedCardCls}`}>
                        {formatFormulaUnicode(selectedCatalogEntry.equation)}
                      </div>
                      {selectedCatalogEntry.ionic?.equation && (
                        <div className={`text-xs font-mono ${isDark ? 'text-sky-300' : 'text-blue-700'}`}>
                          <strong>Ion thu gọn:</strong> {formatFormulaUnicode(selectedCatalogEntry.ionic.equation)}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRunCatalogOnBench(selectedCatalogEntry)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer shrink-0"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{vi ? 'Thử trên bàn 2D' : 'Run on 2D Bench'}</span>
                    </button>
                  </div>

                  {selectedCatalogGuide && (
                    <div className="space-y-3">
                      <div className={`p-3.5 rounded-xl border space-y-2 ${mutedCardCls}`}>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">
                          {vi ? 'Cơ chế & Tỉ lệ hợp thức' : 'Mechanism & Stoichiometry'}
                        </h4>
                        <p className="text-xs leading-relaxed">{selectedCatalogGuide.mechanism_vi}</p>
                        <p className="text-xs leading-relaxed text-slate-500">{selectedCatalogGuide.stoichiometry_vi}</p>
                      </div>

                      <div className={`p-3.5 rounded-xl border space-y-2 ${mutedCardCls}`}>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                          {vi ? '4 Giai đoạn diễn biến phản ứng' : '4 Reaction Stages'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          {selectedCatalogGuide.stages.map((st, idx) => (
                            <div key={st.id} className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                              <strong className="block text-[11px] text-emerald-600 mb-0.5">
                                {idx + 1}. {st.title_vi}
                              </strong>
                              {st.explanation_vi}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${mutedCardCls}`}>
                        <div className="font-bold text-amber-600">{vi ? 'Tốc độ & Động học' : 'Rate & Kinetics'}</div>
                        <p>{selectedCatalogGuide.rate.explanation_vi}</p>
                        <div className="pt-1 font-semibold text-emerald-600">
                          {selectedCatalogGuide.observations_vi.join(' ')}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Reaction Chain Analyzer & Finder */}
        {bundle && activeTab === 'chains' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setChainMode('analyze')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  chainMode === 'analyze'
                    ? 'bg-emerald-600 text-white'
                    : mutedCardCls
                }`}
              >
                {vi ? 'Phân tích chuỗi có sẵn' : 'Analyze Known Chain'}
              </button>
              <button
                type="button"
                onClick={() => setChainMode('find')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  chainMode === 'find'
                    ? 'bg-emerald-600 text-white'
                    : mutedCardCls
                }`}
              >
                {vi ? 'Tìm chuỗi chuyển hóa từ A → B' : 'Find Synthesis Path A → B'}
              </button>
            </div>

            {chainMode === 'analyze' ? (
              <div className={`p-3.5 rounded-xl border space-y-3 ${mutedCardCls}`}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={chainInput}
                    onChange={(e) => setChainInput(e.target.value)}
                    placeholder="VD: Cu -> CuSO4 -> Cu(OH)2 -> CuO -> Cu"
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono ${inputCls}`}
                  />
                  <button
                    type="button"
                    onClick={handleSolveChain}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {vi ? 'Phân tích chuỗi' : 'Analyze'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {CHAIN_QUICK_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setChainInput(ex);
                        setChainResult(bundle.analyzeChain(bundle.index, ex));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${
                        isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-emerald-50'
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                  {bundle.chains.slice(0, 4).map((preset) => {
                    const str = preset.substances.join(' -> ');
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setChainInput(str);
                          setChainResult(bundle.analyzeChain(bundle.index, str));
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-teal-500/30 text-teal-600 hover:bg-teal-500/10 cursor-pointer"
                      >
                        {preset.substances.join(' → ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end ${mutedCardCls}`}>
                <div>
                  <label className="block text-[11px] font-bold mb-1">{vi ? 'Chất đầu' : 'Start'}</label>
                  <input
                    type="text"
                    value={findStart}
                    onChange={(e) => setFindStart(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">{vi ? 'Chất đích' : 'Target'}</label>
                  <input
                    type="text"
                    value={findEnd}
                    onChange={(e) => setFindEnd(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">{vi ? 'Số bước tối thiểu' : 'Min steps'}</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={findMinSteps}
                    onChange={(e) => setFindMinSteps(Math.max(1, Math.min(8, Number(e.target.value) || 2)))}
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${inputCls}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSolveChain}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  {vi ? 'Tìm chuỗi ngắn nhất' : 'Find Chain'}
                </button>
              </div>
            )}

            {/* Chain Result Steps */}
            {chainResult && (
              <div className="space-y-2.5">
                {chainResult.status !== 'found' && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-600 text-xs font-semibold">
                    {chainResult.error}
                  </div>
                )}

                {chainResult.status === 'found' && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold text-emerald-600">
                      {chainResult.substances?.map((s, idx) => (
                        <React.Fragment key={`${s}-${idx}`}>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15">{formatFormulaUnicode(s)}</span>
                          {idx < (chainResult.substances?.length ?? 0) - 1 && <ArrowRight className="w-3.5 h-3.5" />}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {chainResult.steps.map((step, i) => (
                        <div key={`${step.reactionId}-${i}`} className={`p-3 rounded-xl border space-y-1.5 ${mutedCardCls}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-extrabold text-emerald-600">
                              Bước {i + 1}: {formatFormulaUnicode(step.from)} → {formatFormulaUnicode(step.to)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRunChainStep(step.reactionId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" /> Thử bước này
                            </button>
                          </div>
                          <div className={`font-mono text-xs font-bold ${isDark ? 'text-sky-300' : 'text-blue-700'}`}>
                            {formatFormulaUnicode(step.equation)}
                          </div>
                          <p className="text-[11px] opacity-90">{step.explanation}</p>
                          <div className="text-[10.5px] text-amber-600 font-semibold">ĐK: {step.condition}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
