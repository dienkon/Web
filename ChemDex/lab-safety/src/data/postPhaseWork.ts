import { PRACTICAL_WORK, o, drag, hold, trace, adjust, type PracticalWork, type WorkStep, type WorkPlacement } from './practicalWork';

export const POST_PHASE_VERSION = 2;
export const POST_PHASE_IDS = ['alcohol-cap','electrical','fume','evacuation','unknown-bottle','cracked-glass','gas-hose','hot-glass','incompatible-storage','pipette-bulb','centrifuge-balance','blocked-exit','eye-protection','dirty-gloves','waste-mixing','vacuum-check','reagent-return','crowded-bench','shutdown-check'];
const p=(object:string,x:number,y:number,label:string):WorkPlacement=>({object,target:[x,y],label,radius:38});
const arrange=(instruction:string,placements:WorkPlacement[],detail:string):WorkStep=>({mode:'arrange',object:placements[0].object,target:placements[0].target,instruction,placements,detail});
const inspect=(objects:PracticalWork['objects'],facts:[string,string,string][]):WorkStep=>({mode:'inspect',object:facts[0][0],target:objects.find(o=>o.id===facts[0][0])!.at,instruction:'Quan sát cận cảnh và kiểm tra từng vật thể',detail:'Mở từng vật để đọc dấu hiệu, thông số và ghi nhận kiểm tra. Cần kiểm tra đủ trước khi thao tác.',inspections:facts.map(([object,title,detail])=>({object,title,detail}))});
const EVIDENCE:Record<string,[string,string,string][]>={
 'unknown-bottle':[['label','Nhãn không còn nhận diện được','Dừng sử dụng và giữ nguyên chai; không đoán tên chất từ màu hoặc hình dạng.'],['bottle','Kiểm tra tình trạng nắp từ bên ngoài','Không mở, ngửi hoặc trộn thử. Báo người phụ trách để đánh giá tình trạng chai.'],['tray','Khay cách ly riêng','Để chai chưa rõ trong khu vực được hướng dẫn, có biển không sử dụng.']],
 'cracked-glass':[['glass','Vết nứt trên dụng cụ','Cốc nứt không được tiếp tục sử dụng, kể cả khi chưa thấy rò rỉ.'],['pan','Dụng cụ bảo vệ khi thu gom','Dùng hốt và dụng cụ phù hợp, tránh chạm vào cạnh nứt.'],['bin','Hộp cứng chống đâm thủng','Tách vật sắc khỏi rác thường, không để cạnh sắc xuyên ra ngoài.']],
 'gas-hose':[['cable','Ống và đầu nối','Đường ống có dấu hiệu bất thường phải ngừng dùng và bàn giao kiểm tra.'],['valve','Van cấp khí','Giữ nguồn đóng theo hướng dẫn; không mở lại trong lúc đang kiểm tra.'],['label','Biển ngừng sử dụng','Biển phải ở vị trí nhìn thấy được để người khác không khởi động thiết bị.']],
 'hot-glass':[['glass','Cốc có thể còn nóng','Thủy tinh nóng có thể trông giống thủy tinh nguội. Không thử nhiệt bằng tay.'],['glove','Kẹp chịu nhiệt','Dùng dụng cụ phù hợp khi được hướng dẫn di chuyển cốc nóng.'],['tray','Vùng để nguội chịu nhiệt','Đặt cốc đứng vững, giữ khoảng trống và đặt biển nóng.']],
 'incompatible-storage':[['bottle','Chai nhóm axit','Giữ nhãn và khay riêng theo sơ đồ lưu trữ của phòng.'],['oxidizer','Nhóm chất oxy hóa','Tách khỏi dung môi và các nhóm không tương thích theo hướng dẫn.'],['solvent','Nhóm dung môi','Dùng khoang riêng và đọc hướng dẫn tương thích trước khi xếp.']],
 'pipette-bulb':[['pipette','Pipet và đầu hút','Kiểm tra dụng cụ nguyên vẹn và không để đầu pipet chạm mặt bàn.'],['bulb','Bóng hút cơ học','Lắp bóng hút phù hợp, không hút bằng miệng hoặc hút mẫu tràn vào bóng.'],['glass','Cốc mẫu đã xác định','Thao tác với mẫu theo hướng dẫn; pipet đã dùng cần xử lý và bảo quản đúng quy trình.']],
 'blocked-exit':[['bag','Đồ cá nhân trên lối đi','Cất về khu quy định, không chuyển sang chắn cửa khác.'],['crate','Thùng dụng cụ chắn đường','Đưa thùng khỏi dải di chuyển và các thiết bị an toàn.'],['person','Đường đi của người học','Kiểm tra liên tục toàn tuyến sau khi dọn, thay vì chỉ nhìn vị trí ban đầu.']],
 'eye-protection':[['goggles','Kính chống bắn','Kiểm tra kính nguyên vẹn, che kín vùng mắt theo hướng dẫn.'],['label','Dây đeo','Chỉnh vừa và ổn định, không siết gây đau.'],['person','Vùng cần được bảo vệ','Kính phải bảo vệ cả các vùng bên cạnh mắt, không chỉ phần chính giữa.']],
 'dirty-gloves':[['glove','Mặt ngoài găng nhiễm','Không để mặt ngoài chạm da hoặc vật dụng cá nhân khi tháo.'],['glove2','Mặt trong găng còn lại','Luồn từ mặt trong cổ găng để bọc găng thứ nhất, tránh nhiễm bẩn tay.'],['bin','Vật chứa găng thải','Dùng vật chứa phù hợp loại nhiễm, sau đó rửa tay đúng quy trình.']],
 'waste-mixing':[['label','Nhãn chất thải','Danh tính, nhóm thải và hướng dẫn xử lý phải rõ trước khi chuyển.'],['bottle','Chai chất thải nhóm một','Giữ nắp kín và khay riêng; không trộn vì có vẻ giống nhau.'],['bottle2','Chai khác nhóm','Chai này cần khay độc lập, không đổ chung với chai nhóm một.']],
 'vacuum-check':[['glass','Bình chịu chân không','Chỉ dùng loại bình được thiết kế cho mục đích hút, không dùng cốc thường.'],['cable','Ống và khớp nối','Kiểm tra đầu nối và tình trạng ống theo hướng dẫn trước khi lắp.'],['label','Tấm chắn','Đặt chắn bảo vệ đúng vùng trước khi bàn giao việc kiểm tra hệ.']],
 'reagent-return':[['bottle','Chai gốc dùng chung','Giữ chai gốc đóng kín, không đổ mẫu đã lấy trở lại.'],['glass','Mẫu dư','Mẫu đã lấy có thể bị nhiễm chéo, cần giữ riêng và ghi nhận.'],['tray','Khay bàn giao','Người phụ trách quyết định cách xử lý mẫu dư theo hướng dẫn.']],
 'crowded-bench':[['bag','Ba lô chiếm vùng thao tác','Cất đồ cá nhân ngoài vùng thí nghiệm trước khi sắp dụng cụ.'],['bottle','Chai ở sát mép bàn','Đặt chai đứng ở vùng ổn định, tránh mép và đường tay thao tác.'],['cable','Dây dẫn qua vùng làm việc','Luồn dây gọn theo mép sau, không kéo qua chai hoặc lối tay.']],
 'shutdown-check':[['switch','Nguồn thiết bị','Đưa nguồn về tắt trước khi thu dọn theo hướng dẫn.'],['bottle','Chai mẫu chưa cất','Đóng nắp trước khi chuyển về vị trí lưu trữ được quy định.'],['valve','Van khí','Khóa và kiểm tra lại nguồn cấp trước khi báo kết thúc.']],
};

/** Every advanced exercise has its own preparation, operations and final state. */
export function getPostPhaseWork(id:string):PracticalWork {
 const original=PRACTICAL_WORK[id];
 if(!original)throw new Error(`Unknown post-phase exercise: ${id}`);
 const work:PracticalWork={...original,objects:original.objects.map(o=>({...o,at:[...o.at]})),steps:original.steps.map(s=>({...s}))};
 const facts:[string,string,string][]=[...(EVIDENCE[id]??[])];
 switch(id){
 case 'crowded-bench':
  work.steps=[...work.steps.slice(0,1),arrange('Tự bố trí chai, cốc và khay vào ba vùng riêng',[
   p('bottle',290,200,'Vùng chai đứng'),p('glass',480,300,'Vùng thao tác cốc'),p('tray',710,300,'Vùng khay dụng cụ')
  ],'Có thể chuyển các món theo thứ tự bất kỳ. Chừa khoảng trống và giữ chúng xa mép bàn.'),work.steps[2],work.steps.at(-1)!];break;
 case 'centrifuge-balance':
  work.objects.forEach(o=>{const mass:{[id:string]:string}={tube1:'Mẫu A · 5 g',tube2:'Đối trọng A · 5 g',tube3:'Mẫu B · 8 g',tube4:'Đối trọng B · 8 g'};if(mass[o.id])o.label=mass[o.id];});
  facts.splice(0,facts.length,['tube1','Cặp A: 5 g + 5 g','Hai ống cùng khối lượng đặt ở hai vị trí đối diện.'],['tube3','Cặp B: 8 g + 8 g','Cặp B phải đối diện nhau; không ghép ống 5 g với ống 8 g.'],['rotor','Rotor và khóa nắp','Chỉ đóng nắp khi các ống đã ngồi đúng vị trí và cân bằng.']);
  work.steps=[arrange('Lắp đủ hai cặp ống đối diện vào rotor',[p('tube1',450,180,'Mẫu A · 5 g'),p('tube2',450,340,'Đối diện A · 5 g'),p('tube3',370,260,'Mẫu B · 8 g'),p('tube4',530,260,'Đối diện B · 8 g')],'Kéo từng ống vào hốc tương ứng. Kiểm tra khối lượng trên nhãn trước khi lắp.'),...work.steps.slice(4),adjust('rotor',[450,260],0,'Xác nhận máy đã dừng trước khi mở','Đưa chỉ báo mô phỏng về 0; không mở nắp khi rotor còn quay.'),drag('cap',[450,90],'Mở nắp sau khi máy đã dừng'),arrange('Lấy từng ống về giá riêng',[p('tube1',160,180,'Giá A'),p('tube2',170,330,'Giá đối trọng A'),p('tube3',740,180,'Giá B'),p('tube4',730,330,'Giá đối trọng B')],'Giữ ống đứng và lấy từng món; không để ống lăn trên mặt bàn.')];break;
 case 'incompatible-storage':
  work.steps=[work.steps[0],arrange('Phân tách đồng thời ba nhóm hóa chất',[p('bottle',170,350,'Khay axit'),p('oxidizer',440,140,'Khoang oxy hóa'),p('solvent',710,350,'Khay dung môi')],'Đọc nhãn từng chai. Không dùng thứ tự chữ cái để suy ra tính tương thích.'),work.steps.at(-1)!,hold('solvent',[710,350],'Kiểm tra vùng dung môi đã tách khỏi chất oxy hóa','Ba nhóm phải nằm trong các khoang riêng theo quy định của phòng lab.')];break;
 case 'waste-mixing':
  work.steps=[...work.steps.slice(0,2),arrange('Chuyển hai chai thải sang hai khay độc lập',[p('bottle',650,150,'Khay chất thải nhóm 1'),p('bottle2',650,370,'Khay chất thải nhóm 2')],'Giữ nguyên nắp và nhãn; không rót trộn để thử.'),work.steps.at(-1)!,hold('bottle2',[650,370],'Kiểm tra nắp và nhãn chai thứ hai','Mỗi chai được ghi nhận riêng; kiểm tra một chai không thay thế chai còn lại.')];break;
 case 'blocked-exit':
  work.steps=[work.steps[0],arrange('Giải phóng lối đi bằng cách cất từng vật',[p('bag',130,130,'Tủ đồ cá nhân'),p('crate',740,130,'Khu dụng cụ')],'Không chuyển vật cản từ lối chính sang cửa thoát hoặc vùng tập kết.'),work.steps.at(-1)!,hold('report',[820,90],'Báo giáo viên lối đi đã được giải phóng','Lối thoát phải giữ thông thoáng trong cả buổi thực hành.')];break;
 case 'unknown-bottle':
  work.objects.push(o('log','Phiếu bàn giao','label',150,370));
  work.steps.push(drag('log',[650,150],'Chuyển phiếu ghi nhận sang vùng bàn giao','Ghi nhận vị trí và tình trạng nhãn; không tự suy đoán tên chất.'),hold('report',[820,90],'Bàn giao chai đã cô lập cho người phụ trách','Giữ nguyên nắp và biển không sử dụng trong khi chờ xử lý.'));break;
 case 'cracked-glass':
  work.objects.push(o('replacement','Cốc thay thế nguyên vẹn','glass',150,390),o('probe','Kính lúp kiểm tra','magnifier',650,110));
  work.objects.find(o=>o.id==='pan')!.at=[170,250];
  work.steps.push(drag('replacement',[320,240],'Đưa cốc thay thế vào vùng làm việc', 'Chỉ dùng dụng cụ nguyên vẹn sau khi cốc nứt đã được loại khỏi khu vực.'),trace('probe',[[295,205],[345,205],[345,270],[295,270],[295,205]],'Soi quanh thành và miệng cốc thay thế','Kiểm tra cả vật thay thế trước khi đưa vào sử dụng.'));break;
 case 'gas-hose':
  work.objects.push(o('probe','Kính lúp kiểm tra','magnifier',650,360));work.steps.forEach(s=>{if(s.mode==='trace')s.object='probe';});
  work.steps.push(hold('report',[820,90],'Bàn giao việc thay ống và kiểm tra rò rỉ','Học sinh không tự tháo sửa đường khí. Giữ van đóng và biển ngừng dùng cho tới khi người phụ trách xác nhận.'),hold('valve',[210,150],'Kiểm tra van vẫn ở trạng thái đóng','Không tự mở lại nguồn chỉ vì đã quan sát hết đường ống.'));break;
 case 'hot-glass':
  work.objects.find(o=>o.id==='glove')!.model='tongs';
  work.steps.push(drag('glove',[180,340],'Trả kẹp cách nhiệt về giá riêng','Biển nóng và cốc vẫn ở đế chịu nhiệt; không thử nhiệt bằng tay.'),hold('tray',[680,250],'Kiểm tra đế và khoảng trống quanh cốc','Giữ vùng làm nguội không bị vật khác chen vào.'));break;
 case 'pipette-bulb':
  work.objects.find(o=>o.id==='bulb')!.follow={object:'pipette',offset:[0,-60],fromStep:2};
  work.objects.sort((a,b)=>a.id==='tray'?-1:b.id==='tray'?1:0);
  work.objects.push(o('rinse','Cốc nước rửa theo quy trình','glass',450,380));
  work.steps.splice(work.steps.length-1,0,drag('pipette',[450,350],'Chuyển pipet tới cốc rửa theo hướng dẫn','Đầu pipet không chạm mặt bàn.'),hold('pipette',[450,350],'Thực hành làm sạch trước khi cất','Dùng quy trình rửa và thu gom dịch rửa được phòng lab quy định.'));break;
 case 'eye-protection':
  work.objects.push(o('probe','Kính lúp kiểm tra','magnifier',730,100));
  work.steps.push(trace('probe',[[410,145],[450,135],[490,145],[490,185],[450,195],[410,185],[410,145]],'Kiểm tra đường bao kín quanh kính','Quan sát vùng bảo vệ bên trên, hai bên và phía dưới, không chỉ phần chính giữa.'));break;
 case 'dirty-gloves':
  work.objects.push(o('soap','Xà phòng','soap',130,100),o('paper','Giấy lau sạch','paper',730,100),{...o('hands','Bàn tay đã tháo găng','glove',160,400),fromStep:5});
  work.steps.forEach(s=>{if(s.object==='water'&&s.mode==='trace')s.object='hands';});
  work.steps.splice(2,0,drag('glove',[500,310],'Bọc găng thứ nhất vào găng đã lộn','Giữ hai mặt nhiễm bên trong trước khi chuyển sang vật chứa.'));work.objects.find(o=>o.id==='glove')!.untilStep=4;
  work.steps.splice(work.steps.length-1,0,drag('soap',[190,290],'Lấy xà phòng ở bồn rửa','Không dùng găng bẩn chạm vào vật dụng cá nhân.'));
  work.steps.push(drag('paper',[190,350],'Lau khô tay bằng giấy sạch','Hoàn tất rửa tay theo quy trình của phòng lab trước khi chạm vật dụng cá nhân.'));break;
 case 'vacuum-check':
  work.objects.find(o=>o.id==='glass')!.model='vacuumFlask';work.objects.find(o=>o.id==='label')!.model='shield';
  work.objects.push(o('probe','Kính lúp kiểm tra','magnifier',730,380));work.steps.forEach(s=>{if(s.mode==='trace')s.object='probe';});
  work.steps.push(adjust('valve',[200,200],100,'Mô phỏng xả áp theo chỉ dẫn trước khi tháo','Chỉ người được hướng dẫn thực hiện việc xả áp bằng cơ cấu phù hợp.'),hold('report',[820,90],'Nhận xác nhận hệ đã về áp suất an toàn','Không tháo ống hoặc mở bình khi hệ còn chênh áp.'));break;
 case 'reagent-return':
  work.steps.push(hold('report',[820,90],'Bàn giao mẫu dư riêng cho người phụ trách','Giữ chai gốc đóng kín; người phụ trách quyết định phương án xử lý mẫu dư.'));break;
 case 'shutdown-check':
  work.steps.splice(2,0,hold('switch',[440,180],'Kiểm tra nguồn đã tắt trước khi thu dọn','Mức điều khiển đã về 0 trong mô phỏng; không tự tháo dây hoặc sửa ổ cắm.'));
  work.steps.push(hold('valve',[180,180],'Đối chiếu lần cuối trạng thái van','Không bỏ qua việc kiểm tra nguồn sau khi sắp lại vật dụng.'));break;
 case 'electrical':
  facts.push(['water','Vùng nước nguy hiểm','Không chạm vào nước, ổ điện hoặc dây; trước hết giữ khoảng cách.'],['switch','Nguồn cấp','Người có trách nhiệm thực hiện việc cô lập và kiểm tra nguồn.'],['label','Ranh giới cảnh báo','Đặt biển từ phía ngoài vùng nguy hiểm.']);
  work.steps.push(hold('label',[450,380],'Kiểm tra ranh giới cảnh báo còn ở đúng vị trí','Chỉ bỏ cảnh báo khi người phụ trách cho phép.'));break;
 case 'fume':
  work.objects.find(o=>o.id==='label')!.model='hood';work.objects.find(o=>o.id==='tray')!.at=[450,240];
  work.steps.forEach(s=>{if((s.object==='bottle'&&s.target[0]===620)||s.object==='tray')s.target=[450,230];});
  facts.push(['switch','Chỉ báo hệ hút','Cần xác nhận hệ hút hoạt động trước khi đặt mẫu.'],['label','Cửa chắn và vạch hướng dẫn','Mức 40 là vạch riêng của mô hình; thiết bị thực tế phải theo vạch của nhà sản xuất.'],['tray','Vùng làm việc','Không để chai hoặc dụng cụ chắn khe hút.']);
  work.steps.push(drag('bottle',[260,350],'Lấy mẫu đã đóng kín khỏi vùng thao tác','Thu dọn theo quy trình khi hệ hút còn hoạt động.'),hold('tray',[450,240],'Kiểm tra khe hút không còn bị vật che','Không dùng tủ hút làm nơi cất hóa chất.'));break;
 case 'evacuation':
  facts.push(['switch','Nút báo động','Xác định vị trí trước khi cần sử dụng.'],['bag','Đồ cá nhân','Không quay lại lấy đồ khi đang sơ tán.'],['person','Đường di chuyển','Đi theo hướng dẫn tới điểm tập kết, không tự quay vào vùng nguy hiểm.']);
  work.steps.push(hold('person',[820,300],'Ở lại điểm tập kết sau khi điểm danh','Chờ hướng dẫn; không rời đi hoặc tự quay lại tìm người.'));break;
 case 'alcohol-cap':
  facts.push(['burner','Đèn và bấc','Giữ đèn đứng vững; không thêm nhiên liệu khi còn cháy hoặc còn nóng.'],['cap','Nắp dập phù hợp','Hạ nắp phủ bấc, không đẩy ngang làm lật đèn và không thổi.'],['bottle','Chai nhiên liệu','Đóng kín và giữ ngoài vùng nhiệt trước khi thao tác.']);
  work.steps.push(hold('tray',[470,380],'Giữ đèn trên vùng chịu nhiệt sau khi tắt','Không nhấc nắp hoặc nạp nhiên liệu ngay sau hiệu ứng lửa tắt.'));break;
 }
 work.steps.unshift(inspect(work.objects,facts));
 return work;
}
