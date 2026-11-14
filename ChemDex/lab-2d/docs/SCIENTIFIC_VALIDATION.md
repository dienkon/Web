# SCIENTIFIC VALIDATION REPORT

## 1. Overview and Standards

The ChemDex 2D virtual laboratory engine calculates reaction outcomes using deterministic scientific laws rather than arbitrary visual animations or pre-scripted state transitions.

The engine was evaluated against standard chemical benchmarks and authoritative physical references:
- **IUPAC Periodic Table of the Elements & Standard Atomic Weights**
- **NIST Chemistry WebBook** (Reaction enthalpies, heat capacities)
- **OpenStax Chemistry 2e** (Acid-base equilibria, solubility product constants $K_{sp}$, Henderson-Hasselbalch equations)
- **CRC Handbook of Chemistry and Physics**

---

## 2. Core Scientific Equations & Models

### 2.1 Conservation of Mass & Elements (Ledger Invariants)
For any reaction network within a closed system boundary (or with escaped gases tracked):
$$\sum_{\text{initial}} m_i = \sum_{\text{vessel contents}} m_j + \sum_{\text{escaped gas}} m_{\text{gas}}$$
$$\forall \text{ element } E: \quad \sum_{\text{initial}} n_i \cdot \text{count}(E, i) = \sum_{\text{final}} n_j \cdot \text{count}(E, j)$$
- Verified invariant in `src/chemistry/__tests__/conservationAndAiGate.test.ts` across all simulatable entries in the **1,431 compiled curriculum/catalog reactions** and **95 curated `REACTION_DATABASE` entries**:
  - Element discrepancy tolerance: $\le 10^{-9}\text{ mol}$ per element.
  - Mass discrepancy tolerance: $\le 10^{-6}\text{ g}$.

### 2.2 Stoichiometry & Limiting Reagent Extent
For general reaction $\sum_r \nu_r R_r \rightarrow \sum_p \nu_p P_p$:
$$\xi = \min_r \left( \frac{n_r}{\nu_r} \right)$$
$$n_r(\text{final}) = n_r(\text{initial}) - \nu_r \cdot \xi$$
$$n_p(\text{final}) = n_p(\text{initial}) + \nu_p \cdot \xi$$

### 2.3 Aqueous Charge-Balance Equilibrium & pH
Under aqueous speciation (`src/chemistry/equilibrium/aqueous/`), $[\text{H}^+]$ is solved via monotonic charge-balance bisection:
$$[\text{H}^+] + \sum_c z_c [\text{C}^{z_c+}] = [\text{OH}^-] + \sum_a z_a [\text{A}^{z_a-}]$$
incorporating Davies/Debye-Hückel activity coefficients, temperature-dependent autoionization $K_w(T)$ ($pK_w = 14.00$ at $25^\circ\text{C}$, decreasing to $\approx 13.26$ at $50^\circ\text{C}$), weak monoprotic/diprotic/triprotic acid-base ionization ($\text{CH}_3\text{COOH}$, $\text{NH}_3$, $\text{H}_2\text{CO}_3$, $\text{H}_3\text{PO}_4$), and transition-metal / conjugate hydrolysis. A fallback heuristic is retained in `src/chemistry/equilibrium/acidBase.ts` only for unrecognized custom species or $T > 90^\circ\text{C}$.

Verified pH benchmarks in `src/chemistry/__tests__/aqueousBenchmarks.test.ts` (all passing within $\pm 0.05\text{ pH}$):
- Pure $\text{H}_2\text{O}$ at $25^\circ\text{C}$ ($7.00$) and $50^\circ\text{C}$ ($K_w$-adjusted $\approx 6.63$)
- $10^{-8}\text{ M HCl}$ (charge balance with water autoionization, $\approx 6.98$ vs naive $8.00$)
- $0.1\text{ M CH}_3\text{COOH}$ ($pK_a = 4.76 \rightarrow 2.88$)
- $0.1\text{ M CH}_3\text{COOH} + 0.1\text{ M CH}_3\text{COONa}$ half-equivalence buffer ($4.76$)
- $0.1\text{ M NH}_4\text{Cl}$ hydrolysis ($\approx 5.13$) and $0.1\text{ M Na}_2\text{CO}_3$ basicity ($\approx 11.6$)
- $0.1\text{ M NaH}_2\text{PO}_4 / \text{Na}_2\text{HPO}_4$ phosphate buffer ($7.21$) and $0.1\text{ M NH}_4\text{CH}_3\text{COO}$ ampholyte ($\approx 7.00$)

### 2.4 Reaction Thermodynamics & Calorimetry
Lumped adiabatic capacitance model:
$$q_{\text{reaction}} = \xi \cdot \Delta_r H^\circ$$
$$C_{\text{total}} = m_{\text{solution}} \cdot c_p + C_{\text{calorimeter}}$$
$$\Delta T = \frac{-q_{\text{reaction}}}{C_{\text{total}}}$$
where $c_p = 4.184\text{ J/(g}\cdot\text{K)}$ and $C_{\text{calorimeter}} \approx 32.0\text{ J/K}$ for a standard laboratory glassware beaker.

---

## 3. Verified Benchmark Cases

| Benchmark Case | Experimental Parameters | Expected Scientific Outcome | Simulator Result | Status |
|---|---|---|---|---|
| **Case A: Neutralization** | $50.0\text{ mL } 0.100\text{ M HCl} + 50.0\text{ mL } 0.100\text{ M NaOH}$ | $\xi = 0.00500\text{ mol}$; $n_{\text{NaCl}} = 0.00500\text{ mol}$; $\text{pH} = 7.00$; $\Delta T > 0$ | $\xi = 0.00500$; $\text{pH} = 7.00$; $\Delta T = +0.6^\circ\text{C}$; $\Delta m = 0\text{ g}$ | **PASS** |
| **Case B: Excess Acid** | $100.0\text{ mL } 0.100\text{ M HCl} + 50.0\text{ mL } 0.100\text{ M NaOH}$ | Excess $[\text{H}^+] = 0.0333\text{ M}$; $\text{pH} = 1.48$ | $\text{pH} = 1.48$; Limiting reagent: NaOH | **PASS** |
| **Case C: Precipitation** | $10.0\text{ mL } 0.100\text{ M AgNO}_3 + 10.0\text{ mL } 0.100\text{ M NaCl}$ | $0.00100\text{ mol AgCl}(s) = 0.143\text{ g}$; white curdy precipitate | Insoluble white curdy AgCl formed ($0.143\text{ g}$); $100\%$ mass conservation | **PASS** |
| **Case D: Gas Evolution** | $0.010\text{ mol NaHCO}_3 + 0.015\text{ mol HCl}$ | Limiting: $\text{NaHCO}_3$; $0.010\text{ mol CO}_2$ escaped; open vessel mass drops | $0.010\text{ mol CO}_2$ released; vessel mass decreased by $0.44\text{ g}$ | **PASS** |
| **Case E: Thermal Decomposition** | $0.002\text{ mol Cu(OH)}_2$ heated $> 65^\circ\text{C}$ | Unreactive at $25^\circ\text{C}$; decomposes into black $\text{CuO}(s)$ upon heating | No rx at $25^\circ\text{C}$; black $\text{CuO}$ formed at $75^\circ\text{C}$ | **PASS** |
| **Case F: Indicators** | Phenolphthalein in acid vs base | Colorless at $\text{pH} \le 8.2$; vibrant pink at $\text{pH} \ge 8.2$ | Colorless at pH 1.0 & 7.0; pink at pH 9.5 | **PASS** |
| **Case G: Molar Mass** | $\text{H}_2\text{SO}_4$, $\text{CuSO}_4\cdot 5\text{H}_2\text{O}$ | $\text{H}_2\text{SO}_4 = 98.072\text{ g/mol}$; hydrate $= 249.68\text{ g/mol}$ | Matched to within $0.01\text{ g/mol}$ | **PASS** |

---

## 4. Documented Educational Approximations & Limitations

1. **Ionic Activity & Temperature**: Activity coefficients use Debye-Hückel/Davies approximations suitable for $\le 0.5\text{ M}$ aqueous media; highly concentrated acids trigger dilution hazard checks instead of Pitzer activity modeling.
2. **Ideal Liquid Volume Additivity**: Except for marked binary systems with documented excess volume contraction (e.g. ethanol-water), aqueous solution mixing volumes are treated as additive ($V_{\text{total}} \approx V_1 + V_2$).
3. **Calorimetric Losses**: The thermal simulation employs an adiabatic approximation with a standard glass vessel thermal capacitance of $32.0\text{ J/K}$. Radiative/convective heat exchange with ambient air is applied during world stepping (`stepLabWorld`).
