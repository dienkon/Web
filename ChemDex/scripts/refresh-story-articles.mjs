import fs from 'node:fs';
import {realStories} from './data/real-chemistry-stories.mjs';
import {storyApplications,readableVietnamese} from './data/story-applications.mjs';
import {parseFormula} from '../shared/chemistry/formula.mjs';
import {reactionLesson} from '../shared/chemistry/reaction-lesson.mjs';

const file = 'trung-tam/src/data/index.json';
const index = JSON.parse(fs.readFileSync(file,'utf8'));
const elements=JSON.parse(fs.readFileSync('shared/elements.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('shared/reaction-catalog.generated.json','utf8'));
const storyPhotos=JSON.parse(fs.readFileSync('scripts/data/story-photo-sources.json','utf8')).photos;
const compounds={
  'chat-nuoc':{formula:'H2O',model:'cid-962',cid:962},
  'chat-amoniac':{formula:'NH3',model:'cid-222',cid:222},
  'chat-natri-clorua':{formula:'NaCl',model:'crystal-nacl',cid:5234},
  'chat-etanol':{formula:'C2H5OH',model:'cid-702',cid:702},
  'chat-carbon-dioxide':{formula:'CO2',model:'cid-280',cid:280},
  'chat-metan':{formula:'CH4',model:'cid-297',cid:297},
};
function referenceAppendix(meta,element) {
  const compound=compounds[meta.id],formula=compound?.formula??element?.symbol;
  if(!formula)return null;
  const counts=parseFormula(formula), total=Object.values(counts).reduce((sum,n)=>sum+n,0);
  const crystal=formula==='NaCl', mass=Object.entries(counts).reduce((sum,[symbol,n])=>sum+n*elements.find(e=>e.symbol===symbol).mass,0);
  const viewer=compound?`/tien-ich/cau-truc-3d/?compound=${compound.model}`:`/tien-ich/cau-truc-3d/?element=${element.symbol}`;
  const rows=Object.entries(counts).map(([symbol,n])=>`| ${elements.find(e=>e.symbol===symbol).name_en} (${symbol}) | ${n} |`).join('\n');
  const reaction=compound?catalog.entries.find(r=>r.reactants.some(t=>t.formula===formula)&&['combustion','precipitation','neutralization','synthesis'].includes(r.family)):null;
  return `### Tên và công thức\n\n**${meta.title.split(' — ')[0]}**. ${element?`Ký hiệu ${formula} chỉ nguyên tố có **${element.z} proton** trong hạt nhân. Ký hiệu nguyên tố không tự xác định dạng đơn chất hay cách các nguyên tử liên kết với nhau.`:crystal?'NaCl là đơn vị công thức của mạng ion; không mô tả một phân tử NaCl riêng rẽ trong tinh thể.':`Theo công thức ${formula}, một phân tử có ${total} nguyên tử. Công thức giúp đếm thành phần, còn cách nối và hình dạng phải xem thêm cấu tạo.`}\n\n| Nguyên tố | Số đếm trong công thức |\n| --- | --- |\n${rows}\n\n${element?`Nguyên tử khối tương đối theo dữ liệu của nguyên tố: **${element.mass}**. Đây là đại lượng không có đơn vị, khác với số proton và số khối của một đồng vị.`:`Khối lượng mol tính bằng tổng các khối lượng nguyên tử trong công thức: **${mass.toFixed(3)} g/mol**. Giá trị này dùng cho chất được định danh ở đây; một dung dịch còn có dung môi và có nồng độ riêng.`}\n\n### Quan sát mô hình\n\n[Mở cấu trúc liên quan](${viewer}). Đọc đúng tên chất rồi xoay để tìm các vị trí bị che. Đổi kiểu cầu–que hoặc cầu đặc chỉ thay cách quan sát. Màu trên mô hình là quy ước; không suy ra màu thật, mùi hay mức nguy hiểm của chất từ màu quả cầu.\n\n${crystal?'Quan sát sự lặp lại của các ion trong mạng. Công thức biểu diễn tỉ lệ thành phần, không có nghĩa có những cặp ion tách biệt thành từng phân tử.':'Nếu đo khoảng cách hoặc góc, đọc nguồn và điều kiện của cấu trúc. Một sơ đồ đếm thành phần không cung cấp số đo thực nghiệm chỉ nhờ cách các quả cầu được đặt trên màn hình.'}\n\n${reaction?reactionLesson(reaction,{heading:'Một phản ứng để tra cứu',sources:catalog.sources}):'### Phân biệt câu chuyện và dữ liệu chất\n\nCâu chuyện ở trên trình bày một quá trình nghiên cứu có nguồn. Tên người, mốc phát hiện và tiến bộ kỹ thuật không được suy ra từ công thức hóa học. Với một mẫu cụ thể, cần đọc thêm pha, điều kiện và nguồn số liệu trước khi dùng một tính chất để giải thích hiện tượng.'}\n\n### Tự kiểm tra\n\nTheo công thức ${formula}, có bao nhiêu nguyên tử thuộc mỗi nguyên tố? Việc xoay mô hình hoặc thay cách biểu diễn có biến chất đang xem thành một chất mới không?\n\n<details><summary>Xem lời giải</summary>\n\nSố đếm là ${Object.entries(counts).map(([symbol,n])=>`${n} ${symbol}`).join(', ')}. ${crystal?'Đây là tỉ lệ theo đơn vị công thức của mạng ion.':element?'Đó là số đếm theo ký hiệu nguyên tố, không kết luận được dạng đơn chất.':'Đây là thành phần theo công thức phân tử đã ghi.'} Xoay hoặc đổi cách vẽ không làm thay đổi định danh chất; chọn một pha hay cấu trúc khác cần đọc nguồn riêng.\n\n</details>\n\n### Nguồn tra cứu\n\n${compound?`- [PubChem · Định danh chất](https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid})`:`- [Royal Society of Chemistry · ${element.name_en}](https://periodic-table.rsc.org/element/${element.z}/${element.name_en.toLowerCase()})`}\n- [OpenStax · Công thức và khối lượng mol](https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept)\n- [OpenStax · Hợp chất ion và phân tử](https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds)`;
}
for (const meta of index) {
  const story = realStories[meta.id];
  if (!story) continue;
  const path = 'trung-tam/src/data/'+meta.documentPath;
  const article = JSON.parse(fs.readFileSync(path,'utf8'));
  let appendix = /(?:<details data-chemistry-reference>|<!-- chemistry-reference -->\n<details>)<summary>[^<]+<\/summary>\n\n([\s\S]*?)\n\n<\/details>\s*$/.exec(article.content)?.[1]
    ?? article.content.split(/(?=^## )/m).slice(1).filter(section=>!/^## (?:Câu chuyện|Góc nhìn chuyên sâu|Phương pháp nghiên cứu|Lịch sử chuẩn hóa quốc tế|Nguồn)/.test(section)).join('\n\n')
      .replace(/^## /gm,'### ').replace(/Vũ điệu|vũ điệu/g,'Cấu trúc').replace(/kỳ diệu|rực rỡ|hoàn mỹ/g,'');
  meta.title = readableVietnamese(story.title);
  meta.summary = readableVietnamese(story.paragraphs[0]);
  meta.documentKind = 'story';
  meta.author = 'Ban biên tập ChemDex';
  const element=elements.find(element=>element.symbol===/^\d{3}_([A-Z][a-z]?)$/.exec(meta.id)?.[1]);
  if(element) meta.aliases=[...new Set([...(meta.aliases??[]),element.name_vi,element.name_en])];
  appendix=referenceAppendix(meta,element)??appendix;
  if(meta.id==='011_HistoryPT') appendix='### Đọc một ô nguyên tố\n\nSố hiệu nguyên tử cho biết số proton. Ký hiệu xác định nguyên tố; nguyên tử khối chuẩn và số khối của đồng vị là những đại lượng khác nhau.\n\n### Đọc hàng và cột\n\nChu kỳ là một hàng; nhóm là một cột. Các nguyên tố cùng nhóm có những nét tương đồng về cấu hình electron và phản ứng, nhưng không có mọi tính chất giống nhau.\n\n### Tự kiểm tra\n\nVì sao việc dự đoán tính chất một nguyên tố chưa tìm thấy là một phép thử cho bảng?\n\n<details><summary>Xem lời giải</summary>\n\nVì có thể đối chiếu dự đoán với phép đo khi nguyên tố được phát hiện. Sự phù hợp cung cấp bằng chứng cho cách sắp xếp; khác biệt là lý do để xem lại dữ liệu và cách giải thích.\n\n</details>';
  const paragraphs=story.paragraphs.map(p=>readableVietnamese(p.replace('rice, honey và fruit','gạo, mật ong và trái cây')));
  const body = `${paragraphs[0]}\n\n## Bước ngoặt\n\n${paragraphs.slice(1,-1).join('\n\n')}\n\n## Điều câu chuyện để lại\n\n${paragraphs.at(-1)}`;
  const application=storyApplications[meta.id];
  if(!application)throw Error('Missing current application for '+meta.id);
  const photo=storyPhotos.find(p=>p.id===application.photoKey);
  const credit=photo?.credit&&photo.credit!=='Own work'?`; ${photo.credit.replace(/https?:\/\/[^\s;]+/g,url=>`[Tư liệu gốc](${url})`)}`:'';
  const applicationFigure=photo?`\n\n![${photo.alt}](${photo.image})\n\n*${photo.caption} — ${photo.author}${credit}; [${photo.license}](${photo.licenseUrl.replace(/^http:/,'https:')}). [Nguồn ảnh](${photo.sourceUrl}).*`:'';
  const sources=[...new Map([...story.sources,...application.sources].map(row=>[row[1],row])).values()];
  const applicationSection=`## Ứng dụng trong đời sống hôm nay\n\n${application.paragraphs.join('\n\n')}${applicationFigure}`;
  const content = `## ${readableVietnamese(story.heading)}\n\n${body}\n\n![${readableVietnamese(story.heading)}](${meta.image})\n\n${applicationSection}\n\n## Nguồn của câu chuyện\n\n${sources.map(([title,url])=>`- [${title}](${url})`).join('\n')}\n\n<!-- chemistry-reference -->\n<details><summary>Tra cứu công thức, tính chất và phản ứng</summary>\n\n${appendix}\n\n</details>`;
  meta.editorialEvidence={language:'vi',scope:element?'element':'substance',reviewBasis:'existing-story-and-sourced-application',story:{status:'documented',section:readableVietnamese(story.heading),sources:story.sources.map(s=>s[1])},application:{status:'documented',section:'Ứng dụng trong đời sống hôm nay',sources:application.sources.map(s=>s[1])}};
  meta.readingMinutes = Math.max(2,Math.ceil((body+' '+applicationSection).split(/\s+/).length/180));
  fs.writeFileSync(path,JSON.stringify({...article,...meta,content},null,2)+'\n');
}
// These documents teach a practical topic; do not advertise them as historical
// accounts or expose a renderer demonstration as a chemistry article.
for (const [id,title] of [
  ['012_SafetyRules','An toàn phòng thí nghiệm — Chuẩn bị và xử lý tình huống'],
  ['013_HTML_Sample','Đọc mô hình phân tử — Từ công thức đến hình dạng'],
]) {
  const meta=index.find(d=>d.id===id), path='trung-tam/src/data/'+meta.documentPath;
  const article=JSON.parse(fs.readFileSync(path,'utf8'));
  meta.title=title;meta.documentKind='guide';meta.author='Ban biên tập ChemDex';
  if(id==='012_SafetyRules') {
    meta.summary='Nhận biết nguy cơ, chuẩn bị bảo hộ và tìm thiết bị xử lý sự cố trước khi thực hành.';
    article.content=article.content.split(/^## Góc nhìn chuyên sâu/m)[0];
  } else {
    meta.summary='Dùng mô hình để quan sát liên kết, phân biệt hình minh họa với dữ liệu cấu trúc và đặt câu hỏi về hình dạng phân tử.';
    article.content=`## Một công thức chưa kể hết câu chuyện\n\nHai chất có thể có cùng công thức phân tử nhưng cách nối nguyên tử khác nhau. Khi đọc mô hình, hãy bắt đầu bằng tên chất, công thức và nguồn cấu trúc. Điều này giúp biết mình đang quan sát chất nào, thay vì chỉ đoán qua màu của các quả cầu.\n\n## Quả cầu và thanh nối có ý nghĩa gì?\n\nTrong kiểu cầu–que, quả cầu biểu diễn nguyên tử, thanh nối giúp nhìn liên kết. Kích thước quả cầu và độ dày thanh là lựa chọn biểu diễn. Chúng không phải ảnh chụp trực tiếp của một phân tử. Màu sắc cũng là quy ước; đọc bảng chú giải để nhận ra nguyên tố.\n\nKiểu cầu đặc giúp hình dung phần không gian mà các nguyên tử chiếm chỗ, còn kiểu que làm rõ bộ khung. Đổi kiểu vẽ không tạo ra chất mới. Nếu một nguyên tử bị che, xoay toàn bộ mô hình để quan sát từ góc khác trước khi kết luận nó không có mặt.\n\n## Hình học đã được xác định bằng cách nào?\n\nMột cấu trúc có thể dựa trên phép đo thực nghiệm hoặc tính toán. Phân tử ở pha khí và phân tử trong tinh thể không nhất thiết có mọi khoảng cách và góc giống nhau. Đọc nguồn và điều kiện của bản ghi trước khi dùng số đo trên mô hình trong một bài giải.\n\nVới sơ đồ thành phần được tạo từ công thức, vị trí các nhóm có thể chỉ nhằm giúp đếm nguyên tử và điện tích. Khoảng trống giữa các nhóm trên sơ đồ không tự trở thành khoảng cách thực của một mẫu chất.\n\n## Thử quan sát water\n\nMở mô hình water (H₂O). Tìm một nguyên tử oxygen và hai nguyên tử hydrogen. Xoay mô hình để nhìn thấy cả hai liên kết O–H. Ba nguyên tử không nằm trên một đường thẳng. Thử đổi từ cầu–que sang cầu đặc rồi xem phần nào của hình trở nên dễ nhận biết hơn.\n\nSau đó mở một tinh thể sodium chloride. Quan sát sự lặp lại của mạng thay vì tìm một phân tử NaCl độc lập. Cùng một kiểu quả cầu trên màn hình có thể đang biểu diễn những loại cấu trúc rất khác nhau.\n\n## Dùng mô hình để đặt câu hỏi\n\nHãy chọn một câu hỏi cụ thể: có bao nhiêu nguyên tử, nguyên tử nào nối với nguyên tử nào, hay góc giữa hai liên kết là bao nhiêu? Mỗi câu hỏi cần loại thông tin khác nhau. Công thức giúp đếm thành phần; cấu tạo giúp đọc cách nối; tọa độ có nguồn mới cho phép bàn về số đo của bộ cấu trúc đang xem.\n\nĐừng suy ra màu thật, mùi, độ độc hay nhiệt độ sôi chỉ từ màu quả cầu hoặc chuyển động xoay. Những tính chất đó cần nguồn dữ liệu và điều kiện riêng. Mô hình là một cách quan sát có mục đích, hữu ích nhất khi biết nó trả lời được câu hỏi nào.\n\n## Tự kiểm tra\n\nĐổi góc nhìn có làm số nguyên tử thay đổi không? Có thể lấy một sơ đồ đếm thành phần để kết luận khoảng cách giữa hai ion trong dung dịch không?\n\n<details><summary>Xem lời giải</summary>\n\nKhông. Xoay toàn bộ mô hình chỉ thay đổi góc quan sát. Khoảng cách trên sơ đồ thành phần không phải số đo thực nghiệm của dung dịch. Muốn so sánh hình học cần chọn đúng cấu trúc, pha và nguồn dữ liệu.\n\n</details>\n\n## Nguồn và thực hành\n\n- [Mở kho mô hình tương tác](/tien-ich/cau-truc-3d/)\n- [OpenStax · Cấu trúc và cực tính phân tử](https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity)\n- [NIST CCCBDB · Dữ liệu hình học phân tử](https://cccbdb.nist.gov/)`;
  }
  const safety=id==='012_SafetyRules';
  const storyHeading=safety?'Một sự cố đã thay đổi cách nhìn về an toàn':'Từ các vết nhiễu xạ đến mô hình nguyên tử';
  const applicationHeading=safety?'Ứng dụng hôm nay: chuẩn bị trước khi bắt đầu':'Ứng dụng hôm nay: mô hình giúp kiểm tra điều gì?';
  const guideSources=safety?[
    ['CSB · Điều tra sự cố phòng thí nghiệm Texas Tech, 2010','https://www.csb.gov/texas-tech-university-chemistry-lab-explosion/'],
    ['Texas Tech · Kế hoạch thay đổi sau điều tra','https://www.depts.ttu.edu/research/responsible-research/CSB-response/index.php']
  ]:[
    ['IUCr · Công trình nhiễu xạ tia X của hai cha con Bragg','https://www.iucr.org/what-we-do/awards-and-prizes/nobel-prize/w.h.bragg'],
    ['NIST · Cơ sở dữ liệu hình học phân tử','https://cccbdb.nist.gov/']
  ];
  const introduction=safety
    ?'Ngày 7 tháng 1 năm 2010, một vụ nổ xảy ra trong phòng thí nghiệm hóa học tại Texas Tech. Cuộc điều tra của CSB sau đó chỉ ra những thiếu sót có tính hệ thống trong quản lý an toàn nghiên cứu. Câu chuyện không dừng ở một thao tác sai; nó đặt câu hỏi về đánh giá nguy cơ, hướng dẫn, đào tạo và cách thông tin được truyền trong nhóm.\n\nSau sự cố, trường công bố các thay đổi về tổ chức và kiểm tra phòng thí nghiệm. Đó là một ví dụ thực cho thấy an toàn cần được xây dựng vào công việc hằng ngày. Biết tên hóa chất và mang áo blouse không tự thay thế được việc hiểu điều gì có thể xảy ra khi điều kiện thí nghiệm thay đổi.'
    :'Nobel Vật lý 1915 ghi nhận William Henry Bragg và William Lawrence Bragg vì phân tích cấu trúc tinh thể bằng tia X. Điều họ đo được không phải một bức ảnh màu của từng nguyên tử, mà là tín hiệu giúp suy ra cách vật chất được sắp xếp. Từ phép đo đến mô hình luôn có bước giải thích và đối chiếu.\n\nNgày nay, một cấu trúc quay trên màn hình khiến ta dễ quên công việc đứng phía sau: chọn mẫu, thu dữ liệu và xác định mô hình phù hợp. Phân biệt hình vẽ với bằng chứng là kỹ năng cần thiết để dùng công cụ 3D có ích, thay vì coi mọi quả cầu và thanh nối là ảnh chụp trực tiếp của vật chất.';
  const applicationText=safety
    ?'Trước khi thực hành, cần biết quy trình được phép, nguy cơ của hóa chất và thiết bị, giới hạn của thao tác cũng như cách báo sự cố. Khi đổi lượng chất, nhiệt độ, thiết bị hoặc người thực hiện, phải xem lại điều kiện an toàn theo hướng dẫn của nơi học hoặc làm việc. Việc chuẩn bị giúp biến quy tắc trên tường thành quyết định cụ thể trước mỗi thí nghiệm.'
    :'Dữ liệu cấu trúc giúp so sánh hình học và kiểm tra cách các nguyên tử liên kết trong điều kiện đã xác định. Khi mở mô hình, hãy chọn một câu hỏi có thể trả lời bằng dữ liệu đang có: đếm nguyên tử, đọc cấu tạo hoặc xem thông số có nguồn. Mô hình đẹp vẫn cần được đọc cùng tên chất, phương pháp và điều kiện của phép đo.';
  const oldGuide=article.content.replace(/^<!--[ ]*editorial-guide[ ]*-->[\s\S]*?<!--[ ]*\/editorial-guide[ ]*-->\s*/,'');
  article.content=`<!-- editorial-guide -->\n## ${storyHeading}\n\n${introduction}\n\n## ${applicationHeading}\n\n${applicationText}\n\n${guideSources.map(([label,url])=>`[${label}](${url})`).join(' · ')}\n<!-- /editorial-guide -->\n\n${readableVietnamese(oldGuide)}`;
  meta.editorialEvidence={language:'vi',scope:'chemical-family',reviewBasis:'documented-case-and-practice',story:{status:'documented',section:storyHeading,sources:guideSources.map(s=>s[1])},application:{status:'documented',section:applicationHeading,sources:guideSources.map(s=>s[1])}};
  meta.readingMinutes=Math.max(3,Math.ceil(article.content.split(/\s+/).length/180));
  fs.writeFileSync(path,JSON.stringify({...article,...meta},null,2)+'\n');
}
fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n');
console.log(`Updated ${Object.keys(realStories).length} documented stories and two learning guides.`);
