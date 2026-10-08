import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { playSound } from '../../audio/soundManager';

const SYMBOLS = [
  { id: 'toxic', name: 'Độc tính cấp', image: '/SYMBOLS-IMG/bien-bao-chat-doc-cap-tinh.png', description: 'Gây độc tính cấp tính nguy hiểm đến tính mạng nếu nuốt phải, hít phải hoặc tiếp xúc qua da.' },
  { id: 'flammable', name: 'Dễ cháy', image: '/SYMBOLS-IMG/bien-bao-de-chay.png', description: 'Chất dễ cháy. Cần tránh xa nguồn nhiệt, tia lửa hoặc ngọn lửa trần.' },
  { id: 'corrosive', name: 'Ăn mòn', image: '/SYMBOLS-IMG/bien-bao-chat-an-mon.png', description: 'Chất ăn mòn. Có thể gây bỏng da nặng và tổn thương mắt.' },
  { id: 'explosive', name: 'Dễ nổ', image: '/SYMBOLS-IMG/bien-bao-chat-no.png', description: 'Chất dễ nổ. Có thể gây nổ khi bị đun nóng, ma sát, hoặc va đập.' },
  { id: 'oxidizing', name: 'Oxy hóa', image: '/SYMBOLS-IMG/bien-bao-chat-oxy-hoa.png', description: 'Chất oxy hóa. Có thể gây ra hoặc làm tăng cường hỏa hoạn.' },
  { id: 'environment', name: 'Nguy hại môi trường', image: '/SYMBOLS-IMG/bien-bao-chat-nguy-hiem-moi-truong.png', description: 'Nguy hại cho môi trường thủy sinh, có tác động kéo dài.' },
  { id: 'health_hazard_long', name: 'Nguy hại sức khỏe (CMR)', image: '/SYMBOLS-IMG/bien-bao-nguy-hiem-suc-khoe-lau-dai.png', description: 'Tác nhân gây ung thư, đột biến gen, hoặc độc tính sinh sản (CMR).' },
  { id: 'harmful', name: 'Nguy hại chung (Kích ứng)', image: '/SYMBOLS-IMG/bien-bao-nguy-hai.png', description: 'Gây kích ứng da, mắt, hoặc đường hô hấp. Độc tính cấp mức độ thấp.' },
  { id: 'biohazard_toxic', name: 'Rủi ro chất độc sinh học', image: '/SYMBOLS-IMG/bien-canh-bao-rui-ro-chat-doc-sinh-hoc.png', description: 'Nguy cơ từ các tác nhân sinh học có độc tính cao đối với con người và môi trường.' },
  { id: 'biohazard', name: 'Rủi ro sinh học', image: '/SYMBOLS-IMG/bien-canh-bao-rui-ro-sinh-hoc.png', description: 'Nguy cơ sinh học từ vi sinh vật, virus, hoặc các vật liệu sinh học lây nhiễm.' },
  { id: 'compressed_gas', name: 'Khí nén', image: '/SYMBOLS-IMG/bien-bao-khi-nen.png', description: 'Chứa khí nén. Có thể nổ nếu bị nung nóng.' }
];

export const ChemicalSymbolsQuiz: React.FC = () => {
  const showChemicalSymbolsQuiz = useStore((s: any) => s.showChemicalSymbolsQuiz);
  const setShowChemicalSymbolsQuiz = useStore((s: any) => s.setShowChemicalSymbolsQuiz);
  const completeTask = useStore((s: any) => s.completeTask);
  const addError = useStore((s: any) => s.addError);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  const currentSymbol = SYMBOLS[currentIndex];

  React.useEffect(() => {
    if (!currentSymbol) return;
    // Generate 3 random incorrect options + 1 correct
    const incorrect = SYMBOLS.filter(s => s.id !== currentSymbol.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    const opts = [currentSymbol, ...incorrect].map(s => s.name).sort(() => 0.5 - Math.random());
    setOptions(opts);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsWrong(false);
  }, [currentIndex, currentSymbol]);

  const timeout1Ref = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const timeout2Ref = React.useRef<NodeJS.Timeout | undefined>(undefined);

  React.useEffect(() => {
    return () => {
      clearTimeout(timeout1Ref.current);
      clearTimeout(timeout2Ref.current);
    };
  }, []);

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
    setShowResult(true);

    if (option === currentSymbol.name) {
      // Correct!
      setIsWrong(false);
      playSound('success');
      timeout1Ref.current = setTimeout(() => {
        if (currentIndex < SYMBOLS.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // Completed all!
          playSound('complete');
          completeTask('task_chemical_symbols');
          setShowChemicalSymbolsQuiz(false);
        }
      }, 3000);
    } else {
      // Wrong!
      setIsWrong(true);
      playSound('error');
      addError('general_error', { penalty: 5 }); // Minus 5 points
      timeout2Ref.current = setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
      }, 2000);
    }
  };

  if (!showChemicalSymbolsQuiz || !currentSymbol) return null;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md pointer-events-auto p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl p-5 sm:p-6 md:p-8 max-w-lg w-full text-center border border-slate-200/80 relative"
      >
        <button
          onClick={() => {
            playSound('click');
            setShowChemicalSymbolsQuiz(false);
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Đóng bài tập"
        >
          <X size={20} />
        </button>
        <div className="mb-3 md:mb-5 pr-6">
          <h2 className="text-base md:text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Biểu Tượng Cảnh Báo</h2>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Xác định đúng ý nghĩa của biểu tượng hóa chất dưới đây. Chọn sai sẽ bị trừ 5 điểm.</p>
        </div>

        <div className="mb-4 md:mb-4 md:mb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Câu {currentIndex + 1} / {SYMBOLS.length}
          </p>
          
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mx-auto bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center shadow-inner relative mb-3 md:mb-3 md:mb-6 mt-6 overflow-hidden">
            <img src={currentSymbol.image} alt={currentSymbol.name} className="w-full h-full object-contain p-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {options.map((opt, i) => {
            const isSelected = selectedAnswer === opt;
            const isCorrect = opt === currentSymbol.name;
            
            let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-cyan-400";
            
            if (showResult) {
              if (isSelected && isCorrect) {
                btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-200";
              } else if (isSelected && !isCorrect) {
                btnClass = "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-200";
              } else if (isCorrect) {
                btnClass = "bg-emerald-100 border-emerald-300 text-emerald-800";
              } else {
                btnClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(opt)}
                disabled={showResult}
                className={`py-3 md:py-4 px-4 rounded-xl font-bold text-[10px] md:text-sm transition-all active:scale-95 ${btnClass}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {showResult && isWrong && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-rose-600 font-bold bg-rose-50 p-3 rounded-lg border border-rose-200 text-[10px] md:text-sm"
            >
              Sai rồi! Bị trừ 5 điểm an toàn. Hãy chọn lại.
            </motion.div>
          )}
          {showResult && !isWrong && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-emerald-700 font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-[10px] md:text-sm"
            >
              <div className="font-bold text-emerald-800 mb-1">Chính xác!</div>
              {currentSymbol.description}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
