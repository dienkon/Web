/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerCharacter, GameItem } from '../types';
import { getItemTemplate, playSound, createEquipment } from '../utils/gameData';
import { addInventoryItem, normalizeInventoryItems } from '../utils/inventory';
import { Compass, HelpCircle, Gift, Skull, ShieldAlert, Sparkles, UserCheck, Key, Ticket } from 'lucide-react';

interface DungeonMenuProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
}

interface DungeonRoom {
  id: number;
  type: 'mê cung' | 'kho báu' | 'bẫy' | 'boss' | 'npc bí ẩn' | 'rương hiếm' | 'cơ quan';
  title: string;
  desc: string;
  resolved: boolean;
  rewardClaimed: boolean;
}

const ROOM_TYPES: DungeonRoom['type'][] = ['mê cung', 'kho báu', 'bẫy', 'boss', 'npc bí ẩn', 'rương hiếm', 'cơ quan'];

const ROOM_TEMPLATES: Record<DungeonRoom['type'], { title: string; desc: string }> = {
  'mê cung': {
    title: 'Mê Cung Thượng Cổ',
    desc: 'Linh khí dao động dày đặc bao phủ một mê lộ u ám đầy khói sương đen kịt. Ngươi cần tìm lối thoát nhanh.'
  },
  'kho báu': {
    title: 'Phế Tích Kho Báu',
    desc: 'Bụi bặm bám đầy trên một chiếc rương cổ xưa làm bằng gỗ trầm hương.'
  },
  'bẫy': {
    title: 'Hãm Trận Bẫy Cổ',
    desc: 'Hàng ngàn mũi kim sắt rỉ lôi kiếp ẩn nấp sâu dưới những phiến đá lỏng lẻo.'
  },
  'boss': {
    title: 'Chính Điện Độc Giác Ma Vương',
    desc: 'Một quái vật khổng lồ sừng tê giác mắt rực lửa đang thầm thét canh giữ đạo giới đài!'
  },
  'npc bí ẩn': {
    title: 'Tiên Nhân Đi Lạc',
    desc: 'Một vị lão nhân râu tóc bạc phơ đang thiền định trầm mặc trên tảng đá phẳng.'
  },
  'rương hiếm': {
    title: 'Tiên Khí Chí Tôn Rương',
    desc: 'Một chiếc rương chạm khắc rồng phượng nạm ngọc bảo phát ra tiên khí dồi dào rực rỡ.'
  },
  'cơ quan': {
    title: 'Mật Thất Cơ Quan Thần Cơ',
    desc: 'Bức tường khắc một bộ trận pháp cơ quan kỳ lạ cùng đòn bẩy đá bí ẩn.'
  }
};

export default function DungeonMenu({
  player,
  setPlayer,
  inventory,
  setInventory
}: DungeonMenuProps) {
  const [activeRun, setActiveRun] = useState(false);
  const [rooms, setRooms] = useState<DungeonRoom[]>([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [dungeonLog, setDungeonLog] = useState<string[]>([]);
  const [dungeonHp, setDungeonHp] = useState(player.stats.hp);

  // Spend Dungeon Ticket (Vé Bí Cảnh) to enter
  const handleEnterDungeon = () => {
    const ticket = inventory.find((i) => i.id === 've_bi_canh');
    if (!ticket || ticket.count < 1) {
      alert('Ngươi không có "Vé Bí Cảnh"! Hãy săn quái Boss dã ngoại hoặc mua tại Hệ Thống Cửa Hàng.');
      return;
    }

    playSound('success');

    // Deduct ticket
    setInventory((prev) => prev.map((i) => i.id === 've_bi_canh' ? { ...i, count: i.count - 1 } : i).filter((i) => i.count > 0));

    // Generate 6 procedural rooms
    const generated: DungeonRoom[] = [];
    for (let i = 0; i < 6; i++) {
      // Procedural pick
      let type = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
      if (i === 5) type = 'boss'; // Last room is always the boss guard

      const template = ROOM_TEMPLATES[type];
      generated.push({
        id: i,
        type,
        title: `${template.title} (Ải ${i + 1})`,
        desc: template.desc,
        resolved: false,
        rewardClaimed: false
      });
    }

    setRooms(generated);
    setCurrentRoomIndex(0);
    setActiveRun(true);
    setDungeonHp(player.stats.maxHp);
    setDungeonLog([`🎬 Ngươi bước chân vào Bí Cảnh u minh, khí lạnh bao trùm từng tế bào. Cố gắng bảo toàn tính mạng để đoạt bảo!`]);
  };

  const handleResolveRoom = (action: 'bypass' | 'unlock' | 'evade' | 'fight' | 'pray' | 'disarm') => {
    if (!activeRun) return;
    const room = rooms[currentRoomIndex];
    if (room.resolved) return;

    let success = false;
    let logMsg = '';
    let dmg = 0;

    switch (room.type) {
      case 'mê cung':
        // Bypass maze using speed roll
        success = Math.random() < 0.75;
        if (success) {
          logMsg = `🧭 Ngươi nhanh nhẹn nhảy qua các bức tường sụp đổ, thuận lợi đi tiếp.`;
        } else {
          dmg = Math.round(player.stats.maxHp * 0.12);
          logMsg = `🧭 Ngươi bị lạc lối trong cạm bẫy mê cung, mất nhiều thời gian chịu khí độc hao tổn ${dmg} HP.`;
        }
        break;

      case 'bẫy':
        // Dodge trap based on Evasion state
        const dodgeRoll = Math.random() * 100;
        success = dodgeRoll < (player.stats.evasion + 30); // given bonus rate
        if (success) {
          logMsg = `⚡ Thân thủ tuyệt vời! Ngươi kích hoạt kĩ năng nhào lộn né tránh toàn bộ ám tiễn bắn ra!`;
        } else {
          dmg = Math.round(player.stats.maxHp * 0.18);
          logMsg = `⚡ Ôi không! Ngươi dẫm trúng kim độc xước chân gãy xương, chịu ${dmg} thương thế cực nặng!`;
        }
        break;

      case 'boss':
        // Battle the big boss guard
        const fightPower = player.stats.atk + player.stats.def;
        success = Math.random() * fightPower > 60;
        if (success) {
          logMsg = `⚔️ Quyết chiến kinh hồn! Ngươi múa kiếm gầm quyền dồn sát thương kết liễu Độc Giác Ma Vương dứt khoát!`;
        } else {
          dmg = Math.round(player.stats.maxHp * 0.35);
          logMsg = `⚔️ Trận chiến khốc liệt! Ngươi đánh bại được Ma Vương nhưng bị nó vung đuôi đánh trọng thương, hao tổn ${dmg} HP.`;
        }
        break;

      case 'npc bí ẩn':
        // Interact blessing
        success = true;
        logMsg = `🧙 Vị lão nhân ban phước xoa đầu ngươi truyền dạy đạo thuật, hồi phục đầy đủ HP và ban tặng nguyên khí tu luyện!`;
        setPlayer((prev) => ({ ...prev, cultivation: prev.cultivation + 500 }));
        break;

      case 'kho báu':
      case 'rương hiếm':
        // Open chest
        success = true;
        logMsg = `🎁 Ngươi mở thành công rương bảo thạch thượng cổ quý giá!`;
        break;

      case 'cơ quan':
        // Puzzle
        success = Math.random() < 0.65;
        if (success) {
          logMsg = `⚙️ Đã xoay chuyển cơ quan chính xác! Cánh cửa đá mở ra một ngách rương phụ chứa đầy khoáng vật.`;
        } else {
          dmg = Math.round(player.stats.maxHp * 0.10);
          logMsg = `⚙️ Trận đồ kích hoạt sai lầm dội ngược thiên địa điện từ giật ngươi tê liệt, tổn thất ${dmg} HP.`;
        }
        break;
    }

    // Apply damage to state
    if (dmg > 0) {
      setDungeonHp((prev) => Math.max(0, prev - dmg));
    }

    // Mark room as resolved
    setRooms((prev) => prev.map((r, idx) => idx === currentRoomIndex ? { ...r, resolved: true } : r));
    setDungeonLog((prev) => [logMsg, ...prev]);

    // Check if player died
    if (dungeonHp - dmg <= 0) {
      playSound('failure');
      setDungeonLog((prev) => [`💀 THẤT BẠI thảm khốc! Ngươi đã tử vong tại Bí Cảnh u linh này. Toàn bộ bảo vật thu được đã hóa tàn tro!`, ...prev]);
      setTimeout(() => {
        setActiveRun(false);
      }, 3000);
    }
  };

  // Claim reward of the current room
  const handleClaimReward = () => {
    if (!activeRun) return;
    const room = rooms[currentRoomIndex];
    if (!room.resolved || room.rewardClaimed) return;

    playSound('ping');

    // Give appropriate items to inventory
    setInventory((prevInv) => {
      let loot: GameItem[] = [];

      if (room.type === 'kho báu' || room.type === 'cơ quan') {
        const item = getItemTemplate('huyen_thiet');
        if (item) loot.push({ ...item, count: 2 });
      } else if (room.type === 'rương hiếm') {
        // Roll random High Tier equipment
        const gear = createEquipment(
          Math.random().toString(),
          `Hổ Uy Đại Cương Kiếm [Phẩm Hiếm]`,
          'weapon',
          'Tím',
          player.realmIndex * 10 + player.realmLevel
        );
        loot.push(gear);
      } else if (room.type === 'boss') {
        // Slay boss reward - Give tons of good stuff
        const item1 = getItemTemplate('nguyen_anh_dan');
        const item2 = getItemTemplate('ve_quay_thuong');
        if (item1) loot.push({ ...item1, count: 1 });
        if (item2) loot.push({ ...item2, count: 2 });
      } else {
        // Gold or Herbs
        const item = getItemTemplate('linh_chi');
        if (item) loot.push({ ...item, count: 3 });
      }

      // Add to inventory
      let nextInv = prevInv;
      loot.forEach((l) => {
        nextInv = normalizeInventoryItems(addInventoryItem(nextInv, l, l.count || 1));
      });

      return nextInv;
    });

    // Award gold
    const goldGained = room.type === 'boss' ? 500 : 80;
    setPlayer((prev) => ({ ...prev, gold: prev.gold + goldGained }));

    setRooms((prev) => prev.map((r, idx) => idx === currentRoomIndex ? { ...r, rewardClaimed: true } : r));
    setDungeonLog((prev) => [`🎁 Nhặt được phần thưởng từ chiếc rương bảo bối phòng ải! Nhận ngay +${goldGained} Vàng.`, ...prev]);
  };

  // Move to next room
  const handleNextRoom = () => {
    playSound('click');
    if (currentRoomIndex === rooms.length - 1) {
      // Dungeon Cleared!
      playSound('success');
      setPlayer((prev) => ({
        ...prev,
        reputation: prev.reputation + 150,
        gold: prev.gold + 300
      }));
      setDungeonLog((prev) => [`🏆 CHÚC MỪNG ĐẠO HỮU! Ngươi đã xuất sắc vượt qua toàn bộ Bí Cảnh nguy hại này, nâng uy danh thiên cổ +150 danh vọng!`]);
      
      // Delay closing
      setTimeout(() => {
        setActiveRun(false);
      }, 3000);
    } else {
      setCurrentRoomIndex((prev) => prev + 1);
    }
  };

  const currentRoom = rooms[currentRoomIndex];

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-200" id="dungeon_menu_screen">
      
      {!activeRun ? (
        /* Standby view to enter */
        <div className="space-y-4 text-center" id="dungeon_gate_view">
          <div className="bg-stone-900 border border-purple-900/40 p-4 rounded-lg space-y-2.5" id="gate_card">
            <Compass size={40} className="mx-auto text-cyan-400 animate-spin-slow" />
            <h3 className="text-sm font-bold text-stone-100 uppercase">Khám phá Bí Cảnh Thượng Cổ</h3>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Bí cảnh là nơi tích chứa ngàn vạn cơ duyên và thần bảo. Ngươi cần đối mặt mê cung hiểm ác, gạt tắt bẫy cổ, chém giết ma boss để cướp đoạt rương hiếm.
            </p>
          </div>

          {/* Ticket balance indicator */}
          <div className="bg-stone-950 p-3 rounded-lg border border-stone-850 flex justify-between items-center text-xs" id="ticket_display">
            <span className="text-stone-400 flex items-center gap-1.5"><Ticket size={14} className="text-cyan-400" /> Vé Bí Cảnh hiện tại:</span>
            <b className="text-cyan-400 font-mono text-[13px]">{inventory.find((i) => i.id === 've_bi_canh')?.count || 0} vé</b>
          </div>

          <button
            onClick={handleEnterDungeon}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-stone-950 rounded text-xs font-bold shadow-lg shadow-cyan-500/10 transition-all active:scale-95"
          >
            🔥 TIÊU THỤ 1 VÉ - TIẾN VÀO BÍ CẢNH NGẪU NHIÊN
          </button>

          <div className="bg-stone-900 border border-stone-800 p-3 rounded text-[10px] text-stone-500 space-y-1 text-left" id="dungeon_tips">
            <p className="text-amber-500 font-medium">⚠️ Quy Tắc Bí Cảnh:</p>
            <p>• Trải qua 6 ải thử thách liên hoàn phòng rương.</p>
            <p>• Mỗi phòng cần Hành Động giải quyết, sau đó NHẶT BẢO VẬT trước khi bấm tiếp tục sang phòng kế tiếp.</p>
            <p>• Nếu HP cạn kiệt về 0 giữa chừng, ngươi sẽ thất bại hoàn toàn.</p>
          </div>
        </div>
      ) : (
        /* Active Dungeon Exploration Run */
        <div className="space-y-4 text-left" id="active_exploration_view">
          {/* Top HUD State bar */}
          <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 flex justify-between items-center text-xs" id="dungeon_hud_bar">
            <span className="font-bold text-cyan-400 font-mono">ẢI {currentRoomIndex + 1} / 6</span>
            
            {/* Exploration HP */}
            <div className="flex items-center gap-2" id="dungeon_hp_meter">
              <span className="text-stone-400 font-medium text-[10px]">Sinh Mệnh Bí Cảnh:</span>
              <span className="text-red-400 font-mono font-bold">{dungeonHp} HP</span>
            </div>
          </div>

          {/* Procedural Active Room Card */}
          <div className="bg-stone-900 border border-cyan-600/30 rounded-lg p-4 space-y-4 shadow-xl" id="dungeon_room_card">
            
            {/* Visual Icon indicator */}
            <div className="flex items-center gap-3" id="room_header">
              <div className="p-2.5 bg-stone-950 rounded-full border border-stone-800 text-cyan-400 animate-pulse" id="room_icon">
                {currentRoom.type === 'kho báu' && <Gift size={20} />}
                {currentRoom.type === 'rương hiếm' && <Gift size={20} className="text-amber-400" />}
                {currentRoom.type === 'boss' && <Skull size={20} className="text-red-500" />}
                {currentRoom.type === 'bẫy' && <ShieldAlert size={20} className="text-yellow-500" />}
                {currentRoom.type === 'npc bí ẩn' && <Sparkles size={20} className="text-green-400" />}
                {currentRoom.type === 'mê cung' && <Compass size={20} />}
                {currentRoom.type === 'cơ quan' && <HelpCircle size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-100">{currentRoom.title}</h4>
                <p className="text-[10px] text-stone-500 font-mono uppercase">Loại cảnh: {currentRoom.type}</p>
              </div>
            </div>

            <p className="text-[11px] text-stone-300 leading-relaxed bg-stone-950 p-3 rounded border border-stone-900">{currentRoom.desc}</p>

            {/* Room choices controls */}
            <div className="space-y-2" id="room_controls_panel">
              {!currentRoom.resolved ? (
                /* Resolve button */
                <button
                  onClick={() => handleResolveRoom(
                    currentRoom.type === 'bẫy' ? 'evade' :
                    currentRoom.type === 'boss' ? 'fight' :
                    currentRoom.type === 'npc bí ẩn' ? 'pray' : 'bypass'
                  )}
                  disabled={dungeonHp <= 0}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-stone-950 rounded text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  {currentRoom.type === 'bẫy' && '🏃 NÉ TRÁNH BẪY GAI'}
                  {currentRoom.type === 'boss' && '⚔️ PHÁT LỰC CHIẾN TIÊN VƯƠNG'}
                  {currentRoom.type === 'npc bí ẩn' && '🧙 BÁI LẠI ĐÓN NHẬN CHÚC PHÚC'}
                  {currentRoom.type === 'kho báu' && '🎁 THÁM THÍNH MỞ RƯƠNG'}
                  {currentRoom.type === 'rương hiếm' && '🌟 THU THẬP TIÊN KHÍ CHÍ TÔN RƯƠNG'}
                  {currentRoom.type === 'mê cung' && '🧭 DÙNG THẦN THÔNG TÌM ĐƯỜNG'}
                  {currentRoom.type === 'cơ quan' && '⚙️ KHAI MỞ CƠ QUAN TRẬN ĐỒ'}
                </button>
              ) : (
                /* Post resolve: Claim and Proceed buttons */
                <div className="grid grid-cols-2 gap-2" id="after_resolve_grid">
                  <button
                    disabled={currentRoom.rewardClaimed || dungeonHp <= 0}
                    onClick={handleClaimReward}
                    className={`py-2 rounded text-xs font-bold transition-all ${
                      currentRoom.rewardClaimed 
                        ? 'bg-stone-950 border border-stone-850 text-stone-600 cursor-not-allowed' 
                        : 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow shadow-amber-500/20'
                    }`}
                  >
                    {currentRoom.rewardClaimed ? 'ĐÃ NHẬN QUÀ' : '🎁 NHẬN THƯỞNG RƯƠNG'}
                  </button>

                  <button
                    onClick={handleNextRoom}
                    disabled={dungeonHp <= 0}
                    className="py-2 bg-green-600 hover:bg-green-500 text-stone-950 rounded text-xs font-bold transition-all active:scale-95"
                  >
                    {currentRoomIndex === rooms.length - 1 ? '🏁 HOÀN THÀNH BÍ CẢNH' : 'TIẾP TỤC ĐI TIẾP ➡️'}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Dungeon Exploration Live Logs */}
          <div className="bg-stone-900 border border-stone-800 p-3 rounded-lg" id="exploration_logs_box">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Nhật ký thám hiểm:</h4>
            <div className="mt-1.5 h-36 overflow-y-auto font-mono text-[9px] text-stone-300 space-y-1 bg-stone-950 p-2.5 rounded border border-stone-950 scrollbar-thin" id="explore_logs_list">
              {dungeonLog.map((log, idx) => (
                <p key={idx} className="leading-relaxed border-b border-stone-900 pb-1.5 last:border-0">{log}</p>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
