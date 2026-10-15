import { useAcademy } from '../../academy/core/store';
import React, { useEffect, useRef, useState } from 'react';
import { LabItem, useLabEquipment } from '../../store/useLabEquipment';
import { useStore } from '../../store/useStore';
import { soundManager } from '../../audio/soundManager';

const WORKFLOWS: Partial<Record<LabItem['kind'], { intro:string; steps:string[] }>> = {
  washBottle: {
    intro: 'Bình tia dùng rửa dụng cụ theo hướng dẫn. Không nhầm bình tia với nước uống hay vòi rửa tay.',
    steps: ['Kiểm tra nhãn nước rửa trong bình', 'Hướng vòi vào dụng cụ đặt trên khay', 'Bóp nhẹ và thu gom nước rửa theo hướng dẫn']
  },
  ventilation:{intro:'Kiểm tra cửa sổ và hệ thông gió theo hướng dẫn. Cửa sổ không thay thế tủ hút khi thao tác có hơi nguy hại.',steps:['Quan sát kính, khung và lối thông gió','Báo giáo viên nếu thông gió bất thường','Giữ thông gió theo quy định của phòng']},
  gas:{intro:'Kiểm tra van cấp khí trước và sau buổi đun. Không dùng lửa để dò rò khí.',steps:['Kiểm tra ống và van theo hướng dẫn','Xác nhận giáo viên cho phép cấp khí','Khóa van cấp khí sau thực hành']},
  blanket:{intro:'Nhận diện chăn chữa cháy và thao tác rút chăn trong mô phỏng dưới hướng dẫn.',steps:['Báo động, xác định lối thoát','Kéo hai đai để lấy chăn theo hướng dẫn','Chọn thoát nạn khi tình huống không an toàn']},
  locker:{intro:'Cất ba lô và đồ cá nhân trước khi vào khu vực thao tác.',steps:['Kiểm tra ngăn cất đồ','Đặt ba lô vào ngăn riêng','Đóng ngăn, giữ lối đi thông thoáng']},
  smokeAlarm:{intro:'Nhận diện đầu báo khói và hệ chữa cháy tự động. Không che, tháo hoặc tự vô hiệu hóa thiết bị.',steps:['Kiểm tra thiết bị không bị che khuất','Nhận tín hiệu báo động mô phỏng','Báo giáo viên và thực hiện thoát nạn']},
  workspace:{intro:'Chuẩn bị chỗ làm việc để không làm rơi, đổ dụng cụ.',steps:['Dọn trống mép bàn và lối đi','Đặt dụng cụ đứng vững, xa mép bàn','Kiểm tra bàn sạch và khô']},
  glass:{intro:'Dụng cụ thủy tinh phải nguyên vẹn và phù hợp mục đích.',steps:['Soi kiểm tra nứt, mẻ','Chọn dụng cụ nguyên vẹn','Đặt lên giá đỡ, hướng miệng ra xa người']},
  seat:{intro:'Sắp xếp ghế để ngồi ổn định và không chắn đường thoát.',steps:['Kiểm tra chân ghế vững','Điều chỉnh tư thế làm việc','Xoay ghế gọn dưới bàn']},
  drawer:{intro:'Mở và lấy dụng cụ an toàn; đóng lại sau khi dùng.',steps:['Kiểm tra nhãn ngăn dụng cụ','Mở ngăn và chọn dụng cụ sạch','Đóng ngăn để tránh vướng lối đi']},
  door:{intro:'Thực hành thoát nạn, không quay lại lấy đồ.',steps:['Báo động và báo giáo viên','Kiểm tra lối thoát không có khói, vật cản','Đi theo lối thoát và đến điểm tập kết']},
  electrical:{intro:'Kiểm tra thiết bị điện trước khi cấp nguồn trong mô phỏng.',steps:['Kiểm tra tay và mặt bàn khô','Kiểm tra dây, phích không hỏng','Bật công tắc mô phỏng','Tắt công tắc sau khi dùng']},
  board:{intro:'Dùng bảng học tập để nhận diện thông tin trước buổi thực hành.',steps:['Xác định tên và ký hiệu cần tìm','Đọc chú giải, không suy đoán từ màu sắc','Đối chiếu nhãn dụng cụ trước khi sử dụng']},
  ppe:{intro:'Kiểm tra và mang đồ bảo hộ phù hợp.',steps:['Kiểm tra đồ bảo hộ nguyên vẹn','Mang đúng cách, chỉnh vừa vặn','Xác nhận bảo hộ trước thực hành']},
  shower:{intro:'Luyện thao tác thiết bị khẩn cấp theo hướng dẫn của giáo viên.',steps:['Báo giáo viên và gọi hỗ trợ','Đến vòi rửa hoặc tắm khẩn cấp phù hợp','Bắt đầu rửa và tiếp tục theo quy trình ứng phó']},
  firstAid:{intro:'Không tự dùng thuốc hoặc chạm tay vào vết thương.',steps:['Báo giáo viên, bảo đảm khu vực an toàn','Chọn vật tư sạch theo hướng dẫn','Gọi hỗ trợ y tế khi cần thiết']},
  mirror:{intro:'Kiểm tra trang phục trước khi thực hành.',steps:['Quan sát tóc và cổ áo','Buộc tóc dài gọn, cài áo','Kiểm tra kính và giày kín mũi']},
  spillKit:{intro:'Mẫu chưa biết hoặc sự cố lớn phải giao giáo viên xử lý.',steps:['Cô lập, cảnh báo và báo giáo viên','Kiểm tra PPE và nhãn bộ dụng cụ','Lấy chổi, hốt rác và vật liệu thu gom']},
  extinguisher:{intro:'Chỉ huấn luyện thao tác khi có điều kiện an toàn.',steps:['Xác định lối thoát và báo giáo viên','Chọn bình phù hợp theo hướng dẫn','Mở khóa bằng bài huấn luyện PASS']},
  waste:{intro:'Tách riêng rác sinh hoạt, vật sắc và rác hóa chất.',steps:['Đọc nhãn và xác định loại chất thải','Chọn đúng vật chứa','Đóng nắp, rửa tay sau thu gom']},
};
export function LabInstrumentGame({item,onClose}:{item:LabItem;onClose:()=>void}) {
  const [step,setStep]=useState(0),[value,setValue]=useState(0),[power,setPower]=useState(false),[tare,setTare]=useState(false),[loaded,setLoaded]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('Thực hiện thao tác để hoàn thành thử thách.');
  const [ordered,setOrdered]=useState<number[]>([]),[sample,setSample]=useState(0);
  const [sorted,setSorted]=useState<number[]>([]);
  const timerStarted=useRef(0);
  useEffect(()=>{
    if(item.kind!=='clock'||!power)return;
    const interval=setInterval(()=>setValue((performance.now()-timerStarted.current)/1000),50);
    return()=>clearInterval(interval);
  },[item.kind,power]);
  const equipment=useStore(s=>s.player.equipment);
  const ppe=equipment.hasGoggles&&equipment.hasGloves&&equipment.hasLabCoat;
  const needsPPE=['heat','volume','titration','glass','ph','storage'].includes(item.kind);
  const workflow=WORKFLOWS[item.kind]??WORKFLOWS.glass!;
  const finish=(text:string,active=false)=>{
    if(done)return;
    setDone(true);setMessage(text);useLabEquipment.getState().record(item.id,active);soundManager.play('success');
    const s=useStore.getState();
    if(item.kind==='ppe'&&item.equipKey){s.equipItem(item.equipKey);const task:Record<string,string>={hasGoggles:'task_goggles',hasGloves:'task_gloves',hasLabCoat:'task_coat',hasMask:'task_mask',hasClosedShoes:'task_shoes',hairTied:'task_hair'};if(task[item.equipKey])s.completeTask(task[item.equipKey]);}
    if(item.kind==='spillKit'){s.equipItem('hasSweeper');s.completeTask('task_spill_kit');}
    if(item.kind==='mirror'){s.equipItem('hairTied');s.completeTask('task_hair');}
  };
  const feedback=(text:string)=>{setMessage(text);soundManager.play('error');};
  const sequence=()=>workflow.steps.map((label,index)=>({label,index})).sort((a,b)=>((a.index+1)%3)-((b.index+1)%3));
  const actionClass='rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:border-cyan-400 disabled:opacity-40 disabled:cursor-default';
  const action=(label:string,fn:()=>void,disabled=false)=><button key={label} className={actionClass} onClick={fn} disabled={disabled||done}>{label}</button>;
  return <div role="dialog" aria-modal="true" aria-labelledby="instrument-title" className="fixed inset-0 bg-slate-100/80 backdrop-blur-none p-3 flex items-center justify-center pointer-events-auto text-slate-800">
    <section className="w-full max-w-2xl max-h-[94dvh] overflow-y-auto rounded-3xl border border-cyan-700 bg-white shadow-sm">
      <header className="p-5 border-b border-slate-200 flex justify-between gap-3"><div><p className="text-xs text-cyan-700 uppercase tracking-widest">Dụng cụ tương tác • Thực hành mô phỏng</p><h2 id="instrument-title" className="text-xl font-bold mt-2">{item.title}</h2></div><button onClick={onClose} aria-label="Đóng dụng cụ" className="self-start bg-slate-50 rounded-xl px-3 py-2">✕</button></header>
      <div className="p-5 space-y-4">
        <button type="button" className="acid-action" onClick={()=>{
          const games:Record<string,string>={balance:'balance-5',volume:'volume-25',titration:'sequence-volume',heat:'temperature-40',ph:'decision-measurement-2',hood:'hazard-storage',storage:'sort-storage',glass:'sequence-glass',wash:'sequence-handwash',spillKit:'sort-waste',waste:'sort-waste',ppe:'sequence-ppe',extinguisher:'memory-pass',door:'sequence-evacuate',clock:'memory-units'};
          onClose(); useAcademy.getState().openHub(games[item.kind]??'hazard-bench');
        }}>🎮 Chơi thử thách nâng cao với dụng cụ này</button>
        {needsPPE&&!ppe?<div><p className="text-amber-700 mb-4">Cần kính, găng tay và áo blouse. Hãy lấy và mang bảo hộ tại tủ trước khi dùng thiết bị.</p><button className="acid-action" onClick={onClose}>Quay lại lấy bảo hộ</button></div>:<>
        {item.kind==='clock'?<>
          <p className="text-sm text-slate-600">Luyện ghi thời gian thực: bắt đầu đếm, chờ tối thiểu 1 giây rồi dừng và ghi kết quả.</p>
          <div className="rounded-2xl bg-slate-50 p-8 text-center"><output className="font-mono text-5xl text-cyan-700">{value.toFixed(2)} s</output></div>
          <div className="flex gap-2 flex-wrap">{action('Bắt đầu bấm giờ',()=>{timerStarted.current=performance.now();setValue(0);setPower(true);},power)}{action('Dừng và ghi thời gian',()=>{setPower(false);if(value>=1)finish(`Đã ghi ${value.toFixed(2)} giây. Dùng thời gian được chỉ định trong quy trình thực hành.`);else feedback('Chưa đủ 1 giây luyện tập. Bắt đầu lại rồi chờ trước khi dừng.');},!power)}</div>
        </>:item.kind==='balance'?<>
          <p className="text-sm text-slate-600">Cân mẫu 5,00 g: bật nguồn, đặt vật chứa, trừ bì rồi thêm mẫu.</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center"><div className="text-4xl mb-4">{loaded?'⚗️':'⚖️'}</div><output className="font-mono text-4xl text-emerald-700">{power?`${((loaded&&!tare?12:0)+value/10).toFixed(2)} g`:'OFF'}</output></div>
          <div className="flex gap-2 flex-wrap">{action(power?'Tắt nguồn':'Bật nguồn',()=>{setPower(!power);setTare(false);setLoaded(false);setValue(0);})}{action('Đặt cốc cân',()=>{setLoaded(true);setTare(false);},!power)}{action('Trừ bì (TARE)',()=>{setTare(true);setValue(0);},!power||!loaded)}{action('Thêm 1 g',()=>tare?setValue(v=>Math.min(100,v+10)):feedback('Phải trừ bì vật chứa trước khi thêm mẫu.'),!power||!loaded)}{action('Bớt 1 g',()=>setValue(v=>Math.max(0,v-10)),!tare)}{action('Ghi khối lượng',()=>value===50&&tare&&power?finish('Đã cân đúng 5,00 g sau khi trừ bì. Không đặt hóa chất trực tiếp lên đĩa cân.'):feedback('Kiểm tra nguồn, trừ bì và lượng mẫu: cần đúng 5,00 g.'))}</div>
        </>:item.kind==='volume'?<>
          <p className="text-sm text-slate-600">Đo 25 mL nước mô phỏng. Đọc đáy mặt khum ngang tầm mắt.</p>
          <div className="flex justify-center gap-8 items-center rounded-2xl bg-slate-50 p-5"><div className="relative w-24 h-44 border-2 border-cyan-200 rounded-b-xl overflow-hidden"><div className="absolute bottom-0 w-full bg-cyan-400/60 border-t-4 border-cyan-100 rounded-t-[50%]" style={{height:`${value*3}px`}}/><span className="absolute inset-0 text-right p-2 font-mono leading-8">50 ─<br/>40 ─<br/>30 ─<br/>20 ─<br/>10 ─</span></div><output className="text-3xl font-mono">{value} mL</output></div>
          <label className="block text-sm">Điều chỉnh lượng nước<input aria-label="Thể tích nước" className="block w-full my-4 accent-cyan-400" type="range" min="0" max="50" value={value} disabled={done} onChange={e=>setValue(+e.target.value)}/></label>
          <div className="flex gap-2 flex-wrap">{action(tare?'✓ Mắt ngang vạch':'Đặt mắt ngang vạch',()=>setTare(true))}{action('Đọc và ghi thể tích',()=>value===25&&tare?finish('Đọc đúng đáy mặt khum tại 25 mL, mắt ngang vạch. Dùng dụng cụ phù hợp độ chính xác cần thiết.'):feedback('Cần đúng 25 mL và đặt mắt ngang vạch trước khi đọc.'))}</div>
        </>:item.kind==='titration'?<>
          <p className="text-sm text-slate-600">Điều khiển khóa buret, nhỏ từng giọt và dừng ở màu hồng nhạt của mẫu mô phỏng.</p>
          <div className="flex gap-8 justify-center items-center p-6 bg-slate-50 rounded-2xl"><div className="w-8 h-44 border border-cyan-200 rounded-b-full bg-cyan-100/20 text-center">⋮<br/>⋮<br/>⋮<br/>↧</div><div className="w-28 h-28 rounded-b-3xl border-2 border-white/50 flex items-center justify-center transition-colors" style={{background:value<8?'#38bdf833':value<=10?'#f9a8d488':'#db2777'}}>{value} giọt</div></div>
          <div className="flex gap-2 flex-wrap">{action(power?'✓ Khóa đã kiểm tra':'Kiểm tra khóa và kẹp buret',()=>setPower(true))}{action('Nhỏ 1 giọt',()=>setValue(v=>v+1),!power||value>=15)}{action('Dừng và đọc điểm cuối',()=>value>=8&&value<=10?finish('Đã dừng ở màu hồng nhạt trong mô phỏng. Ghi số đọc đầu/cuối để tính thể tích; điểm cuối thật phụ thuộc chỉ thị và quy trình.'):feedback(value>10?'Đã quá điểm cuối. Đặt lại mẫu và nhỏ chậm hơn.':'Mẫu chưa đạt điểm cuối mô phỏng.'))}{action('Đặt lại mẫu',()=>setValue(0))}</div>
        </>:item.kind==='heat'?<>
          <p className="text-sm text-slate-600">Gia nhiệt mẫu nước mô phỏng đến mức được giao 40°C, sau đó tắt thiết bị. Không đun bình kín.</p>
          <div className={`p-8 rounded-2xl text-center border ${power?'border-orange-400 bg-orange-950/30':'border-slate-200 bg-slate-50'}`}><div className="text-5xl">♨</div><output className="block font-mono text-3xl mt-4">{power?20+value:20}°C • {power?'Đang gia nhiệt':'Đã tắt'}</output></div>
          <div className="flex flex-wrap gap-2">{action(tare?'✓ Bình chịu nhiệt, không đậy kín':'Kiểm tra bình và giá đỡ',()=>setTare(true))}{action(power?'Tắt gia nhiệt':'Bật gia nhiệt',()=>{if(!tare){feedback('Kiểm tra dụng cụ trước khi gia nhiệt.');return;}if(power&&value===20){setPower(false);finish('Đã đạt mức mô phỏng và tắt nguồn. Dụng cụ còn nóng: dùng kẹp phù hợp và chờ nguội.');}else setPower(!power);})}{action('Tăng 5°C',()=>setValue(v=>Math.min(50,v+5)),!power)}{action('Giảm 5°C',()=>setValue(v=>Math.max(0,v-5)),!power)}</div>
        </>:item.kind==='ph'?<>
          <p className="text-sm text-slate-600">Chọn mẫu, nhúng giấy chỉ thị rồi phân loại môi trường. Không nếm hay ngửi trực tiếp.</p>
          <div className="flex flex-wrap gap-2">{['Mẫu axit','Nước trung tính','Mẫu bazơ'].map((name,i)=><button key={name} className={actionClass} disabled={done} onClick={()=>{setSample(i);setLoaded(false);setValue(0);}}>{name}</button>)}</div>
          <div className="bg-slate-50 p-6 rounded-2xl flex justify-center gap-8"><div className="text-5xl">🧪</div><div className="w-8 h-28 rounded border border-white/40" style={{background:loaded?['#ef4444','#a855f7','#2563eb'][sample]:'#e2e8f0'}}/></div>
          <div className="flex gap-2 flex-wrap">{action('Nhúng giấy chỉ thị',()=>setLoaded(true))}{['Axit','Trung tính','Bazơ'].map((name,i)=>action(name,()=>i===sample?finish(`Phân loại đúng: ${name}. Chỉ thị cho thông tin về môi trường, không đủ để nhận diện chất lạ.`):feedback('So lại màu giấy chỉ thị với bảng đối chiếu.'),!loaded))}</div>
        </>:item.kind==='hood'?<>
          <p className="text-sm text-slate-600">Bật hút và hạ cửa đến vạch làm việc; đậy mẫu trước khi tắt hút.</p>
          <div className="h-40 bg-slate-50 border border-slate-500 relative overflow-hidden rounded-xl"><div className="absolute inset-x-0 top-0 bg-cyan-100/30 border-b-4 border-cyan-200" style={{height:`${100-value}%`}}/><div className="absolute bottom-4 left-1/2">⚗️ {power?'↑ ↑ ↑':''}</div></div>
          <label className="block">Độ mở cửa: {value}%<input aria-label="Độ mở cửa tủ hút" type="range" min="0" max="100" value={value} className="w-full accent-cyan-400" onChange={e=>setValue(+e.target.value)} disabled={done}/></label>
          <div className="flex gap-2 flex-wrap">{action(power?'✓ Hút đang bật':'Bật hút',()=>setPower(true))}{action('Đậy mẫu, kết thúc thao tác',()=>power&&value>=20&&value<=40?finish('Đã thao tác với hút bật, cửa ở vùng vạch mô phỏng và mẫu được đậy. Theo vạch làm việc của thiết bị thực tế.'):feedback('Bật hút và đưa cửa về vùng làm việc 20–40% trong mô phỏng.'))}</div>
        </>:item.kind==='storage'?<>
          <p className="text-sm text-slate-600">Đưa từng chai vào nhóm tương thích; không xếp hóa chất theo bảng chữ cái.</p>
          <div className="p-6 rounded-xl bg-slate-50 text-center text-xl">🧴 {['Dung môi dễ cháy','Axit ăn mòn','Bazơ ăn mòn'][Math.min(sorted.length,2)]}</div>
          <div className="grid gap-2">{['Tủ dung môi dễ cháy','Khu axit tách riêng','Khu bazơ tách riêng'].map((label,i)=>action(label,()=>{if(i!==sorted.length){feedback('Chọn khu tương thích với nhãn chai; axit và bazơ phải tách riêng.');return;}setSorted(v=>[...v,i]);if(sorted.length===2)finish('Đã phân loại đủ 3 nhóm; đọc SDS và hướng dẫn tương thích cụ thể trước khi lưu trữ.');}))}</div>
        </>:item.kind==='wash'?<>
          <p className="text-sm text-slate-600">Sắp thứ tự rửa tay sau thực hành. Vòi và xà phòng đều có bước sử dụng riêng.</p>
          <div className={`p-5 rounded-xl text-center text-4xl ${ordered.length>0&&ordered.length<5?'bg-cyan-100':'bg-slate-50'}`}>🚰 {ordered.length>=2&&ordered.length<5?'🫧':'👐'}</div>
          <div className="grid gap-2">{['Làm ướt tay','Lấy xà phòng','Chà đủ các bề mặt bàn tay','Rửa sạch xà phòng','Lau khô bằng giấy sạch','Tắt vòi, bỏ giấy đúng thùng'].map((label,i)=>({label,i})).sort((a,b)=>(a.i+3)%6-(b.i+3)%6).map(({label,i})=>action(`${ordered.includes(i)?'✓ ':''}${label}`,()=>{if(i!==ordered.length){feedback('Thực hiện theo trình tự: làm ướt → xà phòng → chà → rửa → lau khô → kết thúc.');return;}setOrdered(v=>[...v,i]);if(i===5)finish('Hoàn tất chu trình rửa tay. Chà rửa theo hướng dẫn vệ sinh của nhà trường.');},ordered.includes(i)))}</div>
        </>:<>
          <p className="text-sm text-slate-600">{workflow.intro}</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><p className="text-cyan-700 mb-2">Thao tác đúng trình tự • {step}/{workflow.steps.length}</p><div className="h-2 rounded-full bg-slate-50"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{width:`${step/workflow.steps.length*100}%`}}/></div></div>
          <div className="grid gap-2">{sequence().map(({label,index})=>action(`${index<step?'✓ ':''}${label}`,()=>{if(index!==step){feedback('Chọn bước an toàn cần làm trước, rồi mới thao tác tiếp.');return;}if(item.kind==='electrical')useLabEquipment.getState().setActive(item.id,index===2);if(item.kind==='drawer')useLabEquipment.getState().setActive(item.id,index===1);
              setStep(v=>v+1);if(step===workflow.steps.length-1){if(item.kind==='extinguisher'){if(useStore.getState().player.flags.passTrained)useLabEquipment.getState().record(item.id);onClose();useStore.getState().equipItem('hasFireExtinguisher');}else finish('Đã thực hiện đủ trình tự và ghi nhận kỹ năng sử dụng.',['seat','door'].includes(item.kind));}},index<step))}</div>
        </>}
        <p role="status" aria-live="polite" className={`rounded-xl border p-4 text-sm leading-relaxed ${done?'border-emerald-600 bg-emerald-100/40 text-emerald-700':'border-cyan-900 bg-cyan-100/30 text-cyan-700'}`}>{done?'✓ ':''}{message}</p>
        {done&&<button className="acid-action" onClick={onClose}>Hoàn thành • Trở lại phòng</button>}
        </>}
      </div>
    </section>
  </div>;
}
