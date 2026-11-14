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
1. **Aqueous Speciation & Temperature Bounds**:
   - The iterative charge-balance pH solver (`src/chemistry/equilibrium/aqueous/`) applies Debye-Hückel / Davies activity corrections and temperature-dependent water autoionization $K_w(T)$ across $0^\circ\text{C} - 90^\circ\text{C}$.
   - For unrecognized chemical formulas or superheated regimes ($T > 90^\circ\text{C}$), `acidBase.ts` falls back to a simplified strong/weak heuristic model; concentrated non-ideal electrolyte solutions (e.g. $18\text{ M }\text{H}_2\text{SO}_4$) are guarded with dilution safety warnings rather than Pitzer ion-interaction equations.
2. **Liquid Volume Additivity**:
   - Except for documented non-ideal binary systems (such as ethanol-water mixtures which exhibit $\approx 3.5\%$ volume contraction), aqueous solutions are treated as volume-additive:
     $$V_{\text{total}} \approx V_1 + V_2$$
3. **Equilibrium Kinetics**:
   - Fast inorganic ionic reactions (precipitation, proton-transfer neutralizations) proceed to stoichiometric completion unless realtime kinetics mode (`realtimeKinetics`) is enabled.
   - Solid phase thermal decompositions (e.g. $\text{Cu(OH)}_2 \rightarrow \text{CuO}$) require active thermal initiation.

---

## 3. Gas Transport and Open-Vessel Boundary
1. **Escaped Gas Accounting**:
   - In open vessels, evolved gases ($\text{CO}_2$, $\text{H}_2$, $\text{O}_2$) escape into the surroundings. The vessel's measured mass decreases by the exact mass of escaped gas, while the global ledger tracks total matter conservation.
   - Gas solubility under varying partial pressures (Henry's Law) is not dynamically tracked for open beakers.

---

## 4. Unsupported Mixtures & AI Reaction Proposals
- If an unsupported combination of substances is mixed in a vessel:
  - The deterministic engine preserves the material inventory without inventing fictitious outcomes.
  - The optional Gemini AI reaction helper (`validateGeminiReactionPayload`) strictly rejects unbalanced equations, malformed formulas, or hallucinated reactants not present in the vessel, defaults omitted $\Delta H^\circ$ values to $0\text{ kJ/mol}$, and marks accepted proposals with `provenance: 'ai-unverified'` (`AI – chưa kiểm chứng`).
- **BYOK Client Key Storage**: Users entering their own Gemini API key in `ApiKeyModal` store it only in `sessionStorage`; production deployments requiring private keys should route calls through a server-side proxy instead of `VITE_*` build variables.
