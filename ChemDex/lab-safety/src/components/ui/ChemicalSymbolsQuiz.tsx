import React from 'react';
import { useStore } from '../../store/useStore';
import { PracticalSimulation } from './PracticalSimulation';
import { drag, type PracticalWork } from '../../data/practicalWork';
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
const work: PracticalWork = {
 title:'Gắn nhãn cảnh báo GHS cho mẫu huấn luyện',
 objects: SYMBOLS.map((s,i)=>({id:s.id,label:s.name,model:'label',at:[220,240],image:s.image,fromStep:i,untilStep:i+1})),
 steps: SYMBOLS.map(s=>drag(s.id,[650,240],`Gắn biểu tượng: ${s.name}`,s.description)),
};
export function ChemicalSymbolsQuiz() {
 const open=useStore(s=>s.showChemicalSymbolsQuiz);
 if(!open)return null;
 return <PracticalSimulation work={work} onClose={()=>useStore.getState().setShowChemicalSymbolsQuiz(false)} onComplete={()=>{useStore.getState().completeTask('task_chemical_symbols');useStore.getState().setShowChemicalSymbolsQuiz(false);useStore.getState().saveGame();}}/>;
}
