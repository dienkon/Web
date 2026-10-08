import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Shield, Check, X, Plus, Heart } from 'lucide-react';
import { playSound } from '../../audio/soundManager';

interface QuizQuestion {
  step: string;
  letter: string;
  title: string;
  prompt: string;
  options: { key: string; text: string; isCorrect: boolean; feedback: string }[];
}

const BANDAGE_QUESTIONS: QuizQuestion[] = [
  {
    step: "BƯỚC 1",
    letter: "SÁT TRÙNG",
    title: "SÁT TRÙNG VẾT THƯƠNG",
    prompt: "Trước khi tiến hành quấn băng gạc cố định vết thương hoặc vết bỏng hóa chất nhẹ (sau khi đã được rửa xả liên tục 15 phút dưới vòi nước sạch), thao tác sát trùng nào là đúng kỹ thuật y khoa?",
    options: [
      {
        key: "A",
        text: "Dùng cồn 90 độ đổ trực tiếp lên miệng vết thương/vết bỏng hở để diệt khuẩn nhanh nhất.",
        isCorrect: false,
        feedback: "Sai! Sát trùng trực tiếp bằng cồn nồng độ cao lên mô tổn thương hở sẽ làm chết tế bào da lành, gây đau đớn tột cùng và làm vết thương bị hoại tử sâu hơn."
      },
      {
        key: "B",
        text: "Dùng nước muối sinh lý NaCl 0.9% rửa sạch bụi bẩn, sau đó dùng cồn đỏ y tế (Povidine) pha loãng lau nhẹ nhàng từ trong tâm vết thương lan ra ngoài quanh rìa vết thương.",
        isCorrect: true,
        feedback: "Chính xác! Sát khuẩn nhẹ nhàng bằng dung dịch chuyên dụng theo đường xoắn ốc từ trong ra ngoài giúp loại bỏ vi khuẩn mà không làm tổn hại các tế bào hạt lành đang cố gắng tái tạo da."
      },
      {
        key: "C",
        text: "Dùng xà phòng kiềm mạnh chà xát thật lực để rửa trôi hết hóa chất còn dính bám.",
        isCorrect: false,
        feedback: "Sai! Kiềm mạnh của xà phòng kết hợp với vết thương hở sẽ gây bỏng hóa chất thứ phát nguy hiểm hơn."
      }
    ]
  },
  {
    step: "BƯỚC 2",
    letter: "VÔ TRÙNG GẠC",
    title: "ĐẶT GẠC VÔ TRÙNG",
    prompt: "Khi bóc vỏ bọc và áp miếng gạc vô trùng lên miệng vết thương, bạn cần tuân thủ nguyên tắc bảo vệ nào?",
    options: [
      {
        key: "A",
        text: "Dùng bàn tay chưa rửa chạm vào mặt trong của gạc rồi chà nhẹ lên da để gạc dính bám tốt hơn.",
        isCorrect: false,
        feedback: "Sai! Tay chưa sát khuẩn chứa hàng vạn vi khuẩn sẽ truyền trực tiếp lên gạc và xâm nhập vào máu qua vết thương hở."
      },
      {
        key: "B",
        text: "Thổi hơi thật mạnh vào miếng gạc để bay hết sợi lông tơ bám trước khi đặt vào da.",
        isCorrect: false,
        feedback: "Sai! Giọt bắn li ti từ đường thở chứa vi khuẩn sẽ làm mất tính vô trùng tuyệt đối của miếng gạc y tế."
      },
      {
        key: "C",
        text: "Chỉ cầm vào rìa ngoài hoặc mặt ngoài của gạc, đặt nhẹ nhàng mặt vô trùng áp trực tiếp bao phủ kín toàn bộ vùng da đang tổn thương.",
        isCorrect: true,
        feedback: "Chính xác! Đảm bảo mặt áp vào vết thương hoàn toàn vô trùng giúp ngăn chặn mọi nguồn nhiễm trùng từ môi trường bên ngoài."
      }
    ]
  },
  {
    step: "BƯỚC 3",
    letter: "VÒNG KHÓA",
    title: "QUẤN VÒNG KHÓA ĐẦU TIÊN",
    prompt: "Cách đặt đầu cuộn băng gạc và quấn vòng đầu tiên (vòng khóa) như thế nào để băng không bị lỏng hay tuột?",
    options: [
      {
        key: "A",
        text: "Đặt đầu băng chéo ở phía dưới vết thương, quấn 1-2 vòng đè chặt chéo lên phần đuôi thừa để khóa định vị chắc chắn.",
        isCorrect: true,
        feedback: "Chính xác! Vòng khóa đầu tiên (anchoring turn) đè lên đuôi băng chéo giúp giữ chặt cuộn băng gạc không bị xê dịch hay tuột ra khi người bệnh cử động cơ khớp."
      },
      {
        key: "B",
        text: "Thắt nút gút thật chặt cuộn băng ngay chính giữa miệng vết thương hở để giữ cố định.",
        isCorrect: false,
        feedback: "Sai! Thắt nút ngay trên vết thương hở sẽ gây chèn ép cục bộ đau đớn dữ dội và làm vỡ tế bào mỏng manh bên dưới."
      },
      {
        key: "C",
        text: "Thả trôi cuộn băng tự do quanh chi mà không cần cố định đầu băng ban đầu.",
        isCorrect: false,
        feedback: "Sai! Băng gạc sẽ bị bung và tuột ra hoàn toàn chỉ sau vài giây cử động."
      }
    ]
  },
  {
    step: "BƯỚC 4",
    letter: "QUẤN XOẮN ỐC",
    title: "QUẤN XOẮN ỐC HOẶC HÌNH SỐ 8",
    prompt: "Kỹ thuật quấn băng bao phủ toàn bộ vết thương và gạc được thực hiện ra sao để đạt hiệu quả thẩm mỹ và an toàn?",
    options: [
      {
        key: "A",
        text: "Quấn dồn nén toàn bộ băng gạc chồng chất vào một điểm duy nhất đè thật mạnh để cầm máu tuyệt đối.",
        isCorrect: false,
        feedback: "Sai! Hành động này hoạt động như một garo thắt chặt quá mức, làm tắc nghẽn tuần hoàn máu nuôi dưỡng phần chi phía dưới gây hoại tử tế bào."
      },
      {
        key: "B",
        text: "Quấn chéo chồng các hướng lộn xộn từ trên xuống dưới không theo quy luật cố định nào.",
        isCorrect: false,
        feedback: "Sai! Việc quấn lộn xộn làm lực ép không đều, gạc dễ bị lộ ra ngoài và cuộn băng dễ bị rách bung."
      },
      {
        key: "C",
        text: "Quấn hướng dần về phía tim theo hình xoắn ốc hoặc hình số 8, vòng sau đè lên 1/2 đến 2/3 bề rộng vòng trước, lực quấn chặt vừa phải.",
        isCorrect: true,
        feedback: "Chính xác! Quấn hướng về phía tim hỗ trợ tuần hoàn máu tĩnh mạch chảy về tim tốt hơn. Vòng đè bán phần đảm bảo phủ kín gạc bảo vệ, lực vừa phải giữ gạc chắc chắn không gây nghẽn mạch."
      }
    ]
  },
  {
    step: "BƯỚC 5",
    letter: "CỐ ĐỊNH & KIỂM TRA",
    title: "CỐ ĐỊNH VÀ KIỂM TRA MẠCH ĐẬP",
    prompt: "Sau khi quấn hết băng gạc, bước cuối cùng bắt buộc phải thực hiện để hoàn thành quy trình sơ cứu là gì?",
    options: [
      {
        key: "A",
        text: "Cố định đuôi băng bằng móc gài y tế hoặc băng dính chuyên dụng, sau đó kiểm tra mạch đập và màu da đầu ngón chi phía dưới vết băng.",
        isCorrect: true,
        feedback: "Chính xác! Cố định băng bằng băng dính y tế và kiểm tra mạch, sắc diện đầu ngón là quy trình chuẩn tối quan trọng để phát hiện sớm và xử lý ngay nếu lỡ quấn quá chặt làm nghẽn dòng máu nuôi chi."
      },
      {
        key: "B",
        text: "Dùng keo 502 đổ quanh mối băng gạc để dán chặt vĩnh viễn không bao giờ tuột.",
        isCorrect: false,
        feedback: "Sai! Keo 502 chứa cyanoacrylate độc hại sinh nhiệt cao gây bỏng hóa chất nặng thêm và dính chặt vào da cực kỳ nguy hại."
      },
      {
        key: "C",
        text: "Quấn thêm nhiều lớp túi nilon bọc kín hoàn toàn không khí bên ngoài.",
        isCorrect: false,
        feedback: "Sai! Bọc túi nilon kín sẽ giữ mồ hôi ẩm ướt, tạo môi trường kỵ khí lý tưởng cho vi khuẩn uốn ván phát triển dữ dội."
      }
    ]
  }
];

export const BandageWrappingQuiz: React.FC = () => {
  const { showBandageQuiz, setShowBandageQuiz, addError, completeTask, score } = useStore() as any;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  if (!showBandageQuiz) return null;

  const currentQuestion = BANDAGE_QUESTIONS[currentStepIndex];

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
      addError('general_error'); // Rule 15
    }
  };

  const handleNext = () => {
    playSound('click');
    if (currentStepIndex < BANDAGE_QUESTIONS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      // Completed all 5 steps!
      playSound('complete');
      completeTask('task_bandage');
      
      if (setShowBandageQuiz) {
        setShowBandageQuiz(false);
      } else {
        useStore.setState({ showBandageQuiz: false });
      }

      useStore.getState().startDialog([
        "Tuyệt vời! Em đã hoàn thành xuất sắc khóa huấn luyện quấn băng gạc sơ cứu chi tiết!",
        "Em đã nắm vững quy trình rửa sát trùng xoắn ốc, áp gạc vô khuẩn, quấn vòng khóa định vị, phủ đều hình số 8 và kiểm tra tuần hoàn máu.",
        "Đây là kỹ năng sơ cứu tối quan trọng giúp bảo vệ bản thân và đồng nghiệp khỏi biến chứng nhiễm trùng hoặc hoại tử trong phòng thí nghiệm!"
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 animate-pulse">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-xs md:text-lg font-black text-slate-900 tracking-wider uppercase">
                Huấn Luyện Sơ Cứu: Quấn Băng Gạc
              </h2>
              <p className="text-xs text-emerald-700/80 font-medium">
                Kỹ thuật quấn băng gạc sơ cứu vết thương an toàn chuẩn y khoa
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-mono">Điểm hiện tại</div>
            <div className="text-xs md:text-lg font-black text-amber-600 font-mono">{score}/100</div>
          </div>
        </div>

        {/* Step Progress indicators */}
        <div className="grid grid-cols-5 gap-2 px-6 py-3 bg-slate-50/80 border-b border-slate-100">
          {BANDAGE_QUESTIONS.map((q, idx) => (
            <div key={q.step} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={idx <= currentStepIndex ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {q.step}
                </span>
                <span className={idx <= currentStepIndex ? "text-slate-800 font-bold" : "text-slate-400"}>
                  {q.letter}
                </span>
              </div>
              <div className={`h-1.5 rounded-full transition-all duration-300 ${
                idx < currentStepIndex 
                  ? "bg-emerald-500" 
                  : idx === currentStepIndex 
                  ? "bg-amber-500" 
                  : "bg-slate-200"
              }`} />
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col justify-center">
          
          <div className="mb-2">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-black rounded border border-emerald-200 uppercase tracking-wider">
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
                  optionClass = "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60 pointer-events-none";
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
                      ? "bg-sky-600 text-white border-sky-600" 
                      : isAnswered && opt.isCorrect 
                      ? "bg-emerald-600 text-white border-emerald-600" 
                      : isAnswered && isSelected 
                      ? "bg-rose-600 text-white border-rose-600"
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
                  {isCorrect ? "Phản hồi chính xác!" : "Sai quy trình y khoa!"}
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
            <span>Sơ cứu an toàn cứu hộ chuẩn xác</span>
          </div>

          {!isAnswered ? (
            <button
              disabled={!selectedOption}
              onClick={handleSubmit}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs md:text-sm shadow-md transition-all duration-200 flex items-center gap-2 ${
                selectedOption
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              Xác Nhận Thao Tác
            </button>
          ) : (
            <button
              onClick={isCorrect ? handleNext : () => {
                playSound('click');
                setSelectedOption(null);
                setIsAnswered(false);
                setIsCorrect(false);
              }}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs md:text-sm shadow-md transition-all duration-200 flex items-center gap-2 text-white active:scale-95 ${
                isCorrect 
                  ? "bg-emerald-600 hover:bg-emerald-500" 
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {isCorrect 
                ? (currentStepIndex === BANDAGE_QUESTIONS.length - 1 ? "Hoàn Thành Huấn Luyện" : "Bước Tiếp Theo") 
                : "Thử Lại Bước Này"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
