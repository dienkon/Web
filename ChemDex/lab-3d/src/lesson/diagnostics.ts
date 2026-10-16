import type { LessonDefinition, LessonSession } from './types';
import { getLessonSpecies } from './catalog/species';
import { parseLessonFormula } from './chemistry/formula';
import { lessonTargetExtent } from './chemistry/kinetics';

export interface ReagentDiagnostic {
  species: string;
  name: string;
  coefficient: number;
  initial_mol: number;
  remaining_mol: number;
  extentCapacity_mol: number;
  limiting: boolean;
  missing: boolean;
  excess_mol: number;
}

export interface ProductDiagnostic {
  species: string;
  name: string;
  formula: string;
  phase: string;
  coefficient: number;
  theoretical_mol: number;
  theoretical_g: number;
  formed_mol: number;
  retained_mol: number;
  escaped_mol: number;
  yieldFraction: number | null;
  gasVolume_ml: number | null;
}

export interface ElementDiagnostic {
  element: string;
  initial_mol: number;
  retained_mol: number;
  escaped_mol: number;
  error_mol: number;
  conserved: boolean;
}

export interface LessonDiagnostic {
  reactants: ReagentDiagnostic[];
  products: ProductDiagnostic[];
  elements: ElementDiagnostic[];
  messages: string[];
  extentTarget_mol: number;
  completeFraction: number;
  allElementsConserved: boolean;
  gasVolumeBasis: string;
}

const GAS_CONSTANT_ML_ATM = 82.057366;

export function idealLessonGasVolume(moles: number, temperature_c = 25, pressure_atm = 1): number | null {
  if (!Number.isFinite(moles) || moles < 0) return null;
  if (!Number.isFinite(temperature_c) || temperature_c <= -273.15) return null;
  if (!Number.isFinite(pressure_atm) || pressure_atm <= 0) return null;
  return moles * GAS_CONSTANT_ML_ATM * (temperature_c + 273.15) / pressure_atm;
}

export function diagnoseLessonReactants(definition: LessonDefinition, session: LessonSession): ReagentDiagnostic[] {
  const capacities = definition.reactants.map(term => {
    const item = session.inventory.find(entry => entry.species === term.species);
    return (item?.initial_mol ?? 0) / term.coefficient;
  });
  const minimum = capacities.length ? Math.min(...capacities) : 0;
  const tolerance = Math.max(1e-12, minimum * 1e-7);
  return definition.reactants.map((term, index) => {
    const item = session.inventory.find(entry => entry.species === term.species);
    const species = getLessonSpecies(term.species);
    const initial = item?.initial_mol ?? 0;
    return {
      species: term.species,
      name: species.name_vi,
      coefficient: term.coefficient,
      initial_mol: initial,
      remaining_mol: item?.amount_mol ?? 0,
      extentCapacity_mol: capacities[index],
      limiting: initial > 0 && Math.abs(capacities[index] - minimum) <= tolerance,
      missing: initial <= 1e-12,
      excess_mol: Math.max(0, initial - minimum * term.coefficient),
    };
  });
}

export function diagnoseLessonProducts(definition: LessonDefinition, session: LessonSession): ProductDiagnostic[] {
  const target = lessonTargetExtent(definition, session.maxExtent_mol);
  return definition.products.map(term => {
    const species = getLessonSpecies(term.species);
    const item = session.inventory.find(entry => entry.species === term.species);
    const theoretical = target * term.coefficient;
    const formed = item?.produced_mol ?? 0;
    return {
      species: term.species,
      name: species.name_vi,
      formula: species.formula,
      phase: species.phase,
      coefficient: term.coefficient,
      theoretical_mol: theoretical,
      theoretical_g: theoretical * species.molarMass,
      formed_mol: formed,
      retained_mol: item?.amount_mol ?? 0,
      escaped_mol: item?.escaped_mol ?? 0,
      yieldFraction: theoretical > 1e-12 ? formed / theoretical : null,
      gasVolume_ml: species.phase === 'g' ? idealLessonGasVolume(formed) : null,
    };
  });
}

export function diagnoseLessonElements(session: LessonSession): ElementDiagnostic[] {
  const elements = new Map<string, ElementDiagnostic>();
  for (const item of session.inventory) {
    const atoms = parseLessonFormula(getLessonSpecies(item.species).formula);
    for (const [element, count] of Object.entries(atoms)) {
      const entry = elements.get(element) ?? {
        element,
        initial_mol: 0,
        retained_mol: 0,
        escaped_mol: 0,
        error_mol: 0,
        conserved: true,
      };
      entry.initial_mol += item.initial_mol * count;
      entry.retained_mol += item.amount_mol * count;
      entry.escaped_mol += item.escaped_mol * count;
      elements.set(element, entry);
    }
  }
  return [...elements.values()].sort((left, right) => left.element.localeCompare(right.element)).map(entry => {
    const error = entry.retained_mol + entry.escaped_mol - entry.initial_mol;
    return {
      ...entry,
      error_mol: error,
      conserved: Math.abs(error) <= Math.max(1e-12, entry.initial_mol * 1e-8),
    };
  });
}

export function diagnoseLesson(definition: LessonDefinition, session: LessonSession): LessonDiagnostic {
  const reactants = diagnoseLessonReactants(definition, session);
  const products = diagnoseLessonProducts(definition, session);
  const elements = diagnoseLessonElements(session);
  const target = lessonTargetExtent(definition, session.maxExtent_mol);
  const missing = reactants.filter(reactant => reactant.missing);
  const limiting = reactants.filter(reactant => reactant.limiting);
  const excess = reactants.filter(reactant => reactant.excess_mol > 1e-12);
  const messages: string[] = [];
  if (missing.length) {
    messages.push(`Chưa có đủ chất đầu: ${missing.map(reactant => reactant.name).join(', ')}. Mẫu này không thể bắt đầu chuyển hóa.`);
  } else if (limiting.length === reactants.length) {
    messages.push('Các chất đầu có cùng n/ν; hỗn hợp được chuẩn bị theo đúng tỉ lệ phương trình.');
  } else {
    messages.push(`Chất giới hạn: ${limiting.map(reactant => reactant.name).join(', ')}.`);
  }
  if (excess.length) messages.push(`Chất đầu có thể còn dư: ${excess.map(reactant => reactant.name).join(', ')}.`);
  if (definition.reversible) {
    messages.push(`Mức chuyển hóa đích ${(definition.reversible.targetConversion * 100).toFixed(0)}% là giá trị minh họa, không phải hằng số cân bằng đo được.`);
  }
  if (products.some(product => product.gasVolume_ml !== null)) {
    messages.push('Thể tích khí lý tưởng được quy về 25 °C, 1 atm; không phải thể tích khoảng không trong bình.');
  }
  if (elements.some(element => !element.conserved)) messages.push('Bảo toàn nguyên tố không đạt; cần kiểm tra sổ lượng chất.');
  return {
    reactants,
    products,
    elements,
    messages,
    extentTarget_mol: target,
    completeFraction: target > 0 ? Math.max(0, Math.min(1, session.extent_mol / target)) : 0,
    allElementsConserved: elements.every(element => element.conserved),
    gasVolumeBasis: 'Ideal gas; T=298.15 K; P=1 atm; R=0.082057366 L atm mol^-1 K^-1',
  };
}
