/**
 * Shared projection helper that extracts the compact subset of curriculum fields
 * needed by `compileCurriculumReactions()` from `reactions.vi.json`, removing
 * heavy instructional text (`steps`, `observationGuide`, `simulationDoses`, `sources`)
 * from the eager main Vite entry bundle (~85 KB vs ~1.01 MB).
 */

export interface SlimCurriculumSpecies {
  formula: string;
  coeff?: number;
  coefficient?: number;
  phase?: string;
}

export interface SlimCurriculumEntry {
  id: string;
  title_vi?: string;
  title_en?: string;
  equation?: string;
  equation_balanced?: string;
  ionic_equation?: string;
  conditions?: { description_vi?: string; description_en?: string; catalyst?: string };
  conditions_vi?: string;
  observation_vi?: string;
  observation_en?: string;
  explanation_vi?: string;
  safetyNotes_vi?: string;
  isDangerous?: boolean;
  reactants: SlimCurriculumSpecies[];
  products: SlimCurriculumSpecies[];
  thermochemistry?: { deltaH_kJ_per_mol_reaction?: number | null };
  effects?: {
    after?: {
      liquidColor?: string;
      precipitate?: { colorHex?: string };
    };
  };
}

export interface SlimCurriculumDataset {
  reactions: SlimCurriculumEntry[];
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function projectSpecies(sp: Record<string, unknown>): SlimCurriculumSpecies {
  return stripUndefined({
    formula: String(sp.formula ?? ''),
    coeff: typeof sp.coeff === 'number' ? sp.coeff : undefined,
    coefficient: typeof sp.coefficient === 'number' ? sp.coefficient : undefined,
    phase: typeof sp.phase === 'string' ? sp.phase : undefined,
  });
}

export function projectCurriculumCoreDataset(rawData: {
  reactions?: Array<Record<string, unknown>>;
}): SlimCurriculumDataset {
  const reactions = (rawData.reactions ?? []).map((r) => {
    const condRaw = r.conditions as Record<string, unknown> | undefined;
    const condObj = condRaw
      ? stripUndefined({
          description_vi: typeof condRaw.description_vi === 'string' ? condRaw.description_vi : undefined,
          description_en: typeof condRaw.description_en === 'string' ? condRaw.description_en : undefined,
          catalyst: typeof condRaw.catalyst === 'string' ? condRaw.catalyst : undefined,
        })
      : undefined;
    const conditions = condObj && Object.keys(condObj).length > 0 ? condObj : undefined;

    const thermoRaw = r.thermochemistry as Record<string, unknown> | undefined;
    const deltaH = thermoRaw?.deltaH_kJ_per_mol_reaction;
    const thermochemistry =
      typeof deltaH === 'number' || deltaH === null
        ? { deltaH_kJ_per_mol_reaction: deltaH as number | null }
        : undefined;

    const afterRaw = (r.effects as Record<string, unknown> | undefined)?.after as
      | Record<string, unknown>
      | undefined;
    const precipColor = (afterRaw?.precipitate as Record<string, unknown> | undefined)?.colorHex;
    const liquidColor = typeof afterRaw?.liquidColor === 'string' ? afterRaw.liquidColor : undefined;
    const afterObj =
      liquidColor || typeof precipColor === 'string'
        ? stripUndefined({
            liquidColor,
            precipitate: typeof precipColor === 'string' ? { colorHex: precipColor } : undefined,
          })
        : undefined;
    const effects = afterObj ? { after: afterObj } : undefined;

    const obsVi = typeof r.observation_vi === 'string' ? r.observation_vi : undefined;
    const explVi = !obsVi && typeof r.explanation_vi === 'string' ? r.explanation_vi : undefined;

    return stripUndefined({
      id: String(r.id ?? ''),
      title_vi: typeof r.title_vi === 'string' ? r.title_vi : undefined,
      title_en: typeof r.title_en === 'string' ? r.title_en : undefined,
      equation: typeof r.equation === 'string' ? r.equation : undefined,
      equation_balanced: typeof r.equation_balanced === 'string' ? r.equation_balanced : undefined,
      ionic_equation: typeof r.ionic_equation === 'string' ? r.ionic_equation : undefined,
      conditions,
      conditions_vi: typeof r.conditions_vi === 'string' ? r.conditions_vi : undefined,
      observation_vi: obsVi,
      observation_en: typeof r.observation_en === 'string' ? r.observation_en : undefined,
      explanation_vi: explVi,
      safetyNotes_vi: typeof r.safetyNotes_vi === 'string' ? r.safetyNotes_vi : undefined,
      isDangerous: typeof r.isDangerous === 'boolean' ? r.isDangerous : undefined,
      reactants: Array.isArray(r.reactants)
        ? (r.reactants as Array<Record<string, unknown>>).map(projectSpecies)
        : [],
      products: Array.isArray(r.products)
        ? (r.products as Array<Record<string, unknown>>).map(projectSpecies)
        : [],
      thermochemistry,
      effects,
    });
  });

  return { reactions };
}
