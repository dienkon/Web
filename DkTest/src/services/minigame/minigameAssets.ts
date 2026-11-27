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
  lucky_wheel: {
    gameType: "lucky_wheel",
    label: "Vòng Quay Siêu Tốc",
    shortTitle: "Vòng Quay",
    imagePath: "/images/minigames/lucky-wheel.jpg",
    imageAlt: "Minh họa Minigame Vòng Quay Siêu Tốc trên DkTEST",
    tagline:
      "8 ô biểu tượng rực rỡ phát sáng — chọn 1 biểu tượng may mắn và chờ vòng quay dừng ngay mũi tên vàng!",
    accentClass: "from-fuchsia-600 to-purple-600",
    highlights: ["8 ô biểu tượng sống động", "Hiệu ứng quay mượt 60fps", "Miễn phí 100%"],
    howToPlay: [
      "Chọn miễn phí 1 trong 8 biểu tượng trên Vòng Quay Siêu Tốc khi phòng đang mở đăng ký.",
      "Admin kích hoạt vòng quay trực tiếp — mũi tên vàng dừng tại ô nào, ô đó thắng giải.",
      "Tất cả người chơi chọn trúng biểu tượng chiến thắng sẽ nhận quà phúc lợi.",
    ],
  },
  treasure_flip: {
    gameType: "treasure_flip",
    label: "Lật Thẻ Kho Báu",
    shortTitle: "Kho Báu",
    imagePath: "/images/minigames/treasure-flip.jpg",
    imageAlt: "Minh họa Minigame Lật Thẻ Kho Báu trên DkTEST",
    tagline:
      "9 rương kho báu bí mật với 2 rương chứa Kim Cương Vàng — chọn rương linh cảm nhất và lật mở đồng loạt!",
    accentClass: "from-amber-600 to-yellow-500",
    highlights: ["9 rương — 2 kho báu vàng", "Tỷ lệ trúng cao & kịch tính", "Lật 3D trực tiếp"],
    howToPlay: [
      "Chọn 1 trong 9 ô rương kho báu (#1–#9) hoàn toàn miễn phí trong phòng chờ.",
      "Khi Admin bấm mở rương, cả 9 thẻ lật 3D đồng loạt tiết lộ 2 rương chứa Kho Báu Vàng.",
      "Người chơi chọn trúng 1 trong 2 rương Kho Báu Vàng sẽ nhận thưởng ngay lập tức.",
    ],
  },
  mystery_box: {
    gameType: "mystery_box",
    label: "Đập Hộp Bí Ẩn",
    shortTitle: "Hộp Bí Ẩn",
    imagePath: "/images/minigames/mystery-box.jpg",
    imageAlt: "Minh họa Minigame Đập Hộp Bí Ẩn trên DkTEST",
    tagline:
      "6 hộp quà neon rực rỡ sắc màu — chọn 1 hộp bí ẩn và chờ màn đập hộp bung pháo hoa tìm Hộp Đặc Biệt!",
    accentClass: "from-pink-600 to-rose-500",
    highlights: ["6 hộp quà sắc màu", "Hiệu ứng đập hộp pháo hoa", "Chat live sôi động"],
    howToPlay: [
      "Chọn miễn phí 1 trong 6 hộp quà sắc màu yêu thích trước giờ chốt danh sách.",
      "Khi Admin kích hoạt, các hộp quà rung lắc hồi hộp rồi đồng loạt bung mở tìm Hộp Đặc Biệt.",
      "Tất cả thí sinh chọn đúng Hộp Đặc Biệt sẽ được vinh danh trên bục nhận thưởng.",
    ],
  },
  duck_race: {
    gameType: "duck_race",
    label: "Đua Vịt Vượt Thác",
    shortTitle: "Đua Vịt",
    imagePath: "/images/minigames/duck-race.jpg",
    imageAlt: "Minh họa Minigame Đua Vịt Vượt Thác trên DkTEST",
    tagline:
      "Đàn vịt vàng đeo kính râm cưỡi sóng vượt thác nước sủi bọt từ 2 đến 64 tay đua về đích phao vàng!",
    accentClass: "from-sky-500 to-cyan-600",
    highlights: ["2–64 chú vịt đua sóng", "Thác nước sủi bọt sống động", "Miễn phí 100%"],
    howToPlay: [
      "Bấm Đăng ký tham gia miễn phí để nhận chú vịt đua đeo phao & số báo danh riêng.",
      "Theo dõi đàn vịt lướt sóng vượt xoáy nước qua từng lượt đấu loại tới Chung kết.",
      "Top vịt cán phao đích đầu tiên sẽ nhận phần thưởng phúc lợi cộng thẳng Ví DkTEST.",
    ],
  },
  plinko_drop: {
    gameType: "plinko_drop",
    label: "Thả Bóng Ziczac",
    shortTitle: "Bóng Ziczac",
    imagePath: "/images/minigames/plinko-drop.jpg",
    imageAlt: "Minh họa Minigame Thả Bóng Ziczac Plinko trên DkTEST",
    tagline:
      "Quả cầu năng lượng nảy ziczac qua 7 tầng đinh phát sáng rơi vào 1 trong 7 cổng thưởng rực rỡ!",
    accentClass: "from-cyan-600 to-blue-600",
    highlights: ["7 cổng thưởng phát sáng", "Vật lý nảy đinh hồi hộp", "Miễn phí 100%"],
    howToPlay: [
      "Chọn miễn phí 1 trong 7 cổng thưởng bên dưới tháp Ziczac trước khi bóng rơi.",
      "Khi Admin bấm thả bóng, quả cầu vàng va chạm ziczac qua từng hàng chốt đinh.",
      "Bóng rơi vào cổng nào, toàn bộ người chơi chọn cổng đó sẽ giành chiến thắng!",
    ],
  },
  penalty_shootout: {
    gameType: "penalty_shootout",
    label: "Sút Luân Lưu Siêu Cúp",
    shortTitle: "Sút Penalty",
    imagePath: "/images/minigames/penalty-shootout.jpg",
    imageAlt: "Minh họa Minigame Sút Luân Lưu Siêu Cúp trên DkTEST",
    tagline:
      "5 góc sút khung thành rực lửa — chọn góc hiểm hóc đánh bại thủ môn để ghi bàn thắng Vàng!",
    accentClass: "from-green-600 to-emerald-600",
    highlights: ["5 góc khung thành", "2 góc ghi bàn thắng Vàng", "Sân cỏ rực lửa"],
    howToPlay: [
      "Chọn miễn phí 1 trong 5 góc sút (Trái Trên, Trái Dưới, Chính Giữa, Phải Trên, Phải Dưới).",
      "Khi Admin thổi còi sút phạt, thủ môn bay người cản phá và lộ diện 2 góc ghi bàn đẹp mắt.",
      "Mọi cầu thủ sút trúng 1 trong 2 góc ghi bàn sẽ cùng nâng Siêu Cúp nhận thưởng!",
    ],
  },
  claw_machine: {
    gameType: "claw_machine",
    label: "Gắp Thú Nhân Phẩm",
    shortTitle: "Gắp Thú",
    imagePath: "/images/minigames/claw-machine.jpg",
    imageAlt: "Minh họa Minigame Gắp Thú Nhân Phẩm trên DkTEST",
    tagline:
      "Tủ gắp thú bông Arcade lung linh với 8 linh vật dễ thương — chọn thú bông bạn tin sẽ được gắp trúng!",
    accentClass: "from-violet-600 to-fuchsia-600",
    highlights: ["8 thú bông dễ thương", "Càng gắp tự động hồi hộp", "Miễn phí 100%"],
    howToPlay: [
      "Chọn miễn phí 1 trong 8 thú bông đáng yêu bên trong tủ kính Arcade.",
      "Khi Admin bấm nút Gắp, càng gắp di chuyển ngang, hạ xuống kẹp thú bông may mắn.",
      "Ai chọn đúng chú thú bông được gắp lên cửa nhận quà sẽ trúng giải thưởng!",
    ],
  },
};

export const MINIGAME_HUB_PREVIEW_IMAGE = "/images/minigames/horse-race.jpg";

export function isValidMinigameType(value: unknown): value is MinigameType {
  return (
    value === "horse_race" ||
    value === "bee_race" ||
    value === "duck_race" ||
    value === "tai_xiu" ||
    value === "bau_cua" ||
    value === "lucky_number" ||
    value === "lucky_wheel" ||
    value === "treasure_flip" ||
    value === "mystery_box" ||
    value === "plinko_drop" ||
    value === "penalty_shootout" ||
    value === "claw_machine"
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
