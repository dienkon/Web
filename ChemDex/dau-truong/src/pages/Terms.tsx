import { useState } from 'react';
import { Shield, FileText, Scale, Eye, HeartHandshake } from 'lucide-react';

type TabType = 'terms' | 'privacy' | 'fairplay' | 'ip';

export default function Terms() {
  const [activeTab, setActiveTab] = useState<TabType>('terms');

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-6 px-4 sm:px-6 pb-12 min-w-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight break-words">
          Chính sách & Quy định
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Vui lòng đọc kỹ các quy định pháp lý, chính sách bảo mật và quy tắc ứng xử công bằng trên nền tảng đấu trường hóa học ChemArena.
        </p>
      </div>

      {/* Modern High-Contrast Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto pb-2 custom-scrollbar shrink-0 max-w-full">
        {[
          { id: 'terms', label: 'Chính Sách Sử Dụng', icon: FileText },
          { id: 'privacy', label: 'Chính Sách Quyền Riêng Tư', icon: Eye },
          { id: 'fairplay', label: 'Quy Tắc Ứng Xử & Công Bằng', icon: Scale },
          { id: 'ip', label: 'Sở Hữu Trí Tuệ', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs md:text-sm font-bold uppercase tracking-wider transition-all rounded-t-xl whitespace-nowrap cursor-pointer border-b-2 shrink-0 ${
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

      {/* Tab Contents Frame */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col shadow-2xl p-4 sm:p-6 md:p-8 w-full min-w-0">
        
        {/* TAB 1: TERMS */}
        {activeTab === 'terms' && (
          <div className="space-y-6 animate-fade-in text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <FileText size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Chính Sách Sử Dụng
              </h2>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 italic">Cập nhật lần cuối: Ngày 10 tháng 8 năm 2026</p>

            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">1. Chấp thuận Chính sách</h3>
              <p>
                Bằng việc tạo tài khoản, đăng nhập hoặc sử dụng bất kỳ dịch vụ nào trên ChemArena, bạn đồng ý chịu sự ràng buộc bởi các Chính sách sử dụng này, tất cả các luật và quy định hiện hành. Nếu bạn không đồng ý với bất kỳ chính sách nào trong số này, bạn bị cấm sử dụng hoặc truy cập vào trang web này.
              </p>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">2. Quyền sử dụng tài khoản</h3>
              <p>
                Người chơi có quyền đăng ký một tài khoản duy nhất dựa trên email cá nhân. Bạn có trách nhiệm bảo mật thông tin đăng nhập của mình và chịu hoàn toàn trách nhiệm đối với mọi hoạt động diễn ra dưới tài khoản của bạn.
              </p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Không chia sẻ tài khoản cho người khác sử dụng chung.</li>
                <li>Không đặt tên hiển thị thô tục, xúc phạm danh dự của cá nhân hoặc tổ chức khác.</li>
                <li>Độ dài tên giới hạn tối đa là 15 ký tự để bảo đảm tối ưu giao diện.</li>
              </ul>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">3. Sửa đổi dịch vụ</h3>
              <p>
                ChemArena có quyền sửa đổi, tạm ngừng hoặc ngừng cung cấp dịch vụ (hoặc bất kỳ phần nào trong đó) vào bất kỳ lúc nào mà không cần thông báo trước. Chúng tôi không chịu trách nhiệm với bạn hoặc bất kỳ bên thứ ba nào về bất kỳ sự sửa đổi, thay đổi giá cả, đình chỉ hoặc ngừng dịch vụ.
              </p>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">4. Giới hạn trách nhiệm</h3>
              <p>
                Trong mọi trường hợp, ChemArena hoặc các nhà phát triển của nó sẽ không chịu trách nhiệm về bất kỳ thiệt hại nào (bao gồm nhưng không giới hạn ở thiệt hại do mất dữ liệu hoặc lợi nhuận, hoặc do gián đoạn kinh doanh) phát sinh từ việc sử dụng hoặc không thể sử dụng các tài liệu trên trang web này.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: PRIVACY */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-fade-in text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Eye size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Chính Sách Quyền Riêng Tư
              </h2>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 italic">Cập nhật lần cuối: Ngày 10 tháng 8 năm 2026</p>

            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">1. Thông tin chúng tôi thu thập</h3>
              <p>
                Chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết để vận hành trò chơi học thuật bao gồm:
              </p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Địa chỉ Email và Tên hiển thị (Display Name) khi đăng ký qua Firebase Auth.</li>
                <li>Lịch sử các trận đấu, điểm số, tỉ lệ trả lời đúng và xếp hạng Rank để duy trì tính năng Bảng xếp hạng trực tuyến.</li>
                <li>Thời gian phản hồi câu hỏi nhằm đo lường điểm thưởng tốc độ một cách chính xác.</li>
              </ul>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">2. Cách sử dụng thông tin của bạn</h3>
              <p>
                Mọi thông tin cá nhân thu thập được chỉ dùng vào mục đích:
              </p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Xác thực người dùng và bảo mật hệ thống.</li>
                <li>Hiển thị bảng xếp hạng thành tích (Leaderboard) công khai trên nền tảng.</li>
                <li>Cung cấp thống kê cá nhân hóa giúp bạn theo dõi tiến trình học tập hóa học của bản thân.</li>
              </ul>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">3. Bảo mật thông tin</h3>
              <p>
                Chúng tôi áp dụng các biện pháp bảo mật tiêu chuẩn ngành bằng dịch vụ đám mây an toàn của Firebase Cloud Firestore và Google Cloud. Thông tin mật khẩu đăng nhập được băm mã hóa một chiều hoàn toàn và chúng tôi không bao giờ chia sẻ, bán hoặc chuyển giao dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích quảng cáo hoặc thương mại.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: FAIRPLAY */}
        {activeTab === 'fairplay' && (
          <div className="space-y-6 animate-fade-in text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Scale size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Quy Tắc Ứng Xử & Công Bằng
              </h2>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex gap-3 text-rose-800 dark:text-rose-300 text-xs mb-4">
              <HeartHandshake className="shrink-0 text-rose-500 animate-pulse" size={18} />
              <div>
                <span className="font-bold uppercase block mb-1">Tuyên bố công bằng học thuật:</span>
                ChemArena được xây dựng vì mục tiêu nâng cao tri thức và tư duy phản xạ hóa học. Chúng tôi áp dụng chính sách KHÔNG KHOAN NHƯỢNG đối với mọi hành vi gian lận hoặc phá hoại trải nghiệm thi đấu.
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">1. Các hành vi bị nghiêm cấm</h3>
              <ul className="list-disc list-inside pl-4 space-y-2">
                <li>
                  <strong>Sử dụng phần mềm can thiệp (Tool/Cheat):</strong> Bất kỳ hành vi sử dụng mã script tự động, bot trả lời câu hỏi, extension quét HTML hoặc can thiệp vào bộ nhớ trình duyệt để tìm kiếm đáp án trước đều bị nghiêm cấm.
                </li>
                <li>
                  <strong>Farm XP ảo:</strong> Sử dụng nhiều trình duyệt, thiết bị hoặc thông đồng với bạn bè để cố ý nhường điểm, tạo phòng ảo và tự ý tăng điểm xếp hạng (XP) mà không qua thi đấu đối kháng công bằng.
                </li>
                <li>
                  <strong>Tấn công từ chối dịch vụ (DDoS / Spam):</strong> Spam liên tiếp các request tạo phòng, thay đổi thông tin hoặc cố tình khai thác lỗ hổng hệ thống để làm nghẽn máy chủ trực tuyến.
                </li>
              </ul>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">2. Biện pháp xử lý vi phạm</h3>
              <p>
                Khi phát hiện các hành vi gian lận hoặc báo cáo từ cộng đồng người chơi được xác minh chính xác, ban quản trị ChemArena có quyền:
              </p>
              <ul className="list-decimal list-inside pl-4 space-y-1">
                <li>Reset toàn bộ điểm xếp hạng (XP) hiện có của tài khoản về mức 0.</li>
                <li>Tạm khóa tài khoản từ 3 đến 30 ngày tùy mức độ vi phạm.</li>
                <li>Khóa vĩnh viễn địa chỉ IP hoặc tài khoản liên kết trong trường hợp cố tình phá hoại nghiêm trọng hệ thống.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: INTELLECTUAL PROPERTY */}
        {activeTab === 'ip' && (
          <div className="space-y-6 animate-fade-in text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Shield size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Sở Hữu Trí Tuệ & Bản Quyền
              </h2>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">1. Bản quyền nội dung</h3>
              <p>
                Toàn bộ giao diện người dùng, mã nguồn, cấu trúc thuật toán, âm thanh, logo, thiết kế hình ảnh, và nội dung câu hỏi học thuật được tạo lập trên hệ thống ChemArena đều thuộc quyền sở hữu trí tuệ độc quyền của đội ngũ phát triển ChemArena hoặc được cấp phép hợp lệ.
              </p>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">2. Giới hạn cấp phép phi thương mại</h3>
              <p>
                Người chơi được cấp một giấy phép cá nhân, có thể thu hồi, không độc quyền, phi thương mại để truy cập và tham gia học tập giải trí trên nền tảng. Nghiêm cấm mọi hành vi sao chép mã nguồn, thương mại hóa câu hỏi học thuật của hệ thống hoặc xuất bản lại bất kỳ phần nội dung nào mà không có sự cho phép bằng văn bản từ đại diện hợp pháp của ChemArena.
              </p>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">3. Nội dung đóng góp bởi người dùng</h3>
              <p>
                Nếu người chơi gửi các câu hỏi, phản hồi hoặc ý kiến cải tiến học thuật cho chúng tôi, bạn cấp cho ChemArena quyền sử dụng, sửa đổi và phân phối lại vô thời hạn, không cần bồi thường tài chính, để liên tục nâng cấp hệ thống giáo dục này ngày một tốt hơn.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
