/**
 * heater.ts - Physical thermal models for laboratory heating and cooling equipment.
 * 
 * Physical Models:
 * 1. Hot Plate:
 *    dT_plate/dt = (T_set - T_plate) / τ_plate  (first-order thermal lag, τ ≈ 45 s)
 *    Q_transfer = U · A_contact · (T_plate - T_vessel_bottom)
 * 2. Bunsen Burner:
 *    Dual mode: Premixed blue flame (air vent open, ~1500 °C) vs luminous yellow (air vent closed, ~850 °C).
 *    Local concentrated heat flux Q_burner ≈ 300 - 600 W.
 * 3. Ice Bath:
 *    Constant 273.15 K boundary condition, absorbs heat via ice fusion L_f = 334 kJ/kg.
 * 
 * Units: SI internally (K, W, s, W/m²K, m²)
 */

export type HeaterType = 'none' | 'hotplate' | 'bunsen' | 'icebath';

export interface HeaterState {
  type: HeaterType;
  isOn: boolean;
  setpointTempK: number;
  currentTempK: number;
  powerW: number;
  isAirHoleOpen: boolean; // For Bunsen burner
}

export class HeaterDevice {
  public type: HeaterType = 'none';
  public isOn: boolean = false;
  public setpointTempK: number = 293.15;
  public currentTempK: number = 293.15;
  public isAirHoleOpen: boolean = true; // Blue flame by default

  private hotplateTau: number = 45.0; // 45 s thermal time constant
  private uOverall: number = 450.0;   // Heat transfer coefficient W/(m² K)

  public setType(type: HeaterType): void {
    this.type = type;
    if (type === 'icebath') {
      this.currentTempK = 273.15;
      this.setpointTempK = 273.15;
      this.isOn = true;
    } else if (type === 'bunsen') {
      this.currentTempK = 293.15;
    }
  }

  public setPower(on: boolean, setpointC: number = 150): void {
    this.isOn = on;
    this.setpointTempK = setpointC + 273.15;
  }

  /**
   * Update heater device temperature and calculate net heat transferred to vessel bottom (W)
   */
  public step(dt: number, vesselBottomTempK: number, contactAreaM2: number = 0.005): number {
    if (dt <= 0 || !this.isOn || this.type === 'none') {
      // Passive cooling back to ambient (293.15 K)
      this.currentTempK += (293.15 - this.currentTempK) * Math.min(1.0, 0.05 * dt);
      return 0;
    }

    if (this.type === 'hotplate') {
      // First-order thermal lag towards setpoint
      this.currentTempK += ((this.setpointTempK - this.currentTempK) / this.hotplateTau) * dt;
      const deltaT = Math.max(0, this.currentTempK - vesselBottomTempK);
      return this.uOverall * contactAreaM2 * deltaT;
    }

    if (this.type === 'bunsen') {
      // Immediate flame power delivery
      const maxPower = this.isAirHoleOpen ? 550.0 : 350.0;
      this.currentTempK = this.isAirHoleOpen ? 1773.15 : 1123.15; // 1500°C blue / 850°C yellow
      const deltaT = Math.max(0, this.currentTempK - vesselBottomTempK);
      const transferredW = Math.min(maxPower, 200.0 + deltaT * 0.2);
      return transferredW;
    }

    if (this.type === 'icebath') {
      this.currentTempK = 273.15;
      // Cooling is negative heat into vessel
      const deltaT = vesselBottomTempK - 273.15;
      return -this.uOverall * contactAreaM2 * Math.max(0, deltaT);
    }

    return 0;
  }
}
