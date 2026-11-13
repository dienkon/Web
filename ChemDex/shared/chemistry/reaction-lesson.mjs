import {parseFormula} from './formula.mjs';
import {resolveLabExperiment} from './study-links.mjs';

// Charged species and atom/charge conservation are required before calling a
// reduced transformation an ionic equation. Neutral molecules alone do not
// become ions because they happen to be stored in an `ionic` database field.
export function netIonicEquation(reaction) {
  const ionic = reaction.ionic;
  if (!ionic?.reactants?.length || !ionic?.products?.length) return null;
  const sides = [ionic.reactants, ionic.products];
  if (!sides.flat().some(row => Number.isInteger(row.charge) && row.charge !== 0)) return null;
  try {
    const totals = sides.map(side => side.reduce((result, row) => {
      if (!Number.isInteger(row.charge) || !Number.isFinite(row.coefficient) || row.coefficient <= 0) throw Error('Invalid ion');
      for (const [symbol, count] of Object.entries(parseFormula(row.formula))) result.atoms[symbol] = (result.atoms[symbol] ?? 0) + row.coefficient * count;
      result.charge += row.coefficient * row.charge;
      return result;
    }, {atoms: {}, charge: 0}));
    if (Math.abs(totals[0].charge - totals[1].charge) > 1e-8 || Object.keys({...totals[0].atoms, ...totals[1].atoms}).some(symbol => Math.abs((totals[0].atoms[symbol] ?? 0) - (totals[1].atoms[symbol] ?? 0)) > 1e-8)) return null;
    const reduced = sides.map(side => side.map(row => ({...row})));
    for (const a of reduced[0]) for (const b of reduced[1]) if (a.formula === b.formula && a.charge === b.charge && a.phase === b.phase) {
      const amount = Math.min(a.coefficient, b.coefficient); a.coefficient -= amount; b.coefficient -= amount;
    }
    const remaining = reduced.map(side => side.filter(row => row.coefficient > 1e-8));
    if (remaining.some(side => !side.length) || !remaining.flat().some(row => row.charge !== 0)) return null;
    const term = row => `${row.coefficient === 1 ? '' : row.coefficient}${row.formula}${row.charge ? '^' + (Math.abs(row.charge) === 1 ? '' : Math.abs(row.charge)) + (row.charge > 0 ? '+' : '-') : ''}${row.phase ? '(' + row.phase + ')' : ''}`;
    return remaining.map(side => side.map(term).join(' + ')).join(reaction.reversible ? ' ⇌ ' : ' → ');
  } catch { return null; }
}

export function reactionLesson(reaction, {heading, sources = {}} = {}) {
  const parts = [`### ${heading ?? reaction.topic_vi ?? 'Phản ứng liên quan'}`, `\`\`\`text\n${reaction.equation}\n\`\`\``];
  const condition = reaction.conditions?.description_vi ?? reaction.conditions_vi;
  parts.push(`**Điều kiện:** ${condition || 'Hồ sơ chưa nêu đủ điều kiện để dùng như một quy trình thực nghiệm.'}`);
  if (reaction.observation_vi) parts.push(`**Quan sát theo hồ sơ:** ${reaction.observation_vi}`);
  if (reaction.explanation_vi) parts.push(reaction.explanation_vi);
  const ionic = netIonicEquation(reaction);
  if (ionic) parts.push(`**Phương trình ion rút gọn:** \`${ionic}\``);
  if (reaction.reversible) parts.push('Mũi tên ⇌ chỉ quá trình thuận nghịch; cân bằng phương trình không có nghĩa chất phản ứng chuyển hóa hoàn toàn.');
  if (reaction.caveats?.length) parts.push(`**Phạm vi áp dụng:** ${reaction.caveats.join(' ')}`);
  if (reaction.effects?.calibrated === true && Number.isFinite(reaction.effects.deltaH_kJ_per_mol)) parts.push(`ΔH ghi trong hồ sơ: ${reaction.effects.deltaH_kJ_per_mol} kJ/mol; đối chiếu điều kiện và quy ước của nguồn trước khi dùng.`);
  const references = (reaction.evidence?.sourceIds ?? []).map(id => sources[id]).filter(Boolean);
  if (references.length) parts.push(`${reaction.evidence?.scope === 'family' ? 'Nguồn quy tắc của họ phản ứng' : 'Nguồn dữ liệu'}: ${references.map(r => `[${r.title}](${r.url})`).join(' · ')}.${reaction.evidence?.scope === 'family' ? ' Đây là căn cứ cho quy tắc, không phải biên bản đo riêng phương trình này.' : ''}`);
  const lab = resolveLabExperiment(reaction.equation, reaction.kind ?? 'chemical');
  if (lab) parts.push(`[Quan sát thí nghiệm này trong Lab 3D](${lab.href})`);
  return parts.join('\n\n');
}
