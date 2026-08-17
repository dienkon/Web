import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Exam } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { z } from 'zod';
import { getLocalExam, getLocalAnswers } from '@/lib/localExams';
import { Upload, Download } from 'lucide-react';

const optionSchema = z.object({
  text: z.string(),
  value: z.string(),
});

const questionSchema = z.object({
  id: z.string(),
  examId: z.string(),
  sectionId: z.string(),
  text: z.string().optional(),
  questionText: z.string().optional(),
  questionPremise: z.string().nullable().optional(),
  type: z.enum(['multiple-choice', 'short-answer']),
  points: z.number().default(1),
  order: z.number(),
  options: z.array(optionSchema).optional(),
});

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  isMandatory: z.boolean().optional(),
  duration: z.number(),
  numberOfQuestions: z.number().optional(),
  order: z.number(),
  questions: z.array(questionSchema),
});

const examJsonSchema = z.object({
  errorCode: z.number().optional(),
  sections: z.array(sectionSchema),
});

const answerItemSchema = z.object({
  questionId: z.string(),
  sectionId: z.string().optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional().default(''),
});

const answerJsonSchema = z.object({
  errorCode: z.number().optional(),
  answers: z.array(answerItemSchema),
});

export default function AdminEditExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examJsonStr, setExamJsonStr] = useState('');
  const [answerJsonStr, setAnswerJsonStr] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const examFileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        if (id.startsWith('local_')) {
          const localE = getLocalExam(id);
          if (localE) {
            setTitle(localE.title);
            setDescription(localE.description || '');
            setTags(localE.tags.join(', '));
            setExamJsonStr(typeof localE.rawExamJson === 'string' ? localE.rawExamJson : JSON.stringify(localE.rawExamJson, null, 2));
          }
          const localA = getLocalAnswers(id);
          if (localA) {
            setAnswerJsonStr(typeof localA === 'string' ? localA : JSON.stringify(localA, null, 2));
          }
        } else {
          const examSnap = await getDoc(doc(db, 'exams', id));
          if (examSnap.exists()) {
            const data = examSnap.data() as Exam;
            setTitle(data.title);
            setDescription(data.description || '');
            setTags(data.tags.join(', '));
            setExamJsonStr(typeof data.rawExamJson === 'string' ? data.rawExamJson : JSON.stringify(data.rawExamJson, null, 2));
          }
          const ansSnap = await getDoc(doc(db, 'examAnswers', id));
          if (ansSnap.exists()) {
            const ansData = ansSnap.data().rawAnswerJson;
            setAnswerJsonStr(typeof ansData === 'string' ? ansData : JSON.stringify(ansData, null, 2));
          }
        }
      };
      fetchData();
    }
  }, [id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setStr: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setStr(ev.target.result as string);
      }
    };
    reader.readAsText(file);
    // clear input
    e.target.value = '';
  };

  const handleDownload = (filename: string, content: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = async (published: boolean) => {
    setError('');
    setSaving(true);
    try {
      let parsedExam;
      try {
        parsedExam = JSON.parse(examJsonStr);
        examJsonSchema.parse(parsedExam);
      } catch (e: any) {
        throw new Error("Invalid Exam JSON: " + e.message);
      }
      
      let parsedAnswer;
      if (answerJsonStr.trim()) {
        try {
          parsedAnswer = JSON.parse(answerJsonStr);
          answerJsonSchema.parse(parsedAnswer);
        } catch (e: any) {
          throw new Error("Invalid Answer JSON: " + e.message);
        }
      }

      // calculate totals
      let totalQ = 0;
      let totalD = 0;
      parsedExam.sections.forEach((s: any) => {
        totalQ += s.questions?.length || 0;
        totalD += s.duration || 0;
      });

      const isLocal = id?.startsWith('local_');
      const examId = isLocal ? doc(collection(db, 'exams')).id : (id || doc(collection(db, 'exams')).id);
      
      const examData: Exam = {
        id: examId,
        title,
        description,
        status: published ? 'published' : 'draft',
        createdBy: user?.uid || '',
        createdAt: id && !isLocal ? (await getDoc(doc(db, 'exams', id))).data()?.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now(),
        duration: totalD,
        totalQuestions: totalQ,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        rawExamJson: examJsonStr,
        published
      };

      await setDoc(doc(db, 'exams', examId), examData, { merge: true });
      
      if (answerJsonStr.trim()) {
        await setDoc(doc(db, 'examAnswers', examId), { id: examId, rawAnswerJson: answerJsonStr }, { merge: true });
      }

      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{id ? (id.startsWith('local_') ? 'Import Local Exam' : 'Edit Exam') : 'Create Exam'}</h1>
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm font-semibold border border-red-200">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g., Math Final Test" className="bg-white" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-white" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Tags (comma separated)</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="math, algebra" className="bg-white" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exam JSON (đề.json)</CardTitle>
          <div className="flex gap-2">
            <input type="file" accept=".json" className="hidden" ref={examFileInputRef} onChange={(e) => handleFileUpload(e, setExamJsonStr)} />
            <Button variant="outline" size="sm" onClick={() => examFileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Tải lên
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload('de.json', examJsonStr)}>
              <Download className="w-4 h-4 mr-2" /> Tải xuống
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <textarea 
            className="w-full h-96 p-4 border border-slate-200 rounded-lg font-mono text-[13px] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none resize-y transition-colors custom-scrollbar"
            value={examJsonStr}
            onChange={e => setExamJsonStr(e.target.value)}
            placeholder='{"errorCode": 0, "sections": [...] }'
            spellCheck={false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Answer JSON (đa.json - Optional)</CardTitle>
          <div className="flex gap-2">
            <input type="file" accept=".json" className="hidden" ref={answerFileInputRef} onChange={(e) => handleFileUpload(e, setAnswerJsonStr)} />
            <Button variant="outline" size="sm" onClick={() => answerFileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Tải lên
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload('da.json', answerJsonStr)}>
              <Download className="w-4 h-4 mr-2" /> Tải xuống
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <textarea 
            className="w-full h-96 p-4 border border-slate-200 rounded-lg font-mono text-[13px] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none resize-y transition-colors custom-scrollbar"
            value={answerJsonStr}
            onChange={e => setAnswerJsonStr(e.target.value)}
            placeholder='{"errorCode": 0, "answers": [...] }'
            spellCheck={false}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4 pb-12">
        <Button variant="outline" onClick={() => navigate('/admin')} className="font-bold">Cancel</Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving} className="font-bold bg-slate-200 hover:bg-slate-300">Save as Draft</Button>
        <Button onClick={() => handleSave(true)} disabled={saving} className="font-bold bg-indigo-600 hover:bg-indigo-700">Publish Exam</Button>
      </div>
    </div>
  );
}
