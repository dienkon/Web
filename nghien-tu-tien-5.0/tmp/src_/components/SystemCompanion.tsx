/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerCharacter, GameItem } from '../types';
import { getItemTemplate, playSound, getSystemBuildAdvice } from '../utils/gameData';
import { addInventoryItem, normalizeInventoryItems } from '../utils/inventory';
import { Cpu, ShoppingCart, Gift, HelpCircle, RefreshCw, Key, Award, Sparkles, Search } from 'lucide-react';

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
  "🤖 [Tin tức] Đạo hữu vừa bị một lôi kiếp đánh khóc lóc ở Bí Cảnh, nhớ mua Hộ Phù phòng thân."
];

const SHOP_ITEMS = [
  // Consumables / Đan Dược
  { itemId: 'tu_khi_dan', name: '💊 Tụ Khí Đan', cost: 120, currency: 'gold', desc: 'Đan dược sơ cấp tăng 1500 tu vi tức thì.', category: 'dan_duoc' },
  { itemId: 'truc_co_dan', name: '💊 Trúc Cơ Đan', cost: 1000, currency: 'gold', desc: 'Tăng 10% tỉ lệ đột phá Trúc Cơ, +1000 tu vi.', category: 'dan_duoc' },
  { itemId: 'kim_dan_dan', name: '💊 Kim Đan Đan', cost: 5000, currency: 'gold', desc: 'Tăng 15% tỉ lệ đột phá Kim Đan, +10k tu vi.', category: 'dan_duoc' },
  { itemId: 'nguyen_anh_dan', name: '💊 Nguyên Anh Đan', cost: 15000, currency: 'gold', desc: 'Tăng 15% tỉ lệ đột phá Nguyên Anh, +100k tu vi.', category: 'dan_duoc' },
  { itemId: 'hoa_than_dan', name: '💊 Hóa Thần Đan', cost: 800, currency: 'spirit', desc: 'Tăng 15% tỉ lệ đột phá Hóa Thần, +1M tu vi.', category: 'dan_duoc' },
  { itemId: 'do_kiep_dan', name: '💊 Độ Kiếp Đan', cost: 2500, currency: 'spirit', desc: 'Hộ vệ tâm mạch tránh mất tu vi khi thất bại, +20% tỉ lệ.', category: 'dan_duoc' },
  { itemId: 'tien_linh_dan', name: '✨ Tiên Linh Đan', cost: 80, currency: 'jade', desc: 'Luyện tự tinh khí Tiên Giới, tăng thẳng 50M tu vi.', category: 'dan_duoc' },
  { itemId: 'cuu_chuyen_tien_dan', name: '☯️ Cửu Chuyển Tiên Đan', cost: 250, currency: 'jade', desc: 'Nghịch thiên cải mệnh, hồi sinh tức thì khi đột phá xịt.', category: 'dan_duoc' },

  // Keys / Tickets / Chỉ lệnh & Chìa khóa
  { itemId: 've_bi_canh', name: '🎟️ Vé Bí Cảnh', cost: 350, currency: 'gold', desc: 'Giấy thông hành dã ngoại thám hiểm bí cảnh ngẫu nhiên.', category: 'chia_khoa' },
  { itemId: 've_dau_truong', name: '🎟️ Vé Đấu Trường', cost: 250, currency: 'gold', desc: 'Sử dụng để lôi đài tỷ võ tranh phong hạng đấu.', category: 'chia_khoa' },
  { itemId: 've_quay_thuong', name: '🎟️ Vé Quay Thưởng', cost: 500, currency: 'gold', desc: 'Một lượt tham gia quay vòng quay may mắn may rủi.', category: 'chia_khoa' },
  { itemId: 'chia_khoa_dong', name: '🔑 Chìa Khóa Đồng', cost: 150, currency: 'gold', desc: 'Mở rương rỉ sét nhặt quặng cơ bản.', category: 'chia_khoa' },
  { itemId: 'chia_khoa_bac', name: '🔑 Chìa Khóa Bạc', cost: 500, currency: 'gold', desc: 'Mở rương bạc dã ngoại tìm trang bị lục/lam.', category: 'chia_khoa' },
  { itemId: 'chia_khoa_vang', name: '🔑 Chìa Khóa Vàng', cost: 150, currency: 'spirit', desc: 'Mở rương vàng cổ xưa tìm võ kỹ/linh thảo tía.', category: 'chia_khoa' },
  { itemId: 'chia_khoa_tien', name: '🔑 Chìa Khóa Tiên', cost: 50, currency: 'jade', desc: 'Mở Tiên khí chí tôn rương săn bảo pháp thần thoại.', category: 'chia_khoa' },

  // Enhancement & Gems / Rèn & Khảm nạm
  { itemId: 'da_cuong_hoa', name: '💎 Đá Cường Hóa', cost: 200, currency: 'gold', desc: 'Cường hóa rèn dũa trang bị võ học cực hạn (+1 -> +5).', category: 'kham_ren' },
  { itemId: 'da_tinh_luyen', name: '💎 Đá Tinh Luyện', cost: 100, currency: 'spirit', desc: 'Tinh luyện rèn dũa trang bị cấp trung (+6 -> +10).', category: 'kham_ren' },
  { itemId: 'da_tay_luyen', name: '💎 Đá Tẩy Luyện', cost: 400, currency: 'spirit', desc: 'Tẩy sửa lại các thuộc tính bổ trợ của vũ khí giáp sĩ.', category: 'kham_ren' },
  { itemId: 'da_dot_pha_item', name: '⚡ Đá Đột Phá', cost: 30, currency: 'jade', desc: 'Đột phá giới hạn cường hóa cực đại của pháp bảo (+15).', category: 'kham_ren' },
  { itemId: 'hong_ngoc', name: '🔴 Hồng Ngọc (Công)', cost: 300, currency: 'spirit', desc: 'Khảm nạm vào vũ khí tăng Công +15% cực rực.', category: 'kham_ren' },
  { itemId: 'lam_ngoc', name: '🔵 Lam Ngọc (HP)', cost: 300, currency: 'spirit', desc: 'Khảm nạm vào giáp bảo tăng Sinh Lực HP +20%.', category: 'kham_ren' },
  { itemId: 'tu_ngoc', name: '🟣 Tử Ngọc (Bạo Kích)', cost: 25, currency: 'jade', desc: 'Khảm nạm vào nhẫn pháp bảo tăng Tỉ Lệ Bạo +8%.', category: 'kham_ren' },
  { itemId: 'tien_ngoc_gem', name: '🌟 Tiên Ngọc Gem', cost: 120, currency: 'jade', desc: 'Hạt ngọc thượng cổ tăng toàn bộ thuộc tính cơ bản +10%.', category: 'kham_ren' },

  // Manuals / Thư Tịch Võ Học
  { itemId: 'vo_ky_tuyet_hoc', name: '📖 Sổ Tay Võ Kỹ', cost: 800, currency: 'gold', desc: 'Sổ học kỹ năng chiến đấu cận chiến tăng Công +30.', category: 'thu_tich' },
  { itemId: 'than_phap_cuu_bien', name: '📖 Thân Pháp Cửu Biến', cost: 350, currency: 'spirit', desc: 'Bí thuật tăng Tốc đánh +15% và Né tránh +5%.', category: 'thu_tich' },
  { itemId: 'bi_thuat_tam_phap', name: '📖 Bí Thuật Tâm Pháp', cost: 450, currency: 'spirit', desc: 'Khơi thông kinh mạch tăng Thần pháp lực +40.', category: 'thu_tich' },
  { itemId: 'ngu_thu_thuat_kinh', name: '📖 Ngự Thú Thuật Kinh', cost: 45, currency: 'jade', desc: 'Bí quyết thu phục thần thú Kỳ Lân/Thần Long thượng cổ.', category: 'thu_tich' },

  // Artifacts / Pháp Bảo Chí Tôn
  { itemId: 'phi_kiem', name: '🗡️ Phi Kiếm Thần Sầu', cost: 40, currency: 'jade', desc: 'Ngự kiếm phi hành, tăng +15% Tốc đánh dã ngoại.', category: 'phap_bao' },
  { itemId: 'ho_lo', name: '🍶 Hồ Lô Linh Khí', cost: 40, currency: 'jade', desc: 'Ngậm linh tiên lực tăng +20% Hồi Mana tĩnh tâm.', category: 'phap_bao' },
  { itemId: 'bao_thap', name: '🛕 Huyền Linh Bảo Tháp', cost: 80, currency: 'jade', desc: 'Pháp bảo giam yêu thủ hộ, tăng +15% Phòng thủ.', category: 'phap_bao' },
  { itemId: 'kinh_can_khon', name: '🪞 Kính Càn Khôn', cost: 120, currency: 'jade', desc: 'Phản chiếu thiên địa vũ trụ, phản 10% sát thương nhận.', category: 'phap_bao' },
  { itemId: 'hon_don_chau', name: '🔮 Hỗn Độn Châu', cost: 180, currency: 'jade', desc: 'Ngọc hỗn mang cực đại, tăng +50% tu luyện AFK giây.', category: 'phap_bao' },
  { itemId: 'tru_tien_kiem', name: '⚔️ Tru Tiên Kiếm', cost: 350, currency: 'jade', desc: 'Đệ nhất thượng cổ thần sát kiếm, cộng thẳng +50% Sức Công.', category: 'phap_bao' }
];

export default function SystemCompanion({
  player,
  setPlayer,
  inventory,
  setInventory,
  luckySpinCount,
  setLuckySpinCount,
  claimedCodes,
  setClaimedCodes
}: SystemCompanionProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'spin' | 'login' | 'codes'>('shop');
  const [activeQuote, setActiveQuote] = useState(SYSTEM_QUOTES[0]);
  const [giftcodeInput, setGiftcodeInput] = useState('');
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasClaimedDaily, setHasClaimedDaily] = useState(false);

  // Shop filter and search states
  const [shopSearch, setShopSearch] = useState('');
  const [shopCategory, setShopCategory] = useState<'all' | 'dan_duoc' | 'chia_khoa' | 'kham_ren' | 'thu_tich' | 'phap_bao'>('all');

  const triggerQuoteRefresh = () => {
    playSound('click');
    const randomQuote = SYSTEM_QUOTES[Math.floor(Math.random() * SYSTEM_QUOTES.length)];
    setActiveQuote(randomQuote);
  };

  // 1. Novel System Shop (Cửa hàng hệ thống)
  const handleBuyItem = (itemId: string, currency: 'gold' | 'spirit' | 'jade', price: number) => {
    if (currency === 'gold' && player.gold < price) {
      alert('Không đủ Vàng để mua!');
      return;
    }
    if (currency === 'spirit' && player.spiritStones < price) {
      alert('Không đủ Linh thạch để mua!');
      return;
    }
    if (currency === 'jade' && player.immortalJade < price) {
      alert('Không đủ Tiên ngọc tôn phẩm để mua!');
      return;
    }

    playSound('success');

    // Deduct
    setPlayer((prev) => {
      return {
        ...prev,
        gold: currency === 'gold' ? prev.gold - price : prev.gold,
        spiritStones: currency === 'spirit' ? prev.spiritStones - price : prev.spiritStones,
        immortalJade: currency === 'jade' ? prev.immortalJade - price : prev.immortalJade
      };
    });

    // Award item
    setInventory((prevInv) => {
      const template = getItemTemplate(itemId);
      if (template) return normalizeInventoryItems(addInventoryItem(prevInv, { ...template, count: 1 } as GameItem, 1));
      return prevInv;
    });

    alert(`Mua thành công 1x ${getItemTemplate(itemId)?.name || 'Vật phẩm'}!`);
  };

  // 2. Daily Login Reward (Quà đăng nhập)
  const handleClaimDaily = () => {
    if (hasClaimedDaily) return;

    playSound('success');
    setHasClaimedDaily(true);

    // Give 500 Gold, 100 Spirit Stones, and 3x Spin Tickets
    setPlayer((prev) => ({
      ...prev,
      gold: prev.gold + 500,
      spiritStones: prev.spiritStones + 100
    }));

    setInventory((prevInv) => {
      let nextInv = prevInv;
      const ticket = getItemTemplate('ve_quay_thuong');
      if (ticket) {
        nextInv = normalizeInventoryItems(addInventoryItem(nextInv, { ...ticket, count: 3 } as GameItem, 3));
      }
      const stone = getItemTemplate('da_cuong_hoa');
      if (stone) {
        nextInv = normalizeInventoryItems(addInventoryItem(nextInv, { ...stone, count: 2 } as GameItem, 2));
      }
      return nextInv;
    });

    alert('🎉 Nhận quà Đăng Nhập Hệ Thống thành công! Nhận +500 Vàng, +100 Linh Thạch, +3 Vé Quay, +2 Đá Cường Hóa.');
  };

  // 3. Lucky Spin Wheel (Quay thưởng)
  const handleLuckySpin = () => {
    const ticket = inventory.find((i) => i.id === 've_quay_thuong');
    if (!ticket || ticket.count < 1) {
      alert('Không đủ "Vé Quay Thưởng"! Hãy hoàn thành nhiệm vụ tông môn hoặc mua tại Hệ thống cửa hàng.');
      return;
    }

    playSound('click');
    setIsSpinning(true);
    setSpinResult(null);

    // Deduct ticket
    setInventory((prev) => prev.map((i) => i.id === 've_quay_thuong' ? { ...i, count: i.count - 1 } : i).filter((i) => i.count > 0));

    // Spin animation delay (1s)
    setTimeout(() => {
      setIsSpinning(false);
      playSound('success');

      // Random roll rewards
      const pool = [
        { id: 've_bi_canh', count: 1, name: '1x Vé Bí Cảnh', chance: 0.2 },
        { id: 'ho_phu_do_kiep', count: 1, name: '1x Hộ Phù Độ Kiếp', chance: 0.15 },
        { id: 'trung_linh_thu', count: 1, name: '1x Trứng Linh Thú Vàng', chance: 0.05 },
        { id: 'da_cuong_hoa', count: 5, name: '5x Đá Cường Hóa', chance: 0.3 },
        { id: 'tu_khi_dan', count: 5, name: '5x Tụ Khí Đan', chance: 0.3 }
      ];

      // Pick randomly
      const roll = pool[Math.floor(Math.random() * pool.length)];

      setInventory((prevInv) => {
        const template = getItemTemplate(roll.id);
        if (template) return normalizeInventoryItems(addInventoryItem(prevInv, { ...template, count: roll.count } as GameItem, roll.count));
        return prevInv;
      });

      setLuckySpinCount((prev) => prev + 1);
      setSpinResult(`🎉 Ngươi đã quay trúng: ${roll.name}!`);
    }, 1200);
  };

  // 4. Giftcode engine
  const handleClaimCode = () => {
    const code = giftcodeInput.trim().toUpperCase();
    if (!code) return;

    if (claimedCodes.includes(code)) {
      alert('Ngươi đã khẩu nhập mật chú này rồi!');
      return;
    }

    playSound('success');

    if (code === 'NGHIEN_TU_TIEN_5') {
      setPlayer((prev) => ({
        ...prev,
        gold: prev.gold + 5000,
        immortalJade: prev.immortalJade + 500
      }));
      setInventory((prev) => {
        const ticket = getItemTemplate('ve_quay_thuong');
        if (ticket) return normalizeInventoryItems(addInventoryItem(prev, { ...ticket, count: 5 } as GameItem, 5));
        return prev;
      });
      setClaimedCodes((prev) => [...prev, code]);
      alert('🎁 Nhập Code thành công! Nhận ngay +5000 Vàng, +500 Tiên ngọc, và 5x Vé Quay Thưởng!');
    } else if (code === 'HE_THONG_TOI_CAO') {
      setInventory((prev) => {
        let next = prev;
        const t1 = getItemTemplate('ve_bi_canh');
        const t2 = getItemTemplate('ho_phu_do_kiep');
        if (t1) next = normalizeInventoryItems(addInventoryItem(next, { ...t1, count: 5 } as GameItem, 5));
        if (t2) next = normalizeInventoryItems(addInventoryItem(next, { ...t2, count: 3 } as GameItem, 3));
        return next;
      });
      setClaimedCodes((prev) => [...prev, code]);
      alert('🎁 Nhập Code thành công! Nhận ngay 5x Vé Bí Cảnh thám hiểm và 3x Hộ Phù Hộ Mệnh độ kiếp!');
    } else {
      playSound('failure');
      alert('Mật thuật cổ xưa không trùng khớp! Hãy kiểm tra lại giftcode.');
    }

    setGiftcodeInput('');
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-200" id="system_companion_pane">
      
      {/* Upper digital novel dialogue board */}
      <div className="bg-stone-950 border-2 border-cyan-500/50 p-4 rounded-lg relative overflow-hidden text-left shadow-lg shadow-cyan-500/5" id="novel_dialogue_board">
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
      <div className="bg-stone-900 border border-stone-850 p-3 rounded-lg text-left text-xs" id="build_advisor_board">
        <p className="text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1"><Cpu size={12} /> Gợi ý Chỉ Số Tu Vi:</p>
        <p className="text-[10px] text-stone-300 mt-1 leading-relaxed bg-stone-950/50 p-2 rounded border border-stone-950">
          {getSystemBuildAdvice(player.realmIndex, player.stats)}
        </p>
      </div>

      {/* Inner layout tabs navigation */}
      <div className="flex bg-stone-900 rounded p-1" id="sub_tabs_bar">
        {[
          { id: 'shop', label: 'Cửa hàng', icon: ShoppingCart },
          { id: 'spin', label: 'Vòng quay', icon: RefreshCw },
          { id: 'login', label: 'Điểm danh', icon: Gift },
          { id: 'codes', label: 'Mật chú', icon: Key }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { playSound('click'); setActiveTab(tab.id as any); }}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all ${
                activeTab === tab.id 
                  ? 'bg-cyan-600 text-stone-950 font-bold shadow shadow-cyan-500/25' 
                  : 'text-stone-400 hover:text-stone-200'
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
        {activeTab === 'shop' && (
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
                  onClick={() => setShopSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-300 text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Scrollable Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" id="shop_category_row">
              {[
                { id: 'all', label: 'TẤT CẢ' },
                { id: 'dan_duoc', label: '💊 ĐAN DƯỢC' },
                { id: 'chia_khoa', label: '🔑 CHÌA KHÓA' },
                { id: 'kham_ren', label: '💎 RÈN & KHẢM' },
                { id: 'thu_tich', label: '📖 VÕ HỌC' },
                { id: 'phap_bao', label: '🔮 PHÁP BẢO' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { playSound('click'); setShopCategory(cat.id as any); }}
                  className={`px-3 py-1 text-[9px] font-black rounded-full whitespace-nowrap transition-all border cursor-pointer ${
                    shopCategory === cat.id
                      ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/40 shadow-sm'
                      : 'bg-stone-900/60 text-stone-500 border-stone-850 hover:text-stone-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Dynamic Items list */}
            <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin" id="shop_items_list">
              {SHOP_ITEMS.filter((item) => {
                const matchesCategory = shopCategory === 'all' || item.category === shopCategory;
                const matchesSearch = item.name.toLowerCase().includes(shopSearch.toLowerCase()) || 
                                     item.desc.toLowerCase().includes(shopSearch.toLowerCase());
                return matchesCategory && matchesSearch;
              }).map((item) => (
                <div 
                  key={item.itemId}
                  className="p-2.5 bg-stone-900 border border-stone-850 hover:border-cyan-500/15 rounded-xl flex justify-between items-center text-xs text-left transition-all"
                  id={`shop_item_${item.itemId}`}
                >
                  <div className="flex-1 min-w-0 pr-2" id={`shop_info_${item.itemId}`}>
                    <p className="text-[11px] font-black text-stone-200 flex items-center gap-1">
                      {item.name}
                    </p>
                    <p className="text-[9px] text-stone-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => handleBuyItem(item.itemId, item.currency as any, item.cost)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-black px-2.5 py-1.5 rounded-lg text-[9px] transition-all active:scale-90 shrink-0 cursor-pointer uppercase tracking-wider whitespace-nowrap shadow-sm"
                  >
                    {item.cost} {item.currency === 'gold' ? 'Vàng' : item.currency === 'spirit' ? 'Linh Thạch' : 'Tiên Ngọc'}
                  </button>
                </div>
              ))}
              {SHOP_ITEMS.filter((item) => {
                const matchesCategory = shopCategory === 'all' || item.category === shopCategory;
                const matchesSearch = item.name.toLowerCase().includes(shopSearch.toLowerCase()) || 
                                     item.desc.toLowerCase().includes(shopSearch.toLowerCase());
                return matchesCategory && matchesSearch;
              }).length === 0 && (
                <div className="text-center py-8 text-[11px] text-stone-500 font-medium">
                  Không tìm thấy kỳ bảo phẩm nào phù hợp! 🔍
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Lucky Spin (Vòng quay may mắn) */}
        {activeTab === 'spin' && (
          <div className="space-y-4 text-center py-4" id="spin_content">
            <h4 className="text-xs font-bold text-cyan-400 uppercase">Khí Vận Thiên Địa Vòng Quay May Mắn</h4>
            
            {/* Spinning Visual Wheel Mock */}
            <div className="relative w-40 h-40 mx-auto rounded-full bg-stone-950 border-4 border-cyan-500 flex items-center justify-center overflow-hidden" id="spinning_wheel_box">
              <div 
                className={`absolute inset-0 border border-stone-800 rounded-full transition-all duration-1000 ${
                  isSpinning ? 'animate-spin' : ''
                }`}
                style={{
                  backgroundImage: 'conic-gradient(from 0deg, #16a34a 0deg 72deg, #ea580c 72deg 144deg, #4f46e5 144deg 216deg, #db2777 216deg 288deg, #0284c7 288deg 360deg)'
                }}
              />
              {/* Inner core pointer */}
              <div className="z-10 w-12 h-12 rounded-full bg-stone-900 border border-cyan-400 flex items-center justify-center font-bold text-[10px] text-cyan-400 font-mono shadow-md">
                QUAY
              </div>
            </div>

            <p className="text-[11px] text-stone-400">
              Tổng lượt quay dã ngoại thành tựu: <b className="text-cyan-400">{luckySpinCount}</b> lượt
            </p>

            <div className="space-y-2.5 max-w-xs mx-auto" id="spin_actions">
              <button
                disabled={isSpinning}
                onClick={handleLuckySpin}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-stone-950 rounded text-xs font-bold active:scale-95 transition-all"
              >
                {isSpinning ? '🌀 ĐANG QUAY VÒNG...' : '🔥 TIÊU 1 VÉ QUAY - PHÁT LỰC QUAY THƯỞNG'}
              </button>

              <p className="text-[9px] text-stone-500 font-mono flex items-center justify-center gap-1"><Award size={10} /> Sở hữu: {inventory.find((i) => i.id === 've_quay_thuong')?.count || 0} Vé Quay Thưởng</p>

              {spinResult && (
                <div className="p-2 bg-green-950/20 border border-green-800/40 text-green-300 rounded text-[11px]" id="spin_result_alert">
                  {spinResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Daily Login Rewards (Điểm danh) */}
        {activeTab === 'login' && (
          <div className="space-y-4 py-6 text-center" id="login_content">
            <h4 className="text-xs font-bold text-stone-300 uppercase">Tụ Linh Nhận Quà Đăng Nhập</h4>
            <p className="text-[11px] text-stone-400 leading-relaxed max-w-sm mx-auto">
              Chân nhân tu tiên kiên trì dẻo dai đắc đạo trời độ. Mỗi ngày đăng nhập nhận đan dược, lôi kiếp đá cường hóa để gia cường võ học.
            </p>

            <button
              disabled={hasClaimedDaily}
              onClick={handleClaimDaily}
              className={`w-full max-w-xs py-3 rounded text-xs font-bold transition-all ${
                hasClaimedDaily 
                  ? 'bg-stone-950 border border-stone-850 text-stone-600 cursor-not-allowed' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-stone-950 cursor-pointer shadow shadow-cyan-500/20'
              }`}
            >
              {hasClaimedDaily ? '✅ ĐÃ NHẬN QUÀ HÔM NAY' : '🎁 BÁI LẠI ĐIỂM DANH NHẬN QUÀ'}
            </button>
          </div>
        )}

        {/* Tab 4: Code input (Mật chú) */}
        {activeTab === 'codes' && (
          <div className="space-y-4 py-4 text-center" id="codes_content">
            <h4 className="text-xs font-bold text-stone-300 uppercase">Khẩu nhập Mật Chú Tiên Bản</h4>
            <p className="text-[11px] text-stone-400 max-w-xs mx-auto">Nhập các đại chú ẩn để nhận phần quà tiên dược độc đắc:</p>
            
            <div className="space-y-2 max-w-xs mx-auto text-left" id="codes_form">
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

            <div className="bg-stone-900 border border-stone-850 p-3 rounded text-[10px] text-stone-500 space-y-1 text-left max-w-xs mx-auto" id="codes_tips">
              <p className="text-amber-500 font-medium">💡 Mật chú hệ thống công khai:</p>
              <p>• <b>NGHIEN_TU_TIEN_5</b> : Đại lễ bao nạp tiền hệ thống cực đỉnh.</p>
              <p>• <b>HE_THONG_TOI_CAO</b> : Lễ bao hỗ trợ độ kiếp và thám thính dã ngoại.</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
