import React from 'react';
import { Droplets } from 'lucide-react';
import { EquipmentState } from '../../types/equipment';
import { useLabStore } from '../../store/useLabStore';

interface WashBottleControlsProps {
  washBottle: EquipmentState;
  allContainers: EquipmentState[];
  language: 'vi' | 'en';
}

/**
 * Targeted Wash Bottle squeeze & H2O dispense controls ported from lab-3d WashBottleControls.
 */
export const WashBottleControls: React.FC<WashBottleControlsProps> = ({
  washBottle,
  allContainers,
  language,
}) => {
  const squirtWashBottle = useLabStore((s) => s.squirtWashBottle);
  const vi = language === 'vi';
  const [targetId, setTargetId] = React.useState<string>(
    washBottle.washTargetId && allContainers.some((c) => c.id === washBottle.washTargetId)
      ? washBottle.washTargetId
      : allContainers[0]?.id ?? ''
  );
  const [doseMl, setDoseMl] = React.useState<number>(washBottle.washDose_ml ?? 10);

  const receivers = allContainers.filter((c) => c.id !== washBottle.id && c.isContainer);
  const activeTargetId = receivers.some((r) => r.id === targetId) ? targetId : receivers[0]?.id ?? '';

  return (
    <div className="p-3 rounded-xl bg-cyan-50/80 border border-cyan-200 space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-cyan-900">
          <Droplets className="w-3.5 h-3.5 text-cyan-600" />
          <span>{vi ? 'Phụt tia nước cất (H₂O)' : 'Distilled Wash Squirt'}</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-cyan-700">
          {washBottle.volume_ml.toFixed(0)} mL
        </span>
      </div>

      {receivers.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">
          {vi ? 'Hãy đặt thêm 1 bình chứa trên bàn để tráng rửa.' : 'Place a receiving vessel on the bench first.'}
        </p>
      ) : (
        <>
          <select
            value={activeTargetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full text-xs font-medium bg-white border border-cyan-200 rounded-lg p-2"
          >
            {receivers.map((r) => (
              <option key={r.id} value={r.id}>
                {vi ? r.name_vi : r.name} ({r.volume_ml.toFixed(0)}/{r.capacity_ml} mL)
              </option>
            ))}
          </select>

          <label className="block space-y-1">
            <div className="flex justify-between text-[11px] text-slate-600 font-medium">
              <span>{vi ? 'Lượng tia nước' : 'Squirt volume'}</span>
              <span className="font-mono font-bold text-slate-800">{doseMl.toFixed(1)} mL</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              step={0.5}
              value={doseMl}
              onChange={(e) => setDoseMl(Number(e.target.value))}
              className="w-full accent-cyan-600"
            />
          </label>

          <button
            type="button"
            disabled={washBottle.volume_ml <= 0.1 || !activeTargetId}
            onClick={() => squirtWashBottle(washBottle.id, activeTargetId, doseMl)}
            className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-45 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            {vi ? `Phụt ${doseMl.toFixed(1)} mL H₂O` : `Squirt ${doseMl.toFixed(1)} mL H₂O`}
          </button>
        </>
      )}
    </div>
  );
};
