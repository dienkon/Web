import { useAppStore } from '../store/useAppStore';
import { vfxBus } from './bus';
import { aqueousBoilingPoint } from '../engine/thermalState';
import type { LabEnvironment } from '../science/labEnvironment';
import { DEFAULT_LAB_ENVIRONMENT } from '../science/labEnvironment';
import { supportsWaterSurface, waterDewPointC } from '../science/waterSurface';
import { postCombustionExhaustG } from '../engine/hydrogenExhaustCombustion';
import { gasPressurePatch, headspaceVolumeMl } from '../engine/headspacePressure';
import { waterLatentHeatJ_G } from '../science/waterThermodynamics';
import { aqueousWaterBoundary } from '../science/aqueousWaterBoundary';
import { SimulationEngine } from '../simulation/core/SimulationEngine';
import { suspensionFluidProperties } from '../science/suspensionFluid';
import { convectionForcing } from '../science/convectionForcing';

export type EffectCode = 'ok' | 'missing_vessel' | 'shattered' | 'locked' | 'sealed'
  | 'unsupported' | 'empty' | 'invalid_parameter' | 'stale_handle' | 'source_unavailable';
export interface EffectResult { ok: boolean; vesselId: string; code: EffectCode; message: string; handle?: string }
let nextHandle = 1;

/** Commands bind only an ID; every call resolves current state. Never creates a
 * vessel or changes its specimen. Heating is an explicitly metered virtual
 * source in watts; physical burners/hotplates retain their own controls. */
export const effects = {
  forVessel(vesselId: string) {
    const result = (code: EffectCode, message: string): EffectResult => ({ ok: code === 'ok', vesselId, code, message });
    const validate = (liquid = false): EffectResult | null => {
      const v = useAppStore.getState().vessels[vesselId];
      if (!v) return result('missing_vessel', 'Chọn một bình đích còn tồn tại.');
      if (v.isShattered) return result('shattered', 'Bình đã vỡ.');
      if (v.isLocked) return result('locked', 'Bình đang khóa.');
      if (v.id.startsWith('lesson_vessel_') || !['beaker', 'flask', 'test_tube', 'cylinder',
        'evaporating_dish', 'watch_glass', 'petri_dish', 'crucible'].includes(v.type)) return result('unsupported', 'Bình này chưa hỗ trợ điều khiển VFX cơ bản.');
      if (v.isSealed) return result('sealed', 'Cần bình mở; chưa giải chuyển pha trong bình kín.');
      if (liquid && !(v.volume_ml > 0.05)) return result('empty', 'Bình chưa có đủ chất lỏng.');
      return null;
    };
    return {
      setBubbleInterfaceMobility(mobility: 'mobile' | 'immobile'): EffectResult {
        if (mobility !== 'mobile' && mobility !== 'immobile') return result('invalid_parameter', 'Chọn giả thiết bề mặt bọt mobile hoặc immobile.');
        const problem = validate(true); if (problem) return problem;
        useAppStore.getState().setVesselState(vesselId, { bubbleInterfaceMobility: mobility });
        return result('ok', 'Đã chọn giả thiết bề mặt bọt; thao tác này không làm sạch hoặc thay đổi hóa học của mẫu.');
      },
      setHeatInput(power_W: number): EffectResult {
        if (!Number.isFinite(power_W) || power_W < 0 || power_W > 1000) return result('invalid_parameter', 'Công suất phải trong 0–1000 W.');
        const problem = validate(power_W > 0); if (problem) return problem;
        if (power_W > 0 && !supportsWaterSurface(useAppStore.getState().vessels[vesselId])) {
          return result('unsupported', 'Điều khiển nhiệt cơ bản hỗ trợ nước và dung dịch loãng không có chất bay hơi khác.');
        }
        const handle = `${vesselId}:heat:${nextHandle++}`;
        useAppStore.getState().setVesselState(vesselId, { effectHeatInput_W: power_W, effectHeatHandle: handle });
        return { ...result('ok', 'Đã cập nhật nguồn nhiệt ảo trên bình đích.'), handle };
      },
      setEnvironment(patch: Partial<LabEnvironment>): EffectResult {
        const bounds: Record<string, [number, number]> = { temperature_c: [10, 40], relativeHumidity: [0, 1],
          pressure_atm: [0.6, 1.2], airSpeed_m_s: [0, 1], oxygenFraction: [0, 0.21] };
        if (!patch || Object.entries(patch).some(([k, v]) => !bounds[k] || !Number.isFinite(v)
          || v < bounds[k][0] || v > bounds[k][1])) return result('invalid_parameter', 'Điều kiện môi trường vượt miền hỗ trợ.');
        const problem = validate(); if (problem) return problem;
        const v = useAppStore.getState().vessels[vesselId];
        useAppStore.getState().setVesselState(vesselId, { effectsEnvironment: { ...v.effectsEnvironment, ...patch } });
        return result('ok', 'Đã cập nhật môi trường riêng của bình đích.');
      },
      ripple(intensity = 0.2): EffectResult {
        if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) return result('invalid_parameter', 'Cường độ gợn phải trong 0–1.');
        const problem = validate(true); if (problem) return problem;
        vfxBus.emit('surface:ripple', { vesselId, x: 0, z: 0, intensity });
        return result('ok', 'Đã tạo một xung mặt thoáng trên bình đích.');
      },
      doseLiquid(sourceId: string, volume_ml: number): EffectResult & { moved_ml?: number; spilled_ml?: number } {
        if (sourceId === vesselId || !Number.isFinite(volume_ml) || volume_ml <= 0) return result('invalid_parameter', 'Nguồn phải khác bình đích; lượng cấp phải dương và hữu hạn.');
        const problem = validate(); if (problem) return problem;
        const source = useAppStore.getState().vessels[sourceId];
        if (!source || source.isShattered || source.isLocked || source.isSealed || source.id.startsWith('lesson_vessel_')
          || !(source.volume_ml > 0)) return result('source_unavailable', 'Nguồn phải là bình mở có chất lỏng hữu hạn.');
        const receipt = useAppStore.getState().transferLiquidContinuous(sourceId, vesselId, volume_ml);
        return { ...result(receipt.moved_ml > 0 ? 'ok' : 'source_unavailable', receipt.moved_ml > 0
          ? 'Đã chuyển lượng chất thực; phần vượt sức chứa đi vào đường tràn.' : 'Chưa thể chuyển mẫu.'), ...receipt };
      },
      stop(handle: string): EffectResult {
        const v = useAppStore.getState().vessels[vesselId];
        if (!v) return result('missing_vessel', 'Bình đích không còn tồn tại.');
        if (!handle || v.effectHeatHandle !== handle) return result('stale_handle', 'Nguồn này đã dừng hoặc đã được thay thế.');
        useAppStore.getState().setVesselState(vesselId, { effectHeatInput_W: 0, effectHeatHandle: undefined });
        return result('ok', 'Đã ngắt nguồn nhiệt; mẫu tiếp tục nguội theo mô phỏng.');
      },
      inspect() {
        const v = useAppStore.getState().vessels[vesselId];
        if (!v) return { ...result('missing_vessel', 'Bình đích không còn tồn tại.'), state: null };
        const env = { ...DEFAULT_LAB_ENVIRONMENT, ...v.environment, ...v.effectsEnvironment };
        const fluid = suspensionFluidProperties(v.contents, v.volume_ml, v.temperature_c);
        const pressure = gasPressurePatch(v);
        const boilingPoint = aqueousBoilingPoint({ ...v, environment: env });
        const boundary = aqueousWaterBoundary({ ...v, environment: env });
        const surfaceLatent = waterLatentHeatJ_G(v.temperature_c), boilingLatent = waterLatentHeatJ_G(boilingPoint);
        return { ...result('ok', 'Trạng thái vật lý hiện tại.'), state: {
          stage: v.volume_ml <= 0 ? 'dry' : v.isBoiling ? 'boiling' : (v.evaporationRate_g_s ?? 0) > 0 ? 'evaporating' : 'idle',
          temperature_c: v.temperature_c, boilingPoint_c: Number.isFinite(boilingPoint) ? boilingPoint : null,
          waterActivity: boundary.activity ?? null, boilingPointModel: boundary.model,
          waterActivityLimit: boundary.reason || null,
          thermalModelLimit: v.thermalModelLimit ?? null,
          thermalEnergyOutsideModel_J: v.thermalEnergyOutsideModel_J ?? 0,
          thermalHeatingPower_W: v.thermalHeatingPower_W ?? 0,
          thermalHeatingEnergy_J: v.thermalHeatingEnergy_J ?? 0,
          waterLatentHeat_J_g: Number.isFinite(surfaceLatent) ? surfaceLatent : null,
          boilingWaterLatentHeat_J_g: Number.isFinite(boilingLatent) ? boilingLatent : null,
          pressure_atm: pressure.internalPressure_atm ?? null, pressureModel: pressure.internalPressureModel,
          headspaceVolume_ml: headspaceVolumeMl(v),
          headspaceReference: pressure.sealedHeadspace ? { ...pressure.sealedHeadspace } : null,
          evaporationRate_g_s: v.evaporationRate_g_s ?? 0, heatInput_W: v.effectHeatInput_W ?? 0,
          waterVaporOutflow_g_s: v.waterVaporOutflow_g_s ?? 0,
          waterVaporReleased_g: v.waterVaporReleased_g,
          thermalVaporEnthalpy_J: v.thermalVaporEnthalpy_J,
          waterVaporReleasedEnergy_J: v.waterVaporReleasedEnergy_J,
          condensedTransferEnergy_J: v.condensedTransferEnergy_J,
          waterVaporEnergyModel: v.waterVaporEnergyModel,
          waterVaporFromChemistry_g: v.waterVaporFromChemistry_g,
          waterVaporPartialPressure_Pa: v.waterVaporPartialPressure_Pa,
          waterVaporTemperature_c: v.waterVaporTemperature_c,
          waterVaporSpecificEnthalpy_J_g: v.waterVaporSpecificEnthalpy_J_g,
          waterVaporTemperatureModel: v.waterVaporTemperatureModel,
          condensateReceived_g: v.condensateReceived_g ?? 0,
          gasFlux: v.gasFlux ?? null,
          bubbleInterfaceMobility: v.bubbleInterfaceMobility ?? 'immobile',
          bubbleVisualSampling: SimulationEngine.findManager(vesselId)?.boilingSystem.sourceSampling ?? null,
          precipitationTiming: [...(SimulationEngine.findManager(vesselId)?.precipitationSystems ?? [])]
            .map(([formula,system]) => ({ formula,carrierMode:system.carrierMode,...system.clock })),
          flocculation: [...(SimulationEngine.findManager(vesselId)?.precipitationSystems ?? [])]
            .filter(([, system]) => system.flocculation.enabled)
            .map(([formula, system]) => ({ formula, ...system.flocculation })),
          suspensionCarrier: { mode:fluid.carrierMode,model:fluid.carrierModel,liquidMass_g:fluid.liquidMass_g },
          convection: convectionForcing({ temp_c: v.temperature_c, ambientTemp_c: env.temperature_c,
            heatPower_W: v.thermalHeatingPower_W ?? 0, viscosity_mPa_s: fluid.viscosity_mPa_s,
            fluidModel: fluid.convectionFluidModel }),
          dewPoint_c: waterDewPointC(env.temperature_c, env.relativeHumidity ?? 0.5),
          wall: v.wallCondensation, supportsSurfaceModel: supportsWaterSurface(v),
          hydrogenCombustion: v.hydrogenCombustion ?? null,
          postCombustionExhaust_g: postCombustionExhaustG(v),
        } };
      },
    };
  },
};
