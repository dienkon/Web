// src/data/vietnameseNames.ts
// Từ điển danh pháp Hóa học: Tên IUPAC Tiếng Anh <-> Tên SGK Việt Nam <-> Tên thường gọi
// Hỗ trợ kiểm tra đáp án thông minh cho học sinh THCS - THPT Việt Nam

export interface CompoundAlias {
  formula: string;             // Công thức hóa học chuẩn (VD: NaCl, CuSO4)
  iupacEn: string[];           // Danh pháp tiếng Anh IUPAC chuẩn (VD: sodium chloride)
  sgkVn: string[];             // Danh pháp tiếng Việt theo SGK (VD: natri clorua, natri chloride)
  commonNames?: string[];      // Tên thường gọi trong đời sống (VD: muối ăn)
}

/**
 * Bảng ánh xạ hợp chất hóa học phổ biến trong chương trình GDPT 2018 và SGK cũ
 */
export const COMPOUND_DICTIONARY: CompoundAlias[] = [
  // Muối vô cơ thông dụng
  {
    formula: 'NaCl',
    iupacEn: ['sodium chloride'],
    sgkVn: ['natri clorua', 'natri chloride'],
    commonNames: ['muoi an', 'muối ăn'],
  },
  {
    formula: 'NaF',
    iupacEn: ['sodium fluoride'],
    sgkVn: ['natri florua', 'natri fluoride'],
  },
  {
    formula: 'NaBr',
    iupacEn: ['sodium bromide'],
    sgkVn: ['natri bromua', 'natri bromide'],
  },
  {
    formula: 'NaI',
    iupacEn: ['sodium iodide'],
    sgkVn: ['natri iotua', 'natri iodide'],
  },
  {
    formula: 'KCl',
    iupacEn: ['potassium chloride'],
    sgkVn: ['kali clorua', 'kali chloride'],
  },
  {
    formula: 'CaCl2',
    iupacEn: ['calcium chloride'],
    sgkVn: ['canxi clorua', 'calcium chloride'],
  },
  {
    formula: 'BaCl2',
    iupacEn: ['barium chloride'],
    sgkVn: ['bari clorua', 'barium chloride'],
  },
  {
    formula: 'MgCl2',
    iupacEn: ['magnesium chloride'],
    sgkVn: ['magie clorua', 'magnesium chloride'],
  },
  {
    formula: 'AlCl3',
    iupacEn: ['aluminium chloride', 'aluminum chloride'],
    sgkVn: ['nhom clorua', 'nhôm clorua', 'aluminium chloride'],
  },
  {
    formula: 'FeCl2',
    iupacEn: ['iron(II) chloride', 'iron (II) chloride', 'ferrous chloride'],
    sgkVn: ['sat(II) clorua', 'sắt(II) clorua', 'sat 2 clorua', 'sắt 2 clorua', 'iron(II) chloride'],
  },
  {
    formula: 'FeCl3',
    iupacEn: ['iron(III) chloride', 'iron (III) chloride', 'ferric chloride'],
    sgkVn: ['sat(III) clorua', 'sắt(III) clorua', 'sat 3 clorua', 'sắt 3 clorua', 'iron(III) chloride'],
  },
  {
    formula: 'CuCl2',
    iupacEn: ['copper(II) chloride', 'copper (II) chloride', 'cupric chloride'],
    sgkVn: ['dong(II) clorua', 'đồng(II) clorua', 'dong 2 clorua', 'đồng 2 clorua', 'copper(II) chloride'],
  },
  {
    formula: 'ZnCl2',
    iupacEn: ['zinc chloride'],
    sgkVn: ['kem clorua', 'kẽm clorua', 'zinc chloride'],
  },
  {
    formula: 'AgCl',
    iupacEn: ['silver chloride'],
    sgkVn: ['bac clorua', 'bạc clorua', 'silver chloride'],
  },

  // Muối sunfat
  {
    formula: 'Na2SO4',
    iupacEn: ['sodium sulfate', 'sodium sulphate'],
    sgkVn: ['natri sunfat', 'natri sulfate'],
  },
  {
    formula: 'K2SO4',
    iupacEn: ['potassium sulfate', 'potassium sulphate'],
    sgkVn: ['kali sunfat', 'potassium sulfate'],
  },
  {
    formula: 'MgSO4',
    iupacEn: ['magnesium sulfate', 'magnesium sulphate'],
    sgkVn: ['magie sunfat', 'magnesium sulfate'],
  },
  {
    formula: 'CaSO4',
    iupacEn: ['calcium sulfate', 'calcium sulphate'],
    sgkVn: ['canxi sunfat', 'calcium sulfate'],
    commonNames: ['thach cao', 'thạch cao'],
  },
  {
    formula: 'BaSO4',
    iupacEn: ['barium sulfate', 'barium sulphate'],
    sgkVn: ['bari sunfat', 'barium sulfate'],
  },
  {
    formula: 'CuSO4',
    iupacEn: ['copper(II) sulfate', 'copper (II) sulfate', 'cupric sulfate'],
    sgkVn: ['dong(II) sunfat', 'đồng(II) sunfat', 'dong 2 sunfat', 'đồng 2 sunfat', 'copper(II) sulfate'],
  },
  {
    formula: 'FeSO4',
    iupacEn: ['iron(II) sulfate', 'iron (II) sulfate', 'ferrous sulfate'],
    sgkVn: ['sat(II) sunfat', 'sắt(II) sunfat', 'sat 2 sunfat', 'sắt 2 sunfat', 'iron(II) sulfate'],
  },
  {
    formula: 'Fe2(SO4)3',
    iupacEn: ['iron(III) sulfate', 'iron (III) sulfate', 'ferric sulfate'],
    sgkVn: ['sat(III) sunfat', 'sắt(III) sunfat', 'sat 3 sunfat', 'sắt 3 sunfat', 'iron(III) sulfate'],
  },
  {
    formula: 'ZnSO4',
    iupacEn: ['zinc sulfate', 'zinc sulphate'],
    sgkVn: ['kem sunfat', 'kẽm sunfat', 'zinc sulfate'],
  },
  {
    formula: 'Al2(SO4)3',
    iupacEn: ['aluminium sulfate', 'aluminum sulfate'],
    sgkVn: ['nhom sunfat', 'nhôm sunfat', 'aluminium sulfate'],
  },

  // Muối nitrat
  {
    formula: 'NaNO3',
    iupacEn: ['sodium nitrate'],
    sgkVn: ['natri nitrat', 'sodium nitrate'],
    commonNames: ['diem tieu', 'diêm tiêu'],
  },
  {
    formula: 'KNO3',
    iupacEn: ['potassium nitrate'],
    sgkVn: ['kali nitrat', 'potassium nitrate'],
    commonNames: ['thuoc no den', 'diem tieu', 'diêm tiêu'],
  },
  {
    formula: 'AgNO3',
    iupacEn: ['silver nitrate'],
    sgkVn: ['bac nitrat', 'bạc nitrat', 'silver nitrate'],
  },
  {
    formula: 'Cu(NO3)2',
    iupacEn: ['copper(II) nitrate', 'copper (II) nitrate'],
    sgkVn: ['dong(II) nitrat', 'đồng(II) nitrat', 'copper(II) nitrate'],
  },
  {
    formula: 'Fe(NO3)3',
    iupacEn: ['iron(III) nitrate', 'iron (III) nitrate'],
    sgkVn: ['sat(III) nitrat', 'sắt(III) nitrat', 'iron(III) nitrate'],
  },
  {
    formula: 'Pb(NO3)2',
    iupacEn: ['lead(II) nitrate', 'lead (II) nitrate'],
    sgkVn: ['chi(II) nitrat', 'chì(II) nitrat', 'lead(II) nitrate'],
  },

  // Muối cacbonat & hidrocacbonat
  {
    formula: 'CaCO3',
    iupacEn: ['calcium carbonate'],
    sgkVn: ['canxi cacbonat', 'calcium carbonate'],
    commonNames: ['da voi', 'đá vôi', 'phan viet', 'phấn viết'],
  },
  {
    formula: 'Na2CO3',
    iupacEn: ['sodium carbonate'],
    sgkVn: ['natri cacbonat', 'sodium carbonate'],
    commonNames: ['soda', 'sô đa'],
  },
  {
    formula: 'NaHCO3',
    iupacEn: ['sodium hydrogen carbonate', 'sodium bicarbonate'],
    sgkVn: ['natri hidrocacbonat', 'natri hiđrocacbonat', 'sodium hydrogencarbonate'],
    commonNames: ['baking soda', 'bot no', 'bột nở', 'muoi no', 'muối nở'],
  },
  {
    formula: 'BaCO3',
    iupacEn: ['barium carbonate'],
    sgkVn: ['bari cacbonat', 'barium carbonate'],
  },
  {
    formula: 'MgCO3',
    iupacEn: ['magnesium carbonate'],
    sgkVn: ['magie cacbonat', 'magnesium carbonate'],
  },

  // Bazơ
  {
    formula: 'NaOH',
    iupacEn: ['sodium hydroxide'],
    sgkVn: ['natri hidroxit', 'natri hiđroxit', 'sodium hydroxide'],
    commonNames: ['xut', 'xút', 'sút', 'xut an da', 'xút ăn da'],
  },
  {
    formula: 'KOH',
    iupacEn: ['potassium hydroxide'],
    sgkVn: ['kali hidroxit', 'kali hiđroxit', 'potassium hydroxide'],
    commonNames: ['potash', 'xut an da'],
  },
  {
    formula: 'Ca(OH)2',
    iupacEn: ['calcium hydroxide'],
    sgkVn: ['canxi hidroxit', 'canxi hiđroxit', 'calcium hydroxide'],
    commonNames: ['voi toi', 'vôi tôi', 'nuoc voi trong', 'nước vôi trong'],
  },
  {
    formula: 'Ba(OH)2',
    iupacEn: ['barium hydroxide'],
    sgkVn: ['bari hidroxit', 'bari hiđroxit', 'barium hydroxide'],
  },
  {
    formula: 'Cu(OH)2',
    iupacEn: ['copper(II) hydroxide', 'copper (II) hydroxide'],
    sgkVn: ['dong(II) hidroxit', 'đồng(II) hiđroxit', 'copper(II) hydroxide'],
  },
  {
    formula: 'Fe(OH)2',
    iupacEn: ['iron(II) hydroxide', 'iron (II) hydroxide'],
    sgkVn: ['sat(II) hidroxit', 'sắt(II) hiđroxit', 'iron(II) hydroxide'],
  },
  {
    formula: 'Fe(OH)3',
    iupacEn: ['iron(III) hydroxide', 'iron (III) hydroxide'],
    sgkVn: ['sat(III) hidroxit', 'sắt(III) hiđroxit', 'iron(III) hydroxide'],
  },
  {
    formula: 'Al(OH)3',
    iupacEn: ['aluminium hydroxide', 'aluminum hydroxide'],
    sgkVn: ['nhom hidroxit', 'nhôm hiđroxit', 'aluminium hydroxide'],
  },

  // Axit
  {
    formula: 'HCl',
    iupacEn: ['hydrochloric acid', 'hydrogen chloride'],
    sgkVn: ['axit clohidric', 'axit clohiđric', 'hydrochloric acid'],
  },
  {
    formula: 'H2SO4',
    iupacEn: ['sulfuric acid', 'sulphuric acid'],
    sgkVn: ['axit sunfuric', 'sulfuric acid'],
  },
  {
    formula: 'HNO3',
    iupacEn: ['nitric acid'],
    sgkVn: ['axit nitric', 'nitric acid'],
  },
  {
    formula: 'H3PO4',
    iupacEn: ['phosphoric acid'],
    sgkVn: ['axit photphoric', 'phosphoric acid'],
  },
  {
    formula: 'H2S',
    iupacEn: ['hydrogen sulfide', 'hydrosulfuric acid'],
    sgkVn: ['hidro sunfua', 'hiđro sunfua', 'axit sunfuhidric'],
    commonNames: ['khi trung thoi', 'khí trứng thối'],
  },
  {
    formula: 'CH3COOH',
    iupacEn: ['ethanoic acid', 'acetic acid'],
    sgkVn: ['axit axetic', 'axit etanoic', 'acetic acid'],
    commonNames: ['giam an', 'giấm ăn'],
  },

  // Oxit
  {
    formula: 'CaO',
    iupacEn: ['calcium oxide'],
    sgkVn: ['canxi oxit', 'calcium oxide'],
    commonNames: ['voi song', 'vôi sống'],
  },
  {
    formula: 'MgO',
    iupacEn: ['magnesium oxide'],
    sgkVn: ['magie oxit', 'magnesium oxide'],
  },
  {
    formula: 'BaO',
    iupacEn: ['barium oxide'],
    sgkVn: ['bari oxit', 'barium oxide'],
  },
  {
    formula: 'Na2O',
    iupacEn: ['sodium oxide'],
    sgkVn: ['natri oxit', 'sodium oxide'],
  },
  {
    formula: 'K2O',
    iupacEn: ['potassium oxide'],
    sgkVn: ['kali oxit', 'potassium oxide'],
  },
  {
    formula: 'CuO',
    iupacEn: ['copper(II) oxide', 'copper (II) oxide', 'cupric oxide'],
    sgkVn: ['dong(II) oxit', 'đồng(II) oxit', 'dong 2 oxit', 'copper(II) oxide'],
  },
  {
    formula: 'Cu2O',
    iupacEn: ['copper(I) oxide', 'cuprous oxide'],
    sgkVn: ['dong(I) oxit', 'đồng(I) oxit', 'copper(I) oxide'],
  },
  {
    formula: 'FeO',
    iupacEn: ['iron(II) oxide', 'iron (II) oxide', 'ferrous oxide'],
    sgkVn: ['sat(II) oxit', 'sắt(II) oxit', 'sat 2 oxit', 'iron(II) oxide'],
  },
  {
    formula: 'Fe2O3',
    iupacEn: ['iron(III) oxide', 'iron (III) oxide', 'ferric oxide'],
    sgkVn: ['sat(III) oxit', 'sắt(III) oxit', 'sat 3 oxit', 'iron(III) oxide'],
    commonNames: ['ri sat', 'rỉ sắt'],
  },
  {
    formula: 'Fe3O4',
    iupacEn: ['iron(II,III) oxide', 'triiron tetraoxide', 'magnetite'],
    sgkVn: ['oxit sat tu', 'oxit sắt từ', 'iron(II,III) oxide'],
    commonNames: ['quang manhetit', 'quặng manhetit'],
  },
  {
    formula: 'Al2O3',
    iupacEn: ['aluminium oxide', 'aluminum oxide'],
    sgkVn: ['nhom oxit', 'nhôm oxit', 'aluminium oxide'],
    commonNames: ['quang boxit', 'quặng boxit'],
  },
  {
    formula: 'ZnO',
    iupacEn: ['zinc oxide'],
    sgkVn: ['kem oxit', 'kẽm oxit', 'zinc oxide'],
  },
  {
    formula: 'CO2',
    iupacEn: ['carbon dioxide'],
    sgkVn: ['cacbon dioxit', 'cacbon điôxít', 'carbon dioxide'],
    commonNames: ['khi cacbonic', 'khí cacbonic', 'bang kho', 'băng khô'],
  },
  {
    formula: 'CO',
    iupacEn: ['carbon monoxide'],
    sgkVn: ['cacbon monoxit', 'carbon monoxide'],
  },
  {
    formula: 'SO2',
    iupacEn: ['sulfur dioxide', 'sulphur dioxide'],
    sgkVn: ['luu huynh dioxit', 'lưu huỳnh đioxit', 'sulfur dioxide'],
    commonNames: ['khi sunfuro', 'khí sunfurơ'],
  },
  {
    formula: 'SO3',
    iupacEn: ['sulfur trioxide', 'sulphur trioxide'],
    sgkVn: ['luu huynh trioxit', 'lưu huỳnh trioxit', 'sulfur trioxide'],
  },
  {
    formula: 'P2O5',
    iupacEn: ['phosphorus pentoxide', 'diphosphorus pentoxide'],
    sgkVn: ['diphotpho pentaoxit', 'điphotpho pentaoxit', 'diphosphorus pentoxide'],
  },
  {
    formula: 'NO',
    iupacEn: ['nitrogen monoxide', 'nitric oxide'],
    sgkVn: ['nito monoxit', 'nitơ monoxit', 'nitrogen monoxide'],
  },
  {
    formula: 'NO2',
    iupacEn: ['nitrogen dioxide'],
    sgkVn: ['nito dioxit', 'nitơ đioxit', 'nitrogen dioxide'],
  },

  // Hữu cơ cơ bản
  {
    formula: 'CH4',
    iupacEn: ['methane'],
    sgkVn: ['metan', 'methane'],
    commonNames: ['khi bun ao', 'khí bùn ao'],
  },
  {
    formula: 'C2H4',
    iupacEn: ['ethene', 'ethylene'],
    sgkVn: ['etilen', 'etylen', 'ethene'],
  },
  {
    formula: 'C2H2',
    iupacEn: ['ethyne', 'acetylene'],
    sgkVn: ['axetilen', 'ethyne'],
  },
  {
    formula: 'C2H5OH',
    iupacEn: ['ethanol', 'ethyl alcohol'],
    sgkVn: ['ancol etylic', 'ancol etilic', 'ruou etylic', 'rượu etylic', 'ethanol'],
    commonNames: ['con', 'cồn'],
  },
  {
    formula: 'C6H12O6',
    iupacEn: ['glucose'],
    sgkVn: ['glucozo', 'glucozơ', 'glucose'],
    commonNames: ['duong nho', 'đường nho'],
  },
  {
    formula: 'C12H22O11',
    iupacEn: ['sucrose', 'saccharose'],
    sgkVn: ['saccarozo', 'saccarozơ', 'sucrose'],
    commonNames: ['duong mia', 'đường mía', 'duong cat', 'đường cát'],
  },
];

/**
 * Chuyển đổi các ký hiệu chỉ số dưới Unicode về chữ số tiêu chuẩn
 */
export function normalizeSubscripts(text: string): string {
  if (!text) return '';
  const subscripts: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    '⁺': '+', '⁻': '-'
  };
  return text.replace(/[₀₁₂₃₄₅₆₇₈₉⁺⁻]/g, char => subscripts[char] || char);
}

/**
 * So khớp hai danh pháp xem có cùng chỉ một chất hay không
 */
export function isChemicalNameMatch(nameA: string, nameB: string): boolean {
  return isAnswerAcceptable(nameB, [nameA]) || isAnswerAcceptable(nameA, [nameB]);
}

/**
 * Chuẩn hóa chuỗi văn bản:
 * - Chuyển chữ thường
 * - Đổi ký tự chỉ số dưới unicode (H₂O -> H2O)
 * - Bỏ khoảng trắng thừa, dấu gạch nối, dấu ngoặc thừa
 * - Bỏ dấu tiếng Việt khi cần so khớp mềm
 */
export function normalizeChemicalText(text: string): string {
  if (!text) return '';
  let s = text.trim().toLowerCase();

  // Chuyển ký tự chỉ số dưới thành số thường
  s = normalizeSubscripts(s);

  // Chuẩn hóa khoảng trắng và dấu gạch nối
  s = s.replace(/[\-_]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Bỏ dấu tiếng Việt (không dấu) để so khớp linh hoạt
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Kiểm tra xem câu trả lời của người dùng có được chấp nhận hay không.
 * Tự động kiểm tra:
 * 1. Khớp chính xác với acceptedAnswers
 * 2. Khớp sau khi chuẩn hóa chỉ số dưới và khoảng trắng
 * 3. Khớp với tên tiếng Việt SGK hoặc tên thường gọi thông qua từ điển hóa học
 * 4. Khớp với công thức hóa học tương ứng
 */
export function isAnswerAcceptable(
  userAnswer: string,
  acceptedAnswers: string[],
  formulaContext?: string
): boolean {
  if (!userAnswer || !acceptedAnswers || acceptedAnswers.length === 0) return false;

  const rawClean = userAnswer.trim().toLowerCase();
  const normUser = normalizeChemicalText(userAnswer);
  const unaccentUser = removeVietnameseAccents(normUser);

  // 1. Kiểm tra trực tiếp với danh sách acceptedAnswers
  for (const acc of acceptedAnswers) {
    const normAcc = normalizeChemicalText(acc);
    if (rawClean === acc.toLowerCase()) return true;
    if (normUser === normAcc) return true;
    if (unaccentUser === removeVietnameseAccents(normAcc)) return true;
  }

  // 2. Tra cứu qua Từ điển danh pháp đối chiếu (IUPAC <-> SGK tiếng Việt <-> Tên thường gọi)
  for (const item of COMPOUND_DICTIONARY) {
    const allMatches = [
      item.formula.toLowerCase(),
      ...item.iupacEn.map(n => n.toLowerCase()),
      ...item.sgkVn.map(n => n.toLowerCase()),
      ...(item.commonNames || []).map(n => n.toLowerCase()),
    ];

    // Xác định xem câu hỏi hiện tại có thuộc về hợp chất này không
    const isThisCompound =
      (formulaContext && formulaContext.toLowerCase() === item.formula.toLowerCase()) ||
      acceptedAnswers.some(acc => allMatches.includes(acc.toLowerCase()) || allMatches.includes(normalizeChemicalText(acc)));

    if (isThisCompound) {
      for (const alias of allMatches) {
        if (normUser === normalizeChemicalText(alias)) return true;
        if (unaccentUser === removeVietnameseAccents(normalizeChemicalText(alias))) return true;
      }
    }
  }

  return false;
}
