import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Exam } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { formatTime } from '@/lib/utils';
import { Clock, FileText } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getLocalExams } from '@/lib/localExams';

export default function Home() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    async function fetchExams() {
      try {
        const examsRef = collection(db, 'exams');
        let q;
        if (user?.role === 'admin') {
          q = query(examsRef);
        } else {
          q = query(examsRef, where('published', '==', true)); // Remove orderBy to avoid index requirement
        }
        
        const snapshot = await getDocs(q);
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Exam));
        
        const localData = getLocalExams();
        data = [...data, ...localData];
        
        data.sort((a, b) => b.createdAt - a.createdAt); // Client-side sort
        
        setExams(data);
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, [user]);

  if (loading) return <div>Loading exams...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Available Exams</h1>
        <p className="text-muted-foreground mt-2">Select an exam to start practicing.</p>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No exams available right now.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{exam.title}</CardTitle>
                <CardDescription className="line-clamp-2">{exam.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    {formatTime(exam.duration)}
                  </div>
                  <div className="flex items-center">
                    <FileText className="mr-1 h-4 w-4" />
                    {exam.totalQuestions} questions
                  </div>
                </div>
                {exam.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {exam.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-slate-100 text-xs rounded-md font-medium text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link to={`/exam/${exam.id}/play`}>Start Exam</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
