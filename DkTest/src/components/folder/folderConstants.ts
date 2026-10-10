export interface FolderColorOption {
  value: string;
  label: string;
  hex: string;
  iconClass: string;
  cardClass: string;
  badgeClass: string;
  dotClass: string;
}

export const GOOGLE_DRIVE_FOLDER_COLORS: FolderColorOption[] = [
  {
    value: "blue",
    label: "Xanh biển",
    hex: "#2563eb",
    iconClass: "text-blue-600 fill-blue-500/20",
    cardClass: "bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 text-blue-900",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    dotClass: "bg-blue-500",
  },
  {
    value: "emerald",
    label: "Xanh lá",
    hex: "#059669",
    iconClass: "text-emerald-600 fill-emerald-500/20",
    cardClass: "bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  {
    value: "teal",
    label: "Xanh ngọc",
    hex: "#0d9488",
    iconClass: "text-teal-600 fill-teal-500/20",
    cardClass: "bg-teal-50/70 hover:bg-teal-100/70 border-teal-200 text-teal-900",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    dotClass: "bg-teal-500",
  },
  {
    value: "amber",
    label: "Hổ phách",
    hex: "#d97706",
    iconClass: "text-amber-600 fill-amber-500/20",
    cardClass: "bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-900",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  {
    value: "orange",
    label: "Cam đất",
    hex: "#ea580c",
    iconClass: "text-orange-600 fill-orange-500/20",
    cardClass: "bg-orange-50/70 hover:bg-orange-100/70 border-orange-200 text-orange-900",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    dotClass: "bg-orange-500",
  },
  {
    value: "rose",
    label: "Đỏ hồng",
    hex: "#e11d48",
    iconClass: "text-rose-600 fill-rose-500/20",
    cardClass: "bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 text-rose-900",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    dotClass: "bg-rose-500",
  },
  {
    value: "purple",
    label: "Tím cẩm",
    hex: "#9333ea",
    iconClass: "text-purple-600 fill-purple-500/20",
    cardClass: "bg-purple-50/70 hover:bg-purple-100/70 border-purple-200 text-purple-900",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    dotClass: "bg-purple-500",
  },
  {
    value: "indigo",
    label: "Chàm đậm",
    hex: "#4f46e5",
    iconClass: "text-indigo-600 fill-indigo-500/20",
    cardClass: "bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200 text-indigo-900",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    dotClass: "bg-indigo-500",
  },
];

export const getFolderColorStyle = (colorValue?: string): FolderColorOption => {
  if (!colorValue) return GOOGLE_DRIVE_FOLDER_COLORS[0];
  const found = GOOGLE_DRIVE_FOLDER_COLORS.find(
    (c) => c.value === colorValue || colorValue.includes(c.value)
  );
  return found || GOOGLE_DRIVE_FOLDER_COLORS[0];
};
