import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useClassroomStore } from '../store/classroomStore';
import { useMeetingStore } from '../store/meetingStore';
import { AnswerStatistics } from '../components/classroom/AnswerStatistics';
import { useClassroom } from '../hooks/useClassroom';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentQuestion, statistics, answersList, questionLocked } = useClassroomStore();
  const { isHost } = useMeetingStore();
  const { lockQuestion, resetQuestion } = useClassroom();

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại cuộc họp
        </button>

        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Bảng Thống Kê Lớp Học Interactive</h1>
        </div>
      </div>

      {currentQuestion ? (
        <div className="bg-[#202124] p-6 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Câu hỏi hiện tại
            </span>
            <h2 className="text-2xl font-bold text-white">{currentQuestion.text}</h2>
          </div>

          <AnswerStatistics
            statistics={statistics}
            answersList={answersList}
            questionLocked={questionLocked}
            isHost={isHost}
            onLock={lockQuestion}
            onReset={resetQuestion}
          />
        </div>
      ) : (
        <div className="text-center py-16 bg-[#202124] rounded-3xl border border-gray-800">
          <p className="text-gray-400">Chưa có dữ liệu câu hỏi nào được ghi nhận.</p>
          <Button variant="primary" size="md" onClick={() => navigate('/')} className="mt-4">
            Về Trang Chủ
          </Button>
        </div>
      )}
    </div>
  );
};
