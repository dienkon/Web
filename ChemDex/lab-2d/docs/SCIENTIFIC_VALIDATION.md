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
For any reaction network within a tracked system:
$$\sum_{\text{initial}} m_i = \sum_{\text{vessel contents}} m_j + \sum_{\text{escaped gas}} m_{\text{gas}}$$
$$\forall \text{ element } E: \quad \sum_{\text{initial}} n_i \cdot \text{count}(E, i) = \sum_{\text{final}} n_j \cdot \text{count}(E, j)$$
- Mass error tolerance: $\le 0.05\text{ g}$ (accounting for IEEE 754 float precision).
- Element atom tolerance: $\le 10^{-4}\text{ mol}$.

### 2.2 Stoichiometry & Limiting Reagent Extent
For general reaction $\sum_r \nu_r R_r \rightarrow \sum_p \nu_p P_p$:
$$\xi = \min_r \left( \frac{n_r}{\nu_r} \right)$$
$$n_r(\text{final}) = n_r(\text{initial}) - \nu_r \cdot \xi$$
$$n_p(\text{final}) = n_p(\text{initial}) + \nu_p \cdot \xi$$

### 2.3 Dilute Solution Acid-Base Equilibria & pH
Under the dilute aqueous assumption at $298.15\text{ K}$ ($K_w = 1.0 \times 10^{-14}$):
- **Excess strong acid** ($n_{\text{H}^+} > n_{\text{OH}^-}$):
  $$[\text{H}^+] = \frac{n_{\text{H}^+} - n_{\text{OH}^-}}{V_{\text{liters}}}$$
  $$\text{pH} = -\log_{10}[\text{H}^+]$$
- **Excess strong base** ($n_{\text{OH}^-} > n_{\text{H}^+}$):
  $$[\text{OH}^-] = \frac{n_{\text{OH}^-} - n_{\text{H}^+}}{V_{\text{liters}}}$$
  $$\text{pOH} = -\log_{10}[\text{OH}^-], \quad \text{pH} = 14.0 - \text{pOH}$$
- **Weak acid buffer (Henderson-Hasselbalch)**:
  $$\text{pH} = \text{pK}_a + \log_{10}\left( \frac{[\text{A}^-]}{[\text{HA}]} \right)$$

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

1. **Dilute Aqueous Assumption**: Solution density is assumed $\approx 1.00 - 1.05\text{ g/mL}$ across standard school-level concentrations ($0.01\text{ M} - 1.0\text{ M}$).
2. **Ideal Liquid Volume Additivity**: Except for marked binary systems with documented excess volume contraction (e.g. ethanol-water), aqueous solution mixing volumes are treated as additive ($V_{\text{total}} \approx V_1 + V_2$).
3. **Calorimetric Losses**: The thermal simulation employs an adiabatic approximation with a standard glass vessel thermal capacitance of $32.0\text{ J/K}$. Radiative heat loss to the surrounding atmosphere is modeled for cooling phases but omitted during rapid neutralization intervals.
