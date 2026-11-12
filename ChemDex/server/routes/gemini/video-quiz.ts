import { callWithGeminiFallback, generateContentWithModelFallback, getCandidateKeys, publicGeminiFailure } from './client';
import { youtubeURL, validateVideoQuiz } from '../../../shared/chemistry/video-quiz.mjs';
import catalog from '../../../shared/video-catalog.json';
import preparedQuestions from '../../../shared/video-questions.generated.json';

const cache = new Map<string, { until: number; value: any }>();
const pending = new Map<string, Promise<any>>();
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Chỉ hỗ trợ POST.' });
  const url = youtubeURL(req.body?.url);
  const video = catalog.find(v => v.source === url);
  if (!url || !video) return res.status(400).json({ error: 'Video chưa có trong danh mục nguồn đã chọn.' });
  const existing = cache.get(url);
  if (existing && existing.until > Date.now()) return res.status(200).json(existing.value);
  const prepared = (preparedQuestions as Record<string,any>)[url];
  if (prepared) return res.status(200).json({ ...validateVideoQuiz(prepared, video.durationSeconds), url, title: video.title, generatedAt: prepared.generatedAt });
  if (!getCandidateKeys().length) return res.status(503).json({ error: 'Máy chủ chưa cấu hình GEMINI_API_KEY hoặc GOOGLE_API_KEY để phân tích video.' });
  try {
    let work = pending.get(url);
    if (!work) {
      work = (async () => {
        const abortSignal = AbortSignal.timeout(85000);
        const questionCount = video.durationSeconds ? Math.min(6, Math.max(1, Math.floor((video.durationSeconds - 7) / 20))) : 4;
        const response = await callWithGeminiFallback(ai => generateContentWithModelFallback(ai, process.env.GEMINI_VIDEO_MODEL || 'gemini-2.5-flash', () => ({
          contents: [{ role: 'user', parts: [
            { fileData: { fileUri: url, mimeType: 'video/mp4' } },
            { text: `Phân tích trực tiếp hình ảnh và lời nói trong video hóa học này. Tạo tối đa ${questionCount} câu hỏi trắc nghiệm tiếng Việt tại các khoảnh khắc có ý nghĩa (ngay sau hiện tượng hoặc giải thích), không chia đều thời gian. ${video.durationSeconds ? `Thời lượng nguồn TED-Ed ghi nhận: ${video.durationSeconds} giây; đối chiếu với video thực tế.` : ''} Chỉ hỏi kiến thức đã xuất hiện trước mốc hỏi. Mỗi câu 4 lựa chọn, đúng một đáp án chỉ số 0–3. Các câu cách nhau ít nhất 12 giây. Mốc seconds là số giây, phải nằm trong thời lượng thực. evidence mô tả chính xác cảnh/lời nói trước mốc để đối chiếu. Không bịa thời lượng, cảnh hay lời thoại. Không thể xem video thì trả cues rỗng. Đây có thể là video lưu trữ với tên nguyên tố tạm thời; nguyên tố hiện hành trong hồ sơ có ký hiệu ${video.symbols.join(', ')}. Phân biệt thông tin lịch sử trong lời nói với tên hiện hành; không dạy tên tạm như tên hiện nay. Không hỏi về một mốc lịch sử tương lai sau ngày phát hành như thể đã có trong cảnh. Không xuất HTML. JSON duy nhất: {"durationSeconds":number,"cues":[{"seconds":number,"question":string,"options":[string,string,string,string],"answer":number,"explain":string,"evidence":string}]}. Video: ${video.title}.` }
          ] }],
          config: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4096, abortSignal, httpOptions: { timeout: 85000 } }
        })));
        const validated = validateVideoQuiz(JSON.parse(String(response.text ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '')), video.durationSeconds);
        const value = { ...validated, url, title: video.title };
        cache.set(url, { until: Date.now() + 24 * 60 * 60 * 1000, value });
        if (cache.size > 150) cache.delete(cache.keys().next().value!);
        return value;
      })().finally(() => pending.delete(url));
      pending.set(url, work);
    }
    return res.status(200).json(await work);
  } catch (error) {
    const failure = publicGeminiFailure(error);
    return res.status(failure.status).json({ error: failure.error + ' Bạn vẫn có thể xem video gốc.' });
  }
}
