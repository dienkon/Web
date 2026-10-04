import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useQualityStore, QualityTier } from '../quality';
import { REACTION_VFX_RECIPES, ReactionVfxRecipe } from '../recipes/reactionVfx';
import { vfxBus } from '../bus';
import { labSound } from '../../utils/audio';
import { 
  Sparkles, Play, Pause, RotateCcw, AlertTriangle, Flame, Droplets,
  Layers, Gauge, CheckCircle2, ChevronDown, ChevronUp, X
} from 'lucide-react';

export const VfxGallery: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const {
    vessels,
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

  // Check URL param ?vfx=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('vfx') === '1') {
        setIsVisible(true);
      }
    }
  }, []);

  if (!isVisible) {
    // Show subtle floating trigger button in development
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 bg-slate-900/90 text-white rounded-lg shadow-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-600 transition-all backdrop-blur-md"
        title="Open VFX Gallery (?vfx=1)"
      >
        <Sparkles size={14} className="text-amber-400" />
        <span>VFX Studio</span>
      </button>
    );
  }

  // Find or create test beaker
  const getOrCreateTestVesselId = (): string => {
    const existing = Object.values(vessels).find(v => v.type === 'beaker');
    if (existing) return existing.id;
    addVessel('beaker');
    const updated = Object.values(useAppStore.getState().vessels).find(v => v.type === 'beaker');
    return updated ? updated.id : 'beaker_1';
  };

  const triggerRecipeTest = (recipe: ReactionVfxRecipe) => {
    setActiveTestId(recipe.id);
    const targetId = getOrCreateTestVesselId();
    const currentVessel = useAppStore.getState().vessels[targetId];

    if (!currentVessel) return;

    // Direct reaction kinetics simulation injection
    const kineticsDuration = recipe.duration || 5.0;

    const kineticsItem = {
      vesselId: targetId,
      reactionId: recipe.id,
      startTime: Date.now(),
      duration: kineticsDuration,
      progress: 0,
      reactionName: recipe.name,
      equation: recipe.name,
      initialLiquidColor: currentVessel.liquidColor || '#38bdf8',
      targetLiquidColor: recipe.id.includes('precipitation') || recipe.id.includes('pbi2') ? '#facc15' : '#60a5fa',
      hasGas: !!recipe.bubbles || !!recipe.gasPlume,
      gasColor: recipe.gasPlume?.color || '#ffffff',
      hasPrecipitate: !!recipe.precipitate,
      precipitateColor: recipe.precipitate?.color || '#ffffff',
      dissolvingReactants: [],
      targetTemp: recipe.id.includes('explosion') ? 85 : 45
    };

    useAppStore.setState(s => ({
      vessels: {
        ...s.vessels,
        [targetId]: {
          ...s.vessels[targetId],
          volume_ml: Math.max(50, s.vessels[targetId].volume_ml || 60),
          volume: Math.min(1.0, (s.vessels[targetId].volume_ml || 60) / s.vessels[targetId].capacity_ml),
          hasPrecipitate: false,
          precipitateColor: recipe.precipitate?.color,
          isBoiling: recipe.id.includes('explosion'),
          hasGas: !!recipe.bubbles,
          gasColor: recipe.gasPlume?.color,
          isExplosion: recipe.id.includes('explosion')
        }
      },
      activeKinetics: {
        ...s.activeKinetics,
        [targetId]: kineticsItem
      }
    }));

    if (recipe.soundEffect) {
      if (recipe.soundEffect === 'fizz') labSound.playFizz();
      else if (recipe.soundEffect === 'boil') labSound.playFizz(3.0);
      else if (recipe.soundEffect === 'pop') labSound.playPop();
      else if (recipe.soundEffect === 'alarm') {
        labSound.playExplosion();
        labSound.playAlarm();
      }
    }

    if (recipe.id.includes('explosion')) {
      vfxBus.emit('explosion', {
        vesselId: targetId,
        position: currentVessel.position,
        intensity: 1.2,
        isDangerous: true
      });
    }
  };

  const currentActiveKinetics = Object.values(activeKinetics)[0];

  const categories = [
    {
      title: 'Neutralization & Temp',
      ids: ['hcl_naoh_neutralization', 'h2so4_naoh_neutralization']
    },
    {
      title: 'Precipitation Crystals',
      ids: ['golden_rain_pbi2', 'bacl2_h2so4_precipitate', 'agno3_nacl_precipitate', 'cuso4_naoh_precipitate', 'fe_cuso4_displacement']
    },
    {
      title: 'Gas & Effervescence',
      ids: ['caco3_hcl_gas', 'zn_hcl_gas', 'mg_hcl_gas', 'na2co3_hcl_gas', 'nh3_hcl_fumes']
    },
    {
      title: 'High Heat & Decomposition',
      ids: ['h2o2_mno2_decomposition', 'cuoh2_thermal_decomposition', 'iodine_sublimation', 'cu_hno3_conc', 'cu_conc_h2so4_heated']
    },
    {
      title: 'Explosions & Violent Reactions',
      ids: ['water_into_conc_h2so4_explosion', 'sodium_water_reaction']
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[85vh] bg-slate-900/95 text-slate-200 rounded-xl shadow-2xl border border-slate-700/80 flex flex-col backdrop-blur-lg overflow-hidden transition-all text-xs font-sans">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
            VFX Test Harness (?vfx=1)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3 overflow-y-auto space-y-3.5 flex-1 max-h-[calc(85vh-45px)]">
          {/* Quality Tier Switcher */}
          <div className="space-y-1.5 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Layers size={13} className="text-blue-400" />
                Quality Tier
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                Active: {effectiveTier.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['low', 'medium', 'high', 'auto'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setPreference(t)}
                  className={`py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    preference === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Time & Simulation Controls */}
          <div className="flex items-center justify-between bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setSimulationPaused(!isSimulationPaused)}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1 text-[11px] transition-colors ${
                isSimulationPaused
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              {isSimulationPaused ? <Play size={12} /> : <Pause size={12} />}
              {isSimulationPaused ? 'Resume' : 'Pause'}
            </button>

            <div className="flex items-center gap-1">
              {[0.25, 0.5, 1, 2, 4].map(scale => (
                <button
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                    timeScale === scale
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {scale}x
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                resetWorkbench();
                setActiveTestId(null);
              }}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded transition-colors"
              title="Reset Workbench"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Real-time Kinetics Telemetry Progress Bar */}
          {currentActiveKinetics && (
            <div className="space-y-1 bg-slate-800/70 p-2.5 rounded-lg border border-blue-500/30">
              <div className="flex justify-between text-[10px] text-slate-300 font-mono">
                <span className="truncate max-w-[200px]">{currentActiveKinetics.reactionName}</span>
                <span>{Math.round(currentActiveKinetics.progress * 100)}%</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-100 ease-out"
                  style={{ width: `${currentActiveKinetics.progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Grouped Reaction Recipe Triggers */}
          <div className="space-y-3">
            {categories.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {cat.title}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {cat.ids.map(id => {
                    const recipe = REACTION_VFX_RECIPES[id];
                    if (!recipe) return null;
                    const isCurrent = activeTestId === id;

                    return (
                      <button
                        key={id}
                        onClick={() => triggerRecipeTest(recipe)}
                        className={`text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-blue-600/30 border border-blue-500 text-blue-200'
                            : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 text-slate-300'
                        }`}
                      >
                        <span className="truncate font-medium">{recipe.name}</span>
                        {isCurrent && <CheckCircle2 size={12} className="text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
