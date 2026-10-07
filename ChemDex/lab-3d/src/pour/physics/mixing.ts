/**
 * PHYSICAL CONSERVATION LAWS & BEER-LAMBERT OPTICAL COLOR MIXING
 */

export interface SubstanceContent {
  formula: string;
  moles: number;
  mass_g: number;
}

export interface MixingState {
  volume_ml: number;
  mass_g: number;
  density_g_ml: number;
  temperature_c: number;
  colorHex: string;
  contents: Record<string, SubstanceContent>;
}

const SPECIFIC_HEAT_CAPACITY = 4.184; // J / (g · K) for aqueous solutions

/**
 * Transfers incremental liquid volume dV from source to recipient and calculates
 * exact conservation of mass, temperature, moles, and optical color.
 */
export function transferFluidIncrement(
  source: MixingState,
  recipient: MixingState,
  dV_ml: number,
  recipientCapacity_ml: number
): {
  newSource: MixingState;
  newRecipient: MixingState;
  accepted_ml: number;
  overflow_ml: number;
} {
  const actualDV = Math.max(0, Math.min(source.volume_ml, dV_ml));
  if (actualDV <= 0.0001) {
    return {
      newSource: { ...source },
      newRecipient: { ...recipient },
      accepted_ml: 0,
      overflow_ml: 0
    };
  }

  const availableCapacity = Math.max(0, recipientCapacity_ml - recipient.volume_ml);
  const accepted_ml = Math.min(actualDV, availableCapacity);
  const overflow_ml = Math.max(0, actualDV - accepted_ml);

  const transferRatio = actualDV / source.volume_ml;
  const transferredMass_g = actualDV * source.density_g_ml;

  // 1. Source deductions
  const newSourceVol = Math.max(0, source.volume_ml - actualDV);
  const newSourceMass = Math.max(0, source.mass_g - transferredMass_g);
  const newSourceContents: Record<string, SubstanceContent> = {};
  for (const [key, item] of Object.entries(source.contents)) {
    const remainingMoles = Math.max(0, item.moles * (1 - transferRatio));
    const remainingMass = Math.max(0, item.mass_g * (1 - transferRatio));
    if (remainingMoles > 1e-7) {
      newSourceContents[key] = {
        formula: item.formula,
        moles: remainingMoles,
        mass_g: remainingMass
      };
    }
  }

  const newSource: MixingState = {
    ...source,
    volume_ml: newSourceVol,
    mass_g: newSourceMass,
    contents: newSourceContents
  };

  // 2. Recipient additions (only for accepted volume)
  if (accepted_ml <= 0.0001) {
    return {
      newSource,
      newRecipient: { ...recipient },
      accepted_ml: 0,
      overflow_ml
    };
  }

  const acceptedFraction = accepted_ml / actualDV;
  const acceptedMass_g = transferredMass_g * acceptedFraction;
  const newRecipientVol = recipient.volume_ml + accepted_ml;
  const newRecipientMass = recipient.mass_g + acceptedMass_g;
  const newRecipientDensity = newRecipientVol > 0 ? newRecipientMass / newRecipientVol : 1.0;

  // Temperature mixing: T_mix = (m1*c1*T1 + m2*c2*T2) / (m1*c1 + m2*c2)
  const qRecipient = recipient.mass_g * SPECIFIC_HEAT_CAPACITY * recipient.temperature_c;
  const qAdded = acceptedMass_g * SPECIFIC_HEAT_CAPACITY * source.temperature_c;
  const totalHeatCapacity = (recipient.mass_g + acceptedMass_g) * SPECIFIC_HEAT_CAPACITY;
  const newTemp = totalHeatCapacity > 0 ? (qRecipient + qAdded) / totalHeatCapacity : 25;

  // Solute mole conservation
  const newRecipientContents: Record<string, SubstanceContent> = { ...recipient.contents };
  for (const [key, item] of Object.entries(source.contents)) {
    const addedMoles = item.moles * transferRatio * acceptedFraction;
    const addedMass = item.mass_g * transferRatio * acceptedFraction;
    if (newRecipientContents[key]) {
      newRecipientContents[key] = {
        formula: key,
        moles: newRecipientContents[key].moles + addedMoles,
        mass_g: newRecipientContents[key].mass_g + addedMass
      };
    } else {
      newRecipientContents[key] = {
        formula: key,
        moles: addedMoles,
        mass_g: addedMass
      };
    }
  }

  // Optical color mixing (Beer-Lambert absorbance law)
  const newColor = mixColorBeerLambert(
    recipient.colorHex,
    recipient.volume_ml,
    source.colorHex,
    accepted_ml
  );

  const newRecipient: MixingState = {
    volume_ml: newRecipientVol,
    mass_g: newRecipientMass,
    density_g_ml: newRecipientDensity,
    temperature_c: Math.round(newTemp * 10) / 10,
    colorHex: newColor,
    contents: newRecipientContents
  };

  return {
    newSource,
    newRecipient,
    accepted_ml,
    overflow_ml
  };
}

/**
 * Converts sRGB hex (#rrggbb) to linear RGB [0..1]
 */
function hexToLinear(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // sRGB gamma expansion to linear
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return [toLinear(r), toLinear(g), toLinear(b)];
}

/**
 * Converts linear RGB [0..1] to sRGB hex
 */
function linearToHex(rgb: [number, number, number]): string {
  const toSRGB = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };
  const rByte = Math.round(toSRGB(rgb[0]) * 255);
  const gByte = Math.round(toSRGB(rgb[1]) * 255);
  const bByte = Math.round(toSRGB(rgb[2]) * 255);

  const toHex2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex2(rByte)}${toHex2(gByte)}${toHex2(bByte)}`;
}

/**
 * Mixes colors via Beer-Lambert absorption law:
 * Absorbance A = -ln(C_linear)
 * A_mix = (V1*A1 + V2*A2) / (V1 + V2)
 * C_mix = exp(-A_mix)
 */
export function mixColorBeerLambert(
  hex1: string,
  v1: number,
  hex2: string,
  v2: number
): string {
  if (v1 <= 0.001) return hex2;
  if (v2 <= 0.001) return hex1;

  const rgb1 = hexToLinear(hex1 || '#ffffff');
  const rgb2 = hexToLinear(hex2 || '#ffffff');

  const eps = 1e-4;
  const totalV = v1 + v2;

  const mixedLinear: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    // Absorbance of each channel
    const a1 = -Math.log(Math.max(eps, rgb1[c]));
    const a2 = -Math.log(Math.max(eps, rgb2[c]));

    const aMix = (v1 * a1 + v2 * a2) / totalV;
    mixedLinear[c] = Math.max(0, Math.min(1, Math.exp(-aMix)));
  }

  return linearToHex(mixedLinear);
}
