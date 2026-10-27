import type { VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { waterSaturationTemperatureC } from '../science/waterSaturation';
import { availableLiquidVolume } from '../handling/solidOccupancy';
import { condenserCoolingSettings, stepCondenserHeatExchange } from '../science/condenserHeatExchange';
import { aqueousBoilingPoint, sampleHeatCapacity } from './thermalState';
import { supportsWaterSurface } from '../science/waterSurface';

/** Explicit connected source, finite vapor/coolant flow and shared UA budget.
 * Water-only coupling; proximity does not constitute a vapor connection.
 */
export function transferWaterCondensate(
  vessels: Record<string, VesselState>, vaporBudgets: ReadonlyMap<string, number>, dt: number,
  vaporEnergyBudgets?: ReadonlyMap<string, number>,
): Record<string, VesselState> {
  if (!Number.isFinite(dt) || dt <= 0) return vessels;
  let result = vessels;
  const remaining = new Map(vaporBudgets);
  for (const receiverId of Object.keys(vessels)) {
    let receiver = result[receiverId];
    if (receiver.type !== 'condenser' || receiver.isShattered) continue;
    const sourceId = receiver.vaporSourceId;
    const source = sourceId && sourceId !== receiverId ? result[sourceId] : undefined;
    const connected = source && !source.isSealed && !receiver.isSealed && !source.isShattered;
    const cooling = condenserCoolingSettings(receiver.condenserCooling);
    const material = receiver.contents.filter(c => c.mass_g > 0);
    const supportedReceiver = receiver.temperature_c >= 0 && (material.length === 0 || supportsWaterSurface(receiver))
      && material.every(c => ['l', 'aq'].includes(c.phase ?? c.state ?? 'l'))
      && Math.abs(receiver.contents.reduce((sum, c) => sum + c.mass_g, 0) - receiver.mass_g) <= Math.max(1e-9, receiver.mass_g * 1e-9);
    const availableVapor = connected ? Math.max(0, remaining.get(sourceId!) ?? 0) : 0;
    const packetEnergy = sourceId ? vaporEnergyBudgets?.get(sourceId) : undefined;
    const packetMass = sourceId ? vaporBudgets.get(sourceId) ?? 0 : 0;
    const vaporSpecificEnthalpy_J_g = packetEnergy === undefined ? undefined
      : packetMass > 0 ? packetEnergy / packetMass : 0;
    // Parallel receivers split the same stream, including its carrier gas.
    const waterMol = (connected ? packetMass : 0) / 18.015, carrier = source?.waterVaporCarrier_mol_s;
    const fraction = carrier === undefined ? 1 : Number.isFinite(carrier) && carrier >= 0
      ? waterMol > 0 ? waterMol / (waterMol + carrier * dt) : 0 : NaN;
    const streamPressure = Math.min(source?.effectsEnvironment?.pressure_atm ?? source?.environment?.pressure_atm ?? 1,
      receiver.effectsEnvironment?.pressure_atm ?? receiver.environment?.pressure_atm ?? 1) * 101325;
    const exchange = stepCondenserHeatExchange({ dt, cooling: receiver.coolingWaterActive ? cooling : { ...cooling, flow_ml_s: 0 },
      vapor_g: supportedReceiver ? availableVapor : 0,
      maxCondensate_g: connected && supportedReceiver ? availableLiquidVolume(receiver) : 0,
      sourceTemperature_c: source?.temperature_c ?? 25,
      vaporSpecificEnthalpy_J_g,
      interfaceTemperature_c: source ? vaporSpecificEnthalpy_J_g === undefined
        ? Math.min(source.temperature_c, waterSaturationTemperatureC(streamPressure * fraction))
        : waterSaturationTemperatureC(streamPressure * fraction) : 25,
      initialTemperature_c: supportedReceiver ? receiver.temperature_c : cooling.inletTemperature_c,
      initialCapacity_J_K: sampleHeatCapacity(receiver) });
    const isBoiling = supportedReceiver ? receiver.isBoiling
      && exchange.temperature_c >= aqueousBoilingPoint(receiver) - 1e-8 : receiver.isBoiling;
    receiver = { ...receiver, coolantPassed_ml: (receiver.coolantPassed_ml ?? 0) + exchange.coolantVolume_ml,
      coolantPassed_g: (receiver.coolantPassed_g ?? 0) + exchange.coolantMass_g,
      coolantHeatReceived_J: (receiver.coolantHeatReceived_J ?? 0) + exchange.heatRemoved_J,
      coolantOutletTemperature_c: receiver.coolingWaterActive && Number.isFinite(exchange.coolantOutletTemperature_c)
        ? exchange.coolantOutletTemperature_c : undefined,
      temperature_c: supportedReceiver ? exchange.temperature_c : receiver.temperature_c,
      isBoiling, boilingIntensity: isBoiling ? receiver.boilingIntensity : 0, condenserCoolingPower_W: exchange.coolingPower_W,
      condenserVaporEnergyReceived_J: (receiver.condenserVaporEnergyReceived_J ?? 0) + exchange.receivedVaporEnergy_J,
      condensationHeatRemoved_J: (receiver.condensationHeatRemoved_J ?? 0) + exchange.heatRemoved_J,
      condenserEffectiveConductance_W_K: exchange.effectiveConductance_W_K,
      condenserCoolingStatus: supportedReceiver ? exchange.status : 'unsupported-receiver-phase' };
    if (result === vessels) result = { ...vessels };
    result[receiverId] = receiver;
    const mass = exchange.recovered_g;
    if (!Number.isFinite(mass) || mass <= 0) continue;
    if (!source || !sourceId) continue;
    remaining.set(sourceId, (remaining.get(sourceId) ?? 0) - mass);
    const contents = receiver.contents.map(item => ({ ...item }));
    const water = contents.find(item => sameMolecularFormula(item.formula, 'H2O') && item.phase === 'l');
    if (water) { water.mass_g += mass; water.moles += mass / 18.015; }
    else contents.push({ formula: 'H2O', phase: 'l', mass_g: mass, moles: mass / 18.015 });
    for (const item of contents) if (item.phase === 'aq') item.concentration_M = item.moles / ((receiver.volume_ml + mass) / 1000);
    result[receiverId] = { ...receiver, contents, substances: [...new Set([...receiver.substances, 'H2O'])],
      volume_ml: receiver.volume_ml + mass, volume: (receiver.volume_ml + mass) / receiver.capacity_ml,
      mass_g: receiver.mass_g + mass, liquidColor: receiver.liquidColor ?? '#f8fafc',
      condensateReceived_g: (receiver.condensateReceived_g ?? 0) + mass };
    result[sourceId] = { ...source, condensedTransfer_g: (source.condensedTransfer_g ?? 0) + mass,
      condensedTransferEnergy_J: (source.condensedTransferEnergy_J ?? 0) + exchange.receivedVaporEnergy_J };
  }
  return result;
}
