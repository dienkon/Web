const fs = require("fs");
const path = require("path");

const projects = [
  "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh",
  "tien-ich/phuong-trinh/chuoi-phan-ung",
  "trung-tam",
  "dau-truong",
  "lab"
];

function verifyProject(folder) {
  const projectDir = path.join(__dirname, folder);
  const distDir = path.join(projectDir, "dist");
  const distIndex = path.join(distDir, "index.html");

  if (!fs.existsSync(projectDir)) {
    console.warn(`⚠️ Bỏ qua ${folder}: không tồn tại thư mục.`);
    return false;
  }

  if (!fs.existsSync(distIndex)) {
    console.error(`❌ Lỗi: ${folder} chưa có dist/index.html.`);
    return false;
  }

  console.log(`✅ Dist ready: ${folder}`);
  return true;
}

let allSuccess = true;
for (const project of projects) {
  if (!verifyProject(project)) {
    allSuccess = false;
  }
}

if (!allSuccess) {
  console.error("❌ Một hoặc nhiều dự án chưa được build thành công!");
  process.exit(1);
}

console.log("✅ Toàn bộ ứng dụng đã được build thành công và sẵn sàng phục vụ từ dist/!");
