# Phiên bản ChemDex và thư viện

Snapshot tài liệu: **2026-11-08**. Nguồn: 8 cặp `package.json` / `package-lock.json` trong checkout.

Đây là phiên bản khóa để tái lập cài đặt, không phải danh sách phiên bản mới nhất trên npm. Cột khai báo giữ nguyên khoảng semver; cột khóa là phiên bản npm chọn trong lockfile. Dependency gián tiếp không được liệt kê; xem từng lockfile để tra toàn bộ cây.

## Phiên bản ứng dụng

Web gốc chưa khai báo `version`. Một số ứng dụng còn dùng tên mẫu `react-example` và `0.0.0`; các giá trị này được giữ nguyên để phản ánh đúng source, không dùng làm số phát hành chung của ChemDex.

| Phân hệ | Thư mục | Tên package | Version ứng dụng | Lockfile |
| --- | --- | --- | --- | --- |
| Web chính / API | `.` | `chemdex` | Chưa khai báo | 3 |
| Lab 2D | `lab-2d` | `chemdex-lab-2d` | 1.0.0 | 3 |
| Lab 3D | `lab-3d` | `react-example` | 0.0.0 | 3 |
| Lab Safety | `lab-safety` | `react-example` | 0.0.0 | 3 |
| Trung tâm | `trung-tam` | `react-example` | 0.0.0 | 3 |
| Đấu trường | `dau-truong` | `chemdex-arena` | 1.0.0 | 3 |
| Nhận diện phương trình | `tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh` | `react-example` | 0.0.0 | 3 |
| Chuỗi phản ứng | `tien-ich/phuong-trinh/chuoi-phan-ung` | `react-example` | 0.0.0 | 3 |

## Các thư viện chính (phiên bản khóa)

| Phân hệ | React | Vite | TypeScript | Tailwind CSS | Three.js | GenAI SDK |
| --- | --- | --- | --- | --- | --- | --- |
| Web chính / API | — | — | 5.9.3 | 3.4.19 | 0.165.0 | 1.52.0 |
| Lab 2D | 19.3.0 | 6.4.4 | 5.8.3 | 4.3.3 | — | — |
| Lab 3D | 19.2.7 | 6.4.3 | 5.8.3 | 4.3.2 | 0.185.1 | 2.10.0 |
| Lab Safety | 19.3.0 | 6.4.4 | 5.8.3 | 4.3.3 | 0.185.1 | 2.27.0 |
| Trung tâm | 19.2.8 | 6.4.3 | 5.8.3 | 4.3.3 | — | 2.16.0 |
| Đấu trường | 19.2.8 | 6.4.3 | 5.8.3 | 4.3.3 | — | — |
| Nhận diện phương trình | 19.2.8 | 6.4.3 | 5.8.3 | 4.3.3 | — | 2.16.0 |
| Chuỗi phản ứng | 19.2.8 | 6.4.3 | 5.8.3 | 4.3.3 | — | 2.16.0 |

Dấu “—” nghĩa là không có package tại vị trí `node_modules/<tên>` trong lockfile của phân hệ. Không suy ra phân hệ sử dụng cùng phiên bản với web gốc.

## Toàn bộ dependency trực tiếp theo phân hệ

### Web chính / API

Nguồn: [manifest](../package.json), [lockfile](../package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `@google/genai` | runtime | `^1.17.0` | `1.52.0` |
| `3dmol` | runtime | `2.5.5` | `2.5.5` |
| `three` | runtime | `0.165.0` | `0.165.0` |
| `@playwright/test` | development | `1.64.1` | `1.64.1` |
| `@types/node` | development | `^24.0.0` | `24.13.3` |
| `esbuild` | development | `0.28.2` | `0.28.2` |
| `lighthouse` | development | `13.5.0` | `13.5.0` |
| `tailwindcss` | development | `3.4.19` | `3.4.19` |
| `typescript` | development | `^5.9.3` | `5.9.3` |

### Lab 2D

Nguồn: [manifest](../lab-2d/package.json), [lockfile](../lab-2d/package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `clsx` | runtime | `^2.1.1` | `2.1.1` |
| `lucide-react` | runtime | `^0.546.0` | `0.546.0` |
| `react` | runtime | `^19.0.0` | `19.3.0` |
| `react-dom` | runtime | `^19.0.0` | `19.3.0` |
| `recharts` | runtime | `^3.10.1` | `3.10.1` |
| `tailwind-merge` | runtime | `^3.0.2` | `3.7.0` |
| `zustand` | runtime | `^5.0.0` | `5.0.15` |
| `@tailwindcss/vite` | development | `^4.1.14` | `4.3.3` |
| `@types/node` | development | `^22.14.0` | `22.20.5` |
| `@types/react` | development | `^19.0.10` | `19.3.0` |
| `@types/react-dom` | development | `^19.0.4` | `19.3.0` |
| `@vitejs/plugin-react` | development | `^5.0.4` | `5.2.0` |
| `tailwindcss` | development | `^4.1.14` | `4.3.3` |
| `typescript` | development | `~5.8.2` | `5.8.3` |
| `vite` | development | `^6.2.3` | `6.4.4` |
| `vitest` | development | `^5.0.3` | `5.0.4` |

### Lab 3D

Nguồn: [manifest](../lab-3d/package.json), [lockfile](../lab-3d/package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `@dimforge/rapier3d-compat` | runtime | `0.21.0` | `0.21.0` |
| `@google/genai` | runtime | `^2.4.0` | `2.10.0` |
| `@react-three/drei` | runtime | `^10.7.7` | `10.7.7` |
| `@react-three/fiber` | runtime | `^9.6.1` | `9.8.1` |
| `@react-three/postprocessing` | runtime | `^3.1.3` | `3.1.3` |
| `@tailwindcss/vite` | runtime | `^4.1.14` | `4.3.2` |
| `@vitejs/plugin-react` | runtime | `^5.0.4` | `5.2.0` |
| `cors` | runtime | `^2.8.6` | `2.8.6` |
| `dotenv` | runtime | `^17.2.3` | `17.4.2` |
| `express` | runtime | `^4.21.2` | `4.22.2` |
| `firebase` | runtime | `^12.16.0` | `12.16.0` |
| `firebase-admin` | runtime | `^14.1.0` | `14.1.0` |
| `framer-motion` | runtime | `^12.42.2` | `12.42.2` |
| `lucide-react` | runtime | `^0.546.0` | `0.546.0` |
| `motion` | runtime | `^12.23.24` | `12.42.2` |
| `postprocessing` | runtime | `^6.39.5` | `6.39.5` |
| `react` | runtime | `^19.0.1` | `19.2.7` |
| `react-dom` | runtime | `^19.0.1` | `19.2.7` |
| `recharts` | runtime | `^3.10.1` | `3.10.1` |
| `three` | runtime | `^0.185.1` | `0.185.1` |
| `uuid` | runtime | `^14.0.1` | `14.0.1` |
| `vite` | runtime | `^6.2.3` | `6.4.3` |
| `zod` | runtime | `^4.4.3` | `4.4.3` |
| `zustand` | runtime | `^5.0.14` | `5.0.14` |
| `@types/cors` | development | `^2.8.19` | `2.8.19` |
| `@types/express` | development | `^4.17.21` | `4.17.25` |
| `@types/node` | development | `^22.14.0` | `22.20.0` |
| `@types/three` | development | `^0.185.0` | `0.185.0` |
| `@types/uuid` | development | `^10.0.0` | `10.0.0` |
| `autoprefixer` | development | `^10.4.21` | `10.5.2` |
| `esbuild` | development | `^0.25.0` | `0.25.12` |
| `tailwindcss` | development | `^4.1.14` | `4.3.2` |
| `tsx` | development | `^4.21.0` | `4.22.5` |
| `typescript` | development | `~5.8.2` | `5.8.3` |
| `vite` | development | `^6.2.3` | `6.4.3` |
| `vitest` | development | `^5.0.3` | `5.0.3` |

### Lab Safety

Nguồn: [manifest](../lab-safety/package.json), [lockfile](../lab-safety/package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `@react-spring/three` | runtime | `^10.1.2` | `10.1.2` |
| `@react-three/drei` | runtime | `^10.7.7` | `10.7.9` |
| `@react-three/fiber` | runtime | `^9.6.1` | `9.8.1` |
| `@react-three/postprocessing` | runtime | `^3.0.4` | `3.1.3` |
| `@tailwindcss/vite` | runtime | `^4.1.14` | `4.3.3` |
| `@vitejs/plugin-react` | runtime | `^5.0.4` | `5.2.0` |
| `canvas-confetti` | runtime | `^1.9.4` | `1.9.4` |
| `clsx` | runtime | `^2.1.1` | `2.1.1` |
| `framer-motion` | runtime | `^12.42.2` | `12.43.0` |
| `lucide-react` | runtime | `^1.24.0` | `1.52.0` |
| `react` | runtime | `^19.0.1` | `19.3.0` |
| `react-dom` | runtime | `^19.0.1` | `19.3.0` |
| `tailwind-merge` | runtime | `^3.6.0` | `3.7.0` |
| `three` | runtime | `^0.185.1` | `0.185.1` |
| `vite` | runtime | `^6.2.3` | `6.4.4` |
| `zustand` | runtime | `^5.0.14` | `5.0.15` |
| `@types/canvas-confetti` | development | `^1.9.0` | `1.9.0` |
| `@types/node` | development | `^22.14.0` | `22.20.5` |
| `@types/three` | development | `^0.185.1` | `0.185.4` |
| `autoprefixer` | development | `^10.4.21` | `10.6.1` |
| `esbuild` | development | `^0.25.0` | `0.25.12` |
| `tailwindcss` | development | `^4.1.14` | `4.3.3` |
| `typescript` | development | `~5.8.2` | `5.8.3` |
| `vite` | development | `^6.2.3` | `6.4.4` |

### Trung tâm

Nguồn: [manifest](../trung-tam/package.json), [lockfile](../trung-tam/package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `@google/genai` | runtime | `^2.15.0` | `2.16.0` |
| `@tailwindcss/vite` | runtime | `^4.1.14` | `4.3.3` |
| `@vitejs/plugin-react` | runtime | `^5.0.4` | `5.2.0` |
| `cors` | runtime | `^2.8.5` | `2.8.6` |
| `dotenv` | runtime | `^17.2.3` | `17.4.2` |
| `express` | runtime | `^4.21.2` | `4.22.2` |
| `firebase` | runtime | `^12.17.1` | `12.17.1` |
| `katex` | runtime | `^0.18.1` | `0.18.1` |
| `lightningcss` | runtime | `^1.33.0` | `1.33.0` |
| `lucide-react` | runtime | `^0.546.0` | `0.546.0` |
| `motion` | runtime | `^12.23.24` | `12.43.0` |
| `react` | runtime | `^19.0.1` | `19.2.8` |
| `react-dom` | runtime | `^19.0.1` | `19.2.8` |
| `react-firebase-hooks` | runtime | `^5.1.1` | `5.1.1` |
| `react-markdown` | runtime | `^10.1.0` | `10.1.0` |
| `react-router` | runtime | `^8.3.0` | `8.3.0` |
| `react-router-dom` | runtime | `^7.11.0` | `7.18.2` |
| `rehype-katex` | runtime | `^7.0.1` | `7.0.1` |
| `rehype-raw` | runtime | `^7.0.0` | `7.0.0` |
| `remark-gfm` | runtime | `^4.0.1` | `4.0.1` |
| `remark-math` | runtime | `^6.0.0` | `6.0.0` |
| `vite` | runtime | `^6.2.3` | `6.4.3` |
| `@types/cors` | development | `^2.8.17` | `2.8.19` |
| `@types/express` | development | `^4.17.21` | `4.17.25` |
| `@types/node` | development | `^22.14.0` | `22.20.1` |
| `autoprefixer` | development | `^10.4.21` | `10.5.4` |
| `esbuild` | development | `^0.25.0` | `0.25.12` |
| `tailwindcss` | development | `^4.1.14` | `4.3.3` |
| `tsx` | development | `^4.21.0` | `4.23.9` |
| `typescript` | development | `~5.8.2` | `5.8.3` |
| `vite` | development | `^6.2.3` | `6.4.3` |

### Đấu trường

Nguồn: [manifest](../dau-truong/package.json), [lockfile](../dau-truong/package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `@tailwindcss/vite` | runtime | `^4.1.14` | `4.3.3` |
| `@vitejs/plugin-react` | runtime | `^5.0.4` | `5.2.0` |
| `clsx` | runtime | `^2.1.1` | `2.1.1` |
| `dotenv` | runtime | `^17.2.3` | `17.4.2` |
| `express` | runtime | `^4.21.2` | `4.22.2` |
| `firebase` | runtime | `^12.17.1` | `12.18.0` |
| `lucide-react` | runtime | `^0.546.0` | `0.546.0` |
| `motion` | runtime | `^12.23.24` | `12.43.0` |
| `react` | runtime | `^19.0.1` | `19.2.8` |
| `react-dom` | runtime | `^19.0.1` | `19.2.8` |
| `react-router-dom` | runtime | `^7.18.2` | `7.18.3` |
| `recharts` | runtime | `^3.10.1` | `3.10.1` |
| `tailwind-merge` | runtime | `^3.6.0` | `3.6.0` |
| `zustand` | runtime | `^5.0.14` | `5.0.15` |
| `@types/express` | development | `^4.17.21` | `4.17.25` |
| `@types/node` | development | `^22.14.0` | `22.20.1` |
| `@types/react` | development | `^19.0.0` | `19.3.0` |
| `@types/react-dom` | development | `^19.0.0` | `19.3.0` |
| `autoprefixer` | development | `^10.4.21` | `10.5.4` |
| `esbuild` | development | `^0.25.0` | `0.25.12` |
| `tailwindcss` | development | `^4.1.14` | `4.3.3` |
| `tsx` | development | `^4.21.0` | `4.23.12` |
| `typescript` | development | `~5.8.2` | `5.8.3` |
| `vite` | development | `^6.2.3` | `6.4.3` |

### Nhận diện phương trình

Nguồn: [manifest](../tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/package.json), [lockfile](../tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `@google/genai` | runtime | `^2.4.0` | `2.16.0` |
| `@tailwindcss/vite` | runtime | `^4.1.14` | `4.3.3` |
| `@vitejs/plugin-react` | runtime | `^5.0.4` | `5.2.0` |
| `dotenv` | runtime | `^17.2.3` | `17.4.2` |
| `express` | runtime | `^4.21.2` | `4.22.2` |
| `lucide-react` | runtime | `^0.546.0` | `0.546.0` |
| `motion` | runtime | `^12.23.24` | `12.43.0` |
| `react` | runtime | `^19.0.1` | `19.2.8` |
| `react-dom` | runtime | `^19.0.1` | `19.2.8` |
| `tesseract.js` | runtime | `^7.0.0` | `7.0.0` |
| `vite` | runtime | `^6.2.3` | `6.4.3` |
| `@types/express` | development | `^4.17.21` | `4.17.25` |
| `@types/node` | development | `^22.14.0` | `22.20.1` |
| `autoprefixer` | development | `^10.4.21` | `10.5.4` |
| `esbuild` | development | `^0.25.0` | `0.25.12` |
| `tailwindcss` | development | `^4.1.14` | `4.3.3` |
| `tsx` | development | `^4.21.0` | `4.23.10` |
| `typescript` | development | `~5.8.2` | `5.8.3` |
| `vite` | development | `^6.2.3` | `6.4.3` |

### Chuỗi phản ứng

Nguồn: [manifest](../tien-ich/phuong-trinh/chuoi-phan-ung/package.json), [lockfile](../tien-ich/phuong-trinh/chuoi-phan-ung/package-lock.json).

| Package | Nhóm | Khai báo | Phiên bản khóa |
| --- | --- | --- | --- |
| `@google/genai` | runtime | `^2.4.0` | `2.16.0` |
| `@tailwindcss/vite` | runtime | `^4.1.14` | `4.3.3` |
| `@types/katex` | runtime | `^0.16.8` | `0.16.8` |
| `@vitejs/plugin-react` | runtime | `^5.0.4` | `5.2.0` |
| `dotenv` | runtime | `^17.2.3` | `17.4.2` |
| `express` | runtime | `^4.21.2` | `4.22.2` |
| `katex` | runtime | `^0.18.1` | `0.18.2` |
| `lucide-react` | runtime | `^0.546.0` | `0.546.0` |
| `motion` | runtime | `^12.23.24` | `12.43.0` |
| `react` | runtime | `^19.0.1` | `19.2.8` |
| `react-dom` | runtime | `^19.0.1` | `19.2.8` |
| `vite` | runtime | `^6.2.3` | `6.4.3` |
| `@types/express` | development | `^4.17.21` | `4.17.25` |
| `@types/node` | development | `^22.14.0` | `22.20.1` |
| `@vercel/node` | development | `^5.0.0` | `5.10.2` |
| `autoprefixer` | development | `^10.4.21` | `10.5.4` |
| `esbuild` | development | `^0.25.0` | `0.25.12` |
| `tailwindcss` | development | `^4.1.14` | `4.3.3` |
| `tsx` | development | `^4.21.0` | `4.23.11` |
| `typescript` | development | `~5.8.2` | `5.8.3` |

## Cập nhật snapshot

Chạy từ thư mục ChemDex sau khi cập nhật manifest/lockfile:

```sh
node scripts/generate-readme-versions.mjs YYYY-MM-DD
```

Lệnh chỉ đọc manifest/lockfile và ghi lại tài liệu này; không cài đặt hoặc nâng cấp thư viện. Ngày truyền vào là ngày chốt tài liệu. Nếu bỏ ngày, script lấy ngày UTC tại thời điểm chạy.

Node.js yêu cầu: `22.x` theo `package.json` gốc và `.nvmrc`. npm: dùng bản tương thích đi kèm Node 22; dự án chưa khóa bằng `packageManager`.

[Về README](../README.md)
