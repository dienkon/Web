/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseFormula } from "./chemParser";

// Reactivity series for metals (more active to less active)
const METAL_ACTIVITIES = [
  "K",
  "Na",
  "Ba",
  "Ca",
  "Mg",
  "Al",
  "Zn",
  "Fe",
  "Ni",
  "Sn",
  "Pb",
  "H",
  "Cu",
  "Hg",
  "Ag",
  "Pt",
  "Au",
];

// Common valences of metals for forming salts or oxides
const METAL_VALENCES: { [metal: string]: number } = {
  K: 1,
  Na: 1,
  Ag: 1,
  NH4: 1,
  Ca: 2,
  Mg: 2,
  Ba: 2,
  Zn: 2,
  Cu: 2,
  Pb: 2,
  Fe: 2, // Dilute acids give iron(II) salts. Displacement gives iron(II).
  Al: 3,
};

/**
 * Classifies a formula string into a chemical family
 */
export function classifyFormula(formula: string): {
  isMetal: boolean;
  isAcid: boolean;
  isBase: boolean;
  isCarbonate: boolean;
  isHydrocarbon: boolean;
  isOxygen: boolean;
  isHydrogen: boolean;
  isSalt: boolean;
  metalName?: string;
  anionName?: string;
} {
  const clean = formula.trim();
  const elements = parseFormula(clean);
  const elementKeys = Object.keys(elements);

  const isOxygen = clean === "O2";
  const isHydrogen = clean === "H2";

  // Metal: single element that is in our reactivity series (excluding H)
  const isMetal =
    elementKeys.length === 1 &&
    METAL_ACTIVITIES.includes(elementKeys[0]) &&
    elementKeys[0] !== "H";

  // Acid: starts with H, followed by common anions or halogens, and not water/hydrogen
  const isAcid =
    clean.startsWith("H") &&
    clean !== "H2O" &&
    clean !== "H2" &&
    (clean.includes("Cl") ||
      clean.includes("SO4") ||
      clean.includes("NO3") ||
      clean.includes("CO3") ||
      clean.includes("PO4") ||
      clean.includes("Br") ||
      clean.includes("I"));

  // Base: ends with OH
  const isBase =
    clean.endsWith("OH") || clean.endsWith("(OH)2") || clean.endsWith("(OH)3");

  // Carbonate: ends with CO3
  const isCarbonate =
    clean.endsWith("CO3") ||
    clean.endsWith("(CO3)2") ||
    clean.endsWith("(CO3)3");

  // Hydrocarbon/Organic: contains C and H, optional O, starts with C
  const isHydrocarbon =
    clean.startsWith("C") &&
    elementKeys.includes("H") &&
    elementKeys.length <= 3;

  // Extract metal name if it's a salt/base/carbonate (usually the starting element)
  let metalName = undefined;
  if (
    isBase ||
    isCarbonate ||
    (!isMetal && !isAcid && !isOxygen && !isHydrogen && elementKeys.length > 1)
  ) {
    // Usually the first element symbol, e.g., CaCO3 -> Ca, Al2(SO4)3 -> Al
    const match = clean.match(/^([A-Z][a-z]?)/);
    if (match && METAL_ACTIVITIES.includes(match[1])) {
      metalName = match[1];
    }
  }

  // Extract anion name for acids or salts
  let anionName = undefined;
  if (isAcid) {
    if (clean.endsWith("Cl")) anionName = "Cl";
    else if (clean.endsWith("SO4")) anionName = "SO4";
    else if (clean.endsWith("NO3")) anionName = "NO3";
    else if (clean.endsWith("PO4")) anionName = "PO4";
    else if (clean.endsWith("CO3")) anionName = "CO3";
  } else if (!isMetal && !isAcid && !isOxygen && !isHydrogen) {
    // E.g. CuSO4 -> SO4, NaCl -> Cl
    for (const anion of ["SO4", "CO3", "NO3", "PO4", "Cl", "OH", "Br", "I"]) {
      if (
        clean.endsWith(anion) ||
        clean.endsWith(`(${anion})2`) ||
        clean.endsWith(`(${anion})3`)
      ) {
        anionName = anion;
        break;
      }
    }
  }

  const isSalt =
    !isMetal &&
    !isAcid &&
    !isBase &&
    !isCarbonate &&
    !isHydrocarbon &&
    !isOxygen &&
    !isHydrogen &&
    metalName !== undefined &&
    anionName !== undefined;

  return {
    isMetal,
    isAcid,
    isBase,
    isCarbonate,
    isHydrocarbon,
    isOxygen,
    isHydrogen,
    isSalt,
    metalName,
    anionName,
  };
}

/**
 * Creates a valid chemical salt formula from a metal and anion
 * e.g., metal "Al" (+3) + anion "SO4" (-2) -> "Al2(SO4)3"
 * metal "Ca" (+2) + anion "Cl" (-1) -> "CaCl2"
 */
export function constructSaltFormula(metal: string, anion: string): string {
  const metalValence = METAL_VALENCES[metal] || 2; // Default to 2

  // Anion valences
  const anionValences: { [anion: string]: number } = {
    Cl: 1,
    NO3: 1,
    OH: 1,
    Br: 1,
    I: 1,
    SO4: 2,
    CO3: 2,
    SO3: 2,
    PO4: 3,
  };
  const anionValence = anionValences[anion] || 1;

  // Find least common multiple (LCM) to balance charges
  // Simple swap: metal count = anionValence, anion count = metalValence
  // Then divide by greatest common divisor (GCD)
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const factor = gcd(metalValence, anionValence);

  const mCount = anionValence / factor;
  const aCount = metalValence / factor;

  const mStr = mCount > 1 ? `${metal}${mCount}` : metal;

  // Wrap polyatomic anions in parentheses if count > 1
  const isPolyatomic =
    anion.length > 2 ||
    anion === "OH" ||
    anion === "NO3" ||
    anion === "SO4" ||
    anion === "CO3" ||
    anion === "PO4";
  const aStr =
    aCount > 1
      ? isPolyatomic
        ? `(${anion})${aCount}`
        : `${anion}${aCount}`
      : anion;

  return `${mStr}${aStr}`;
}

export interface InferenceResult {
  predictedProducts: string[];
  reactionType: string;
  reasoning: string;
  confidence: number;
}

/**
 * Rules database for completing reactions
 */
export function inferReactionProducts(
  reactantFormulas: string[],
): InferenceResult | null {
  const cleanedReactants = reactantFormulas
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
  if (cleanedReactants.length === 0) return null;

  // Classify all reactants
  const classifications = cleanedReactants.map((f) => ({
    formula: f,
    meta: classifyFormula(f),
  }));

  // --- 1. SINGLE REACTANT (DECOMPOSITION) ---
  if (cleanedReactants.length === 1) {
    const single = cleanedReactants[0];

    if (single === "CaCO3") {
      return {
        predictedProducts: ["CaO", "CO2"],
        reactionType: "Phản ứng nhiệt phân (Decomposition)",
        reasoning:
          "Nhiệt phân Canxi cacbonat (đá vôi) tạo ra Canxi oxit (vôi sống) và khí Cacbonic.",
        confidence: 95,
      };
    }
    if (single === "KClO3") {
      return {
        predictedProducts: ["KCl", "O2"],
        reactionType: "Phản ứng nhiệt phân (Decomposition)",
        reasoning:
          "Nhiệt phân Kali clorat có xúc tác MnO2 giải phóng khí Oxi và muối Kali clorua.",
        confidence: 95,
      };
    }
    if (single === "Cu(OH)2") {
      return {
        predictedProducts: ["CuO", "H2O"],
        reactionType: "Phản ứng nhiệt phân (Decomposition)",
        reasoning:
          "Nhiệt phân Đồng(II) hiđroxit không tan tạo ra Đồng(II) oxit màu đen và hơi nước.",
        confidence: 90,
      };
    }
    if (single === "NaHCO3") {
      return {
        predictedProducts: ["Na2CO3", "CO2", "H2O"],
        reactionType: "Phản ứng nhiệt phân (Decomposition)",
        reasoning:
          "Nhiệt phân Natri hiđrocacbonat (baking soda) tạo muối natri cacbonat, khí CO2 và nước.",
        confidence: 90,
      };
    }
    if (single === "H2O") {
      return {
        predictedProducts: ["H2", "O2"],
        reactionType: "Phản ứng điện phân (Electrolysis)",
        reasoning: "Điện phân nước tạo ra khí Hiđrô và khí Ôxi.",
        confidence: 90,
      };
    }
  }

  // --- 2. DOUBLE REACTANTS ---
  if (cleanedReactants.length === 2) {
    const r1 = classifications[0];
    const r2 = classifications[1];

    // Helper to find specific classifications
    const findByMeta = (predicate: (m: any) => boolean) => {
      const idx = classifications.findIndex((c) => predicate(c.meta));
      if (idx !== -1) {
        return {
          match: classifications[idx],
          other: classifications[idx === 0 ? 1 : 0],
        };
      }
      return null;
    };

    // A. Hydrogen + Oxygen -> Water
    const hasH2 = classifications.some((c) => c.meta.isHydrogen);
    const hasO2 = classifications.some((c) => c.meta.isOxygen);
    if (hasH2 && hasO2) {
      return {
        predictedProducts: ["H2O"],
        reactionType: "Phản ứng hóa hợp (Combination)",
        reasoning: "Hiđrô cháy trong khí Ôxi tạo thành nước tỏa nhiều nhiệt.",
        confidence: 98,
      };
    }

    // B. Metal + Oxygen -> Metal Oxide
    const metalAndO2 = findByMeta((m) => m.isMetal);
    if (metalAndO2 && metalAndO2.other.meta.isOxygen) {
      const metal = metalAndO2.match.formula;
      let oxide = "";
      if (metal === "Fe")
        oxide = "Fe3O4"; // Sắt cháy trong oxi tạo oxit sắt từ
      else if (metal === "Cu") oxide = "CuO";
      else if (metal === "Al") oxide = "Al2O3";
      else if (metal === "Mg") oxide = "MgO";
      else if (metal === "Zn") oxide = "ZnO";
      else if (metal === "Ca") oxide = "CaO";
      else if (metal === "Na") oxide = "Na2O";
      else oxide = `${metal}O`; // generic fallback

      return {
        predictedProducts: [oxide],
        reactionType: "Phản ứng hóa hợp / Ôxi hóa (Combustion / Oxidation)",
        reasoning:
          "Kim loại tác dụng với Ôxi ở nhiệt độ cao tạo thành oxit kim loại tương ứng.",
        confidence: 95,
      };
    }

    // C. Carbonate + Acid -> Salt + CO2 + H2O
    const carbonateAndAcid = findByMeta((m) => m.isCarbonate);
    if (carbonateAndAcid && carbonateAndAcid.other.meta.isAcid) {
      const carbonate = carbonateAndAcid.match.formula;
      const acid = carbonateAndAcid.other.formula;

      const metal = carbonateAndAcid.match.meta.metalName;
      const anion = carbonateAndAcid.other.meta.anionName;

      if (metal && anion) {
        const salt = constructSaltFormula(metal, anion);
        return {
          predictedProducts: [salt, "CO2", "H2O"],
          reactionType: "Phản ứng trao đổi (Double Displacement)",
          reasoning:
            "Muối Cacbonat tác dụng với Axit tạo ra muối mới, giải phóng khí CO2 và nước.",
          confidence: 95,
        };
      }
    }

    // D. Base + Acid -> Salt + H2O
    const baseAndAcid = findByMeta((m) => m.isBase);
    if (baseAndAcid && baseAndAcid.other.meta.isAcid) {
      const base = baseAndAcid.match.formula;
      const acid = baseAndAcid.other.formula;

      const metal = baseAndAcid.match.meta.metalName;
      const anion = baseAndAcid.other.meta.anionName;

      if (metal && anion) {
        const salt = constructSaltFormula(metal, anion);
        return {
          predictedProducts: [salt, "H2O"],
          reactionType: "Phản ứng trung hòa / Trao đổi (Neutralization)",
          reasoning:
            "Axit tác dụng với Bazơ tạo thành muối và nước (Phản ứng trung hòa).",
          confidence: 95,
        };
      }
    }

    // E. Metal + Acid -> Salt + H2
    const metalAndAcid = findByMeta((m) => m.isMetal);
    if (metalAndAcid && metalAndAcid.other.meta.isAcid) {
      const metal = metalAndAcid.match.formula;
      const acid = metalAndAcid.other.formula;
      const anion = metalAndAcid.other.meta.anionName;

      // Metals after hydrogen (Cu, Ag, Pt, Au) don't react with dilute HCl/H2SO4
      const metalIndex = METAL_ACTIVITIES.indexOf(metal);
      const hydrogenIndex = METAL_ACTIVITIES.indexOf("H");

      if (metalIndex > hydrogenIndex) {
        return {
          predictedProducts: [],
          reactionType: "Không xảy ra (No Reaction)",
          reasoning: `Kim loại ${metal} đứng sau Hiđrô trong dãy hoạt động hóa học, nên không phản ứng với axit loãng như ${acid}.`,
          confidence: 90,
        };
      }

      if (anion) {
        const salt = constructSaltFormula(metal, anion);
        return {
          predictedProducts: [salt, "H2"],
          reactionType: "Phản ứng thế (Single Displacement)",
          reasoning:
            "Kim loại hoạt động đứng trước Hiđrô tác dụng với dung dịch Axit giải phóng khí Hiđrô và tạo muối.",
          confidence: 95,
        };
      }
    }

    // F. Simple displacement: Metal1 + Salt1 -> Salt2 + Metal2 (e.g. Fe + CuSO4)
    const metalAndSalt = findByMeta((m) => m.isMetal);
    if (metalAndSalt && metalAndSalt.other.meta.isSalt) {
      const m1 = metalAndSalt.match.formula;
      const salt1 = metalAndSalt.other.formula;
      const m2 = metalAndSalt.other.meta.metalName;
      const anion = metalAndSalt.other.meta.anionName;

      if (m2 && anion) {
        const m1Idx = METAL_ACTIVITIES.indexOf(m1);
        const m2Idx = METAL_ACTIVITIES.indexOf(m2);

        // m1 must be before m2 (more active) to displace it
        if (m1Idx < m2Idx && m1Idx !== -1 && m2Idx !== -1) {
          const salt2 = constructSaltFormula(m1, anion);
          return {
            predictedProducts: [salt2, m2],
            reactionType: "Phản ứng thế (Single Displacement)",
            reasoning: `Kim loại hoạt động mạnh hơn (${m1}) đẩy kim loại hoạt động yếu hơn (${m2}) ra khỏi muối của nó.`,
            confidence: 90,
          };
        } else {
          return {
            predictedProducts: [],
            reactionType: "Không xảy ra (No Reaction)",
            reasoning: `Kim loại ${m1} hoạt động yếu hơn ${m2}, nên không thể đẩy ${m2} ra khỏi dung dịch muối ${salt1}.`,
            confidence: 90,
          };
        }
      }
    }

    // G. Combustion: Hydrocarbon + Oxygen -> CO2 + H2O
    const hydrocarbonAndO2 = findByMeta((m) => m.isHydrocarbon);
    if (hydrocarbonAndO2 && hydrocarbonAndO2.other.meta.isOxygen) {
      return {
        predictedProducts: ["CO2", "H2O"],
        reactionType: "Phản ứng cháy / Ôxi hóa hoàn toàn (Combustion)",
        reasoning:
          "Hợp chất hữu cơ cháy hoàn toàn trong khí Ôxi tạo thành khí Cacbonic và nước.",
        confidence: 98,
      };
    }
  }

  return null;
}
