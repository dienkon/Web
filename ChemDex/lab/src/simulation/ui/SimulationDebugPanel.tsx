import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SimulationEngine } from '../core/SimulationEngine';
import { PourController } from '../../pour/controller/PourController';
import { PourSessionState } from '../../pour/controller/modes';
import { kineticsEngine, ReactionProgressState } from '../chemistry/KineticsEngine';
import { useSimulationDebugStore } from '../core/debugStore';

export const SimulationDebugPanel = React.memo(function SimulationDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const vessels = useAppStore(state => state.vessels);
  const selectedVesselId = useAppStore(state => state.selectedVesselId) || Object.keys(vessels)[0];
  const setVesselState = useAppStore(state => state.setVesselState);
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);

  const vessel = vessels[selectedVesselId];
  const mgr = selectedVesselId ? SimulationEngine.getManager(selectedVesselId) : null;

  // Debug Gizmos Store
  const showGravity = useSimulationDebugStore(s => s.showGravity);
  const showLiquidPlane = useSimulationDebugStore(s => s.showLiquidPlane);
  const showPourTrajectory = useSimulationDebugStore(s => s.showPourTrajectory);
  const showMixingZone = useSimulationDebugStore(s => s.showMixingZone);
  const showSedimentBounds = useSimulationDebugStore(s => s.showSedimentBounds);
  const toggleDebug = useSimulationDebugStore(s => s.toggleDebug);

  // Live pour session state
  const [session, setSession] = useState<PourSessionState | null>(null);
  const [activeRxns, setActiveRxns] = useState<ReactionProgressState[]>([]);

  // FPS & Frame timing
  const [fps, setFps] = useState<number>(60);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.6);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 500) {
        const delta = now - lastTime;
        const currentFps = Math.round((frameCount * 1000) / delta);
        setFps(currentFps);
        setFrameTimeMs(parseFloat((delta / frameCount).toFixed(1)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Poll telemetry at 10Hz
  useEffect(() => {
    const unsub = PourController.subscribe(s => setSession(s));
    const interval = setInterval(() => {
      if (selectedVesselId) {
        setActiveRxns([...kineticsEngine.getVesselReactions(selectedVesselId)]);
      }
    }, 100);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [selectedVesselId]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-40 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105"
        title="Open Simulation Physics & Thermodynamics Debug Panel"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-semibold tracking-wider">SIM LAB ENGINE</span>
        <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
          {fps} FPS ({frameTimeMs}ms)
        </span>
      </button>
    );
  }

  // Pre-configured Test Scenarios (TEST 1 to TEST 8)
  const applyScenario = (testNum: number) => {
    if (!selectedVesselId || !vessel) return;

    switch (testNum) {
      case 1: // TEST 1: Room temperature water
        setVesselState(selectedVesselId, {
          temperature_c: 25.0,
          isBoiling: false,
          boilingIntensity: 0,
          hasPrecipitate: false,
          hasGas: false,
          volume_ml: 120
        });
        break;

      case 2: // TEST 2: Slow heating towards microbubble onset
        setVesselState(selectedVesselId, {
          temperature_c: 84.0,
          isBoiling: false,
          boilingIntensity: 0.1,
          volume_ml: 120
        });
        break;

      case 3: // TEST 3: Active rolling boil
        setVesselState(selectedVesselId, {
          temperature_c: 99.5,
          isBoiling: true,
          boilingIntensity: 0.85,
          volume_ml: 100
        });
        break;

      case 4: // TEST 4: Precipitation reaction (BaSO4 / PbI2)
        setVesselState(selectedVesselId, {
          hasPrecipitate: true,
          precipitateAmount_g: 0.45,
          precipitateColor: '#facc15', // Golden Rain
          liquidColor: '#fef08a'
        });
        if (mgr) {
          mgr.precipitationSystem.setSubstance('PbI2');
        }
        break;

      case 5: // TEST 5: Stirring resuspension
        setActiveTool('stirring_rod');
        break;

      case 6: // TEST 6: Evaporation concentration
        setVesselState(selectedVesselId, {
          temperature_c: 75.0,
          volume_ml: 60,
          evaporated_ml: 40
        });
        break;

      case 7: // TEST 7: Intense heating with vapor plume
        setVesselState(selectedVesselId, {
          temperature_c: 100.0,
          isBoiling: true,
          boilingIntensity: 1.0,
          volume_ml: 80
        });
        break;

      case 8: // TEST 8: Airflow draft deflection
        if (mgr) {
          mgr.evaporationSystem.update(0.016, {
            temp_c: 100,
            surfaceArea_cm2: 25,
            radius: 0.5,
            surfaceY: 0.2,
            mouthY: 1.0,
            mouthRadius: 0.35,
            isBoiling: true,
            airflowVector: [1.5, 0, 0]
          });
        }
        break;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-40 w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs font-mono text-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide text-white">PHYSICS & TELEMETRY</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
            fps >= 50 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'
          }`}>
            {fps} FPS ({frameTimeMs}ms)
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {vessel ? (
        <div className="space-y-3 max-h-[78vh] overflow-y-auto pr-1">
          {/* Target Vessel Info */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex justify-between text-slate-400 text-[10px] uppercase">
              <span>Bình: <strong className="text-white">{vessel.name}</strong></span>
              <span>Dạng: <strong className="text-cyan-400">{vessel.type}</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>Nhiệt độ: <span className="text-amber-400 font-bold">{vessel.temperature_c}°C</span></div>
              <div>Thể tích: <span className="text-cyan-400 font-bold">{vessel.volume_ml.toFixed(1)} mL</span></div>
              <div>Sôi: <span className={vessel.isBoiling ? 'text-rose-400 font-bold' : 'text-slate-400'}>{vessel.isBoiling ? 'Đang sôi' : 'Bình thường'}</span></div>
              <div>Kết tủa: <span className={vessel.hasPrecipitate ? 'text-amber-400 font-bold' : 'text-slate-400'}>{vessel.hasPrecipitate ? `${(vessel.precipitateAmount_g || 0).toFixed(2)}g` : 'Không'}</span></div>
            </div>
          </div>

          {/* Real-time Pouring & Transfer Telemetry */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block border-b border-slate-800 pb-1">
              Rót Dung Dịch (Continuous Pouring Pipeline)
            </span>
            {session ? (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái:</span>
                  <span className="text-emerald-400 font-bold uppercase">{session.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tốc độ dòng (Flow Rate):</span>
                  <span className="text-cyan-300 font-bold">{session.flow_ml_s.toFixed(2)} mL/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Đã chuyển (Transferred):</span>
                  <span className="text-amber-300 font-bold">{session.transferred_ml.toFixed(1)} mL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Góc nghiêng / Spill:</span>
                  <span>{((session.tilt * 180) / Math.PI).toFixed(1)}° | {session.spilled_ml > 0 ? `${session.spilled_ml.toFixed(1)}mL đổ` : '0 mL'}</span>
                </div>
                {session.wallClinging && (
                  <div className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                    ⚠ Wall-clinging: Góc rót quá nông gây chảy bám thành bình!
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500 text-[11px] py-0.5">
                Chưa có phiên rót đang hoạt động. Kéo thả bình để bắt đầu rót thực tế.
              </div>
            )}
          </div>

          {/* Chemical Kinetics Engine Telemetry */}
          {activeRxns.length > 0 && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold block border-b border-slate-800 pb-1">
                Động Học Phản Ứng (Continuous Kinetics)
              </span>
              {activeRxns.map(rxn => (
                <div key={rxn.reactionId} className="space-y-1 text-[11px]">
                  <div className="font-bold text-white flex justify-between">
                    <span>{rxn.reaction.summary_vi || rxn.reaction.summary_en || rxn.reaction.equation}</span>
                    <span className="text-emerald-400">{Math.round(rxn.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-100"
                      style={{ width: `${Math.round(rxn.progress * 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-400 pt-0.5">
                    <div>Khí sinh: <span className="text-cyan-300 font-bold">{rxn.gasGenerationRate_ml_s.toFixed(2)} mL/s</span></div>
                    <div>Tủa sinh: <span className="text-amber-300 font-bold">{rxn.precipitateGenerationRate_g_s.toFixed(3)} g/s</span></div>
                    <div>Tỏa nhiệt: <span className="text-rose-300 font-bold">{rxn.heatReleaseRate_W.toFixed(1)} W</span></div>
                    <div>Vùng trộn: <span className="text-indigo-300 font-bold">r = {rxn.localMixingPlume.radius.toFixed(2)}m</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Real-time Physical Telemetry */}
          {mgr && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block border-b border-slate-800 pb-1">
                Mô Phỏng Vật Lý & Nhiệt Động Học
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <div>Giai đoạn sôi: <span className="text-rose-300 font-bold">{mgr.boilingSystem.bubbles.length > 0 ? `${mgr.boilingSystem.bubbles.length} bọt khí` : 'Chưa sôi'}</span></div>
                <div>Tốc độ bay hơi: <span className="text-cyan-300 font-bold">{(mgr.evaporationSystem.currentRate_ml_s * 60).toFixed(2)} mL/phút</span></div>
                <div>Độ đục dung dịch: <span className="text-indigo-300 font-bold">{Math.round(mgr.precipitationSystem.cloudiness * 100)}%</span></div>
                <div>Cặn đáy bình: <span className="text-amber-300 font-bold">{(mgr.precipitationSystem.sedimentBed.amount_g).toFixed(2)}g ({(mgr.precipitationSystem.sedimentBed.thickness * 100).toFixed(1)}cm)</span></div>
                <div>Độ nhớt: <span className="text-emerald-300 font-bold">1.0 mPa·s</span></div>
                <div>Khuấy cơ học: <span className={activeTool === 'stirring_rod' ? 'text-cyan-400 font-bold' : 'text-slate-400'}>{activeTool === 'stirring_rod' ? 'Đang khuấy' : 'Tĩnh'}</span></div>
              </div>
            </div>
          )}

          {/* Debug Visualization 3D Gizmo Toggles */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block border-b border-slate-800 pb-1">
              Hiển Thị Trực Quan Debug (3D Gizmos)
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => toggleDebug('showGravity')}
                className={`p-1.5 rounded border text-left flex items-center justify-between transition-colors ${
                  showGravity ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <span>Vector Gravity</span>
                <span>{showGravity ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => toggleDebug('showLiquidPlane')}
                className={`p-1.5 rounded border text-left flex items-center justify-between transition-colors ${
                  showLiquidPlane ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <span>Mặt Phẳng Ngang</span>
                <span>{showLiquidPlane ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => toggleDebug('showPourTrajectory')}
                className={`p-1.5 rounded border text-left flex items-center justify-between transition-colors ${
                  showPourTrajectory ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <span>Quỹ Đạo Rót Parabol</span>
                <span>{showPourTrajectory ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => toggleDebug('showMixingZone')}
                className={`p-1.5 rounded border text-left flex items-center justify-between transition-colors ${
                  showMixingZone ? 'bg-pink-950/80 text-pink-300 border-pink-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <span>Vùng Trộn Cục Bộ</span>
                <span>{showMixingZone ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => toggleDebug('showSedimentBounds')}
                className={`p-1.5 rounded border text-left flex items-center justify-between transition-colors col-span-2 ${
                  showSedimentBounds ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <span>Giới Hạn Lớp Cặn Lắng (Sediment Bed Bounds)</span>
                <span>{showSedimentBounds ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Physics Sliders */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Điều Khiển Mô Phỏng Trực Tiếp
            </span>
            
            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Nhiệt độ dung dịch:</span>
                <span className="text-amber-400 font-bold">{vessel.temperature_c}°C</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="0.5"
                value={vessel.temperature_c}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVesselState(selectedVesselId, {
                    temperature_c: val,
                    isBoiling: val >= 98,
                    boilingIntensity: val >= 98 ? (val - 98) / 2 : 0
                  });
                }}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Precipitation Amount Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Lượng kết tủa:</span>
                <span className="text-amber-300 font-bold">{(vessel.precipitateAmount_g || 0).toFixed(2)} g</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={vessel.precipitateAmount_g || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVesselState(selectedVesselId, {
                    hasPrecipitate: val > 0,
                    precipitateAmount_g: val,
                    precipitateColor: vessel.precipitateColor || '#eab308'
                  });
                }}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Stirring Button */}
            <div className="pt-1">
              <button
                onClick={() => setActiveTool(activeTool === 'stirring_rod' ? 'none' : 'stirring_rod')}
                className={`w-full py-1.5 rounded-lg font-bold text-center transition-all ${
                  activeTool === 'stirring_rod'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {activeTool === 'stirring_rod' ? 'Dừng khuấy (Sediment lắng lại)' : 'Dùng đũa khuấy (Khuấy cặn đáy lên)'}
              </button>
            </div>
          </div>

          {/* Test Scenarios Quick Run */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block border-b border-slate-800 pb-1">
              Kịch Bản Kiểm Thử Chuẩn (Test Scenarios)
            </span>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => applyScenario(1)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-[10px] text-left transition-colors"
              >
                1. Nước nguội (25°C)
              </button>
              <button
                onClick={() => applyScenario(2)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-[10px] text-left transition-colors"
              >
                2. Làm ấm (84°C)
              </button>
              <button
                onClick={() => applyScenario(3)}
                className="bg-slate-800 hover:bg-slate-700 text-rose-300 px-2 py-1 rounded text-[10px] text-left transition-colors font-bold"
              >
                3. Sôi mạnh (99.5°C)
              </button>
              <button
                onClick={() => applyScenario(4)}
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-1 rounded text-[10px] text-left transition-colors font-bold"
              >
                4. Tạo kết tủa PbI2
              </button>
              <button
                onClick={() => applyScenario(5)}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-1 rounded text-[10px] text-left transition-colors"
              >
                5. Khuấy cặn lắng
              </button>
              <button
                onClick={() => applyScenario(6)}
                className="bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2 py-1 rounded text-[10px] text-left transition-colors"
              >
                6. Bay hơi (75°C)
              </button>
              <button
                onClick={() => applyScenario(7)}
                className="bg-slate-800 hover:bg-slate-700 text-orange-300 px-2 py-1 rounded text-[10px] text-left transition-colors"
              >
                7. Đun cạn dung môi
              </button>
              <button
                onClick={() => applyScenario(8)}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2 py-1 rounded text-[10px] text-left transition-colors"
              >
                8. Luồng gió tản hơi
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-400 py-6 text-center">
          Vui lòng chọn hoặc đặt một bình lên bàn thí nghiệm.
        </div>
      )}
    </div>
  );
});
