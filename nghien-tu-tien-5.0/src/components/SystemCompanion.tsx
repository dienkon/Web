/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { PlayerCharacter, GameItem } from "../types";
import {
  getItemTemplate,
  playSound,
  getSystemBuildAdvice,
} from "../utils/gameData";
import { addInventoryItem, normalizeInventoryItems } from "../utils/inventory";
import { ITEM_DATABASE } from "../data/items";
import {
  Cpu,
  ShoppingCart,
  Gift,
  HelpCircle,
  RefreshCw,
  Key,
  Award,
  Sparkles,
  Search,
  ArrowUpDown,
  Coins,
} from "lucide-react";

interface SystemCompanionProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  luckySpinCount: number;
  setLuckySpinCount: React.Dispatch<React.SetStateAction<number>>;
  claimedCodes: string[];
  setClaimedCodes: React.Dispatch<React.SetStateAction<string[]>>;
}

const SYSTEM_QUOTES = [
  "🤖 [Hệ thống cảnh báo] Ngươi quá lười tu luyện rồi! Mau dã ngoại đồ sát yêu thú đột phá đi!",
  "🤖 Đạo tâm của ngươi có chút lung lay. Hãy ăn một viên Hồi Linh Đan tĩnh tâm tu trì.",
  "🤖 [Gợi ý] Hãy lập tức gia nhập tông môn rèn đúc và rải vàng hiến cống để cướp mật bảo.",
  "🤖 Cơ duyên thiên địa đang hội tụ dồi dào, mở Vòng Quay May Mắn ngay đi!",
  "🤖 [Tin tức] Đạo hữu vừa bị một lôi kiếp đánh khóc lóc ở Bí Cảnh, nhớ mua Hộ Phù phòng thân.",
];

// ====== Shop data lấy CHUẨN từ data/items (ITEM_DATABASE) ======
// Mỗi vật phẩm trong DB có field `shop: { enabled, category, currency? }` và `price: { buy, sell, currency }`
// => Chỉ những item có shop.enabled === true mới được bày bán, đảm bảo không lộ item ẩn/quest/material không phải để bán.

type ShopCurrency = "gold" | "spirit" | "jade";

interface ShopListing {
  itemId: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  currency: ShopCurrency;
  category: string;
  rarity?: string;
}

// Map currency string trong data -> currency hệ thống tài nguyên của player (gold/spirit/jade)
const normalizeCurrency = (raw: unknown): ShopCurrency => {
  const c = String(raw || "gold").toLowerCase();
  if (c.includes("spirit") || c.includes("linh")) return "spirit";
  if (c.includes("jade") || c.includes("tien") || c.includes("immortal"))
    return "jade";
  return "gold";
};

// Build danh sách shop chuẩn, lọc đúng theo shop.enabled, nhận JSON đúng định dạng ItemDefinition
const SHOP_ITEMS: ShopListing[] = Object.values(ITEM_DATABASE)
  .filter((def: any) => def?.shop?.enabled === true)
  .map(
    (def: any): ShopListing => ({
      itemId: def.id,
      name: def.name,
      icon:
        typeof def.icon === "string" && /\p{Emoji}/u.test(def.icon)
          ? def.icon
          : "✨",
      desc: def.description || "",
      cost: Number(def?.price?.buy ?? 0),
      currency: normalizeCurrency(def?.shop?.currency ?? def?.price?.currency),
      category: def?.shop?.category || "khac",
      rarity: def?.rarity,
    }),
  )
  .filter((item) => item.cost > 0); // bỏ item lỗi giá / không hợp lệ

// Danh mục hiển thị (label) - khớp đúng với shop.category thực tế trong data/items
const SHOP_CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "TẤT CẢ" },
  { id: "dan", label: "💊 ĐAN DƯỢC" },
  { id: "trang-bi", label: "⚔️ TRANG BỊ" },
  { id: "cong-phap", label: "📖 CÔNG PHÁP" },
  { id: "consumables", label: "🧪 TIÊU HAO" },
  { id: "khac", label: "🔮 KHÁC" },
];

const CURRENCY_LABEL: Record<ShopCurrency, string> = {
  gold: "Vàng",
  spirit: "Linh Thạch",
  jade: "Tiên Ngọc",
};

const DAILY_LOGIN_STORAGE_KEY = "system_companion_daily_login_date";
const CLAIMED_CODES_STORAGE_KEY = "system_companion_claimed_codes";

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const safeReadJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const safeWriteJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (private mode / quota / disabled storage)
  }
};

export default function SystemCompanion({
  player,
  setPlayer,
  inventory,
  setInventory,
  luckySpinCount,
  setLuckySpinCount,
  claimedCodes,
  setClaimedCodes,
}: SystemCompanionProps) {
  const [activeTab, setActiveTab] = useState<
    "shop" | "spin" | "login" | "codes"
  >("shop");
  const [activeQuote, setActiveQuote] = useState(SYSTEM_QUOTES[0]);
  const [giftcodeInput, setGiftcodeInput] = useState("");
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasClaimedDaily, setHasClaimedDaily] = useState(false);

  useEffect(() => {
    const savedClaimedCodes = safeReadJson<string[]>(
      CLAIMED_CODES_STORAGE_KEY,
      [],
    );
    if (savedClaimedCodes.length > 0) {
      setClaimedCodes((prev) => {
        const merged = Array.from(
          new Set([...(prev || []), ...savedClaimedCodes]),
        );
        return merged;
      });
    }

    const savedDailyDate = safeReadJson<string | null>(
      DAILY_LOGIN_STORAGE_KEY,
      null,
    );
    if (savedDailyDate === getLocalDateKey()) {
      setHasClaimedDaily(true);
    }
  }, [setClaimedCodes]);

  useEffect(() => {
    safeWriteJson(CLAIMED_CODES_STORAGE_KEY, claimedCodes);
  }, [claimedCodes]);

  useEffect(() => {
    if (hasClaimedDaily) {
      safeWriteJson(DAILY_LOGIN_STORAGE_KEY, getLocalDateKey());
    }
  }, [hasClaimedDaily]);

  // Shop filter, search & sort states
  const [shopSearch, setShopSearch] = useState("");
  const [shopCategory, setShopCategory] = useState<string>("all");
  const [sortCurrency, setSortCurrency] = useState<"all" | ShopCurrency>("all");
  const [sortPrice, setSortPrice] = useState<"none" | "asc" | "desc">("none");

  // Danh sách shop đã lọc + sắp xếp (memo hoá để tránh tính lại không cần thiết)
  const filteredShopItems = useMemo(() => {
    let list = SHOP_ITEMS.filter((item) => {
      const matchesCategory =
        shopCategory === "all" || item.category === shopCategory;
      const matchesCurrency =
        sortCurrency === "all" || item.currency === sortCurrency;
      const search = shopSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.desc.toLowerCase().includes(search);
      return matchesCategory && matchesCurrency && matchesSearch;
    });

    if (sortPrice === "asc") {
      list = [...list].sort((a, b) => a.cost - b.cost);
    } else if (sortPrice === "desc") {
      list = [...list].sort((a, b) => b.cost - a.cost);
    }

    return list;
  }, [shopCategory, sortCurrency, sortPrice, shopSearch]);

  const triggerQuoteRefresh = () => {
    playSound("click");
    const randomQuote =
      SYSTEM_QUOTES[Math.floor(Math.random() * SYSTEM_QUOTES.length)];
    setActiveQuote(randomQuote);
  };

  // 1. Novel System Shop (Cửa hàng hệ thống)
  const handleBuyItem = (
    itemId: string,
    currency: "gold" | "spirit" | "jade",
    price: number,
  ) => {
    if (currency === "gold" && player.gold < price) {
      alert("Không đủ Vàng để mua!");
      return;
    }
    if (currency === "spirit" && player.spiritStones < price) {
      alert("Không đủ Linh thạch để mua!");
      return;
    }
    if (currency === "jade" && player.immortalJade < price) {
      alert("Không đủ Tiên ngọc tôn phẩm để mua!");
      return;
    }

    playSound("success");

    // Deduct
    setPlayer((prev) => {
      return {
        ...prev,
        gold: currency === "gold" ? prev.gold - price : prev.gold,
        spiritStones:
          currency === "spirit" ? prev.spiritStones - price : prev.spiritStones,
        immortalJade:
          currency === "jade" ? prev.immortalJade - price : prev.immortalJade,
      };
    });

    // Award item
    setInventory((prevInv) => {
      const template = getItemTemplate(itemId);
      if (template)
        return normalizeInventoryItems(
          addInventoryItem(prevInv, { ...template, count: 1 } as GameItem, 1),
        );
      return prevInv;
    });

    alert(`Mua thành công 1x ${getItemTemplate(itemId)?.name || "Vật phẩm"}!`);
  };

  // 2. Daily Login Reward (Quà đăng nhập)
  const handleClaimDaily = () => {
    if (hasClaimedDaily) return;

    playSound("success");
    setHasClaimedDaily(true);
    safeWriteJson(DAILY_LOGIN_STORAGE_KEY, getLocalDateKey());

    // Give 500 Gold, 100 Spirit Stones, and 3x Spin Tickets
    setPlayer((prev) => ({
      ...prev,
      gold: prev.gold + 500,
      spiritStones: prev.spiritStones + 100,
    }));

    setInventory((prevInv) => {
      let nextInv = prevInv;
      const ticket = getItemTemplate("ve_quay_thuong");
      if (ticket) {
        nextInv = normalizeInventoryItems(
          addInventoryItem(nextInv, { ...ticket, count: 3 } as GameItem, 3),
        );
      }
      const stone = getItemTemplate("da_cuong_hoa");
      if (stone) {
        nextInv = normalizeInventoryItems(
          addInventoryItem(nextInv, { ...stone, count: 2 } as GameItem, 2),
        );
      }
      return nextInv;
    });

    alert(
      "🎉 Nhận quà Đăng Nhập Hệ Thống thành công! Nhận +500 Vàng, +100 Linh Thạch, +3 Vé Quay, +2 Đá Cường Hóa.",
    );
  };

  // 3. Lucky Spin Wheel (Quay thưởng)
  const handleLuckySpin = () => {
    const ticket = inventory.find((i) => i.id === "ve_quay_thuong");
    if (!ticket || ticket.count < 1) {
      alert(
        'Không đủ "Vé Quay Thưởng"! Hãy hoàn thành nhiệm vụ tông môn hoặc mua tại Hệ thống cửa hàng.',
      );
      return;
    }

    playSound("click");
    setIsSpinning(true);
    setSpinResult(null);

    // Deduct ticket
    setInventory((prev) =>
      prev
        .map((i) =>
          i.id === "ve_quay_thuong" ? { ...i, count: i.count - 1 } : i,
        )
        .filter((i) => i.count > 0),
    );

    // Spin animation delay (1s)
    setTimeout(() => {
      setIsSpinning(false);
      playSound("success");

      // Random roll rewards
      const pool = [
        // ===== Thường (~70%) =====
        { id: "gold", count: 10000, name: "10.000 Vàng", chance: 20 },
        { id: "gold", count: 25000, name: "25.000 Vàng", chance: 15 },

        { id: "linh_chi", count: 8, name: "8x Linh Chi", chance: 8 },
        { id: "huyen_thiet", count: 8, name: "8x Huyền Thiết", chance: 8 },

        { id: "da_cuong_hoa", count: 5, name: "5x Đá Cường Hóa", chance: 7 },
        { id: "tu_khi_dan", count: 5, name: "5x Tụ Khí Đan", chance: 6 },
        { id: "hoi_linh_dan", count: 3, name: "3x Hồi Linh Đan", chance: 6 },

        // ===== Hiếm (~22%) =====
        { id: "spirit_stone", count: 50, name: "50 Linh Thạch", chance: 5 },
        { id: "spirit_stone", count: 100, name: "100 Linh Thạch", chance: 3 },

        { id: "tinh_thiet", count: 5, name: "5x Tinh Thiết", chance: 2.5 },
        {
          id: "huyen_linh_qua",
          count: 2,
          name: "2x Huyền Linh Quả",
          chance: 2,
        },
        { id: "yeu_dan", count: 5, name: "5x Yêu Đan", chance: 2 },
        { id: "da_tinh_luyen", count: 2, name: "2x Đá Tinh Luyện", chance: 2 },
        { id: "truc_co_dan", count: 1, name: "Trúc Cơ Đan", chance: 2 },
        { id: "ve_bi_canh", count: 1, name: "1x Vé Bí Cảnh", chance: 1.5 },
        {
          id: "ho_phu_do_kiep",
          count: 1,
          name: "1x Hộ Phù Độ Kiếp",
          chance: 1,
        },

        // ===== Cực hiếm (~7%) =====
        { id: "da_thuc_tinh", count: 1, name: "Đá Thức Tỉnh", chance: 1 },
        { id: "da_kham", count: 1, name: "Đá Khảm", chance: 0.8 },
        { id: "kim_dan_dan", count: 1, name: "Kim Đan Đan", chance: 0.5 },
        { id: "bao_thap", count: 1, name: "Huyền Linh Bảo Tháp", chance: 0.3 },
        { id: "phi_kiem", count: 1, name: "Phi Kiếm Thần Sầu", chance: 0.2 },
        {
          id: "trung_linh_thu",
          count: 1,
          name: "1x Trứng Linh Thú Vàng",
          chance: 0.15,
        },

        // ===== Jackpot (<1%) =====
        { id: "immortal_jade", count: 1, name: "1 Tiên Ngọc", chance: 0.08 },
        { id: "immortal_jade", count: 3, name: "3 Tiên Ngọc", chance: 0.02 },

        {
          id: "cuu_chuyen_tien_dan",
          count: 1,
          name: "Cửu Chuyển Tiên Đan",
          chance: 0.01,
        },
      ];

      const totalChance = pool.reduce((sum, item) => sum + item.chance, 0);

      let random = Math.random() * totalChance;

      let roll = pool[0];

      for (const item of pool) {
        random -= item.chance;
        if (random <= 0) {
          roll = item;
          break;
        }
      }

      if (roll.id === "gold") {
        setPlayer((prev) => ({
          ...prev,
          gold: prev.gold + roll.count,
        }));
      } else if (roll.id === "spirit_stone") {
        setPlayer((prev) => ({
          ...prev,
          spiritStones: prev.spiritStones + roll.count,
        }));
      } else if (roll.id === "immortal_jade") {
        setPlayer((prev) => ({
          ...prev,
          immortalJade: prev.immortalJade + roll.count,
        }));
      } else {
        setInventory((prevInv) => {
          const template = getItemTemplate(roll.id);

          if (!template) return prevInv;

          return normalizeInventoryItems(
            addInventoryItem(
              prevInv,
              {
                ...template,
                count: roll.count,
              } as GameItem,
              roll.count,
            ),
          );
        });
      }

      setLuckySpinCount((prev) => prev + 1);
      setSpinResult(`🎉 Ngươi đã quay trúng: ${roll.name}!`);
    }, 1200);
  };

  // 4. Giftcode engine
  const handleClaimCode = () => {
    const code = giftcodeInput.trim().toUpperCase();
    if (!code) return;

    if (claimedCodes.includes(code)) {
      alert("Ngươi đã khẩu nhập mật chú này rồi!");
      return;
    }

    playSound("success");

    if (code === "NGHIEN_TU_TIEN_5") {
      setPlayer((prev) => ({
        ...prev,
        gold: prev.gold + 5000,
        immortalJade: prev.immortalJade + 1,
      }));
      setInventory((prev) => {
        const ticket = getItemTemplate("ve_quay_thuong");
        if (ticket)
          return normalizeInventoryItems(
            addInventoryItem(prev, { ...ticket, count: 5 } as GameItem, 5),
          );
        return prev;
      });
      setClaimedCodes((prev) => {
        const next = [...prev, code];
        safeWriteJson(CLAIMED_CODES_STORAGE_KEY, next);
        return next;
      });
      alert(
        "🎁 Nhập Code thành công! Nhận ngay +5000 Vàng, +1 Tiên ngọc, và 5x Vé Quay Thưởng!",
      );
    } else if (code === "HE_THONG_TOI_CAO") {
      setInventory((prev) => {
        let next = prev;
        const t1 = getItemTemplate("ve_bi_canh");
        const t2 = getItemTemplate("ho_phu_do_kiep");
        if (t1)
          next = normalizeInventoryItems(
            addInventoryItem(next, { ...t1, count: 5 } as GameItem, 5),
          );
        if (t2)
          next = normalizeInventoryItems(
            addInventoryItem(next, { ...t2, count: 3 } as GameItem, 3),
          );
        return next;
      });
      setClaimedCodes((prev) => {
        const next = [...prev, code];
        safeWriteJson(CLAIMED_CODES_STORAGE_KEY, next);
        return next;
      });
      alert(
        "🎁 Nhập Code thành công! Nhận ngay 5x Vé Bí Cảnh thám hiểm và 3x Hộ Phù Hộ Mệnh độ kiếp!",
      );
    } else {
      playSound("failure");
      alert("Mật thuật cổ xưa không trùng khớp! Hãy kiểm tra lại giftcode.");
    }

    setGiftcodeInput("");
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 text-stone-200"
      id="system_companion_pane"
    >
      {/* Upper digital novel dialogue board */}
      <div
        className="bg-stone-950 border-2 border-cyan-500/50 p-4 rounded-lg relative overflow-hidden text-left shadow-lg shadow-cyan-500/5"
        id="novel_dialogue_board"
      >
        <div className="absolute top-0 right-0 p-1 px-1.5 bg-cyan-950 border-b border-l border-cyan-500/30 text-[8px] text-cyan-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
          <Cpu size={10} /> Hệ Thống V5.0
        </div>
        <p className="text-[11px] font-mono font-semibold text-cyan-400 leading-relaxed pr-12">
          {activeQuote}
        </p>
        <button
          onClick={triggerQuoteRefresh}
          className="absolute right-2 bottom-2 p-1.5 bg-cyan-950 hover:bg-cyan-900 rounded-full border border-cyan-800 text-cyan-400 active:scale-90 transition-all"
          title="Tâm tình cùng Hệ Thống"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Build recommendations suggest based on current realm */}
      <div
        className="bg-stone-900 border border-stone-850 p-3 rounded-lg text-left text-xs"
        id="build_advisor_board"
      >
        <p className="text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
          <Cpu size={12} /> Gợi ý Chỉ Số Tu Vi:
        </p>
        <p className="text-[10px] text-stone-300 mt-1 leading-relaxed bg-stone-950/50 p-2 rounded border border-stone-950">
          {getSystemBuildAdvice(player.realmIndex, player.stats)}
        </p>
      </div>

      {/* Inner layout tabs navigation */}
      <div className="flex bg-stone-900 rounded p-1" id="sub_tabs_bar">
        {[
          { id: "shop", label: "Cửa hàng", icon: ShoppingCart },
          { id: "spin", label: "Vòng quay", icon: RefreshCw },
          { id: "login", label: "Điểm danh", icon: Gift },
          { id: "codes", label: "Mật chú", icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playSound("click");
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-600 text-stone-950 font-bold shadow shadow-cyan-500/25"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Icon size={12} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic tab contents panel */}
      <div className="flex-1" id="tab_contents_host">
        {/* Tab 1: System Shop (Cửa hàng) */}
        {activeTab === "shop" && (
          <div className="space-y-3 text-left" id="shop_content">
            {/* Header Title */}
            <div className="flex justify-between items-center" id="shop_header">
              <h4 className="text-[11px] font-black text-stone-300 uppercase tracking-wider">
                Hệ thống Tiên Các Cửa Hàng
              </h4>
              <span className="text-[9px] text-stone-500 font-mono font-bold uppercase">
                Giao dịch linh hoạt
              </span>
            </div>

            {/* Search Input and Icon */}
            <div className="relative" id="shop_search_bar">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <Search size={12} className="text-stone-500" />
              </span>
              <input
                type="text"
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="Tìm kiếm linh dược, pháp bảo, thư tịch..."
                className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-cyan-500 transition-colors font-semibold"
                id="shop_search_input"
              />
              {shopSearch && (
                <button
                  onClick={() => setShopSearch("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-300 text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Scrollable Category Filter Pills */}
            <div
              className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
              id="shop_category_row"
            >
              {SHOP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playSound("click");
                    setShopCategory(cat.id);
                  }}
                  className={`px-3 py-1 text-[9px] font-black rounded-full whitespace-nowrap transition-all border cursor-pointer ${
                    shopCategory === cat.id
                      ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/40 shadow-sm"
                      : "bg-stone-900/60 text-stone-500 border-stone-850 hover:text-stone-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 2 Thanh sắp xếp: theo loại tiền tệ & theo giá trị */}
            <div className="flex gap-2" id="shop_sort_row">
              {/* Sort theo currency */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-stone-500">
                  <Coins size={11} />
                </span>
                <select
                  value={sortCurrency}
                  onChange={(e) => {
                    playSound("click");
                    setSortCurrency(e.target.value as "all" | ShopCurrency);
                  }}
                  className="w-full appearance-none pl-7 pr-2 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-[9px] font-bold text-stone-300 focus:outline-none focus:border-cyan-500 cursor-pointer uppercase"
                  id="shop_sort_currency"
                >
                  <option value="all">Tất cả tiền tệ</option>
                  <option value="gold">Vàng</option>
                  <option value="spirit">Linh Thạch</option>
                  <option value="jade">Tiên Ngọc</option>
                </select>
              </div>

              {/* Sort theo giá trị A-Z / Z-A (thấp -> cao / cao -> thấp) */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-stone-500">
                  <ArrowUpDown size={11} />
                </span>
                <select
                  value={sortPrice}
                  onChange={(e) => {
                    playSound("click");
                    setSortPrice(e.target.value as "none" | "asc" | "desc");
                  }}
                  className="w-full appearance-none pl-7 pr-2 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-[9px] font-bold text-stone-300 focus:outline-none focus:border-cyan-500 cursor-pointer uppercase"
                  id="shop_sort_price"
                >
                  <option value="none">Mặc định</option>
                  <option value="asc">Giá: Thấp → Cao</option>
                  <option value="desc">Giá: Cao → Thấp</option>
                </select>
              </div>
            </div>

            {/* Dynamic Items list */}
            <div
              className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin"
              id="shop_items_list"
            >
              {filteredShopItems.map((item) => (
                <div
                  key={item.itemId}
                  className="p-2.5 bg-stone-900 border border-stone-850 hover:border-cyan-500/15 rounded-xl flex justify-between items-center text-xs text-left transition-all"
                  id={`shop_item_${item.itemId}`}
                >
                  <div
                    className="flex-1 min-w-0 pr-2"
                    id={`shop_info_${item.itemId}`}
                  >
                    <p className="text-[11px] font-black text-stone-200 flex items-center gap-1">
                      {item.icon} {item.name}
                    </p>
                    <p className="text-[9px] text-stone-400 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleBuyItem(item.itemId, item.currency, item.cost)
                    }
                    className="bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-black px-2.5 py-1.5 rounded-lg text-[9px] transition-all active:scale-90 shrink-0 cursor-pointer uppercase tracking-wider whitespace-nowrap shadow-sm"
                  >
                    {item.cost} {CURRENCY_LABEL[item.currency]}
                  </button>
                </div>
              ))}
              {filteredShopItems.length === 0 && (
                <div className="text-center py-8 text-[11px] text-stone-500 font-medium">
                  Không tìm thấy kỳ bảo phẩm nào phù hợp! 🔍
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Lucky Spin (Vòng quay may mắn) */}
        {activeTab === "spin" && (
          <div className="space-y-4 text-center py-4" id="spin_content">
            <h4 className="text-xs font-bold text-cyan-400 uppercase">
              Khí Vận Thiên Địa Vòng Quay May Mắn
            </h4>

            {/* Spinning Visual Wheel Mock */}
            <div
              className="relative w-40 h-40 mx-auto rounded-full bg-stone-950 border-4 border-cyan-500 flex items-center justify-center overflow-hidden"
              id="spinning_wheel_box"
            >
              <div
                className={`absolute inset-0 border border-stone-800 rounded-full transition-all duration-1000 ${
                  isSpinning ? "animate-spin" : ""
                }`}
                style={{
                  backgroundImage:
                    "conic-gradient(from 0deg, #16a34a 0deg 72deg, #ea580c 72deg 144deg, #4f46e5 144deg 216deg, #db2777 216deg 288deg, #0284c7 288deg 360deg)",
                }}
              />
              {/* Inner core pointer */}
              <div className="z-10 w-12 h-12 rounded-full bg-stone-900 border border-cyan-400 flex items-center justify-center font-bold text-[10px] text-cyan-400 font-mono shadow-md">
                QUAY
              </div>
            </div>

            <p className="text-[11px] text-stone-400">
              Tổng lượt quay dã ngoại thành tựu:{" "}
              <b className="text-cyan-400">{luckySpinCount}</b> lượt
            </p>

            <div className="space-y-2.5 max-w-xs mx-auto" id="spin_actions">
              <button
                disabled={isSpinning}
                onClick={handleLuckySpin}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-stone-950 rounded text-xs font-bold active:scale-95 transition-all"
              >
                {isSpinning
                  ? "🌀 ĐANG QUAY VÒNG..."
                  : "🔥 TIÊU 1 VÉ QUAY - PHÁT LỰC QUAY THƯỞNG"}
              </button>

              <p className="text-[9px] text-stone-500 font-mono flex items-center justify-center gap-1">
                <Award size={10} /> Sở hữu:{" "}
                {inventory.find((i) => i.id === "ve_quay_thuong")?.count || 0}{" "}
                Vé Quay Thưởng
              </p>

              {spinResult && (
                <div
                  className="p-2 bg-green-950/20 border border-green-800/40 text-green-300 rounded text-[11px]"
                  id="spin_result_alert"
                >
                  {spinResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Daily Login Rewards (Điểm danh) */}
        {activeTab === "login" && (
          <div className="space-y-4 py-6 text-center" id="login_content">
            <h4 className="text-xs font-bold text-stone-300 uppercase">
              Tụ Linh Nhận Quà Đăng Nhập
            </h4>
            <p className="text-[11px] text-stone-400 leading-relaxed max-w-sm mx-auto">
              Chân nhân tu tiên kiên trì dẻo dai đắc đạo trời độ. Mỗi ngày đăng
              nhập nhận đan dược, lôi kiếp đá cường hóa để gia cường võ học.
            </p>

            <button
              disabled={hasClaimedDaily}
              onClick={handleClaimDaily}
              className={`w-full max-w-xs py-3 rounded text-xs font-bold transition-all ${
                hasClaimedDaily
                  ? "bg-stone-950 border border-stone-850 text-stone-600 cursor-not-allowed"
                  : "bg-cyan-600 hover:bg-cyan-500 text-stone-950 cursor-pointer shadow shadow-cyan-500/20"
              }`}
            >
              {hasClaimedDaily
                ? "✅ ĐÃ NHẬN QUÀ HÔM NAY"
                : "🎁 BÁI LẠI ĐIỂM DANH NHẬN QUÀ"}
            </button>
          </div>
        )}

        {/* Tab 4: Code input (Mật chú) */}
        {activeTab === "codes" && (
          <div className="space-y-4 py-4 text-center" id="codes_content">
            <h4 className="text-xs font-bold text-stone-300 uppercase">
              Khẩu nhập Mật Chú Tiên Bản
            </h4>
            <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
              Nhập các đại chú ẩn để nhận phần quà tiên dược độc đắc:
            </p>

            <div
              className="space-y-2 max-w-xs mx-auto text-left"
              id="codes_form"
            >
              <input
                type="text"
                placeholder="Ví dụ: NGHIEN_TU_TIEN_5"
                value={giftcodeInput}
                onChange={(e) => setGiftcodeInput(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-xs text-white uppercase text-center tracking-widest focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleClaimCode}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-stone-950 rounded text-xs font-bold active:scale-95 transition-all"
              >
                🔥 NHẬP ĐỔI QUÀ
              </button>
            </div>

            <div
              className="bg-stone-900 border border-stone-850 p-3 rounded text-[10px] text-stone-500 space-y-1 text-left max-w-xs mx-auto"
              id="codes_tips"
            >
              <p className="text-amber-500 font-medium">
                💡 Mật chú hệ thống công khai:
              </p>
              <p>
                • <b>NGHIEN_TU_TIEN_5</b> : Đại lễ bao nạp tiền hệ thống cực
                đỉnh.
              </p>
              <p>
                • <b>HE_THONG_TOI_CAO</b> : Lễ bao hỗ trợ độ kiếp và thám thính
                dã ngoại.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
