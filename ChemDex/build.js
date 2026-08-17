const fs = require("fs");
const path = require("path");

const projects = [
  "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh",
  "tien-ich/phuong-trinh/chuoi-phan-ung",
  "trung-tam",
  "dau-truong",
];

function copyProject(folder) {
  const projectDir = path.join(__dirname, folder);
  const distDir = path.join(projectDir, "dist");

  if (!fs.existsSync(projectDir)) {
    console.log(`⚠️ Bỏ qua ${folder}: không tồn tại thư mục.`);
    return;
  }

  if (!fs.existsSync(distDir)) {
    console.log(`⚠️ Bỏ qua ${folder}: chưa có dist.`);
    return;
  }

  fs.cpSync(distDir, projectDir, {
    recursive: true,
    force: true,
  });

  console.log(`✅ Copied: ${folder}`);
}

for (const project of projects) {
  copyProject(project);
}

console.log("Copy build hoàn tất.");
