import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Exam } from '@/types';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

import { getLocalExams } from '@/lib/localExams';

export default function AdminDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchExams = async () => {
    try {
      const q = query(collection(db, 'exams'));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      
      const localData = getLocalExams();
      data = [...data, ...localData];
      
      data.sort((a, b) => b.createdAt - a.createdAt);
      
      setExams(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const togglePublish = async (exam: Exam) => {
    try {
      await updateDoc(doc(db, 'exams', exam.id), {
        published: !exam.published
      });
      fetchExams();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      await deleteDoc(doc(db, 'exams', id));
      fetchExams();
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="text-center py-12 text-red-500">Access Denied. Admin only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <Button asChild>
          <Link to="/admin/new">
            <Plus className="mr-2 h-4 w-4" /> Create Exam
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-md border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Questions</th>
              <th className="px-6 py-3">Duration</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : exams.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">No exams found</td></tr>
            ) : exams.map((exam) => (
              <tr key={exam.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{exam.title}</td>
                <td className="px-6 py-4">{exam.totalQuestions}</td>
                <td className="px-6 py-4">{formatTime(exam.duration)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${exam.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {exam.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {!exam.isLocal && (
                    <Button variant="ghost" size="sm" onClick={() => togglePublish(exam)}>
                      {exam.published ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/edit/${exam.id}`}><Edit className="h-4 w-4 text-blue-500" /></Link>
                  </Button>
                  {!exam.isLocal && (
                    <Button variant="ghost" size="sm" onClick={() => deleteExam(exam.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  {exam.isLocal && (
                    <span className="text-xs text-slate-400">Local JSON</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
