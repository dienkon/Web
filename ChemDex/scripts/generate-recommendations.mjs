import fs from 'fs';
import path from 'path';

const catalog = JSON.parse(fs.readFileSync('shared/reaction-catalog.generated.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('trung-tam/src/data/index.json', 'utf8'));
const ref = JSON.parse(fs.readFileSync('trung-tam/src/data/reference-index.generated.json', 'utf8'));
const allDocs = [...idx.filter(d => d.id.startsWith('chat-')), ...ref, ...idx.filter(d => !d.id.startsWith('chat-'))];

function normFormula(f) {
  if (!f) return '';
  return f.replace(/[\u2080-\u2089]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x2080 + 48))
          .replace(/[₀-₉]/g, c => ({ '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' }[c]))
          .replace(/\s+/g, '');
}

// Load all element data from data/elements
const elementsBySymbol = new Map();
const elementsByNumber = new Map();
const elemFiles = fs.readdirSync('data/elements').filter(f => f.endsWith('.json'));
elemFiles.forEach(f => {
  const el = JSON.parse(fs.readFileSync(path.join('data/elements', f), 'utf8'));
  elementsBySymbol.set(el.symbol, el);
  elementsByNumber.set(el.number, el);
});

// Map docs by normalized formula, symbol, alias, and id
const docById = new Map();
const docsByFormula = new Map();
const docBySymbol = new Map();

allDocs.forEach(d => {
  docById.set(d.id, d);
  if (d.chemicalFormula) {
    const k = normFormula(d.chemicalFormula).toLowerCase();
    if (!docsByFormula.has(k)) docsByFormula.set(k, []);
    docsByFormula.get(k).push(d);
  }
  // Check if id is like 001_H
  const m = d.id.match(/^\d{3}_([A-Za-z]+)$/);
  if (m) {
    docBySymbol.set(m[1], d);
    const k = m[1].toLowerCase();
    if (!docsByFormula.has(k)) docsByFormula.set(k, []);
    docsByFormula.get(k).push(d);
  }
  if (d.category === 'nguyento' && d.chemicalFormula) {
    docBySymbol.set(d.chemicalFormula, d);
  }
  if (d.aliases) {
    d.aliases.forEach(a => {
      if (/^[A-Za-z0-9()]+$/.test(a)) {
        const k = normFormula(a).toLowerCase();
        if (!docsByFormula.has(k)) docsByFormula.set(k, []);
        docsByFormula.get(k).push(d);
      }
    });
  }
});

// Clean and exact periodic group labels
const groupLabels = {
  1: { name: 'Cùng nhóm Kim loại kiềm', color: 'rose' },
  2: { name: 'Cùng nhóm Kim loại kiềm thổ', color: 'amber' },
  11: { name: 'Cùng nhóm Kim loại đúc tiền (Cu - Ag - Au)', color: 'amber' },
  13: { name: 'Cùng nhóm Bo - Nhôm', color: 'sky' },
  14: { name: 'Cùng nhóm Carbon - Silic', color: 'emerald' },
  15: { name: 'Cùng nhóm Pnictogen (N - P)', color: 'blue' },
  16: { name: 'Cùng nhóm Chalcogen (O - S)', color: 'purple' },
  17: { name: 'Cùng nhóm Halogen', color: 'emerald' },
  18: { name: 'Cùng nhóm Khí hiếm', color: 'sky' }
};

// Known pioneer groups
const pioneerHighlights = [
  { name: 'Humphry Davy', symbols: ['Na', 'K', 'Ca', 'Ba', 'Mg', 'B'], color: 'amber' },
  { name: 'Carl Wilhelm Scheele', symbols: ['Cl', 'Mo', 'Ba', 'O'], color: 'emerald' },
  { name: 'William Ramsay', symbols: ['He', 'Ne', 'Ar', 'Kr', 'Xe'], color: 'sky' },
  { name: 'Marie Curie & Pierre Curie', symbols: ['Po', 'Ra'], color: 'purple' },
  { name: 'Henry Cavendish', symbols: ['H'], specialDocs: ['chat-nuoc'], color: 'blue' },
  { name: 'Antoine Lavoisier', symbols: ['O', 'H', 'C'], specialDocs: ['chat-nuoc', 'chat-carbon-dioxide'], color: 'rose' },
  { name: 'Robert Bunsen & Gustav Kirchhoff', symbols: ['Rb', 'Cs'], color: 'purple' }
];

// Chemical families
function classifyFamily(formula, title) {
  const norm = normFormula(formula);
  if (/^(HCl|H2SO4|HNO3|H3PO4|HBr|HI|HClO4|H2CO3|H2SO3)$/i.test(norm) || /axit|acid/i.test(title)) {
    if (/COOH|C2H4O2|CH2O2|C3H6O2|C4H8O2|oxalic|axetic|fomic/i.test(norm + ' ' + title)) {
      return { family: 'carboxylic_acid', label: 'Cùng họ Axit', color: 'rose' };
    }
    return { family: 'inorganic_acid', label: 'Cùng họ Axit', color: 'rose' };
  }
  if (/^(NaOH|KOH|Ca\(OH\)2|Ba\(OH\)2|Mg\(OH\)2|Al\(OH\)3|Fe\(OH\)2|Fe\(OH\)3|Cu\(OH\)2|Zn\(OH\)2)$/i.test(norm) || /hidroxit|hydroxide/i.test(title)) {
    return { family: 'base', label: 'Cùng họ Bazơ', color: 'sky' };
  }
  if (/SO4$/i.test(norm) || /sunfat|sulfate/i.test(title)) {
    return { family: 'sulfate', label: 'Cùng họ Muối Sunfat', color: 'blue' };
  }
  if (/NO3$/i.test(norm) || /nitrat|nitrate/i.test(title)) {
    return { family: 'nitrate', label: 'Cùng họ Muối Nitrat', color: 'amber' };
  }
  if (/CO3$|HCO3$/i.test(norm) || /cacbonat|carbonate/i.test(title)) {
    return { family: 'carbonate', label: 'Cùng họ Muối Cacbonat', color: 'emerald' };
  }
  if (/Cl$|Cl2$|Cl3$/i.test(norm) || /clorua|chloride/i.test(title)) {
    return { family: 'chloride', label: 'Cùng họ Muối Clorua', color: 'emerald' };
  }
  if (/OH$/i.test(norm) || /ancol|alcohol|etanol|metanol/i.test(title)) {
    return { family: 'alcohol', label: 'Cùng họ Alcohol', color: 'purple' };
  }
  if (/COO|axetat|fomat/i.test(norm + ' ' + title)) {
    return { family: 'ester_salt', label: 'Cùng họ Este', color: 'rose' };
  }
  return null;
}

// Reaction connections from reaction-catalog
const reactionGraph = new Map();

catalog.entries.forEach(entry => {
  const rFormulas = entry.reactants.map(r => normFormula(r.formula));
  const pFormulas = entry.products.map(p => normFormula(p.formula));

  // Connect reactants to products
  rFormulas.forEach(rf => {
    if (!reactionGraph.has(rf.toLowerCase())) reactionGraph.set(rf.toLowerCase(), []);
    pFormulas.forEach(pf => {
      reactionGraph.get(rf.toLowerCase()).push({
        targetFormula: pf,
        relationLabel: 'Sản phẩm chuyển hóa',
        relationType: 'reaction',
        badgeColor: 'sky',
        description: `Tạo thành trong phản ứng: ${entry.equation}`
      });
    });
    // Connect co-reactants
    rFormulas.filter(other => other !== rf).forEach(other => {
      reactionGraph.get(rf.toLowerCase()).push({
        targetFormula: other,
        relationLabel: 'Chất tham gia phản ứng',
        relationType: 'reaction',
        badgeColor: 'amber',
        description: `Cùng là chất phản ứng trong: ${entry.equation}`
      });
    });
  });

  // Connect products to reactants
  pFormulas.forEach(pf => {
    if (!reactionGraph.has(pf.toLowerCase())) reactionGraph.set(pf.toLowerCase(), []);
    rFormulas.forEach(rf => {
      reactionGraph.get(pf.toLowerCase()).push({
        targetFormula: rf,
        relationLabel: 'Tiền chất điều chế',
        relationType: 'reaction',
        badgeColor: 'emerald',
        description: `Điều chế từ phản ứng: ${entry.equation}`
      });
    });
  });
});

// Build recommendations for every document
const recommendations = {};

allDocs.forEach(doc => {
  const recs = [];
  const addedDocIds = new Set([doc.id]);

  function tryAddDoc(targetDoc, relationLabel, relationType, badgeColor, description) {
    if (!targetDoc || addedDocIds.has(targetDoc.id)) return false;
    addedDocIds.add(targetDoc.id);
    recs.push({
      id: targetDoc.id,
      label: relationLabel,
      type: relationType,
      color: badgeColor,
      desc: description
    });
    return true;
  }

  // Handle special articles first
  if (doc.id === '011_HistoryPT') {
    tryAddDoc(docById.get('006_C'), 'Nguyên tố đặt nền móng', 'historical', 'emerald', 'Carbon là cột mốc chuẩn xác để định nghĩa đơn vị khối lượng nguyên tử (amu).');
    tryAddDoc(docById.get('007_Na'), 'Dãy kim loại kiềm Mendeleev', 'historical', 'amber', 'Kim loại kiềm đóng vai trò kinh điển chứng minh tính tuần hoàn trong bảng của Mendeleev.');
    tryAddDoc(docById.get('001_H'), 'Nguyên tố khởi nguyên', 'historical', 'sky', 'Nguyên tố đầu tiên mở đầu bảng tuần hoàn với cấu hình electron 1s¹.');
    tryAddDoc(docById.get('008_Fe'), 'Kim loại chuyển tiếp trụ cột', 'historical', 'purple', 'Nguyên tố nhóm VIIIB tiêu biểu cho tính chất từ tính và trạng thái oxy hóa biến thiên.');
    recommendations[doc.id] = recs;
    return;
  }

  if (doc.id === '012_SafetyRules') {
    tryAddDoc(docById.get('clo-cl'), 'Khí độc gây bỏng niêm mạc', 'family', 'emerald', 'Khí clo vàng lục từng gây ra các tai nạn phòng lab lịch sử của Carl Scheele.');
    tryAddDoc(docById.get('axit-sulfuric-h2o4s'), 'Quy tắc pha loãng acid', 'family', 'rose', 'Luôn rót từ từ acid đặc vào nước, không làm ngược lại để tránh nổ sôi axit.');
    tryAddDoc(docById.get('chat-amoniac'), 'Khí độc có mùi khai hắc', 'family', 'sky', 'Amoniac bay hơi kích ứng mạnh, bắt buộc phải thao tác dưới tủ hút khí độc.');
    tryAddDoc(docById.get('chat-natri-clorua'), 'Dung dịch rửa mắt & sơ cứu', 'family', 'emerald', 'Dung dịch nước muối 0.9% là phương tiện sơ cứu rửa trôi khẩn cấp trong phòng thí nghiệm.');
    recommendations[doc.id] = recs;
    return;
  }

  if (doc.id === '013_HTML_Sample') {
    tryAddDoc(docById.get('chat-nuoc'), 'Mô hình 3D góc gấp kinh điển', 'family', 'sky', 'Góc liên kết 104.5° của H2O là ví dụ hoàn hảo về hiệu ứng đẩy của cặp electron tự do.');
    tryAddDoc(docById.get('chat-metan'), 'Hình học tứ diện đều sp³', 'family', 'emerald', 'Methane CH4 là hình mẫu lý tưởng minh họa cho sự lai hóa tứ diện với góc 109.5°.');
    tryAddDoc(docById.get('chat-etanol'), 'Cấu trúc lập thể hữu cơ', 'family', 'purple', 'Ethanol thể hiện chuyển động quay quanh trục liên kết đơn C-C trong không gian 3 chiều.');
    tryAddDoc(docById.get('chat-amoniac'), 'Hình chóp tam giác sp³', 'family', 'blue', 'NH3 có cấu trúc tháp tam giác đặc trưng do một obitan chứa cặp electron không chia.');
    recommendations[doc.id] = recs;
    return;
  }

  // Determine element or formula
  let symbol = null;
  const m = doc.id.match(/^\d{3}_([A-Za-z]+)$/);
  if (m) symbol = m[1];
  else if (doc.category === 'nguyento' && doc.chemicalFormula && /^[A-Za-z]{1,2}$/.test(doc.chemicalFormula)) {
    symbol = doc.chemicalFormula;
  }

  const formula = doc.chemicalFormula || (symbol ? symbol : '');
  const normForm = normFormula(formula);

  // 1. Element periodic group match
  if (symbol && elementsBySymbol.has(symbol)) {
    const el = elementsBySymbol.get(symbol);
    const grp = el.general?.group;
    if (grp) {
      const grpInfo = groupLabels[grp] || { name: `Cùng nhóm ${grp}`, color: 'sky' };
      // Find other elements in the same group
      for (const [s, otherEl] of elementsBySymbol.entries()) {
        if (s !== symbol && otherEl.general?.group === grp) {
          const targetDoc = docBySymbol.get(s) || (docsByFormula.get(s.toLowerCase()) || [])[0];
          if (targetDoc) {
            tryAddDoc(
              targetDoc,
              grpInfo.name,
              'group',
              grpInfo.color,
              `Cùng thuộc ${grpInfo.name.toLowerCase()} với cấu hình electron hóa trị và tính chất tương đồng.`
            );
            if (recs.length >= 2) break;
          }
        }
      }
    }

    // 2. Element pioneer match
    const discoverer = el.history?.discoverer;
    if (discoverer) {
      for (const pioneer of pioneerHighlights) {
        if (discoverer.includes(pioneer.name) || pioneer.symbols.includes(symbol)) {
          // Find other elements/substances by this pioneer
          for (const otherSym of pioneer.symbols) {
            if (otherSym !== symbol) {
              const targetDoc = docBySymbol.get(otherSym) || (docsByFormula.get(otherSym.toLowerCase()) || [])[0];
              if (targetDoc) {
                tryAddDoc(
                  targetDoc,
                  `Cùng người khám phá: ${pioneer.name}`,
                  'pioneer',
                  pioneer.color,
                  `Đều ghi dấu ấn lịch sử khám phá và cô lập thực nghiệm bởi ${pioneer.name}.`
                );
                if (recs.length >= 3) break;
              }
            }
          }
          if (pioneer.specialDocs) {
            for (const sDocId of pioneer.specialDocs) {
              const targetDoc = docById.get(sDocId);
              if (targetDoc) {
                tryAddDoc(
                  targetDoc,
                  `Cùng người khám phá: ${pioneer.name}`,
                  'pioneer',
                  pioneer.color,
                  `Gắn liền với công trình đột phá của ${pioneer.name} trong biên niên sử hóa học.`
                );
              }
            }
          }
          break;
        }
      }
    }
  }

  // 3. Reaction links from reaction catalog
  const rxLinks = reactionGraph.get(normForm.toLowerCase()) || [];
  const seenTypes = new Set();
  for (const link of rxLinks) {
    if (seenTypes.has(link.targetFormula.toLowerCase())) continue;
    seenTypes.add(link.targetFormula.toLowerCase());
    const candidates = docsByFormula.get(normFormula(link.targetFormula).toLowerCase()) || [];
    for (const targetDoc of candidates) {
      if (tryAddDoc(targetDoc, link.relationLabel, link.relationType, link.badgeColor, link.description)) {
        break;
      }
    }
    if (recs.length >= 4) break;
  }

  // 4. Chemical family / Functional group match
  const fam = classifyFamily(formula, doc.title);
  if (fam && recs.length < 4) {
    for (const otherDoc of allDocs) {
      if (otherDoc.id === doc.id) continue;
      const otherFam = classifyFamily(otherDoc.chemicalFormula || '', otherDoc.title);
      if (otherFam && otherFam.family === fam.family) {
        tryAddDoc(
          otherDoc,
          fam.label,
          'family',
          fam.color,
          `Thuộc ${fam.label.toLowerCase()} với cơ chế liên kết và nhóm chức tương đồng.`
        );
        if (recs.length >= 4) break;
      }
    }
  }

  // 5. Fallback if still under 3 recommendations
  if (recs.length < 3) {
    const fallbacks = ['chat-nuoc', 'chat-natri-clorua', 'axit-sulfuric-h2o4s', 'chat-amoniac', 'chat-etanol'];
    for (const fbId of fallbacks) {
      if (fbId !== doc.id) {
        const targetDoc = docById.get(fbId);
        if (targetDoc) {
          tryAddDoc(
            targetDoc,
            'Hợp chất quan trọng liên quan',
            'family',
            'sky',
            'Chất hóa học nền tảng thường xuyên xuất hiện trong các phản ứng và quy trình thực nghiệm.'
          );
          if (recs.length >= 3) break;
        }
      }
    }
  }

  recommendations[doc.id] = recs.slice(0, 4);
});

// Save to trung-tam/src/data/recommendations.generated.json
const outputPath = 'trung-tam/src/data/recommendations.generated.json';
fs.writeFileSync(outputPath, JSON.stringify(recommendations), 'utf8');

console.log('Successfully re-generated recommendations for', Object.keys(recommendations).length, 'documents!');
