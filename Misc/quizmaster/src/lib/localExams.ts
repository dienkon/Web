import { Exam } from '@/types';

const examFiles = import.meta.glob('/src/data/ex/*/*/de.json', { eager: true, query: '?raw', import: 'default' });
const answerFiles = import.meta.glob('/src/data/ex/*/*/da.json', { eager: true, query: '?raw', import: 'default' });

export function getLocalExams(): Exam[] {
  const exams: Exam[] = [];
  
  for (const path in examFiles) {
    const rawJson = examFiles[path] as string;
    const parts = path.split('/');
    const title = parts[parts.length - 2];
    const tag = parts[parts.length - 3];
    const id = `local_${tag}_${title}`;
    
    try {
      const parsed = JSON.parse(rawJson);
      let totalQ = 0;
      let totalD = 0;
      parsed.sections?.forEach((s: any) => {
        totalQ += s.questions?.length || 0;
        totalD += s.duration || 0;
      });
      
      exams.push({
        id,
        title: decodeURIComponent(title).replace(/_/g, ' '),
        description: 'Local Data',
        status: 'published',
        createdBy: 'system',
        createdAt: 0,
        updatedAt: 0,
        duration: totalD,
        totalQuestions: totalQ,
        tags: [decodeURIComponent(tag)],
        rawExamJson: rawJson,
        published: true,
        isLocal: true
      } as Exam);
    } catch (e) {
      console.error('Failed to parse local exam', path, e);
    }
  }
  
  return exams;
}

export function getLocalExam(id: string): Exam | null {
  return getLocalExams().find(e => e.id === id) || null;
}

export function getLocalAnswers(id: string): string | null {
  const parts = id.replace('local_', '').split('_');
  if (parts.length < 2) return null;
  const tag = parts[0];
  const title = parts.slice(1).join('_');
  
  const path = `/src/data/ex/${tag}/${title}/da.json`;
  if (answerFiles[path]) {
    return answerFiles[path] as string;
  }
  return null;
}
