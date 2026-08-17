/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerCharacter, GameItem, Skill } from '../types';
import { getItemTemplate, playSound, SKILL_TREE_TEMPLATES } from '../utils/gameData';
import { addInventoryItem, normalizeInventoryItems } from '../utils/inventory';
import { Shield, Users, Gift, HelpCircle, Trophy, Sparkles, LogIn, Swords, Book } from 'lucide-react';

interface SectMenuProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  sectId: string | null;
  setSectId: React.Dispatch<React.SetStateAction<string | null>>;
  sectLevel: number;
  setSectLevel: React.Dispatch<React.SetStateAction<number>>;
  skills: Skill[];
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
}

const SECT_LIST = [
  { id: 'kiem_tong', name: 'Thượng Cổ Kiếm Tông', focus: 'Tấn công (Công +10%)', desc: 'Chuyên tu kiếm đạo, nghịch thiên sát phạt.', statBuff: { atk: 1.10 } },
  { id: 'tien_thao', name: 'Thần Nông Tiên Thảo Đường', focus: 'Sinh lực & Hồi phục (HP +15%)', desc: 'Chuyên tu đan đạo, cứu nhân độ thế.', statBuff: { hp: 1.15 } },
  { id: 'thien_co', name: 'Thái Sơ Thiên Cơ Giáo', focus: 'Né tránh & Chí mạng (Crit +5%)', desc: 'Dự toán thiên cơ, mượn sức thiên địa.', statBuff: { crit: 1.05 } }
];

export default function SectMenu({
  player,
  setPlayer,
  inventory,
  setInventory,
  sectId,
  setSectId,
  sectLevel,
  setSectLevel,
  skills,
  setSkills
}: SectMenuProps) {
  const [selectedSect, setSelectedSect] = useState<string | null>(sectId);
  const [bossHp, setBossHp] = useState(15000 + sectLevel * 3000);
  const [bossMaxHp, setBossMaxHp] = useState(15000 + sectLevel * 3000);
  const [bossDead, setBossDead] = useState(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);

  // Custom sects creation state
  const [customSects, setCustomSects] = useState<any[]>(() => {
    const saved = localStorage.getItem('player_custom_sects');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customFocus, setCustomFocus] = useState<'atk' | 'hp' | 'crit'>('atk');

  const handleCreateSect = () => {
    if (player.spiritStones < 5000) {
      alert(`Không đủ Linh thạch! Sáng lập tông môn riêng cần tối thiểu 5,000 Linh thạch! Ngươi hiện có ${player.spiritStones} Linh thạch.`);
      return;
    }
    if (!customName.trim()) {
      alert('Vui lòng nhập tên Tông Môn tôn quý của ngươi!');
      return;
    }

    const focusText = customFocus === 'atk' ? 'Khai thiên kiếm đạo (Công +12%)' : customFocus === 'hp' ? 'Trường sinh thuật pháp (HP +18%)' : 'Huyền thông chí mạng (Crit +8%)';
    const buff = customFocus === 'atk' ? { atk: 1.12 } : customFocus === 'hp' ? { hp: 1.18 } : { crit: 1.08 };

    const newSect = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      focus: focusText,
      desc: customDesc.trim() || 'Tông môn cổ đại trường sinh do chí tôn đạo hữu sáng lập.',
      statBuff: buff,
      isCustom: true
    };

    playSound('success');
    
    // Deduct stones
    setPlayer(prev => ({
      ...prev,
      spiritStones: prev.spiritStones - 5000
    }));

    // Save custom sects
    const updatedSects = [...customSects, newSect];
    setCustomSects(updatedSects);
    localStorage.setItem('player_custom_sects', JSON.stringify(updatedSects));

    // Join
    setSectId(newSect.id);
    setSelectedSect(newSect.id);

    setCombatLog([
      `🎉 [KHAI SƠN LẬP PHÁI] Chúc mừng Đại Sư Tổ [${player.name}] đã tiêu hao 5,000 Linh Thạch sáng lập nên Tông môn ${newSect.name}!`,
      `[Hệ thống] Trở thành Tông chủ tối thượng, nhận phúc lợi tăng thần công lực!`
    ]);

    // Reset fields
    setCustomName('');
    setCustomDesc('');
    setShowCreateForm(false);
  };

  const handleJoinSect = (id: string) => {
    playSound('success');
    setSectId(id);
    setSelectedSect(id);
    
    // Welcome message
    const name = [...SECT_LIST, ...customSects].find((s) => s.id === id)?.name;
    setCombatLog([`[Hệ thống] Chào mừng đạo hữu đã gia nhập tông môn ${name}! Bắt đầu hành trình tu tiên danh chấn thiên hạ!`]);
  };

  const handleLeaveSect = () => {
    if (!window.confirm('Ngươi chắc chắn muốn rời tông môn? Toàn bộ điểm cống hiến sẽ bị reset!')) return;
    playSound('failure');
    setSectId(null);
    setSelectedSect(null);
    setPlayer((prev) => ({ ...prev, sectContribution: 0 }));
  };

  // Contribute gold or items to get Sect Contribution points
  const handleContribute = (type: 'gold' | 'ore') => {
    if (type === 'gold') {
      if (player.gold < 100) {
        alert('Không đủ vàng để hiến cống!');
        return;
      }
      playSound('ping');
      setPlayer((prev) => ({
        ...prev,
        gold: prev.gold - 100,
        sectContribution: prev.sectContribution + 50
      }));
      setCombatLog((prev) => [`[Hiến cống] Thành công đóng góp 100 Vàng, nhận +50 cống hiến tông môn.`, ...prev]);
    } else {
      const ore = inventory.find((i) => i.id === 'huyen_thiet');
      if (!ore || ore.count < 3) {
        alert('Không đủ 3 Huyền Thiết trong hành trang!');
        return;
      }
      playSound('ping');
      setInventory((prev) => prev.map((i) => i.id === 'huyen_thiet' ? { ...i, count: i.count - 3 } : i).filter((i) => i.count > 0));
      setPlayer((prev) => ({
        ...prev,
        sectContribution: prev.sectContribution + 120
      }));
      setCombatLog((prev) => [`[Hiến cống] Thành công đóng góp 3 Huyền Thiết, nhận +120 cống hiến tông môn.`, ...prev]);
    }
  };

  // Fight Sect Boss (Hộ Tông Thú)
  const handleAttackSectBoss = () => {
    if (bossHp <= 0) return;
    
    playSound('attack');
    const playerAtk = player.stats.atk;
    const playerDef = player.stats.def;

    // Simulate round of combat
    const bossDmgRecv = Math.round(playerAtk * (1.2 + Math.random() * 0.4));
    const nextBossHp = Math.max(0, bossHp - bossDmgRecv);

    const playerDmgRecv = Math.max(10, Math.round(150 - playerDef * 0.3));
    
    setBossHp(nextBossHp);

    setPlayer((prev) => ({
      ...prev,
      stats: { ...prev.stats, hp: Math.max(1, prev.stats.hp - playerDmgRecv) }
    }));

    const roundLog = `⚔️ Ngươi công kích Hộ Tông Yêu Thú gây ${bossDmgRecv} sát thương. Ma thú phản đòn tát bạt vào ngực ngươi chịu ${playerDmgRecv} sát thương.`;
    setCombatLog((prev) => [roundLog, ...prev]);

    if (nextBossHp <= 0) {
      // Boss defeated!
      playSound('success');
      setBossDead(true);
      // Give rewards
      setPlayer((prev) => ({
        ...prev,
        sectContribution: prev.sectContribution + 300,
        gold: prev.gold + 100
      }));
      // Add rare item to inv
      setInventory((prev) => {
        const template = getItemTemplate('da_tinh_luyen');
        if (template) return normalizeInventoryItems(addInventoryItem(prev, { ...template, count: 1 } as any, 1));
        return prev;
      });

      setCombatLog((prev) => [
        `🎉 [TÔNG MÔN CHƯ ĐỒNG] YÊU THÚ BẢN MỆNH ĐÃ BỊ CHÉM SÁT! Ngươi nhận được +300 Cống Hiến, +100 Vàng, và +1 Đá Tinh Luyện quý giá!`,
        ...prev
      ]);
    }
  };

  const handleResetBoss = () => {
    playSound('success');
    setBossHp(15000 + sectLevel * 3000);
    setBossDead(false);
    setCombatLog((prev) => [`[Hệ thống] Hộ Tông Thú đã phục sinh sừng sững! Sẵn sàng nghênh chiến đợt khiêu chiến mới.`, ...prev]);
  };

  // Buy item from Treasury (Kho Tông)
  const handleBuyTreasuryItem = (itemId: string, cost: number) => {
    if (player.sectContribution < cost) {
      alert('Không đủ điểm Cống hiến tông môn!');
      return;
    }

    playSound('success');

    setPlayer((prev) => ({
      ...prev,
      sectContribution: prev.sectContribution - cost
    }));

    setInventory((prev) => {
      const template = getItemTemplate(itemId);
      if (template) return normalizeInventoryItems(addInventoryItem(prev, { ...template, count: 1 } as any, 1));
      return prev;
    });

    const name = getItemTemplate(itemId)?.name || 'Vật phẩm';
    setCombatLog((prev) => [`[Kho Tông] Đã đổi thành công 1x ${name} tiêu tốn ${cost} cống hiến.`, ...prev]);
  };

  const handleBuySkill = (skillTemplate: Skill, cost: number) => {
    if (player.sectContribution < cost) {
      alert('Không đủ điểm Cống hiến tông môn để đổi tuyệt học!');
      return;
    }

    const alreadyHas = skills.find(s => s.id === skillTemplate.id);
    if (alreadyHas) {
      alert('Đạo hữu đã lĩnh ngộ tuyệt học này rồi, không cần đổi nữa!');
      return;
    }

    playSound('success');

    setPlayer((prev) => ({
      ...prev,
      sectContribution: prev.sectContribution - cost
    }));

    setSkills(prev => [...prev, { ...skillTemplate, unlocked: true }]);

    setCombatLog((prev) => [`[Tàng Kinh Các] Đã lĩnh ngộ thành công bí kíp tuyệt học: ${skillTemplate.name}.`, ...prev]);
  };

  const currentSectInfo = [...SECT_LIST, ...customSects].find((s) => s.id === sectId);

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-200" id="sect_menu_screen">
      
      {!sectId ? (
        /* If player does not have a sect */
        <div className="space-y-4" id="no_sect_view">
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-lg text-center space-y-2" id="join_teaser">
            <Users size={32} className="mx-auto text-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold text-stone-100 uppercase">Gia Nhập Tông Môn Đỉnh Cao</h3>
            <p className="text-[11px] text-stone-400">
              Gia nhập Tông Môn giúp bồi dưỡng võ công, nhận phúc lợi hàng ngày, săn Boss tông môn đoạt thần khí và giao thương tại Kho tàng bảo vật riêng.
            </p>
          </div>

          {/* Custom Sect Creation Card */}
          <div className="bg-stone-900 border border-stone-850 p-4 rounded-xl space-y-3 text-left shadow-lg border-amber-500/15" id="custom_sect_create_card">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-amber-500 uppercase flex items-center gap-1.5">
                🏰 TỰ LẬP TÔNG MÔN RIÊNG
              </h4>
              <span className="text-[10px] bg-amber-950/40 border border-amber-800/40 text-amber-400 px-2 py-0.5 rounded font-bold font-mono">
                Phí: 5,000 Linh Thạch
              </span>
            </div>
            <p className="text-[10px] text-stone-400 leading-relaxed">
              Đứng ra lập môn phái riêng, làm Sư Tổ khai sơn lập địa, tự định đoạt Tuyệt Học bồi dưỡng hiền tài tông môn!
            </p>

            {!showCreateForm ? (
              <button
                onClick={() => { playSound('click'); setShowCreateForm(true); }}
                className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 rounded-lg text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md shadow-amber-950/50 cursor-pointer"
              >
                ✨ KHAI SƠN LẬP PHÁI RIÊNG
              </button>
            ) : (
              <div className="space-y-3 bg-stone-950 p-3 rounded-xl border border-stone-850 animate-fadeIn" id="custom_sect_form">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Tên Tông Môn Mới:</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="ví dụ: Vô Song Đao Tông, Tiêu Dao Cốc..."
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-850 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-bold"
                    maxLength={30}
                    id="input_custom_sect_name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Khẩu Quyết / Mô tả tông:</label>
                  <textarea
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="Chuyên tu thần công pháp thuật thế gian..."
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-850 rounded-lg text-xs text-stone-200 h-12 focus:outline-none focus:border-amber-500 resize-none"
                    maxLength={100}
                    id="textarea_custom_sect_desc"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Tuyệt học bổ trợ tông môn (BUFF):</label>
                  <select
                    value={customFocus}
                    onChange={(e) => setCustomFocus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-850 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
                    id="select_custom_sect_buff"
                  >
                    <option value="atk">🗡️ Thượng Thần Công Kích (Công +12%)</option>
                    <option value="hp">💊 Cửu Chuyển Linh Mệnh (Sinh lực HP +18%)</option>
                    <option value="crit">🔥 Thần Vũ Chí Mạng (Chí mạng +8%)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { playSound('click'); setShowCreateForm(false); }}
                    className="flex-1 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    HỦY LẬP
                  </button>
                  <button
                    onClick={handleCreateSect}
                    className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-lg text-xs font-black transition-all cursor-pointer shadow-md"
                  >
                    KHAI SƠN (-5K LT)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3.5" id="sect_options_list">
            <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-wider">Danh sách Tông Môn thế gia:</h4>
            
            {[...SECT_LIST, ...customSects].map((sect) => (
              <div 
                key={sect.id} 
                className={`bg-stone-900 border p-3.5 rounded-xl flex flex-col gap-2 text-left transition-all hover:scale-[1.01] ${sect.isCustom ? 'border-amber-500/20 shadow-md shadow-amber-500/5' : 'border-stone-850'}`}
                id={`sect_card_${sect.id}`}
              >
                <div className="flex justify-between items-start" id={`sect_desc_row_${sect.id}`}>
                  <div>
                    <h5 className="text-xs font-black text-amber-400 flex items-center gap-1">
                      {sect.isCustom && <span className="text-[9px] bg-amber-950 text-amber-400 px-1 py-0.2 rounded border border-amber-800/40">TỰ SÁNG LẬP</span>}
                      {sect.name}
                    </h5>
                    <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">{sect.desc}</p>
                  </div>
                  <span className="text-[9px] bg-stone-950/80 border border-stone-800 text-cyan-400 px-1.5 py-0.5 rounded font-bold font-mono text-right shrink-0 whitespace-nowrap">
                    {sect.focus}
                  </span>
                </div>
                <button
                  onClick={() => handleJoinSect(sect.id)}
                  className="w-full mt-2 py-2 bg-stone-800 hover:bg-stone-750 text-amber-400 border border-stone-700 rounded-lg text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                >
                  <LogIn size={13} /> GIA NHẬP TÔNG MÔN
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Active Sect Menus */
        <div className="space-y-4" id="active_sect_view">
          {/* Header Banner */}
          <div className="bg-stone-900 border border-amber-900/40 rounded-lg p-3.5 relative overflow-hidden text-left" id="sect_active_banner">
            <div className="absolute top-0 right-0 p-2 text-[10px] bg-red-950/40 text-red-400 border-l border-b border-red-900/30 font-medium hover:bg-red-900/40 cursor-pointer" onClick={handleLeaveSect}>
              RỜI TÔNG
            </div>
            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Tông Môn Đang Tham Gia</p>
            <h3 className="text-sm font-bold text-stone-100">{currentSectInfo?.name}</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Hiệu quả phái: <b className="text-cyan-400">{currentSectInfo?.focus}</b></p>
            <p className="text-[10px] text-stone-400">Đóng góp tích lũy: <b className="text-yellow-400">{player.sectContribution}</b> điểm cống hiến</p>
          </div>

          {/* Contribution Menu */}
          <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-lg space-y-3 text-left" id="sect_contribution_box">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1 uppercase"><Gift size={13} /> Tông Môn Hiến Cống</h4>
            <p className="text-[10px] text-stone-400 leading-relaxed">Hiến dâng tiền tài hoặc tài nguyên kiếm được dã ngoại để đổi lấy điểm cống hiến đổi pháp bảo tuyệt mật.</p>
            
            <div className="grid grid-cols-2 gap-2.5" id="contribute_buttons">
              <button
                onClick={() => handleContribute('gold')}
                className="bg-stone-950 hover:bg-stone-900 border border-stone-800 p-2 rounded text-left flex flex-col gap-1 transition-all active:scale-95"
              >
                <span className="text-[9px] font-bold text-stone-400 uppercase">Hiến Kim Tệ</span>
                <span className="text-xs font-bold text-yellow-500">-100 Vàng</span>
                <span className="text-[9px] text-cyan-400">+50 Cống Hiến</span>
              </button>

              <button
                onClick={() => handleContribute('ore')}
                className="bg-stone-950 hover:bg-stone-900 border border-stone-800 p-2 rounded text-left flex flex-col gap-1 transition-all active:scale-95"
              >
                <span className="text-[9px] font-bold text-stone-400 uppercase">Dâng Quặng Thạch</span>
                <span className="text-xs font-bold text-yellow-500">-3 Huyền Thiết</span>
                <span className="text-[9px] text-cyan-400">+120 Cống Hiến</span>
              </button>
            </div>
          </div>

          {/* Sect Boss Battle (Hộ Tông Thú) */}
          <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-lg space-y-3 text-left" id="sect_boss_box">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1 uppercase"><Swords size={13} /> Săn Hộ Tông Linh Thú Ma Hóa</h4>
            <p className="text-[10px] text-stone-400 leading-relaxed">Khiêu chiến Thú hộ tông ngưng tụ tinh linh cực hại để thu lấy tài liệu đúc thần binh.</p>
            
            <div className="bg-stone-950 p-3 rounded border border-stone-800 text-center space-y-2" id="boss_status_card">
              <p className="text-xs font-bold text-red-500 font-mono">BĂNG SANG LINH MA HỔ</p>
              
              {/* HP Bar */}
              <div className="space-y-1" id="boss_hp_bar">
                <div className="w-full h-2.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800" id="boss_meter">
                  <div 
                    className="bg-red-500 h-full transition-all duration-300"
                    style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                  />
                </div>
                <p className="text-[9px] text-stone-500 font-mono">HP: {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}</p>
              </div>

              {!bossDead ? (
                <button
                  onClick={handleAttackSectBoss}
                  disabled={player.stats.hp <= 1}
                  className="w-full py-2 bg-red-600 hover:bg-red-500 text-stone-950 rounded text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  ⚔️ CÔNG KÍCH BOSS TÔNG MÔN
                </button>
              ) : (
                <button
                  onClick={handleResetBoss}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 text-stone-950 rounded text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  🔄 PHỤC SINH YÊU THÚ
                </button>
              )}
            </div>
          </div>

          {/* Sect Treasury (Kho Tông) */}
          <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-lg space-y-3 text-left" id="sect_treasury_box">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1 uppercase"><Trophy size={13} /> Kho Tông môn Mật Bảo</h4>
            <p className="text-[10px] text-stone-400">Dùng điểm cống hiến để tích đổi lấy linh dược, vé đấu trường quý hiếm.</p>
            
            <div className="grid grid-cols-1 gap-2" id="treasury_items_list">
              {[
                { itemId: 'truc_co_dan', cost: 150, name: 'Trúc Cơ Đan', desc: 'Gia tăng đột phá cấp độ.' },
                { itemId: 've_bi_canh', cost: 200, name: 'Vé Bí Cảnh', desc: 'Mở cửa thám hiểm ngẫu nhiên.' },
                { itemId: 'ho_phu_do_kiep', cost: 400, name: 'Hộ Phù Độ Kiếp', desc: 'Tăng 20% đột phá an toàn.' },
                { itemId: 'da_cuong_hoa', cost: 80, name: 'Đá Cường Hóa', desc: 'Dùng rèn cường hóa linh phục.' }
              ].map((item) => (
                <div 
                  key={item.itemId}
                  className="p-2 bg-stone-950 rounded border border-stone-900 flex justify-between items-center text-xs hover:border-amber-500/20 transition-all"
                  id={`treasury_item_${item.itemId}`}
                >
                  <div className="flex-1 text-left min-w-0" id={`treasury_info_${item.itemId}`}>
                    <p className="text-[10px] font-bold text-stone-200">{item.name}</p>
                    <p className="text-[8px] text-stone-500 truncate">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => handleBuyTreasuryItem(item.itemId, item.cost)}
                    className="bg-amber-600 hover:bg-amber-500 text-stone-950 text-[9px] font-bold px-2 py-1 rounded transition-all active:scale-90 shrink-0 ml-2"
                  >
                    {item.cost} cống hiến
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tang Kinh Cac (Scripture Pavilion) */}
          <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-lg space-y-3 text-left" id="tang_kinh_cac_box">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1 uppercase"><Book size={13} /> Tàng Kinh Các</h4>
            <p className="text-[10px] text-stone-400">Đổi điểm cống hiến lấy tàn kinh võ kỹ, bí kíp tuyệt học độc môn.</p>
            
            <div className="grid grid-cols-1 gap-2" id="tang_kinh_cac_list">
              {SKILL_TREE_TEMPLATES.map((skillTemplate) => {
                const alreadyHas = skills.some(s => s.id === skillTemplate.id);
                // Fake cost based on rarity or type
                const cost = skillTemplate.cooldown > 0 ? 1000 : 1500; 
                
                return (
                  <div 
                    key={skillTemplate.id}
                    className={`p-2 rounded border flex justify-between items-center text-xs transition-all ${
                      alreadyHas ? 'bg-stone-900 border-stone-800 opacity-60' : 'bg-stone-950 border-stone-900 hover:border-amber-500/20'
                    }`}
                  >
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[10px] font-bold text-stone-200 flex items-center gap-1.5">
                        {skillTemplate.name}
                        <span className={`text-[8px] px-1 rounded ${skillTemplate.cooldown > 0 ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                          {skillTemplate.cooldown > 0 ? 'Chủ động' : 'Bị động'}
                        </span>
                      </p>
                      <p className="text-[8px] text-stone-500 truncate">{skillTemplate.desc}</p>
                    </div>
                    {alreadyHas ? (
                      <span className="text-[9px] text-stone-500 font-bold px-2 py-1 bg-stone-900 rounded border border-stone-800 shrink-0 ml-2">Đã học</span>
                    ) : (
                      <button
                        onClick={() => handleBuySkill(skillTemplate, cost)}
                        className="bg-cyan-700 hover:bg-cyan-600 text-stone-100 text-[9px] font-bold px-2 py-1 rounded transition-all active:scale-90 shrink-0 ml-2 shadow-md shadow-cyan-900/50"
                      >
                        {cost} cống hiến
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combat & Tông môn Log records */}
          <div className="bg-stone-900 border border-stone-800 p-3 rounded-lg text-left" id="sect_log_box">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Nhật ký hoạt động:</h4>
            <div className="mt-1.5 h-24 overflow-y-auto font-mono text-[9px] text-stone-400 space-y-1 bg-stone-950 p-2 rounded border border-stone-900 scrollbar-thin" id="sect_log_list">
              {combatLog.length === 0 ? (
                <p className="text-stone-600 text-center py-6">Chưa có hoạt động nổi bật nào xảy ra hôm nay.</p>
              ) : (
                combatLog.map((log, idx) => (
                  <p key={idx} className="leading-relaxed border-b border-stone-900 pb-1 last:border-0">{log}</p>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
