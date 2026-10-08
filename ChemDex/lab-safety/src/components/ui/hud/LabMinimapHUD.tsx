import React, { useState, useEffect } from 'react';
import { playerCoords, useStore } from '../../../store/useStore';
import { getActiveObjective } from '../../3d/lab/ObjectiveMarker';
import { Map, Maximize2, Minimize2, Navigation } from 'lucide-react';

const ROOM_WIDTH = 20; // -10 to +10 meters
const ROOM_DEPTH = 15; // -7.5 to +7.5 meters

export const LabMinimapHUD: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [playerPos, setPlayerPos] = useState<[number, number]>([-4.0, 3.2]);
  const [playerAngle, setPlayerAngle] = useState(0);
  const [activeObjectivePos, setActiveObjectivePos] = useState<[number, number] | null>(null);

  const currentPhase = useStore((s) => s.currentPhase);
  const tasks = useStore((s) => s.tasks);
  const playerFlags = useStore((s) => s.player.flags);
  const view = useStore((s) => s.view);

  // High-frequency tick for minimap coordinates & rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerPos([playerCoords.position[0], playerCoords.position[2]]);
      setPlayerAngle(playerCoords.rotationY);

      const obj = getActiveObjective(currentPhase, tasks, playerFlags);
      if (obj) {
        setActiveObjectivePos([obj.position[0], obj.position[2]]);
      } else {
        setActiveObjectivePos(null);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [currentPhase, tasks, playerFlags]);

  // Keyboard shortcut M to toggle expanded map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !e.repeat) {
        setIsExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (view !== 'game') return null;

  // Coordinate mapper: 3D world (meters) -> SVG map percentages (%)
  const toMapX = (x: number) => ((x + ROOM_WIDTH / 2) / ROOM_WIDTH) * 100;
  const toMapY = (z: number) => ((z + ROOM_DEPTH / 2) / ROOM_DEPTH) * 100;

  const playerScreenX = toMapX(playerPos[0]);
  const playerScreenY = toMapY(playerPos[1]);

  // Objective position in %
  const objectiveScreen = activeObjectivePos
    ? { x: toMapX(activeObjectivePos[0]), y: toMapY(activeObjectivePos[1]) }
    : null;

  // Player rotation in degrees for SVG
  const rotDeg = (-playerAngle * 180) / Math.PI;

  return (
    <div
      className={`fixed transition-all duration-300 pointer-events-auto select-none z-40 ${
        isExpanded
          ? 'inset-6 md:inset-16 flex items-center justify-center bg-slate-950/80 backdrop-blur-md rounded-3xl p-6 border border-cyan-500/40 shadow-2xl'
          : 'bottom-4 left-4'
      }`}
    >
      <div
        className={`relative rounded-2xl bg-slate-950/90 border border-cyan-500/50 shadow-2xl overflow-hidden flex flex-col ${
          isExpanded ? 'w-full max-w-4xl h-full max-h-[85vh]' : 'w-56 h-44'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-cyan-500/30 text-white">
          <div className="flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-cyan-300 font-mono">
              LAB RADAR {isExpanded ? '[BẢN ĐỒ MẶT BẰNG 20m x 15m]' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              X:{playerPos[0].toFixed(1)}m | Z:{playerPos[1].toFixed(1)}m
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer transition-colors"
              title={isExpanded ? 'Thu nhỏ [M]' : 'Phóng to [M]'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2D Architectural Vector Canvas */}
        <div className="relative flex-1 bg-slate-950/95 overflow-hidden">
          {/* Blueprint Grid Lines */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
              backgroundSize: isExpanded ? '40px 40px' : '20px 20px',
            }}
          />

          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer Wall Boundary */}
            <rect x="1" y="1" width="98" height="98" fill="none" stroke="#0ea5e9" strokeWidth="0.8" opacity="0.6" />

            {/* Teaching Stage & North Board (Z = -7.0) */}
            <rect x="35" y="2" width="30" height="5" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />

            {/* 4 Island Benches */}
            {/* Northwest Bench 1 */}
            <rect x="12" y="22" width="28" height="15" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.6" />
            {/* Northeast Bench 2 */}
            <rect x="60" y="22" width="28" height="15" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.6" />
            {/* Southwest Bench 3 */}
            <rect x="12" y="52" width="28" height="15" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.6" />
            {/* Southeast Bench 4 */}
            <rect x="60" y="52" width="28" height="15" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.6" />

            {/* Fume Hood at Northeast (X = 8.8, Z = -3.5) */}
            <rect x="88" y="20" width="10" height="15" fill="#0369a1" stroke="#38bdf8" strokeWidth="0.7" />

            {/* Chemical Storage Shelves at East (X = 9.5) */}
            <rect x="94" y="42" width="5" height="25" fill="#854d0e" stroke="#eab308" strokeWidth="0.5" />

            {/* Waste Station at Southeast (X = 7.5, Z = 6.0) */}
            <rect x="80" y="86" width="15" height="10" rx="1" fill="#15803d" stroke="#22c55e" strokeWidth="0.5" />

            {/* PPE Locker & Handwash Station at South Entrance */}
            <rect x="15" y="86" width="20" height="10" rx="1" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="0.5" />

            {/* Emergency Shower & Eyewash Station at West Wall (X = -9.2, Z = -4.0) */}
            <circle cx="5" cy="23" r="3.5" fill="#ca8a04" stroke="#facc15" strokeWidth="0.6" />

            {/* First Aid Cabinet at West Wall (X = -9.85, Z = 1.0) */}
            <rect x="1" y="52" width="3" height="6" fill="#15803d" stroke="#22c55e" strokeWidth="0.6" />

            {/* Fire Extinguisher Cabinet (X = -9.85, Z = -1.5) */}
            <rect x="1" y="38" width="3" height="6" fill="#b91c1c" stroke="#ef4444" strokeWidth="0.6" />

            {/* Exit Doors (South Wall) */}
            <line x1="28" y1="99" x2="36" y2="99" stroke="#22c55e" strokeWidth="2" />
            <line x1="68" y1="99" x2="76" y2="99" stroke="#22c55e" strokeWidth="2" />

            {/* Active Objective Target Beacon */}
            {objectiveScreen && (
              <g transform={`translate(${objectiveScreen.x}, ${objectiveScreen.y})`}>
                <circle r="4" fill="none" stroke="#eab308" strokeWidth="0.8" className="animate-ping" />
                <circle r="2.2" fill="#eab308" />
              </g>
            )}

            {/* Player Indicator + Field of View Cone */}
            <g transform={`translate(${playerScreenX}, ${playerScreenY})`}>
              {/* FOV Directional Flashlight Cone */}
              <g transform={`rotate(${rotDeg})`}>
                <polygon
                  points="0,0 -8,-18 8,-18"
                  fill="url(#playerFovGradient)"
                  opacity="0.45"
                />
                <line x1="0" y1="0" x2="0" y2="-12" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
              </g>

              {/* Player Center Dot */}
              <circle r="2.8" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
              <circle r="1.2" fill="#ffffff" />
            </g>

            {/* Linear Gradients */}
            <defs>
              <linearGradient id="playerFovGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Icon Overlays & Tooltips */}
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-yellow-400"
            style={{ left: '3%', top: '21%' }}
            title="Trạm Tắm & Rửa Mắt Khẩn Cấp"
          >
            🚿
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-rose-400"
            style={{ left: '1%', top: '38%' }}
            title="Tủ Bình Chữa Cháy"
          >
            🧯
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-emerald-400"
            style={{ left: '1%', top: '53%' }}
            title="Tủ Sơ Cứu Y Tế"
          >
            🩹
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-cyan-300"
            style={{ right: '5%', top: '25%' }}
            title="Tủ Hút Khí Độc Fume Hood"
          >
            💨
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-amber-400"
            style={{ left: '67.5%', top: '33.3%' }}
            title="Đèn Khí Bunsen & Van Gas Bàn 2"
          >
            🔥
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-amber-500"
            style={{ left: '62.5%', top: '56.6%' }}
            title="Vị Trí Sự Cố Tràn Đổ Hóa Chất"
          >
            ⚠️
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-yellow-300"
            style={{ right: '1%', top: '50%' }}
            title="Tủ Lưu Trữ Hóa Chất Cách Ly (GHS)"
          >
            🗄️
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-emerald-400"
            style={{ left: '29%', bottom: '2%' }}
            title="Cửa Thoát Hiểm A"
          >
            🚪
          </div>
          <div
            className="absolute text-[8px] sm:text-[10px] font-bold text-emerald-400"
            style={{ right: '28%', bottom: '2%' }}
            title="Cửa Thoát Hiểm B"
          >
            🚪
          </div>
        </div>

        {/* Legend for Expanded Mode */}
        {isExpanded && (
          <div className="p-3 bg-slate-900/95 border-t border-cyan-500/30 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Vị trí người chơi (FPS)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" /> Mục tiêu nhiệm vụ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-yellow-400">🚿</span> Tắm & Rửa mắt khẩn cấp (-9.2m)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">🩹</span> Tủ sơ cứu y tế (-9.8m)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-rose-400">🧯</span> Bình chữa cháy CO2/ABC
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400">💨</span> Tủ hút Fume Hood (+8.8m)
              </span>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
            >
              Đóng Bản Đồ [M]
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
