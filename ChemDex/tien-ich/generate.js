const fs = require('fs');
const path = require('path');

const template = (title, icon, iconColor, content) => `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${title} - Công cụ Hóa Học</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #F8FAFC;
            -webkit-tap-highlight-color: transparent;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
        .glass-effect { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 text-slate-800 selection:bg-blue-100 selection:text-blue-900">
    <a href="../../" class="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-slate-100 text-slate-400 hover:text-slate-800 hover:scale-105 active:scale-95 transition-all duration-200">
        <i class="fa-solid fa-arrow-left"></i>
    </a>
    <main class="w-full max-w-md">
        <div class="glass-effect rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 sm:p-8">
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-${iconColor}-50 text-${iconColor}-600 mb-4">
                    <i class="fa-solid ${icon} text-xl"></i>
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-slate-900">${title}</h1>
            </div>
            ${content}
        </div>
    </main>
</body>
</html>`;

const tools = [
  // Đại cương
  { path: 'dai-cuong/chuyen-doi-luong-chat', title: 'Chuyển đổi lượng chất', icon: 'fa-right-left', color: 'blue', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'dai-cuong/tinh-toan-dung-dich', title: 'Công cụ dung dịch', icon: 'fa-flask-vial', color: 'blue', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'dai-cuong/hieu-suat-phan-ung', title: 'Hiệu suất & Chất giới hạn', icon: 'fa-chart-pie', color: 'blue', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  
  // Hóa Lý
  { path: 'hoa-ly/tinh-ph', title: 'Máy tính pH', icon: 'fa-droplet', color: 'amber', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'hoa-ly/can-bang-hoa-hoc', title: 'Hằng số cân bằng', icon: 'fa-scale-balanced', color: 'amber', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'hoa-ly/nhiet-dong-luc-hoc', title: 'Nhiệt động lực học', icon: 'fa-fire-flame-curved', color: 'amber', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'hoa-ly/dong-hoa-hoc', title: 'Động hóa học', icon: 'fa-stopwatch', color: 'amber', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'hoa-ly/dien-hoa-hoc', title: 'Phương trình Nernst', icon: 'fa-car-battery', color: 'amber', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'hoa-ly/quang-pho', title: 'Đo quang', icon: 'fa-sun', color: 'amber', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },

  // Tra cứu
  { path: 'tra-cuu/tinh-tan', title: 'Bảng tính tan', icon: 'fa-table-list', color: 'emerald', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'tra-cuu/day-dien-hoa', title: 'Dãy điện hóa', icon: 'fa-bolt', color: 'emerald', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'tra-cuu/mau-sac-nhan-biet', title: 'Màu ngọn lửa & Kết tủa', icon: 'fa-eye', color: 'emerald', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'tra-cuu/danh-phap-huu-co', title: 'Danh pháp Hữu cơ', icon: 'fa-language', color: 'emerald', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` },
  { path: 'tra-cuu/dieu-kien-phan-ung', title: 'Điều kiện phản ứng', icon: 'fa-temperature-half', color: 'emerald', content: `<p class="text-center text-slate-500">Đang phát triển...</p>` }
];

const basePath = __dirname;

tools.forEach(tool => {
  const dirPath = path.join(basePath, tool.path);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const indexPath = path.join(dirPath, 'index.html');
  const fileContent = template(tool.title, tool.icon, tool.color, tool.content);
  fs.writeFileSync(indexPath, fileContent, 'utf8');
  console.log(`Created ${tool.path}/index.html`);
});
