import React, { useState, useEffect, useRef } from 'react';
import { PlayerCharacter, GameItem, BaseStats } from '../types';
import { REALMS, playSound, getNextLevelExp } from '../utils/gameData';
import { removeInventoryItem } from '../utils/inventory';
import { Sparkles, Zap, Moon, Sun, ArrowUpCircle, AlertCircle, ShieldAlert, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MeditationScreenProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  onSave: () => void;
  onUpdateStats: () => void;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export default function MeditationScreen({
  player,
  setPlayer,
  inventory,
  setInventory,
  onSave,
  onUpdateStats
}: MeditationScreenProps) {
  const [isCultivatingAuto, setIsCultivatingAuto] = useState<boolean>(() => {
    const saved = localStorage.getItem('is_cultivating_auto');
    return saved !== null ? saved === 'true' : true;
  });
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [breakthroughPills, setBreakthroughPills] = useState<GameItem[]>([]);
  const [breakthroughLogs, setBreakthroughLogs] = useState<string[]>([]);
  const [breakthroughPhase, setBreakthroughPhase] = useState<
    "idle" | "charging" | "thunder" | "success" | "failure"
  >("idle");
  const [thunderBurst, setThunderBurst] = useState<{
    strikes: number;
    hue: "cyan" | "white" | "violet" | "amber" | "red";
    title: string;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const breakthroughLockRef = useRef(false);
  const breakthroughAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const refineSaveLockRef = useRef(false);
  const offlineRewardAppliedRef = useRef(false);

  function calcRealtimeCultivation(profile: any) {
    if (!profile.cultivation?.active)
      return { xp: 0, linhKhi: 0, rate: 0, secs: 0 };
    const elapsedSecs = (Date.now() - profile.cultivation.startTime) / 1000;
    const statBonus =
      (profile.power + profile.defense + profile.luck + profile.agility) * 0.002;
    const multiplier = 1 + profile.level * 0.05 + statBonus + profile.xpRate;
    const ratePerSec = 0.1 * multiplier;
    return {
      secs: Math.floor(elapsedSecs),
      xp: elapsedSecs * ratePerSec,
      linhKhi: Math.floor(elapsedSecs * (ratePerSec * 1.5)),
      rate: ratePerSec,
    };
  }

  type PendingOfflineReward = {
    diffSec: number;
    gainedCult: number;
    gainedLinhKhi: number;
  };

  const OFFLINE_REWARD_KEY = "pending_offline_cultivation_v1";

  const [pendingOfflineReward, setPendingOfflineReward] =
    useState<PendingOfflineReward | null>(null);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    if (m > 0) return `${m} phút ${s} giây`;
    return `${s} giây`;
  };

  const clearPendingOfflineReward = () => {
    localStorage.removeItem(OFFLINE_REWARD_KEY);
    setPendingOfflineReward(null);
  };

  // On mount: calculate offline cultivation rewards
 useEffect(() => {
   if (offlineRewardAppliedRef.current) return;
   offlineRewardAppliedRef.current = true;

   const lastTime = localStorage.getItem("last_active_timestamp");
   const savedPending = localStorage.getItem(OFFLINE_REWARD_KEY);

   if (savedPending) {
     try {
       const parsed = JSON.parse(savedPending) as PendingOfflineReward;
       if (
         parsed &&
         typeof parsed.diffSec === "number" &&
         typeof parsed.gainedCult === "number" &&
         typeof parsed.gainedLinhKhi === "number"
       ) {
         setPendingOfflineReward(parsed);
         return;
       }
     } catch {
       localStorage.removeItem(OFFLINE_REWARD_KEY);
     }
   }

   if (!lastTime || !isCultivatingAuto) {
     localStorage.setItem("last_active_timestamp", Date.now().toString());
     return;
   }

   const now = Date.now();
   const diffSec = Math.floor((now - parseInt(lastTime, 10)) / 1000);

   if (diffSec < 10) {
     localStorage.setItem("last_active_timestamp", Date.now().toString());
     return;
   }

   const cappedSec = Math.min(diffSec, 86400);

   const profileForCalc = {
     cultivation: {
       active: true,
       startTime: now - cappedSec * 1000,
     },
     power: player.stats.atk,
     defense: player.stats.def,
     luck: player.stats.crit,
     agility: player.stats.evasion,
     level: player.realmIndex * 10 + player.realmLevel,
     xpRate: (player.stats.xpRate || 0) / 10,
   };

   const result = calcRealtimeCultivation(profileForCalc);

   const nextPending: PendingOfflineReward = {
     diffSec,
     gainedCult: Math.max(0, result.xp),
     gainedLinhKhi: Math.max(0, result.linhKhi),
   };

   setPendingOfflineReward(nextPending);
   localStorage.setItem(OFFLINE_REWARD_KEY, JSON.stringify(nextPending));
 }, []);
  // Sync state changes of isCultivatingAuto to localStorage
  useEffect(() => {
    localStorage.setItem('is_cultivating_auto', isCultivatingAuto.toString());
  }, [isCultivatingAuto]);

  // Periodically update last active timestamp while online
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('last_active_timestamp', Date.now().toString());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Exp Formula from Zalo Bot
  

  const currentNeededExp = getNextLevelExp(player.realmIndex * 10 + player.realmLevel);

  // Find breakthrough pills and items
  useEffect(() => {
    const pills = inventory.filter(item => 
      ['truc_co_dan', 'kim_dan_dan', 'nguyen_anh_dan', 'hoa_than_dan', 'do_kiep_dan', 'tu_khi_dan'].includes(item.id)
    );
    setBreakthroughPills(pills);
  }, [inventory]);

  // Handle click on "TU LUYỆN" (Manual Cultivation)
  const handleManualCultivate = (e: React.MouseEvent<HTMLButtonElement>) => {
    playSound('click');

    // Stats and artifact bonuses
    const hasHondonChau = Object.values(player.equippedItems).some((item: any) => item?.id === 'hon_don_chau');
    const hasTruTienKiem = Object.values(player.equippedItems).some((item: any) => item?.id === 'tru_tien_kiem');
    
    // Cultivation per click
    const baseGain = 5 + player.realmIndex * 3;
    const statBonus = Math.floor((player.stats.atk + player.stats.def) * 0.05);
    const itemMultiplier = hasHondonChau ? 3.0 : 1.0;
    const totalMultiplier = itemMultiplier * (player.stats.xpRate || 1.0);
    const totalGain = Math.round((baseGain + statBonus) * totalMultiplier);

    // Add float text
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (Math.random() * 40 - 20);
    const y = e.clientY - rect.top - 20;
    
    const newText: FloatingText = {
      id: Math.random().toString(),
      x,
      y,
      text: `+${totalGain} Tu Vi`,
      color: 'text-cyan-400'
    };
    setFloatingTexts(prev => [...prev, newText]);

    // Update Player state
    setPlayer(prev => ({
      ...prev,
      cultivation: prev.cultivation + totalGain,
    }));
};

  // Clean up float text
  useEffect(() => {
    if (floatingTexts.length > 0) {
      const timer = setTimeout(() => {
        setFloatingTexts(prev => prev.slice(1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [floatingTexts]);

  // AFK / Auto-cultivation timer loop
  useEffect(() => {
    let autoTimer: ReturnType<typeof setInterval> | null = null;
    if (isCultivatingAuto) {
      autoTimer = setInterval(() => {
        const result = calcRealtimeCultivation({
          cultivation: { active: true, startTime: Date.now() - 1000 },
          power: player.stats.atk,
          defense: player.stats.def,
          luck: player.stats.crit,
          agility: player.stats.evasion,
          level: player.realmIndex * 10 + player.realmLevel,
          xpRate: (player.stats.xpRate || 0) / 10,
        });

        const totalAfkGain = result.xp;

        setPlayer(prev => ({
          ...prev,
          cultivation: prev.cultivation + totalAfkGain,
        }));

        // Add small ambient floating texts
        setFloatingTexts(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            x: 80 + Math.random() * 140,
            y: 100 + Math.random() * 60,
            text: `+${totalAfkGain.toFixed(2)} Tu Vi 🧘`,
            color: 'text-emerald-400'
          }
        ].slice(-6));
      }, 1000);
    }

    return () => {
      if (autoTimer) clearInterval(autoTimer);
    };
  }, [isCultivatingAuto, player.realmIndex, player.equippedItems]);

  // Determine Breakthrough eligibility
  const currentLvl = player.realmIndex * 10 + player.realmLevel;
  const isAtBreakthroughPoint = player.realmLevel === 10;
  const canProgress = player.cultivation >= currentNeededExp;

  // Breakthrough rates & calculations
 const calculateSuccessRate = () => {
  const realmIndex = player.realmIndex; // đại cảnh giới hiện tại: LK = 0, TC = 1, ...
  const realmLevel = player.realmLevel; // tiểu cảnh giới trong đại cảnh giới đó: 1 -> 10

  // Mỗi đại cảnh giới trừ vĩnh viễn 3%
  const majorPenalty = realmIndex * 3;

  // Mỗi tiểu cảnh giới trừ 1%, riêng tầng 10 là bước đột phá sang đại cảnh giới mới
  // nên lấy 10 để ra đúng ví dụ: LK10 -> TC1 = 90%
  const minorPenalty = realmLevel >= 10 ? 10 : realmLevel - 1;

  const rate = 100 - majorPenalty - minorPenalty;

  return Math.max(5, Math.min(100, rate));
};
  const getThunderProfile = () => {
    const score =
      (player.stats.crit || 0) * 1.2 +
      (player.stats.def || 0) * 0.12 +
      (player.stats.resistance || 0) * 0.4 +
      (player.stats.evasion || 0) * 0.45 +
      (player.stats.atk || 0) * 0.02;

    const strikes = Math.max(
      1,
      Math.min(6, Math.round(score / 30) + Math.floor(player.realmIndex / 2)),
    );

    const hue =
      strikes <= 2
        ? "cyan"
        : strikes === 3
          ? "white"
          : strikes === 4
            ? "violet"
            : strikes === 5
              ? "amber"
              : "red";

    const title =
      hue === "cyan"
        ? "Thanh Lôi"
        : hue === "white"
          ? "Bạch Lôi"
          : hue === "violet"
            ? "Tử Tiêu Lôi"
            : hue === "amber"
              ? "Kim Lôi"
              : "Diệt Thế Huyết Lôi";

    return { strikes, hue, title };
  };

  const pushBreakthroughLog = (message: string) => {
    setBreakthroughLogs((old) => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...old,
    ]);
  };

  const clearBreakthroughAnimTimer = () => {
    if (breakthroughAnimTimerRef.current) {
      clearTimeout(breakthroughAnimTimerRef.current);
      breakthroughAnimTimerRef.current = null;
    }
  };

  const handleBreakthrough = (selectedPillId?: string) => {
    if (breakthroughLockRef.current) return;
    if (player.cultivation < currentNeededExp || player.isDead) return;

    breakthroughLockRef.current = true;
    clearBreakthroughAnimTimer();
    playSound("click");

    const thunder = getThunderProfile();
    setThunderBurst(thunder);
    setBreakthroughPhase("charging");

    const selectedPill = selectedPillId
      ? inventory.find((i) => i.id === selectedPillId && i.count > 0)
      : undefined;

    let winRate = calculateSuccessRate();
    if (selectedPill) {
      if (selectedPillId === "tu_khi_dan") winRate += 10;
      else if (selectedPillId === "truc_co_dan" && player.realmIndex === 0)
        winRate += 20;
      else if (selectedPillId === "kim_dan_dan" && player.realmIndex === 1)
        winRate += 20;
      else if (selectedPillId === "nguyen_anh_dan" && player.realmIndex === 2)
        winRate += 20;
      else if (selectedPillId === "hoa_than_dan" && player.realmIndex === 3)
        winRate += 20;
      else if (selectedPillId === "do_kiep_dan") winRate += 25;
      else winRate += 10;
    }

    winRate = Math.max(5, Math.min(100, Math.round(winRate)));

    const consumePillOnce = (pillId?: string) => {
      if (!pillId) return;
      setInventory((prev) => removeInventoryItem(prev, pillId, 1));
    };
    consumePillOnce(selectedPillId);

    const roll = Math.random() * 100;
    const isSuccess = roll <= winRate;

    breakthroughAnimTimerRef.current = setTimeout(() => {
      setBreakthroughPhase("thunder");
    }, 450);

    window.setTimeout(() => {
      setBreakthroughPhase(isSuccess ? "success" : "failure");
    }, 1000);

    if (isSuccess) {
      playSound("success");

      const nextRealmIdx =
        player.realmLevel >= 10
          ? Math.min(REALMS.length - 1, player.realmIndex + 1)
          : player.realmIndex;
      const nextRealmLvl = player.realmLevel >= 10 ? 1 : player.realmLevel + 1;
      const nextNeeded = getNextLevelExp(nextRealmIdx * 10 + nextRealmLvl);

      const nextStats = {
        ...player.stats,
        maxHp: player.stats.maxHp + 40,
        hp: player.stats.maxHp + 40,
        atk: player.stats.atk + 8,
        def: player.stats.def + 4,
        mana: player.stats.maxMana,
      };

      setPlayer((prev) => ({
        ...prev,
        realmIndex: nextRealmIdx,
        realmLevel: nextRealmLvl,
        cultivation: Math.max(0, prev.cultivation - currentNeededExp),
        cultivationNeeded: nextNeeded,
        gold: prev.gold + 500,
        spiritStones: prev.spiritStones + 200,
        progressionStats: {
          ...((prev as any).progressionStats || {}),
          maxHp: (((prev as any).progressionStats?.maxHp) || 0) + 40,
          atk: (((prev as any).progressionStats?.atk) || 0) + 8,
          def: (((prev as any).progressionStats?.def) || 0) + 4,
        },
        stats: nextStats,
        isDead: false,
      }));

      pushBreakthroughLog(
        `✅ ĐỘT PHÁ THÀNH CÔNG! Đã bước vào ${REALMS[nextRealmIdx]} Tầng ${nextRealmLvl}.`,
      );
    } else {
      playSound("failure");

      const hasDoKiepDan = inventory.some(
        (i) => i.id === "do_kiep_dan" && i.count > 0,
      );

      if (hasDoKiepDan) {
        setInventory((prev) => removeInventoryItem(prev, "do_kiep_dan", 1));
        pushBreakthroughLog(
          `💀 ĐỘT PHÁ THẤT BẠI! Lôi kiếp dữ dội bổ xuống nhưng Độ Kiếp Đan đã bảo hộ, tu vi không mất!`,
        );
        alert("Đột phá thất bại! Nhờ có Độ Kiếp Đan nên không tổn thất tu vi.");
        setPlayer((prev) => ({
          ...prev,
          isDead: false,
        }));
      } else {
        const nextRealmLvl = player.realmLevel > 1 ? player.realmLevel - 1 : 10;
        const nextRealmIdx =
          player.realmLevel > 1
            ? player.realmIndex
            : Math.max(0, player.realmIndex - 1);
        const nextNeeded = getNextLevelExp(nextRealmIdx * 10 + nextRealmLvl);

       setPlayer((prev) => {
         const overflow = Math.max(0, prev.cultivation - nextNeeded);

         return {
           ...prev,
           cultivation: overflow + Math.max(1, Math.floor(nextNeeded * 0.01)),
           isDead: false,
           stats: {
             ...prev.stats,
             hp: Math.max(1, Math.floor(prev.stats.hp * 0.5)),
           },
         };
       });

        pushBreakthroughLog(
          `⚡ LÔI KIẾP GIÁNG THẾ! Đột phá thất bại, ngươi bị chấn lùi về ${REALMS[nextRealmIdx]} Tầng ${nextRealmLvl}.`,
        );

        alert(
          "Trời đất chấn động! Đột phá thất bại, tu vi bị suy hao nhưng ngươi vẫn có thể tiếp tục đột phá sau khi tích lũy lại.",
        );
      }
    }

    window.setTimeout(() => onUpdateStats(), 100);
    window.setTimeout(() => onSave(), 500);

    window.setTimeout(() => {
      setBreakthroughPhase("idle");
      setThunderBurst(null);
      breakthroughLockRef.current = false;
      clearBreakthroughAnimTimer();
    }, 1700);
  };

  const realmColors = [
    'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400', // Luyen Khi
    'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400', // Truc Co
    'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400', // Kim Dan
    'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400', // Nguyen Anh
    'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400', // Hoa Than
    'from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400', // Luyen Hu
    'from-orange-500/20 to-red-500/10 border-orange-500/30 text-orange-400', // Hop The
    'from-yellow-400/20 to-amber-400/10 border-yellow-400/30 text-yellow-300', // Dai Thua
    'from-red-600/20 to-rose-600/10 border-red-600/30 text-red-500', // Do Kiep
    'from-fuchsia-500/20 to-purple-600/10 border-fuchsia-500/30 text-fuchsia-400', // Tien Nhan
    'from-indigo-400/20 to-blue-600/10 border-indigo-400/30 text-indigo-400', // Kim Tien
    'from-yellow-500/30 to-amber-600/20 border-yellow-500/40 text-yellow-300', // Tien Vuong
    'from-cyan-400/30 to-teal-500/20 border-cyan-400/40 text-cyan-300', // Tien Ton
    'from-red-500/40 to-yellow-500/30 border-red-500/50 text-amber-300 animate-pulse' // Tien De
  ];

  const currentRealmColor = realmColors[player.realmIndex % realmColors.length];

  return (
    <div
      className="p-4 space-y-4 text-stone-200 text-left flex flex-col h-full"
      id="meditation_hub_view"
    >
      <AnimatePresence>
        {breakthroughPhase !== "idle" && (
          <motion.div
            key="breakthrough-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] pointer-events-none overflow-hidden"
          >
            <div
              className={`absolute inset-0 ${
                breakthroughPhase === "success"
                  ? "bg-emerald-950/70"
                  : breakthroughPhase === "failure"
                    ? "bg-red-950/75"
                    : "bg-indigo-950/75"
              }`}
            />
            {thunderBurst && (
              <div className="absolute inset-0">
                {Array.from({ length: thunderBurst.strikes }).map((_, idx) => {
                  const isLeft = idx % 2 === 0;
                  const hueClass =
                    thunderBurst.hue === "cyan"
                      ? "bg-cyan-200 shadow-cyan-300"
                      : thunderBurst.hue === "white"
                        ? "bg-white shadow-white"
                        : thunderBurst.hue === "violet"
                          ? "bg-violet-300 shadow-violet-300"
                          : thunderBurst.hue === "amber"
                            ? "bg-amber-300 shadow-amber-300"
                            : "bg-red-300 shadow-red-300";

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -30, scaleY: 0.2 }}
                      animate={{ opacity: [0, 1, 0.2, 1, 0], y: [0, 15, -10, 18, 0] }}
                      transition={{
                        duration: 1.1,
                        delay: idx * 0.11,
                        repeat: 0,
                        ease: "easeInOut",
                      }}
                      className={`absolute top-[-8%] ${isLeft ? "left-[18%]" : "right-[18%]"} w-1.5 h-[120%] rounded-full ${hueClass} blur-[1px] shadow-[0_0_30px_8px_currentColor]`}
                      style={{
                        transform: `rotate(${isLeft ? -12 - idx * 4 : 12 + idx * 4}deg)`,
                      }}
                    />
                  );
                })}
              </div>
            )}

            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className={`px-6 py-4 rounded-2xl border backdrop-blur-sm shadow-2xl text-center ${
                  breakthroughPhase === "success"
                    ? "bg-emerald-950/50 border-emerald-400/40 text-emerald-200"
                    : breakthroughPhase === "failure"
                      ? "bg-red-950/50 border-red-400/40 text-red-200"
                      : "bg-indigo-950/50 border-cyan-400/40 text-cyan-100"
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.35em] font-black opacity-80">
                  {breakthroughPhase === "success"
                    ? "ĐỘT PHÁ THÀNH CÔNG"
                    : breakthroughPhase === "failure"
                      ? "ĐỘT PHÁ THẤT BẠI"
                      : `LÔI KIẾP ${thunderBurst?.title ?? ""}`}
                </div>
                <div className="mt-2 text-xl md:text-3xl font-black">
                  {breakthroughPhase === "success"
                    ? "THIÊN MỆNH GIÁNG LÂM"
                    : breakthroughPhase === "failure"
                      ? "KINH MẠCH CHẤN ĐỘNG"
                      : `${thunderBurst?.strikes ?? 1} ĐẠO THIÊN LÔI`}
                </div>
                <div className="mt-1 text-[11px] md:text-sm font-medium opacity-90">
                  {breakthroughPhase === "success"
                    ? "Linh quang tụ đỉnh, cảnh giới khai mở."
                    : breakthroughPhase === "failure"
                      ? "Thiên lôi ép hồn, khí tức chấn loạn."
                      : "Thiên lôi đang ngưng tụ theo đạo vận và thực lực của ngươi."}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Meditation Chamber Header Banner */}
      <div
        className={`p-3.5 rounded-xl border bg-gradient-to-br ${currentRealmColor} shadow-lg`}
        id="meditation_status_banner"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-stone-400 flex items-center gap-1">
              <Sun size={12} className="text-amber-500 animate-spin-slow" />{" "}
              Linh Địa Tĩnh Tọa
            </span>
            <h2 className="text-sm font-black uppercase tracking-wide">
              {REALMS[player.realmIndex]}{" "}
              <span className="text-amber-400"> Tầng {player.realmLevel}</span>
            </h2>
            <p className="text-[10px] text-stone-400">
              Công lực:{" "}
              <span className="font-bold text-stone-300">
                {player.stats.atk} Công
              </span>{" "}
              |{" "}
              <span className="font-bold text-stone-300">
                {player.stats.def} Thủ
              </span>{" "}
              |{" "}
              <span className="font-bold text-stone-300">
                {player.stats.hp} HP
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="px-2.5 py-1 bg-stone-950/60 rounded-full border border-stone-800 text-[9px] font-bold text-stone-300 flex items-center gap-1">
              <Sparkles size={10} className="text-amber-400" /> +
              {player.realmIndex * 10 + 10}% AFK Bonus
            </span>
          </div>
        </div>

        {/* EXP Bar */}
        <div className="mt-3.5 space-y-1">
          <div className="flex justify-between text-[9px] font-mono font-black text-stone-300">
            <span>Tu Vi Cảnh Giới:</span>
            <span>
              {Math.floor(player.cultivation).toLocaleString()} /{" "}
              {currentNeededExp.toLocaleString()} XP
            </span>
          </div>
          <div className="h-2.5 w-full bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300 relative"
              style={{
                width: `${Math.min(100, (player.cultivation / currentNeededExp) * 100)}%`,
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Character Meditating Avatar Showcase Container */}
      <div
        className="relative bg-stone-950 rounded-xl border border-stone-850 overflow-hidden flex flex-col items-center justify-center p-6 h-56"
        id="avatarchamber_box"
      >
        {/* Floating background grids and stars */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

        {/* Giant glowing circle aura behind character */}
        <div
          className={`absolute w-36 h-36 rounded-full bg-gradient-to-tr ${(currentRealmColor ?? "").split(" ")[1]} filter blur-xl opacity-30 animate-pulse`}
        />

        {/* Animated aura borders */}
        <div className="absolute w-40 h-40 rounded-full border border-cyan-500/20 border-dashed animate-spin-slow pointer-events-none" />
        <div className="absolute w-32 h-32 rounded-full border border-emerald-500/15 animate-spin-reverse pointer-events-none" />

        {/* Float indicator texts rendered inside */}
        <AnimatePresence>
          {floatingTexts.map((text) => (
            <motion.div
              key={text.id}
              initial={{ opacity: 1, y: text.y, scale: 0.8 }}
              animate={{ opacity: 0, y: text.y - 80, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`absolute text-xs font-black font-mono tracking-wide select-none pointer-events-none ${text.color} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
              style={{ left: text.x }}
            >
              {text.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Player Meditating figure avatar */}
        <div className="relative flex flex-col items-center animate-float">
          {/* Glowing particle dots floating around */}
          <div className="absolute top-0 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <div className="absolute bottom-2 -left-4 w-1 h-1 rounded-full bg-emerald-400 animate-ping delay-300" />
          <div className="absolute bottom-4 -right-4 w-2 h-2 rounded-full bg-amber-400 animate-ping delay-700" />

          {/* Meditating body pose silhouette / avatar */}
          <div className="relative w-20 h-20 rounded-full bg-stone-900 border-2 border-stone-800 flex items-center justify-center shadow-inner overflow-hidden shadow-cyan-500/10">
            <span className="text-4xl">🧘</span>
          </div>

          {/* Character visual indicator halo ring */}
          <div className="w-16 h-1.5 bg-cyan-500/30 rounded-full blur-sm mt-3 animate-pulse" />
        </div>

        {/* Ambient meditation subtitle */}
        <span className="absolute bottom-2 text-[9px] font-mono text-stone-500 tracking-widest uppercase animate-pulse">
          {isCultivatingAuto
            ? "🌀 ĐANG TREO MÁY TỰ ĐỘNG THIỀN ĐỊNH..."
            : "💤 ĐANG DƯỠNG SỨC TĨNH TỌA..."}
        </span>
      </div>

      {pendingOfflineReward && (
        <div className="fixed top-4 right-4 z-[90] w-[min(360px,calc(100vw-1.5rem))] bg-stone-900 border border-cyan-500/30 rounded-xl p-3 space-y-2 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <div className="text-[10px] uppercase font-black tracking-wider text-cyan-400">
            Quà offline đang chờ nhận
          </div>

          <div className="text-[10px] text-stone-400">
            Đã bế quan: {formatDuration(pendingOfflineReward.diffSec)}
          </div>

          <div className="text-[11px] font-mono text-cyan-300">
            +{Math.floor(pendingOfflineReward.gainedCult).toLocaleString()} Tu Vi
          </div>
          
          <button
            onClick={() => {
              playSound("success");

              const gainCult = pendingOfflineReward.gainedCult;
              const gainLinhKhi = pendingOfflineReward.gainedLinhKhi;

              setPlayer((prev) => ({
                ...prev,
                cultivation: prev.cultivation + gainCult,
              }));

              requestAnimationFrame(() => {
                onUpdateStats();
                onSave();
              });

              localStorage.setItem(
                "last_active_timestamp",
                Date.now().toString(),
              );
              clearPendingOfflineReward();

              alert(
                `🧘 [Nhận Quà Offline]\n\n` +
                  `✨ +${Math.floor(gainCult).toLocaleString()} Tu Vi`
              );
            }}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold rounded-xl text-xs active:scale-95 transition-all"
          >
            NHẬN QUÀ OFFLINE
          </button>
        </div>
      )}

      {/* 3. Cultivation Buttons & Breakthrough Panels */}
      <div
        className="grid grid-cols-1 gap-3 shrink-0"
        id="meditation_actions_section"
      >
        {/* breakthrough overlay prompt when ready */}
        <div className="grid grid-cols-1 gap-3 shrink-0" id="meditation_actions_section">
        <div
          className="bg-gradient-to-r from-amber-950/40 via-stone-950/80 to-amber-950/40 border border-amber-900/40 p-3 rounded-lg space-y-2.5"
          id="breakthrough_trigger_panel"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle size={18} className={canProgress ? "animate-bounce" : ""} />
            <div className="text-left">
              <h4 className="text-xs font-black uppercase">
                Thiên Địa Duyên Hội Đã Chín Muồi
              </h4>
              <p className="text-[10px] text-stone-400">
                {canProgress
                  ? "Tu vi đã đạt đỉnh, sẵn sàng vượt qua kiếp nạn lôi thần!"
                  : "Tu vi chưa đủ. Tiếp tục tĩnh tọa để chờ thời cơ đột phá."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]" id="breakthrough_stats_summary">
            <div className="bg-stone-900 p-2 rounded border border-stone-850">
              <span className="text-stone-500 block">Tỉ lệ thành công:</span>
              <span className="text-amber-400 font-bold font-mono text-xs">
                {calculateSuccessRate()}%
              </span>
            </div>
            <div className="bg-stone-900 p-2 rounded border border-stone-850 text-left">
              <span className="text-stone-500 block">Đang xét lôi kiếp:</span>
              <span className="text-red-400 font-bold">
                {thunderBurst
                  ? `${thunderBurst.strikes} đạo - ${thunderBurst.title}`
                  : "Chưa kích hoạt"}
              </span>
            </div>
          </div>

          {breakthroughPills.length > 0 && canProgress && (
            <div className="p-2 bg-stone-900 rounded border border-stone-850 text-[10px]" id="breakthrough_dan_selectors">
              <p className="text-stone-400 font-bold mb-1.5">
                Sử dụng Đan dược trợ lực đột phá:
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {breakthroughPills.map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => handleBreakthrough(pill.id)}
                    className="px-2 py-1 bg-stone-950 hover:bg-stone-800 rounded border border-stone-800 text-[9px] font-bold text-amber-300 flex items-center gap-1 active:scale-95 transition-all whitespace-nowrap"
                  >
                    💊 {pill.name} (x{pill.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleBreakthrough()}
              disabled={!canProgress}
              className={`flex-1 py-2.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all ${
                canProgress
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 shadow-amber-500/20 cursor-pointer"
                  : "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
              }`}
            >
              <ArrowUpCircle size={15} />
              {canProgress ? "ĐỘT PHÁ CẢNH GIỚI" : "CHƯA ĐỦ TU VI ĐỂ ĐỘT PHÁ"}
            </button>
          </div>
        </div>

        <div className="space-y-2.5" id="cultivation_controls">
          <div className="grid grid-cols-1 gap-2" id="auto_cultivate_wrapper">
            <button
              onClick={() => {
                playSound("click");
                setIsCultivatingAuto((prev) => !prev);
              }}
              className={`w-full py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                isCultivatingAuto
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/5"
                  : "bg-stone-900 text-stone-500 border-stone-850 hover:text-stone-400"
              }`}
              id="auto_cultivate_toggle_btn"
            >
              <div
                className={`w-2 h-2 rounded-full ${isCultivatingAuto ? "bg-emerald-400 animate-ping" : "bg-stone-600"}`}
              />
              {isCultivatingAuto
                ? "🌀 TỰ ĐỘNG TU LUYỆN: ĐANG BẬT"
                : "💤 TỰ ĐỘNG TU LUYỆN: ĐANG TẮT"}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Breakthrough History Logs Panel */}
      <div
        className="flex-1 bg-stone-950 rounded-xl border border-stone-850 p-3 flex flex-col h-28 overflow-hidden"
        id="meditation_logs_pane"
      >
        <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-900 pb-1.5 flex items-center gap-1">
          <BookOpen size={11} /> Biên niên sử linh kiếp đột phá:
        </h4>
        <div
          className="flex-1 overflow-y-auto space-y-1.5 pt-2 text-[9px] font-mono text-stone-400 scrollbar-none"
          id="meditation_logs_scroller"
        >
          {breakthroughLogs.length === 0 ? (
            <p className="text-stone-600 italic">
              Kinh mạch thái thanh tĩnh lặng. Chưa từng nghênh chiến thiên
              lôi...
            </p>
          ) : (
            breakthroughLogs.map((log, index) => (
              <p
                key={index}
                className="leading-relaxed border-b border-stone-900/40 pb-1 last:border-0"
              >
                {log}
              </p>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
