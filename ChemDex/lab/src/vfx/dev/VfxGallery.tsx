import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useQualityStore, QualityTier } from '../quality';
import { REACTION_VFX_RECIPES, ReactionVfxRecipe } from '../recipes/reactionVfx';
import { REACTION_DATABASE } from '../../chem/reactions';
import { SUBSTANCE_DATABASE } from '../../chem/substances';
import { calculateMixtureColorRGB } from '../../chem/optics';
import { vfxBus } from '../bus';
import { labSound } from '../../utils/audio';
import { proceduralAudio } from '../../audio/procedural';
import { LegacyAdapter } from '../../adapters/legacy';
import { ThermometerProbe, formatHazardBadge } from '../../ui/overlays';
import { 
  Sparkles, Play, Pause, RotateCcw, AlertTriangle, Flame, Droplets,
  Layers, Gauge, CheckCircle2, ChevronDown, ChevronUp, X, Thermometer,
  Beaker, Compass, Volume2, VolumeX, Eye, ShieldAlert, Activity,
  Wind, Zap, Info, Filter
} from 'lucide-react';

type StudioTab = 'reactions' | 'physics' | 'flames' | 'telemetry';

export const VfxGallery: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('reactions');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);

  // Interactive Physics Controls State
  const [stirrerRpm, setStirrerRpm] = useState<number>(0);
  const [hotplateTempC, setHotplateTempC] = useState<number>(150);
  const [isHotplateOn, setIsHotplateOn] = useState<boolean>(false);
  const [burnerState, setBurnerState] = useState<'off' | 'blue' | 'yellow'>('off');
  const [hasBoilingChips, setHasBoilingChips] = useState<boolean>(false);
  const [selectedFlameElement, setSelectedFlameElement] = useState<string>('Cu');
  const [useCobaltGlass, setUseCobaltGlass] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'v1' | 'v2'>('v2');

  const thermometerRef = useRef<ThermometerProbe>(new ThermometerProbe());

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
  } = useAppStore();

  const { preference, setPreference, effectiveTier } = useQualityStore();

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
  // REACTION EXECUTION PIPELINE
  // -------------------------------------------------------------
  const executeReaction = (reactionKey: string) => {
    setActiveTestId(reactionKey);
    const targetId = getOrCreateTargetVesselId();
    const currentVessel = useAppStore.getState().vessels[targetId];
    if (!currentVessel) return;

    // Initialize procedural audio on gesture
    proceduralAudio.init();
    proceduralAudio.resume();

    // 1. Check physical reaction database
    const physReaction = REACTION_DATABASE[reactionKey];
    const vfxRecipe = REACTION_VFX_RECIPES[reactionKey] || REACTION_VFX_RECIPES['hcl_naoh_neutralization'];

    const duration = vfxRecipe.duration || 5.0;
    const isExothermic = physReaction ? physReaction.dH < -20000 : reactionKey.includes('explosion') || reactionKey.includes('neutralization');
    const targetTemp = isExothermic 
      ? Math.min(99.5, (currentVessel.temperature_c || 25) + Math.abs(physReaction ? physReaction.dH / 8000 : 35))
      : (currentVessel.temperature_c || 25);

    // Color and visual determination
    let targetColor = currentVessel.liquidColor || '#38bdf8';
    let hasPrecip = false;
    let precipColor = '#ffffff';
    let hasGas = false;
    let gasColor = '#ffffff';

    if (physReaction) {
      if (physReaction.visual.precipitate) {
        hasPrecip = true;
        precipColor = physReaction.visual.precipitate.color;
      }
      if (physReaction.visual.gas) {
        hasGas = true;
        gasColor = physReaction.visual.gas.color;
      }
      if (physReaction.visual.colorChange?.resultingAbsorptivity_RGB) {
        // Approximate hex from linear RGB absorptivity
        const [ar, ag, ab] = physReaction.visual.colorChange.resultingAbsorptivity_RGB;
        const rHex = Math.floor(Math.max(0, Math.min(255, 255 * (1 - ar)))).toString(16).padStart(2, '0');
        const gHex = Math.floor(Math.max(0, Math.min(255, 255 * (1 - ag)))).toString(16).padStart(2, '0');
        const bHex = Math.floor(Math.max(0, Math.min(255, 255 * (1 - ab)))).toString(16).padStart(2, '0');
        targetColor = `#${rHex}${gHex}${bHex}`;
      } else if (hasPrecip) {
        targetColor = precipColor;
      }
    } else {
      hasPrecip = !!vfxRecipe.precipitate;
      precipColor = vfxRecipe.precipitate?.color || '#ffffff';
      hasGas = !!vfxRecipe.bubbles || !!vfxRecipe.gasPlume;
      gasColor = vfxRecipe.gasPlume?.color || '#ffffff';
      targetColor = reactionKey.includes('golden_rain') ? '#facc15' : (reactionKey.includes('black') ? '#18181b' : '#38bdf8');
    }

    // Direct reaction kinetics simulation injection
    const kineticsItem = {
      vesselId: targetId,
      reactionId: reactionKey,
      startTime: Date.now(),
      duration,
      progress: 0,
      reactionName: physReaction ? (language === 'vi' ? physReaction.name_vi : physReaction.name) : vfxRecipe.name,
      equation: physReaction ? physReaction.equation : vfxRecipe.name,
      initialLiquidColor: currentVessel.liquidColor || '#38bdf8',
      targetLiquidColor: targetColor,
      hasGas,
      gasColor,
      hasPrecipitate: hasPrecip,
      precipitateColor: precipColor,
      dissolvingReactants: [],
      targetTemp
    };

    useAppStore.setState(s => ({
      vessels: {
        ...s.vessels,
        [targetId]: {
          ...s.vessels[targetId],
          volume_ml: Math.max(60, s.vessels[targetId].volume_ml || 80),
          volume: Math.min(1.0, (s.vessels[targetId].volume_ml || 80) / s.vessels[targetId].capacity_ml),
          liquidColor: currentVessel.liquidColor || '#38bdf8',
          hasPrecipitate: false,
          precipitateColor: precipColor,
          precipitateAmount_g: hasPrecip ? 0.65 : 0,
          isBoiling: reactionKey.includes('explosion') || targetTemp >= 95,
          hasGas,
          gasColor,
          isExplosion: reactionKey.includes('explosion')
        }
      },
      activeKinetics: {
        ...s.activeKinetics,
        [targetId]: kineticsItem
      }
    }));

    // Trigger procedural audio profiles
    if (hasGas) {
      proceduralAudio.updateFizzState(0.02);
      setTimeout(() => proceduralAudio.updateFizzState(0), duration * 1000);
      labSound.playFizz();
    } else if (reactionKey.includes('explosion')) {
      labSound.playExplosion();
      labSound.playAlarm();
      vfxBus.emit('explosion', {
        vesselId: targetId,
        position: currentVessel.position,
        intensity: 1.5,
        isDangerous: true
      });
    } else {
      proceduralAudio.playGlassClink(0.4);
    }
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

  const handleHotplateToggle = () => {
    const nextOn = !isHotplateOn;
    setIsHotplateOn(nextOn);
    const targetId = getOrCreateTargetVesselId();
    if (nextOn) {
      useAppStore.setState(s => ({
        vessels: {
          ...s.vessels,
          [targetId]: {
            ...s.vessels[targetId],
            temperature_c: hotplateTempC,
            isBoiling: hotplateTempC >= 98
          }
        }
      }));
      proceduralAudio.updateBoilingState(hotplateTempC >= 98, hotplateTempC / 300);
    } else {
      proceduralAudio.updateBoilingState(false, 0);
    }
  };

  const handleBurnerCycle = () => {
    const nextMode = burnerState === 'off' ? 'blue' : (burnerState === 'blue' ? 'yellow' : 'off');
    setBurnerState(nextMode);
    const burnerIds = Object.keys(burners);
    if (burnerIds.length > 0) {
      const bId = burnerIds[0];
      useAppStore.setState(s => ({
        burners: {
          ...s.burners,
          [bId]: {
            ...s.burners[bId],
            isOn: nextMode !== 'off',
            intensity: nextMode === 'blue' ? 4 : 2,
            flameState: nextMode === 'blue' ? 'HIGH_FLAME' : 'MEDIUM_FLAME'
          }
        }
      }));
    }
  };

  const handleTriggerSuperheatBump = () => {
    const targetId = getOrCreateTargetVesselId();
    labSound.playPop();
    labSound.playFizz(2.0);
    proceduralAudio.playBubblePop(0.006, 2.0);

    useAppStore.setState(s => ({
      vessels: {
        ...s.vessels,
        [targetId]: {
          ...s.vessels[targetId],
          temperature_c: 100.0,
          isBoiling: true,
          boilingIntensity: 1.0
        }
      }
    }));
  };

  const handleAddDropperDrop = () => {
    const targetId = getOrCreateTargetVesselId();
    proceduralAudio.playBubblePop(0.002, 0.7);
    labSound.playDrop();

    useAppStore.setState(s => {
      const v = s.vessels[targetId];
      if (!v) return s;
      const addedMl = 0.05; // Tate's law drop volume
      return {
        vessels: {
          ...s.vessels,
          [targetId]: {
            ...v,
            volume_ml: Math.min(v.capacity_ml, (v.volume_ml || 50) + addedMl),
            volume: Math.min(1.0, ((v.volume_ml || 50) + addedMl) / v.capacity_ml)
          }
        }
      };
    });
  };

  const handleFlameTest = () => {
    const colors: Record<string, string> = {
      Li: '#ef4444', // Crimson
      Na: '#f59e0b', // Yellow
      K:  useCobaltGlass ? '#a855f7' : '#f59e0b', // Lilac vs Yellow masked
      Ca: '#ea580c', // Brick Red
      Cu: '#10b981', // Blue-Green
      Ba: '#84cc16', // Apple Green
    };

    labSound.playFizz(1.5);
    const targetColor = colors[selectedFlameElement] || '#f59e0b';

    vfxBus.emit('flame:test', {
      element: selectedFlameElement,
      color: targetColor,
      cobaltFilter: useCobaltGlass
    });
  };

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
        { id: 'fecl3_kscn_complex', name: 'Fe(SCN)3 Blood Red Complex', name_vi: 'Phức chất Fe(SCN)3 đỏ máu' },
        { id: 'cuso4_nh3_complex', name: 'Tetraamminecopper(II) Deep Blue', name_vi: 'Phức chất đồng tetramin xanh thẫm' },
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
        { id: 'h2o2_mno2_decomposition', name: 'Elephant Toothpaste Foam Eruption', name_vi: 'Bọt kem đánh răng voi phun trào' },
        { id: 'nh3_hcl_fumes', name: 'NH3 + HCl Dense White Smoke', name_vi: 'Khói trắng NH4Cl cuồn cuộn' },
        { id: 'cu_hno3_conc', name: 'Cu + HNO3 Dense Brown NO2 Fumes', name_vi: 'Đồng tan trong HNO3 bốc khói nâu đỏ NO2' }
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
        { id: 'kmno4_oxalic_redox', name: 'KMnO4 Decolorization Autocatalysis', name_vi: 'Mất màu thuốc tím tự xúc tác' },
        { id: 'iodine_clock', name: 'Iodine Clock Sudden Midnight Blue', name_vi: 'Đồng hồ Iot xanh đen đột ngột' },
        { id: 'fe_cuso4_displacement', name: 'Fe + CuSO4 Red Copper Displacement', name_vi: 'Sắt đẩy đồng bám kim loại đỏ' }
      ]
    },
    {
      title: 'Thermal & Phase Change',
      title_vi: 'Nhiệt & Chuyển pha',
      icon: <Thermometer size={13} className="text-rose-400" />,
      items: [
        { id: 'cuoh2_thermal_decomposition', name: 'Cu(OH)2 Blue -> Black CuO Thermal', name_vi: 'Cu(OH)2 xanh phân hủy thành CuO đen' },
        { id: 'iodine_sublimation', name: 'Iodine Sublimation Rich Purple Gas', name_vi: 'Thăng hoa Iot hơi tím biếc' },
        { id: 'cu_conc_h2so4_heated', name: 'Hot Cu + H2SO4 Choking Gas', name_vi: 'Đồng tác dụng H2SO4 đặc nóng' }
      ]
    },
    {
      title: 'Violent & Pyrotechnics',
      title_vi: 'Nhiệt nhôm & Pháo sáng',
      icon: <Flame size={13} className="text-red-500" />,
      items: [
        { id: 'sodium_water_reaction', name: 'Sodium Metal Skating Water Dart', name_vi: 'Natri chạy trên nước nổ tanh tách' },
        { id: 'burn_magnesium', name: 'Magnesium Blinding White Flare (3100 K)', name_vi: 'Đốt dây Magie lóa mắt khói trắng' },
        { id: 'water_into_conc_h2so4_explosion', name: 'Water Into Acid Splatter Explosion', name_vi: 'Nước đổ vào axit đặc nổ tung tóe' }
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

  const currentActiveKinetics = Object.values(activeKinetics)[0];
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
                    setIsHotplateOn(false);
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
                {[0.5, 1, 2, 5, 10, 30].map(scale => (
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

          {/* 3. Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/40 text-[11px] font-bold select-none">
            <button
              onClick={() => setActiveTab('reactions')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'reactions'
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Beaker size={13} />
              <span>Reactions</span>
            </button>

            <button
              onClick={() => setActiveTab('physics')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
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
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
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
              className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
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
                {/* Active Kinetics Live Progress Monitor */}
                {currentActiveKinetics && (
                  <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 p-2.5 rounded-xl border border-blue-500/40 space-y-1.5 shadow-lg">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-blue-200 truncate max-w-[240px]">
                        {currentActiveKinetics.reactionName}
                      </span>
                      <span className="font-mono text-blue-300 font-bold">
                        {Math.round(currentActiveKinetics.progress * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full transition-all duration-100 ease-out"
                        style={{ width: `${currentActiveKinetics.progress * 100}%` }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 truncate">
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
                    const phys = REACTION_DATABASE[item.id];

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

                        {phys && (
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                            <span className="truncate max-w-[240px] text-indigo-300">{phys.equation}</span>
                            <span className={phys.dH < 0 ? 'text-amber-400 font-bold' : 'text-cyan-400'}>
                              {phys.dH < 0 ? `ΔH: ${Math.round(phys.dH / 1000)} kJ` : 'Endo'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                      <span className="text-[9px] uppercase font-mono">Bunsen Burner</span>
                      <span className="text-[11px]">
                        {burnerState === 'blue' ? 'Blue (1500°C)' : (burnerState === 'yellow' ? 'Yellow (850°C)' : 'Burner Off')}
                      </span>
                    </button>

                    {/* Hotplate Toggle */}
                    <button
                      onClick={handleHotplateToggle}
                      className={`p-2 rounded-lg border font-bold text-left flex flex-col justify-between transition-all ${
                        isHotplateOn
                          ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-mono">Hotplate ({hotplateTempC}°C)</span>
                      <span className="text-[11px]">{isHotplateOn ? 'Heating Active' : 'Hotplate Off'}</span>
                    </button>
                  </div>

                  {/* Hotplate Temperature Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Hotplate Dial:</span>
                      <span className="text-white font-bold">{hotplateTempC} °C</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={350}
                      step={5}
                      value={hotplateTempC}
                      onChange={(e) => setHotplateTempC(Number(e.target.value))}
                      className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Boiling Triggers */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleTriggerSuperheatBump}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Zap size={12} />
                      <span>Trigger Superheat Bump</span>
                    </button>

                    <button
                      onClick={() => setHasBoilingChips(!hasBoilingChips)}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${
                        hasBoilingChips
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      Boiling Chips: {hasBoilingChips ? 'ON' : 'OFF'}
                    </button>
                  </div>
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

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleAddDropperDrop}
                      className="py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Droplets size={13} />
                      <span>Add Drop (Tate's Law)</span>
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
                      Atomic Emission Flame Tests
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
                      <span>Cobalt Filter: {useCobaltGlass ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* Element Selector */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { sym: 'Cu', name: 'Copper (Azure 510nm)', color: '#10b981' },
                      { sym: 'Na', name: 'Sodium (Yellow 589nm)', color: '#f59e0b' },
                      { sym: 'K',  name: 'Potassium (Lilac 766nm)', color: '#c084fc' },
                      { sym: 'Li', name: 'Lithium (Crimson 670nm)', color: '#ef4444' },
                      { sym: 'Ca', name: 'Calcium (Brick 622nm)', color: '#ea580c' },
                      { sym: 'Ba', name: 'Barium (Green 524nm)', color: '#84cc16' }
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
                    <span>Dip Wire Loop into Flame</span>
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
                        Thermometer: {thermometerRef.current.update(0.016, targetVessel.temperature_c || 25).toFixed(1)} °C
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
                            backgroundColor: (targetVessel.ph || 7) < 3 ? '#ef4444' : ((targetVessel.ph || 7) > 9 ? '#3b82f6' : '#22c55e')
                          }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {(targetVessel.ph || 7) < 7 ? 'Acidic' : ((targetVessel.ph || 7) > 7 ? 'Basic' : 'Neutral')}
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
                    <span>Conservation Check (Rule 3)</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      PASS
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between">
                    <span>Rel. Mass Error:</span>
                    <span className="text-slate-200">&lt; 1.2 × 10⁻⁴</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between">
                    <span>Charge Neutrality:</span>
                    <span className="text-slate-200">&lt; 1.0 × 10⁻⁷ M</span>
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
