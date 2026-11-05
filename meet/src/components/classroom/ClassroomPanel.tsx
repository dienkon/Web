import React, { useState } from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { useMeetingStore } from '../../store/meetingStore';
import { useClassroom } from '../../hooks/useClassroom';
import { TeacherQuestionPanel } from './TeacherQuestionPanel';
import { AnswerStatistics } from './AnswerStatistics';
import { AnswerPanel } from './AnswerPanel';
import { GraduationCap, X, HelpCircle, BarChart3, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface ClassroomPanelProps {
  onClose: () => void;
}

export const ClassroomPanel: React.FC<ClassroomPanelProps> = ({ onClose }) => {
  const { currentQuestion, statistics, answersList, selectedAnswer, questionLocked } = useClassroomStore();
  const { isHost } = useMeetingStore();
  const { startQuestion, lockQuestion, resetQuestion, submitAnswer } = useClassroom();
  const [hostTab, setHostTab] = useState<'create' | 'stats'>('create');

  const handleStartQuestion = (text: string, options: { A: string; B: string; C: string; D: string }) => {
    startQuestion(text, options);
    setHostTab('stats');
  };

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-[#202124] border-l border-gray-800 flex flex-col z-20 shrink-0 select-none shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100 text-sm">Lớp Học Tương Tác</h3>
            <span className="text-[10px] text-gray-400 block">Trắc nghiệm A / B / C / D trực tiếp</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          title="Đóng bảng lớp học"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TEACHER VIEW */}
        {isHost ? (
          <div className="space-y-4">
            {/* Tabs for Teacher */}
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setHostTab('create')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border-b-2 transition-colors',
                  hostTab === 'create'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                )}
              >
                <HelpCircle className="w-3.5 h-3.5" /> Tạo câu hỏi
              </button>
              <button
                onClick={() => setHostTab('stats')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border-b-2 transition-colors',
                  hostTab === 'stats'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                )}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Thống kê Live
              </button>
            </div>

            {hostTab === 'create' ? (
              <TeacherQuestionPanel onStartQuestion={handleStartQuestion} />
            ) : (
              <div>
                {currentQuestion ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-[#282a2d] rounded-xl border border-gray-700">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                        Câu hỏi đang hoạt động:
                      </span>
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
                  <div className="text-center py-10 text-gray-400 space-y-3">
                    <Clock className="w-8 h-8 mx-auto text-gray-600" />
                    <p className="text-xs">Chưa có câu hỏi nào được phát động.</p>
                    <button
                      onClick={() => setHostTab('create')}
                      className="text-xs text-blue-400 hover:underline font-semibold"
                    >
                      + Tạo câu hỏi ngay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STUDENT VIEW */
          <div className="space-y-4">
            {currentQuestion ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#282a2d] rounded-xl border border-blue-500/30 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      Câu hỏi từ Giáo viên
                    </span>
                    {questionLocked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-950 text-red-400 rounded-full border border-red-800">
                        Đã khóa
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{currentQuestion.text}</h4>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-300">Chọn câu trả lời của bạn:</span>
                  <AnswerPanel
                    question={currentQuestion}
                    selectedAnswer={selectedAnswer}
                    disabled={questionLocked}
                    onAnswer={submitAnswer}
                  />
                </div>

                <div className="border-t border-gray-800 pt-3">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Kết quả chung của cả lớp:</span>
                  <AnswerStatistics
                    statistics={statistics}
                    answersList={answersList}
                    questionLocked={questionLocked}
                    isHost={false}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-gray-200">Đang chờ câu hỏi</h4>
                <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
                  Khi giáo viên phát động câu hỏi trắc nghiệm, các lựa chọn A/B/C/D sẽ xuất hiện tại đây.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
