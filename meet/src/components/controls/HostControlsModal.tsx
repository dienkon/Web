import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { TeacherQuestionPanel } from '../classroom/TeacherQuestionPanel';
import { AnswerStatistics } from '../classroom/AnswerStatistics';
import { useClassroomStore } from '../../store/classroomStore';
import { useClassroom } from '../../hooks/useClassroom';
import { HelpCircle, BarChart3, Settings } from 'lucide-react';
import { clsx } from 'clsx';

interface HostControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'create' | 'stats'>('create');
  const { currentQuestion, statistics, answersList, questionLocked } = useClassroomStore();
  const { startQuestion, lockQuestion, resetQuestion } = useClassroom();

  const handleCreate = (text: string, options: { A: string; B: string; C: string; D: string }) => {
    startQuestion(text, options);
    setTab('stats');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản Lý Phòng Học (Giáo viên)" maxWidth="lg">
      {/* Tab Selectors */}
      <div className="flex border-b border-gray-800 mb-5">
        <button
          onClick={() => setTab('create')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
            tab === 'create'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <HelpCircle className="w-4 h-4" /> Tạo câu hỏi mới
        </button>

        <button
          onClick={() => setTab('stats')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
            tab === 'stats'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <BarChart3 className="w-4 h-4" /> Thống kê Realtime
        </button>
      </div>

      {tab === 'create' ? (
        <TeacherQuestionPanel onStartQuestion={handleCreate} />
      ) : (
        <div>
          {currentQuestion ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#282a2d] rounded-xl border border-gray-700">
                <span className="text-xs font-bold text-blue-400 uppercase">Câu hỏi đang phát</span>
                <p className="text-sm font-semibold text-white mt-1">{currentQuestion.text}</p>
              </div>

              <AnswerStatistics
                statistics={statistics}
                answersList={answersList}
                questionLocked={questionLocked}
                isHost={true}
                onLock={lockQuestion}
                onReset={resetQuestion}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 space-y-3">
              <Settings className="w-10 h-10 mx-auto text-gray-600 animate-spin-slow" />
              <p className="text-sm">Chưa có câu hỏi nào được phát động trong phòng học này.</p>
              <button
                onClick={() => setTab('create')}
                className="text-xs text-blue-400 hover:underline font-medium"
              >
                + Tạo câu hỏi đầu tiên ngay
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
