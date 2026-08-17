import { useState } from 'react';
import { BookOpen, ShieldAlert, Target, Award, Info, HelpCircle, Swords, Play, Users, Hammer } from 'lucide-react';

type TabType = 'rules' | 'ranks' | 'modes' | 'ops';

export default function Help() {
  const [activeTab, setActiveTab] = useState<TabType>('rules');

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-6 px-4 sm:px-6 pb-12 min-w-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight break-words">
          Cổng Tri Thức & Sách Hướng Dẫn
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tìm hiểu toàn bộ cơ chế tính điểm, hệ thống Rank, 5 chế độ đấu học thuật và cách vận hành phòng đấu.
        </p>
      </div>

      {/* Modern High-Contrast Tabs - Horizontally scrollable on small screens */}
      <div className="relative w-full overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto pb-2 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 w-full flex-nowrap shrink-0">
          {[
            { id: 'rules', label: 'Luật Chơi & Tính Điểm', icon: Target },
            { id: 'ranks', label: 'Hệ Thống Rank & XP', icon: Award },
            { id: 'modes', label: 'Chi Tiết 5 Chế Độ Đấu', icon: BookOpen },
            { id: 'ops', label: 'Vận Hành Phòng Đấu', icon: Hammer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold uppercase tracking-wider transition-all rounded-t-xl whitespace-nowrap cursor-pointer border-b-2 shrink-0 ${
                  isActive
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-500/5'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-100/30 dark:bg-slate-800/30'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents Frame */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col shadow-2xl p-4 sm:p-6 md:p-8 w-full min-w-0">
        
        {/* TAB 1: RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Target size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Cơ Chế Tính Điểm & Thi Đấu
              </h2>
            </div>

            <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
              <p>
                ChemArena là một đấu trường học thuật thời gian thực. Điểm số của bạn trong mỗi lượt đấu được hệ thống tự động đo lường dựa trên các yếu tố sau:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-extrabold text-emerald-600 dark:text-green-400 text-sm uppercase tracking-wider mb-1">
                    🎯 Trả Lời Đúng (+1 Điểm Cơ Bản)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bất kỳ câu trả lời nào khớp hoàn toàn với đáp án hóa học chuẩn sẽ nhận ngay 1.0 điểm cơ bản.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm uppercase tracking-wider mb-1">
                    ⚡ Thưởng Tốc Độ (Lên Tới +0.5 Điểm)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Trả lời càng nhanh, điểm cộng tốc độ càng cao! Nhận tối đa +0.5 điểm nếu hoàn thành ngay giây đầu tiên, giảm dần theo thời gian.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-extrabold text-amber-600 dark:text-amber-400 text-sm uppercase tracking-wider mb-1">
                    🔥 Chuỗi Thắng (Streak Bonus)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Đạt chuỗi trả lời đúng liên tiếp để nhân thêm điểm số và gia tăng áp lực lên các đối thủ cùng phòng.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-extrabold text-rose-600 dark:text-rose-400 text-sm uppercase tracking-wider mb-1">
                    ❌ Trả Lời Sai Hoặc Hết Giờ
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Không nhận được điểm (0 điểm) và chuỗi Streak của bạn sẽ lập tức bị reset về 0. Không bị trừ điểm âm.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex gap-3 text-amber-800 dark:text-amber-300 text-xs">
                <ShieldAlert className="shrink-0 text-amber-500" size={18} />
                <div>
                  <span className="font-bold uppercase block mb-1">Thiết Lập Thời Gian Chờ (Break Screen):</span>
                  Giữa các lượt đấu sẽ có một màn hình tạm nghỉ ngắn giúp người chơi theo dõi kết quả của các thành viên khác, chuẩn bị tinh thần và bảo đảm tính đồng bộ trực tiếp giữa các trình duyệt.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RANKS */}
        {activeTab === 'ranks' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Award size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Cấp Bậc Rank & XP Quy Chuẩn
              </h2>
            </div>

            <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
              <p>
                Hệ thống Rank phản ánh đẳng cấp và kiến thức thực chiến của bạn trên đấu trường ChemArena toàn quốc:
              </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
                  {[
                    { rank: 'Huyền Thoại Graphene (C_sp²)', range: '18,000+ XP', color: 'bg-gradient-to-r from-purple-500 via-indigo-600 to-cyan-500 text-slate-900 dark:text-white font-extrabold shadow-lg border border-purple-400' },
                    { rank: 'Kim Cương Hóa Học (C)', range: '14,000 - 17,999 XP', color: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-500/30 font-bold border' },
                    { rank: 'Rubi Lửa (Cr-Al2O3)', range: '10,500 - 13,999 XP', color: 'bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/30 font-bold border' },
                    { rank: 'Saphia Tinh Khiết (Al2O3)', range: '7,500 - 10,499 XP', color: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30 font-bold border' },
                    { rank: 'Hợp Kim Titan (Ti-Al)', range: '5,000 - 7,499 XP', color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30 font-bold border' },
                    { rank: 'Bạch Kim (Pt)', range: '3,000 - 4,999 XP', color: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700' },
                    { rank: 'Vàng Ròng (Au)', range: '1,500 - 2,999 XP', color: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold border' },
                    { rank: 'Bạc Nguyên Chất (Ag)', range: '700 - 1,499 XP', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700' },
                    { rank: 'Đồng Đỏ (Cu)', range: '300 - 699 XP', color: 'bg-orange-50 text-orange-900 dark:bg-orange-950/20 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-900/50' },
                    { rank: 'Sắt Thô (Fe)', range: '0 - 299 XP', color: 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800' },
                  ].map((item, i) => (
                    <div key={i} className={`p-3.5 rounded-xl text-center flex flex-col justify-center ${item.color}`}>
                      <div className="text-[9px] uppercase tracking-wider mb-1 opacity-80">Rank #{10 - i}</div>
                      <div className="font-black text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis">{item.rank}</div>
                      <div className="text-[10px] mt-1 font-mono">{item.range}</div>
                    </div>
                  ))}
                </div>

              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-3 text-xs md:text-sm">
                <div className="font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={16} />
                  <span>Quy Định Công Bằng XP Toàn Server:</span>
                </div>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 text-xs pl-2">
                  <li>
                    <strong>Phòng Đấu PvP Multiplayer:</strong> Điểm XP chỉ được tích lũy khi thi đấu đối kháng trực tiếp trong các phòng đấu từ 2 người trở lên. Thắng trận sẽ nhận điểm thưởng và thăng bậc Rank.
                  </li>
                  <li>
                    <strong>Chế Độ Solo Luyện Tập:</strong> Nhằm ngăn chặn các hành vi gian lận và farm điểm ảo, các trận luyện tập Solo <strong>tuyệt đối không cộng điểm XP vào BXH</strong>. Các chỉ số luyện tập solo của bạn sẽ được phân tích riêng biệt để lưu trữ trong hồ sơ cá nhân.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MODES */}
        {activeTab === 'modes' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <BookOpen size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Chi Tiết 5 Chế Độ Đấu Học Thuật
              </h2>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-sm">
              ChemArena cung cấp 5 minigame cốt lõi kiểm tra toàn diện năng lực Hóa Học của bạn. Dưới đây là hướng dẫn nhập liệu chi tiết cho từng chế độ:
            </p>

            {/* Scrollable details wrapper to prevent layout overflow */}
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {[
                {
                  title: '1. Cân Bằng Phản Ứng (Balance)',
                  color: 'text-cyan-500 border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/5',
                  guide: 'Hệ thống hiển thị một phương trình chưa cân bằng với các dấu gạch dưới "__". Bạn cần tìm các hệ số tối giản đứng trước các chất và nhập chúng theo đúng thứ tự từ trái qua phải, ngăn cách nhau bởi dấu phẩy. Chú ý: Kể cả hệ số là 1 thì vẫn phải điền số 1.',
                  example: 'Phương trình: __ Fe + __ O2 -> __ Fe3O4. Đáp án đúng cần nhập: 3, 2, 1'
                },
                {
                  title: '2. Điền Khuyết Phản Ứng (Fill Blank)',
                  color: 'text-blue-500 border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/5',
                  guide: 'Một phương trình hoặc sơ đồ phản ứng khuyết một hợp chất, được đại diện bằng dấu chấm hỏi (?). Bạn cần gõ đúng công thức phân tử hóa học viết tắt của hợp chất còn thiếu này. Chú ý viết hoa chính xác tên nguyên tố (ví dụ: NaCl chứ không phải nacl hay NaCl2).',
                  example: 'Sơ đồ phản ứng: HCl + NaOH -> ? + H2O. Đáp án đúng cần nhập: NaCl'
                },
                {
                  title: '3. Gọi Tên Chất IUPAC (Naming)',
                  color: 'text-purple-500 border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/5',
                  guide: 'Hệ thống đưa ra công thức hóa học của một đơn chất, oxit, axit, bazơ hoặc muối. Nhiệm vụ của bạn là nhập đúng danh pháp IUPAC tiếng Anh/tiếng Việt chuẩn hóa hoặc tên gọi thông thường chuẩn xác nhất của chất đó.',
                  example: 'Công thức hóa học: H2SO4. Đáp án được chấp nhận: axit sunfuric (hoặc sulfuric acid, acid sulfuric)'
                },
                {
                  title: '4. Đoán Nguyên Tố (Element Quiz)',
                  color: 'text-amber-500 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5',
                  guide: 'Dựa trên các gợi ý học thuật như số hiệu nguyên tử (Z), cấu hình electron, vị trí trong bảng tuần hoàn (chu kỳ, nhóm), màu sắc đơn chất hoặc tính chất đặc trưng, bạn cần nhập đúng ký hiệu hóa học hoặc tên của nguyên tố.',
                  example: 'Mô tả: Nguyên tố có số hiệu nguyên tử Z = 11. Đáp án đúng cần nhập: Na (hoặc Natri, Sodium)'
                },
                {
                  title: '5. Xác Định Số Oxi Hóa (Oxidation State)',
                  color: 'text-rose-500 border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/5',
                  guide: 'Xác định số oxi hóa của một nguyên tố cụ thể được chỉ định trong một phân tử hoặc ion phức tạp. Đáp án có thể nhập dưới dạng số nguyên kèm dấu hoặc số nguyên thông thường (ví dụ: +6, -2, hoặc chỉ số dương tự do).',
                  example: 'Tìm số oxi hóa của S trong hợp chất H2SO4. Đáp án đúng cần nhập: +6 (hoặc 6)'
                }
              ].map((m, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${m.color} space-y-2`}>
                  <h3 className="font-black text-sm md:text-base">{m.title}</h3>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{m.guide}</p>
                  <div className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-900/50 p-2.5 rounded-lg text-amber-600 dark:text-amber-400">
                    💡 {m.example}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: OPERATIONAL DETAILS */}
        {activeTab === 'ops' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Hammer size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Vận Hành Phòng Đấu & Tính Năng Chủ Phòng
              </h2>
            </div>

            <div className="space-y-5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
              <p>
                Dưới đây là các cơ chế kỹ thuật và quy tắc điều hành phòng đấu được tích hợp trong hệ thống:
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Users className="text-cyan-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-1">
                      Cơ chế Sẵn Sàng (Ready state) & Bắt đầu trận đấu
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Chủ phòng (Host) không cần bấm nút "Sẵn sàng". Thay vào đó, nút "Bắt đầu Trận đấu" chỉ hiển thị cho chủ phòng khi <strong>100% tất cả người chơi khác</strong> trong phòng đã bấm sẵn sàng. Điều này giúp tránh việc trận đấu bị bắt đầu sớm khi có người chơi chưa chuẩn bị.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Swords className="text-rose-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-1">
                      Quyền Kick Thành Viên của Chủ Phòng
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Để phòng tránh spam hoặc người chơi treo máy, Chủ phòng có toàn quyền <strong>Kick (trục xuất)</strong> bất kỳ thành viên nào ra khỏi phòng ngay trong giao diện phòng chờ trước khi bắt đầu trận đấu. Người bị kick sẽ tự động bị điều hướng về sảnh sảnh ghép phòng.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Play className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-1">
                      Tính Năng Lọc Phòng Trực Tiếp (Live Filtering)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Khi tham gia sảnh chờ, người chơi có thể sử dụng bộ lọc tìm kiếm theo <strong>độ khó</strong> (Dễ, Trung bình, Khó) và <strong>chế độ đấu cụ thể</strong> để nhanh chóng tham gia các trận đấu mong muốn. Đồng thời, sảnh chỉ hiển thị những phòng đấu thực sự đang hoạt động và chưa bắt đầu trận hoặc kết thúc để bảo đảm bạn không vào nhầm các phòng ảo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
