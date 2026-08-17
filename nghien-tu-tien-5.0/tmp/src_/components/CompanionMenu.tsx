/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerCharacter, Companion, SpiritBeast, GameItem } from '../types';
import { COMPANION_TEMPLATES, SPIRIT_BEAST_TEMPLATES, playSound } from '../utils/gameData';
import { User, Users, Star, Sparkles, Heart, Shield, Award, Sparkle } from 'lucide-react';

interface CompanionMenuProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  companions: Companion[];
  setCompanions: React.Dispatch<React.SetStateAction<Companion[]>>;
  spiritBeasts: SpiritBeast[];
  setSpiritBeasts: React.Dispatch<React.SetStateAction<SpiritBeast[]>>;
  onUpdateStats: () => void;
}

export default function CompanionMenu({
  player,
  setPlayer,
  inventory,
  setInventory,
  companions,
  setCompanions,
  spiritBeasts,
  setSpiritBeasts,
  onUpdateStats
}: CompanionMenuProps) {
  const [activeTab, setActiveTab] = useState<'companions' | 'beasts' | 'songtu'>('companions');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('bach_ngung_bang');
  const [songTuAnimate, setSongTuAnimate] = useState(false);
  const [songTuLog, setSongTuLog] = useState<string[]>([]);

  // List of possible romantic dual cultivation partners
  const songTuPartnersList = [
    { id: 'bach_ngung_bang', name: '❄️ Bạch Ngưng Băng', desc: 'Linh Thể Băng Tộc, tính cách cao ngạo lạnh lùng nhưng tâm tư thuần khiết.', bonus: 'Cộng thêm +10% Tu luyện Đột phá' },
    { id: 'to_nhu_ngoc', name: '🌸 Tô Như Ngọc', desc: 'Mị Linh Tiên Tử, am hiểu Song Tu Cực Lạc Tâm Pháp bậc nhất nhân gian.', bonus: 'Cộng thêm +15% Kháng thuộc tính bạo kích' },
    { id: 'diap_thanh', name: '🌿 Diệp Thanh', desc: 'Thần y mộc linh, giúp hồi phục chân khí kinh mạch ấm áp dồi dào.', bonus: 'Cộng thêm +15% Hút máu & HP' },
    { id: 'tieu_viem', name: '🔥 Tiêu Viêm', desc: 'Viêm Đế chí tôn, giúp tôi luyện gân cốt nóng bỏng cường hóa thân thể.', bonus: 'Cộng thêm +15% Sát Thương (Công)' }
  ];

  // Perform Song Tu action
  const handlePerformSongTu = (type: 'santhien' | 'linhgiac' | 'trangdao', cost: number) => {
    if (player.spiritStones < cost) {
      alert('Không đủ Linh thạch để trang trải chi phí nghi lễ Song Tu Đắc Đạo!');
      return;
    }

    playSound('success');
    setSongTuAnimate(true);

    // Deduct cost and give reward
    let expReward = 0;
    let goldReward = 0;
    let ritualName = '';

    if (type === 'santhien') {
      expReward = 5000;
      goldReward = 150;
      ritualName = 'Tâm Linh Tương Thông';
    } else if (type === 'linhgiac') {
      expReward = 22000;
      goldReward = 450;
      ritualName = 'Linh Hồn Hòa Quyện';
    } else {
      expReward = 95000;
      goldReward = 1500;
      ritualName = 'Đại Đạo Quy Nhất';
    }

    const partner = songTuPartnersList.find((p) => p.id === selectedPartnerId);

    setPlayer((prev) => ({
      ...prev,
      spiritStones: prev.spiritStones - cost,
      gold: prev.gold + goldReward,
      cultivation: prev.cultivation + expReward
    }));

    setTimeout(() => {
      setSongTuAnimate(false);
      const newLog = `[${new Date().toLocaleTimeString()}] Đạo hữu cùng ${partner?.name} thực hiện nghi thức Song Tu [${ritualName}], nhận được +${expReward.toLocaleString()} Tu vi và +${goldReward.toLocaleString()} Vàng đút túi!`;
      setSongTuLog((prev) => [newLog, ...prev.slice(0, 9)]);
    }, 1500);
  };

  // Handle unlocking companion with fragments (Mảnh Tiên Hữu)
  const handleUnlockCompanion = (comp: Companion) => {
    const fragment = inventory.find((i) => i.id === 'manh_dong_hanh');
    const needed = comp.rarity === 'Cam' || comp.rarity === 'Đỏ' ? 10 : 5;

    if (!fragment || fragment.count < needed) {
      alert(`Không đủ Mảnh Tiên Hữu! Đòi hỏi ${needed} mảnh để chiêu mộ. Thu thập thêm từ Bí Cảnh hoặc quà đăng nhập.`);
      return;
    }

    playSound('success');

    // Deduct mảnh
    setInventory((prev) => prev.map((i) => i.id === 'manh_dong_hanh' ? { ...i, count: i.count - needed } : i).filter((i) => i.count > 0));

    // Unlock
    setCompanions((prev) => prev.map((c) => c.id === comp.id ? { ...c, unlocked: true } : c));
  };

  // Toggle activate status
  const handleToggleCompanion = (id: string) => {
    playSound('click');

    setCompanions((prev) => {
      const next = prev.map((c) => {
        if (c.id === id) {
          // Can toggle current status
          const nextActive = !c.active;
          return { ...c, active: nextActive };
        }
        // In this game model, we can have up to 2 active companions
        return c;
      });

      // Verify max 2 companions active
      const activeCount = next.filter((c) => c.active).length;
      if (activeCount > 2) {
        alert('Mức xếp quân tiên giới giới hạn chỉ hỗ trợ tối đa 2 Tiên Hữu cùng hành quân!');
        return prev;
      }

      return next;
    });

    setTimeout(() => onUpdateStats(), 50);
  };

  // Upgrade companion star (Tăng sao)
  const handleStarUpCompanion = (id: string) => {
    const fragment = inventory.find((i) => i.id === 'manh_dong_hanh');
    if (!fragment || fragment.count < 3) {
      alert('Đòi hỏi tối thiểu 3 Mảnh Tiên Hữu để thăng tinh thăng sao!');
      return;
    }

    playSound('success');

    setInventory((prev) => prev.map((i) => i.id === 'manh_dong_hanh' ? { ...i, count: i.count - 3 } : i).filter((i) => i.count > 0));

    setCompanions((prev) => prev.map((c) => {
      if (c.id === id) {
        const nextStar = Math.min(5, c.stars + 1);
        return {
          ...c,
          stars: nextStar,
          hp: Math.round(c.hp * 1.3),
          atk: Math.round(c.atk * 1.3),
          def: Math.round(c.def * 1.3)
        };
      }
      return c;
    }));

    setTimeout(() => onUpdateStats(), 50);
  };

  // Spirit Beasts interactions: Unlock with "Trứng Linh Thú" or Fragments
  const handleUnlockBeast = (beast: SpiritBeast) => {
    const egg = inventory.find((i) => i.id === 'trung_linh_thu');
    const fragments = inventory.find((i) => i.id === 'manh_linh_thu');

    const canUnlock = (egg && egg.count > 0) || (fragments && fragments.count >= 8);
    if (!canUnlock) {
      alert('Cần 1 Trứng Linh Thú hoặc 8 Mảnh Linh Thú để ấp nở thành công yêu hồ rùa thần!');
      return;
    }

    playSound('success');

    // Deduct egg or fragment
    setInventory((prev) => {
      if (egg && egg.count > 0) {
        return prev.map((i) => i.id === 'trung_linh_thu' ? { ...i, count: i.count - 1 } : i).filter((i) => i.count > 0);
      } else {
        return prev.map((i) => i.id === 'manh_linh_thu' ? { ...i, count: i.count - 8 } : i).filter((i) => i.count > 0);
      }
    });

    setSpiritBeasts((prev) => prev.map((b) => b.id === beast.id ? { ...b, unlocked: true } : b));
  };

  const handleToggleBeast = (id: string) => {
    playSound('click');

    setSpiritBeasts((prev) => {
      return prev.map((b) => {
        if (b.id === id) {
          return { ...b, active: !b.active };
        }
        // Only 1 spirit beast can be active at a time
        return { ...b, active: false };
      });
    });

    setTimeout(() => onUpdateStats(), 50);
  };

  const handleStarUpBeast = (id: string) => {
    const fragment = inventory.find((i) => i.id === 'manh_linh_thu');
    if (!fragment || fragment.count < 4) {
      alert('Không đủ 4 Mảnh Linh Thú để tiến hóa tinh thần thăng cấp thần thú!');
      return;
    }

    playSound('success');

    setInventory((prev) => prev.map((i) => i.id === 'manh_linh_thu' ? { ...i, count: i.count - 4 } : i).filter((i) => i.count > 0));

    setSpiritBeasts((prev) => prev.map((b) => {
      if (b.id === id) {
        const nextStar = Math.min(5, b.stars + 1);
        
        // Boost scaling stats bonuses
        const nextBonus = { ...b.bonusStats };
        if (nextBonus.atk) nextBonus.atk = Math.round(nextBonus.atk * 1.4);
        if (nextBonus.maxHp) nextBonus.maxHp = Math.round(nextBonus.maxHp * 1.4);
        if (nextBonus.def) nextBonus.def = Math.round(nextBonus.def * 1.4);

        return {
          ...b,
          stars: nextStar,
          bonusStats: nextBonus
        };
      }
      return b;
    }));

    setTimeout(() => onUpdateStats(), 50);
  };

  const activeCompanionCount = companions.filter((c) => c.active).length;
  const activeBeast = spiritBeasts.find((b) => b.active);

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-200" id="companions_screen_wrapper">
      {/* Upper navigation tabs: Companions vs Spirit Beasts */}
      <div className="flex border-b border-stone-800" id="tabs_bar_row">
        <button
          onClick={() => { playSound('click'); setActiveTab('companions'); }}
          className={`flex-1 py-2.5 font-bold text-xs uppercase flex items-center justify-center gap-1 border-b-2 transition-all ${
            activeTab === 'companions' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-stone-400 hover:text-stone-300'
          }`}
          id="tab_companions_btn"
        >
          <Users size={14} /> Tiên Hữu
        </button>
        <button
          onClick={() => { playSound('click'); setActiveTab('beasts'); }}
          className={`flex-1 py-2.5 font-bold text-xs uppercase flex items-center justify-center gap-1 border-b-2 transition-all ${
            activeTab === 'beasts' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-stone-400 hover:text-stone-300'
          }`}
          id="tab_beasts_btn"
        >
          <Sparkles size={14} /> Linh Thú
        </button>
        <button
          onClick={() => { playSound('click'); setActiveTab('songtu'); }}
          className={`flex-1 py-2.5 font-bold text-xs uppercase flex items-center justify-center gap-1 border-b-2 transition-all ${
            activeTab === 'songtu' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-stone-400 hover:text-stone-300'
          }`}
          id="tab_songtu_btn"
        >
          <Heart size={14} className="text-red-500 animate-pulse" /> Song Tu
        </button>
      </div>

      {/* Active Squad HUD indicators */}
      <div className="bg-stone-900 border border-stone-850 p-3 rounded-lg flex justify-between items-center text-xs text-left" id="active_squad_hud">
        <div id="companions_status">
          <p className="text-stone-400 font-medium">Trận pháp Tiên Hữu:</p>
          <p className="text-amber-400 font-bold font-mono">
            ĐÃ MỜI: {activeCompanionCount} / 2 ĐỒNG HÀNH
          </p>
        </div>
        <div className="text-right" id="beast_status">
          <p className="text-stone-400 font-medium">Thần thú xuất kích:</p>
          <p className="text-cyan-400 font-bold font-mono truncate max-w-[130px]">
            {activeBeast ? activeBeast.name.split(' ')[0] : 'CHƯA CÓ'}
          </p>
        </div>
      </div>

      {/* Grid deck list */}
      <div className="space-y-3.5" id="deck_scrollable_container">
        {activeTab === 'companions' && (
          /* 1. Companions List rendering */
          <div className="space-y-3.5" id="companions_deck">
            {companions.map((comp) => {
              const fragment = inventory.find((i) => i.id === 'manh_dong_hanh');
              const needFrags = comp.rarity === 'Cam' || comp.rarity === 'Đỏ' ? 10 : 5;

              return (
                <div 
                  key={comp.id}
                  className={`p-3.5 rounded-lg border flex flex-col gap-2.5 text-left transition-all ${
                    comp.unlocked 
                      ? comp.active 
                        ? 'bg-amber-950/10 border-amber-500' 
                        : 'bg-stone-900 border-stone-800'
                      : 'bg-stone-950/80 border-stone-900 opacity-80'
                  }`}
                  id={`companion_card_${comp.id}`}
                >
                  <div className="flex justify-between items-start" id={`comp_top_${comp.id}`}>
                    <div className="flex items-center gap-2.5" id={`comp_title_${comp.id}`}>
                      <div className="w-10 h-10 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center relative shadow-inner" id={`comp_avatar_${comp.id}`}>
                        <User size={22} className={comp.rarity === 'Đỏ' ? 'text-red-400' : comp.rarity === 'Cam' ? 'text-orange-400' : 'text-stone-400'} />
                        {comp.unlocked && (
                          <span className="absolute -bottom-1 -right-1 bg-amber-500/95 border border-stone-950 text-[8px] text-stone-950 font-bold px-1 rounded flex items-center gap-0.5 font-mono">
                            ★{comp.stars}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                          {comp.name} 
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-medium ${
                            comp.role === 'Tank' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                            comp.role === 'DPS' ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
                            comp.role === 'Hồi máu' ? 'bg-green-950/40 text-green-400 border border-green-900/30' :
                            'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                          }`}>
                            {comp.role}
                          </span>
                        </h4>
                        <p className="text-[10px] text-stone-400 mt-0.5">Phẩm cốt: <span className="text-amber-500 font-medium">{comp.rarity}</span></p>
                      </div>
                    </div>

                    {/* Stats columns */}
                    {comp.unlocked && (
                      <div className="text-right font-mono text-[9px] text-stone-400 space-y-0.5" id={`comp_stats_${comp.id}`}>
                        <p>HP: <b className="text-stone-300">{comp.hp}</b></p>
                        <p>ATK: <b className="text-stone-300">{comp.atk}</b></p>
                        <p>DEF: <b className="text-stone-300">{comp.def}</b></p>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-stone-300 leading-relaxed bg-stone-950/50 p-2.5 rounded border border-stone-950">{comp.desc}</p>

                  {/* Special passive Skill Info */}
                  <div className="p-2 bg-stone-950 border border-stone-900 rounded" id={`comp_passive_${comp.id}`}>
                    <p className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1"><Sparkle size={10} /> Thần kỹ: {comp.skillName}</p>
                    <p className="text-[9px] text-stone-400 mt-0.5">{comp.skillDesc}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-1" id={`comp_actions_${comp.id}`}>
                    {comp.unlocked ? (
                      <div className="grid grid-cols-2 gap-2" id={`unlocked_comp_actions_${comp.id}`}>
                        <button
                          onClick={() => handleToggleCompanion(comp.id)}
                          className={`py-1.5 rounded text-[10px] font-bold transition-all ${
                            comp.active 
                              ? 'bg-amber-600 hover:bg-amber-500 text-stone-950' 
                              : 'bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-200'
                          }`}
                        >
                          {comp.active ? '⚔️ THU QUÂN HƯ KỲ' : '🗡️ MỜI HÀNH QUÂN TRỢ CHIẾN'}
                        </button>
                        <button
                          onClick={() => handleStarUpCompanion(comp.id)}
                          disabled={comp.stars >= 5}
                          className="py-1.5 bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-200 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                        >
                          <Star size={10} className="text-yellow-500" /> THĂNG SAO (Y/c {3} mảnh)
                        </button>
                      </div>
                    ) : (
                      /* Locked recruits button */
                      <button
                        onClick={() => handleUnlockCompanion(comp)}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded text-[10px] font-bold flex items-center justify-center gap-1.5"
                      >
                        🔓 TRIỆU HỒI ĐỒNG HÀNH (Cần {needFrags} Mảnh Tiên Hữu • Sở hữu: {fragment?.count || 0})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'beasts' && (
          /* 2. Spirit Beasts List rendering */
          <div className="space-y-3.5" id="spirit_beasts_deck">
            {spiritBeasts.map((beast) => {
              const fragment = inventory.find((i) => i.id === 'manh_linh_thu');
              return (
                <div 
                  key={beast.id}
                  className={`p-3.5 rounded-lg border flex flex-col gap-2.5 text-left transition-all ${
                    beast.unlocked 
                      ? beast.active 
                        ? 'bg-cyan-950/15 border-cyan-500' 
                        : 'bg-stone-900 border-stone-800'
                      : 'bg-stone-950/80 border-stone-900 opacity-80'
                  }`}
                  id={`beast_card_${beast.id}`}
                >
                  <div className="flex justify-between items-start" id={`beast_top_${beast.id}`}>
                    <div className="flex items-center gap-2.5" id={`beast_title_${beast.id}`}>
                      <div className="w-10 h-10 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center relative shadow-inner" id={`beast_avatar_${beast.id}`}>
                        <Sparkles size={22} className={beast.rarity === 'Cam' ? 'text-orange-400' : 'text-cyan-400'} />
                        {beast.unlocked && (
                          <span className="absolute -bottom-1 -right-1 bg-cyan-500 border border-stone-950 text-[8px] text-stone-950 font-bold px-1 rounded flex items-center gap-0.5 font-mono">
                            ★{beast.stars}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-100">{beast.name}</h4>
                        <p className="text-[10px] text-stone-400 mt-0.5">Phẩm chất: <span className="text-cyan-400 font-medium">{beast.rarity}</span></p>
                      </div>
                    </div>

                    {/* Stats columns */}
                    {beast.unlocked && (
                      <div className="text-right font-mono text-[9px] text-stone-400 space-y-0.5" id={`beast_stats_${beast.id}`}>
                        <p className="text-amber-500 font-semibold uppercase">CỘNG HỘ CHỈ SỐ:</p>
                        {beast.bonusStats.atk && <p>Công: <b className="text-stone-300">+{beast.bonusStats.atk}</b></p>}
                        {beast.bonusStats.maxHp && <p>HP: <b className="text-stone-300">+{beast.bonusStats.maxHp}</b></p>}
                        {beast.bonusStats.def && <p>Thủ: <b className="text-stone-300">+{beast.bonusStats.def}</b></p>}
                        {beast.bonusStats.atkSpeed && <p>Tốc Đánh: <b className="text-stone-300">+{beast.bonusStats.atkSpeed}</b></p>}
                        {beast.bonusStats.evasion && <p>Né Tránh: <b className="text-stone-300">+{beast.bonusStats.evasion}%</b></p>}
                      </div>
                    )}
                  </div>

                  {/* Special passive Skill Info */}
                  <div className="p-2 bg-stone-950 border border-stone-900 rounded" id={`beast_passive_${beast.id}`}>
                    <p className="text-[9px] font-bold text-cyan-400 uppercase flex items-center gap-1"><Sparkle size={10} /> Trợ Chiến Thần kỹ: {beast.skillName}</p>
                    <p className="text-[9px] text-stone-400 mt-0.5">{beast.skillDesc}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-1" id={`beast_actions_${beast.id}`}>
                    {beast.unlocked ? (
                      <div className="grid grid-cols-2 gap-2" id={`unlocked_beast_actions_${beast.id}`}>
                        <button
                          onClick={() => handleToggleBeast(beast.id)}
                          className={`py-1.5 rounded text-[10px] font-bold transition-all ${
                            beast.active 
                              ? 'bg-cyan-600 hover:bg-cyan-500 text-stone-950 shadow shadow-cyan-500/20' 
                              : 'bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-200'
                          }`}
                        >
                          {beast.active ? '⚡ ĐANG TRIỆU HỒI HỘ THÂN' : '🔋 TRIỆU HỒI XUẤT TRẬN'}
                        </button>
                        <button
                          onClick={() => handleStarUpBeast(beast.id)}
                          disabled={beast.stars >= 5}
                          className="py-1.5 bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-200 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                        >
                          <Star size={10} className="text-yellow-500" /> TIẾN HÓA THĂNG SAO
                        </button>
                      </div>
                    ) : (
                      /* Locked recruits button */
                      <button
                        onClick={() => handleUnlockBeast(beast)}
                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-stone-950 rounded text-[10px] font-bold flex items-center justify-center gap-1.5"
                      >
                        🥚 ẤP TRỨNG / GHÉP MẢNH (Y/c 1x Trứng hoặc 8x Mảnh Linh Thú • Sở hữu: {fragment?.count || 0})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Song Tu Đắc Đạo tab */}
        {activeTab === 'songtu' && (
          <div className="space-y-4 text-left" id="songtu_pane">
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-850 space-y-1.5">
              <h4 className="text-xs font-black text-rose-400 uppercase flex items-center gap-1.5">
                ☯️ Song Tu Đại Đạo Nhân Duyên
              </h4>
              <p className="text-[10px] text-stone-400 leading-relaxed">
                Nghịch thiên cải mệnh không chỉ đơn độc. Hãy lựa chọn một Đạo Lữ (Tiên Hữu) tâm đầu ý hợp để cùng nhau mở rộng Linh Hải, đột phá xiềng xích gân cốt để đồng thời gia tăng tu vi của đôi bên.
              </p>
            </div>

            {/* List of Song Tu Partners */}
            <div className="space-y-2">
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Lựa chọn Đạo Lữ:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="song_tu_partners_grid">
                {songTuPartnersList.map((partner) => {
                  const isSelected = selectedPartnerId === partner.id;
                  return (
                    <button
                      key={partner.id}
                      onClick={() => { playSound('click'); setSelectedPartnerId(partner.id); }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-rose-950/15 border-rose-500 shadow-md shadow-rose-500/10' 
                          : 'bg-stone-900 border-stone-850 hover:border-stone-800'
                      }`}
                    >
                      <div>
                        <h5 className="text-xs font-bold text-stone-200">{partner.name}</h5>
                        <p className="text-[9px] text-stone-400 mt-1 leading-relaxed">{partner.desc}</p>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-stone-800/40 flex justify-between items-center text-[8px] font-mono">
                        <span className="text-stone-500 uppercase">Hộ trì đặc biệt:</span>
                        <span className="text-rose-400 font-bold">{partner.bonus}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Companion Visual stage */}
            {(() => {
              const partner = songTuPartnersList.find((p) => p.id === selectedPartnerId);
              return (
                <div className="bg-stone-950 border border-stone-900 rounded-xl p-4 text-center relative overflow-hidden" id="songtu_altar">
                  {/* Hearts animation box */}
                  {songTuAnimate && (
                    <div className="absolute inset-0 bg-rose-950/35 backdrop-blur-xs flex flex-col items-center justify-center z-10 space-y-2">
                      <Heart size={44} className="text-rose-500 animate-bounce fill-rose-500" />
                      <p className="text-xs font-bold text-rose-300 animate-pulse tracking-widest font-serif">
                        ✨ ÂM DƯƠNG HÒA HỢP - ĐẠI ĐẠO QUY NHẤT ✨
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center items-center gap-6 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full bg-stone-900 border-2 border-amber-600 flex items-center justify-center font-bold text-lg text-amber-500">
                        {player.name.charAt(0)}
                      </div>
                      <span className="text-[10px] text-stone-400 font-semibold">{player.name}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-2xl text-rose-500 animate-pulse font-bold">💖</span>
                      <span className="text-[9px] text-rose-400 font-mono tracking-widest uppercase">Kinh Mạch</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full bg-stone-900 border-2 border-rose-500 flex items-center justify-center font-bold text-lg text-rose-400">
                        {partner?.name.split(' ').pop()?.charAt(0)}
                      </div>
                      <span className="text-[10px] text-rose-300 font-semibold">{partner?.name}</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-stone-500 italic mt-3 leading-relaxed">
                    "Dưới bầu trời sao lấp lánh tiên tri, âm dương giao hòa, tinh nguyên quy tụ về đan điền linh hải."
                  </p>
                </div>
              );
            })()}

            {/* Song Tu Ritual Options */}
            <div className="space-y-2">
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Nghi thức Song Tu:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { type: 'santhien', name: '🤝 Tâm Linh Tương Thông', cost: 100, exp: '+5,000 Tu Vi', gold: '+150 Vàng', desc: 'Ngưng thần nhắm mắt dạo thần khí.' },
                  { type: 'linhgiac', name: '🌌 Linh Hồn Hòa Quyện', cost: 350, exp: '+22,000 Tu Vi', gold: '+450 Vàng', desc: 'Nâng niu tiên thạch dung nhập tu vi.' },
                  { type: 'trangdao', name: '👑 Đại Đạo Quy Nhất', cost: 1000, exp: '+95,000 Tu Vi', gold: '+1,500 Vàng', desc: 'Hồi thần phi thăng đại lân thiên đỉnh.' }
                ].map((ritual) => (
                  <button
                    key={ritual.type}
                    disabled={songTuAnimate}
                    onClick={() => handlePerformSongTu(ritual.type as any, ritual.cost)}
                    className="p-3 bg-stone-900 border border-stone-850 hover:border-rose-500/30 rounded-xl text-left flex flex-col justify-between hover:bg-stone-850 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <div>
                      <h6 className="text-[10px] font-bold text-stone-200">{ritual.name}</h6>
                      <p className="text-[8px] text-stone-500 mt-1 leading-relaxed">{ritual.desc}</p>
                    </div>

                    <div className="mt-3.5 space-y-1">
                      <div className="flex justify-between text-[8px] font-mono">
                        <span className="text-stone-400">Tu vi:</span>
                        <span className="text-cyan-400 font-bold">{ritual.exp}</span>
                      </div>
                      <div className="flex justify-between text-[8px] font-mono">
                        <span className="text-stone-400">Vàng:</span>
                        <span className="text-amber-400 font-bold">{ritual.gold}</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-stone-800 flex justify-center">
                      <span className="text-[9px] font-black text-rose-400">
                        {ritual.cost} Linh thạch
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* History Logs */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Hành trình Đạo Lữ:</p>
              <div className="bg-stone-950/60 rounded-xl p-2.5 border border-stone-900 max-h-24 overflow-y-auto font-mono text-[8px] text-stone-400 space-y-1 scrollbar-thin">
                {songTuLog.length === 0 ? (
                  <p className="text-center text-stone-600 py-2">Chưa có ghi chép tu thành nào. Hãy khởi đầu nghi thức Song Tu cùng tiên hữu.</p>
                ) : (
                  songTuLog.map((log, idx) => (
                    <div key={idx} className="border-b border-stone-950 pb-1 last:border-0">{log}</div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
