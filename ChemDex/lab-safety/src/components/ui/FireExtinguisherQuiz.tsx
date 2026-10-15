import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Shield, Check, X, Flame } from 'lucide-react';
import { playSound } from '../../audio/soundManager';

interface QuizQuestion {
  step: string;
  letter: string;
  title: string;
  prompt: string;
  options: { key: string; text: string; isCorrect: boolean; feedback: string }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    step: "BƯỚC 1",
    letter: "P - PULL",
    title: "RÚT CHỐT AN TOÀN",
    prompt: "Khi tiếp cận bình cứu hỏa CO2 để chuẩn bị dập lửa, bạn phải làm gì đầu tiên?",
    options: [
      {
        key: "A",
        text: "Lắc mạnh bình liên tục và đập đáy bình xuống đất để kích hoạt khí hóa lỏng.",
        isCorrect: false,
        feedback: "Sai! Bình CO2 chứa khí nén áp suất cao dạng lỏng, không được tự ý đập hay va chạm mạnh vào vỏ bình tránh gây nguy cơ nổ bình."
      },
      {
        key: "B",
        text: "Rút chốt an toàn bằng kim loại ở cổ bình để giải phóng tay bóp gạt.",
        isCorrect: true,
        feedback: "Chính xác! Phải rút chốt an toàn (thường có niêm phong nhựa mỏng) ra để chốt định vị không còn chặn tay gạt, khi đó mới có thể bóp phun được."
      },
      {
        key: "C",
        text: "Bóp chặt tay gạt ngay lập tức từ xa để xả bớt áp lực bên trong.",
        isCorrect: false,
        feedback: "Sai! Nếu chưa rút chốt an toàn, bạn sẽ không thể bóp được tay gạt. Cố bóp mạnh có thể làm méo hoặc gãy cò bóp."
      }
    ]
  },
  {
    step: "BƯỚC 2",
    letter: "A - AIM",
    title: "HƯỚNG LOA PHUN",
    prompt: "Bạn nên cầm loa phun cứu hỏa và hướng loa vào vị trí nào của đám cháy hóa chất?",
    options: [
      {
        key: "A",
        text: "Hướng loa phun thẳng vào ngọn lửa bốc cao nhất ở phía trên để dập ngọn trước.",
        isCorrect: false,
        feedback: "Sai! Phun vào ngọn lửa phía trên chỉ làm tản mát khí CO2 và không dập tắt được tận gốc đám cháy, lửa sẽ tiếp tục bùng phát từ phía dưới."
      },
      {
        key: "B",
        text: "Hướng loa phun trực tiếp vào gốc của đám cháy (nơi hóa chất đang bốc cháy).",
        isCorrect: true,
        feedback: "Chính xác! Phải hướng loa phun vào gốc của đám cháy (base of the fire) để khí lạnh CO2 phủ kín bề mặt hóa chất đang phản ứng, ngăn oxy tiếp xúc và dập tắt lửa nhanh nhất."
      },
      {
        key: "C",
        text: "Hướng loa phun lên trần nhà phía trên đám cháy để tạo một màn sương CO2 rơi xuống.",
        isCorrect: false,
        feedback: "Sai! Cách này làm loãng khí CO2 vô ích và làm lãng phí lượng khí chữa cháy giới hạn trong bình."
      }
    ]
  },
  {
    step: "BƯỚC 3",
    letter: "S - SQUEEZE",
    title: "BÓP TAY GẠT CÒ",
    prompt: "Để phun khí CO2 ra dập lửa, thao tác bóp gạt cò như thế nào là đúng chuẩn kỹ thuật an toàn?",
    options: [
      {
        key: "A",
        text: "Chỉ nhấp nhả nhẹ nhàng nhiều lần để tiết kiệm khí phòng hờ lửa bùng lại.",
        isCorrect: false,
        feedback: "Sai! Nhấp nhả sẽ làm luồng khí phun ngắt quãng, không tạo đủ nồng độ CO2 đậm đặc bao phủ gốc lửa và dễ làm lửa bùng mạnh hơn."
      },
      {
        key: "B",
        text: "Bóp chặt và giữ liên tục tay gạt, đồng thời không chạm tay trần vào loa phun để tránh bỏng lạnh.",
        isCorrect: true,
        feedback: "Chính xác! Phải bóp chặt và giữ liên tục cò bình để luồng khí CO2 lạnh âm 79°C phun ra liên tục dập tắt đám cháy. Đặc biệt, KHÔNG ĐƯỢC CHẠM TAY VÀO LOA PHUN vì khí CO2 phun ra cực lạnh sẽ gây bỏng lạnh (hoại tử da) rất nguy hiểm!"
      },
      {
        key: "C",
        text: "Dùng búa gõ mạnh vào cổ bình để kích thích van xả hoạt động hết công suất.",
        isCorrect: false,
        feedback: "Sai! Tuyệt đối không dùng vật cứng gõ vào bình khí nén áp lực cao vì có thể làm hư van an toàn gây tai nạn nghiêm trọng."
      }
    ]
  },
  {
    step: "BƯỚC 4",
    letter: "S - SWEEP",
    title: "QUÉT QUA LẠI",
    prompt: "Khi luồng khí CO2 đang phun ra dập lửa, bạn phải thực hiện động tác gì?",
    options: [
      {
        key: "A",
        text: "Quét loa phun qua lại nhịp nhàng bao trùm toàn bộ gốc đám cháy cho đến khi lửa tắt hẳn.",
        isCorrect: true,
        feedback: "Chính xác! Động tác quét (Sweep) qua lại giúp phân bổ đều tuyết CO2 phủ kín bề mặt gốc đám cháy, nhanh chóng cách ly oxy và làm lạnh đám cháy, ngăn lửa tái sinh."
      },
      {
        key: "B",
        text: "Giữ im loa phun tập trung vào một điểm duy nhất cho đến khi điểm đó hết khói.",
        isCorrect: false,
        feedback: "Sai! Nếu chỉ phun một điểm, ngọn lửa ở các điểm xung quanh sẽ tràn qua và đám cháy tiếp tục lan rộng."
      },
      {
        key: "C",
        text: "Vừa phun vừa lùi lại thật xa để tránh khói bốc lên người.",
        isCorrect: false,
        feedback: "Sai! Lùi lại quá xa làm luồng khí dập lửa không tới được gốc đám cháy, làm giảm hiệu quả chữa cháy rõ rệt. Cần duy trì cự ly an toàn khoảng 1.5m - 2m."
      }
    ]
  }
];

export const FireExtinguisherQuiz: React.FC = () => {
  const { showFireExtinguisherQuiz, setShowFireExtinguisherQuiz, addError, score } = useStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    if (showFireExtinguisherQuiz) {
      setCurrentStepIndex(0); setSelectedOption(null); setIsAnswered(false); setIsCorrect(false);
    }
  }, [showFireExtinguisherQuiz]);
  if (!showFireExtinguisherQuiz) return null;

  const currentQuestion = QUIZ_QUESTIONS[currentStepIndex];

  const handleOptionSelect = (optionKey: string) => {
    if (isAnswered) return;
    playSound('click');
    setSelectedOption(optionKey);
  };

  const handleSubmit = () => {
    if (!selectedOption || isAnswered) return;

    const option = currentQuestion.options.find(opt => opt.key === selectedOption);
    if (!option) return;

    setIsAnswered(true);
    if (option.isCorrect) {
      setIsCorrect(true);
      playSound('success');
    } else {
      setIsCorrect(false);
      playSound('error');
      // Deduct score and log safety error!
      addError('general_error'); // Rule 12
    }
  };

  const handleNext = () => {
    if (!isAnswered || !isCorrect) return;
    playSound('click');
    if (currentStepIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      // Completed all 4 steps!
      playSound('complete');
      useStore.setState(s => ({ player: { ...s.player, flags: { ...s.player.flags, passTrained: true } } }));
      useStore.getState().equipItem('hasFireExtinguisher');
      useStore.getState().selectTool('extinguisher');

      // Close the modal and show instruction
      setShowFireExtinguisherQuiz(false);

      useStore.getState().saveGame();
      if (useStore.getState().currentPhase === 2 && !useStore.getState().player.flags.fireIntroSeen) {
        useStore.getState().startCinematic('fire');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-100/80 backdrop-blur-none p-4 animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92dvh] bg-white/95 backdrop-blur-none border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-white from-red-50 to-orange-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100/10 rounded-lg text-red-600 animate-pulse">
              <Flame size={24} />
            </div>
            <div>
              <h2 className="text-xs md:text-lg font-black text-slate-900 tracking-wider uppercase">
                Huấn Luyện Chữa Cháy P.A.S.S
              </h2>
              <p className="text-xs text-red-700/80 font-medium">
                Kỹ thuật thao tác bình cứu hỏa CO2 dập tắt đám cháy hóa chất
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-mono">Điểm hiện tại</div>
            <div className="text-xs md:text-lg font-black text-amber-600 font-mono">{score}/100</div>
          </div>
        </div>

        {/* Step Progress indicators */}
        <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-slate-50/80 border-b border-slate-100">
          {QUIZ_QUESTIONS.map((q, idx) => (
            <div key={q.step} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={idx <= currentStepIndex ? "text-red-600 font-bold" : "text-slate-600"}>
                  {q.step}
                </span>
                <span className={idx <= currentStepIndex ? "text-slate-800 font-bold" : "text-slate-600"}>
                  {q.letter.split(' - ')[0]}
                </span>
              </div>
              <div className={`h-1.5 rounded-full transition-all duration-300 ${
                idx < currentStepIndex
                  ? "bg-emerald-100"
                  : idx === currentStepIndex
                  ? "bg-red-100"
                  : "bg-slate-200"
              }`} />
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col justify-center">

          <div className="mb-2">
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-black rounded border border-red-200 uppercase tracking-wider">
              {currentQuestion.letter}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
              {currentQuestion.title}
            </h3>
          </div>

          <p className="text-slate-700 text-xs md:text-sm md:text-base leading-relaxed mb-3 md:mb-5 font-medium">
            {currentQuestion.prompt}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.key;
              let optionClass = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm";

              if (isSelected) {
                optionClass = "border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20 shadow-sm";
              }

              if (isAnswered) {
                if (opt.isCorrect) {
                  optionClass = "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm";
                } else if (isSelected) {
                  optionClass = "border-rose-500 bg-rose-50 text-rose-950 shadow-sm";
                } else {
                  optionClass = "border-slate-100 bg-slate-50/50 text-slate-600 opacity-60 pointer-events-none";
                }
              }

              return (
                <button
                  key={opt.key}
                  disabled={isAnswered}
                  onClick={() => handleOptionSelect(opt.key)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 outline-none ${optionClass}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 border ${
                    isSelected
                      ? "bg-sky-100 text-slate-800 border-sky-600"
                      : isAnswered && opt.isCorrect
                      ? "bg-emerald-100 text-slate-800 border-emerald-600"
                      : isAnswered && isSelected
                      ? "bg-rose-100 text-slate-800 border-rose-600"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}>
                    {opt.key}
                  </div>
                  <span className="text-xs md:text-sm font-semibold pt-0.5 leading-snug">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback Section */}
          {isAnswered && (
            <div className={`mt-5 p-4 rounded-xl border animate-fade-in flex items-start gap-3 ${
              isCorrect
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}>
              <div className="mt-0.5 shrink-0">
                {isCorrect ? <Check size={18} className="text-emerald-600" /> : <X size={18} className="text-rose-600" />}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest mb-1">
                  {isCorrect ? "Phản hồi chuẩn xác!" : "Nguy hại an toàn!"}
                </h4>
                <p className="text-xs md:text-sm font-medium leading-relaxed">
                  {currentQuestion.options.find(opt => opt.key === selectedOption)?.feedback}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Shield size={14} className="text-emerald-600" />
            <span>Đề cao an toàn phòng thí nghiệm</span>
          </div>

          {!isAnswered ? (
            <button
              disabled={!selectedOption}
              onClick={handleSubmit}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs md:text-sm shadow-md transition-all duration-200 flex items-center gap-2 ${
                selectedOption
                  ? "bg-red-100 hover:bg-red-100 text-slate-800 active:scale-95"
                  : "bg-slate-200 text-slate-600 cursor-not-allowed shadow-none"
              }`}
            >
              Xác Nhận Lựa Chọn
            </button>
          ) : (
            <button
              onClick={isCorrect ? handleNext : () => {
                playSound('click');
                setSelectedOption(null);
                setIsAnswered(false);
                setIsCorrect(false);
              }}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs md:text-sm shadow-md transition-all duration-200 flex items-center gap-2 text-slate-800 active:scale-95 ${
                isCorrect
                  ? "bg-emerald-100 hover:bg-emerald-100"
                  : "bg-rose-100 hover:bg-rose-100"
              }`}
            >
              {isCorrect
                ? (currentStepIndex === QUIZ_QUESTIONS.length - 1 ? "Hoàn Thành Huấn Luyện" : "Bước Tiếp Theo")
                : "Thử Lại Câu Hỏi"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
