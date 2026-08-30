/**
 * ============================================================
 * NomenclatureEngine v3 - ENGLISH ONLY
 * ============================================================
 *
 * NO VIETNAMESE NOMENCLATURE IS GENERATED.
 *
 * API:
 *   NomenclatureEngine.analyze("FeCl3")
 *   NomenclatureEngine.analyze("iron(III) chloride")
 *   NomenclatureEngine.analyze("ferric chloride")
 *   NomenclatureEngine.analyze("H2SO4")
 *   NomenclatureEngine.analyze("sulfuric acid")
 *   NomenclatureEngine.analyze("CuSO4·5H2O")
 *   NomenclatureEngine.analyze("calcium carbonate")
 *
 * Output language:
 *   English / IUPAC-style
 *
 * IMPORTANT:
 * Molecular formula alone cannot distinguish structural/stereoisomers.
 * This engine therefore performs formula-based nomenclature.
 * ============================================================
 */

window.NomenclatureEngine = (function () {
    "use strict";

    /* ========================================================
       1. ELEMENTS
       ======================================================== */

    const ELEMENTS = {
        H: { name: "hydrogen", symbol: "H", ox: [1, -1], nonmetal: true },
        He: { name: "helium", symbol: "He", ox: [0], noble: true },

        Li: { name: "lithium", symbol: "Li", ox: [1], metal: true },
        Be: { name: "beryllium", symbol: "Be", ox: [2], metal: true },
        B: { name: "boron", symbol: "B", ox: [3], metalloid: true },
        C: { name: "carbon", symbol: "C", ox: [-4, 2, 4], nonmetal: true },
        N: { name: "nitrogen", symbol: "N", ox: [-3, 1, 2, 3, 4, 5], nonmetal: true },
        O: { name: "oxygen", symbol: "O", ox: [-2], nonmetal: true },
        F: { name: "fluorine", symbol: "F", ox: [-1], halogen: true },

        Ne: { name: "neon", symbol: "Ne", ox: [0], noble: true },

        Na: { name: "sodium", symbol: "Na", ox: [1], metal: true },
        Mg: { name: "magnesium", symbol: "Mg", ox: [2], metal: true },
        Al: { name: "aluminum", symbol: "Al", ox: [3], metal: true },
        Si: { name: "silicon", symbol: "Si", ox: [-4, 4], metalloid: true },
        P: { name: "phosphorus", symbol: "P", ox: [-3, 3, 5], nonmetal: true },
        S: { name: "sulfur", symbol: "S", ox: [-2, 4, 6], nonmetal: true },
        Cl: { name: "chlorine", symbol: "Cl", ox: [-1, 1, 3, 5, 7], halogen: true },

        Ar: { name: "argon", symbol: "Ar", ox: [0], noble: true },

        K: { name: "potassium", symbol: "K", ox: [1], metal: true },
        Ca: { name: "calcium", symbol: "Ca", ox: [2], metal: true },
        Sc: { name: "scandium", symbol: "Sc", ox: [3], metal: true },
        Ti: { name: "titanium", symbol: "Ti", ox: [2, 3, 4], metal: true },
        V: { name: "vanadium", symbol: "V", ox: [2, 3, 4, 5], metal: true },
        Cr: { name: "chromium", symbol: "Cr", ox: [2, 3, 6], metal: true },
        Mn: { name: "manganese", symbol: "Mn", ox: [2, 3, 4, 6, 7], metal: true },
        Fe: { name: "iron", symbol: "Fe", ox: [2, 3], metal: true },
        Co: { name: "cobalt", symbol: "Co", ox: [2, 3], metal: true },
        Ni: { name: "nickel", symbol: "Ni", ox: [2, 3], metal: true },
        Cu: { name: "copper", symbol: "Cu", ox: [1, 2], metal: true },
        Zn: { name: "zinc", symbol: "Zn", ox: [2], metal: true },
        Ga: { name: "gallium", symbol: "Ga", ox: [3], metal: true },
        Ge: { name: "germanium", symbol: "Ge", ox: [2, 4], metalloid: true },
        As: { name: "arsenic", symbol: "As", ox: [-3, 3, 5], metalloid: true },
        Se: { name: "selenium", symbol: "Se", ox: [-2, 4, 6], nonmetal: true },
        Br: { name: "bromine", symbol: "Br", ox: [-1, 1, 3, 5, 7], halogen: true },
        Kr: { name: "krypton", symbol: "Kr", ox: [0], noble: true },

        Rb: { name: "rubidium", symbol: "Rb", ox: [1], metal: true },
        Sr: { name: "strontium", symbol: "Sr", ox: [2], metal: true },
        Y: { name: "yttrium", symbol: "Y", ox: [3], metal: true },
        Zr: { name: "zirconium", symbol: "Zr", ox: [4], metal: true },
        Nb: { name: "niobium", symbol: "Nb", ox: [3, 5], metal: true },
        Mo: { name: "molybdenum", symbol: "Mo", ox: [2, 3, 4, 5, 6], metal: true },
        Tc: { name: "technetium", symbol: "Tc", ox: [4, 7], metal: true },
        Ru: { name: "ruthenium", symbol: "Ru", ox: [2, 3, 4], metal: true },
        Rh: { name: "rhodium", symbol: "Rh", ox: [3], metal: true },
        Pd: { name: "palladium", symbol: "Pd", ox: [2, 4], metal: true },
        Ag: { name: "silver", symbol: "Ag", ox: [1], metal: true },
        Cd: { name: "cadmium", symbol: "Cd", ox: [2], metal: true },
        In: { name: "indium", symbol: "In", ox: [1, 3], metal: true },
        Sn: { name: "tin", symbol: "Sn", ox: [2, 4], metal: true },
        Sb: { name: "antimony", symbol: "Sb", ox: [3, 5], metalloid: true },
        Te: { name: "tellurium", symbol: "Te", ox: [-2, 4, 6], metalloid: true },
        I: { name: "iodine", symbol: "I", ox: [-1, 1, 3, 5, 7], halogen: true },
        Xe: { name: "xenon", symbol: "Xe", ox: [0], noble: true },

        Cs: { name: "cesium", symbol: "Cs", ox: [1], metal: true },
        Ba: { name: "barium", symbol: "Ba", ox: [2], metal: true },
        La: { name: "lanthanum", symbol: "La", ox: [3], metal: true },
        Ce: { name: "cerium", symbol: "Ce", ox: [3, 4], metal: true },
        Pr: { name: "praseodymium", symbol: "Pr", ox: [3, 4], metal: true },
        Nd: { name: "neodymium", symbol: "Nd", ox: [3], metal: true },
        Sm: { name: "samarium", symbol: "Sm", ox: [2, 3], metal: true },
        Eu: { name: "europium", symbol: "Eu", ox: [2, 3], metal: true },
        Gd: { name: "gadolinium", symbol: "Gd", ox: [3], metal: true },
        Tb: { name: "terbium", symbol: "Tb", ox: [3, 4], metal: true },
        Dy: { name: "dysprosium", symbol: "Dy", ox: [3], metal: true },
        Ho: { name: "holmium", symbol: "Ho", ox: [3], metal: true },
        Er: { name: "erbium", symbol: "Er", ox: [3], metal: true },
        Tm: { name: "thulium", symbol: "Tm", ox: [3], metal: true },
        Yb: { name: "ytterbium", symbol: "Yb", ox: [2, 3], metal: true },
        Lu: { name: "lutetium", symbol: "Lu", ox: [3], metal: true },

        Hf: { name: "hafnium", symbol: "Hf", ox: [4], metal: true },
        Ta: { name: "tantalum", symbol: "Ta", ox: [5], metal: true },
        W: { name: "tungsten", symbol: "W", ox: [4, 6], metal: true },
        Re: { name: "rhenium", symbol: "Re", ox: [4, 6, 7], metal: true },
        Os: { name: "osmium", symbol: "Os", ox: [4, 6, 8], metal: true },
        Ir: { name: "iridium", symbol: "Ir", ox: [3, 4], metal: true },
        Pt: { name: "platinum", symbol: "Pt", ox: [2, 4], metal: true },
        Au: { name: "gold", symbol: "Au", ox: [1, 3], metal: true },
        Hg: { name: "mercury", symbol: "Hg", ox: [1, 2], metal: true },
        Tl: { name: "thallium", symbol: "Tl", ox: [1, 3], metal: true },
        Pb: { name: "lead", symbol: "Pb", ox: [2, 4], metal: true },
        Bi: { name: "bismuth", symbol: "Bi", ox: [3, 5], metal: true },

        Po: { name: "polonium", symbol: "Po", ox: [2, 4, 6], metalloid: true },
        At: { name: "astatine", symbol: "At", ox: [-1, 1, 3, 5, 7], halogen: true },
        Rn: { name: "radon", symbol: "Rn", ox: [0], noble: true },

        Fr: { name: "francium", symbol: "Fr", ox: [1], metal: true },
        Ra: { name: "radium", symbol: "Ra", ox: [2], metal: true },
        Ac: { name: "actinium", symbol: "Ac", ox: [3], metal: true },
        Th: { name: "thorium", symbol: "Th", ox: [4], metal: true },
        Pa: { name: "protactinium", symbol: "Pa", ox: [5], metal: true },
        U: { name: "uranium", symbol: "U", ox: [3, 4, 5, 6], metal: true },
        Np: { name: "neptunium", symbol: "Np", ox: [3, 4, 5, 6], metal: true },
        Pu: { name: "plutonium", symbol: "Pu", ox: [3, 4, 5, 6], metal: true }
    };

    /* ========================================================
       2. POLYATOMIC IONS
       ======================================================== */

    const IONS = {
        NH4: {
            name: "ammonium",
            charge: 1,
            cation: true
        },

        OH: {
            name: "hydroxide",
            charge: -1
        },

        CN: {
            name: "cyanide",
            charge: -1
        },

        SCN: {
            name: "thiocyanate",
            charge: -1
        },

        NO2: {
            name: "nitrite",
            charge: -1
        },

        NO3: {
            name: "nitrate",
            charge: -1
        },

        ClO: {
            name: "hypochlorite",
            charge: -1
        },

        ClO2: {
            name: "chlorite",
            charge: -1
        },

        ClO3: {
            name: "chlorate",
            charge: -1
        },

        ClO4: {
            name: "perchlorate",
            charge: -1
        },

        BrO: {
            name: "hypobromite",
            charge: -1
        },

        BrO2: {
            name: "bromite",
            charge: -1
        },

        BrO3: {
            name: "bromate",
            charge: -1
        },

        BrO4: {
            name: "perbromate",
            charge: -1
        },

        IO: {
            name: "hypoiodite",
            charge: -1
        },

        IO2: {
            name: "iodite",
            charge: -1
        },

        IO3: {
            name: "iodate",
            charge: -1
        },

        IO4: {
            name: "periodate",
            charge: -1
        },

        MnO4: {
            name: "permanganate",
            charge: -1
        },

        MnO4: {
            name: "permanganate",
            charge: -1
        },

        CH3COO: {
            name: "acetate",
            charge: -1
        },

        C2H3O2: {
            name: "acetate",
            charge: -1
        },

        HCOO: {
            name: "formate",
            charge: -1
        },

        ClO2: {
            name: "chlorite",
            charge: -1
        },

        HCO3: {
            name: "hydrogen carbonate",
            charge: -1
        },

        HSO4: {
            name: "hydrogen sulfate",
            charge: -1
        },

        HSO3: {
            name: "hydrogen sulfite",
            charge: -1
        },

        H2PO4: {
            name: "dihydrogen phosphate",
            charge: -1
        },

        HPO4: {
            name: "hydrogen phosphate",
            charge: -2
        },

        CO3: {
            name: "carbonate",
            charge: -2
        },

        SO3: {
            name: "sulfite",
            charge: -2
        },

        SO4: {
            name: "sulfate",
            charge: -2
        },

        S2O3: {
            name: "thiosulfate",
            charge: -2
        },

        C2O4: {
            name: "oxalate",
            charge: -2
        },

        CrO4: {
            name: "chromate",
            charge: -2
        },

        Cr2O7: {
            name: "dichromate",
            charge: -2
        },

        O2: {
            name: "peroxide",
            charge: -2
        },

        PO4: {
            name: "phosphate",
            charge: -3
        },

        BO3: {
            name: "borate",
            charge: -3
        }
    };

    /* ========================================================
       3. ENGLISH COMMON / TRADITIONAL NAMES
       ======================================================== */

    const ENGLISH_NAMES = {

        /* Water / inorganic */

        "water": "H2O",
        "hydrogen oxide": "H2O",
        "dihydrogen monoxide": "H2O",

        "hydrogen peroxide": "H2O2",

        "ammonia": "NH3",
        "hydrogen sulfide": "H2S",
        "hydrogen fluoride": "HF",
        "hydrogen chloride": "HCl",
        "hydrogen bromide": "HBr",
        "hydrogen iodide": "HI",

        "nitric acid": "HNO3",
        "nitrous acid": "HNO2",
        "sulfuric acid": "H2SO4",
        "sulphuric acid": "H2SO4",
        "sulfurous acid": "H2SO3",
        "sulphurous acid": "H2SO3",
        "phosphoric acid": "H3PO4",
        "carbonic acid": "H2CO3",
        "hydrofluoric acid": "HF",
        "hydrochloric acid": "HCl",
        "hydrobromic acid": "HBr",
        "hydroiodic acid": "HI",
        "hydrosulfuric acid": "H2S",
        "hydrosulphuric acid": "H2S",

        /* Common inorganic */

        "table salt": "NaCl",
        "sodium chloride": "NaCl",

        "baking soda": "NaHCO3",
        "sodium bicarbonate": "NaHCO3",
        "sodium hydrogen carbonate": "NaHCO3",

        "washing soda": "Na2CO3",
        "sodium carbonate": "Na2CO3",

        "caustic soda": "NaOH",
        "sodium hydroxide": "NaOH",

        "caustic potash": "KOH",
        "potassium hydroxide": "KOH",

        "slaked lime": "Ca(OH)2",
        "calcium hydroxide": "Ca(OH)2",

        "quicklime": "CaO",
        "calcium oxide": "CaO",

        "limestone": "CaCO3",
        "calcium carbonate": "CaCO3",

        "bleach": "NaClO",
        "sodium hypochlorite": "NaClO",

        "potassium permanganate": "KMnO4",
        "permanganate of potash": "KMnO4",

        "potassium dichromate": "K2Cr2O7",
        "potassium chromate": "K2CrO4",

        "ammonium nitrate": "NH4NO3",

        /* Traditional oxidation-state names */

        "ferrous chloride": "FeCl2",
        "ferric chloride": "FeCl3",

        "ferrous oxide": "FeO",
        "ferric oxide": "Fe2O3",

        "ferrous sulfate": "FeSO4",
        "ferrous sulphate": "FeSO4",

        "ferric sulfate": "Fe2(SO4)3",
        "ferric sulphate": "Fe2(SO4)3",

        "cuprous oxide": "Cu2O",
        "cupric oxide": "CuO",

        "cuprous chloride": "CuCl",
        "cupric chloride": "CuCl2",

        "cuprous sulfate": "Cu2SO4",
        "cuprous sulphate": "Cu2SO4",

        "cupric sulfate": "CuSO4",
        "cupric sulphate": "CuSO4",

        "mercurous chloride": "Hg2Cl2",
        "mercuric chloride": "HgCl2",

        "stannous chloride": "SnCl2",
        "stannic chloride": "SnCl4",

        "plumbous chloride": "PbCl2",
        "plumbic chloride": "PbCl4",

        /* Organic */

        "methane": "CH4",
        "ethane": "C2H6",
        "propane": "C3H8",
        "butane": "C4H10",
        "pentane": "C5H12",
        "hexane": "C6H14",
        "heptane": "C7H16",
        "octane": "C8H18",
        "nonane": "C9H20",
        "decane": "C10H22",

        "ethylene": "C2H4",
        "ethene": "C2H4",

        "propylene": "C3H6",
        "propene": "C3H6",

        "acetylene": "C2H2",
        "ethyne": "C2H2",

        "methanol": "CH3OH",
        "methyl alcohol": "CH3OH",

        "ethanol": "C2H5OH",
        "ethyl alcohol": "C2H5OH",

        "formaldehyde": "CH2O",
        "methanal": "CH2O",

        "acetaldehyde": "C2H4O",
        "ethanal": "C2H4O",

        "formic acid": "CH2O2",
        "methanoic acid": "CH2O2",

        "acetic acid": "C2H4O2",
        "ethanoic acid": "C2H4O2",

        "benzene": "C6H6",

        "toluene": "C7H8",
        "methylbenzene": "C7H8",

        "phenol": "C6H6O",

        "aniline": "C6H7N",
        "benzenamine": "C6H7N",

        "urea": "CH4N2O",

        "glucose": "C6H12O6",
        "dextrose": "C6H12O6",

        "fructose": "C6H12O6",

        "sucrose": "C12H22O11",

        "glycerol": "C3H8O3",
        "propane-1,2,3-triol": "C3H8O3",

        "ethylene glycol": "C2H6O2",
        "ethane-1,2-diol": "C2H6O2",

        "glycine": "C2H5NO2",
        "2-aminoacetic acid": "C2H5NO2",

        "alanine": "C3H7NO2",
        "2-aminopropanoic acid": "C3H7NO2"
    };

    /* ========================================================
       4. VIETNAMESE INPUT BLOCKLIST
       ======================================================== */

    const VIETNAMESE_MARKERS = [
        "axit",
        "acid sunfuric",
        "sunfuric",
        "sunfurơ",
        "nitric acid",
        "muoi",
        "muối",
        "oxit",
        "hidroxit",
        "hiđroxit",
        "clorua",
        "sunfat",
        "sunfit",
        "cacbonat",
        "nitrat",
        "nitrit",
        "photphat",
        "pemanganat",
        "dong",
        "đồng",
        "sat",
        "sắt",
        "natri",
        "kali",
        "canxi",
        "bari",
        "magie",
        "nhom",
        "nhôm",
        "kem",
        "kẽm",
        "bac",
        "bạc",
        "amoni",
        "amonium",
        "nước",
        "thuoc",
        "thuốc",
        "voi",
        "vôi",
        "phen",
        "phèn"
    ];

    function looksVietnamese(text) {
        const lower = String(text)
            .toLowerCase()
            .trim();

        /*
         * Detect Vietnamese diacritics first.
         */
        if (
            /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i
                .test(lower)
        ) {
            return true;
        }

        const normalized = lower
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        return VIETNAMESE_MARKERS.some(
            marker => normalized.includes(
                marker
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
            )
        );
    }

    /* ========================================================
       5. UTILITY
       ======================================================== */

    function cleanInput(value) {
        return String(value ?? "")
            .trim()
            .replace(/\u00A0/g, " ")
            .replace(/[‐-‒–—−]/g, "-")
            .replace(/[·•⋅]/g, ".")
            .replace(/\s+/g, " ");
    }

    function normalizeName(value) {
        return cleanInput(value)
            .toLowerCase()
            .replace(/\s+/g, " ");
    }

    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);

        while (b !== 0) {
            const t = a % b;
            a = b;
            b = t;
        }

        return a || 1;
    }

    const ROMAN = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV",
        5: "V",
        6: "VI",
        7: "VII",
        8: "VIII",
        9: "IX",
        10: "X"
    };

    function roman(n) {
        return ROMAN[n] || String(n);
    }

    const GREEK_PREFIX = {
        1: "mono",
        2: "di",
        3: "tri",
        4: "tetra",
        5: "penta",
        6: "hexa",
        7: "hepta",
        8: "octa",
        9: "nona",
        10: "deca",
        11: "undeca",
        12: "dodeca"
    };

    const ORGANIC_PREFIX = {
        1: "meth",
        2: "eth",
        3: "prop",
        4: "but",
        5: "pent",
        6: "hex",
        7: "hept",
        8: "oct",
        9: "non",
        10: "dec",
        11: "undec",
        12: "dodec",
        13: "tridec",
        14: "tetradec",
        15: "pentadec",
        16: "hexadec",
        17: "heptadec",
        18: "octadec",
        19: "nonadec",
        20: "eicos"
    };

    /* ========================================================
       6. FORMULA CANONICALIZATION
       ======================================================== */

    function canonicalizeFormula(formula) {
        const input = formula
            .replace(/\s+/g, "")
            .replace(/[·•⋅]/g, ".");

        let result = "";
        let i = 0;

        while (i < input.length) {
            const char = input[i];

            if (/[A-Za-z]/.test(char)) {
                let symbol = char;

                if (
                    i + 1 < input.length &&
                    /[A-Za-z]/.test(input[i + 1])
                ) {
                    const possible =
                        char + input[i + 1];

                    if (ELEMENTS[possible]) {
                        symbol = possible;
                        i++;
                    }
                }

                symbol =
                    symbol[0].toUpperCase() +
                    symbol.slice(1).toLowerCase();

                result += symbol;
            } else {
                result += char;
            }

            i++;
        }

        return result;
    }

    /* ========================================================
       7. FORMULA TOKENIZER
       ======================================================== */

    function tokenize(formula) {
        const tokens = [];
        let i = 0;

        while (i < formula.length) {
            const c = formula[i];

            if ("([{".includes(c)) {
                tokens.push({
                    type: "open",
                    value: c
                });
                i++;
                continue;
            }

            if (")]}".includes(c)) {
                tokens.push({
                    type: "close",
                    value: c
                });
                i++;
                continue;
            }

            if (c === ".") {
                tokens.push({
                    type: "dot",
                    value: "."
                });
                i++;
                continue;
            }

            if (/[A-Z]/.test(c)) {
                let symbol = c;

                if (
                    i + 1 < formula.length &&
                    /[a-z]/.test(formula[i + 1])
                ) {
                    symbol += formula[i + 1];
                    i++;
                }

                if (!ELEMENTS[symbol]) {
                    return {
                        valid: false,
                        error:
                            `Unknown element symbol: ${symbol}`
                    };
                }

                tokens.push({
                    type: "element",
                    value: symbol
                });

                i++;
                continue;
            }

            if (/[0-9]/.test(c)) {
                let number = c;
                i++;

                while (
                    i < formula.length &&
                    /[0-9]/.test(formula[i])
                ) {
                    number += formula[i];
                    i++;
                }

                tokens.push({
                    type: "number",
                    value: Number(number)
                });

                continue;
            }

            /*
             * Allow ionic charge notation:
             * Na+
             * SO4--
             */
            if (c === "+" || c === "-") {
                let charge = c;
                i++;

                while (
                    i < formula.length &&
                    (formula[i] === "+" ||
                        formula[i] === "-")
                ) {
                    charge += formula[i];
                    i++;
                }

                tokens.push({
                    type: "charge",
                    value: charge
                });

                continue;
            }

            return {
                valid: false,
                error:
                    `Invalid character "${c}" at position ${i + 1}`
            };
        }

        return {
            valid: true,
            tokens
        };
    }

    /* ========================================================
       8. FORMULA PARSER
       ======================================================== */

    function parseFormula(formula) {
        const canonical = canonicalizeFormula(formula);

        if (!canonical) {
            return {
                valid: false,
                error: "Empty formula"
            };
        }

        /*
         * Hydrates / solvates:
         *
         * CuSO4.5H2O
         * Na2CO3.10H2O
         */
        const parts = canonical.split(".");

        const total = {};
        const parsedParts = [];

        for (const rawPart of parts) {
            if (!rawPart) {
                return {
                    valid: false,
                    error: "Invalid hydrate separator"
                };
            }

            let coefficient = 1;
            let part = rawPart;

            /*
             * 5H2O
             */
            const coeffMatch =
                part.match(/^(\d+)(?=[A-Z(])/);

            if (coeffMatch) {
                coefficient =
                    Number(coeffMatch[1]);

                part =
                    part.substring(
                        coeffMatch[1].length
                    );
            }

            const tokenResult =
                tokenize(part);

            if (!tokenResult.valid) {
                return tokenResult;
            }

            const tokens =
                tokenResult.tokens;

            let index = 0;

            function parseGroup(stopAtClose) {
                const composition = {};

                while (index < tokens.length) {
                    const token =
                        tokens[index];

                    if (
                        token.type === "close"
                    ) {
                        if (!stopAtClose) {
                            return {
                                valid: false,
                                error:
                                    "Unexpected closing bracket"
                            };
                        }

                        index++;

                        return {
                            valid: true,
                            composition
                        };
                    }

                    if (
                        token.type === "open"
                    ) {
                        index++;

                        const nested =
                            parseGroup(true);

                        if (!nested.valid) {
                            return nested;
                        }

                        let multiplier = 1;

                        if (
                            index < tokens.length &&
                            tokens[index].type ===
                            "number"
                        ) {
                            multiplier =
                                tokens[index].value;

                            index++;
                        }

                        for (
                            const element
                            in nested.composition
                        ) {
                            composition[element] =
                                (composition[element] ||
                                    0) +
                                nested
                                    .composition[element] *
                                multiplier;
                        }

                        continue;
                    }

                    if (
                        token.type === "element"
                    ) {
                        const element =
                            token.value;

                        index++;

                        let count = 1;

                        if (
                            index < tokens.length &&
                            tokens[index].type ===
                            "number"
                        ) {
                            count =
                                tokens[index].value;
                            index++;
                        }

                        composition[element] =
                            (composition[element] ||
                                0) +
                            count;

                        continue;
                    }

                    if (
                        token.type ===
                        "charge"
                    ) {
                        index++;
                        continue;
                    }

                    return {
                        valid: false,
                        error:
                            "Unexpected token in formula"
                    };
                }

                if (stopAtClose) {
                    return {
                        valid: false,
                        error:
                            "Missing closing bracket"
                    };
                }

                return {
                    valid: true,
                    composition
                };
            }

            const parsed =
                parseGroup(false);

            if (!parsed.valid) {
                return parsed;
            }

            const scaled = {};

            for (
                const element
                in parsed.composition
            ) {
                const count =
                    parsed.composition[element] *
                    coefficient;

                scaled[element] = count;

                total[element] =
                    (total[element] || 0) +
                    count;
            }

            parsedParts.push({
                formula: rawPart,
                coefficient,
                composition: scaled
            });
        }

        return {
            valid: true,
            formula: canonical,
            composition: total,
            parts: parsedParts,
            isHydrate: parts.length > 1
        };
    }

    /* ========================================================
       9. COMPOSITION HELPERS
       ======================================================== */

    function sameComposition(a, b) {
        const keys = new Set([
            ...Object.keys(a),
            ...Object.keys(b)
        ]);

        for (const key of keys) {
            if ((a[key] || 0) !== (b[key] || 0)) {
                return false;
            }
        }

        return true;
    }

    function containsOnly(comp, allowed) {
        return Object.keys(comp)
            .every(k => allowed.includes(k));
    }

    function countElements(comp) {
        return Object.keys(comp).length;
    }

    /* ========================================================
       10. OXIDATION STATE
       ======================================================== */

    function inferOxidationState(
        composition,
        element
    ) {
        if (!composition[element]) {
            return null;
        }

        let knownCharge = 0;

        for (
            const current
            in composition
        ) {
            if (current === element) {
                continue;
            }

            const amount =
                composition[current];

            /*
             * Standard school-level rules.
             */
            if (current === "O") {
                knownCharge += amount * -2;
                continue;
            }

            if (current === "H") {
                knownCharge += amount * 1;
                continue;
            }

            if (
                ["F", "Cl", "Br", "I"]
                    .includes(current)
            ) {
                knownCharge += amount * -1;
                continue;
            }

            /*
             * Fixed-charge metals
             */
            const data =
                ELEMENTS[current];

            if (
                data &&
                data.ox &&
                data.ox.length === 1
            ) {
                knownCharge +=
                    amount * data.ox[0];
            }
        }

        return (
            -knownCharge /
            composition[element]
        );
    }

    /* ========================================================
       11. CATION DETECTION
       ======================================================== */

    function findCation(formula) {
        if (formula.startsWith("NH4")) {
            let rest =
                formula.substring(3);

            let count = 1;

            const match =
                rest.match(/^(\d+)/);

            if (match) {
                count =
                    Number(match[1]);

                rest =
                    rest.substring(
                        match[1].length
                    );
            }

            return {
                symbol: "NH4",
                name: "ammonium",
                count,
                charge: 1,
                rest
            };
        }

        const metals =
            Object.keys(ELEMENTS)
                .filter(
                    s => ELEMENTS[s].metal
                )
                .sort(
                    (a, b) =>
                        b.length - a.length
                );

        for (const symbol of metals) {
            if (
                formula.startsWith(symbol)
            ) {
                let rest =
                    formula.substring(
                        symbol.length
                    );

                let count = 1;

                const match =
                    rest.match(/^(\d+)/);

                if (match) {
                    count =
                        Number(match[1]);

                    rest =
                        rest.substring(
                            match[1].length
                        );
                }

                return {
                    symbol,
                    name:
                        ELEMENTS[symbol].name,
                    count,
                    rest
                };
            }
        }

        return null;
    }

    /* ========================================================
       12. ANION DETECTION
       ======================================================== */

    function detectAnion(text) {
        /*
         * Longest ion first.
         */
        const polyatomic =
            Object.keys(IONS)
                .filter(
                    key =>
                        !IONS[key].cation
                )
                .sort(
                    (a, b) =>
                        b.length - a.length
                );

        /*
         * Polyatomic.
         */
        for (
            const ion
            of polyatomic
        ) {
            if (!text.startsWith(ion)) {
                continue;
            }

            let rest =
                text.substring(
                    ion.length
                );

            let count = 1;

            const match =
                rest.match(/^(\d+)/);

            if (match) {
                count =
                    Number(match[1]);

                rest =
                    rest.substring(
                        match[1].length
                    );
            }

            if (!rest) {
                return {
                    symbol: ion,
                    name: IONS[ion].name,
                    charge: IONS[ion].charge,
                    count
                };
            }
        }

        /*
         * Monatomic anions.
         */
        const mono = {
            F: {
                name: "fluoride",
                charge: -1
            },

            Cl: {
                name: "chloride",
                charge: -1
            },

            Br: {
                name: "bromide",
                charge: -1
            },

            I: {
                name: "iodide",
                charge: -1
            },

            O: {
                name: "oxide",
                charge: -2
            },

            S: {
                name: "sulfide",
                charge: -2
            },

            N: {
                name: "nitride",
                charge: -3
            },

            P: {
                name: "phosphide",
                charge: -3
            },

            C: {
                name: "carbide",
                charge: -4
            }
        };

        for (const key of Object.keys(mono)) {
            if (!text.startsWith(key)) {
                continue;
            }

            let rest =
                text.substring(key.length);

            let count = 1;

            const match =
                rest.match(/^(\d+)/);

            if (match) {
                count =
                    Number(match[1]);

                rest =
                    rest.substring(
                        match[1].length
                    );
            }

            if (!rest) {
                return {
                    symbol: key,
                    name: mono[key].name,
                    charge: mono[key].charge,
                    count
                };
            }
        }

        return null;
    }

    /* ========================================================
       13. ACID DETECTION
       ======================================================== */

    const ACID_BY_FORMULA = {
        HF: "hydrofluoric acid",
        HCl: "hydrochloric acid",
        HBr: "hydrobromic acid",
        HI: "hydroiodic acid",
        H2S: "hydrosulfuric acid",

        HNO2: "nitrous acid",
        HNO3: "nitric acid",

        H2SO3: "sulfurous acid",
        H2SO4: "sulfuric acid",

        H2CO3: "carbonic acid",
        H3PO4: "phosphoric acid",

        HClO: "hypochlorous acid",
        HClO2: "chlorous acid",
        HClO3: "chloric acid",
        HClO4: "perchloric acid",

        HBrO: "hypobromous acid",
        HBrO2: "bromous acid",
        HBrO3: "bromic acid",
        HBrO4: "perbromic acid",

        HIO: "hypoiodous acid",
        HIO2: "iodous acid",
        HIO3: "iodic acid",
        HIO4: "periodic acid",

        HMnO4: "permanganic acid",

        H2C2O4: "oxalic acid",
        CH2O2: "formic acid",
        C2H4O2: "acetic acid"
    };

    function detectAcid(
        formula,
        parsed
    ) {
        if (
            ACID_BY_FORMULA[formula]
        ) {
            return {
                iupac:
                    ACID_BY_FORMULA[
                    formula
                    ],
                type: "acid"
            };
        }

        /*
         * Generic oxyacid:
         * H + known oxyanion.
         */
        const comp =
            parsed.composition;

        if (!comp.H) {
            return null;
        }

        const keys =
            Object.keys(IONS);

        for (const key of keys) {
            const ion =
                IONS[key];

            if (
                ion.cation ||
                !ion.name
            ) {
                continue;
            }

            const ionComp =
                parseFormula(key);

            if (
                !ionComp.valid
            ) {
                continue;
            }

            const expected =
            {
                ...ionComp.composition
            };

            const hydrogenCount =
                Math.abs(ion.charge);

            expected.H =
                (expected.H || 0) +
                hydrogenCount;

            if (
                sameComposition(
                    expected,
                    comp
                )
            ) {
                const acidName =
                    ionToAcidName(
                        ion.name
                    );

                if (acidName) {
                    return {
                        iupac: acidName,
                        type: "oxyacid"
                    };
                }
            }
        }

        return null;
    }

    function ionToAcidName(
        ionName
    ) {
        const map = {
            fluoride:
                "hydrofluoric acid",

            chloride:
                "hydrochloric acid",

            bromide:
                "hydrobromic acid",

            iodide:
                "hydroiodic acid",

            sulfide:
                "hydrosulfuric acid",

            nitrite:
                "nitrous acid",

            nitrate:
                "nitric acid",

            sulfite:
                "sulfurous acid",

            sulfate:
                "sulfuric acid",

            carbonate:
                "carbonic acid",

            phosphate:
                "phosphoric acid",

            chlorite:
                "chlorous acid",

            chlorate:
                "chloric acid",

            perchlorate:
                "perchloric acid",

            hypochlorite:
                "hypochlorous acid",

            bromite:
                "bromous acid",

            bromate:
                "bromic acid",

            hypobromite:
                "hypobromous acid",

            iodite:
                "iodous acid",

            iodate:
                "iodic acid",

            hypoiodite:
                "hypoiodous acid",

            permanganate:
                "permanganic acid",

            chromate:
                "chromic acid",

            dichromate:
                "dichromic acid",

            oxalate:
                "oxalic acid"
        };

        return map[ionName] || null;
    }

    /* ========================================================
       14. OXIDES
       ======================================================== */

    function parseOxide(
        formula,
        parsed
    ) {
        const comp =
            parsed.composition;

        if (!comp.O) {
            return null;
        }

        const others =
            Object.keys(comp)
                .filter(
                    e => e !== "O"
                );

        if (others.length !== 1) {
            return null;
        }

        const element =
            others[0];

        if (element === "H") {
            return null;
        }

        const amountElement =
            comp[element];

        const amountO =
            comp.O;

        const elementData =
            ELEMENTS[element];

        /*
         * Metal oxide:
         * FeO -> iron(II) oxide
         * Fe2O3 -> iron(III) oxide
         */
        if (
            elementData &&
            elementData.metal
        ) {
            const oxidation =
                inferOxidationState(
                    comp,
                    element
                );

            let name =
                elementData.name;

            if (
                elementData.ox.length > 1 &&
                Number.isInteger(
                    oxidation
                )
            ) {
                name +=
                    `(${roman(
                        Math.abs(
                            oxidation
                        )
                    )})`;
            }

            let type =
                "metal oxide";

            if (
                ["Al", "Zn"].includes(
                    element
                )
            ) {
                type =
                    "amphoteric oxide";
            }

            return {
                iupac:
                    `${name} oxide`,
                type
            };
        }

        /*
         * Non-metal oxide.
         */
        if (
            !elementData?.metal
        ) {
            const p1 =
                amountElement === 1
                    ? ""
                    : GREEK_PREFIX[
                    amountElement
                    ] || "";

            const p2 =
                amountO === 1
                    ? "mon"
                    : GREEK_PREFIX[
                    amountO
                    ] || "";

            let oxygenWord;

            /*
             * Classical English molecular naming:
             * CO  -> carbon monoxide
             * CO2 -> carbon dioxide
             */
            if (amountO === 1) {
                oxygenWord =
                    "monoxide";
            } else {
                oxygenWord =
                    p2 + "oxide";
            }

            /*
             * Remove awkward:
             * mono + oxide -> monoxide
             */
            return {
                iupac:
                    `${p1}${elementData.name} ${oxygenWord}`,
                type:
                    "molecular oxide"
            };
        }

        return null;
    }

    /* ========================================================
       15. HYDROXIDES
       ======================================================== */

    function parseHydroxide(
        formula,
        parsed
    ) {
        const comp =
            parsed.composition;

        if (
            !comp.H ||
            !comp.O
        ) {
            return null;
        }

        const others =
            Object.keys(comp)
                .filter(
                    e =>
                        e !== "H" &&
                        e !== "O"
                );

        if (others.length !== 1) {
            return null;
        }

        const metal =
            others[0];

        if (
            !ELEMENTS[metal]?.metal
        ) {
            return null;
        }

        const ohCount =
            Math.min(
                comp.H,
                comp.O
            );

        /*
         * If ratios do not make sense,
         * don't classify as hydroxide.
         */
        if (
            ohCount <= 0
        ) {
            return null;
        }

        const oxidation =
            inferOxidationState(
                comp,
                metal
            );

        let name =
            ELEMENTS[metal].name;

        if (
            ELEMENTS[metal].ox.length > 1 &&
            Number.isInteger(
                oxidation
            )
        ) {
            name +=
                `(${roman(
                    Math.abs(oxidation)
                )})`;
        }

        return {
            iupac:
                `${name} hydroxide`,
            type: "hydroxide"
        };
    }

    /* ========================================================
       16. SALTS
       ======================================================== */

    function stripLeadingCation(
        formula,
        cation
    ) {
        let rest =
            formula.substring(
                cation.symbol.length
            );

        const count =
            rest.match(/^(\d+)/);

        if (count) {
            rest =
                rest.substring(
                    count[1].length
                );
        }

        return rest;
    }

    function extractAnionGroup(
        rest
    ) {
        /*
         * (SO4)3
         * (OH)2
         * SO4
         * Cl3
         */

        const grouped =
            rest.match(
                /^\(([A-Za-z0-9]+)\)(\d+)?$/
            );

        if (grouped) {
            return {
                formula:
                    grouped[1],
                count:
                    Number(
                        grouped[2] ||
                        1
                    )
            };
        }

        return {
            formula: rest,
            count: 1
        };
    }

    function parseSalt(
        formula,
        parsed
    ) {
        const cation =
            findCation(formula);

        if (!cation) {
            return null;
        }

        /*
         * Remove hydrate portion.
         */
        const baseFormula =
            formula.split(".")[0];

        const baseCation =
            findCation(
                baseFormula
            );

        if (!baseCation) {
            return null;
        }

        let rest =
            stripLeadingCation(
                baseFormula,
                baseCation
            );

        /*
         * Hydroxide.
         */
        if (
            rest === "OH" ||
            /^\(OH\)\d+$/.test(rest)
        ) {
            return null;
        }

        const group =
            extractAnionGroup(rest);

        const anion =
            detectAnion(
                group.formula
            );

        if (!anion) {
            return null;
        }

        const metalData =
            ELEMENTS[
            baseCation.symbol
            ];

        let oxidation =
            null;

        if (
            metalData
        ) {
            /*
             * cation charge from formula:
             *
             * x * cationCount +
             * y * anionCharge = 0
             */
            const anionAtoms =
                getAnionCountFromFormula(
                    group,
                    anion
                );

            oxidation =
                (
                    anionAtoms *
                    Math.abs(
                        anion.charge
                    )
                ) /
                (
                    parsed.composition[
                    baseCation.symbol
                    ] || 1
                );
        }

        let cationName =
            baseCation.name;

        /*
         * Stock nomenclature only when
         * multiple oxidation states exist.
         */
        if (
            metalData &&
            metalData.ox.length > 1 &&
            Number.isInteger(
                oxidation
            )
        ) {
            cationName +=
                `(${roman(
                    oxidation
                )})`;
        }

        return {
            iupac:
                `${cationName} ${anion.name}`,
            type: "salt",
            metadata: {
                cation:
                    baseCation.symbol,
                cationOxidation:
                    oxidation,
                anion:
                    anion.symbol
            }
        };
    }

    function getAnionCountFromFormula(
        group,
        anion
    ) {
        if (
            group.count &&
            group.count > 1
        ) {
            return (
                anion.count *
                group.count
            );
        }

        return anion.count || 1;
    }

    /* ========================================================
       17. MOLECULAR COMPOUNDS
       ======================================================== */

    function parseBinaryMolecular(
        formula,
        parsed
    ) {
        const comp =
            parsed.composition;

        const elements =
            Object.keys(comp);

        if (elements.length !== 2) {
            return null;
        }

        if (
            elements.includes("O")
        ) {
            return null;
        }

        const [a, b] =
            elements;

        const A =
            ELEMENTS[a];

        const B =
            ELEMENTS[b];

        if (!A || !B) {
            return null;
        }

        /*
         * Metal + nonmetal = ionic,
         * handled by salt parser.
         */
        if (
            A.metal ||
            B.metal
        ) {
            return null;
        }

        /*
         * First element normally retained without mono.
         */
        let first =
            a;

        let second =
            b;

        if (
            A.halogen &&
            !B.halogen
        ) {
            first =
                b;
            second =
                a;
        }

        const firstCount =
            comp[first];

        const secondCount =
            comp[second];

        let secondName =
            ELEMENTS[
                second
            ].name;

        const anion =
            detectAnion(
                `${second}${secondCount > 1 ? secondCount : ""}`
            );

        if (
            anion &&
            ["F", "Cl", "Br", "I",
                "S", "N", "P", "C"]
                .includes(second)
        ) {
            secondName =
                anion.name;
        }

        let firstPrefix =
            firstCount === 1
                ? ""
                : (
                    GREEK_PREFIX[
                    firstCount
                    ] || `${firstCount}-`
                );

        let secondPrefix =
            GREEK_PREFIX[
            secondCount
            ] || `${secondCount}-`;

        /*
         * Special suffix forms.
         */
        if (second === "O") {
            secondName =
                secondCount === 1
                    ? "monoxide"
                    : `${secondPrefix}oxide`;
        } else if (
            second === "S"
        ) {
            secondName =
                `${secondPrefix}sulfide`;
        } else if (
            second === "N"
        ) {
            secondName =
                `${secondPrefix}nitride`;
        } else if (
            second === "P"
        ) {
            secondName =
                `${secondPrefix}phosphide`;
        } else if (
            second === "Cl"
        ) {
            secondName =
                `${secondPrefix}chloride`;
        } else if (
            second === "Br"
        ) {
            secondName =
                `${secondPrefix}bromide`;
        } else if (
            second === "I"
        ) {
            secondName =
                `${secondPrefix}iodide`;
        } else if (
            second === "F"
        ) {
            secondName =
                `${secondPrefix}fluoride`;
        } else if (
            second === "C"
        ) {
            secondName =
                `${secondPrefix}carbide`;
        }

        return {
            iupac:
                `${firstPrefix}${ELEMENTS[first].name} ${secondName}`,
            type:
                "binary molecular compound"
        };
    }

    /* ========================================================
       18. ORGANIC NOMENCLATURE
       ======================================================== */

    function parseHydrocarbon(
        parsed
    ) {
        const comp =
            parsed.composition;

        const elements =
            Object.keys(comp);

        if (
            !elements.includes("C") ||
            !elements.includes("H")
        ) {
            return null;
        }

        if (
            elements.some(
                e =>
                    e !== "C" &&
                    e !== "H"
            )
        ) {
            return null;
        }

        const carbon =
            comp.C;

        const hydrogen =
            comp.H;

        const prefix =
            ORGANIC_PREFIX[
            carbon
            ];

        if (!prefix) {
            return null;
        }

        /*
         * Alkane
         */
        if (
            hydrogen ===
            2 * carbon + 2
        ) {
            return {
                iupac:
                    `${prefix}ane`,
                type:
                    "alkane"
            };
        }

        /*
         * Alkene / cycloalkane
         */
        if (
            hydrogen ===
            2 * carbon
        ) {
            return {
                iupac:
                    `${prefix}ene`,
                type:
                    "alkene / cycloalkane"
            };
        }

        /*
         * Alkyne / diene
         */
        if (
            hydrogen ===
            2 * carbon - 2
        ) {
            return {
                iupac:
                    `${prefix}yne`,
                type:
                    "alkyne / diene"
            };
        }

        return {
            iupac:
                "unsaturated hydrocarbon",
            type:
                "hydrocarbon"
        };
    }

    function parseAlcohol(
        parsed
    ) {
        const comp =
            parsed.composition;

        if (
            !comp.C ||
            !comp.H ||
            comp.O !== 1
        ) {
            return null;
        }

        if (
            Object.keys(comp)
                .some(
                    e =>
                        !["C", "H", "O"]
                            .includes(e)
                )
        ) {
            return null;
        }

        const n =
            comp.C;

        const h =
            comp.H;

        if (
            h !==
            2 * n + 2
        ) {
            return null;
        }

        const prefix =
            ORGANIC_PREFIX[n];

        if (!prefix) {
            return {
                iupac:
                    "alkanol",
                type:
                    "alcohol"
            };
        }

        if (n === 1) {
            return {
                iupac: "methanol",
                type: "alcohol"
            };
        }

        if (n === 2) {
            return {
                iupac: "ethanol",
                type: "alcohol"
            };
        }

        return {
            iupac:
                `${prefix}an-1-ol`,
            type:
                "alcohol"
        };
    }

    function parseCarboxylicAcid(
        parsed
    ) {
        const comp =
            parsed.composition;

        if (
            !comp.C ||
            !comp.H ||
            comp.O !== 2
        ) {
            return null;
        }

        const n =
            comp.C;

        if (
            comp.H !==
            2 * n
        ) {
            return null;
        }

        const known = {
            1: "methanoic acid",
            2: "ethanoic acid",
            3: "propanoic acid",
            4: "butanoic acid",
            5: "pentanoic acid",
            6: "hexanoic acid",
            7: "heptanoic acid",
            8: "octanoic acid",
            9: "nonanoic acid",
            10: "decanoic acid"
        };

        if (known[n]) {
            return {
                iupac:
                    known[n],
                type:
                    "carboxylic acid"
            };
        }

        return {
            iupac:
                `${ORGANIC_PREFIX[n] || "unknown"}anoic acid`,
            type:
                "carboxylic acid"
        };
    }

    function parseAldehyde(
        parsed
    ) {
        const comp =
            parsed.composition;

        if (
            !comp.C ||
            !comp.H ||
            comp.O !== 1
        ) {
            return null;
        }

        if (
            comp.H !==
            2 * comp.C
        ) {
            return null;
        }

        const names = {
            1: "methanal",
            2: "ethanal",
            3: "propanal",
            4: "butanal",
            5: "pentanal",
            6: "hexanal"
        };

        if (names[comp.C]) {
            return {
                iupac:
                    names[comp.C],
                type:
                    "aldehyde"
            };
        }

        return {
            iupac:
                `${ORGANIC_PREFIX[comp.C]}anal`,
            type:
                "aldehyde"
        };
    }

    function parseKetone(
        parsed
    ) {
        const comp =
            parsed.composition;

        if (
            !comp.C ||
            !comp.H ||
            comp.O !== 1
        ) {
            return null;
        }

        if (
            comp.H !==
            2 * comp.C
        ) {
            return null;
        }

        if (comp.C < 3) {
            return null;
        }

        return {
            iupac:
                `${ORGANIC_PREFIX[comp.C]}anone`,
            type:
                "ketone"
        };
    }

    function parseAmine(
        parsed
    ) {
        const comp =
            parsed.composition;

        if (
            !comp.C ||
            !comp.H ||
            comp.N
        ) {
            return null;
        }

        if (
            Object.keys(comp)
                .some(
                    e =>
                        !["C", "H", "N"]
                            .includes(e)
                )
        ) {
            return null;
        }

        if (
            comp.N !== 1
        ) {
            return null;
        }

        const n =
            comp.C;

        if (
            comp.H !==
            2 * n + 3
        ) {
            return null;
        }

        return {
            iupac:
                `${ORGANIC_PREFIX[n]}anamine`,
            type:
                "primary amine"
        };
    }

    function parseOrganic(
        formula,
        parsed
    ) {
        /*
         * Known exact structures first.
         */
        const known = {
            CH4: {
                iupac: "methane",
                type: "alkane"
            },

            C2H6: {
                iupac: "ethane",
                type: "alkane"
            },

            C2H4: {
                iupac: "ethene",
                type: "alkene"
            },

            C2H2: {
                iupac: "ethyne",
                type: "alkyne"
            },

            CH3OH: {
                iupac: "methanol",
                type: "alcohol"
            },

            C2H5OH: {
                iupac: "ethanol",
                type: "alcohol"
            }
        };

        if (known[formula]) {
            return known[formula];
        }

        /*
         * Note:
         * Formula parser normalizes CH3OH as:
         * C1 H4 O1
         *
         * So composition-based checks are used.
         */
        return (
            parseCarboxylicAcid(parsed) ||
            parseAlcohol(parsed) ||
            parseAldehyde(parsed) ||
            parseKetone(parsed) ||
            parseHydrocarbon(parsed)
        );
    }

    /* ========================================================
       19. HYDRATES
       ======================================================== */

    function parseHydrate(
        formula,
        parsed
    ) {
        if (!parsed.isHydrate) {
            return null;
        }

        const parts =
            parsed.parts;

        let waterCount = null;

        for (
            const part of parts
        ) {
            /*
             * A water portion:
             * H2O
             * 5H2O
             */
            if (
                part.composition.H ===
                2 * part.coefficient &&
                part.composition.O ===
                part.coefficient
            ) {
                waterCount =
                    part.coefficient;
            }
        }

        const basePart =
            parts[0];

        const baseFormula =
            basePart.formula;

        const baseParsed =
            parseFormula(
                baseFormula
            );

        let baseName =
            baseFormula;

        if (
            baseParsed.valid
        ) {
            const result =
                analyzeFormula(
                    baseFormula,
                    baseParsed
                );

            if (
                result &&
                result.iupac
            ) {
                baseName =
                    result.iupac;
            }
        }

        if (
            waterCount !== null
        ) {
            return {
                iupac:
                    `${baseName} ${waterCount === 1 ? "monohydrate" : numberWord(waterCount) + "hydrate"}`,
                type:
                    "hydrate",
                metadata: {
                    waters:
                        waterCount
                }
            };
        }

        return {
            iupac:
                `${baseName} solvate`,
            type:
                "solvate"
        };
    }

    function numberWord(n) {
        const words = {
            1: "mono",
            2: "di",
            3: "tri",
            4: "tetra",
            5: "penta",
            6: "hexa",
            7: "hepta",
            8: "octa",
            9: "nona",
            10: "deca",
            11: "undeca",
            12: "dodeca"
        };

        return (
            words[n] ||
            String(n) + "-"
        );
    }

    /* ========================================================
       20. DATABASE
       ======================================================== */

    const EXACT_DB = {
        H2O: {
            iupac: "water",
            type: "molecular compound"
        },

        H2O2: {
            iupac: "hydrogen peroxide",
            type: "peroxide"
        },

        NH3: {
            iupac: "ammonia",
            type: "molecular hydride"
        },

        HCl: {
            iupac: "hydrochloric acid",
            gasName: "hydrogen chloride",
            type: "acid"
        },

        HBr: {
            iupac: "hydrobromic acid",
            gasName: "hydrogen bromide",
            type: "acid"
        },

        HI: {
            iupac: "hydroiodic acid",
            gasName: "hydrogen iodide",
            type: "acid"
        },

        HF: {
            iupac: "hydrofluoric acid",
            gasName: "hydrogen fluoride",
            type: "acid"
        },

        HNO3: {
            iupac: "nitric acid",
            type: "acid"
        },

        HNO2: {
            iupac: "nitrous acid",
            type: "acid"
        },

        H2SO4: {
            iupac: "sulfuric acid",
            type: "acid"
        },

        H2SO3: {
            iupac: "sulfurous acid",
            type: "acid"
        },

        H3PO4: {
            iupac: "phosphoric acid",
            type: "acid"
        },

        H2CO3: {
            iupac: "carbonic acid",
            type: "acid"
        },

        NaCl: {
            iupac: "sodium chloride",
            type: "salt"
        },

        NaOH: {
            iupac: "sodium hydroxide",
            type: "base"
        },

        KOH: {
            iupac: "potassium hydroxide",
            type: "base"
        },

        CaO: {
            iupac: "calcium oxide",
            type: "oxide"
        },

        CaCO3: {
            iupac: "calcium carbonate",
            type: "salt"
        },

        "Ca(OH)2": {
            iupac: "calcium hydroxide",
            type: "base"
        },

        Al2O3: {
            iupac: "aluminium oxide",
            type: "amphoteric oxide"
        },

        FeO: {
            iupac: "iron(II) oxide",
            type: "oxide"
        },

        Fe2O3: {
            iupac: "iron(III) oxide",
            type: "oxide"
        },

        Fe3O4: {
            iupac: "iron(II,III) oxide",
            type: "mixed oxide"
        },

        CuO: {
            iupac: "copper(II) oxide",
            type: "oxide"
        },

        Cu2O: {
            iupac: "copper(I) oxide",
            type: "oxide"
        },

        ZnO: {
            iupac: "zinc oxide",
            type: "amphoteric oxide"
        },

        Ag2O: {
            iupac: "silver oxide",
            type: "oxide"
        },

        KMnO4: {
            iupac: "potassium permanganate",
            type: "salt"
        },

        K2Cr2O7: {
            iupac: "potassium dichromate",
            type: "salt"
        },

        K2CrO4: {
            iupac: "potassium chromate",
            type: "salt"
        },

        NaClO: {
            iupac: "sodium hypochlorite",
            type: "salt"
        },

        NH4NO3: {
            iupac: "ammonium nitrate",
            type: "salt"
        },

        NaHCO3: {
            iupac: "sodium hydrogen carbonate",
            commonName: "baking soda",
            type: "acid salt"
        },

        Na2CO3: {
            iupac: "sodium carbonate",
            commonName: "washing soda",
            type: "salt"
        },

        CuSO4: {
            iupac: "copper(II) sulfate",
            type: "salt"
        },

        FeSO4: {
            iupac: "iron(II) sulfate",
            type: "salt"
        },

        "Fe2(SO4)3": {
            iupac: "iron(III) sulfate",
            type: "salt"
        },

        FeCl2: {
            iupac: "iron(II) chloride",
            type: "salt"
        },

        FeCl3: {
            iupac: "iron(III) chloride",
            type: "salt"
        },

        CH4: {
            iupac: "methane",
            type: "alkane"
        },

        C2H6: {
            iupac: "ethane",
            type: "alkane"
        },

        C3H8: {
            iupac: "propane",
            type: "alkane"
        },

        C4H10: {
            iupac: "butane",
            type: "alkane"
        },

        C2H4: {
            iupac: "ethene",
            commonName: "ethylene",
            type: "alkene"
        },

        C2H2: {
            iupac: "ethyne",
            commonName: "acetylene",
            type: "alkyne"
        },

        CH3OH: {
            iupac: "methanol",
            type: "alcohol"
        },

        C2H5OH: {
            iupac: "ethanol",
            type: "alcohol"
        },

        CH2O: {
            iupac: "methanal",
            commonName: "formaldehyde",
            type: "aldehyde"
        },

        C2H4O: {
            iupac: "ethanal",
            commonName: "acetaldehyde",
            type: "aldehyde"
        },

        CH2O2: {
            iupac: "methanoic acid",
            commonName: "formic acid",
            type: "carboxylic acid"
        },

        C2H4O2: {
            iupac: "ethanoic acid",
            commonName: "acetic acid",
            type: "carboxylic acid"
        },

        C6H6: {
            iupac: "benzene",
            type: "aromatic hydrocarbon"
        },

        C7H8: {
            iupac: "methylbenzene",
            commonName: "toluene",
            type: "aromatic hydrocarbon"
        },

        C6H6O: {
            iupac: "phenol",
            type: "phenol"
        },

        C6H7N: {
            iupac: "benzenamine",
            commonName: "aniline",
            type: "amine"
        },

        CH4N2O: {
            iupac: "diaminomethanal",
            commonName: "urea",
            type: "amide derivative"
        },

        C6H12O6: {
            iupac: "hexose",
            commonName: "glucose / fructose",
            type: "monosaccharide"
        },

        C12H22O11: {
            iupac: "sucrose",
            type: "disaccharide"
        },

        C3H8O3: {
            iupac: "propane-1,2,3-triol",
            commonName: "glycerol",
            type: "polyol"
        },

        C2H6O2: {
            iupac: "ethane-1,2-diol",
            commonName: "ethylene glycol",
            type: "diol"
        },

        C2H5NO2: {
            iupac: "2-aminoacetic acid",
            commonName: "glycine",
            type: "amino acid"
        },

        C3H7NO2: {
            iupac: "2-aminopropanoic acid",
            commonName: "alanine",
            type: "amino acid"
        }
    };

    /* ========================================================
       21. FORMULA ANALYZER
       ======================================================== */

    function analyzeFormula(
        formula,
        parsed
    ) {
        /*
         * Exact DB has priority.
         */
        if (EXACT_DB[formula]) {
            return {
                ...EXACT_DB[formula]
            };
        }

        /*
         * Hydrate.
         */
        const hydrate =
            parseHydrate(
                formula,
                parsed
            );

        if (hydrate) {
            return hydrate;
        }

        /*
         * Acid.
         */
        const acid =
            detectAcid(
                formula,
                parsed
            );

        if (acid) {
            return acid;
        }

        /*
         * Hydroxide.
         */
        const hydroxide =
            parseHydroxide(
                formula,
                parsed
            );

        if (hydroxide) {
            return hydroxide;
        }

        /*
         * Oxide.
         */
        const oxide =
            parseOxide(
                formula,
                parsed
            );

        if (oxide) {
            return oxide;
        }

        /*
         * Salt.
         */
        const salt =
            parseSalt(
                formula,
                parsed
            );

        if (salt) {
            return salt;
        }

        /*
         * Organic.
         */
        const organic =
            parseOrganic(
                formula,
                parsed
            );

        if (organic) {
            return organic;
        }

        /*
         * Binary molecular.
         */
        const binary =
            parseBinaryMolecular(
                formula,
                parsed
            );

        if (binary) {
            return binary;
        }

        /*
         * ----------------------------------------------------
         * UNIVERSAL FALLBACK
         * ----------------------------------------------------
         *
         * Do NOT return found:false just because
         * the exact name isn't in DB.
         */
        return genericEnglishName(
            formula,
            parsed
        );
    }

    /* ========================================================
       22. UNIVERSAL ENGLISH FALLBACK
       ======================================================== */

    function genericEnglishName(
        formula,
        parsed
    ) {
        const composition =
            parsed.composition;

        const elements =
            Object.keys(composition);

        const elementNames =
            elements.map(
                e =>
                    ELEMENTS[e]?.name ||
                    e
            );

        /*
         * Elemental substance.
         */
        if (elements.length === 1) {
            const element =
                elements[0];

            return {
                iupac:
                    ELEMENTS[element]
                        ?.name ||
                    element,
                type:
                    "elemental substance"
            };
        }

        /*
         * If formula contains C,
         * do not falsely call it inorganic.
         */
        if (
            composition.C
        ) {
            return {
                iupac:
                    "organic compound",
                type:
                    "organic compound",
                metadata: {
                    elements:
                        elementNames
                }
            };
        }

        /*
         * Generic inorganic fallback.
         */
        return {
            iupac:
                "chemical compound",
            type:
                "unclassified chemical compound",
            metadata: {
                elements:
                    elementNames
            }
        };
    }

    /* ========================================================
       23. COMMON NAME LOOKUP
       ======================================================== */

    function lookupEnglishName(
        input
    ) {
        const key =
            normalizeName(input);

        if (
            ENGLISH_NAMES[key]
        ) {
            return ENGLISH_NAMES[key];
        }

        return null;
    }

    /* ========================================================
       24. FORMULA LOOKUP
       ======================================================== */

    function lookupExactFormula(
        formula
    ) {
        /*
         * Exact.
         */
        if (
            EXACT_DB[formula]
        ) {
            return EXACT_DB[
                formula
            ];
        }

        /*
         * Case-insensitive canonical compare.
         */
        const canonical =
            canonicalizeFormula(
                formula
            );

        if (
            EXACT_DB[canonical]
        ) {
            return EXACT_DB[
                canonical
            ];
        }

        return null;
    }

    /* ========================================================
       25. PUBLIC ANALYZE
       ======================================================== */

    function analyze(input) {
        const original =
            cleanInput(input);

        if (!original) {
            return {
                found: false,
                language: "en",
                error:
                    "Empty input"
            };
        }

        /*
         * HARD BLOCK:
         * Vietnamese nomenclature is NOT accepted.
         */
        if (
            looksVietnamese(original)
        ) {
            return {
                found: false,
                language: "en",
                rejected: true,
                error:
                    "Vietnamese nomenclature is not supported. Use English chemical names or chemical formulas.",
                input: original
            };
        }

        /*
         * ----------------------------------------------------
         * 1. English name
         * ----------------------------------------------------
         */

        const commonFormula =
            lookupEnglishName(
                original
            );

        if (commonFormula) {
            const canonical =
                canonicalizeFormula(
                    commonFormula
                );

            const parsed =
                parseFormula(
                    canonical
                );

            if (
                parsed.valid
            ) {
                const result =
                    analyzeFormula(
                        canonical,
                        parsed
                    );

                return {
                    found: true,
                    language: "en",
                    input: original,
                    formula: canonical,
                    iupac:
                        result.iupac,
                    type:
                        result.type,
                    commonName:
                        result.commonName ||
                        null,
                    gasName:
                        result.gasName ||
                        null,
                    composition:
                        parsed.composition
                };
            }
        }

        /*
         * ----------------------------------------------------
         * 2. Formula
         * ----------------------------------------------------
         */

        const canonical =
            canonicalizeFormula(
                original
            );

        const parsed =
            parseFormula(
                canonical
            );

        if (!parsed.valid) {
            /*
             * Since Vietnamese was already blocked,
             * this is simply an unsupported English name
             * or malformed formula.
             */
            return {
                found: false,
                language: "en",
                input: original,
                error:
                    parsed.error ||
                    "Unknown English chemical name or invalid chemical formula",
                suggestion:
                    "Use an English chemical name, IUPAC-style name, or a valid chemical formula."
            };
        }

        /*
         * ----------------------------------------------------
         * 3. Formula DB / parser
         * ---------------------------------------------------- */

        const result =
            analyzeFormula(
                canonical,
                parsed
            );

        return {
            found: true,
            language: "en",
            input: original,
            formula: canonical,
            iupac:
                result.iupac,
            type:
                result.type,
            commonName:
                result.commonName ||
                null,
            gasName:
                result.gasName ||
                null,
            composition:
                parsed.composition,
            isHydrate:
                parsed.isHydrate,
            metadata:
                result.metadata ||
                null
        };
    }

    /* ========================================================
       26. ADD CUSTOM ENGLISH NAME
       ======================================================== */

    function addEnglishName(
        name,
        formula
    ) {
        const clean =
            normalizeName(name);

        if (
            !clean ||
            !formula
        ) {
            return {
                ok: false,
                error:
                    "Name and formula are required"
            };
        }

        /*
         * NEVER allow Vietnamese custom names.
         */
        if (
            looksVietnamese(clean)
        ) {
            return {
                ok: false,
                error:
                    "Only English chemical names are allowed"
            };
        }

        const canonical =
            canonicalizeFormula(
                formula
            );

        const parsed =
            parseFormula(
                canonical
            );

        if (
            !parsed.valid
        ) {
            return {
                ok: false,
                error:
                    parsed.error
            };
        }

        ENGLISH_NAMES[clean] =
            canonical;

        return {
            ok: true,
            name: clean,
            formula: canonical
        };
    }

    /* ========================================================
       27. COMPOSITION API
       ======================================================== */

    function composition(input) {
        const original =
            cleanInput(input);

        if (
            looksVietnamese(original)
        ) {
            return {
                valid: false,
                error:
                    "Vietnamese input is not supported"
            };
        }

        const formula =
            canonicalizeFormula(
                original
            );

        const parsed =
            parseFormula(
                formula
            );

        if (
            !parsed.valid
        ) {
            return {
                valid: false,
                error:
                    parsed.error
            };
        }

        return {
            valid: true,
            formula,
            composition:
                parsed.composition,
            parts:
                parsed.parts,
            isHydrate:
                parsed.isHydrate
        };
    }

    /* ========================================================
       28. IS FORMULA
       ======================================================== */

    function isFormula(input) {
        const original =
            cleanInput(input);

        if (
            looksVietnamese(original)
        ) {
            return false;
        }

        const formula =
            canonicalizeFormula(
                original
            );

        const parsed =
            parseFormula(
                formula
            );

        return parsed.valid;
    }

    /* ========================================================
       29. EXPORT
       ======================================================== */

    return {

        /*
         * Main API
         */
        analyze,

        /*
         * Utilities
         */
        composition,
        isFormula,
        addEnglishName,

        /*
         * Explicit language setting.
         */
        language: "en",

        /*
         * Debug access.
         */
        _debug: {
            ELEMENTS,
            IONS,
            ENGLISH_NAMES,
            EXACT_DB,
            tokenize,
            parseFormula,
            parseHydrate,
            parseOxide,
            parseHydroxide,
            parseSalt,
            parseOrganic
        }
    };

})();