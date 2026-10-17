import React from 'react';
import { useLabStore } from '../../store/useLabStore';
import { X, Activity, Droplets, CheckCircle, Info } from 'lucide-react';

interface TitrationCurveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TitrationCurveModal: React.FC<TitrationCurveModalProps> = ({ isOpen, onClose }) => {
  const { equipment, language } = useLabStore();

  if (!isOpen) return null;

  // Find burette and analyte flask on the bench to get live telemetry
  const allEq = Object.values(equipment);
  const burette = allEq.find(e => e.type === 'burette');
  const flask = allEq.find(e => e.type === 'erlenmeyer_flask' || e.type === 'beaker');

  const currentPh = flask?.ph ?? 1.0;
  // Volume of titrant dispensed = initial (50) - current burette volume
  const volumeDispensed_ml = burette ? Math.max(0, 50 - burette.volume_ml) : (flask ? Math.max(0, flask.volume_ml - 25) : 0);

  // Generate 100 mathematical curve data points for HCl 0.1 M (25 mL) titrated by NaOH 0.1 M
  // V_total = 25 + Vb; Veq = 25.0 mL
  const points: { v: number; ph: number }[] = [];
  for (let v = 0; v <= 50; v += 0.5) {
    let phVal = 7.0;
    const vTotal = 25 + v;
    if (v < 24.95) {
      const remainingMolesH = 0.0025 - (v / 1000) * 0.1;
      const concH = remainingMolesH / (vTotal / 1000);
      phVal = Math.max(1.0, -Math.log10(concH));
    } else if (v > 25.05) {
      const excessMolesOH = ((v - 25) / 1000) * 0.1;
      const concOH = excessMolesOH / (vTotal / 1000);
      const pOH = -Math.log10(concOH);
      phVal = Math.min(13.0, 14.0 - pOH);
    } else {
      phVal = 7.0;
    }
    points.push({ v, ph: phVal });
  }

  // Chart Dimensions
  const chartW = 540;
  const chartH = 300;
  const padL = 50;
  const padR = 30;
  const padT = 30;
  const padB = 40;

  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const getX = (v: number) => padL + (v / 50) * innerW;
  const getY = (phVal: number) => padT + innerH - (phVal / 14) * innerH;

  const pathD = points.reduce((acc, p, idx) => {
    const x = getX(p.v);
    const y = getY(p.ph);
    return idx === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
  }, '');

  // Live cursor coordinates
  const cursorX = getX(Math.min(50, volumeDispensed_ml));
  const cursorY = getY(Math.min(14, currentPh));

  // Equivalence point coordinates (V=25mL, pH=7.0)
  const eqX = getX(25.0);
  const eqY = getY(7.0);

  // Phenolphthalein transition zone: pH 8.2 to 10.0
  const phenoTopY = getY(10.0);
  const phenoBottomY = getY(8.2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-xs">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'vi' ? 'Đồ thị đường cong chuẩn độ pH' : 'Titration Curve (pH vs Volume)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                HCl 0.1 M (25 mL) + NaOH 0.1 M • {language === 'vi' ? 'Điểm tương đương tại 25.0 mL (pH = 7.0)' : 'Equivalence Point at 25.0 mL (pH = 7.0)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Telemetry KPI Cards */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 grid grid-cols-3 gap-3">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {language === 'vi' ? 'NaOH Đã nhỏ' : 'Titrant Added'}
            </span>
            <p className="text-lg font-mono font-bold text-blue-600 mt-0.5">
              {volumeDispensed_ml.toFixed(1)} <span className="text-xs font-normal text-slate-400">mL</span>
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {language === 'vi' ? 'pH Hiện tại' : 'Current pH'}
            </span>
            <p className={`text-lg font-mono font-bold mt-0.5 ${currentPh >= 8.2 ? 'text-pink-600' : 'text-slate-800'}`}>
              {currentPh.toFixed(2)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {language === 'vi' ? 'Chỉ thị Phenolphtalein' : 'Indicator State'}
            </span>
            <p className="text-xs font-semibold mt-1 flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full border border-slate-300"
                style={{ backgroundColor: currentPh >= 8.2 ? '#ec4899' : '#f8fafc' }}
              />
              <span className={currentPh >= 8.2 ? 'text-pink-600 font-bold' : 'text-slate-500'}>
                {currentPh >= 8.2 ? (language === 'vi' ? 'Hồng bền' : 'Pink endpoint') : (language === 'vi' ? 'Không màu' : 'Colorless')}
              </span>
            </p>
          </div>
        </div>

        {/* SVG Titration Graph Canvas */}
        <div className="p-4 flex flex-col items-center justify-center bg-white">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-[560px] select-none">
            {/* Phenolphthalein Transition Band (pH 8.2 to 10.0) */}
            <rect
              x={padL}
              y={phenoTopY}
              width={innerW}
              height={phenoBottomY - phenoTopY}
              fill="#fbcfe8"
              fillOpacity="0.35"
            />
            <text
              x={padL + 8}
              y={phenoTopY + 12}
              fill="#db2777"
              fontSize="8"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {language === 'vi' ? 'Vùng đổi màu Phenolphtalein (pH 8.2 - 10.0)' : 'Phenolphthalein Transition Zone (pH 8.2 - 10.0)'}
            </text>

            {/* Grid Lines Horizontal (pH 0, 2, 4, 6, 7, 8, 10, 12, 14) */}
            {[0, 2, 4, 6, 7, 8, 10, 12, 14].map(phVal => {
              const y = getY(phVal);
              const isNeutral = phVal === 7;
              return (
                <g key={phVal}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                    stroke={isNeutral ? '#10b981' : '#e2e8f0'}
                    strokeWidth={isNeutral ? 1.2 : 0.75}
                    strokeDasharray={isNeutral ? '4 2' : undefined}
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill={isNeutral ? '#10b981' : '#64748b'}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight={isNeutral ? 'bold' : 'normal'}
                  >
                    {phVal}
                  </text>
                </g>
              );
            })}

            {/* Grid Lines Vertical (Volume 0, 10, 20, 25, 30, 40, 50 mL) */}
            {[0, 10, 20, 25, 30, 40, 50].map(v => {
              const x = getX(v);
              const isEq = v === 25;
              return (
                <g key={v}>
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={chartH - padB}
                    stroke={isEq ? '#3b82f6' : '#e2e8f0'}
                    strokeWidth={isEq ? 1.2 : 0.75}
                    strokeDasharray={isEq ? '4 2' : undefined}
                  />
                  <text
                    x={x}
                    y={chartH - padB + 14}
                    textAnchor="middle"
                    fill={isEq ? '#2563eb' : '#64748b'}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight={isEq ? 'bold' : 'normal'}
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Axis Lines */}
            <line x1={padL} y1={padT} x2={padL} y2={chartH - padB} stroke="#475569" strokeWidth="1.5" />
            <line x1={padL} y1={chartH - padB} x2={chartW - padR} y2={chartH - padB} stroke="#475569" strokeWidth="1.5" />

            {/* Axis Labels */}
            <text
              x={padL + innerW / 2}
              y={chartH - 8}
              textAnchor="middle"
              fill="#334155"
              fontSize="9"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {language === 'vi' ? 'Thể tích dung dịch NaOH 0.1 M thêm vào (mL)' : 'Volume of 0.1 M NaOH Added (mL)'}
            </text>
            <text
              x="16"
              y={padT + innerH / 2}
              textAnchor="middle"
              fill="#334155"
              fontSize="9"
              fontFamily="sans-serif"
              fontWeight="bold"
              transform={`rotate(-90, 16, ${padT + innerH / 2})`}
            >
              pH
            </text>

            {/* Smooth Titration Curve Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Equivalence Point Target Dot (25 mL, pH 7.0) */}
            <circle cx={eqX} cy={eqY} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <text
              x={eqX + 8}
              y={eqY - 6}
              fill="#059669"
              fontSize="8"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {language === 'vi' ? 'Điểm tương đương (V=25mL, pH=7)' : 'Equivalence Pt (V=25mL, pH=7)'}
            </text>

            {/* Current Real-time State Cursor */}
            <circle cx={cursorX} cy={cursorY} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" className="animate-pulse" />
            <circle cx={cursorX} cy={cursorY} r="10" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" className="animate-spin" />
            <text
              x={cursorX}
              y={cursorY - 12}
              textAnchor="middle"
              fill="#dc2626"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              V={volumeDispensed_ml.toFixed(1)} mL, pH={currentPh.toFixed(1)}
            </text>
          </svg>
        </div>

        {/* Footer Notes & Theory */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              {language === 'vi'
                ? 'Độ dốc cực đại (dpH/dV) xuất hiện tại điểm tương đương, tương ứng với bước nhảy pH đột ngột.'
                : 'Maximum inflection slope (dpH/dV) marks the stoichiometric equivalence jump.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-medium text-xs transition-colors"
          >
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
