# KNOWN LIMITATIONS AND PHYSICAL BOUNDS

In accordance with scientific integrity principles, the ChemDex 2D virtual laboratory explicitly documents its operational scope, simplifying assumptions, and physical approximations:

---

## 1. Thermodynamic & Thermal Assumptions
1. **Calorimetric Heat Losses**:
   - The reaction calorimetry module employs a lumped capacitance adiabatic model:
     $$\Delta T = \frac{-q_{\text{reaction}}}{m_{\text{solution}} \cdot c_p + C_{\text{calorimeter}}}$$
   - Radiative and convective environmental heat dissipation is simulated during sustained cooling phases, but neglected during instantaneous mixing intervals.
2. **Boiling Temperature Cap**:
   - Boiling is capped at $100.0^\circ\text{C}$ (or $102.5^\circ\text{C}$ for elevation) under standard atmospheric pressure ($1.0\text{ atm}$). Elevation effects from extreme barometric shifts are not simulated.

---

## 2. Solution Chemistry & Equilibria Assumptions
1. **Dilute Aqueous Medium Approximation**:
   - Ion activity coefficients ($\gamma_i$) are approximated as unity ($\gamma_i \approx 1.0$), valid for dilute educational solutions ($\le 0.1\text{ M} - 0.5\text{ M}$).
   - Very concentrated or fuming acids (e.g. $18\text{ M } \text{H}_2\text{SO}_4$) are handled with safety warnings rather than non-ideal activity models (such as Pitzer or Debye-Hückel extended models).
2. **Liquid Volume Additivity**:
   - Except for documented non-ideal binary systems (such as ethanol-water mixtures which exhibit $\approx 3.5\%$ volume contraction), aqueous solutions are treated as volume-additive:
     $$V_{\text{total}} \approx V_1 + V_2$$
3. **Equilibrium Kinetics**:
   - Fast inorganic ionic reactions (precipitation, proton-transfer neutralizations) are modeled as proceeding to thermodynamic stoichiometric completion within the calculation cycle.
   - Solid phase thermal decompositions (e.g. $\text{Cu(OH)}_2 \rightarrow \text{CuO}$) require active thermal initiation ($\ge 65^\circ\text{C}$).

---

## 3. Gas Transport and Open-Vessel Boundary
1. **Escaped Gas Accounting**:
   - In open vessels, evolved gases ($\text{CO}_2$, $\text{H}_2$, $\text{O}_2$) escape into the surroundings. The vessel's measured mass decreases by the exact mass of escaped gas, while the global ledger tracks total matter conservation.
   - Gas solubility under varying partial pressures (Henry's Law) is not dynamically tracked for open beakers.

---

## 4. Unsupported Chemical Mixtures
- If an unsupported combination of substances is mixed in a vessel:
  - The simulator preserves the material inventory without inventing fictitious reactions or arbitrary outcomes.
  - The mixture remains fully accessible for subsequent dilution, heating, or separation.
