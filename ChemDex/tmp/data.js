// Data chi tiết một số chất (Mock Data with rich HTML to demonstrate styling capabilities)
const detailedData = [
  {
    number: 1,
    symbol: "H",
    mass: 1.007,
    category: "phi-kim",
    hasData: true,

    general: {
      latinName: "Hydrogenium",
      englishName: "Hydrogen",
      electronConfig: "1s¹",
      group: 1,
      period: 1,
      state: "Khí",
      oxidation: "+1, -1",
      electronegativity: 2.2,
    },

    history: {
      discoverer: "Henry Cavendish",
      year: 1766,
      discoveryLocation: "Anh",
      link: true,
    },

    structure: {
      protons: 1,
      neutrons: 0,
      electrons: 1,
      crystalType: "hcp",
      electronShells: [1],
      valenceElectrons: 1,
    },

    occurrence: {
      description: "Hydro tồn tại ở cả hai dạng đơn chất và hợp chất.",
      simple: ["H₂"],
      compounds: ["H₂O", "HCl", "CH₄", "C₂H₂"],
      ores: [],
    },

    images: {
      atomic:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Electron_shell_001_Hydrogen_-_no_label.svg/200px-Electron_shell_001_Hydrogen_-_no_label.svg.png",
      ore: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Water_drop_on_a_leaf.jpg/320px-Water_drop_on_a_leaf.jpg",
      application: "",
      sample: "",
    },

    physical: `
      <ul class="list-disc ml-5 space-y-1">
        <li>Là chất khí, không màu, không mùi và không vị.</li>
        <li>Nhẹ nhất trong các chất khí, khối lượng riêng khoảng 0,09 g/L.</li>
        <li>Ít tan trong nước.</li>
        <li>Tốc độ khuếch tán nhanh.</li>
        <li>Hóa lỏng ở khoảng -253°C và hóa rắn ở khoảng -259°C.</li>
        <li>Nhiệt độ nóng chảy: <b>-259,16°C</b> (13,99 K).</li>
        <li>Nhiệt độ sôi: <b>-252,879°C</b> (20,27 K).</li>
      </ul>
    `,

    chemical: `
      <ul class="list-disc ml-5 space-y-2">
        <li>Hydro là phi kim hoạt động hóa học.</li>
        <li>Hydro có thể tác dụng với oxi và cháy tạo ngọn lửa màu xanh nhạt, đồng thời giải phóng nhiều nhiệt.</li>
        <li>Ở nhiệt độ cao, hydro thể hiện tính khử mạnh, có khả năng khử nhiều oxit kim loại thành kim loại.</li>
        <li>Hydro có thể phản ứng trực tiếp với nhiều phi kim như clo, flo, lưu huỳnh và nitơ để tạo thành các hợp chất tương ứng.</li>
        <li>Trong một số phản ứng, hydro vừa có thể đóng vai trò chất khử, vừa có thể đóng vai trò chất oxi hóa tùy chất phản ứng.</li>
      </ul>
    `,

    reactions: [
      {
        type: "Cháy trong oxi",
        equation: "2H₂ + O₂ → 2H₂O",
        condition: "",
        catalyst: "",
        related: "O",
        desc: "Hydro cháy trong oxi tạo nước và tỏa nhiều nhiệt.",
      },
      {
        type: "Khử oxit đồng",
        equation: "CuO + H₂ → Cu + H₂O",
        condition: "Nhiệt độ cao",
        catalyst: "",
        related: "Cu",
        desc: "Hydro thể hiện tính khử mạnh ở nhiệt độ cao.",
      },
      {
        type: "Tác dụng với clo",
        equation: "H₂ + Cl₂ → 2HCl",
        condition: "Ánh sáng hoặc đun nóng",
        catalyst: "",
        related: "Cl",
        desc: "Tạo khí hiđro clorua.",
      },
      {
        type: "Tổng hợp amoniac",
        equation: "N₂ + 3H₂ ⇌ 2NH₃",
        condition: "450°C, 200 atm",
        catalyst: "Fe",
        related: "N",
        desc: "Phản ứng Haber-Bosch.",
      },
    ],

    applications: [
      {
        title: "Nhiên liệu tên lửa",
        desc: "Hiđro lỏng được dùng làm nhiên liệu cho tên lửa và tàu vũ trụ.",
        media:
          "https://wikimedia.org/wikipedia/commons/thumb/6/6d/Space_Shuttle_Atlantis_launches_from_KSC_on_STS-132.jpg/320px-Space_Shuttle_Atlantis_launches_from_KSC_on_STS-132.jpg",
      },
      {
        title: "Ô tô pin nhiên liệu",
        desc: "Nguồn năng lượng sạch thay thế xăng dầu.",
        media: "",
      },
      {
        title: "Sản xuất NH₃",
        desc: "Nguyên liệu quan trọng trong quy trình Haber.",
        media: "",
      },
      {
        title: "Sản xuất HCl",
        desc: "Dùng trong công nghiệp hóa chất.",
        media: "",
      },
      {
        title: "Khử oxit kim loại",
        desc: "Điều chế kim loại từ oxit của chúng.",
        media: "",
      },
      {
        title: "Khinh khí cầu",
        desc: "Do là khí nhẹ nhất nên được dùng trong bóng thám không.",
        media: "",
      },
      {
        title: "Hydro hóa dầu thực vật",
        desc: "Sản xuất bơ thực vật.",
        media: "",
      },
      {
        title: "Lọc dầu",
        desc: "Loại bỏ lưu huỳnh khỏi nhiên liệu.",
        media: "",
      },
    ],

    simulation: {
      title: "Thí nghiệm đốt cháy Hiđrô",
      reagents: [
        { id: "H2", name: "Khí H₂", icon: "fa-cloud" },
        { id: "O2", name: "Khí O₂", icon: "fa-wind" },
      ],
      expected: ["H2", "O2"],
      resultText:
        "🔥 Bùm! H₂ cháy trong O₂ tạo thành nước (H₂O) và tỏa nhiều nhiệt.",
    },

    notes: `
      Hydrogen là nguyên tố hóa học có ký hiệu H và số nguyên tử 1.
      Đây là nguyên tố nhẹ nhất trong bảng tuần hoàn.
      Hydro chiếm khoảng 75% khối lượng baryon của Vũ trụ và là nguyên tố phổ biến nhất trong tự nhiên.
    `,
  },

  {
    number: 11,
    symbol: "Na",
    mass: 22.99,
    category: "kiem",
    hasData: true,

    general: {
      latinName: "Natrium",
      englishName: "Sodium",
      electronConfig: "[Ne] 3s¹",
      group: 1,
      period: 3,
      state: "Rắn",
      oxidation: "+1",
      electronegativity: 0.93,
    },

    history: {
      discoverer: "Humphry Davy",
      year: 1807,
      discoveryLocation: "Anh",
      link: true,
    },

    structure: {
      protons: 11,
      neutrons: 12,
      electrons: 11,
      crystalType: "bcc",
      electronShells: [2, 8, 1],
      valenceElectrons: 1,
    },

    occurrence: {
      description:
        "Natri không tồn tại tự do nhiều trong tự nhiên, chủ yếu ở dạng hợp chất.",
      simple: ["Na"],
      compounds: ["NaCl", "Na₂SO₄", "NaOH", "Na₂CO₃"],
      ores: [
        {
          name: "Halit",
          formula: "NaCl",
          note: "Nguồn quan trọng của natri trong tự nhiên.",
        },
      ],
    },

    images: {
      atomic:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Electron_shell_011_Sodium_-_no_label.svg/200px-Electron_shell_011_Sodium_-_no_label.svg.png",
      ore: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Halit-Kristalle.jpg/320px-Halit-Kristalle.jpg",
      application: "",
      sample: "",
    },

    physical: `
      <ul class="list-disc ml-5 space-y-1">
        <li>Kim loại kiềm, màu trắng bạc, có ánh kim.</li>
        <li>Rất mềm, <span class="text-yellow-400 italic">có thể cắt dễ dàng bằng dao</span>.</li>
        <li>Nhẹ hơn nước, dẫn điện và nhiệt tốt.</li>
      </ul>
    `,

    chemical: `
      <p class="mb-2 text-red-400 font-bold">Tính khử rất mạnh:</p>
      <ul class="list-disc ml-5 space-y-1">
        <li>Tác dụng mãnh liệt với nước tạo dung dịch kiềm và giải phóng H₂.</li>
        <li>Bốc cháy trong clo tạo muối NaCl.</li>
      </ul>
    `,

    reactions: [
      {
        type: "Tác dụng với nước",
        equation: "2Na + 2H₂O → 2NaOH + H₂↑",
        condition: "",
        catalyst: "",
        related: "H",
        desc: "Viên Na chạy tròn trên mặt nước, nóng chảy và bốc cháy.",
      },
      {
        type: "Tác dụng với clo",
        equation: "2Na + Cl₂ → 2NaCl",
        condition: "",
        catalyst: "",
        related: "Cl",
        desc: "Tạo muối natri clorua.",
      },
    ],

    applications: [
      {
        title: "Muối ăn (NaCl)",
        desc: "Hợp chất thiết yếu cho sự sống, gia vị quen thuộc.",
        media:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Salt_crystals_small.jpg/320px-Salt_crystals_small.jpg",
      },
      {
        title: "Đèn đường",
        desc: "Đèn hơi natri phát ánh sáng vàng cam xuyên sương mù tốt.",
        media: "",
      },
    ],

    simulation: {
      title: "Thí nghiệm Natri tác dụng Nước",
      reagents: [
        { id: "Na", name: "Viên Na", icon: "fa-cube" },
        { id: "H2O", name: "Nước", icon: "fa-droplet" },
      ],
      expected: ["Na", "H2O"],
      resultText:
        "✨ Xèo xèo! Viên Na phản ứng, sinh khí bay lên, dung dịch chuyển màu hồng do sinh ra bazơ NaOH.",
    },

    notes:
      "Natri là kim loại kiềm điển hình, phản ứng rất mạnh với nước và không khí ẩm.",
  },

  {
    number: 8,
    symbol: "O",
    mass: 15.999,
    category: "phi-kim",
    hasData: true,

    general: {
      latinName: "Oxygenium",
      englishName: "Oxygen",
      electronConfig: "1s² 2s² 2p⁴",
      group: 16,
      period: 2,
      state: "Khí",
      oxidation: "-2",
      electronegativity: 3.44,
    },

    history: {
      discoverer: "Carl Wilhelm Scheele / Joseph Priestley",
      year: 1774,
      discoveryLocation: "Thụy Điển / Anh",
      link: true,
    },

    structure: {
      protons: 8,
      neutrons: 8,
      electrons: 8,
      crystalType: "unknown",
      electronShells: [2, 6],
      valenceElectrons: 6,
    },

    occurrence: {
      description:
        "Oxi là nguyên tố rất phổ biến trong khí quyển, nước và các khoáng vật.",
      simple: ["O₂", "O₃"],
      compounds: ["H₂O", "SiO₂", "CO₂", "Fe₂O₃"],
      ores: [],
    },

    images: {
      atomic: "",
      ore: "",
      application: "",
      sample: "",
    },

    physical: "Khí không màu, không mùi, duy trì sự cháy.",
    chemical: "Là chất oxi hóa mạnh, tham gia nhiều phản ứng oxi hóa - khử.",
    reactions: [],
    applications: [],
    simulation: null,
    notes: "Oxi chiếm khoảng 21% thể tích không khí khô.",
  },
];
// Tên 118 Nguyên tố Hóa học tiếng Việt chuẩn
const elNames = [
  "Hydrogen",
  "Helium",
  "Lithium",
  "Beryllium",
  "Boron",
  "Carbon",
  "Nitrogen",
  "Oxygen",
  "Fluorine",
  "Neon",
  "Sodium",
  "Magnesium",
  "Aluminium",
  "Silicon",
  "Phosphorus",
  "Sulfur",
  "Chlorine",
  "Argon",
  "Potassium",
  "Calcium",
  "Scandium",
  "Titanium",
  "Vanadium",
  "Chromium",
  "Manganese",
  "Iron",
  "Cobalt",
  "Nickel",
  "Copper",
  "Zinc",
  "Gallium",
  "Germanium",
  "Arsenic",
  "Selenium",
  "Bromine",
  "Krypton",
  "Rubidium",
  "Strontium",
  "Yttrium",
  "Zirconium",
  "Niobium",
  "Molybdenum",
  "Technetium",
  "Ruthenium",
  "Rhodium",
  "Palladium",
  "Silver",
  "Cadmium",
  "Indium",
  "Tin",
  "Antimony",
  "Tellurium",
  "Iodine",
  "Xenon",
  "Cesium",
  "Barium",
  "Lanthanum",
  "Cerium",
  "Praseodymium",
  "Neodymium",
  "Promethium",
  "Samarium",
  "Europium",
  "Gadolinium",
  "Terbium",
  "Dysprosium",
  "Holmium",
  "Erbium",
  "Thulium",
  "Ytterbium",
  "Lutetium",
  "Hafnium",
  "Tantalum",
  "Tungsten",
  "Rhenium",
  "Osmium",
  "Iridium",
  "Platinum",
  "Gold",
  "Mercury",
  "Thallium",
  "Lead",
  "Bismuth",
  "Polonium",
  "Astatine",
  "Radon",
  "Francium",
  "Radium",
  "Actinium",
  "Thorium",
  "Protactinium",
  "Uranium",
  "Neptunium",
  "Plutonium",
  "Americium",
  "Curium",
  "Berkelium",
  "Californium",
  "Einsteinium",
  "Fermium",
  "Mendelevium",
  "Nobelium",
  "Lawrencium",
  "Rutherfordium",
  "Dubnium",
  "Seaborgium",
  "Bohrium",
  "Hassium",
  "Meitnerium",
  "Darmstadtium",
  "Roentgenium",
  "Copernicium",
  "Nihonium",
  "Flerovium",
  "Moscovium",
  "Livermorium",
  "Tennessine",
  "Oganesson",
];
const elSymbols = [
  "H",
  "He",
  "Li",
  "Be",
  "B",
  "C",
  "N",
  "O",
  "F",
  "Ne",
  "Na",
  "Mg",
  "Al",
  "Si",
  "P",
  "S",
  "Cl",
  "Ar",
  "K",
  "Ca",
  "Sc",
  "Ti",
  "V",
  "Cr",
  "Mn",
  "Fe",
  "Co",
  "Ni",
  "Cu",
  "Zn",
  "Ga",
  "Ge",
  "As",
  "Se",
  "Br",
  "Kr",
  "Rb",
  "Sr",
  "Y",
  "Zr",
  "Nb",
  "Mo",
  "Tc",
  "Ru",
  "Rh",
  "Pd",
  "Ag",
  "Cd",
  "In",
  "Sn",
  "Sb",
  "Te",
  "I",
  "Xe",
  "Cs",
  "Ba",
  "La",
  "Ce",
  "Pr",
  "Nd",
  "Pm",
  "Sm",
  "Eu",
  "Gd",
  "Tb",
  "Dy",
  "Ho",
  "Er",
  "Tm",
  "Yb",
  "Lu",
  "Hf",
  "Ta",
  "W",
  "Re",
  "Os",
  "Ir",
  "Pt",
  "Au",
  "Hg",
  "Tl",
  "Pb",
  "Bi",
  "Po",
  "At",
  "Rn",
  "Fr",
  "Ra",
  "Ac",
  "Th",
  "Pa",
  "U",
  "Np",
  "Pu",
  "Am",
  "Cm",
  "Bk",
  "Cf",
  "Es",
  "Fm",
  "Md",
  "No",
  "Lr",
  "Rf",
  "Db",
  "Sg",
  "Bh",
  "Hs",
  "Mt",
  "Ds",
  "Rg",
  "Cn",
  "Nh",
  "Fl",
  "Mc",
  "Lv",
  "Ts",
  "Og",
];

// --- DỮ LIỆU CẤU HÌNH ---
const categories = {
  "phi-kim": { name: "Phi kim", color: "#22c55e" },
  "khi-hiem": { name: "Khí hiếm", color: "#a855f7" },
  kiem: { name: "Kim loại kiềm", color: "#f97316" },
  "kiem-tho": { name: "Kim loại kiềm thổ", color: "#eab308" },
  "a-kim": { name: "Á kim", color: "#06b6d4" },
  halogen: { name: "Halogen", color: "#14b8a6" },
  "chuyen-tiep": { name: "Kim loại chuyển tiếp", color: "#ef4444" },
  lanthanide: { name: "Họ Lantan", color: "#ec4899" },
  actinide: { name: "Họ Actini", color: "#d946ef" },
  unknown: { name: "Chưa xác định", color: "#475569" },
};

export { detailedData, elNames, elSymbols, categories };
