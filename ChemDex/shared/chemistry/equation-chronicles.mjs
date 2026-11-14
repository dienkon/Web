import {getAllScientists} from './scientist-biographies.mjs';
import {reactionLesson} from './reaction-lesson.mjs';

// A reaction family does not identify the discoverer of a specific equation.
export function generateReactionStory(reaction, roleLabel, substanceName, displayFormula, isFormation) {
  const inputs=new Set((reaction.reactants??[]).map(t=>t.formula));
  const outputs=new Set((reaction.products??[]).map(t=>t.formula));
  const haber=inputs.size===2 && inputs.has('N2') && inputs.has('H2') && outputs.size===1 && outputs.has('NH3');
  const story=haber
    ? `#### Từ phòng thí nghiệm đến nhà máy\n\nNăm 1909, Fritz Haber và Robert Le Rossignol trình diễn thiết bị tổng hợp ammonia. Carl Bosch và nhóm BASF tiếp tục giải quyết bài toán đưa quá trình áp suất cao lên quy mô công nghiệp; sản xuất tại Oppau bắt đầu năm 1913. Câu chuyện gồm cả nghiên cứu hóa học lẫn kỹ thuật thiết bị.\n\n[Science History Institute · Fritz Haber](https://www.sciencehistory.org/education/scientific-biographies/fritz-haber/)`
    : '';
  return [`### ${roleLabel}`,story,reactionLesson(reaction,{heading:`${substanceName} (${displayFormula})`})].filter(Boolean).join('\n\n');
}

// Preserve this export for callers, while removing unrelated fallback people.
export function getGuaranteedPioneers({subject,element,formula}) {
  const compounds=[formula,subject?.name_en,subject?.name_vi].filter(Boolean).map(x=>x.toLowerCase());
  const match=(entry,target)=>entry.toLowerCase()===target || entry.toLowerCase().startsWith(target+' (');
  return getAllScientists().filter(sc=>
    (element && sc.discoveredOrRevolutionized?.elements?.some(e=>match(e,element.symbol.toLowerCase())))
    || sc.discoveredOrRevolutionized?.compounds?.some(c=>compounds.some(target=>match(c,target))));
}

export function formatPioneerChapter(pioneer, substanceName, displayFormula) {
  if (!pioneer) return '';
  // Authored story articles contain reviewed narratives and their own sources.
  // Legacy biography data is an index, not evidence for unsourced anecdotes.
  return `### ${pioneer.name}\n\nCông trình liên quan đến ${substanceName} (${displayFormula}). Tra cứu tiểu sử và nguồn của nhà khoa học trong mục Nhà khoa học của thư viện.`;
}
