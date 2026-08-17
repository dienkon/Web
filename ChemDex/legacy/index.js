export const elNames = [
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
export const elSymbols = [
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

export const categories = {
  "phi-kim": {
    name: "Phi kim",
    color: "#22c55e",
  },
  "khi-hiem": {
    name: "Khí hiếm",
    color: "#a855f7",
  },
  kiem: {
    name: "Kim loại kiềm",
    color: "#f97316",
  },
  "kiem-tho": {
    name: "Kim loại kiềm thổ",
    color: "#eab308",
  },
  "a-kim": {
    name: "Á kim",
    color: "#22d3ee",
  },
  halogen: {
    name: "Halogen",
    color: "#14b8a6",
  },
  "chuyen-tiep": {
    name: "Kim loại chuyển tiếp",
    color: "#ef4444",
  },
  lanthanide: {
    name: "Họ Lanthanide",
    color: "#ec4899",
  },
  actinide: {
    name: "Họ Actinide",
    color: "#d946ef",
  },
  unknown: {
    name: "Chưa phân loại",
    color: "#475569",
  },
};

export const detailedData = [
  // 001 Hydrogen
  {
    number: 1,
    symbol: "H",
    mass: 1.008,
    category: "phi-kim",
    hasData: true,

    general: {
      latinName: "Hydrogenium",
      englishName: "Hydrogen",
      electronConfig: "1s¹",
      isotope: "¹H , ²H (D), ³H (T)",
      group: 1,
      period: 1,
      block: "s",
      state: "Khí",
      oxidation: "+1, -1",
      electronegativity: 2.2,
      density: "0,08988 g/L (0°C, 1 atm)",
      meltingPoint: "-259,16°C",
      boilingPoint: "-252,87°C",
      crystalStructure: "Lục giác đơn giản",
    },

    history: {
      discoverer: "Henry Cavendish",
      year: 1766,
      discoveryLocation: "Anh",
      link: true,
      description:
        "Năm 1766, Henry Cavendish nghiên cứu loại khí sinh ra khi kim loại tác dụng với axit và xác định đây là một chất hoàn toàn mới. Antoine Lavoisier sau đó đặt tên là Hydrogen, nghĩa là 'sinh ra nước'.",
    },

    structure: {
      protons: 1,
      neutrons: 0,
      electrons: 1,

      electronShells: [1],
      valenceElectrons: 1,

      lattice: "sh",

      nucleus: {
        proton: 1,
        neutron: 0,
      },
    },

    occurrence: {
      description:
        "Hydrogen là nguyên tố phổ biến nhất trong vũ trụ. Trên Trái Đất hydrogen chủ yếu tồn tại dưới dạng hợp chất như nước và các hợp chất hữu cơ.",

      simple: ["H₂"],

      compounds: ["H₂O", "HCl", "NH₃", "CH₄", "C₂H₂", "H₂SO₄", "NaOH"],

      ores: [
        "Nước biển",
        "Nước ngọt",
        "Dầu mỏ",
        "Khí thiên nhiên",
        "Sinh khối",
      ],
    },
    naturalState: {
      image: "./assets/img/001_hydrogen/trang-thai-tu-nhien.png",
    },

    physical: `
    <ul class="list-disc ml-5 space-y-2">
      <li>Là chất khí không màu, không mùi, không vị.</li>
      <li>Là nguyên tố nhẹ nhất trong bảng tuần hoàn.</li>
      <li>Khối lượng riêng: <b>0,08988 g/L</b>.</li>
      <li>Ít tan trong nước.</li>
      <li>Tốc độ khuếch tán rất lớn.</li>
      <li>Nhiệt độ nóng chảy: <b>-259,16°C</b>.</li>
      <li>Nhiệt độ sôi: <b>-252,87°C</b>.</li>
      <li>Dẫn nhiệt tốt hơn hầu hết các chất khí khác.</li>
      <li>Hydrogen lỏng được bảo quản ở nhiệt độ cực thấp.</li>
    </ul>
  `,

    chemical: `
    <ul class="list-disc ml-5 space-y-2">
      <li>Hydrogen là phi kim hoạt động hóa học.</li>
      <li>Thể hiện tính khử mạnh ở nhiệt độ cao.</li>
      <li>Phản ứng với Oxygen tạo nước.</li>
      <li>Khử được nhiều oxide kim loại như CuO, Fe₂O₃, PbO...</li>
      <li>Phản ứng với halogen tạo hydrogen halides.</li>
      <li>Phản ứng với Nitrogen tạo ammonia (NH₃) trong điều kiện thích hợp.</li>
      <li>Có thể đóng vai trò chất Oxygen hóa khi tác dụng với kim loại mạnh tạo hydride.</li>
      <li>Cháy trong không khí tạo ngọn lửa màu xanh nhạt.</li>
    </ul>
  `,

    reactions: [
      {
        type: "Cháy trong Oxygen",
        equation: "2H₂ + O₂ → 2H₂O",
        related: "O",
        desc: "Hydro cháy mãnh liệt trong Oxygen tạo nước và tỏa nhiều nhiệt.",
      },

      {
        type: "Khử CuO",
        equation: "CuO + H₂ → Cu + H₂O",
        condition: "t°",
        related: "Cu",
        desc: "Hydro thể hiện tính khử.",
      },

      {
        type: "Khử Fe₂O₃",
        equation: "Fe₂O₃ + 3H₂ → 2Fe + 3H₂O",
        condition: "t°",
        related: "Fe",
        desc: "Điều chế kim loại từ oxide.",
      },

      {
        type: "Tác dụng với chlorine",
        equation: "H₂ + Cl₂ → 2HCl",
        condition: "as",
        related: "Cl",
        desc: "Tạo khí hydrogen chloride.",
      },

      {
        type: "Tổng hợp ammonia",
        equation: "N₂ + 3H₂ ⇌ 2NH₃",
        condition: "t°, p, xt",
        related: "N",
        desc: "Phản ứng Haber-Bosch.",
      },
    ],

    applications: [
      {
        title: "Nhiên liệu tên lửa",
        desc: "Hydro lỏng là nhiên liệu có hiệu suất rất cao.",
      },

      {
        title: "Pin nhiên liệu Hydrogen",
        desc: "Nguồn năng lượng sạch cho ô tô và thiết bị điện.",
      },

      {
        title: "Sản xuất NH₃",
        desc: "Nguyên liệu chính trong quy trình Haber.",
      },

      {
        title: "Sản xuất HCl",
        desc: "Nguyên liệu công nghiệp hóa chất.",
      },

      {
        title: "Khử oxide kim loại",
        desc: "Luyện kim và tinh chế kim loại.",
      },

      {
        title: "Hydrogenation dầu thực vật",
        desc: "Sản xuất bơ thực vật.",
      },

      {
        title: "Lọc dầu",
        desc: "Loại bỏ lưu huỳnh trong nhiên liệu.",
      },

      {
        title: "Khí bảo vệ",
        desc: "Dùng trong công nghiệp điện tử và luyện kim.",
      },

      {
        title: "Khinh khí cầu",
        desc: "Do là khí nhẹ nhất.",
      },
    ],

    simulation: {
      title: "Đốt cháy khí Hydrogen",

      reagents: [
        {
          id: "H2",
          name: "Khí H₂",
          icon: "fa-cloud",
        },
        {
          id: "O2",
          name: "Khí O₂",
          icon: "fa-wind",
        },
      ],

      expected: ["H2", "O2"],

      resultText:
        "🔥 Hydrogen cháy trong Oxygen tạo thành nước và giải phóng nhiều nhiệt.\n\n2H₂ + O₂ → 2H₂O",
    },

    notes: `
    <ul class="list-disc ml-5 space-y-2">
      <li>Nguyên tố số 1 trong bảng tuần hoàn.</li>
      <li>Chiếm khoảng 75% khối lượng vật chất thông thường của vũ trụ.</li>
      <li>Là thành phần chính của Mặt Trời và các sao.</li>
      <li>Là nguyên tố quan trọng trong nước và mọi hợp chất hữu cơ.</li>
      <li>Được xem là nhiên liệu của tương lai trong nền kinh tế hydrogen.</li>
    </ul>
  `,
  },
  // 002 Helium
  {
    number: 2,
    symbol: "He",
    mass: 4.0026,
    category: "khi-hiem",
    hasData: true,

    general: {
      latinName: "Helium",
      englishName: "Helium",
      electronConfig: "1s²",
      isotope: "³He, ⁴He",
      group: 18,
      period: 1,
      block: "s",
      state: "Khí",
      oxidation: "0",
      electronegativity: "Không xác định",
      density: "0,1786 g/L (0°C, 1 atm)",
      meltingPoint: "-272,20°C (ở ~2,5 MPa)",
      boilingPoint: "-268,93°C",
      crystalStructure: "hcp (khi rắn, áp suất cao)",
    },

    history: {
      discoverer: "Jules Janssen, Norman Lockyer",
      discovererUrl: "https://en.wikipedia.org/wiki/Jules_Janssen",

      discoverers: [
        {
          name: "Jules Janssen",
          url: "https://en.wikipedia.org/wiki/Jules_Janssen",
        },
        {
          name: "Norman Lockyer",
          url: "https://en.wikipedia.org/wiki/Norman_Lockyer",
        },
        {
          name: "William Ramsay",
          url: "https://en.wikipedia.org/wiki/William_Ramsay",
        },
      ],

      year: 1868,
      discoveryLocation: "Ấn Độ / Anh",

      description:
        "Năm 1868, helium được phát hiện lần đầu qua vạch phổ màu vàng trong quang phổ Mặt Trời trong một lần nhật thực toàn phần. Sau đó, năm 1895, William Ramsay đã tách được helium trên Trái Đất từ quặng cleveite, xác nhận đây là một nguyên tố riêng biệt.",
    },

    structure: {
      protons: 2,
      neutrons: 2,
      electrons: 2,

      electronShells: [2],
      valenceElectrons: 2,

      lattice: "khong co",

      nucleus: {
        proton: 2,
        neutron: 2,
      },

      orbitalDistribution: {
        s: 2,
        p: 0,
        d: 0,
        f: 0,
      },
    },

    occurrence: {
      description:
        "Helium là nguyên tố phổ biến thứ hai trong vũ trụ sau hydrogen. Trên Trái Đất, helium rất hiếm và chủ yếu có trong khí tự nhiên; nó cũng được tạo ra từ phân rã phóng xạ của các nguyên tố nặng trong lòng đất.",

      simple: ["He"],

      compounds: [],

      ores: ["Khí thiên nhiên", "Mỏ uranium", "Mỏ thorium", "Khí mỏ dầu"],
    },

    naturalState: {
      image: "./assets/img/002_helium/trang-thai-tu-nhien.png",

      title: "Helium trong tự nhiên",

      description:
        "Helium tồn tại chủ yếu trong khí thiên nhiên và được tạo thành từ quá trình phân rã phóng xạ của uranium và thorium trong vỏ Trái Đất.",
    },

    mediaBlocks: [
      {
        section: "history",

        type: "video",

        title: "Lịch sử phát hiện Helium",

        src: "https://www.youtube.com/watch?v=YbfeDnQbHLo&list=RDYbfeDnQbHLo&start_radio=1",

        questions: [
          {
            time: "00:45",

            question:
              "Helium được phát hiện đầu tiên trong quang phổ của thiên thể nào?",

            options: ["Mặt Trời", "Mặt Trăng", "Sao Hỏa", "Sao Mộc"],

            correct: 0,
          },

          {
            time: "01:52",

            question: "Ai là người tách được Helium trên Trái Đất?",

            options: [
              "Henry Cavendish",
              "William Ramsay",
              "Dalton",
              "Mendeleev",
            ],

            correct: 1,
          },
        ],
      },

      {
        section: "occurrence",

        type: "3d",
        model: "./assets/model/2_He.glb",
        title: "Mô hình bình chứa Helium công nghiệp",

        description:
          "Mô hình hệ thống lưu trữ helium lỏng sử dụng trong công nghiệp cryogenic.",
      },
    ],

    physical: `
<ul class="list-disc ml-5 space-y-2">
  <li>Là chất khí không màu, không mùi, không vị.</li>
  <li>Là nguyên tố nhẹ thứ hai sau hydrogen.</li>
  <li>Khối lượng riêng: <b>0,1786 g/L</b>.</li>
  <li>Khí hiếm, đơn nguyên tử, rất ít tan trong nước.</li>
  <li>Có nhiệt độ sôi thấp nhất trong các nguyên tố.</li>
  <li>Không có nhiệt độ nóng chảy ở áp suất thường.</li>
  <li>Dẫn nhiệt tốt và tốc độ khuếch tán lớn.</li>
  <li>Ở trạng thái lỏng, helium là chất làm lạnh cực mạnh.</li>
</ul>
`,

    chemical: `
<ul class="list-disc ml-5 space-y-2">
  <li>Helium là khí hiếm, hầu như trơ hóa học trong điều kiện thường.</li>
  <li>Không cháy và không duy trì sự cháy.</li>
  <li>Có thể bị ion hóa trong phóng điện hoặc plasma.</li>
  <li>Có thể tạo các excimer và cụm ion rất không bền trong điều kiện đặc biệt.</li>
  <li>HeH⁺ là ion helium-hydrogen bền trong pha khí nhưng rất phản ứng.</li>
  <li>Ở áp suất rất cao, helium có thể tạo một số hợp chất hiếm như Na₂He.</li>
</ul>
`,

    preparation: `
<div class="space-y-3">

  <div>
    <h4 class="font-bold text-cyan-400">
      Khai thác từ khí thiên nhiên
    </h4>

    <p>
      Helium được tách từ khí thiên nhiên bằng phương pháp hóa lỏng phân đoạn
      ở nhiệt độ cực thấp.
    </p>
  </div>

  <div>
    <h4 class="font-bold text-cyan-400">
      Tách cryogenic
    </h4>

    <p>
      Sau khi loại bỏ methane, nitrogen và các khí khác, helium được tinh chế
      đạt độ tinh khiết trên 99,99%.
    </p>
  </div>

</div>
`,

    reactions: [
      {
        type: "Ion hóa helium",
        equation: "He + hν → He⁺ + e⁻",
        related: "He",
        condition: "năng lượng cao / UV / plasma",
        desc: "Helium chỉ phản ứng rõ rệt khi bị ion hóa trong môi trường năng lượng cao.",
      },

      {
        type: "Tạo helium hydride ion",
        equation: "He⁺ + H₂ → HeH⁺ + H",
        related: "H",
        condition: "plasma / thiên văn",
        desc: "HeH⁺ là một ion rất quan trọng trong hóa học vũ trụ và khí plasma.",
      },

      {
        type: "Tạo sodium helide",
        equation: "2Na + He → Na₂He",
        related: "Na",
        condition: "áp suất rất cao (>113 GPa)",
        desc: "Đây là một hợp chất hiếm của helium, chỉ bền trong điều kiện áp suất cực lớn.",
      },
    ],

    applications: [
      {
        title: "Làm lạnh siêu dẫn",
        desc: "Helium lỏng được dùng trong các hệ cryogenic và nam châm siêu dẫn.",
      },

      {
        title: "MRI / NMR",
        desc: "Được dùng để làm lạnh hệ nam châm siêu dẫn trong máy MRI và NMR.",
      },

      {
        title: "Khí nâng",
        desc: "Dùng trong bóng bay và khí cầu vì nhẹ hơn không khí và không cháy.",
      },

      {
        title: "Khí bảo vệ",
        desc: "Dùng trong hàn và môi trường khí trơ để hạn chế phản ứng với không khí.",
      },

      {
        title: "Kiểm tra rò rỉ",
        desc: "Helium là khí dò rò rỉ rất tốt trong hệ chân không và thiết bị kín.",
      },

      {
        title: "Nạp áp suất",
        desc: "Dùng để nén và đẩy chất lỏng trong tên lửa và hệ kỹ thuật đặc biệt.",
      },

      {
        title: "Hô hấp hỗn hợp",
        desc: "Trộn với oxygen trong một số môi trường áp suất cao.",
      },
    ],

    simulation: {
      title: "Ion hóa helium",

      reagents: [
        {
          id: "He",
          name: "Khí He",
          icon: "fa-wind",
        },

        {
          id: "energy",
          name: "Năng lượng cao",
          icon: "fa-bolt",
        },
      ],

      expected: ["He", "energy"],

      resultText:
        "⚡ Helium rất trơ ở điều kiện thường, nhưng trong môi trường năng lượng cao có thể bị ion hóa.\n\nHe + hν → He⁺ + e⁻",
    },

    notes: `
<ul class="list-disc ml-5 space-y-2">
  <li>Nguyên tố số 2 trong bảng tuần hoàn.</li>
  <li>Là khí hiếm nhẹ nhất.</li>
  <li>Có nhiệt độ sôi thấp nhất trong mọi nguyên tố.</li>
  <li>Trên Trái Đất, helium rất hiếm nhưng lại cực kỳ quan trọng trong công nghệ cryogenic.</li>
  <li>Trong điều kiện thường, helium gần như không tạo hợp chất bền.</li>
</ul>
`,
  },
  //TEST
  {
    number: 84,
    symbol: "Po",
    mass: 209,
    category: "a-kim",
    hasData: true,

    general: {
      latinName: "Polonium",
      englishName: "Polonium",
      electronConfig: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴",
      isotope: "²⁰⁸Po, ²⁰⁹Po, ²¹⁰Po",
      group: 16,
      period: 6,
      block: "p",
      state: "Rắn",
      oxidation: "-2, +2, +4, +6",
      electronegativity: "2,0",
      density: "9,32 g/cm³",
      meltingPoint: "254°C",
      boilingPoint: "962°C",
      crystalStructure: "Lập phương đơn giản",
    },

    history: {
      discoverer: "Marie Curie, Pierre Curie",
      discovererUrl: "https://en.wikipedia.org/wiki/Marie_Curie",

      discoverers: [
        {
          name: "Marie Curie",
          url: "https://en.wikipedia.org/wiki/Marie_Curie",
        },
        {
          name: "Pierre Curie",
          url: "https://en.wikipedia.org/wiki/Pierre_Curie",
        },
      ],

      year: 1898,
      discoveryLocation: "Paris, Pháp",

      description:
        "Polonium được Marie Curie và Pierre Curie phát hiện năm 1898 khi nghiên cứu quặng pitchblende. Nguyên tố được đặt tên theo Ba Lan (Poland), quê hương của Marie Curie.",
    },

    structure: {
      protons: 84,
      neutrons: 125,
      electrons: 84,

      electronShells: [2, 8, 18, 32, 18, 6],
      valenceElectrons: 6,

      lattice: "lap-phuong-don-gian",

      nucleus: {
        proton: 84,
        neutron: 125,
      },

      orbitalDistribution: {
        s: 2,
        p: 4,
        d: 10,
        f: 14,
      },
    },

    occurrence: {
      description:
        "Polonium là nguyên tố cực hiếm trong tự nhiên. Nó xuất hiện với lượng rất nhỏ trong quặng uranium và thorium, hình thành từ chuỗi phân rã phóng xạ tự nhiên.",

      simple: ["Po"],

      compounds: ["PoO₂", "PoCl₂", "PoCl₄", "PoH₂"],

      ores: ["Pitchblende", "Quặng uranium", "Quặng thorium"],
    },

    naturalState: {
      image: "./assets/img/084_polonium/trang-thai-tu-nhien.png",

      title: "Polonium trong tự nhiên",

      description:
        "Polonium tồn tại với lượng cực nhỏ trong các quặng chứa uranium và thorium, là sản phẩm của các chuỗi phân rã phóng xạ tự nhiên.",
    },

    mediaBlocks: [
      {
        section: "history",

        type: "video",

        title: "Khám phá Polonium",

        src: "https://www.youtube.com/watch?v=lFwM0s0qQWQ",

        questions: [
          {
            time: "00:35",

            question: "Ai là người đồng phát hiện ra nguyên tố Polonium?",

            options: [
              "Marie Curie",
              "Niels Bohr",
              "Ernest Rutherford",
              "Mendeleev",
            ],

            correct: 0,
          },

          {
            time: "01:10",

            question: "Polonium được đặt tên để vinh danh quốc gia nào?",

            options: ["Pháp", "Nga", "Ba Lan", "Đức"],

            correct: 2,
          },
        ],
      },

      {
        section: "occurrence",

        type: "3d",

        model: "./assets/model/84_Po.glb",

        title: "Tinh thể Polonium",

        description: "Mô hình cấu trúc tinh thể của polonium ở trạng thái rắn.",
      },
    ],

    physical: `
<ul class="list-disc ml-5 space-y-2">
  <li>Là kim loại phóng xạ màu bạc.</li>
  <li>Thuộc nhóm chalcogen cùng với oxygen và sulfur.</li>
  <li>Tự phát nhiệt do phân rã phóng xạ.</li>
  <li>Có mật độ tương đối cao: <b>9,32 g/cm³</b>.</li>
  <li>Dẫn điện và dẫn nhiệt tương đối tốt.</li>
  <li>Phát ra chủ yếu bức xạ alpha.</li>
  <li>Phát quang yếu trong bóng tối do phóng xạ mạnh.</li>
</ul>
`,

    chemical: `
<ul class="list-disc ml-5 space-y-2">
  <li>Hoạt động hóa học mạnh hơn tellurium.</li>
  <li>Dễ bị oxy hóa trong không khí tạo PoO₂.</li>
  <li>Phản ứng với halogen tạo các muối polonium.</li>
  <li>Tạo các hợp chất ở số oxi hóa +2 và +4 phổ biến.</li>
  <li>Có thể tạo hydride PoH₂.</li>
  <li>Tất cả hợp chất của polonium đều có tính phóng xạ.</li>
</ul>
`,

    preparation: `
<div class="space-y-3">

  <div>
    <h4 class="font-bold text-cyan-400">
      Tách từ quặng uranium
    </h4>

    <p>
      Polonium được phát hiện lần đầu từ cặn phóng xạ của quặng pitchblende.
    </p>
  </div>

  <div>
    <h4 class="font-bold text-cyan-400">
      Chiếu xạ bismuth
    </h4>

    <p>
      Polonium công nghiệp được sản xuất bằng cách chiếu neutron vào bismuth-209 trong lò phản ứng hạt nhân.
    </p>
  </div>

</div>
`,

    reactions: [
      {
        type: "Oxy hóa",

        equation: "Po + O₂ → PoO₂",

        related: "O",

        condition: "đun nóng",

        desc: "Polonium phản ứng với oxygen tạo polonium dioxide.",
      },

      {
        type: "Tác dụng với chlorine",

        equation: "Po + 2Cl₂ → PoCl₄",

        related: "Cl",

        condition: "nhiệt độ thích hợp",

        desc: "Polonium phản ứng với chlorine tạo polonium tetrachloride.",
      },

      {
        type: "Tạo hydride",

        equation: "Po + H₂ → PoH₂",

        related: "H",

        condition: "nhiệt độ cao",

        desc: "Polonium có thể tạo hợp chất hydride tương tự các nguyên tố nhóm 16 khác.",
      },
    ],

    applications: [
      {
        title: "Nguồn phát alpha",

        desc: "Dùng làm nguồn phát hạt alpha trong nghiên cứu khoa học.",
      },

      {
        title: "Khử tĩnh điện",

        desc: "Được dùng trong các thiết bị loại bỏ điện tích tĩnh trong công nghiệp.",
      },

      {
        title: "Nguồn nhiệt phóng xạ",

        desc: "Được sử dụng làm nguồn nhiệt trong một số thiết bị đặc biệt.",
      },

      {
        title: "Nghiên cứu hạt nhân",

        desc: "Quan trọng trong nghiên cứu vật lý hạt nhân và phóng xạ.",
      },
    ],

    simulation: {
      title: "Oxy hóa Polonium",

      reagents: [
        {
          id: "Po",
          name: "Polonium",
          icon: "fa-radiation",
        },

        {
          id: "O",
          name: "Oxygen",
          icon: "fa-wind",
        },
      ],

      expected: ["Po", "O"],

      resultText:
        "☢️ Polonium phản ứng với oxygen tạo polonium dioxide.\n\nPo + O₂ → PoO₂",
    },

    notes: `
<ul class="list-disc ml-5 space-y-2">
  <li>Nguyên tố số 84 trong bảng tuần hoàn.</li>
  <li>Được Marie Curie và Pierre Curie phát hiện năm 1898.</li>
  <li>Được đặt tên theo Ba Lan (Poland).</li>
  <li>Là một trong những nguyên tố phóng xạ độc hại nhất được biết đến.</li>
  <li>²¹⁰Po là đồng vị nổi tiếng và được nghiên cứu nhiều nhất.</li>
  <li>Trong tự nhiên chỉ tồn tại với lượng cực kỳ nhỏ.</li>
</ul>
`,
  },
  {
    number: 6,
    symbol: "C",
    nameVi: "Carbon",
    nameEn: "Carbon",
    mass: 12.011,
    category: "phi-kim",
    general: {
      latinName: "Carbonium",
      englishName: "Carbon",
      electronConfig: "1s2 2s2 2p2",
      group: 14,
      period: 2,
      isotope:
        "184Bi, 185Bi, 186Bi, 187Bi, 188Bi, 189Bi, 190Bi, 191Bi, 192Bi, 193Bi, 194Bi, 195Bi, 196Bi, 197Bi, 198Bi, 199Bi, 200Bi, 201Bi, 202Bi, 203Bi, 204Bi, 205Bi, 206Bi, 207Bi, 208Bi, 209Bi, 210Bi, 211Bi, 212Bi, 213Bi, 214Bi, 215Bi, 216Bi, 217Bi, 218Bi",
      oxidation: "-4, +2, +4",
      electronegativity: "2.55",
      shells: [2, 4],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Từ rất sớm",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 6,
      protons: 6,
      neutrons: 6,
    },
    occurrence: {
      description:
        "Có trong than, đá vôi, sinh vật sống và nhiều hợp chất hữu cơ.",
      simple: ["Kim cương", "Than chì"],
      compounds: ["CO2", "CaCO3"],
    },
    physical:
      "Tồn tại ở nhiều dạng thù hình như kim cương, than chì, graphene.",
    chemical: "Thể hiện tính phi kim, tạo liên kết cộng hóa trị bền.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "C + O2 → CO2",
        desc: "Phản ứng cháy hoàn toàn.",
      },
    ],
    structureType: "diamond",
    images: {},
    hasData: true,
  },
  {
    number: 8,
    symbol: "O",
    nameVi: "Oxygen",
    nameEn: "Oxygen",
    mass: 15.999,
    structureType: "bcc",
    category: "phi-kim",
    general: {
      shells: [],
      electronConfig: "Đang cập nhật",
      englishName: "Oxygen",
      latinName: "Oxygen",
    },
    history: {},
    structure: {},
    occurrence: {},
    physical: "Đang cập nhật dữ liệu.",
    chemical: "Đang cập nhật dữ liệu.",
    reactions: [],
    images: {},
    hasData: true,
  },
  {
    number: 11,
    symbol: "Na",
    nameVi: "Sodium",
    nameEn: "Sodium",
    mass: 22.99,
    category: "kiem",
    general: {
      latinName: "Natrium",
      englishName: "Sodium",
      electronConfig: "[Ne] 3s1",
      group: 1,
      period: 3,
      oxidation: "+1",
      electronegativity: "0.93",
      shells: [2, 8, 1],
    },
    history: {
      discoverer: "Humphry Davy",
      year: 1807,
      discoveryLocation: "Anh",
    },
    structure: {
      electrons: 11,
      protons: 11,
      neutrons: 12,
    },
    occurrence: {
      description: "Có nhiều trong muối ăn và khoáng vật halite.",
      simple: ["Na"],
      compounds: ["NaCl", "Na2CO3"],
    },
    physical: "Kim loại mềm, màu bạc, phản ứng mạnh với nước.",
    chemical: "Thể hiện tính khử mạnh, tạo muối ion điển hình.",
    reactions: [
      {
        type: "Phản ứng với nước",
        eq: "2Na + 2H2O → 2NaOH + H2",
        desc: "Tạo dung dịch kiềm và giải phóng khí hidro.",
      },
    ],
    structureType: "bcc",
    images: {},
    hasData: true,
  },
  {
    number: 12,
    symbol: "Mg",
    nameVi: "Magnesium",
    nameEn: "Magnesium",
    mass: 24.305,
    category: "kiem-tho",
    general: {
      latinName: "Magnesium",
      englishName: "Magnesium",
      electronConfig: "[Ne] 3s2",
      group: 2,
      period: 3,
      oxidation: "+2",
      electronegativity: "1.31",
      shells: [2, 8, 2],
    },
    history: {
      discoverer: "Joseph Black",
      year: 1755,
      discoveryLocation: "Scotland",
    },
    structure: {
      electrons: 12,
      protons: 12,
      neutrons: 12,
    },
    occurrence: {
      description: "Có trong dolomit, magnesit, nước biển.",
      simple: ["Mg"],
      compounds: ["MgO", "MgCO3"],
    },
    physical: "Kim loại nhẹ, sáng bạc.",
    chemical: "Dễ cháy trong không khí tạo oxit và nitrua.",
    reactions: [
      {
        type: "Cháy",
        eq: "2Mg + O2 → 2MgO",
        desc: "Tạo ngọn lửa trắng sáng.",
      },
    ],
    structureType: "hcp",
    images: {},
    hasData: true,
  },
  {
    number: 13,
    symbol: "Al",
    nameVi: "Aluminium",
    nameEn: "Aluminium",
    mass: 26.982,
    category: "unknown",
    general: {
      latinName: "Aluminium",
      englishName: "Aluminium",
      electronConfig: "[Ne] 3s2 3p1",
      group: 13,
      period: 3,
      oxidation: "+3",
      electronegativity: "1.61",
      shells: [2, 8, 3],
    },
    history: {
      discoverer: "Hans Christian Ørsted",
      year: 1825,
      discoveryLocation: "Đan Mạch",
    },
    structure: {
      electrons: 13,
      protons: 13,
      neutrons: 14,
    },
    occurrence: {
      description: "Có trong bauxite và nhiều silicat.",
      simple: ["Al"],
      compounds: ["Al2O3", "Al(OH)3"],
    },
    physical: "Nhẹ, dẫn nhiệt tốt, có lớp oxit bảo vệ.",
    chemical: "Lưỡng tính, phản ứng với axit và bazơ mạnh.",
    reactions: [
      {
        type: "Oxit hóa",
        eq: "4Al + 3O2 → 2Al2O3",
        desc: "Tạo lớp oxit bền trên bề mặt.",
      },
    ],
    structureType: "fcc",
    images: {},
    hasData: true,
  },
  {
    number: 14,
    symbol: "Si",
    nameVi: "Silicon",
    nameEn: "Silicon",
    mass: 28.085,
    category: "phi-kim",
    structureType: "diamond",
    general: {
      shells: [],
      electronConfig: "Đang cập nhật",
      englishName: "Silicon",
      latinName: "Silicon",
    },
    history: {},
    structure: {},
    occurrence: {},
    physical: "Đang cập nhật dữ liệu.",
    chemical: "Đang cập nhật dữ liệu.",
    reactions: [],
    images: {},
    hasData: true,
  },
  {
    number: 16,
    symbol: "S",
    nameVi: "Sulfur",
    nameEn: "Sulfur",
    mass: 32.06,
    category: "phi-kim",
    general: {
      latinName: "Sulfur",
      englishName: "Sulfur",
      electronConfig: "[Ne] 3s2 3p4",
      group: 16,
      period: 3,
      oxidation: "-2, +4, +6",
      electronegativity: "2.58",
      shells: [2, 8, 6],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Cổ đại",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 16,
      protons: 16,
      neutrons: 16,
    },
    occurrence: {
      description: "Trong quặng sulfide, sulfate và lưu huỳnh tự do.",
      simple: ["S8"],
      compounds: ["H2S", "SO2"],
    },
    physical: "Rắn vàng, giòn.",
    chemical: "Tạo nhiều hợp chất sulfide và oxit.",
    reactions: [
      {
        type: "Cháy",
        eq: "S + O2 → SO2",
        desc: "Tạo khí SO2.",
      },
    ],
    structureType: "molecular",
    images: {},
    hasData: true,
  },
  {
    number: 17,
    symbol: "Cl",
    nameVi: "Chlorine",
    nameEn: "Chlorine",
    mass: 35.45,
    category: "halogen",
    general: {
      latinName: "Chlorum",
      englishName: "Chlorine",
      electronConfig: "[Ne] 3s2 3p5",
      group: 17,
      period: 3,
      oxidation: "-1, +1, +3, +5, +7",
      electronegativity: "3.16",
      shells: [2, 8, 7],
    },
    history: {
      discoverer: "Carl Wilhelm Scheele",
      year: 1774,
      discoveryLocation: "Thụy Điển",
    },
    structure: {
      electrons: 17,
      protons: 17,
      neutrons: 18,
    },
    occurrence: {
      description: "Trong muối ăn, các ion clorua và hợp chất hữu cơ.",
      simple: ["Cl2"],
      compounds: ["NaCl", "HCl"],
    },
    physical: "Khí vàng lục, mùi hắc.",
    chemical: "Chất oxi hóa mạnh, tạo nhiều muối clorua.",
    reactions: [
      {
        type: "Phản ứng với hidro",
        eq: "H2 + Cl2 → 2HCl",
        desc: "Dưới ánh sáng có thể xảy ra mạnh.",
      },
    ],
    structureType: "cscl",
    images: {},
    hasData: true,
  },
  {
    number: 19,
    symbol: "K",
    nameVi: "Potassium",
    nameEn: "Potassium",
    mass: 39.098,
    category: "kiem",
    general: {
      latinName: "Kalium",
      englishName: "Potassium",
      electronConfig: "[Ar] 4s1",
      group: 1,
      period: 4,
      oxidation: "+1",
      electronegativity: "0.82",
      shells: [2, 8, 8, 1],
    },
    history: {
      discoverer: "Humphry Davy",
      year: 1807,
      discoveryLocation: "Anh",
    },
    structure: {
      electrons: 19,
      protons: 19,
      neutrons: 20,
    },
    occurrence: {
      description: "Có trong silicat và muối khoáng.",
      simple: ["K"],
      compounds: ["KCl", "K2SO4"],
    },
    physical: "Kim loại rất mềm và hoạt động mạnh.",
    chemical: "Phản ứng mạnh với nước, cần bảo quản trong dầu.",
    reactions: [
      {
        type: "Với nước",
        eq: "2K + 2H2O → 2KOH + H2",
        desc: "Phản ứng rất mạnh.",
      },
    ],
    structureType: "bcc",
    images: {},
    hasData: true,
  },
  {
    number: 20,
    symbol: "Ca",
    nameVi: "Calcium",
    nameEn: "Calcium",
    mass: 40.078,
    category: "kiem-tho",
    general: {
      latinName: "Calcium",
      englishName: "Calcium",
      electronConfig: "[Ar] 4s2",
      group: 2,
      period: 4,
      oxidation: "+2",
      electronegativity: "1.00",
      shells: [2, 8, 8, 2],
    },
    history: {
      discoverer: "Humphry Davy",
      year: 1808,
      discoveryLocation: "Anh",
    },
    structure: {
      electrons: 20,
      protons: 20,
      neutrons: 20,
    },
    occurrence: {
      description: "Có trong đá vôi, thạch cao và xương.",
      simple: ["Ca"],
      compounds: ["CaCO3", "CaSO4"],
    },
    physical: "Kim loại bạc, tương đối mềm.",
    chemical: "Dễ tạo ion Ca2+ và hợp chất ion.",
    reactions: [
      {
        type: "Với nước",
        eq: "Ca + 2H2O → Ca(OH)2 + H2",
        desc: "Tạo bazơ ít tan.",
      },
    ],
    structureType: "fcc",
    images: {},
    hasData: true,
  },
  {
    number: 22,
    symbol: "Ti",
    nameVi: "Titanium",
    nameEn: "Titanium",
    mass: 47.867,
    structureType: "hcp",
    category: "chuyen-tiep",
    general: {
      shells: [],
      electronConfig: "Đang cập nhật",
      englishName: "Titanium",
      latinName: "Titanium",
    },
    history: {},
    structure: {},
    occurrence: {},
    physical: "Đang cập nhật dữ liệu.",
    chemical: "Đang cập nhật dữ liệu.",
    reactions: [],
    images: {},
    hasData: true,
  },
  {
    number: 26,
    symbol: "Fe",
    nameVi: "Iron",
    nameEn: "Iron",
    mass: 55.845,
    category: "chuyen-tiep",
    general: {
      latinName: "Ferrum",
      englishName: "Iron",
      electronConfig: "[Ar] 3d6 4s2",
      group: 8,
      period: 4,
      oxidation: "+2, +3",
      electronegativity: "1.83",
      shells: [2, 8, 14, 2],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Từ rất sớm",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 26,
      protons: 26,
      neutrons: 30,
    },
    occurrence: {
      description:
        "Có trong quặng hematit, magnetit và rất phổ biến trong lõi Trái Đất.",
      simple: ["Fe"],
      compounds: ["Fe2O3", "Fe3O4"],
    },
    physical: "Kim loại cứng, có từ tính.",
    chemical: "Bị oxi hóa trong không khí ẩm tạo gỉ sắt.",
    reactions: [
      {
        type: "Tạo oxit",
        eq: "4Fe + 3O2 → 2Fe2O3",
        desc: "Phản ứng oxi hóa chậm trong điều kiện thường.",
      },
    ],
    structureType: "bcc",
    images: {},
    hasData: true,
  },
  {
    number: 28,
    symbol: "Ni",
    nameVi: "Nickel",
    nameEn: "Nickel",
    mass: 58.693,
    category: "chuyen-tiep",
    general: {
      latinName: "Niccolum",
      englishName: "Nickel",
      electronConfig: "[Ar] 3d8 4s2",
      group: 10,
      period: 4,
      oxidation: "+2, +3",
      electronegativity: "1.91",
      shells: [2, 8, 16, 2],
    },
    history: {
      discoverer: "Axel Fredrik Cronstedt",
      year: 1751,
      discoveryLocation: "Thụy Điển",
    },
    structure: {
      electrons: 28,
      protons: 28,
      neutrons: 31,
    },
    occurrence: {
      description: "Có trong quặng pentlandit, laterit.",
      simple: ["Ni"],
      compounds: ["NiO", "NiSO4"],
    },
    physical: "Kim loại sáng, bền, chống ăn mòn tốt.",
    chemical: "Dùng nhiều trong hợp kim và mạ kim loại.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "2Ni + O2 → 2NiO",
        desc: "Tạo lớp oxit bền.",
      },
    ],
    structureType: "fcc",
    images: {},
    hasData: true,
  },
  {
    number: 29,
    symbol: "Cu",
    nameVi: "Copper",
    nameEn: "Copper",
    mass: 63.546,
    category: "chuyen-tiep",
    general: {
      latinName: "Cuprum",
      englishName: "Copper",
      electronConfig: "[Ar] 3d10 4s1",
      group: 11,
      period: 4,
      oxidation: "+1, +2",
      electronegativity: "1.90",
      shells: [2, 8, 18, 1],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Từ rất sớm",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 29,
      protons: 29,
      neutrons: 35,
    },
    occurrence: {
      description: "Có trong quặng chalcopyrit, malachit.",
      simple: ["Cu"],
      compounds: ["Cu2O", "CuSO4"],
    },
    physical: "Kim loại màu đỏ nâu, dẫn điện và dẫn nhiệt rất tốt.",
    chemical: "Khá bền trong không khí khô, tạo lớp oxit mỏng.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "2Cu + O2 → 2CuO",
        desc: "Tạo oxit màu đen.",
      },
    ],
    structureType: "fcc",
    images: {},
    hasData: true,
  },
  {
    number: 30,
    symbol: "Zn",
    nameVi: "Zinc",
    nameEn: "Zinc",
    mass: 65.38,
    category: "chuyen-tiep",
    general: {
      latinName: "Zincum",
      englishName: "Zinc",
      electronConfig: "[Ar] 3d10 4s2",
      group: 12,
      period: 4,
      oxidation: "+2",
      electronegativity: "1.65",
      shells: [2, 8, 18, 2],
    },
    history: {
      discoverer: "Andreas Marggraf",
      year: 1746,
      discoveryLocation: "Đức",
    },
    structure: {
      electrons: 30,
      protons: 30,
      neutrons: 35,
    },
    occurrence: {
      description: "Có trong quặng sphalerit.",
      simple: ["Zn"],
      compounds: ["ZnS", "ZnO"],
    },
    physical: "Kim loại màu trắng xanh.",
    chemical: "Tạo hợp chất kẽm khá phổ biến.",
    reactions: [
      {
        type: "Với axit",
        eq: "Zn + 2HCl → ZnCl2 + H2",
        desc: "Tạo khí hidro.",
      },
    ],
    structureType: "hcp",
    images: {},
    hasData: true,
  },
  {
    number: 33,
    symbol: "As",
    nameVi: "Arsenic",
    nameEn: "Arsenic",
    mass: 74.922,
    category: "phi-kim",
    general: {
      latinName: "Arsenicum",
      englishName: "Arsenic",
      electronConfig: "[Ar] 3d10 4s2 4p3",
      group: 15,
      period: 4,
      oxidation: "-3, +3, +5",
      electronegativity: "2.18",
      shells: [2, 8, 18, 5],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Cổ đại",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 33,
      protons: 33,
      neutrons: 42,
    },
    occurrence: {
      description: "Có trong các khoáng vật arsenopyrit.",
      simple: ["As"],
      compounds: ["As2S3", "As2O3"],
    },
    physical: "Á kim, dạng xám.",
    chemical: "Tạo hợp chất cộng hóa trị và ion.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "4As + 3O2 → 2As2O3",
        desc: "Tạo oxit arsenic(III).",
      },
    ],
    structureType: "gray",
    images: {},
    hasData: true,
  },
  {
    number: 34,
    symbol: "Se",
    nameVi: "Selenium",
    nameEn: "Selenium",
    mass: 78.971,
    structureType: "bcc",
    category: "phi-kim",
    general: {
      shells: [],
      electronConfig: "Đang cập nhật",
      englishName: "Selenium",
      latinName: "Selenium",
    },
    history: {},
    structure: {},
    occurrence: {},
    physical: "Đang cập nhật dữ liệu.",
    chemical: "Đang cập nhật dữ liệu.",
    reactions: [],
    images: {},
    hasData: true,
  },
  {
    number: 35,
    symbol: "Br",
    nameVi: "Bromine",
    nameEn: "Bromine",
    mass: 79.904,
    category: "halogen",
    general: {
      latinName: "Bromum",
      englishName: "Bromine",
      electronConfig: "[Ar] 3d10 4s2 4p5",
      group: 17,
      period: 4,
      oxidation: "-1, +1, +3, +5, +7",
      electronegativity: "2.96",
      shells: [2, 8, 18, 7],
    },
    history: {
      discoverer: "Antoine Jérôme Balard",
      year: 1826,
      discoveryLocation: "Pháp",
    },
    structure: {
      electrons: 35,
      protons: 35,
      neutrons: 45,
    },
    occurrence: {
      description: "Có trong nước biển và muối bromua.",
      simple: ["Br2"],
      compounds: ["NaBr", "HBr"],
    },
    physical: "Chất lỏng màu nâu đỏ.",
    chemical: "Halogen hoạt động mạnh.",
    reactions: [
      {
        type: "Với hidro",
        eq: "H2 + Br2 → 2HBr",
        desc: "Tạo hiđro bromua.",
      },
    ],
    structureType: "molecular",
    images: {},
    hasData: true,
  },
  {
    number: 44,
    symbol: "Ru",
    nameVi: "Ruthenium",
    nameEn: "Ruthenium",
    mass: 101.07,
    category: "chuyen-tiep",
    general: {
      latinName: "Ruthenium",
      englishName: "Ruthenium",
      electronConfig: "[Kr] 4d7 5s1",
      group: 8,
      period: 5,
      oxidation: "+2, +3, +4, +8",
      electronegativity: "2.20",
      shells: [2, 8, 18, 15, 1],
    },
    history: {
      discoverer: "Karl Ernst Claus",
      year: 1844,
      discoveryLocation: "Nga",
    },
    structure: {
      electrons: 44,
      protons: 44,
      neutrons: 57,
    },
    occurrence: {
      description: "Hiếm trong quặng platin.",
      simple: ["Ru"],
      compounds: ["RuO2"],
    },
    physical: "Kim loại bạch kim cứng.",
    chemical: "Tạo nhiều oxit và phức chất.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "Ru + O2 → RuO2",
        desc: "Tạo ruthenium dioxide.",
      },
    ],
    structureType: "rutile",
    images: {},
    hasData: true,
  },
  {
    number: 47,
    symbol: "Ag",
    nameVi: "Silver",
    nameEn: "Silver",
    mass: 107.868,
    category: "chuyen-tiep",
    general: {
      latinName: "Argentum",
      englishName: "Silver",
      electronConfig: "[Kr] 4d10 5s1",
      group: 11,
      period: 5,
      oxidation: "+1",
      electronegativity: "1.93",
      shells: [2, 8, 18, 18, 1],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Cổ đại",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 47,
      protons: 47,
      neutrons: 61,
    },
    occurrence: {
      description: "Có trong quặng bạc và hợp kim.",
      simple: ["Ag"],
      compounds: ["AgNO3", "Ag2S"],
    },
    physical: "Kim loại trắng sáng, dẫn điện rất tốt.",
    chemical: "Ít hoạt động hơn đồng.",
    reactions: [
      {
        type: "Với lưu huỳnh",
        eq: "2Ag + S → Ag2S",
        desc: "Tạo lớp xỉn màu trên bề mặt.",
      },
    ],
    structureType: "fcc",
    images: {},
    hasData: true,
  },
  {
    number: 48,
    symbol: "Cd",
    nameVi: "Cadmium",
    nameEn: "Cadmium",
    mass: 112.414,
    category: "chuyen-tiep",
    general: {
      latinName: "Cadmium",
      englishName: "Cadmium",
      electronConfig: "[Kr] 4d10 5s2",
      group: 12,
      period: 5,
      oxidation: "+2",
      electronegativity: "1.69",
      shells: [2, 8, 18, 18, 2],
    },
    history: {
      discoverer: "Friedrich Stromeyer",
      year: 1817,
      discoveryLocation: "Đức",
    },
    structure: {
      electrons: 48,
      protons: 48,
      neutrons: 64,
    },
    occurrence: {
      description: "Thường đi kèm quặng kẽm.",
      simple: ["Cd"],
      compounds: ["CdS", "CdO"],
    },
    physical: "Kim loại mềm, màu bạc.",
    chemical: "Tạo hợp chất Cd2+.",
    reactions: [
      {
        type: "Với lưu huỳnh",
        eq: "Cd + S → CdS",
        desc: "Tạo cadmium sulfide.",
      },
    ],
    structureType: "hcp",
    images: {},
    hasData: true,
  },
  {
    number: 55,
    symbol: "Cs",
    nameVi: "Cesium",
    nameEn: "Cesium",
    mass: 132.905,
    category: "kiem",
    general: {
      latinName: "Caesium",
      englishName: "Cesium",
      electronConfig: "[Xe] 6s1",
      group: 1,
      period: 6,
      oxidation: "+1",
      electronegativity: "0.79",
      shells: [2, 8, 18, 18, 8, 1],
    },
    history: {
      discoverer: "Robert Bunsen & Gustav Kirchhoff",
      year: 1860,
      discoveryLocation: "Đức",
    },
    structure: {
      electrons: 55,
      protons: 55,
      neutrons: 78,
    },
    occurrence: {
      description: "Có trong pollucit.",
      simple: ["Cs"],
      compounds: ["CsCl", "Cs2SO4"],
    },
    physical: "Kim loại rất mềm, dễ nóng chảy.",
    chemical: "Hoạt động rất mạnh.",
    reactions: [
      {
        type: "Với nước",
        eq: "2Cs + 2H2O → 2CsOH + H2",
        desc: "Phản ứng cực mạnh.",
      },
    ],
    structureType: "cscl",
    images: {},
    hasData: true,
  },
  {
    number: 56,
    symbol: "Ba",
    nameVi: "Barium",
    nameEn: "Barium",
    mass: 137.327,
    structureType: "bcc",
    category: "kiem-tho",
    general: {
      shells: [],
      electronConfig: "Đang cập nhật",
      englishName: "Barium",
      latinName: "Barium",
    },
    history: {},
    structure: {},
    occurrence: {},
    physical: "Đang cập nhật dữ liệu.",
    chemical: "Đang cập nhật dữ liệu.",
    reactions: [],
    images: {},
    hasData: true,
  },
  {
    number: 57,
    symbol: "La",
    nameVi: "Lanthanum",
    nameEn: "Lanthanum",
    mass: 138.905,
    category: "lanthanide",
    general: {
      latinName: "Lanthanum",
      englishName: "Lanthanum",
      electronConfig: "[Xe] 5d1 6s2",
      group: 3,
      period: 6,
      oxidation: "+3",
      electronegativity: "1.10",
      shells: [2, 8, 18, 18, 9, 2],
    },
    history: {
      discoverer: "Carl Gustaf Mosander",
      year: 1839,
      discoveryLocation: "Thụy Điển",
    },
    structure: {
      electrons: 57,
      protons: 57,
      neutrons: 82,
    },
    occurrence: {
      description: "Có trong quặng đất hiếm.",
      simple: ["La"],
      compounds: ["La2O3"],
    },
    physical: "Kim loại đất hiếm.",
    chemical: "Dễ bị oxi hóa.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "4La + 3O2 → 2La2O3",
        desc: "Tạo oxit lanthanum.",
      },
    ],
    structureType: "perovskite",
    images: {},
    hasData: true,
  },
  {
    number: 58,
    symbol: "Ce",
    nameVi: "Cerium",
    nameEn: "Cerium",
    mass: 140.116,
    category: "lanthanide",
    general: {
      latinName: "Cerium",
      englishName: "Cerium",
      electronConfig: "[Xe] 4f1 5d1 6s2",
      group: 3,
      period: 6,
      oxidation: "+3, +4",
      electronegativity: "1.12",
      shells: [2, 8, 18, 19, 9, 2],
    },
    history: {
      discoverer: "Jöns Jacob Berzelius & Wilhelm Hisinger",
      year: 1803,
      discoveryLocation: "Thụy Điển",
    },
    structure: {
      electrons: 58,
      protons: 58,
      neutrons: 82,
    },
    occurrence: {
      description: "Có trong monazit và bastnaesit.",
      simple: ["Ce"],
      compounds: ["CeO2"],
    },
    physical: "Lanthanide điển hình.",
    chemical: "Có thể tồn tại hoá trị +3 và +4.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "Ce + O2 → CeO2",
        desc: "Tạo cerium dioxide.",
      },
    ],
    structureType: "fluorite",
    images: {},
    hasData: true,
  },
  {
    number: 64,
    symbol: "Gd",
    nameVi: "Gadolinium",
    nameEn: "Gadolinium",
    mass: 157.25,
    category: "lanthanide",
    general: {
      latinName: "Gadolinium",
      englishName: "Gadolinium",
      electronConfig: "[Xe] 4f7 5d1 6s2",
      group: 3,
      period: 6,
      oxidation: "+3",
      electronegativity: "1.20",
      shells: [2, 8, 18, 25, 9, 2],
    },
    history: {
      discoverer: "Jean Charles Galissard de Marignac",
      year: 1880,
      discoveryLocation: "Thụy Sĩ",
    },
    structure: {
      electrons: 64,
      protons: 64,
      neutrons: 93,
    },
    occurrence: {
      description: "Có trong quặng đất hiếm.",
      simple: ["Gd"],
      compounds: ["Gd2O3"],
    },
    physical: "Thuộc họ đất hiếm.",
    chemical: "Tạo hợp chất oxit ổn định.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "4Gd + 3O2 → 2Gd2O3",
        desc: "Tạo gadolinium oxide.",
      },
    ],
    structureType: "perovskite",
    images: {},
    hasData: true,
  },
  {
    number: 79,
    symbol: "Au",
    nameVi: "Gold",
    nameEn: "Gold",
    mass: 196.967,
    category: "chuyen-tiep",
    general: {
      latinName: "Aurum",
      englishName: "Gold",
      electronConfig: "[Xe] 4f14 5d10 6s1",
      group: 11,
      period: 6,
      oxidation: "+1, +3",
      electronegativity: "2.54",
      shells: [2, 8, 18, 32, 18, 1],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Cổ đại",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 79,
      protons: 79,
      neutrons: 118,
    },
    occurrence: {
      description: "Thường ở dạng tự sinh trong tự nhiên.",
      simple: ["Au"],
      compounds: ["AuCl3"],
    },
    physical: "Kim loại vàng, rất bền, dẻo và dẫn điện tốt.",
    chemical: "Khá trơ, tan trong nước cường toan.",
    reactions: [
      {
        type: "Hòa tan",
        eq: "Au + 3Cl2 → AuCl6",
        desc: "Mô tả theo dạng phức clorua trong điều kiện thích hợp.",
      },
    ],
    structureType: "fcc",
    images: {},
    hasData: true,
  },
  {
    number: 82,
    symbol: "Pb",
    nameVi: "Lead",
    nameEn: "Lead",
    mass: 207.2,
    category: "unknown",
    general: {
      latinName: "Plumbum",
      englishName: "Lead",
      electronConfig: "[Xe] 4f14 5d10 6s2 6p2",
      group: 14,
      period: 6,
      oxidation: "+2, +4",
      electronegativity: "2.33",
      shells: [2, 8, 18, 32, 18, 4],
    },
    history: {
      discoverer: "Cổ đại",
      year: "Cổ đại",
      discoveryLocation: "Nhiều nơi",
    },
    structure: {
      electrons: 82,
      protons: 82,
      neutrons: 125,
    },
    occurrence: {
      description: "Trong galenit và nhiều khoáng vật chì.",
      simple: ["Pb"],
      compounds: ["PbS", "PbO"],
    },
    physical: "Kim loại nặng, mềm, màu xám.",
    chemical: "Có thể tạo oxit và muối chì(II), chì(IV).",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "2Pb + O2 → 2PbO",
        desc: "Tạo oxit chì(II).",
      },
    ],
    structureType: "fcc",
    images: {},
    hasData: true,
  },
  {
    number: 88,
    symbol: "Ra",
    nameVi: "Radium",
    nameEn: "Radium",
    mass: 226,
    category: "kiem-tho",
    general: {
      latinName: "Radium",
      englishName: "Radium",
      electronConfig: "[Rn] 7s2",
      group: 2,
      period: 7,
      oxidation: "+2",
      electronegativity: "0.90",
      shells: [2, 8, 18, 32, 18, 8, 2],
    },
    history: {
      discoverer: "Marie Curie & Pierre Curie",
      year: 1898,
      discoveryLocation: "Pháp",
    },
    structure: {
      electrons: 88,
      protons: 88,
      neutrons: 138,
    },
    occurrence: {
      description: "Nguyên tố phóng xạ tự nhiên.",
      simple: ["Ra"],
      compounds: ["RaSO4"],
    },
    physical: "Kim loại phóng xạ.",
    chemical: "Rất hoạt động.",
    reactions: [
      {
        type: "Với nước",
        eq: "Ra + 2H2O → Ra(OH)2 + H2",
        desc: "Phản ứng mạnh.",
      },
    ],
    structureType: "bcc",
    images: {},
    hasData: true,
  },
  {
    number: 91,
    symbol: "Pa",
    nameVi: "Protactinium",
    nameEn: "Protactinium",
    mass: 231.036,
    category: "actinide",
    general: {
      latinName: "Protactinium",
      englishName: "Protactinium",
      electronConfig: "[Rn] 5f2 6d1 7s2",
      group: 5,
      period: 7,
      oxidation: "+4, +5",
      electronegativity: "1.50",
      shells: [2, 8, 18, 32, 20, 9, 2],
    },
    history: {
      discoverer: "Lise Meitner, Otto Hahn",
      year: 1917,
      discoveryLocation: "Đức",
    },
    structure: {
      electrons: 91,
      protons: 91,
      neutrons: 140,
    },
    occurrence: {
      description: "Rất hiếm và phóng xạ.",
      simple: ["Pa"],
      compounds: ["Pa2O5"],
    },
    physical: "Kim loại phóng xạ hiếm.",
    chemical: "Tạo hợp chất actinide.",
    reactions: [
      {
        type: "Oxi hóa",
        eq: "4Pa + 5O2 → 2Pa2O5",
        desc: "Tạo oxit protactinium.",
      },
    ],
    structureType: "rutile",
    images: {},
    hasData: true,
  },
  {
    number: 92,
    symbol: "U",
    nameVi: "Uranium",
    nameEn: "Uranium",
    mass: 238.029,
    category: "actinide",
    structureType: "fluorite",
    general: {
      shells: [],
      electronConfig: "Đang cập nhật",
      englishName: "Uranium",
      latinName: "Uranium",
    },
    history: {},
    structure: {},
    occurrence: {},
    physical: "Đang cập nhật dữ liệu.",
    chemical: "Đang cập nhật dữ liệu.",
    reactions: [],
    images: {},
    hasData: true,
  },
  {
    number: 94,
    symbol: "Pu",
    nameVi: "Plutonium",
    nameEn: "Plutonium",
    mass: 244,
    category: "actinide",
    structureType: "antifluorite",
    general: {
      shells: [],
      electronConfig: "Đang cập nhật",
      englishName: "Plutonium",
      latinName: "Plutonium",
    },
    history: {},
    structure: {},
    occurrence: {},
    physical: "Đang cập nhật dữ liệu.",
    chemical: "Đang cập nhật dữ liệu.",
    reactions: [],
    images: {},
    hasData: true,
  },
  {
    number: 118,
    symbol: "Og",
    mass: 294,
    category: "khi-hiem",
    hasData: true,

    general: {
      latinName: "Oganesson",
      englishName: "Oganesson",
      electronConfig: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶",
      isotope: "²⁹⁴Og",
      group: 18,
      period: 7,
      block: "p",
      state: "Rắn (dự đoán)",
      oxidation: "0 (dự đoán)",
      electronegativity: "Không xác định",
      density: "Chưa xác định",
      meltingPoint: "Chưa xác định",
      boilingPoint: "Chưa xác định",
      crystalStructure: "Chưa xác định",
    },

    history: {
      discoverer: "Nhóm JINR–LLNL",
      discovererUrl:
        "https://iupac.org/iupac-announces-the-names-of-the-elements-113-115-117-and-118/",

      discoverers: [
        {
          name: "JINR (Dubna)",
          url: "https://www.jinr.ru/",
        },
        {
          name: "Lawrence Livermore National Laboratory",
          url: "https://www.llnl.gov/",
        },
        {
          name: "IUPAC",
          url: "https://iupac.org/",
        },
      ],

      year: 2002,
      discoveryLocation: "Dubna / Nga",
      description:
        "Oganesson được tổng hợp lần đầu vào năm 2002 trong các thí nghiệm va chạm hạt nhân siêu nặng. Năm 2016, IUPAC chính thức công nhận và đặt tên nguyên tố này là oganesson (Og), theo tên nhà vật lý hạt nhân Yuri Oganessian.",
    },

    structure: {
      protons: 118,
      neutrons: 176,
      electrons: 118,

      electronShells: [2, 8, 18, 32, 32, 18, 8],
      valenceElectrons: 8,

      lattice: "Chưa xác định",

      nucleus: {
        proton: 118,
        neutron: 176,
      },

      orbitalDistribution: {
        s: 2,
        p: 6,
        d: 10,
        f: 14,
      },
    },

    occurrence: {
      description:
        "Oganesson không tồn tại tự nhiên với lượng đáng kể trên Trái Đất. Đây là nguyên tố nhân tạo, chỉ được tạo ra trong các máy gia tốc hạt và tồn tại trong thời gian cực ngắn.",
      simple: ["Og"],
      compounds: [],
      ores: [],
    },

    naturalState: {
      image: "./assets/img/118_oganesson/trang-thai-tu-nhien.png",
      title: "Oganesson trong tự nhiên",
      description:
        "Oganesson không có nguồn gốc tự nhiên bền vững. Mọi nguyên tử đã biết đều là sản phẩm nhân tạo trong nghiên cứu hạt nhân.",
    },

    mediaBlocks: [
      {
        section: "history",
        type: "video",
        title: "Lịch sử phát hiện Oganesson",
        src: "https://www.youtube.com/watch?v=YbfeDnQbHLo",
        questions: [
          {
            time: "00:20",
            question: "Oganesson là nguyên tố số mấy?",
            options: ["116", "117", "118", "119"],
            correct: 2,
          },
          {
            time: "00:40",
            question: "Og thuộc nhóm nào trong bảng tuần hoàn?",
            options: ["Nhóm 17", "Nhóm 18", "Nhóm 1", "Nhóm 2"],
            correct: 1,
          },
        ],
      },
    ],

    physical: `
<ul class="list-disc ml-5 space-y-2">
  <li>Là nguyên tố siêu nặng, tổng hợp nhân tạo.</li>
  <li>Thuộc nhóm khí hiếm, nhưng tính chất thực nghiệm còn rất hạn chế.</li>
  <li>Trạng thái ở nhiệt độ phòng được dự đoán là <b>rắn</b>.</li>
  <li>Có số nguyên tử lớn nhất trong các nguyên tố đã biết.</li>
  <li>Thời gian sống của các đồng vị đã tạo ra là cực ngắn.</li>
  <li>Các tính chất vật lý chi tiết hiện vẫn chủ yếu là dự đoán lý thuyết.</li>
</ul>
`,

    chemical: `
<ul class="list-disc ml-5 space-y-2">
  <li>Oganesson là khí hiếm siêu nặng, nhưng có thể không “trơ” hoàn toàn như các khí hiếm nhẹ hơn.</li>
  <li>Các tính chất hóa học của nó chủ yếu mới dừng ở mức dự đoán.</li>
  <li>Có thể có độ phân cực lớn và hành vi khác thường do hiệu ứng tương đối tính.</li>
  <li>Chưa có nhiều hợp chất bền được xác nhận thực nghiệm.</li>
  <li>Phần lớn nghiên cứu hiện nay tập trung vào mô hình hóa lý thuyết và chuỗi phân rã hạt nhân.</li>
</ul>
`,

    preparation: `
<div class="space-y-3">

  <div>
    <h4 class="font-bold text-cyan-400">
      Tổng hợp trong máy gia tốc hạt
    </h4>

    <p>
      Oganesson được tạo ra bằng cách bắn phá hạt nhân rất nặng trong các thí nghiệm va chạm hạt nhân.
    </p>
  </div>

  <div>
    <h4 class="font-bold text-cyan-400">
      Quan sát chuỗi phân rã
    </h4>

    <p>
      Nguyên tử Og được nhận diện thông qua các hạt nhân con sinh ra từ chuỗi phân rã alpha.
    </p>
  </div>

</div>
`,

    reactions: [
      {
        type: "Tổng hợp oganesson-294",
        equation: "²⁴⁹Cf + ⁴⁸Ca → ²⁹⁴Og + 3n",
        related: "Cf",
        condition: "máy gia tốc hạt / thí nghiệm hạt nhân siêu nặng",
        desc: "Đây là con đường đã dùng để tạo ra các nguyên tử oganesson đầu tiên.",
      },

      {
        type: "Phân rã alpha",
        equation: "²⁹⁴Og → ²⁹⁰Lv + ⁴He",
        related: "Lv",
        condition: "tự phát",
        desc: "Oganesson không bền và phân rã rất nhanh qua chuỗi hạt nhân con.",
      },
    ],

    applications: [
      {
        title: "Nghiên cứu hạt nhân siêu nặng",
        desc: "Dùng để khảo sát giới hạn của bảng tuần hoàn và độ bền hạt nhân.",
      },

      {
        title: "Mô hình hóa lượng tử",
        desc: "Giúp kiểm tra các hiệu ứng tương đối tính trong nguyên tử cực nặng.",
      },

      {
        title: "Nghiên cứu chuỗi phân rã",
        desc: "Được dùng để nhận diện và truy vết các hạt nhân con trong vật lý hạt nhân.",
      },
    ],

    simulation: {
      title: "Tổng hợp Oganesson",

      reagents: [
        {
          id: "Cf",
          name: "Californium-249",
          icon: "fa-atom",
        },

        {
          id: "Ca",
          name: "Calcium-48",
          icon: "fa-circle-nodes",
        },
      ],

      expected: ["Cf", "Ca"],

      resultText:
        "Oganesson là nguyên tố siêu nặng được tổng hợp trong máy gia tốc hạt. Các nguyên tử đã tạo ra tồn tại rất ngắn và thường được nhận diện qua chuỗi phân rã alpha.",
    },

    notes: `
<ul class="list-disc ml-5 space-y-2">
  <li>Nguyên tố số 118 trong bảng tuần hoàn.</li>
  <li>Là nguyên tố cuối cùng của chu kỳ 7.</li>
  <li>Thuộc nhóm khí hiếm nhưng có tính chất dự đoán rất bất thường.</li>
  <li>Phần lớn dữ liệu hiện nay là từ mô hình lý thuyết và thí nghiệm hạt nhân siêu nặng.</li>
</ul>
`,
  },
];
