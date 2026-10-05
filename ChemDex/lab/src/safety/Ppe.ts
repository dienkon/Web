/**
 * CHEMDEX LAB - Safety & PPE Engine (K8.1)
 * Manages personal protective equipment (goggles, gloves, lab coat),
 * exposure consequences, photosensitivity-safe visual alerts, and emergency response.
 */

export type PPEItem = 'goggles' | 'gloves' | 'labCoat' | 'closedShoes' | 'hairTied';

export interface PPEState {
  goggles: boolean;
  gloves: boolean;
  labCoat: boolean;
  closedShoes: boolean;
  hairTied: boolean;
  eyeIrritation: boolean;
  eyeIrritationIntensity: number; // 0..1 (capped at 0.65 for accessibility/photosensitivity)
  skinExposure: boolean;
  exposedChemical: string | null;
  coatStained: boolean;
  stainColor: string | null;
}

export type PPEListener = (state: PPEState) => void;

class PPEServiceClass {
  private state: PPEState = {
    goggles: true,
    gloves: true,
    labCoat: true,
    closedShoes: true,
    hairTied: true,
    eyeIrritation: false,
    eyeIrritationIntensity: 0,
    skinExposure: false,
    exposedChemical: null,
    coatStained: false,
    stainColor: null,
  };

  private listeners: Set<PPEListener> = new Set();

  public subscribe(listener: PPEListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): PPEState {
    return { ...this.state };
  }

  private notify(): void {
    const s = this.getState();
    for (const listener of this.listeners) {
      listener(s);
    }
  }

  public toggleItem(item: PPEItem): void {
    this.state[item] = !this.state[item];
    this.notify();
  }

  public setItem(item: PPEItem, equipped: boolean): void {
    this.state[item] = equipped;
    this.notify();
  }

  /**
   * Chemical splash consequence logic: Neutralized per user preference.
   */
  public handleChemicalSplash(_substances: string[], _color?: string): void {
    // PPE requirements removed per user request: no eye irritation or skin exposure penalties
    return;
  }

  /**
   * Eye wash station wash procedure
   */
  public rinseAtEyeWash(): void {
    this.state.eyeIrritation = false;
    this.state.eyeIrritationIntensity = 0;
    this.notify();
  }

  /**
   * Wash hands at lab sink
   */
  public washHands(): void {
    this.state.skinExposure = false;
    this.state.exposedChemical = null;
    this.notify();
  }

  /**
   * Change / clean lab coat
   */
  public changeCoat(): void {
    this.state.coatStained = false;
    this.state.stainColor = null;
    this.notify();
  }
}

export const ppeService = new PPEServiceClass();
