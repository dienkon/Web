export function youtubeURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const id = ['youtube.com', 'www.youtube.com'].includes(url.hostname) ? url.searchParams.get('v') : url.hostname === 'youtu.be' ? url.pathname.slice(1) : null;
    return /^[\w-]{11}$/.test(id ?? '') ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch { return null; }
}

// AI output is data: validate all fields, times, answers and scene evidence.
export function validateVideoQuiz(value) {
  if (!value || !Number.isFinite(value.durationSeconds) || value.durationSeconds < 10 || value.durationSeconds > 1800 || !Array.isArray(value.cues)) throw Error('Dữ liệu thời lượng video không hợp lệ.');
  const cues = value.cues.filter(c => c && Number.isFinite(c.seconds) && c.seconds >= 5 && c.seconds < value.durationSeconds - 2
    && typeof c.question === 'string' && c.question.length >= 10 && c.question.length <= 600
    && Array.isArray(c.options) && c.options.length === 4 && c.options.every(o => typeof o === 'string' && o.length > 0 && o.length <= 300)
    && new Set(c.options.map(o => o.trim().toLowerCase())).size === 4
    && Number.isInteger(c.answer) && c.answer >= 0 && c.answer < 4
    && typeof c.explain === 'string' && c.explain.length > 10 && c.explain.length <= 1200
    && typeof c.evidence === 'string' && c.evidence.length >= 10 && c.evidence.length <= 800
  ).sort((a,b) => a.seconds-b.seconds).filter((c, i, all) => !i || c.seconds-all[i-1].seconds >= 12).slice(0, 6)
    .map((c, i) => ({ id: `ai-${i}`, seconds: Math.round(c.seconds), at: Math.round(c.seconds), type: 'single', question: c.question, options: c.options, answer: c.answer, explain: c.explain, evidence: c.evidence }));
  if (!cues.length) throw Error('Chưa xác định được câu hỏi có mốc thời gian đáng tin cậy.');
  return { durationSeconds: value.durationSeconds, cues, generatedBy: 'AI', version: 1 };
}
