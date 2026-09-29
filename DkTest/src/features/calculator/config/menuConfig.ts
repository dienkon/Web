import { CalculatorMode } from "../types";

export interface MenuItemConfig {
  id: string;
  mode: CalculatorMode;
  shortcut: string;
  nameEn: string;
  nameVi: string;
  description: string;
}

export const CASIO_MENU_ITEMS: MenuItemConfig[] = [
  {
    id: "calc",
    mode: "CALCULATE",
    shortcut: "1",
    nameEn: "Calculate",
    nameVi: "Tính toán",
    description: "Tính toán cơ bản và hàm số học",
  },
  {
    id: "complex",
    mode: "COMPLEX",
    shortcut: "2",
    nameEn: "Complex",
    nameVi: "Số phức",
    description: "Phép tính số phức a+bi và dạng cực r∠θ",
  },
  {
    id: "base_n",
    mode: "BASE_N",
    shortcut: "3",
    nameEn: "Base-N",
    nameVi: "Hệ đếm",
    description: "Hệ đếm nhị phân, bát phân, thập phân, hexa",
  },
  {
    id: "matrix",
    mode: "MATRIX",
    shortcut: "4",
    nameEn: "Matrix",
    nameVi: "Ma trận",
    description: "Định thức, ma trận chuyển vị, phép tính ma trận",
  },
  {
    id: "vector",
    mode: "VECTOR",
    shortcut: "5",
    nameEn: "Vector",
    nameVi: "Véc tơ",
    description: "Tích vô hướng, có hướng, góc và độ dài véc tơ",
  },
  {
    id: "stat",
    mode: "STATISTICS",
    shortcut: "6",
    nameEn: "Statistics",
    nameVi: "Thống kê",
    description: "Thống kê 1 biến và hồi quy 2 biến",
  },
  {
    id: "dist",
    mode: "DISTRIBUTION",
    shortcut: "7",
    nameEn: "Distribution",
    nameVi: "Phân phối",
    description: "Phân phối chuẩn, nhị thức và Poisson",
  },
  {
    id: "table",
    mode: "TABLE",
    shortcut: "8",
    nameEn: "Table",
    nameVi: "Bảng giá trị",
    description: "Bảng giá trị hàm số f(x) và g(x)",
  },
  {
    id: "equation",
    mode: "EQUATION",
    shortcut: "9",
    nameEn: "Equation/Func",
    nameVi: "PT / Hệ PT",
    description: "Hệ PT tuyến tính và phương trình đa thức",
  },
  {
    id: "ineq",
    mode: "INEQUALITY",
    shortcut: "A",
    nameEn: "Inequality",
    nameVi: "Bất PT",
    description: "Bất phương trình đa thức bậc 2, 3",
  },
  {
    id: "verify",
    mode: "VERIFY",
    shortcut: "B",
    nameEn: "Verify",
    nameVi: "Kiểm tra",
    description: "Kiểm tra đúng sai của đẳng thức và bất đẳng thức",
  },
  {
    id: "ratio",
    mode: "RATIO",
    shortcut: "C",
    nameEn: "Ratio",
    nameVi: "Tỷ lệ thức",
    description: "Giải tỷ lệ thức A:B = C:D",
  },
];

export const MENU_MODES = CASIO_MENU_ITEMS;

export function getModeByShortcut(shortcut: string): MenuItemConfig | undefined {
  const norm = shortcut.trim().toUpperCase();
  return CASIO_MENU_ITEMS.find((m) => m.shortcut.toUpperCase() === norm);
}

export function getModeById(id: string): MenuItemConfig | undefined {
  return CASIO_MENU_ITEMS.find((m) => m.id === id || m.mode === id);
}
