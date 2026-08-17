/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PlayerCharacter, GameItem } from '../types';
import { getItemTemplate, playSound } from '../utils/gameData';
import { Swords, Trophy, Ticket, ShieldAlert, Award, Star, RefreshCw } from 'lucide-react';

interface PvPMenuProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  arenaRank: number;
  setArenaRank: React.Dispatch<React.SetStateAction<number>>;
}

interface Opponent {
  name: string;
  realm: string;
  rank: number;
  hp: number;
  atk: number;
  def: number;
  power: number;
}

const LEADERBOARD_NAMES = [
  'Đông Phương Bất Bại',
  'Thái Sơ Thần Đế',
  'Độc Cô Cầu Bại',
  'Lục Hải Đường',
  'Kiếm Thánh Phong Thanh',
  'Nam Cung Vô Tình',
  'Tuyết Sơn Ma Tổ',
  'Càn Khôn Kiếm Tôn',
  'Cửu Vĩ Linh Hồ',
  'Hắc Sát Độc Thần'
];

export default function PvPMenu({
  player,
  setPlayer,
  inventory,
  setInventory,
  arenaRank,
  setArenaRank
}: PvPMenuProps) {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [battleActive, setBattleActive] = useState(false);
  const [activeOpponent, setActiveOpponent] = useState<Opponent | null>(null);
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  
  // Fight tracking
  const [playerHp, setPlayerHp] = useState(player.stats.maxHp);
  const [oppHp, setOppHp] = useState(0);
  const [oppMaxHp, setOppMaxHp] = useState(0);
  const battleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getRankTitle = (rank: number) => {
    if (rank <= 3) return 'Thần Thoại Tiên Đế';
    if (rank <= 10) return 'Tôn Giả Thái Thượng';
    if (rank <= 30) return 'Hóa Thần Đại Sư';
    if (rank <= 100) return 'Kim Đan Cao Thủ';
    return 'Luyện Khí Phàm Nhân';
  };

  const handleFindOpponents = () => {
    playSound("click");
    const list: Opponent[] = [];
    for (let i = 0; i < 3; i++) {
      const offsetRank = Math.max(1, arenaRank - 15 + i * 5);
      const mult = 1 + (150 - offsetRank) * 0.08;

      list.push({
        name:
          LEADERBOARD_NAMES[
            Math.floor(Math.random() * LEADERBOARD_NAMES.length)
          ] + ` #${offsetRank}`,
        realm: getRankTitle(offsetRank),
        rank: offsetRank,
        hp: Math.round(300 * mult),
        atk: Math.round(30 * mult),
        def: Math.round(15 * mult),
        power: Math.round(300 * mult + 30 * mult * 3),
      });
    }
    setOpponents(list);
  };

  // Generate 3 random opponents close to player's power rank
  useEffect(() => {
    handleFindOpponents();
  }, [arenaRank]);

  // Trigger once on first mount
  useEffect(() => {
    return () => {
      if (battleTimerRef.current) clearInterval(battleTimerRef.current);
    };
  }, []);

  const handleStartPvP = (opp: Opponent) => {
    if (battleTimerRef.current) {
      clearInterval(battleTimerRef.current);
      battleTimerRef.current = null;
    }
    const ticket = inventory.find((i) => i.id === 've_dau_truong');
    if (!ticket || ticket.count < 1) {
      alert('Không có "Vé Đấu Trường"! Hãy mua tại Tông Môn hoặc Hệ Thống Cửa Hàng.');
      return;
    }

    playSound('attack');

    // Deduct ticket
    setInventory((prev) => prev.map((i) => i.id === 've_dau_truong' ? { ...i, count: i.count - 1 } : i).filter((i) => i.count > 0));

    // Initialize battle simulation states
    setActiveOpponent(opp);
    setPlayerHp(player.stats.maxHp);
    setOppHp(opp.hp);
    setOppMaxHp(opp.hp);
    setBattleActive(true);
    setBattleLogs([`🥊 [Trận Đấu Bắt Đầu] Ngươi bước lên Đấu Đài khiêu chiến Đại Nhân: ${opp.name}!`]);

    // Start automated turn-based fight loop
    const logList = [`🥊 [Trận Đấu Bắt Đầu] Ngươi bước lên Đấu Đài khiêu chiến Đại Nhân: ${opp.name}!`];
    let curPlayerHp = player.stats.maxHp;
    let curOppHp = opp.hp;
    let round = 1;

    battleTimerRef.current = setInterval(() => {
      const isPlayerCrit = Math.random() * 100 < player.stats.crit;
      let playerDmg = player.stats.atk - opp.def * 0.4;
      if (isPlayerCrit) playerDmg *= player.stats.critDamage;
      playerDmg = Math.max(1, Math.round(playerDmg));

      curOppHp = Math.max(0, curOppHp - playerDmg);
      setOppHp(curOppHp);

      logList.unshift(
        `⚔️ Hiệp ${round}: Ngươi ra chiêu${isPlayerCrit ? " [BẠO KÍCH]" : ""}, gây ${playerDmg} sát thương.`,
      );
      setBattleLogs([...logList]);

      if (curOppHp <= 0) {
        if (battleTimerRef.current) clearInterval(battleTimerRef.current);
        handleBattleFinish(true, opp);
        return;
      }

      const isOppCrit = Math.random() < 0.12;
      let oppDmg = opp.atk - player.stats.def * 0.4;
      if (isOppCrit) oppDmg *= 1.5;

      const isPlayerEvaded = Math.random() * 100 < player.stats.evasion;
      if (isPlayerEvaded) {
        logList.unshift(`💨 Né đòn thành công!`);
        setBattleLogs([...logList]);
      } else {
        oppDmg = Math.max(1, Math.round(oppDmg));
        curPlayerHp = Math.max(0, curPlayerHp - oppDmg);
        setPlayerHp(curPlayerHp);
        logList.unshift(`💥 Hiệp ${round}: Đối thủ gây ${oppDmg} sát thương.`);
        setBattleLogs([...logList]);
      }

      if (curPlayerHp <= 0) {
        if (battleTimerRef.current) clearInterval(battleTimerRef.current);
        handleBattleFinish(false, opp);
        return;
      }

      round++;
    }, 1000);
  };

  const handleBattleFinish = (success: boolean, opp: Opponent) => {
    setBattleActive(false);

    if (success) {
      playSound('success');
      
      // Gain rewards
      const arenaReward = 45;
      const goldReward = 150;
      
      // Swap rank if player beat opponent with higher rank
      let newRank = arenaRank;
      if (opp.rank < arenaRank) {
        newRank = opp.rank;
        setArenaRank(opp.rank);
      }

      setPlayer((prev) => ({
        ...prev,
        pvpPoints: prev.pvpPoints + arenaReward,
        gold: prev.gold + goldReward
      }));

      setBattleLogs((prev) => [
        `🎉 [THẮNG TRẬN] Kỹ kinh tứ tọa! Ngươi chém gục đối thủ trên đài cao. Thăng bậc thứ hạng xếp hạng lên Hạng ${newRank}! Nhận ngay +${arenaReward} Điểm PvP và +${goldReward} Vàng.`,
        ...prev
      ]);
    } else {
      setPlayerHp(0);
      setPlayer((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          hp: 0,
        },
        isDead: true,
      }));
      playSound('failure');
      setBattleLogs((prev) => [
        `❌ [THẤT BẠI] Đau đớn! Ngươi sơ suất bị đối thủ tát văng khỏi lôi đài. Không đổi bậc xếp hạng và mất nhuệ khí.`,
        ...prev
      ]);
    }

    handleFindOpponents();
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-200" id="pvp_arena_pane">
      
      {/* Upper info card */}
      <div className="bg-stone-900 border border-amber-900/40 p-4 rounded-lg flex justify-between items-center text-left relative overflow-hidden" id="pvp_identity_banner">
        <div>
          <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Hạng Xếp Hạng Arena</p>
          <h3 className="text-sm font-bold text-stone-100 flex items-center gap-1">
            <Trophy size={14} className="text-yellow-500" /> Hạng {arenaRank}
          </h3>
          <p className="text-[10px] text-stone-400 mt-0.5">Xếp vị: <b className="text-cyan-400">{getRankTitle(arenaRank)}</b></p>
        </div>
        <div className="text-right font-mono" id="pvp_wealth_col">
          <p className="text-[10px] text-stone-500">Điểm PvP tích lũy:</p>
          <p className="text-cyan-400 font-bold text-base">{player.pvpPoints} Điểm</p>
        </div>
      </div>

      {!battleActive ? (
        /* Standby choosing mode list */
        <div className="space-y-4 text-left" id="arena_standby_panel">
          <div className="flex justify-between items-center" id="arena_standby_header">
            <h4 className="text-xs font-bold text-stone-300 uppercase flex items-center gap-1"><Award size={13} /> Chọn Đối Thủ Tranh Tài</h4>
            
            <div className="flex items-center gap-3 text-[10px] text-stone-400" id="ticket_refresh_bar">
              <span className="flex items-center gap-1 font-medium"><Ticket size={11} className="text-cyan-400" /> Vé: <b>{inventory.find((i) => i.id === 've_dau_truong')?.count || 0}</b></span>
              <button onClick={handleFindOpponents} className="flex items-center gap-0.5 hover:text-amber-400 font-bold"><RefreshCw size={10} /> Đổi mới</button>
            </div>
          </div>

          <div className="space-y-2.5" id="opponents_deck_list">
            {opponents.map((opp) => (
              <div 
                key={opp.rank} 
                className="bg-stone-900 border border-stone-850 p-3 rounded-lg flex justify-between items-center hover:border-amber-500/25 transition-all"
                id={`opp_card_${opp.rank}`}
              >
                <div className="text-left space-y-0.5 min-w-0 flex-1" id={`opp_info_${opp.rank}`}>
                  <p className="text-xs font-bold text-stone-200 truncate">{opp.name}</p>
                  <p className="text-[10px] text-stone-500 font-mono">Bậc: {opp.realm} • Chiến lực: <span className="text-amber-500 font-bold">{opp.power.toLocaleString()}</span></p>
                </div>
                <button
                  onClick={() => handleStartPvP(opp)}
                  className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-1.5 rounded text-[10px] flex items-center gap-0.5 transition-all active:scale-95 shrink-0"
                >
                  <Swords size={11} /> ĐẤU NGAY
                </button>
              </div>
            ))}
          </div>

          {/* Simple mock Leaderboard */}
          <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-lg space-y-2 text-left" id="leaderboard_ranking_block">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1 uppercase"><Star size={12} /> Bảng Phong Thần Tiên Giới</h4>
            
            <div className="divide-y divide-stone-950/40 text-[10px] text-stone-400 space-y-1.5" id="leaderboard_table">
              {[
                { r: 1, name: 'Vạn Cổ Kiếm Ma', lvl: 'Hạng 1 • Thần Đế' },
                { r: 2, name: 'Đế Tôn Hư Không', lvl: 'Hạng 2 • Thần Đế' },
                { r: 3, name: 'Thiên Ma Cổ Nhân', lvl: 'Hạng 3 • Thái Thượng' },
                { r: 4, name: 'Tử Vi Tiên Ông', lvl: 'Hạng 4 • Thái Thượng' }
              ].map((top) => (
                <div key={top.r} className="flex justify-between items-center py-1 font-mono" id={`top_row_${top.r}`}>
                  <span className="flex items-center gap-1.5">
                    <b className={top.r === 1 ? 'text-yellow-400 font-sans' : 'text-stone-500 font-sans'}>#{top.r}</b>
                    <span className="text-stone-200">{top.name}</span>
                  </span>
                  <span className="text-cyan-400/80">{top.lvl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Live combat duel tracking views */
        <div className="space-y-4 text-left" id="live_pvp_arena_view">
          
          {/* Active health duel stats */}
          <div className="grid grid-cols-2 gap-3 bg-stone-950 p-4 rounded-lg border border-stone-850 text-center" id="dual_hp_cards">
            
            {/* Player block */}
            <div className="space-y-1.5 text-left" id="player_hp_block">
              <p className="text-[10px] font-bold text-stone-400 uppercase">Ngươi (Bản Tôn)</p>
              <div className="w-full h-2.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800" id="player_meter">
                <div 
                  className="bg-green-500 h-full transition-all duration-150"
                  style={{ width: `${(playerHp / player.stats.maxHp) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-500 font-mono">{playerHp} / {player.stats.maxHp} HP</p>
            </div>

            {/* Opponent block */}
            <div className="space-y-1.5 text-right" id="opp_hp_block">
              <p className="text-[10px] font-bold text-stone-400 uppercase truncate">{activeOpponent?.name.split(' ')[0]}</p>
              <div className="w-full h-2.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800" id="opp_meter">
                <div 
                  className="bg-red-500 h-full transition-all duration-150"
                  style={{ width: `${(oppHp / oppMaxHp) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-500 font-mono">{oppHp} / {oppMaxHp} HP</p>
            </div>

          </div>

          {/* Scrolling turn records */}
          <div className="bg-stone-900 border border-stone-800 p-3 rounded-lg" id="duel_live_logs_box">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Chi tiết Đấu Lôi Đài (Tự Động):</h4>
            <div className="mt-1.5 h-64 overflow-y-auto font-mono text-[9px] text-stone-300 space-y-1.5 bg-stone-950 p-2.5 rounded border border-stone-950 scrollbar-thin flex flex-col-reverse" id="arena_logs_scroll">
              {battleLogs.map((log, idx) => (
                <p key={idx} className="leading-relaxed border-b border-stone-900 pb-1.5 last:border-0">{log}</p>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
