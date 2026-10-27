import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useQualityStore, QualityTier } from '../quality';
import { REACTION_DATABASE } from '../../chem/reactions';
import { SUBSTANCE_DATABASE } from '../../chem/substances';
import { vfxBus } from '../bus';
import { effects } from '../vesselEffects';
import { runBasicPhysicalScenario } from './basicScenarios';
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
import { gasVolumeRateMl_s } from '../gasVisualState';
import { studioProgramForReaction } from '../../engine/studioProgram';
import { studioAtomAction, runStudioAtomContext } from '../../engine/studioAtom';
import { studioInventoryReading } from '../../engine/studioInventoryReading';
import { PRECIPITATE_MORPHOLOGIES } from '../../engine/studioMorphology';
import { dispensePipette } from '../../handling/instrumentOperations';
import { HotPlateControls } from '../../components/HotPlateControls';
import { LESSON_PROGRAM_IDS } from '../../lesson/programCompiler';
import { 
  Sparkles, Play, Pause, RotateCcw, AlertTriangle, Flame, Droplets,
  Layers, Gauge, CheckCircle2, ChevronDown, ChevronUp, X, Thermometer,
  Beaker, Compass, Volume2, VolumeX, Eye, ShieldAlert, Activity,
  Wind, Zap, Info, Filter, SlidersHorizontal, Clock, Cpu, Box
} from 'lucide-react';
import { useSimulationDebugStore } from '../../simulation/core/debugStore';
import { SimulationEngine } from '../../simulation/core/SimulationEngine';
import { PourController } from '../../pour/controller/PourController';
import { PourSessionState } from '../../pour/controller/modes';
import { kineticsEngine, ReactionProgressState } from '../../simulation/chemistry/KineticsEngine';

type StudioTab = 'reactions' | 'simulation' | 'programs' | 'atoms' | 'morphology' | 'physics' | 'flames' | 'telemetry';

export { PRECIPITATE_MORPHOLOGIES } from '../../engine/studioMorphology';

export const VfxGallery: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('reactions');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(useAppStore.getState().selectedVesselId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);

  // Reaction Programs & Effect Atoms Studio State
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [programSearch, setProgramSearch] = useState<string>('');
  const [programCategoryFilter, setProgramCategoryFilter] = useState<string>('all');
  const [overflowSourceId, setOverflowSourceId] = useState('');
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

  // Simulation Debug Gizmos & Telemetry State
  const showGravity = useSimulationDebugStore(s => s.showGravity);
  const showLiquidPlane = useSimulationDebugStore(s => s.showLiquidPlane);
  const showPourTrajectory = useSimulationDebugStore(s => s.showPourTrajectory);
  const showMixingZone = useSimulationDebugStore(s => s.showMixingZone);
  const showSedimentBounds = useSimulationDebugStore(s => s.showSedimentBounds);
  const toggleDebug = useSimulationDebugStore(s => s.toggleDebug);

  const [pourSession, setPourSession] = useState<PourSessionState | null>(null);
  const [activeKineticsRxns, setActiveKineticsRxns] = useState<ReactionProgressState[]>([]);

  const setVesselState = useAppStore(state => state.setVesselState);
  const setActiveTool = useAppStore(state => state.setActiveTool);


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

  // Keep the explicit target, including after deletion. A missing ID never falls back.
  const targetVessel = selectedVesselId ? vessels[selectedVesselId] : undefined;
  const simMgr = targetVessel ? SimulationEngine.findManager(targetVessel.id) : null;
  const measuredGasMol_s = Object.values(targetVessel?.gasFlux?.generated_mol_s ?? {}).reduce((sum, rate) => sum + (Number.isFinite(rate) ? Math.max(0, rate) : 0), 0);

  // Poll continuous pouring & kinetics telemetry
  useEffect(() => {
    if (!isVisible) return;
    const unsub = PourController.subscribe(s => setPourSession(s));
    const interval = setInterval(() => {
      const activeId = selectedVesselId;
      if (activeId) {
        setActiveKineticsRxns([...kineticsEngine.getVesselReactions(activeId)]);
      }
    }, 150);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [isVisible, selectedVesselId, vessels]);

  const requireTarget = (): string | null => {
    if (selectedVesselId && useAppStore.getState().vessels[selectedVesselId]) return selectedVesselId;
    setAtomNotice('Chọn bình đích; dùng nút Thêm bình nếu bàn đang trống.');
    return null;
  };

  const applyScenario = (testNum: number) => {
    const id = requireTarget(); if (!id) return;
    setAtomNotice(runBasicPhysicalScenario(id, testNum).message);
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
    const targetId = requireTarget();
    if (!targetId) return;
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
      setAtomNotice('Chương trình bài học có nhiều dụng cụ: mở mục Bài học để chạy. VFX Studio giữ nguyên bình đích.');
      return;
    }
    const store = useAppStore.getState();
    const current = selectedVesselId ? store.vessels[selectedVesselId] : undefined;
    const id = !fresh && current?.studioProgramId === program.id ? current.id : store.prepareStudioProgram(program.id, undefined, requireTarget() ?? "");
    if (!id) { setAtomNotice(useAppStore.getState().mixError ?? 'Chọn bình đích hợp lệ.'); return; }
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
    const targetId = requireTarget();
    if (!targetId) return;
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
        className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-white/95 text-slate-800 hover:text-blue-600 rounded-full shadow-lg border border-slate-200/90 text-xs font-semibold flex items-center gap-2 hover:border-blue-400 hover:shadow-xl transition-all backdrop-blur-md group"
        title="Open VFX & Simulation Studio (?vfx=1)"
      >
        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 group-hover:scale-110 transition-transform">
          <Sparkles size={12} className="text-blue-600" />
        </div>
        <span className="font-bold tracking-wide">VFX & LAB STUDIO</span>
        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono font-bold">
          {frameStats.samples > 0 ? `${fps} FPS` : 'v2.0'}
        </span>
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
    <div className="fixed bottom-4 right-4 z-50 w-[470px] max-w-[calc(100vw-2rem)] max-h-[88vh] bg-white/98 text-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col backdrop-blur-xl overflow-hidden transition-all text-xs font-sans ring-1 ring-slate-900/5">
      
      {/* 1. Header Bar */}
      <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-slate-800 text-xs uppercase">
                VFX & LAB STUDIO
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-600 border border-blue-200/60">
                PBR v2.0
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {frameStats.samples > 0 ? `${fps} FPS` : '—'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">Emergent Physics Simulation & Reaction VFX</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title={isMuted ? 'Unmute Procedural Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border border-slate-200"
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border border-slate-200"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* 2. Global Top Control Strip */}
          <div className="p-3 bg-slate-50/90 border-b border-slate-200/80 space-y-2.5">
            <p className="text-[10px] text-slate-600">Mọi hiệu ứng dùng cùng bình đích. Nút “Thay mẫu” thay lượng chất trong bình này.</p>
            {atomNotice && <p role="status" className="text-[11px] text-blue-700">{atomNotice}</p>}
            {/* Target Vessel & Simulation Clock Controls */}
            <div className="flex items-center justify-between gap-2">
              {/* Target Vessel Selector */}
              <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                <Beaker size={13} className="text-blue-600 shrink-0" />
                <select
                  value={selectedVesselId || ''}
                  onChange={(e) => setSelectedVesselId(e.target.value)}
                  className="bg-white text-slate-800 rounded-lg px-2 py-1 text-[11px] border border-slate-200 font-medium truncate w-full shadow-2xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Chọn bình đích…</option>
                  {Object.values(vessels).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name || v.id} ({v.type})
                    </option>
                  ))}
                </select>
              </div>

              <button className="text-[10px] text-blue-700 border rounded px-2 py-1" onClick={() => {
                const oldIds = new Set(Object.keys(useAppStore.getState().vessels));
                addVessel('beaker');
                const id = Object.keys(useAppStore.getState().vessels).find(key => !oldIds.has(key));
                if (id) setSelectedVesselId(id);
              }}>Thêm bình</button>

              {/* Play / Pause / Reset */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSimulationPaused(!isSimulationPaused)}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 text-[11px] transition-all shadow-2xs ${
                    isSimulationPaused
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
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
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-rose-500 rounded-lg border border-slate-200 transition-colors shadow-2xs"
                  title="Reset Workbench"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Time Scales */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {[0.25, 0.5, 1, 2, 4].map(scale => (
                  <button
                    key={scale}
                    onClick={() => setTimeScale(scale)}
                    className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold transition-all ${
                      timeScale === scale
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Tier & Engine Toggle */}
            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Layers size={11} className="text-blue-500" />
                  Tier:
                </span>
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {(['low', 'medium', 'high', 'auto'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setPreference(t)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                        preference === t
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t === 'auto' ? `Auto (${effectiveTier[0].toUpperCase()})` : t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Engine:</span>
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => handleSwitchEngine('v2')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                      engineMode === 'v2' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    v2 PBR
                  </button>
                  <button
                    onClick={() => handleSwitchEngine('v1')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                      engineMode === 'v1' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    v1 Leg
                  </button>
                </div>
              </div>
            </div>
          </div>

          {targetVessel?.studioProgramId && <div className="mx-3 my-2 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 space-y-1.5 text-[10px] text-slate-700">
            <p className="font-medium">Mẫu định lượng mô phỏng riêng; không phải quy trình định lượng thực hành. Giữ nguyên mẫu trước đó. Tua tiến không thu hồi khí đã thoát.</p>
            {getProgramById(targetVessel.studioProgramId)?.chemistry.conditions?.activationNote_vi && <p className="text-blue-700 font-semibold">{getProgramById(targetVessel.studioProgramId)?.chemistry.conditions?.activationNote_vi}</p>}
            {getProgramById(targetVessel.studioProgramId)?.chemistry.conditions?.activation === 'ignition' &&
              <button className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold px-2.5 py-1 shadow-2xs transition-colors" onClick={() => useAppStore.getState().igniteStudioSample(targetVessel.id)}>Mồi cháy mẫu bằng nguồn nhiệt gần</button>}
            <div className="flex gap-2 pt-0.5">
              <button className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 shadow-2xs transition-colors" onClick={() => useAppStore.getState().runStudioProgram(targetVessel.id)}>Kiểm tra điều kiện / Chạy mẫu</button>
              <button className="rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 px-2.5 py-1 shadow-2xs transition-colors" onClick={() => {
                const program = getProgramById(targetVessel.studioProgramId!);
                if (program) executeProgram(program, true);
              }}>Tạo mẫu mới</button>
            </div>
          </div>}

          {/* 3. Navigation Tabs (Clean 4x2 Grid: No horizontal scrollbar, all 8 tabs accessible at a glance) */}
          <div className="grid grid-cols-4 p-1.5 bg-slate-100/80 border-b border-slate-200/80 gap-1 text-[10px] font-semibold select-none">
            <button
              onClick={() => setActiveTab('reactions')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'reactions'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title="Chemical Reactions Catalog"
            >
              <Beaker size={12} className={activeTab === 'reactions' ? 'text-white' : 'text-blue-500'} />
              <span className="truncate">Reactions</span>
            </button>

            <button
              onClick={() => setActiveTab('simulation')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'simulation'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title="Simulation & 3D Debug Gizmos"
            >
              <Activity size={12} className={activeTab === 'simulation' ? 'text-white' : 'text-emerald-500'} />
              <span className="truncate">Simulation</span>
            </button>

            <button
              onClick={() => setActiveTab('programs')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'programs'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title={`Handcrafted Reaction Programs (${ALL_HANDCRAFTED_PROGRAMS.length})`}
            >
              <Layers size={12} className={activeTab === 'programs' ? 'text-white' : 'text-indigo-500'} />
              <span className="truncate">Programs</span>
            </button>

            <button
              onClick={() => setActiveTab('atoms')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'atoms'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title={`Effect Atoms Catalog (${EFFECT_ATOM_CATALOG.length})`}
            >
              <Cpu size={12} className={activeTab === 'atoms' ? 'text-white' : 'text-amber-500'} />
              <span className="truncate">Atoms</span>
            </button>

            <button
              onClick={() => setActiveTab('physics')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'physics'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title="Laboratory Apparatus Controls (Stirrer, Burner, Hotplate)"
            >
              <SlidersHorizontal size={12} className={activeTab === 'physics' ? 'text-white' : 'text-violet-500'} />
              <span className="truncate">Apparatus</span>
            </button>

            <button
              onClick={() => setActiveTab('morphology')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'morphology'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title="Precipitate Crystal & Colloid Morphology"
            >
              <Sparkles size={12} className={activeTab === 'morphology' ? 'text-white' : 'text-pink-500'} />
              <span className="truncate">Morphology</span>
            </button>

            <button
              onClick={() => setActiveTab('flames')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'flames'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title="Flame Emission Spectroscopy"
            >
              <Flame size={12} className={activeTab === 'flames' ? 'text-white' : 'text-orange-500'} />
              <span className="truncate">Flames</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`py-1.5 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'telemetry'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/70'
              }`}
              title="Sensor Readouts & Mass Balance Telemetry"
            >
              <Gauge size={12} className={activeTab === 'telemetry' ? 'text-white' : 'text-cyan-600'} />
              <span className="truncate">Telemetry</span>
            </button>
          </div>

          {/* 4. Tab Content Area */}
          <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 max-h-[calc(88vh-165px)] bg-slate-50/40">

            {/* TAB: SIMULATION & GIZMOS */}
            {activeTab === 'simulation' && (
              <div className="space-y-3">
                {/* 1. Target Vessel Quick Telemetry */}
                {targetVessel && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center text-slate-500 text-[10px] uppercase font-semibold">
                      <span>Bình: <strong className="text-slate-800">{targetVessel.name || targetVessel.id}</strong></span>
                      <span className="text-blue-600 font-mono font-bold">{targetVessel.type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Nhiệt độ:</span>
                        <div className="text-amber-600 font-bold text-xs">{targetVessel.temperature_c.toFixed(1)}°C</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Thể tích:</span>
                        <div className="text-blue-600 font-bold text-xs">{targetVessel.volume_ml.toFixed(1)} mL</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Trạng thái sôi:</span>
                        <div className={targetVessel.isBoiling ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {targetVessel.isBoiling ? 'Đang sôi' : 'Bình thường'}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Kết tủa:</span>
                        <div className={targetVessel.hasPrecipitate ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                          {targetVessel.hasPrecipitate ? `${(targetVessel.precipitateAmount_g || 0).toFixed(2)}g` : 'Không'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 3D Debug Gizmos Toggles */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold block border-b border-slate-200 pb-1">
                    Hiển Thị Trực Quan Debug (3D Gizmos)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => toggleDebug('showGravity')}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        showGravity ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Vector Trọng Lực</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${showGravity ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{showGravity ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      onClick={() => toggleDebug('showLiquidPlane')}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        showLiquidPlane ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Mặt Phẳng Ngang</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${showLiquidPlane ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{showLiquidPlane ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      onClick={() => toggleDebug('showPourTrajectory')}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        showPourTrajectory ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Quỹ Đạo Rót Parabol</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${showPourTrajectory ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{showPourTrajectory ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      onClick={() => toggleDebug('showMixingZone')}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        showMixingZone ? 'bg-pink-50 text-pink-700 border-pink-300 font-bold shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Vùng Trộn Cục Bộ</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${showMixingZone ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{showMixingZone ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      onClick={() => toggleDebug('showSedimentBounds')}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all col-span-2 ${
                        showSedimentBounds ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Giới Hạn Lớp Cặn Lắng (Sediment Bed Bounds)</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${showSedimentBounds ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{showSedimentBounds ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Pre-configured Simulation Scenarios (TEST 1 to 8) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold block border-b border-slate-200 pb-1">
                    Kịch Bản Kiểm Thử Nhanh (Test Scenarios)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 1, label: 'Thay mẫu nước 25°C', desc: 'Giữ bình, thay lượng chất' },
                      { id: 2, label: 'Gia nhiệt 80 W', desc: 'Mẫu ấm dần theo nhiệt cấp' },
                      { id: 3, label: 'Gia nhiệt 300 W', desc: 'Sôi khi đạt bão hòa' },
                      { id: 4, label: 'Tủa BaSO4/PbI2', desc: 'Mưa vàng & Tyndall' },
                      { id: 5, label: 'Gợn mặt thoáng', desc: 'Một xung tắt dần' },
                      { id: 6, label: 'Thay mẫu nước 5°C', desc: 'Đọng sương ngoài thành' },
                      { id: 7, label: 'Ngắt nhiệt ảo', desc: 'Mẫu nguội tự nhiên' },
                      { id: 8, label: 'Gió 0,8 m/s', desc: 'Chỉ bình đang chọn' },
                    ].map(sc => (
                      <button
                        key={sc.id}
                        onClick={() => applyScenario(sc.id)}
                        className="p-2 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 active:bg-blue-100 border border-slate-200/90 rounded-lg text-left transition-all shadow-2xs"
                      >
                        <div className="font-bold text-slate-800 text-[11px]">{sc.label}</div>
                        <div className="text-[9px] text-slate-500">{sc.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Pouring Pipeline Telemetry */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold block border-b border-slate-200 pb-1">
                    Rót Dung Dịch (Continuous Pouring Pipeline)
                  </span>
                  {pourSession ? (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Trạng thái:</span>
                        <span className="text-emerald-600 font-bold uppercase">{pourSession.phase}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tốc độ dòng:</span>
                        <span className="text-blue-600 font-bold">{pourSession.flow_ml_s.toFixed(2)} mL/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Đã chuyển:</span>
                        <span className="text-amber-600 font-bold">{pourSession.transferred_ml.toFixed(1)} mL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Góc nghiêng / Đổ:</span>
                        <span className="text-slate-700">{((pourSession.tilt * 180) / Math.PI).toFixed(1)}° | {pourSession.spilled_ml > 0 ? `${pourSession.spilled_ml.toFixed(1)}mL đổ` : '0 mL'}</span>
                      </div>
                      {pourSession.wallClinging && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          ⚠ Wall-clinging: Góc rót nông gây chảy bám thành bình!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-[11px] py-1">
                      Chưa có phiên rót. Kéo nghiêng bình vào bình khác để quan sát dòng chảy.
                    </div>
                  )}
                </div>

                {/* 5. Physical Engine Telemetry */}
                {simMgr && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold block border-b border-slate-200 pb-1">
                      Mô Phỏng Vật Lý Chi Tiết
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Bọt hiển thị:</span>
                        <div className="text-rose-600 font-bold">{simMgr.boilingSystem.bubbles.length} bọt</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Hơi nước ra ngoài:</span>
                        <div className="text-blue-600 font-bold">{(simMgr.evaporationSystem.currentRate_g_s * 60).toFixed(2)} g/phút</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Độ đục:</span>
                        <div className="text-indigo-600 font-bold">{Math.round(simMgr.precipitationSystem.cloudiness * 100)}%</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-500 text-[10px]">Cặn đáy:</span>
                        <div className="text-amber-600 font-bold">{simMgr.precipitationSystem.sedimentBed.amount_g.toFixed(2)}g</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: REACTIONS CATALOG */}
            {activeTab === 'reactions' && (
              <div className="space-y-3">
                {/* Interactive Timeline Scrubber (0% to 100%) */}
                {currentActiveKinetics && (
                  <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-slate-50 p-3 rounded-xl border border-indigo-200/80 space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-800 truncate max-w-[220px]">
                        {currentActiveKinetics.reactionName}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-blue-700 font-bold">
                        <span className="text-[11px] text-amber-600">
                          {Math.round(currentActiveKinetics.progress * 100)}%
                        </span>
                        <span className="text-[9px] text-slate-500">
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
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                    </div>

                    {/* Scrubbing Quick Controls */}
                    <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono">
                      <button
                        onClick={() => { if (currentActiveKinetics.program) executeProgram(currentActiveKinetics.program, true); }}
                        className="hover:text-indigo-600 px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs transition-colors"
                      >
                        Mẫu mới
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSimulationPaused(!isSimulationPaused)}
                          className="hover:bg-indigo-700 px-2 py-0.5 rounded bg-indigo-600 text-white font-bold transition-colors shadow-2xs"
                        >
                          {isSimulationPaused ? 'Play' : 'Pause'}
                        </button>
                        <button
                          onClick={() => handleScrubReaction(currentActiveKinetics.vesselId, Math.min(1.0, currentActiveKinetics.progress + 0.1))}
                          className="hover:text-indigo-600 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-bold transition-colors shadow-2xs"
                        >
                          +10%
                        </button>
                      </div>
                      <button
                        onClick={() => handleScrubReaction(currentActiveKinetics.vesselId, 1.0)}
                        className="hover:text-indigo-600 px-1.5 py-0.5 rounded bg-white border border-slate-200 transition-colors shadow-2xs"
                      >
                        100%
                      </button>
                    </div>

                    <div className="text-[9px] font-mono text-slate-500 truncate border-t border-indigo-100 pt-1">
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
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
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
                            ? 'bg-blue-50/80 border-blue-300 shadow-2xs ring-1 ring-blue-400/30'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200/90 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-semibold text-[11px] text-slate-800">
                            {language === 'vi' ? item.name_vi : item.name}
                          </div>
                          <button
                            onClick={() => executeReaction(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shadow-2xs transition-colors shrink-0"
                          >
                            Execute
                          </button>
                        </div>

                        {program && (
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                            <span className="truncate max-w-[240px] text-blue-600 font-medium">{program.chemistry.equation}</span>
                            <span className={(program.chemistry.deltaH_kJ_per_mol ?? 0) < 0 ? 'text-rose-600 font-bold' : 'text-blue-600'}>
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
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <Layers size={14} />
                      Reaction Programs Master Catalog ({ALL_HANDCRAFTED_PROGRAMS.length} Balanced Programs)
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full font-mono font-bold">
                      Declarative JSON / Zod
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Closed Effect-Atom compositions with stoichiometric elemental balance, deltaH enthalpy, GHS hazard tagging, and physical time honesty.
                  </p>

                  {/* Filter and Search Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Search equation, ID, formula..."
                      value={programSearch}
                      onChange={(e) => setProgramSearch(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <select
                      value={programCategoryFilter}
                      onChange={(e) => setProgramCategoryFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white"
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
                  <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-slate-50 p-3 rounded-xl border border-blue-200/80 space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-800 truncate max-w-[220px]">
                        Active: {currentActiveKinetics.reactionName}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-blue-700 font-bold">
                        <span className="text-[11px] text-amber-600">
                          {Math.round(currentActiveKinetics.progress * 100)}%
                        </span>
                        <span className="text-[9px] text-slate-500">
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
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
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
                          className={`border p-3 rounded-xl space-y-2 transition-all shadow-2xs ${
                            isRunning
                              ? 'border-blue-400 bg-blue-50/70 shadow-2xs ring-1 ring-blue-400/40'
                              : isSelected
                              ? 'border-slate-300 bg-slate-50/90'
                              : 'bg-white border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => setSelectedProgramId(isSelected ? null : prog.id)}
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded">
                                  {prog.id}
                                </span>
                                {hasPrecip && (
                                  <span className="text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-200/60 px-1.5 py-0.5 rounded font-semibold">
                                    Precipitate
                                  </span>
                                )}
                                {hasGas && (
                                  <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded font-semibold">
                                    Gas
                                  </span>
                                )}
                                {prog.visual.timeWarp && (
                                  <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.5 rounded font-semibold">
                                    time-lapse
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-800 mt-1 font-mono">
                                {prog.chemistry.equation}
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {language === 'vi' ? prog.explain.observation_vi : prog.explain.observation_en}
                              </p>
                            </div>

                            <button
                              onClick={() => executeProgram(prog)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs shrink-0"
                            >
                              <Play size={10} />
                              <span>Run Program</span>
                            </button>
                          </div>

                          {/* Expanded Program Deep Inspector */}
                          {isSelected && (
                            <div className="pt-2 border-t border-slate-200 space-y-2 text-[10px]">
                              {/* Kinetics & Energy */}
                              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg font-mono border border-slate-200/80">
                                <div>
                                  <span className="text-slate-500">Model: </span>
                                  <span className="text-indigo-600 font-semibold">{prog.chemistry.kinetics.model}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Duration: </span>
                                  <span className="text-amber-600 font-semibold">{prog.visual.duration_s}s</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">ΔH theo phương trình: </span>
                                  <span className={prog.chemistry.deltaH_kJ_per_mol && prog.chemistry.deltaH_kJ_per_mol < 0 ? 'text-rose-600 font-bold' : 'text-blue-600 font-semibold'}>
                                    {prog.chemistry.deltaH_kJ_per_mol == null ? 'Chưa có dữ liệu' : `${prog.chemistry.deltaH_kJ_per_mol} kJ/mol phản ứng`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Điểm metadata: </span>
                                  <span className="text-emerald-600 font-semibold">{(prog.confidence * 100).toFixed(0)}% · chưa hiệu chuẩn</span>
                                </div>
                              </div>

                              {/* Timeline Atoms */}
                              {prog.chemistry.deltaHNote_vi && <p className="text-[10px] text-slate-500">{prog.chemistry.deltaHNote_vi}</p>}
                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Effect Atoms Timeline:</span>
                                <div className="space-y-1">
                                  {prog.visual.timeline.map((atomInst, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200/70 px-2 py-1 rounded text-[9px] font-mono">
                                      <span className="text-blue-600 font-bold">{atomInst.atom}</span>
                                      <span className="text-slate-500">anchor: {atomInst.anchor}</span>
                                      <span className="text-amber-600 font-semibold">[{atomInst.window[0] * 100}% - {atomInst.window[1] * 100}%]</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Chemical Mechanism */}
                              <div className="bg-slate-50 border border-slate-200/80 p-2 rounded text-[10px] text-slate-700">
                                <span className="font-bold text-slate-800 block mb-0.5">Mechanism:</span>
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
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <Cpu size={14} />
                      Danh mục hiệu ứng ({EFFECT_ATOM_CATALOG.length} mục)
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full font-mono font-bold">
                      Bối cảnh và điều kiện
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
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
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {atomNotice && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50/80 p-2 text-[11px] text-blue-800">{atomNotice}</p>}
                {/* Atoms List */}
                <div className="grid grid-cols-1 gap-2">
                  {EFFECT_ATOM_CATALOG
                    .filter((atom) => atomCategoryFilter === 'all' || atom.category === atomCategoryFilter)
                    .map((atom) => {
                      const isSelected = selectedAtomName === atom.name;

                      return (
                        <div
                          key={atom.name}
                          className={`border p-3 rounded-xl space-y-2 transition-all shadow-2xs ${
                            isSelected
                              ? 'border-blue-400 bg-blue-50/70 shadow-2xs ring-1 ring-blue-400/40'
                              : 'bg-white border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => setSelectedAtomName(isSelected ? null : atom.name)}
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-slate-800 font-mono text-blue-700">
                                  {atom.name}
                                </h4>
                                <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                                  {atom.category}
                                </span>
                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                                  cost: {atom.budget.shaderCost}/3
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {atom.summary_en}
                              </p>
                            </div>

                            <button
                              onClick={() => executeAtomPreset(atom, 0)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs shrink-0"
                            >
                              <Play size={10} />
                              <span>{studioAtomAction(atom, 0).label}</span>
                            </button>
                          </div>

                          {/* Expanded Atom Details */}
                          {isSelected && (
                            <div className="pt-2 border-t border-slate-200 space-y-2 text-[10px]">
                              {/* Use When / Avoid When */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800">
                                  <span className="font-bold block text-emerald-900 mb-0.5">Use When:</span>
                                  {atom.useWhen.join('; ')}
                                </div>
                                <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-rose-800">
                                  <span className="font-bold block text-rose-900 mb-0.5">Avoid When:</span>
                                  {atom.avoidWhen.join('; ')}
                                </div>
                              </div>

                              {/* Allowed Anchors */}
                              <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg font-mono text-[9px] text-slate-700">
                                <span className="font-bold text-slate-800">Allowed Anchors: </span>
                                {atom.anchorsAllowed.join(', ')}
                              </div>

                              {/* Parameter Specs */}
                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Parameters Schema:</span>
                                <div className="space-y-1">
                                  {Object.entries(atom.params).map(([paramName, spec]: [string, any]) => (
                                    <div key={paramName} className="flex items-center justify-between bg-slate-50 border border-slate-200/70 px-2 py-1 rounded text-[9px] font-mono">
                                      <span className="text-blue-700 font-bold">{paramName}</span>
                                      <span className="text-slate-500">type: {spec.type}</span>
                                      <span className="text-amber-600 font-semibold">default: {JSON.stringify(spec.default)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Presets Gallery */}
                              {atom.gallery && atom.gallery.length > 0 && (
                                <div>
                                  <span className="font-bold text-slate-700 block mb-1">Gallery Presets ({atom.gallery.length}):</span>
                                  <div className="space-y-1.5">
                                    {atom.gallery.map((preset, pIdx) => (
                                      <div key={pIdx} className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-2 rounded-lg">
                                        <div>
                                          <span className="font-bold text-slate-800 block">{preset.title}</span>
                                          <span className="text-[9px] text-slate-500">{preset.description}</span>
                                        </div>
                                        <button
                                          onClick={() => executeAtomPreset(atom, pIdx)}
                                          className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded text-[9px] font-bold transition-colors shadow-2xs"
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
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-purple-600">
                      <Sparkles size={14} />
                      8 mẫu hình thái chất rắn
                    </span>
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-mono font-bold">
                      Hình thái minh họa
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Tạo mẫu riêng có kho chất định lượng. Bảy mẫu chạy phản ứng tạo chất rắn; thạch cao là mẫu có sẵn. Hình dạng hạt chưa được hiệu chuẩn thực nghiệm.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {PRECIPITATE_MORPHOLOGIES.map((morph) => (
                    <div
                      key={morph.type}
                      className="bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-2xs p-3 rounded-xl space-y-2 transition-all group shadow-2xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                              style={{ backgroundColor: morph.color }} 
                            />
                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                              {morph.name}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-purple-600 ml-5 font-semibold">
                            {morph.example}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            const store = useAppStore.getState();
                            const id = store.prepareStudioMorphology(morph.type, requireTarget() ?? "");
                            if (!id) return;
                            setSelectedVesselId(id);
                            setActiveTestId(morph.programId);
                            if (morph.programId) store.runStudioProgram(id);
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Play size={10} />
                          <span>{morph.programId ? 'Tạo mẫu và chạy' : 'Tạo mẫu có sẵn'}</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {morph.description}
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 bg-slate-50 border border-slate-200/70 px-2 py-1 rounded">
                        <span>{morph.settling}</span>
                        <span className="font-semibold text-slate-500">{morph.programId ? 'Lượng từ phản ứng' : 'Mẫu ảo định lượng'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resuspension Action */}
                <button
                  onClick={() => {
                    const targetId = requireTarget();
    if (!targetId) return;
                    useAppStore.getState().stirVessel(targetId);
                    labSound.playStir();
                  }}
                  className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-purple-200 shadow-2xs"
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
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <Flame size={14} />
                      Heating Equipment
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Target: {targetVessel ? targetVessel.name : 'Beaker'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Burner Toggle */}
                    <button
                      onClick={handleBurnerCycle}
                      className={`p-2 rounded-lg border font-bold text-left flex flex-col justify-between transition-all ${
                        burnerState === 'blue'
                          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                          : (burnerState === 'yellow' ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                      }`}
                    >
                      <span className="text-[9px] uppercase font-mono text-slate-500">Đèn cồn</span>
                      <span className="text-[11px]">
                        {burnerState === 'blue' ? 'Mức bấc 4' : (burnerState === 'yellow' ? 'Mức bấc 2' : 'Đã tắt')}
                      </span>
                    </button>
                  </div>
                  {Object.values(vessels).some(v => v.type === 'hot_plate') ? <>
                    <select className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 p-1.5 text-xs shadow-2xs" value={selectedHotPlateId || Object.values(vessels).find(v => v.type === 'hot_plate')!.id}
                      onChange={event => setSelectedHotPlateId(event.target.value)}>
                      {Object.values(vessels).filter(v => v.type === 'hot_plate').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <HotPlateControls plateId={vessels[selectedHotPlateId]?.type === 'hot_plate' ? selectedHotPlateId : Object.values(vessels).find(v => v.type === 'hot_plate')!.id} targetId={targetVessel?.id} />
                  </> : <button className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 text-xs shadow-2xs transition-colors" onClick={() => addVessel('hot_plate')}>Thêm bếp gia nhiệt</button>}

                  <p className="text-[10px] text-slate-500">{targetVessel?.isBoiling ? 'Mẫu đang hóa hơi theo ngân sách nhiệt.' : 'Mẫu chưa sôi.'} Hết nước thì dừng sinh hơi nước. Chưa mô phỏng động học sôi vọt và đá bọt.</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3 text-[11px]">
                  <p className="font-bold">Sôi · Bay hơi · Sương trên thành · Tràn</p>
                  <label className="block">Nguồn nhiệt ảo: {targetVessel?.effectHeatInput_W ?? 0} W
                    <input aria-label="VFX heat input" className="w-full" type="range" min="0" max="500" step="10"
                      value={targetVessel?.effectHeatInput_W ?? 0} onChange={e => {
                        const id = requireTarget(); if (id) setAtomNotice(effects.forVessel(id).setHeatInput(Number(e.target.value)).message);
                      }} />
                  </label>
                  <label className="block">Độ ẩm tại bình: {Math.round((targetVessel?.effectsEnvironment?.relativeHumidity ?? targetVessel?.environment?.relativeHumidity ?? 0.5) * 100)}%
                    <input aria-label="VFX relative humidity" className="w-full" type="range" min="0" max="1" step="0.05"
                      value={targetVessel?.effectsEnvironment?.relativeHumidity ?? targetVessel?.environment?.relativeHumidity ?? 0.5}
                      onChange={e => { const id = requireTarget(); if (id) setAtomNotice(effects.forVessel(id).setEnvironment({ relativeHumidity: Number(e.target.value) }).message); }} />
                  </label>
                  <p>Bay hơi: {(targetVessel?.evaporationRate_g_s ?? 0).toFixed(5)} g/s · Sương trong: {(targetVessel?.wallCondensation?.inner_g ?? 0).toFixed(4)} g · Sương ngoài: {(targetVessel?.wallCondensation?.outer_g ?? 0).toFixed(4)} g</p>
                  <p className="text-slate-500">Hơi nước trong suốt; chỉ hiện plume khi trộn với không khí tạo quá bão hòa. Mô hình truyền khối và nhiệt độ thành là xấp xỉ.</p>
                  <select aria-label="Overflow source vessel" className="w-full border rounded p-1" value={overflowSourceId} onChange={e => setOverflowSourceId(e.target.value)}>
                    <option value="">Chọn bình nguồn hữu hạn để cấp nước…</option>
                    {Object.values(vessels).filter(v => v.id !== selectedVesselId && v.volume_ml > 0).map(v => <option key={v.id} value={v.id}>{v.name} · {v.volume_ml.toFixed(1)} mL</option>)}
                  </select>
                  <button className="rounded border px-2 py-1 text-blue-700" onClick={() => {
                    const id = requireTarget(); if (id) setAtomNotice(effects.forVessel(id).doseLiquid(overflowSourceId, 10).message);
                  }}>Chuyển 10 mL vào bình đích · đầy thì tràn</button>
                </div>

                {/* Stirring & Fluid Vortex Studio */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <Compass size={14} />
                      Stirrer & Fluid Vortex
                    </span>
                    <span className="text-[10px] font-mono text-blue-700 font-bold">{stirrerRpm} RPM</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1200}
                    step={50}
                    value={stirrerRpm}
                    onChange={(e) => handleStirChange(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Rankine Dip: {stirrerRpm > 0 ? `${(Math.pow(stirrerRpm / 300, 2) * 2.2).toFixed(1)} mm` : '0 mm'}</span>
                    <span>Shear: {stirrerRpm > 0 ? `${(stirrerRpm * 0.005).toFixed(2)} Pa` : '0 Pa'}</span>
                  </div>
                </div>

                {/* Dropper & Hydraulics */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 text-blue-600">
                    <Droplets size={14} />
                    <span>Hydraulic Inflow & Droppers</span>
                  </div>

                  <p className="text-[10px] text-slate-500">Hút mẫu bằng công cụ pipet trước. 0,05 mL là liều chọn trong mô phỏng; thể tích giọt thật phụ thuộc đầu nhỏ giọt và chất lỏng.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleAddDropperDrop}
                      className="py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
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
                      className="py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
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
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <Flame size={14} />
                      Flame Color Reference Preview
                    </span>
                    <button
                      onClick={() => setUseCobaltGlass(!useCobaltGlass)}
                      className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border transition-colors flex items-center gap-1 ${
                        useCobaltGlass
                          ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Filter size={10} />
                      <span>Cobalt Glass Notes: {useCobaltGlass ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {useCobaltGlass && <p className="text-[10px] text-slate-500">Kính coban lọc ánh sáng tới mắt, làm giảm màu vàng của Na; không làm đổi ngọn lửa. Mục này giải thích kính lọc, chưa mô phỏng phổ truyền qua kính.</p>}
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
                            ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold">{el.sym}</span>
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: el.color }} />
                        </div>
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">{el.name.split(' ')[0]}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleFlameTest}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-[11px] shadow-2xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Flame size={14} />
                    <span>Preview Reference Color (7.5 s)</span>
                  </button>
                </div>

                {/* Pyrotechnics Demonstrations */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 text-rose-600">
                    <Zap size={14} />
                    <span>Metal Pyrotechnics & Alkali</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => executeReaction('burn_magnesium')}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left flex flex-col justify-between transition-colors shadow-2xs"
                    >
                      <span className="font-bold text-[10px] text-slate-800">Magnesium Ribbon</span>
                      <span className="text-[9px] text-slate-500">3100 K Blinding White</span>
                    </button>

                    <button
                      onClick={() => executeReaction('sodium_water_reaction')}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left flex flex-col justify-between transition-colors shadow-2xs"
                    >
                      <span className="font-bold text-[10px] text-amber-700">Sodium in Water</span>
                      <span className="text-[9px] text-slate-500">H2 Jet Skater & Pop</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LIVE TELEMETRY & CONSERVATION */}
            {activeTab === 'telemetry' && (
              <div className="space-y-3.5">
                {/* Vessel Target Selector */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] shadow-2xs">
                  <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                    <Beaker size={14} className="text-blue-600" />
                    Target Vessel:
                  </span>
                  <select
                    value={selectedVesselId || ''}
                    onChange={(e) => setSelectedVesselId(e.target.value)}
                    className="bg-slate-50 text-slate-800 rounded-lg px-2 py-1 text-[11px] border border-slate-200 font-medium"
                  >
                    <option value="">Chọn bình đích…</option>
                  {Object.values(vessels).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name || v.id} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reaction Dynamics Live HUD */}
                {(() => {
                  const targetId = targetVessel?.id;
                  const simRuntime = targetId ? reactionSimulationEngine.getRuntime(targetId) : undefined;
                  const kinetics = targetId ? activeKinetics[targetId] : undefined;

                  return (
                    <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-white p-3 rounded-xl border border-indigo-200 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-indigo-700">
                          <Activity size={13} className="text-indigo-600" />
                          Reaction Dynamics Telemetry
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
                          {simRuntime?.reactionId || kinetics?.reactionId || 'IDLE'}
                        </span>
                      </div>

                      {/* Scrubber inside Telemetry HUD */}
                      {kinetics && (
                        <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="flex justify-between items-center text-[9px] font-mono text-slate-600">
                            <span>Tua tiến:</span>
                            <span className="text-amber-600 font-bold">{Math.round(kinetics.progress * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.005"
                            value={kinetics.progress}
                            onChange={(e) => handleScrubReaction(kinetics.vesselId, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                          <div className="text-[9px] text-slate-500">Progress / Rate</div>
                          <div className="text-slate-800 font-bold">
                            {Math.round(((simRuntime?.progress ?? kinetics?.progress) || 0) * 100)}% 
                            <span className="text-slate-500 font-normal ml-1">
                              (r = {(simRuntime?.reactionRate ?? 1.0).toFixed(2)})
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                          <div className="text-[9px] text-slate-500">Gas Evolution Rate</div>
                          <div className="text-amber-600 font-bold">
                            {targetVessel?.gasFlux ? gasVolumeRateMl_s(measuredGasMol_s, targetVessel.temperature_c,
                              targetVessel.effectsEnvironment?.pressure_atm ?? targetVessel.environment?.pressure_atm ?? 1).toFixed(2) + ' mL/s' : '—'}
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                          <div className="text-[9px] text-slate-500">Precipitate / Turbidity</div>
                          <div className="text-blue-700 font-bold">
                            {(targetVessel?.precipitateAmount_g || 0).toFixed(2)} g 
                            <span className="text-slate-500 font-normal ml-1">
                              (τ = {(simRuntime?.turbidity || 0).toFixed(2)})
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                          <div className="text-[9px] text-slate-500">Surface Activity</div>
                          <div className="text-emerald-700 font-bold">
                            {((simRuntime?.surfaceActivity || 0) * 100).toFixed(0)}%
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                          <div className="text-[9px] text-slate-500">Bubble / Solid Particles</div>
                          <div className="text-slate-800 font-bold">
                            {simMgr?.boilingSystem.bubbles.length ?? 0} bubble glyphs / {[...(simMgr?.precipitationSystems.values() ?? [])].reduce((sum, system) => sum + system.particles.length, 0)} solid glyphs
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                          <div className="text-[9px] text-slate-500">Frame Budget / FPS</div>
                          <div className="text-emerald-600 font-bold">
                            {fps} FPS <span className="text-slate-500 font-normal">({frameStats.samples > 0 ? frameStats.ms.toFixed(1) : '—'} ms)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Telemetry Grid */}
                {targetVessel && (
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                      <div className="text-[9px] text-slate-500 flex items-center gap-1 font-semibold">
                        <Thermometer size={11} className="text-rose-500" />
                        Temperature
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {targetVessel.temperature_c?.toFixed(1) || '25.0'} °C
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Đầu đo 3D có thời gian đáp ứng riêng.
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                      <div className="text-[9px] text-slate-500 flex items-center gap-1 font-semibold">
                        <Gauge size={11} className="text-blue-500" />
                        pH Level
                      </div>
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{targetVessel.ph?.toFixed(2) || '7.00'}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300"
                          style={{
                            backgroundColor: (targetVessel.ph ?? 7) < 3 ? '#ef4444' : ((targetVessel.ph ?? 7) > 9 ? '#3b82f6' : '#22c55e')
                          }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {(targetVessel.ph ?? 7) < 7 ? 'Acidic' : ((targetVessel.ph ?? 7) > 7 ? 'Basic' : 'Neutral')}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                      <div className="text-[9px] text-slate-500 font-semibold">Volume & Mass</div>
                      <div className="text-sm font-bold text-slate-800">
                        {targetVessel.volume_ml?.toFixed(1) || '0.0'} mL
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Mass: {targetVessel.mass_g?.toFixed(1) || '0.0'} g
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                      <div className="text-[9px] text-slate-500 font-semibold">Phase & Boiling</div>
                      <div className="text-sm font-bold text-slate-800">
                        {targetVessel.isBoiling ? 'Đang sôi' : 'Chưa sôi'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Precip: {targetVessel.hasPrecipitate ? `${(targetVessel.precipitateAmount_g || 0).toFixed(2)} g` : 'None'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conservation Error Telemetry */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-[10px] font-mono shadow-2xs">
                  <div className="flex items-center justify-between text-slate-700 font-bold">
                    <span>Đối chiếu kho chất hiện tại</span>
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <Gauge size={12} className="text-blue-500" />
                      {inventoryReading.status === 'consistent' ? 'Khớp' : inventoryReading.status === 'mismatch' ? 'Lệch' : 'Chưa đủ dữ liệu'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 flex justify-between">
                    <span>Rel. Mass Error:</span>
                    <span className="text-slate-800 font-semibold">{inventoryReading.relativeMassError?.toExponential(2) ?? '—'}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 flex justify-between">
                    <span>Dư điện tích (mô hình 25 °C):</span>
                    <span className="text-slate-800 font-semibold">{inventoryReading.chargeResidual_M == null ? 'Chưa giải' : `${inventoryReading.chargeResidual_M.toExponential(2)} M`}</span>
                  </div>
                </div>

                {/* Educational Hazard Badge */}
                {hazard && (
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[10px]">
                      <ShieldAlert size={13} className="text-rose-600 shrink-0" />
                      <span>{hazard.title}</span>
                    </div>
                    <div className="text-[9px] text-rose-700 leading-relaxed">
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
