import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useQualityStore, QualityTier } from '../quality';
import { REACTION_DATABASE } from '../../chem/reactions';
import { SUBSTANCE_DATABASE } from '../../chem/substances';
import { vfxBus } from '../bus';
import { labSound } from '../../utils/audio';
import { proceduralAudio } from '../../audio/procedural';
import { LegacyAdapter } from '../../adapters/legacy';
import { formatHazardBadge } from '../../ui/overlays';
import { reactionSimulationEngine } from '../reactions/ReactionSimulationEngine';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById } from '../programs/library';
import { EFFECT_ATOM_CATALOG, getEffectAtom } from '../catalog';
import { ReactionProgram } from '../../shared/programSchema';
import { EffectAtom } from '../catalog/types';
import { useFrameStats } from '../../render/FrameTelemetry';
import { studioProgramForReaction } from '../../engine/studioProgram';
import { studioAtomAction, runStudioAtomContext } from '../../engine/studioAtom';
import { studioInventoryReading } from '../../engine/studioInventoryReading';
import { PRECIPITATE_MORPHOLOGIES } from '../../engine/studioMorphology';
import { dispensePipette } from '../../handling/instrumentOperations';
import { HotPlateControls } from '../../components/HotPlateControls';
import { LESSON_PROGRAM_IDS } from '../../lesson/programCompiler';
import { useLessonLabStore } from '../../lesson/labBridge';
import { 
  Sparkles, Play, Pause, RotateCcw, AlertTriangle, Flame, Droplets,
  Layers, Gauge, CheckCircle2, ChevronDown, ChevronUp, X, Thermometer,
  Beaker, Compass, Volume2, VolumeX, Eye, ShieldAlert, Activity,
  Wind, Zap, Info, Filter, SlidersHorizontal, Clock, Cpu
} from 'lucide-react';

type StudioTab = 'reactions' | 'programs' | 'atoms' | 'morphology' | 'physics' | 'flames' | 'telemetry';

export { PRECIPITATE_MORPHOLOGIES } from '../../engine/studioMorphology';

export const VfxGallery: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('reactions');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);

  // Reaction Programs & Effect Atoms Studio State
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [programSearch, setProgramSearch] = useState<string>('');
  const [programCategoryFilter, setProgramCategoryFilter] = useState<string>('all');
  const [atomNotice, setAtomNotice] = useState('');
  const [selectedAtomName, setSelectedAtomName] = useState<string | null>(null);
  const [atomCategoryFilter, setAtomCategoryFilter] = useState<string>('all');

  // Interactive Physics Controls State
  const [stirrerRpm, setStirrerRpm] = useState<number>(0);
  const [selectedHotPlateId, setSelectedHotPlateId] = useState('');
  const [burnerState, setBurnerState] = useState<'off' | 'blue' | 'yellow'>('off');
  const [selectedFlameElement, setSelectedFlameElement] = useState<string>('Cu');
  const [useCobaltGlass, setUseCobaltGlass] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'v1' | 'v2'>('v2');


  const {
    vessels,
    burners,
    activeKinetics,
    addVessel,
    resetWorkbench,
    isSimulationPaused,
    setSimulationPaused,
    timeScale,
    setTimeScale,
    language
  } = useAppStore(state => isVisible ? state : null) ?? useAppStore.getState();

  const { preference, setPreference, effectiveTier } = useQualityStore(state => isVisible ? state : null) ?? useQualityStore.getState();

  // Auto-detect ?vfx=1 in URL or maintain open state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('vfx') === '1' || params.get('studio') === '1') {
        setIsVisible(true);
      }
    }
  }, []);

  // Update target vessel selection
  useEffect(() => {
    const vesselIds = Object.keys(vessels);
    if (vesselIds.length > 0 && (!selectedVesselId || !vessels[selectedVesselId])) {
      setSelectedVesselId(vesselIds[0]);
    }
  }, [vessels, selectedVesselId]);

  const targetVessel = selectedVesselId && vessels[selectedVesselId] ? vessels[selectedVesselId] : Object.values(vessels)[0];

  // Helper to get or create a beaker
  const getOrCreateTargetVesselId = (): string => {
    if (targetVessel) return targetVessel.id;
    addVessel('beaker');
    const updated = Object.values(useAppStore.getState().vessels);
    return updated.length > 0 ? updated[0].id : 'beaker_1';
  };

  // Read the renderer telemetry; no second window RAF loop or assumed 60 FPS.
  const frameStats = useFrameStats(state => isVisible ? state : null) ?? useFrameStats.getState();
  const fps = frameStats.fps;

  // Seeking forward changes the quantitative ledger; it never recreates used reagent.
  const handleScrubReaction = (targetId: string, progress: number) => {
    useAppStore.getState().seekStudioProgram(targetId, progress);
  };

  // Toggle Procedural Audio Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    proceduralAudio.setMute(nextMuted);
  };

  // Switch Engine V2 vs V1
  const handleSwitchEngine = (mode: 'v1' | 'v2') => {
    setEngineMode(mode);
    LegacyAdapter.setEngineMode(mode);
  };

  // -------------------------------------------------------------
  // REACTION STUDIO PRESETS (Exact mapping to REACTION_DATABASE, 3D solids, colors & morphologies)
  // -------------------------------------------------------------
  const previewFlame = (element: string) => {
    const store = useAppStore.getState();
    const lamp = Object.values(store.burners).find(b => Number.isFinite(b.fuelLevel_ml ?? 120) && (b.fuelLevel_ml ?? 120) > 0);
    if (!lamp) {
      useAppStore.setState({ globalWarning: 'Cần đèn còn cồn để xem màu ngọn lửa.' });
      return;
    }
    if (!lamp.isOn) store.toggleBurner(lamp.id);
    store.setBurnerIntensity(lamp.id, 4);
    if (store.startFlameTest(lamp.id, element)) {
      setSelectedFlameElement(element);
      setBurnerState('blue');
    }
  };

  const executeReaction = (reactionKey: string) => {
    const element = ({ flame_cu: 'Cu', flame_na: 'Na', flame_k: 'K' } as Record<string, string>)[reactionKey];
    if (element) { previewFlame(element); return; }
    const program = studioProgramForReaction(reactionKey);
    if (!program) {
      useAppStore.setState({ mixError: 'Chưa có chương trình định lượng cho ' + reactionKey });
      return;
    }
    executeProgram(program);
  };

  // -------------------------------------------------------------
  // PHYSICAL EFFECTS STUDIO HANDLERS
  // -------------------------------------------------------------
  const handleStirChange = (rpm: number) => {
    setStirrerRpm(rpm);
    const targetId = getOrCreateTargetVesselId();
    // V2 Stirring audio & physical vortex injection
    if (rpm > 100) {
      proceduralAudio.playGlassClink(Math.min(0.8, rpm / 1500));
    }
  };

  const handleBurnerCycle = () => {
    const store = useAppStore.getState();
    const lamp = Object.values(store.burners)[0];
    if (!lamp) { useAppStore.setState({ globalWarning: 'Thêm đèn cồn trước.' }); return; }
    if (!lamp.isOn) {
      store.setBurnerIntensity(lamp.id, 4);
      store.toggleBurner(lamp.id);
    } else if (lamp.intensity >= 4) store.setBurnerIntensity(lamp.id, 2);
    else store.toggleBurner(lamp.id);
    const next = useAppStore.getState().burners[lamp.id];
    setBurnerState(next.isOn ? next.intensity >= 4 ? 'blue' : 'yellow' : 'off');
  };

  const executeProgram = (program: ReactionProgram, fresh = false) => {
    setActiveTestId(program.id);
    if (program.chemistry.representation === 'emission') {
      const element = ({ flame_cu: 'Cu', flame_na: 'Na', flame_k: 'K' } as Record<string, string>)[program.id];
      if (element) previewFlame(element);
      return;
    }
    if (LESSON_PROGRAM_IDS.has(program.id)) {
      if (useLessonLabStore.getState().start(program.id)) {
        setSelectedVesselId(useAppStore.getState().selectedVesselId);
      }
      return;
    }
    const store = useAppStore.getState();
    const current = selectedVesselId ? store.vessels[selectedVesselId] : undefined;
    const id = !fresh && current?.studioProgramId === program.id ? current.id : store.prepareStudioProgram(program.id);
    if (!id) return;
    setSelectedVesselId(id);
    store.setSelectedVesselId(id);
    store.runStudioProgram(id);
  };

  const executeAtomPreset = (atom: EffectAtom, presetIndex: number) => {
    setSelectedAtomName(atom.name);
    const result = runStudioAtomContext(atom, presetIndex, targetVessel?.id);
    setAtomNotice(result.message);
    if (result.vesselId) setSelectedVesselId(result.vesselId);
    if (result.action.kind === 'ice_water') { setActiveTestId(null); setSelectedProgramId(null); }
    if (result.action.kind === 'program') {
      setSelectedProgramId(result.action.programId);
      setActiveTestId(result.action.programId);
    }
    if (result.action.kind === 'heating') setActiveTab('physics');
  };

  const handleAddDropperDrop = () => {
    const targetId = getOrCreateTargetVesselId();
    const result = dispensePipette(0.05, targetId);
    if (!result.ok) {
      useAppStore.setState({ globalWarning: result.message });
      return;
    }
    useAppStore.setState({ globalWarning: null });
    proceduralAudio.playBubblePop(0.002, 0.7);
    labSound.playDrop();
  };

  const handleFlameTest = () => previewFlame(selectedFlameElement);

  // Reaction Categories
  const categories = [
    {
      title: 'Precipitation & Crystals',
      title_vi: 'Kết tủa & Tinh thể',
      icon: <Droplets size={13} className="text-cyan-400" />,
      items: [
        { id: 'AgNO3+NaCl', name: 'AgCl Curdy White Precipitation', name_vi: 'Kết tủa AgCl trắng vón' },
        { id: 'golden_rain_pbi2', name: 'PbI2 Golden Rain Glittering Plates', name_vi: 'Mưa vàng PbI2 tinh thể lấp lánh' },
        { id: 'BaCl2+Na2SO4', name: 'BaSO4 Milky Suspension', name_vi: 'Bari Sunfat huyền phù trắng sữa' },
        { id: 'cuso4_naoh_precipitate', name: 'Cu(OH)2 Gelatinous Azure Blue', name_vi: 'Đồng(II) hiđroxit gel xanh lam' },
        { id: 'fecl3_naoh_precipitate', name: 'Fe(OH)3 Rust-Brown Flocculation', name_vi: 'Kết tủa Fe(OH)3 nâu đỏ bông keo' },
        { id: 'cacl2_na2co3_precipitate', name: 'CaCO3 Chalky Calcite Grains', name_vi: 'Kết tủa CaCO3 trắng phấn' },
        { id: 'cuso4_nh3_complex', name: 'Tetraamminecopper(II) Deep Blue', name_vi: 'Phức chất đồng tetramin xanh thẫm' },
        { id: 'al_naoh', name: 'Al(OH)3 Gel -> Clear Aluminate Amphoteric', name_vi: 'Al(OH)3 lưỡng tính tan trong kiềm' },
        { id: 'na2s2o3_hcl_turbidity', name: 'Colloidal Sulfur Disappearing Cross', name_vi: 'Lưu huỳnh keo đục dần' }
      ]
    },
    {
      title: 'Gas Evolution & Effervescence',
      title_vi: 'Sủi bọt khí & Khói',
      icon: <Wind size={13} className="text-amber-400" />,
      items: [
        { id: 'caco3_hcl_gas', name: 'CaCO3 + HCl Dense CO2 Effervescence', name_vi: 'Đá vôi sủi bọt khí CO2 đậm đặc' },
        { id: 'zn_hcl_gas', name: 'Zn + HCl Hydrogen Microbubbles', name_vi: 'Kẽm sủi bọt khí Hydro' },
        { id: 'mg_hcl_gas', name: 'Mg + HCl Violent Hydrogen Fizz', name_vi: 'Magie phản ứng axit tỏa nhiệt' },
        { id: 'h2o2_mno2_decomposition', name: 'H2O2 + MnO2 Catalytic Oxygen', name_vi: 'Xúc tác MnO2 phân hủy H2O2' },
        { id: 'nh3_hcl_fumes', name: 'NH3 + HCl Dense White Smoke Aerosol', name_vi: 'Khói trắng NH4Cl cuồn cuộn' },
        { id: 'na2co3_hcl_gas', name: 'Na2CO3 + HCl Rapid Acid Effervescence', name_vi: 'Na2CO3 sủi bọt khí CO2 tức thì' },
        { id: 'cu_hno3_conc', name: 'Cu + HNO3 Dense Brown NO2 Fumes', name_vi: 'Đồng tan trong HNO3 bốc khói nâu đỏ NO2' },
        { id: 'cu_conc_h2so4_heated', name: 'Hot Cu + H2SO4 Choking Gas', name_vi: 'Đồng tác dụng H2SO4 đặc nóng' }
      ]
    },
    {
      title: 'Acid-Base & Neutralization',
      title_vi: 'Axit - Bazo & Chỉ thị',
      icon: <Activity size={13} className="text-pink-400" />,
      items: [
        { id: 'hcl_naoh_neutralization', name: 'HCl + NaOH (Phenolphthalein Pink)', name_vi: 'HCl + NaOH chuẩn độ hồng' },
        { id: 'h2so4_naoh_neutralization', name: 'H2SO4 + NaOH Exothermic Neutralization', name_vi: 'H2SO4 + NaOH trung hòa tỏa nhiệt' },
        { id: 'k2cr2o7_naoh_equilibrium', name: 'Dichromate (Orange) -> Chromate (Yellow)', name_vi: 'Cân bằng đicromat cam sang cromat vàng' }
      ]
    },
    {
      title: 'Redox & Clocks',
      title_vi: 'Oxi hóa - Khử & Đồng hồ',
      icon: <Zap size={13} className="text-purple-400" />,
      items: [
        { id: 'fe_cuso4_displacement', name: 'Fe + CuSO4 Red Copper Displacement', name_vi: 'Sắt đẩy đồng bám kim loại đỏ' },
        { id: 'fecl3_kscn_complex', name: 'Fe(SCN)3 Blood Red Complex', name_vi: 'Phức chất Fe(SCN)3 đỏ máu' },
        { id: 'kmno4_oxalic_redox', name: 'KMnO4 Decolorization Autocatalysis', name_vi: 'Mất màu thuốc tím tự xúc tác' },
        { id: 'iodine_clock', name: 'Iodine Clock Sudden Midnight Blue', name_vi: 'Đồng hồ Iot xanh đen đột ngột' }
      ]
    },
    {
      title: 'Thermal & Phase Change',
      title_vi: 'Nhiệt & Chuyển pha',
      icon: <Thermometer size={13} className="text-rose-400" />,
      items: [
        { id: 'cuoh2_thermal_decomposition', name: 'Cu(OH)2 Blue -> Black CuO Thermal', name_vi: 'Cu(OH)2 xanh phân hủy thành CuO đen' },
        { id: 'iodine_sublimation', name: 'Iodine Sublimation Rich Purple Gas', name_vi: 'Thăng hoa Iot hơi tím biếc' },
        { id: 'water_into_conc_h2so4_explosion', name: 'Concentrated Acid Dilution', name_vi: 'Pha loãng axit đặc tỏa nhiệt' }
      ]
    },
    {
      title: 'Violent & Pyrotechnics',
      title_vi: 'Nhiệt nhôm & Pháo sáng',
      icon: <Flame size={13} className="text-red-500" />,
      items: [
        { id: 'sodium_water_reaction', name: 'Sodium Metal Skating Water Dart', name_vi: 'Natri chạy trên nước nổ tanh tách' },
        { id: 'burn_magnesium', name: 'Magnesium White Combustion', name_vi: 'Đốt dây Magie lóa mắt khói trắng' },
        { id: 'flame_cu', name: 'Copper Blue-Green Flame Emission', name_vi: 'Ngọn lửa Đồng xanh lam - lục' },
        { id: 'flame_na', name: 'Sodium Golden Yellow Flame Emission (589 nm)', name_vi: 'Ngọn lửa Natri vàng rực' },
        { id: 'flame_k', name: 'Potassium Lilac Flame Emission', name_vi: 'Ngọn lửa Kali tím nhạt' }
      ]
    }
  ];

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 px-3.5 py-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-2xl border border-indigo-500/40 text-xs font-bold flex items-center gap-2 hover:border-indigo-400 hover:shadow-indigo-500/20 transition-all backdrop-blur-md group"
        title="Open VFX Studio (?vfx=1)"
      >
        <Sparkles size={15} className="text-amber-400 group-hover:rotate-12 transition-transform" />
        <span className="bg-gradient-to-r from-amber-200 to-blue-200 bg-clip-text text-transparent">VFX STUDIO</span>
        <span className="text-[10px] px-1 py-0.2 bg-indigo-500/30 text-indigo-300 rounded font-mono">v2.0 PBR</span>
      </button>
    );
  }

  const inventoryReading = studioInventoryReading(targetVessel);
  const currentActiveKinetics = targetVessel ? activeKinetics[targetVessel.id] : undefined;
  const vesselHazards = (targetVessel?.contents || []).flatMap(c => SUBSTANCE_DATABASE[c.formula]?.hazards || []);
  const hazard = vesselHazards.length > 0 
    ? formatHazardBadge(vesselHazards) 
    : (activeTestId && REACTION_DATABASE[activeTestId]?.hazards ? formatHazardBadge(REACTION_DATABASE[activeTestId].hazards) : null);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-h-[88vh] bg-slate-950/95 text-slate-200 rounded-2xl shadow-2xl border border-slate-800 flex flex-col backdrop-blur-xl overflow-hidden transition-all text-xs font-sans ring-1 ring-white/10">
      
      {/* 1. Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40">
            <Sparkles size={16} className="text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-slate-100 text-xs uppercase bg-gradient-to-r from-amber-200 via-white to-blue-200 bg-clip-text text-transparent">
                VFX STUDIO
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PBR v2.0
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {frameStats.samples > 0 ? fps : '—'} FPS
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Emergent Physics Simulation Harness</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Procedural Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-800"
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-800"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* 2. Global Top Control Strip */}
          <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 space-y-2.5">
            {/* Simulation Clock & Quality Settings */}
            <div className="flex items-center justify-between gap-2">
              {/* Play / Pause / Reset */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSimulationPaused(!isSimulationPaused)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-[11px] transition-all shadow-sm ${
                    isSimulationPaused
                      ? 'bg-amber-600 text-white hover:bg-amber-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isSimulationPaused ? <Play size={12} /> : <Pause size={12} />}
                  <span>{isSimulationPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={() => {
                    resetWorkbench();
                    setActiveTestId(null);
                    setBurnerState('off');
                    setStirrerRpm(0);
                  }}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 transition-colors"
                  title="Reset Workbench"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Time Scales */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                {[0.25, 0.5, 1, 2, 4].map(scale => (
                  <button
                    key={scale}
                    onClick={() => setTimeScale(scale)}
                    className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold transition-all ${
                      timeScale === scale
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {scale}x
                  </button>
                ))}
              </div>

              {/* Engine Toggle */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => handleSwitchEngine('v2')}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                    engineMode === 'v2' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  v2 (PBR)
                </button>
                <button
                  onClick={() => handleSwitchEngine('v1')}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                    engineMode === 'v1' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  v1 (Leg)
                </button>
              </div>
            </div>

            {/* Quality Tier Selector */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Layers size={12} className="text-indigo-400" />
                Render Tier:
              </span>
              <div className="flex items-center gap-1">
                {(['low', 'medium', 'high', 'auto'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setPreference(t)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                      preference === t
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t === 'auto' ? `Auto (${effectiveTier[0].toUpperCase()})` : t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {targetVessel?.studioProgramId && <div className="mx-3 my-2 rounded border border-indigo-700 bg-indigo-950/50 p-2 space-y-2 text-[10px]">
            <p>Mẫu định lượng mô phỏng riêng; không phải quy trình định lượng thực hành. Giữ nguyên mẫu trước đó. Tua tiến không thu hồi khí đã thoát.</p>
            {getProgramById(targetVessel.studioProgramId)?.chemistry.conditions?.activationNote_vi && <p>{getProgramById(targetVessel.studioProgramId)?.chemistry.conditions?.activationNote_vi}</p>}
            {getProgramById(targetVessel.studioProgramId)?.chemistry.conditions?.activation === 'ignition' &&
              <button className="rounded bg-orange-800 px-2 py-1" onClick={() => useAppStore.getState().igniteStudioSample(targetVessel.id)}>Mồi cháy mẫu bằng nguồn nhiệt gần</button>}
            <div className="flex gap-2">
              <button className="rounded bg-indigo-700 px-2 py-1" onClick={() => useAppStore.getState().runStudioProgram(targetVessel.id)}>Kiểm tra điều kiện / Chạy mẫu</button>
              <button className="rounded bg-slate-700 px-2 py-1" onClick={() => {
                const program = getProgramById(targetVessel.studioProgramId!);
                if (program) executeProgram(program, true);
              }}>Tạo mẫu mới</button>
            </div>
          </div>}
          {/* 3. Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/40 text-[11px] font-bold select-none overflow-x-auto">
            <button
              onClick={() => setActiveTab('reactions')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 ${
                activeTab === 'reactions'
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Beaker size={13} />
              <span>Legacy</span>
            </button>

            <button
              onClick={() => setActiveTab('programs')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 ${
                activeTab === 'programs'
                  ? 'border-blue-500 text-blue-300 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>Programs ({ALL_HANDCRAFTED_PROGRAMS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('atoms')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 ${
                activeTab === 'atoms'
                  ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu size={13} />
              <span>Atoms ({EFFECT_ATOM_CATALOG.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('morphology')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 ${
                activeTab === 'morphology'
                  ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={13} />
              <span>Morphology</span>
            </button>

            <button
              onClick={() => setActiveTab('physics')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 ${
                activeTab === 'physics'
                  ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity size={13} />
              <span>Physics</span>
            </button>

            <button
              onClick={() => setActiveTab('flames')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 ${
                activeTab === 'flames'
                  ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame size={13} />
              <span>Flames</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 ${
                activeTab === 'telemetry'
                  ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge size={13} />
              <span>Telemetry</span>
            </button>
          </div>

          {/* 4. Tab Content Area */}
          <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 max-h-[calc(88vh-165px)]">

            {/* TAB 1: REACTIONS CATALOG */}
            {activeTab === 'reactions' && (
              <div className="space-y-3">
                {/* Interactive Timeline Scrubber (0% to 100%) */}
                {currentActiveKinetics && (
                  <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-slate-900/90 p-3 rounded-xl border border-indigo-500/40 space-y-2 shadow-xl">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-blue-200 truncate max-w-[220px]">
                        {currentActiveKinetics.reactionName}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-blue-300 font-bold">
                        <span className="text-[11px] text-amber-300">
                          {Math.round(currentActiveKinetics.progress * 100)}%
                        </span>
                        <span className="text-[9px] text-slate-400">
                          ({(currentActiveKinetics.progress * (currentActiveKinetics.duration || 5.0)).toFixed(1)}s / {(currentActiveKinetics.duration || 5.0).toFixed(1)}s)
                        </span>
                      </div>
                    </div>

                    {/* Timeline Slider Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.005"
                        value={currentActiveKinetics.progress}
                        onChange={(e) => handleScrubReaction(currentActiveKinetics.vesselId, parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none"
                      />
                    </div>

                    {/* Scrubbing Quick Controls */}
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <button
                        onClick={() => { if (currentActiveKinetics.program) executeProgram(currentActiveKinetics.program, true); }}
                        className="hover:text-indigo-300 px-1.5 py-0.5 rounded bg-slate-800/80 transition-colors"
                      >
                        Mẫu mới
                      </button>
                      <div className="flex items-center gap-1">

                        <button
                          onClick={() => setSimulationPaused(!isSimulationPaused)}
                          className="hover:text-white px-2 py-0.5 rounded bg-indigo-600/60 text-indigo-200 font-bold transition-colors"
                        >
                          {isSimulationPaused ? 'Play' : 'Pause'}
                        </button>
                        <button
                          onClick={() => handleScrubReaction(currentActiveKinetics.vesselId, Math.min(1.0, currentActiveKinetics.progress + 0.1))}
                          className="hover:text-indigo-300 px-1.5 py-0.5 rounded bg-slate-800/80 font-bold transition-colors"
                        >
                          +10%
                        </button>
                      </div>
                      <button
                        onClick={() => handleScrubReaction(currentActiveKinetics.vesselId, 1.0)}
                        className="hover:text-indigo-300 px-1.5 py-0.5 rounded bg-slate-800/80 transition-colors"
                      >
                        100%
                      </button>
                    </div>

                    <div className="text-[9px] font-mono text-slate-400 truncate border-t border-slate-800/60 pt-1">
                      {currentActiveKinetics.equation}
                    </div>
                  </div>
                )}

                {/* Category Pills */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedCategory(idx)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                        selectedCategory === idx
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.icon}
                      <span>{language === 'vi' ? cat.title_vi : cat.title}</span>
                    </button>
                  ))}
                </div>

                {/* Reaction List for Active Category */}
                <div className="space-y-1.5">
                  {categories[selectedCategory].items.map(item => {
                    const isCurrent = activeTestId === item.id;
                    const program = studioProgramForReaction(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                          isCurrent
                            ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-semibold text-[11px] text-slate-100">
                            {language === 'vi' ? item.name_vi : item.name}
                          </div>
                          <button
                            onClick={() => executeReaction(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow transition-colors shrink-0"
                          >
                            Execute
                          </button>
                        </div>

                        {program && (
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                            <span className="truncate max-w-[240px] text-indigo-300">{program.chemistry.equation}</span>
                            <span className={(program.chemistry.deltaH_kJ_per_mol ?? 0) < 0 ? 'text-amber-400 font-bold' : 'text-cyan-400'}>
                              {program.chemistry.deltaH_kJ_per_mol != null ? 'ΔH: ' + program.chemistry.deltaH_kJ_per_mol + ' kJ/mol' : 'ΔH: —'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: REACTION PROGRAMS MASTER LIBRARY (106 PROGRAMS) */}
            {activeTab === 'programs' && (
              <div className="space-y-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} className="text-blue-400" />
                      Reaction Programs Master Catalog ({ALL_HANDCRAFTED_PROGRAMS.length} Balanced Programs)
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                      Declarative JSON / Zod
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Closed Effect-Atom compositions with stoichiometric elemental balance, deltaH enthalpy, GHS hazard tagging, and physical time honesty.
                  </p>

                  {/* Filter and Search Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Search equation, ID, formula..."
                      value={programSearch}
                      onChange={(e) => setProgramSearch(e.target.value)}
                      className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={programCategoryFilter}
                      onChange={(e) => setProgramCategoryFilter(e.target.value)}
                      className="bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">All Categories</option>
                      <option value="acid">Acid-Base</option>
                      <option value="precip">Precipitation</option>
                      <option value="gas">Gas Evolution</option>
                      <option value="redox">Redox & Displacement</option>
                      <option value="complex">Complexation</option>
                      <option value="pyro">Pyrotechnics & Fire</option>
                      <option value="decomp">Decomposition & Safety</option>
                      <option value="coord">Coordination</option>
                      <option value="analysis">Inorganic Analysis</option>
                      <option value="titration">Redox Titration</option>
                    </select>
                  </div>
                </div>

                {/* Scrubber for current kinetics if active */}
                {currentActiveKinetics && (
                  <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-slate-900/90 p-3 rounded-xl border border-blue-500/40 space-y-2 shadow-xl">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-blue-200 truncate max-w-[220px]">
                        Active: {currentActiveKinetics.reactionName}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-blue-300 font-bold">
                        <span className="text-[11px] text-amber-300">
                          {Math.round(currentActiveKinetics.progress * 100)}%
                        </span>
                        <span className="text-[9px] text-slate-400">
                          ({(currentActiveKinetics.progress * (currentActiveKinetics.duration || 5.0)).toFixed(1)}s / {(currentActiveKinetics.duration || 5.0).toFixed(1)}s)
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.005"
                      value={currentActiveKinetics.progress}
                      onChange={(e) => handleScrubReaction(currentActiveKinetics.vesselId, parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400 focus:outline-none"
                    />
                  </div>
                )}

                {/* Programs List */}
                <div className="grid grid-cols-1 gap-2">
                  {ALL_HANDCRAFTED_PROGRAMS
                    .filter((p) => {
                      const matchesSearch = !programSearch || 
                        p.id.toLowerCase().includes(programSearch.toLowerCase()) ||
                        p.chemistry.equation.toLowerCase().includes(programSearch.toLowerCase()) ||
                        p.explain.observation_en.toLowerCase().includes(programSearch.toLowerCase()) ||
                        p.explain.observation_vi.toLowerCase().includes(programSearch.toLowerCase());
                      const matchesCategory = programCategoryFilter === 'all' ||
                        (programCategoryFilter === 'acid' && (p.id.includes('acid') || p.id.includes('neutralization') || p.id.includes('hcl') || p.id.includes('h2so4'))) ||
                        (programCategoryFilter === 'precip' && (p.id.includes('precip') || p.chemistry.species.some(s => s.role === 'product' && s.phase === 's'))) ||
                        (programCategoryFilter === 'gas' && (p.id.includes('gas') || p.chemistry.species.some(s => s.role === 'product' && s.phase === 'g'))) ||
                        (programCategoryFilter === 'redox' && (p.id.includes('redox') || p.id.includes('displacement'))) ||
                        (programCategoryFilter === 'complex' && p.id.includes('complex')) ||
                        (programCategoryFilter === 'pyro' && (p.id.includes('burn') || p.id.includes('fire') || p.id.includes('pyro') || p.id.includes('flare') || p.id.includes('thermite'))) ||
                        (programCategoryFilter === 'decomp' && p.id.includes('decomp')) ||
                        (programCategoryFilter === 'coord' && p.id.includes('coord')) ||
                        (programCategoryFilter === 'analysis' && p.id.includes('analysis')) ||
                        (programCategoryFilter === 'titration' && p.id.includes('titration'));
                      return matchesSearch && matchesCategory;
                    })
                    .map((prog) => {
                      const isSelected = selectedProgramId === prog.id;
                      const isRunning = activeTestId === prog.id;
                      const hasGas = prog.chemistry.species.some(s => s.role === 'product' && s.phase === 'g');
                      const hasPrecip = prog.chemistry.species.some(s => s.role === 'product' && s.phase === 's');

                      return (
                        <div
                          key={prog.id}
                          className={`bg-slate-900/50 border p-3 rounded-xl space-y-2 transition-all ${
                            isRunning
                              ? 'border-blue-500 bg-blue-950/20 shadow-md ring-1 ring-blue-500/40'
                              : isSelected
                              ? 'border-slate-700 bg-slate-900/80'
                              : 'border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => setSelectedProgramId(isSelected ? null : prog.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                  {prog.id}
                                </span>
                                {hasPrecip && (
                                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-semibold">
                                    Precipitate
                                  </span>
                                )}
                                {hasGas && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                                    Gas
                                  </span>
                                )}
                                {prog.visual.timeWarp && (
                                  <span className="text-[9px] bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded font-semibold">
                                    time-lapse
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-100 mt-1 font-mono">
                                {prog.chemistry.equation}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {language === 'vi' ? prog.explain.observation_vi : prog.explain.observation_en}
                              </p>
                            </div>

                            <button
                              onClick={() => executeProgram(prog)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-xs shrink-0"
                            >
                              <Play size={10} />
                              <span>Run Program</span>
                            </button>
                          </div>

                          {/* Expanded Program Deep Inspector */}
                          {isSelected && (
                            <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[10px]">
                              {/* Kinetics & Energy */}
                              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-lg font-mono">
                                <div>
                                  <span className="text-slate-500">Model: </span>
                                  <span className="text-indigo-300">{prog.chemistry.kinetics.model}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Duration: </span>
                                  <span className="text-amber-300">{prog.visual.duration_s}s</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">ΔH theo phương trình: </span>
                                  <span className={prog.chemistry.deltaH_kJ_per_mol && prog.chemistry.deltaH_kJ_per_mol < 0 ? 'text-rose-400' : 'text-cyan-400'}>
                                    {prog.chemistry.deltaH_kJ_per_mol == null ? 'Chưa có dữ liệu' : `${prog.chemistry.deltaH_kJ_per_mol} kJ/mol phản ứng`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Điểm metadata: </span>
                                  <span className="text-emerald-400">{(prog.confidence * 100).toFixed(0)}% · chưa hiệu chuẩn</span>
                                </div>
                              </div>

                              {/* Timeline Atoms */}
                              {prog.chemistry.deltaHNote_vi && <p className="text-[10px] text-slate-400">{prog.chemistry.deltaHNote_vi}</p>}
                              <div>
                                <span className="font-bold text-slate-300 block mb-1">Effect Atoms Timeline:</span>
                                <div className="space-y-1">
                                  {prog.visual.timeline.map((atomInst, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-950/40 px-2 py-1 rounded text-[9px] font-mono">
                                      <span className="text-cyan-400 font-bold">{atomInst.atom}</span>
                                      <span className="text-slate-400">anchor: {atomInst.anchor}</span>
                                      <span className="text-amber-300">[{atomInst.window[0] * 100}% - {atomInst.window[1] * 100}%]</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Chemical Mechanism */}
                              <div className="bg-slate-950/40 p-2 rounded text-[10px] text-slate-300">
                                <span className="font-bold text-slate-400 block mb-0.5">Mechanism:</span>
                                {language === 'vi' ? prog.explain.why_vi : prog.explain.why_en}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: EFFECT ATOM MASTER CATALOG (32 ATOMS) */}
            {activeTab === 'atoms' && (
              <div className="space-y-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <Cpu size={14} className="text-cyan-400" />
                      Danh mục hiệu ứng ({EFFECT_ATOM_CATALOG.length} mục)
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
                      Bối cảnh và điều kiện
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Mở mẫu phản ứng liên quan hoặc thao tác vật lý được hỗ trợ. Thông số tham khảo không tự thêm vật chất vào mẫu; hiệu ứng chưa có mô hình phù hợp sẽ mở phần giới hạn.
                  </p>

                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {['all', 'liquidOptics', 'gas', 'solidPhase', 'thermal', 'interface', 'combustion', 'wall', 'audio', 'camera'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setAtomCategoryFilter(cat)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                          atomCategoryFilter === cat
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {atomNotice && <p role="status" className="rounded border border-cyan-800 p-2 text-[11px] text-cyan-200">{atomNotice}</p>}
                {/* Atoms List */}
                <div className="grid grid-cols-1 gap-2">
                  {EFFECT_ATOM_CATALOG
                    .filter((atom) => atomCategoryFilter === 'all' || atom.category === atomCategoryFilter)
                    .map((atom) => {
                      const isSelected = selectedAtomName === atom.name;

                      return (
                        <div
                          key={atom.name}
                          className={`bg-slate-900/50 border p-3 rounded-xl space-y-2 transition-all ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-950/20 shadow-md'
                              : 'border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => setSelectedAtomName(isSelected ? null : atom.name)}
                            >
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-100 font-mono text-cyan-300">
                                  {atom.name}
                                </h4>
                                <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                  {atom.category}
                                </span>
                                <span className="text-[9px] bg-slate-800/80 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                                  cost: {atom.budget.shaderCost}/3
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {atom.summary_en}
                              </p>
                            </div>

                            <button
                              onClick={() => executeAtomPreset(atom, 0)}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-xs shrink-0"
                            >
                              <Play size={10} />
                              <span>{studioAtomAction(atom, 0).label}</span>
                            </button>
                          </div>

                          {/* Expanded Atom Details */}
                          {isSelected && (
                            <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[10px]">
                              {/* Use When / Avoid When */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-emerald-950/30 border border-emerald-800/40 p-2 rounded text-emerald-300">
                                  <span className="font-bold block text-emerald-400 mb-0.5">Use When:</span>
                                  {atom.useWhen.join('; ')}
                                </div>
                                <div className="bg-rose-950/30 border border-rose-800/40 p-2 rounded text-rose-300">
                                  <span className="font-bold block text-rose-400 mb-0.5">Avoid When:</span>
                                  {atom.avoidWhen.join('; ')}
                                </div>
                              </div>

                              {/* Allowed Anchors */}
                              <div className="bg-slate-950/60 p-2 rounded font-mono text-[9px] text-slate-400">
                                <span className="font-bold text-slate-300">Allowed Anchors: </span>
                                {atom.anchorsAllowed.join(', ')}
                              </div>

                              {/* Parameter Specs */}
                              <div>
                                <span className="font-bold text-slate-300 block mb-1">Parameters Schema:</span>
                                <div className="space-y-1">
                                  {Object.entries(atom.params).map(([paramName, spec]: [string, any]) => (
                                    <div key={paramName} className="flex items-center justify-between bg-slate-950/40 px-2 py-1 rounded text-[9px] font-mono">
                                      <span className="text-indigo-300 font-bold">{paramName}</span>
                                      <span className="text-slate-500">type: {spec.type}</span>
                                      <span className="text-amber-400">default: {JSON.stringify(spec.default)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Presets Gallery */}
                              {atom.gallery && atom.gallery.length > 0 && (
                                <div>
                                  <span className="font-bold text-slate-300 block mb-1">Gallery Presets ({atom.gallery.length}):</span>
                                  <div className="space-y-1.5">
                                    {atom.gallery.map((preset, pIdx) => (
                                      <div key={pIdx} className="flex items-center justify-between bg-slate-950/60 p-2 rounded">
                                        <div>
                                          <span className="font-bold text-slate-200 block">{preset.title}</span>
                                          <span className="text-[9px] text-slate-400">{preset.description}</span>
                                        </div>
                                        <button
                                          onClick={() => executeAtomPreset(atom, pIdx)}
                                          className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded text-[9px] font-bold transition-colors"
                                        >
                                          {studioAtomAction(atom, pIdx).label}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB: PRECIPITATE MORPHOLOGY INSPECTOR */}
            {activeTab === 'morphology' && (
              <div className="space-y-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-violet-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} />
                      8 mẫu hình thái chất rắn
                    </span>
                    <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-mono">
                      Hình thái minh họa
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Tạo mẫu riêng có kho chất định lượng. Bảy mẫu chạy phản ứng tạo chất rắn; thạch cao là mẫu có sẵn. Hình dạng hạt chưa được hiệu chuẩn thực nghiệm.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {PRECIPITATE_MORPHOLOGIES.map((morph) => (
                    <div
                      key={morph.type}
                      className="bg-slate-900/40 border border-slate-800 hover:border-violet-500/50 p-3 rounded-xl space-y-2 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs shrink-0" 
                              style={{ backgroundColor: morph.color }} 
                            />
                            <h4 className="text-xs font-bold text-slate-200 group-hover:text-violet-300 transition-colors">
                              {morph.name}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-violet-400/90 ml-5">
                            {morph.example}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            const store = useAppStore.getState();
                            const id = store.prepareStudioMorphology(morph.type);
                            if (!id) return;
                            setSelectedVesselId(id);
                            setActiveTestId(morph.programId);
                            if (morph.programId) store.runStudioProgram(id);
                          }}
                          className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <Play size={10} />
                          <span>{morph.programId ? 'Tạo mẫu và chạy' : 'Tạo mẫu có sẵn'}</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {morph.description}
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 bg-slate-950/40 px-2 py-1 rounded">
                        <span>{morph.settling}</span>
                        <span>{morph.programId ? 'Lượng từ phản ứng' : 'Mẫu ảo định lượng'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resuspension Action */}
                <button
                  onClick={() => {
                    const targetId = getOrCreateTargetVesselId();
                    useAppStore.getState().stirVessel(targetId);
                    labSound.playStir();
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw size={13} />
                  <span>Agitate Liquid & Resuspend Precipitates</span>
                </button>
              </div>
            )}

            {/* TAB 2: PHYSICAL LAB CONTROLS */}
            {activeTab === 'physics' && (
              <div className="space-y-3.5">
                {/* Laboratory Heating Controls */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Flame size={14} />
                      Heating Equipment
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Target: {targetVessel ? targetVessel.name : 'Beaker'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Burner Toggle */}
                    <button
                      onClick={handleBurnerCycle}
                      className={`p-2 rounded-lg border font-bold text-left flex flex-col justify-between transition-all ${
                        burnerState === 'blue'
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                          : (burnerState === 'yellow' ? 'bg-amber-600/30 border-amber-500 text-amber-200' : 'bg-slate-800/60 border-slate-700 text-slate-400')
                      }`}
                    >
                      <span className="text-[9px] uppercase font-mono">Đèn cồn</span>
                      <span className="text-[11px]">
                        {burnerState === 'blue' ? 'Mức bấc 4' : (burnerState === 'yellow' ? 'Mức bấc 2' : 'Đã tắt')}
                      </span>
                    </button>

                  </div>
                  {Object.values(vessels).some(v => v.type === 'hot_plate') ? <>
                    <select className="w-full rounded bg-slate-800 p-1 text-xs" value={selectedHotPlateId || Object.values(vessels).find(v => v.type === 'hot_plate')!.id}
                      onChange={event => setSelectedHotPlateId(event.target.value)}>
                      {Object.values(vessels).filter(v => v.type === 'hot_plate').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <HotPlateControls plateId={vessels[selectedHotPlateId]?.type === 'hot_plate' ? selectedHotPlateId : Object.values(vessels).find(v => v.type === 'hot_plate')!.id} targetId={targetVessel?.id} />
                  </> : <button className="rounded border px-3 py-1 text-xs" onClick={() => addVessel('hot_plate')}>Thêm bếp gia nhiệt</button>}

                  <p className="text-[10px] text-slate-400">{targetVessel?.isBoiling ? 'Mẫu đang hóa hơi theo ngân sách nhiệt.' : 'Mẫu chưa sôi.'} Hết nước thì dừng sinh hơi nước. Chưa mô phỏng động học sôi vọt và đá bọt.</p>
                </div>

                {/* Stirring & Fluid Vortex Studio */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Compass size={14} />
                      Stirrer & Fluid Vortex
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300">{stirrerRpm} RPM</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1200}
                    step={50}
                    value={stirrerRpm}
                    onChange={(e) => handleStirChange(Number(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>Rankine Dip: {stirrerRpm > 0 ? `${(Math.pow(stirrerRpm / 300, 2) * 2.2).toFixed(1)} mm` : '0 mm'}</span>
                    <span>Shear: {stirrerRpm > 0 ? `${(stirrerRpm * 0.005).toFixed(2)} Pa` : '0 Pa'}</span>
                  </div>
                </div>

                {/* Dropper & Hydraulics */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 text-blue-400">
                    <Droplets size={14} />
                    <span>Hydraulic Inflow & Droppers</span>
                  </div>

                  <p className="text-[10px] text-slate-400">Hút mẫu bằng công cụ pipet trước. 0,05 mL là liều chọn trong mô phỏng; thể tích giọt thật phụ thuộc đầu nhỏ giọt và chất lỏng.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleAddDropperDrop}
                      className="py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Droplets size={13} />
                      <span>Nhả 0,05 mL từ pipet</span>
                    </button>

                    <button
                      onClick={() => {
                        proceduralAudio.updatePouringState(true, 0.08);
                        setTimeout(() => proceduralAudio.updatePouringState(false, 0.08), 2000);
                        labSound.playPour(2.0);
                      }}
                      className="py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Wind size={13} />
                      <span>Weir Pour Stream</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FLAME & PYROTECHNICS */}
            {activeTab === 'flames' && (
              <div className="space-y-3.5">
                {/* Wire Loop Flame Test */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Flame size={14} />
                      Flame Color Reference Preview
                    </span>
                    <button
                      onClick={() => setUseCobaltGlass(!useCobaltGlass)}
                      className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border transition-colors flex items-center gap-1 ${
                        useCobaltGlass
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Filter size={10} />
                      <span>Cobalt Glass Notes: {useCobaltGlass ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {useCobaltGlass && <p className="text-[10px] text-slate-300">Kính coban lọc ánh sáng tới mắt, làm giảm màu vàng của Na; không làm đổi ngọn lửa. Mục này giải thích kính lọc, chưa mô phỏng phổ truyền qua kính.</p>}
                {/* Element Selector */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { sym: 'Cu', name: 'Copper (Blue-green)', color: '#10b981' },
                      { sym: 'Na', name: 'Sodium (Yellow)', color: '#f59e0b' },
                      { sym: 'K',  name: 'Potassium (Lilac)', color: '#c084fc' },
                      { sym: 'Li', name: 'Lithium (Crimson)', color: '#ef4444' },
                      { sym: 'Ca', name: 'Calcium (Orange-red)', color: '#ea580c' },
                      { sym: 'Ba', name: 'Barium (Green)', color: '#84cc16' }
                    ].map(el => (
                      <button
                        key={el.sym}
                        onClick={() => setSelectedFlameElement(el.sym)}
                        className={`p-2 rounded-lg border font-bold text-left transition-all ${
                          selectedFlameElement === el.sym
                            ? 'bg-slate-800 border-amber-400 text-white shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono">{el.sym}</span>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: el.color }} />
                        </div>
                        <div className="text-[9px] text-slate-400 truncate mt-0.5">{el.name.split(' ')[0]}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleFlameTest}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-[11px] shadow transition-all flex items-center justify-center gap-1.5"
                  >
                    <Flame size={14} />
                    <span>Preview Reference Color (7.5 s)</span>
                  </button>
                </div>

                {/* Pyrotechnics Demonstrations */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 text-red-400">
                    <Zap size={14} />
                    <span>Metal Pyrotechnics & Alkali</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => executeReaction('burn_magnesium')}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-left flex flex-col justify-between transition-colors"
                    >
                      <span className="font-bold text-[10px] text-white">Magnesium Ribbon</span>
                      <span className="text-[9px] text-slate-400">3100 K Blinding White</span>
                    </button>

                    <button
                      onClick={() => executeReaction('sodium_water_reaction')}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-left flex flex-col justify-between transition-colors"
                    >
                      <span className="font-bold text-[10px] text-amber-300">Sodium in Water</span>
                      <span className="text-[9px] text-slate-400">H2 Jet Skater & Pop</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LIVE TELEMETRY & CONSERVATION */}
            {activeTab === 'telemetry' && (
              <div className="space-y-3.5">
                {/* Vessel Target Selector */}
                <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Beaker size={14} className="text-indigo-400" />
                    Target Vessel:
                  </span>
                  <select
                    value={selectedVesselId || ''}
                    onChange={(e) => setSelectedVesselId(e.target.value)}
                    className="bg-slate-800 text-white rounded-lg px-2 py-1 text-[11px] border border-slate-700 font-mono"
                  >
                    {Object.values(vessels).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name || v.id} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reaction Dynamics Live HUD */}
                {(() => {
                  const targetId = targetVessel?.id || Object.keys(vessels)[0];
                  const simRuntime = targetId ? reactionSimulationEngine.getRuntime(targetId) : undefined;
                  const kinetics = targetId ? activeKinetics[targetId] : undefined;

                  return (
                    <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900/80 to-slate-900/90 p-3 rounded-xl border border-indigo-500/40 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <Activity size={13} className="text-indigo-400" />
                          Reaction Dynamics Telemetry
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {simRuntime?.reactionId || kinetics?.reactionId || 'IDLE'}
                        </span>
                      </div>

                      {/* Scrubber inside Telemetry HUD */}
                      {kinetics && (
                        <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                          <div className="flex justify-between items-center text-[9px] font-mono text-slate-300">
                            <span>Tua tiến:</span>
                            <span className="text-amber-300 font-bold">{Math.round(kinetics.progress * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.005"
                            value={kinetics.progress}
                            onChange={(e) => handleScrubReaction(kinetics.vesselId, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400 focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-0.5">
                          <div className="text-[9px] text-slate-400">Progress / Rate</div>
                          <div className="text-white font-bold">
                            {Math.round(((simRuntime?.progress ?? kinetics?.progress) || 0) * 100)}% 
                            <span className="text-slate-400 font-normal ml-1">
                              (r = {(simRuntime?.reactionRate ?? 1.0).toFixed(2)})
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-0.5">
                          <div className="text-[9px] text-slate-400">Gas Evolution Rate</div>
                          <div className="text-amber-300 font-bold">
                            {simRuntime?.gasGenerationRate !== undefined ? (simRuntime.gasGenerationRate * 25).toFixed(1) + ' mL/s' : '—'}
                          </div>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-0.5">
                          <div className="text-[9px] text-slate-400">Precipitate / Turbidity</div>
                          <div className="text-cyan-300 font-bold">
                            {(targetVessel?.precipitateAmount_g || 0).toFixed(2)} g 
                            <span className="text-slate-400 font-normal ml-1">
                              (τ = {(simRuntime?.turbidity || 0).toFixed(2)})
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-0.5">
                          <div className="text-[9px] text-slate-400">Surface Activity</div>
                          <div className="text-emerald-300 font-bold">
                            {((simRuntime?.surfaceActivity || 0) * 100).toFixed(0)}%
                          </div>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-0.5">
                          <div className="text-[9px] text-slate-400">Bubble / Solid Particles</div>
                          <div className="text-white font-bold">
                            {Math.round((simRuntime?.gasGenerationRate || 0) * 35)} bubbles / {Math.round((simRuntime?.turbidity || 0) * 800 + (targetVessel?.precipitateAmount_g || 0) * 600)} solids
                          </div>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-0.5">
                          <div className="text-[9px] text-slate-400">Frame Budget / FPS</div>
                          <div className="text-emerald-400 font-bold">
                            {fps} FPS <span className="text-slate-400 font-normal">({frameStats.samples > 0 ? frameStats.ms.toFixed(1) : '—'} ms)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Telemetry Grid */}
                {targetVessel && (
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Thermometer size={11} className="text-rose-400" />
                        Temperature
                      </div>
                      <div className="text-sm font-bold text-white">
                        {targetVessel.temperature_c?.toFixed(1) || '25.0'} °C
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Đầu đo 3D có thời gian đáp ứng riêng.
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Gauge size={11} className="text-cyan-400" />
                        pH Level
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{targetVessel.ph?.toFixed(2) || '7.00'}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{
                            backgroundColor: (targetVessel.ph ?? 7) < 3 ? '#ef4444' : ((targetVessel.ph ?? 7) > 9 ? '#3b82f6' : '#22c55e')
                          }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {(targetVessel.ph ?? 7) < 7 ? 'Acidic' : ((targetVessel.ph ?? 7) > 7 ? 'Basic' : 'Neutral')}
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[9px] text-slate-400">Volume & Mass</div>
                      <div className="text-sm font-bold text-white">
                        {targetVessel.volume_ml?.toFixed(1) || '0.0'} mL
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Mass: {targetVessel.mass_g?.toFixed(1) || '0.0'} g
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[9px] text-slate-400">Phase & Boiling</div>
                      <div className="text-sm font-bold text-white">
                        {targetVessel.isBoiling ? 'Boiling 100°C' : 'Liquid Phase'}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Precip: {targetVessel.hasPrecipitate ? `${(targetVessel.precipitateAmount_g || 0).toFixed(2)} g` : 'None'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conservation Error Telemetry */}
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span>Đối chiếu kho chất hiện tại</span>
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <Gauge size={12} />
                      {inventoryReading.status === 'consistent' ? 'Khớp' : inventoryReading.status === 'mismatch' ? 'Lệch' : 'Chưa đủ dữ liệu'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between">
                    <span>Rel. Mass Error:</span>
                    <span className="text-slate-200">{inventoryReading.relativeMassError?.toExponential(2) ?? '—'}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between">
                    <span>Dư điện tích (mô hình 25 °C):</span>
                    <span className="text-slate-200">{inventoryReading.chargeResidual_M == null ? 'Chưa giải' : `${inventoryReading.chargeResidual_M.toExponential(2)} M`}</span>
                  </div>
                </div>

                {/* Educational Hazard Badge */}
                {hazard && (
                  <div className="bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[10px]">
                      <ShieldAlert size={13} className="text-rose-400 shrink-0" />
                      <span>{hazard.title}</span>
                    </div>
                    <div className="text-[9px] text-rose-200/80 leading-relaxed">
                      {hazard.warningText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
