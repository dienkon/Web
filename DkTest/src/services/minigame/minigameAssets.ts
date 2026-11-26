import type { MinigameType } from "../../types/minigame";

export interface MinigameArtworkMeta {
  gameType: MinigameType;
  label: string;
  shortTitle: string;
  imagePath: string;
  imageAlt: string;
  tagline: string;
  accentClass: string;
  highlights: string[];
  howToPlay: string[];
}

export const MINIGAME_ARTWORK_MAP: Record<MinigameType, MinigameArtworkMeta> = {
  horse_race: {
    gameType: "horse_race",
    label: "Đua Ngựa Tranh Cúp",
    shortTitle: "Đua Ngựa",
    imagePath: "/images/minigames/horse-race.jpg",
    imageAlt: "Minh họa Minigame Đua Ngựa Tranh Cúp trên DkTEST",
    tagline:
      "Bứt tốc nghẹt thở từ 2 đến 64 người chơi, tự chia bảng vòng loại tới Chung kết trao cúp trực tiếp.",
    accentClass: "from-emerald-600 to-teal-600",
    highlights: ["2–64 người chơi", "Tự chia bảng & Chung kết", "Miễn phí 100%"],
    howToPlay: [
      "Bấm Đăng ký tham gia miễn phí trong phòng chờ để nhận ngựa đua & số áo riêng.",
      "Khi Admin xuất phát, theo dõi từng lượt đua bứt tốc theo thời gian thực cùng cả phòng.",
      "Về đích Top bảng Chung kết theo cơ cấu giải thưởng để nhận quà tự động vào Ví DkTEST.",
    ],
  },
  bee_race: {
    gameType: "bee_race",
    label: "Đua Ong Về Tổ",
    shortTitle: "Đua Ong",
    imagePath: "/images/minigames/bee-race.jpg",
    imageAlt: "Minh họa Minigame Đua Ong Về Tổ trên DkTEST",
    tagline:
      "Đàn ong tăng tốc vượt cánh đồng hoa về cổng tổ ong vàng với hiệu ứng phấn hoa cực vui nhộn.",
    accentClass: "from-amber-500 to-orange-500",
    highlights: ["2–64 tay đua ong", "Hiệu ứng đường bay 3D", "Miễn phí 100%"],
    howToPlay: [
      "Đăng ký miễn phí trước giờ xuất phát để nhận chú ong mang màu mũ & số báo danh của riêng bạn.",
      "Cổ vũ trực tiếp bằng thanh biểu cảm khi đàn ong lượn sóng tăng tốc về đích tổ ong vàng.",
      "Người về đích đầu tiên theo cơ cấu giải sẽ được vinh danh trên bục nhận thưởng.",
    ],
  },
  tai_xiu: {
    gameType: "tai_xiu",
    label: "Tài Xỉu Phúc Lợi",
    shortTitle: "Tài Xỉu",
    imagePath: "/images/minigames/tai-xiu.jpg",
    imageAlt: "Minh họa Minigame Tài Xỉu Phúc Lợi trên DkTEST",
    tagline:
      "Dự đoán miễn phí tổng điểm 3 viên xúc xắc (Tài 11–18 hoặc Xỉu 3–10) — mở bát trực tiếp nhận quà.",
    accentClass: "from-blue-600 to-indigo-600",
    highlights: ["Không đặt cược", "Mở bát 3 xúc xắc live", "Thưởng đồng hạng"],
    howToPlay: [
      "Chọn miễn phí cửa Tài (tổng 11–18) hoặc Xỉu (tổng 3–10) ngay khi phòng mở đăng ký.",
      "Chờ Admin bấm lắc xúc xắc & mở bát trực tiếp đồng bộ trên mọi thiết bị.",
      "Tất cả người chơi dự đoán đúng kết quả đều nhận phần thưởng phúc lợi từ Admin.",
    ],
  },
  bau_cua: {
    gameType: "bau_cua",
    label: "Bầu Cua Hội Xuân",
    shortTitle: "Bầu Cua",
    imagePath: "/images/minigames/bau-cua.jpg",
    imageAlt: "Minh họa Minigame Bầu Cua Hội Xuân trên DkTEST",
    tagline:
      "Chọn linh vật yêu thích (Bầu, Cua, Tôm, Cá, Gà, Nai) và mở đĩa 3 viên xúc xắc rộn ràng lễ hội.",
    accentClass: "from-rose-600 to-amber-500",
    highlights: ["6 linh vật truyền thống", "Lắc 3 mặt trực tiếp", "Miễn phí 100%"],
    howToPlay: [
      "Chọn 1 trong 6 linh vật may mắn trên bàn Bầu Cua hoàn toàn miễn phí.",
      "Theo dõi hiệu ứng lắc bát và mở 3 viên xúc xắc linh vật theo thời gian thực.",
      "Linh vật bạn chọn xuất hiện trên ít nhất 1 mặt xúc xắc sẽ được ghi nhận trúng giải.",
    ],
  },
  lucky_number: {
    gameType: "lucky_number",
    label: "Đoán Số May Mắn",
    shortTitle: "Đoán Số",
    imagePath: "/images/minigames/lucky-number.jpg",
    imageAlt: "Minh họa Minigame Đoán Số May Mắn trên DkTEST",
    tagline:
      "Chọn con số may mắn 00–99 của riêng bạn — lồng cầu quay số trực tiếp tìm chủ nhân trúng chính xác.",
    accentClass: "from-violet-600 to-indigo-600",
    highlights: ["Chọn số 00–99", "Trúng chính xác số quay", "Quà cộng thẳng Ví"],
    howToPlay: [
      "Nhập hoặc bấm chọn ngẫu nhiên 1 con số may mắn trong khoảng 00 đến 99 hoàn toàn miễn phí.",
      "Chờ Admin kích hoạt lồng cầu quay số công khai trên toàn màn hình người chơi.",
      "Những người chọn trùng chính xác con số may mắn được quay ra sẽ giành giải thưởng.",
    ],
  },
};

export const MINIGAME_HUB_PREVIEW_IMAGE = "/images/minigames/horse-race.jpg";

export function isValidMinigameType(value: unknown): value is MinigameType {
  return (
    value === "horse_race" ||
    value === "bee_race" ||
    value === "tai_xiu" ||
    value === "bau_cua" ||
    value === "lucky_number"
  );
}

export function getMinigameArtwork(gameType: string | undefined | null): MinigameArtworkMeta {
  if (isValidMinigameType(gameType)) {
    return MINIGAME_ARTWORK_MAP[gameType];
  }
  return MINIGAME_ARTWORK_MAP.horse_race;
}

export function getMinigameArtworkUrl(baseUrl: string, gameType?: string | null): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const art = getMinigameArtwork(gameType);
  return `${cleanBase}${art.imagePath}`;
}
