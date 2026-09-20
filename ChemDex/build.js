const fs = require("fs");
const path = require("path");

const projects = [
  "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh",
  "tien-ich/phuong-trinh/chuoi-phan-ung",
  "trung-tam",
  "dau-truong",
  "lab"
];

function processProject(folder) {
  const projectDir = path.join(__dirname, folder);
  const distDir = path.join(projectDir, "dist");
  const distSourceIndex = path.join(distDir, "index.source.html");
  const distIndex = path.join(distDir, "index.html");
  const projectIndex = path.join(projectDir, "index.html");
  const distAssets = path.join(distDir, "assets");
  const projectAssets = path.join(projectDir, "assets");

  if (!fs.existsSync(projectDir)) {
    console.warn(`⚠️ Bỏ qua ${folder}: không tồn tại thư mục.`);
    return false;
  }

  if (!fs.existsSync(distDir)) {
    console.error(`❌ Lỗi: ${folder} chưa có thư mục dist.`);
    return false;
  }

  // 1. Chuẩn hóa index.html trong dist
  let compiledHtmlPath = null;
  if (fs.existsSync(distSourceIndex)) {
    fs.copyFileSync(distSourceIndex, distIndex);
    compiledHtmlPath = distIndex;
  } else if (fs.existsSync(distIndex)) {
    compiledHtmlPath = distIndex;
  } else {
    console.error(`❌ Lỗi: ${folder} không tìm thấy dist/index.html hoặc dist/index.source.html.`);
    return false;
  }

  // 2. Phục vụ static server (Five Server / Live Server):
  // Copy file HTML đã biên dịch ra projectDir/index.html
  fs.copyFileSync(compiledHtmlPath, projectIndex);

  // 3. Copy thư mục assets vào projectDir/assets
  if (fs.existsSync(distAssets)) {
    fs.mkdirSync(projectAssets, { recursive: true });
    fs.cpSync(distAssets, projectAssets, { recursive: true, force: true });
  }

  // 4. Đặc thù cho trung-tam: tạo thư mục route cho static server
  if (folder === "trung-tam") {
    const staticRoutes = ["tai-lieu-so", "cong-dong"];
    for (const route of staticRoutes) {
      const routeDir = path.join(projectDir, route);
      fs.mkdirSync(routeDir, { recursive: true });
      fs.copyFileSync(compiledHtmlPath, path.join(routeDir, "index.html"));

      const distRouteDir = path.join(distDir, route);
      fs.mkdirSync(distRouteDir, { recursive: true });
      fs.copyFileSync(compiledHtmlPath, path.join(distRouteDir, "index.html"));
    }
  }

  console.log(`✅ Ready for static preview & Vercel: ${folder}`);
  return true;
}

let allSuccess = true;
for (const project of projects) {
  if (!processProject(project)) {
    allSuccess = false;
  }
}

if (!allSuccess) {
  console.error("❌ Một hoặc nhiều dự án xử lý thất bại!");
  process.exit(1);
}

console.log("✅ Toàn bộ ứng dụng đã được đồng bộ và sẵn sàng phục vụ từ cả Five Server lẫn Vercel!");
