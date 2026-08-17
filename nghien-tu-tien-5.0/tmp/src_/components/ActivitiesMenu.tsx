import React, { useState, useEffect } from 'react';
import { PlayerCharacter, GameItem } from '../types';
import { playSound, getItemTemplate } from '../utils/gameData';
import { 
  Hammer, 
  Sparkles, 
  Compass, 
  Sun, 
  HelpCircle, 
  Trash2, 
  Zap, 
  Activity, 
  ShieldAlert, 
  ArrowRight,
  Anchor,
  Box,
  Truck,
  Heart,
  Sprout,
  User,
  AlertCircle,
  Swords
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listenAllPlayers, addMailToInbox } from '../lib/firebase';
import { addInventoryItem, normalizeInventoryItems } from '../utils/inventory';

interface ActivitiesMenuProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  onSave: () => void;
}

type ActivityType = 'mine' | 'gather' | 'hunt' | 'fish' | 'pray' | 'escort' | 'delivery';

interface ActivityDef {
  id: ActivityType;
  name: string;
  emoji: string;
  desc: string;
  duration: number; // seconds
  linhKhiCost: number;
}

interface FarmPlot {
  id: number;
  status: 'empty' | 'growing' | 'ripe';
  seedId: string | null;
  seedName: string;
  growthProgress: number; // 0 to 100
  timeRemaining: number; // seconds
  ripeTime: number; // timestamp when it becomes ripe
}

interface StealJob {
  friendUid: string;
  plotId: number;
  startedAt: number;
  endsAt: number;
}

const ACTIVITIES: ActivityDef[] = [
  { id: 'mine', name: 'Đào Khoáng Thạch', emoji: '⛏️', desc: 'Sử dụng cuốc thần lực khai thác linh mỏ, thu về Huyền Thiết quặng quý.', duration: 4, linhKhiCost: 15 },
  { id: 'gather', name: 'Hái Linh Thảo', emoji: '🌿', desc: 'Thám thính rừng sâu dã ngoại dồi dào nguyên khí hái lượm linh chi quý.', duration: 3, linhKhiCost: 10 },
  { id: 'hunt', name: 'Săn Thú Linh', emoji: '🏹', desc: 'Truy sát yêu thú hoang dã dã lấy yêu hạch linh thạch nạm kiếm rèn đồ.', duration: 4, linhKhiCost: 20 },
  { id: 'fish', name: 'Câu Cá Hồ Linh', emoji: '🎣', desc: 'Thả hồn bên mặt hồ tĩnh lặng, câu lôi ngư tinh luyện cơ thể nhận linh thạch.', duration: 5, linhKhiCost: 12 },
  { id: 'pray', name: 'Cầu Phúc Cơ Duyên', emoji: '🙏', desc: 'Triều bái bái kiến bức tượng Sáng Thế Thần cổ xưa nhận cơ duyên may mắn.', duration: 3, linhKhiCost: 8 },
  { id: 'escort', name: 'Hộ Tống Linh Xa', emoji: '🚚', desc: 'Bảo vệ thương xa chở Tiên Kim qua vùng biên giới Ma tộc đầy sơn tặc.', duration: 6, linhKhiCost: 25 },
  { id: 'delivery', name: 'Giao Tiên Đan', emoji: '📦', desc: 'Chuyển tiên bảo, đan dược cho các Đại Đạo Hữu ở các vùng bản thôn.', duration: 4, linhKhiCost: 10 }
];

export default function ActivitiesMenu({
  player,
  setPlayer,
  inventory,
  setInventory,
  onSave
}: ActivitiesMenuProps) {
  const [activeActivity, setActiveActivity] = useState<ActivityType | null>(null);
  const [progress, setProgress] = useState(0);

  // Cooldowns state for activities
  const [cooldowns, setCooldowns] = useState<Record<ActivityType, number>>(() => {
    const saved = localStorage.getItem('player_activities_cooldowns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      mine: 0,
      gather: 0,
      hunt: 0,
      fish: 0,
      pray: 0,
      escort: 0,
      delivery: 0
    };
  });

  const [now, setNow] = useState(Date.now());

 const STEAL_LOCK_KEY = "ntt_farm_steal_lock";

 const [stealLocks, setStealLocks] = useState<Record<number, number>>(() => {
   try {
     const saved = localStorage.getItem(STEAL_LOCK_KEY);
     return saved ? JSON.parse(saved) : {};
   } catch {
     return {};
   }
 });

 useEffect(() => {
   localStorage.setItem(STEAL_LOCK_KEY, JSON.stringify(stealLocks));
 }, [stealLocks]);

 const startStealLock = (plotId: number) => {
   const until = Date.now() + 5 * 60 * 1000;

   setStealLocks((prev) => ({
     ...prev,
     [plotId]: until,
   }));

   return until;
 };
 
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('player_activities_cooldowns', JSON.stringify(cooldowns));
  }, [cooldowns]);
  const [activityResult, setActivityResult] = useState<string | null>(null);
  
  // Fishing Minigame States
  const [fishState, setFishState] = useState<'idle' | 'waiting' | 'bite' | 'success' | 'fail'>('idle');
  const [fishProgress, setFishProgress] = useState(0);
  const [biteTimer, setBiteTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Escort Minigame Bandit States
  const [banditActive, setBanditActive] = useState(false);
  const [banditClicks, setBanditClicks] = useState(0);

  // General animation timeline states
  const [animStep, setAnimStep] = useState(0);

  // Interactive Minigame States
  const [mineClicksLeft, setMineClicksLeft] = useState(5);
  const [gatherHerbs, setGatherHerbs] = useState<{ id: number; x: number; y: number; plucked: boolean }[]>([]);
  const [huntHitsLeft, setHuntHitsLeft] = useState(4);

  // --- FARM INJECTED STATES ---
  const [subTab, setSubTab] = useState<'activities' | 'farm'>('activities');
  const [farmPlots, setFarmPlots] = useState<FarmPlot[]>(() => {
    const saved = localStorage.getItem('player_farm_plots');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, status: 'empty', seedId: null, seedName: '', growthProgress: 0, timeRemaining: 0, ripeTime: 0 },
      { id: 2, status: 'empty', seedId: null, seedName: '', growthProgress: 0, timeRemaining: 0, ripeTime: 0 },
      { id: 3, status: 'empty', seedId: null, seedName: '', growthProgress: 0, timeRemaining: 0, ripeTime: 0 },
      { id: 4, status: 'empty', seedId: null, seedName: '', growthProgress: 0, timeRemaining: 0, ripeTime: 0 },
    ];
  });
  const [plantingPlotId, setPlantingPlotId] = useState<number | null>(null);
  const [visitingFriend, setVisitingFriend] = useState<any | null>(null);
  const [friendPlots, setFriendPlots] = useState<FarmPlot[]>([]);

  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);
  const [stealJobs, setStealJobs] = useState<Record<number, StealJob>>({});

  useEffect(() => {
    const unsub = listenAllPlayers((players) => {
      setOnlinePlayers(Array.isArray(players) ? players : []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('player_farm_steal_jobs', JSON.stringify(stealJobs));
    } catch {}
  }, [stealJobs]);

  // Seed Templates Def
  const SEEDS = [
    { id: 'u_linh_thao', name: 'U Linh Thảo Hạt Giống', cost: 50, duration: 15, emoji: '🌱', rewardName: 'U Linh Thảo', stones: 100, exp: 15 },
    { id: 'cuu_diep_linh_thao', name: 'Cửu Diệp Linh Thảo Hạt Giống', cost: 120, duration: 30, emoji: '🌿', rewardName: 'Cửu Diệp Linh Thảo', stones: 250, exp: 35 },
    { id: 'long_tien_thao', name: 'Long Tiên Thảo Hạt Giống', cost: 300, duration: 60, emoji: '🌸', rewardName: 'Long Tiên Thảo', stones: 600, exp: 80 }
  ];

  // Player list is sourced from live online saves so farm data stays real
  const FRIENDS_LIST = onlinePlayers
    .filter((p) => p && String(p.uid || '') !== String((player as any).uid || ''))
    .map((p) => ({
      uid: p.uid,
      name: p.name || 'Ẩn danh',
      realmName: `${p.realmIndex || 0} - ${p.realmLevel || 1}`,
      raw: p,
    }))
    .slice(0, 20);

  const normalizeFarmPlot = (plot: any, idx: number): FarmPlot => ({
    id: Number(plot?.id ?? idx + 1),
    status: plot?.status === 'growing' || plot?.status === 'ripe' ? plot.status : 'empty',
    seedId: plot?.seedId || null,
    seedName: plot?.seedName || '',
    growthProgress: Number(plot?.growthProgress ?? (plot?.status === 'ripe' ? 100 : 0)) || 0,
    timeRemaining: Number(plot?.timeRemaining ?? 0) || 0,
    ripeTime: Number(plot?.ripeTime ?? 0) || 0,
  });

  // Auto-save farm plots when updated
  useEffect(() => {
    localStorage.setItem('player_farm_plots', JSON.stringify(farmPlots));
  }, [farmPlots]);

  // Farm growth ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setFarmPlots(prev => prev.map(plot => {
        if (plot.status === 'growing' && plot.timeRemaining > 0) {
          const nextTime = Math.max(0, plot.timeRemaining - 1);
          const seed = SEEDS.find(s => s.id === plot.seedId);
          const duration = seed ? seed.duration : 15;
          const progress = ((duration - nextTime) / duration) * 100;
          if (nextTime <= 0) {
            playSound('success');
            return {
              ...plot,
              status: 'ripe',
              timeRemaining: 0,
              growthProgress: 100
            };
          }
          return {
            ...plot,
            timeRemaining: nextTime,
            growthProgress: progress
          };
        }
        return plot;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Visit a friend's farm - load the real plots from that player's save
  const handleVisitFriend = (friend: any) => {
    playSound('ping');

    const rawPlotsSource = Array.isArray(friend?.raw?.farmPlots)
      ? friend.raw.farmPlots
      : Array.isArray(friend?.farmPlots)
        ? friend.farmPlots
        : [];

    const realPlots = rawPlotsSource
      .map((plot: any, idx: number) => normalizeFarmPlot(plot, idx))
      .filter((plot: FarmPlot) => plot.status !== 'empty');

    if (realPlots.length === 0) {
      setVisitingFriend(null);
      setFriendPlots([]);
      setActivityResult(`Không tìm thấy vườn thật sự đang có cây của ${friend.name}. Chỉ vườn có cây thật mới hiện để trộm.`);
      return;
    }

    setVisitingFriend(friend);
    setFriendPlots(realPlots.slice(0, 4));
  };

  // Plant a seed
  const handlePlantSeed = (plotId: number, seed: any) => {
    if (player.spiritStones < seed.cost) {
      alert("Không đủ Linh thạch để mua hạt giống này!");
      return;
    }

    playSound('click');
    setPlayer(prev => ({ ...prev, spiritStones: prev.spiritStones - seed.cost }));
    setFarmPlots(prev => prev.map(plot => plot.id === plotId ? {
      ...plot,
      status: 'growing',
      seedId: seed.id,
      seedName: seed.name,
      growthProgress: 0,
      timeRemaining: seed.duration,
      ripeTime: Date.now() + seed.duration * 1000
    } : plot));
    setPlantingPlotId(null);
    setActivityResult(`🌱 Đã gieo trồng thành công hạt giống ${seed.name}!`);
    setTimeout(() => onSave(), 500);
  };

  // Harvest ripe crop
  const handleHarvestCrop = (plotId: number) => {
    const plot = farmPlots.find(p => p.id === plotId);
    if (!plot || plot.status !== 'ripe') return;

    playSound('success');
    const seed = SEEDS.find(s => s.id === plot.seedId);
    const stonesEarned = seed ? seed.stones : 100;
    const expGained = seed ? seed.exp : 15;
    const herbName = seed ? seed.rewardName : 'Linh Chi';

    setPlayer(prev => ({
      ...prev,
      spiritStones: prev.spiritStones + stonesEarned,
      cultivation: prev.cultivation + expGained
    }));

    // Add to inventory
    setInventory(prev => {
      const existing = prev.find(i => i.id === plot.seedId);
      if (existing) {
        return prev.map(i => i.id === plot.seedId ? { ...i, count: i.count + 1 } : i);
      } else {
        const temp = {
          id: plot.seedId || 'linh_chi',
          name: herbName,
          type: 'herb',
          rarity: plot.seedId === 'long_tien_thao' ? 'Tím' : plot.seedId === 'cuu_diep_linh_thao' ? 'Lục' : 'Trắng',
          desc: `Linh thảo quý giá thu hoạch từ Linh Điền.`,
          count: 1
        } as GameItem;
        return normalizeInventoryItems(addInventoryItem(prev, temp, 1));
      }
    });

    // Reset plot
    setFarmPlots(prev => prev.map(p => p.id === plotId ? {
      id: p.id, status: 'empty', seedId: null, seedName: '', growthProgress: 0, timeRemaining: 0, ripeTime: 0
    } : p));

    setActivityResult(`✨ Thu hoạch thành công ${herbName}! Nhận được +${stonesEarned} Linh thạch & +${expGained} Tu vi!`);
    setTimeout(() => onSave(), 500);
  };

  // Steal crop from friend
  const handleStealCrop = async (plotId: number) => {
    const friend = visitingFriend;
    const plot = friendPlots.find((p) => p.id === plotId);
    if (!friend || !plot || plot.status !== 'ripe') return;

    const hasActiveJobForFriend = (Object.values(stealJobs) as StealJob[]).some(
      (job) => job.friendUid === friend.uid && job.endsAt > Date.now(),
    );
    if (hasActiveJobForFriend) {
      setActivityResult(`Vườn của ${friend.name} đang có một lượt trộm khác chạy rồi. Mỗi vườn chỉ được trộm 1 cây một lần.`);
      return;
    }

    const jobKey = plotId;
    const activeJob = stealJobs[jobKey];
    if (activeJob && activeJob.endsAt > Date.now()) {
      return;
    }

    playSound('attack');

    const seed = SEEDS.find((s) => s.id === plot.seedId);
    const herbName = seed ? seed.rewardName : 'U Linh Thảo';
    const startedAt = Date.now();
    const endsAt = startedAt + 5 * 60 * 1000;

    setStealJobs((prev) => ({
      ...prev,
      [jobKey]: {
        friendUid: friend.uid,
        plotId,
        startedAt,
        endsAt,
      },
    }));

    setActivityResult(
      `🥷 Đang trộm ${herbName} của ${friend.name}. 5 phút sau sẽ có kết quả trong hòm thư.`,
    );

    const finishSteal = async () => {
      if (Date.now() < endsAt) return;

      const isSuccess = Math.random() < 0.7;

      if (isSuccess) {
        playSound('success');
        const stonesStolen = Math.floor((seed ? seed.stones : 100) * 0.3);

        setPlayer((prev) => ({
          ...prev,
          spiritStones: prev.spiritStones + stonesStolen,
        }));

        setInventory((prev) => {
          const existing = prev.find((i) => i.id === plot.seedId);
          if (existing) {
            return prev.map((i) => (i.id === plot.seedId ? { ...i, count: i.count + 1 } : i));
          }
          return [
            ...prev,
            {
              id: plot.seedId || 'u_linh_thao',
              name: herbName,
              type: 'herb',
              rarity: 'Trắng',
              desc: 'Thảo dược hái trộm từ vườn linh điền của Đạo hữu khác.',
              count: 1,
            } as GameItem,
          ];
        });

        setFriendPlots((prev) =>
          prev.map((p) => (p.id === plotId ? { ...p, status: 'empty', growthProgress: 0, timeRemaining: 0 } : p)),
        );

        addMailToInbox({
          type: 'farm',
          title: 'Trộm rau thành công',
          content: `Đạo hữu [${player.name}] đã trộm thành công 1 ${herbName} từ vườn của ${friend.name}, nhận thêm +${stonesStolen} Linh thạch.`,
          actionRefId: `${friend.uid}:${plotId}`,
        });

        setActivityResult(`✅ Đã trộm được 1 ${herbName} và +${stonesStolen} Linh thạch. Kết quả đã gửi vào hòm thư.`);
      } else {
        playSound('failure');
        addMailToInbox({
          type: 'combat',
          title: 'Trộm rau thất bại',
          content: `Đạo hữu [${player.name}] trộm ${herbName} ở vườn của ${friend.name} nhưng thất bại sau 5 phút theo dõi.`,
          actionRefId: `${friend.uid}:${plotId}`,
        });

        setActivityResult(`❌ Bị phát hiện khi trộm ${herbName}. Kết quả đã gửi vào hòm thư.`);
      }

      setStealJobs((prev) => {
        const next = { ...prev };
        delete next[jobKey];
        return next;
      });

      setTimeout(() => onSave(), 500);
    };

    setTimeout(finishSteal, 5 * 60 * 1000);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (activeActivity && !['fish', 'mine', 'gather', 'hunt'].includes(activeActivity)) {
      setProgress(0);
      setAnimStep(0);
      setActivityResult(null);

      const intervalTime = 100; // milliseconds
      const totalSteps = (ACTIVITIES.find(a => a.id === activeActivity)?.duration || 4) * 10;
      let currentStep = 0;

      timer = setInterval(() => {
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
        setAnimStep(prev => (prev + 1) % 4);

        // Escort bandit encounter trigger half way
        if (activeActivity === 'escort' && currentStep === Math.floor(totalSteps / 2)) {
          // Pause progress and spawn bandit!
          if (timer) clearInterval(timer);
          playSound('failure');
          setBanditActive(true);
          setBanditClicks(0);
          setActivityResult("⚠️ SƠN TẶC CHẶN ĐƯỜNG! Mau click nhanh tiêu diệt chúng bảo vệ linh xa!");
          return;
        }

        if (currentStep >= totalSteps) {
          if (timer) clearInterval(timer);
          completeActivity(activeActivity);
        }
      }, intervalTime);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeActivity]);

  // Handle defeat escort bandit
  const handleDefeatBandit = () => {
    playSound('attack');
    setBanditClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        // Bandit defeated! Resume escort
        playSound('success');
        setBanditActive(false);
        setActivityResult("✅ Đã chém gục sơn tặc bảo vệ xa! Linh xa tiếp tục khởi hành...");
        
        // Resume interval progress manually
        const totalSteps = (ACTIVITIES.find(a => a.id === 'escort')?.duration || 6) * 10;
        let currentStep = Math.floor(totalSteps / 2) + 1;
        
        const timer = setInterval(() => {
          currentStep++;
          setProgress((currentStep / totalSteps) * 100);
          setAnimStep(prev => (prev + 1) % 4);

          if (currentStep >= totalSteps) {
            clearInterval(timer);
            completeActivity('escort');
          }
        }, 100);
      }
      return next;
    });
  };

  // Start activity
  const startAction = (id: ActivityType) => {
    const def = ACTIVITIES.find(a => a.id === id);
    if (!def) return;

    // Check cooldown
    if (cooldowns[id] && cooldowns[id] > Date.now()) {
      alert(`Hoạt động này đang trong thời gian hồi! Hãy chờ thêm giây lát.`);
      return;
    }

    // Check player state
    if (player.stats.hp <= 10) {
      alert("Khí huyết của ngươi quá thấp, hãy tĩnh tọa thiền định hồi sinh lực trước đã!");
      return;
    }

    playSound('click');
    setActiveActivity(id);
    setProgress(0);
    setActivityResult(null);
    setBanditActive(false);

    if (id === 'fish') {
      startFishingMinigame();
    } else if (id === 'mine') {
      setMineClicksLeft(5);
    } else if (id === 'gather') {
      setGatherHerbs([
        { id: 1, x: 20, y: 15, plucked: false },
        { id: 2, x: 50, y: 30, plucked: false },
        { id: 3, x: 15, y: 55, plucked: false }
      ]);
    } else if (id === 'hunt') {
      setHuntHitsLeft(4);
    }
  };

  // Fishing Minigame Engine
  const startFishingMinigame = () => {
    setFishState('waiting');
    setFishProgress(0);
    setActivityResult("🎣 Đang buông cần dã ngoại tĩnh mịch bên dòng Linh Hồ...");

    // Spawn bite alert randomly in 2-4 seconds
    const randomTime = 2000 + Math.random() * 2000;
    const timer = setTimeout(() => {
      playSound('ping');
      setFishState('bite');
      setActivityResult("❗ CẮN CÂU!!! GIẬT CẦN NGAY!");
      
      // Give player 1.5 seconds to react
      const failTimer = setTimeout(() => {
        setFishState('fail');
        setActiveActivity(null);
        setActivityResult("❌ Giật hụt mất rồi! Cá ăn trộm mồi bơi đi mất!");
        playSound('failure');
        // Set short fail cooldown
        setCooldowns(prev => ({
          ...prev,
          fish: Date.now() + 8000
        }));
      }, 1500);
      
      setBiteTimer(failTimer);
    }, randomTime);
  };

  // Click Giật Cần
  const handleReelIn = () => {
    if (biteTimer) clearTimeout(biteTimer);
    if (fishState !== 'bite') return;

    playSound('success');
    setFishState('success');
    completeActivity('fish');
  };

  // Complete Activity Rewards
  const completeActivity = (id: ActivityType) => {
    let msg = "";
    let stonesEarned = 0;
    let expGained = 0;

    if (id === 'mine') {
      stonesEarned = 40 + Math.floor(Math.random() * 30) + player.realmIndex * 15;
      expGained = 15 + player.realmIndex * 3;
      
      // Loot quặng
      setInventory(prev => {
        const existing = prev.find(i => i.id === 'huyen_thiet');
        if (existing) {
          return prev.map(i => i.id === 'huyen_thiet' ? { ...i, count: i.count + 2 } : i);
        } else {
          const temp = getItemTemplate('huyen_thiet') || { id: 'huyen_thiet', name: 'Huyền Thiết', type: 'ore', rarity: 'Trắng', desc: 'Quặng sắt đen dùng chế tạo trang bị phàm nhân.', count: 1 };
          return normalizeInventoryItems(addInventoryItem(prev, { ...temp, count: 2 } as GameItem, 2));
        }
      });
      msg = `⛏️ Đao khai mỏ thành công rực rỡ! Ngươi nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi và nhặt được 2 Huyền Thiết quặng!`;

    } else if (id === 'gather') {
      stonesEarned = 30 + Math.floor(Math.random() * 20) + player.realmIndex * 10;
      expGained = 12 + player.realmIndex * 3;

      // Loot thảo dược
      setInventory(prev => {
        const existing = prev.find(i => i.id === 'linh_chi');
        if (existing) {
          return prev.map(i => i.id === 'linh_chi' ? { ...i, count: i.count + 2 } : i);
        } else {
          const temp = getItemTemplate('linh_chi') || { id: 'linh_chi', name: 'Linh Chi', type: 'herb', rarity: 'Trắng', desc: 'Dược liệu cơ bản để luyện đan.', count: 1 };
          return normalizeInventoryItems(addInventoryItem(prev, { ...temp, count: 2 } as GameItem, 2));
        }
      });
      msg = `🌿 Hái dồi dào linh chi trên đồi mây! Ngươi nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi và nhặt được 2 nhánh Linh Chi!`;

    } else if (id === 'hunt') {
      stonesEarned = 60 + Math.floor(Math.random() * 40) + player.realmIndex * 20;
      expGained = 20 + player.realmIndex * 5;

      // Random material loot
      const materials = ['yeu_dan', 'ma_hach', 'yeu_hon'];
      const randomId = materials[Math.floor(Math.random() * materials.length)];
      
      setInventory(prev => {
        const existing = prev.find(i => i.id === randomId);
        if (existing) {
          return prev.map(i => i.id === randomId ? { ...i, count: i.count + 1 } : i);
        } else {
          const temp = getItemTemplate(randomId) || { id: randomId, name: 'Yêu Hạch', type: 'material', rarity: 'Lục', desc: 'Vật phẩm yêu thú dã ngoại.', count: 1 };
          return normalizeInventoryItems(addInventoryItem(prev, { ...temp, count: 1 } as GameItem, 1));
        }
      });
      msg = `🏹 Chém gọn ma thú hung mãnh dã dã! Nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi và 1 Yêu thú hạch cốt tinh sương!`;

    } else if (id === 'fish') {
      stonesEarned = 80 + Math.floor(Math.random() * 100) + player.realmIndex * 30;
      expGained = 10 + player.realmIndex * 2;
      msg = `🎣 KÉO CẦN LÊN!!! Thật kinh ngạc, ngươi đã câu được một chú cá Thần Thạch cực hiếm! Nhận được +${stonesEarned} Linh thạch và +${expGained} Tu vi!`;

    } else if (id === 'pray') {
      stonesEarned = 10 + player.realmIndex * 5;
      expGained = 30 + player.realmIndex * 10;
      
      // Chance of random lucky ticket or gem
      const isLucky = Math.random() < 0.4;
      if (isLucky) {
        setInventory(prev => {
          const existing = prev.find(i => i.id === 've_quay_thuong');
          if (existing) {
            return prev.map(i => i.id === 've_quay_thuong' ? { ...i, count: i.count + 1 } : i);
          } else {
            return normalizeInventoryItems(addInventoryItem(prev, { id: 've_quay_thuong', name: 'Vé Quay Thưởng', type: 'key', rarity: 'Tím', desc: 'Lượt quay Vòng Quay May Mắn của Hệ thống.', count: 1 }, 1));
          }
        });
        msg = `🙏 Tượng Sáng Thế Thần cổ xưa phát sáng vàng kim! Ban tặng ngươi 1 Vé Quay Thưởng, +${stonesEarned} Linh thạch và +${expGained} Tu vi ngộ đạo vượt bực!`;
      } else {
        msg = `🙏 Triều bái bái kiến thần linh thành tâm, tinh thần sảng khoái. Ngươi nhận được +${stonesEarned} Linh thạch và +${expGained} Tu vi!`;
      }

    } else if (id === 'escort') {
      stonesEarned = 150 + Math.floor(Math.random() * 120) + player.realmIndex * 50;
      expGained = 25 + player.realmIndex * 6;
      msg = `🚚 Linh xa hộ tống cập bến an toàn! Các thương nhân tạ ơn sâu sắc, thưởng ngươi +${stonesEarned} Linh thạch và +${expGained} Tu vi!`;

    } else if (id === 'delivery') {
      stonesEarned = 50 + Math.floor(Math.random() * 30) + player.realmIndex * 15;
      expGained = 15 + player.realmIndex * 4;
      
      // Chance of extra tip
      const tip = Math.floor(Math.random() * 40);
      msg = `📦 Giao tiên dược tới tay Đạo Hữu mỉm cười! Nhận được +${stonesEarned + tip} Linh thạch (+${tip} tip) và +${expGained} Tu vi dã dã!`;
      stonesEarned += tip;
    }

    playSound('success');
    setPlayer(prev => ({
      ...prev,
      spiritStones: prev.spiritStones + stonesEarned,
      cultivation: prev.cultivation + expGained
    }));

    const cooldownDurations: Record<ActivityType, number> = {
      mine: 15 * 1000,
      gather: 12 * 1000,
      hunt: 20 * 1000,
      fish: 15 * 1000,
      pray: 25 * 1000,
      escort: 40 * 1000,
      delivery: 18 * 1000
    };
    
    setCooldowns(prev => ({
      ...prev,
      [id]: Date.now() + cooldownDurations[id]
    }));

    setActivityResult(msg);
    setActiveActivity(null);
    setFishState('idle');
    
    setTimeout(() => onSave(), 500);
  };

  return (
    <div className="p-3 text-stone-200 text-left flex flex-col h-full gap-3" id="manual_activities_view">
      
      {/* Sub-tab selection header */}
      <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-850 gap-1 shrink-0" id="activities_subtabs">
        <button
          onClick={() => { playSound('click'); setSubTab('activities'); setVisitingFriend(null); }}
          className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'activities' 
              ? 'bg-stone-800 text-cyan-400 border border-cyan-500/20 shadow-inner' 
              : 'text-stone-500 hover:text-stone-300'
          }`}
          id="btn_subtab_activities"
        >
          ⛏️ DÃ NGOẠI KHAI PHÁ
        </button>
        <button
          onClick={() => { playSound('click'); setSubTab('farm'); }}
          className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'farm' 
              ? 'bg-stone-800 text-emerald-400 border border-emerald-500/20 shadow-inner' 
              : 'text-stone-500 hover:text-stone-300'
          }`}
          id="btn_subtab_farm"
        >
          🌾 LINH ĐIỀN NÔNG TRẠI
        </button>
      </div>

      {/* ----------------- SUBTAB: ACTIVITIES ----------------- */}
      {subTab === 'activities' && (
        <div className="flex-1 flex flex-col gap-3 min-h-0" id="activities_module">
          {/* Active working / loading panel with gorgeous custom animation */}
          {activeActivity && (
            <div className="bg-stone-950 p-5 rounded-2xl border-2 border-cyan-500/30 text-center space-y-4 relative overflow-hidden shrink-0" id="active_loader_panel">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 animate-pulse" />
              <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="animate-spin-slow">🌀</span> Đang tiến hành: {ACTIVITIES.find(a => a.id === activeActivity)?.name}
              </h3>

              {/* Animation & Interactive Mini-Game Area */}
              <div className="relative h-32 bg-stone-900 rounded-xl border border-stone-850 flex items-center justify-center overflow-hidden" id="visual_anim_box">
                {activeActivity === 'mine' && (
                  <div 
                    className="relative flex flex-col items-center justify-center h-full w-full select-none cursor-pointer p-2 bg-gradient-to-b from-stone-900 to-stone-950 hover:bg-stone-850 transition-colors" 
                    onClick={() => {
                      if (mineClicksLeft > 0) {
                        playSound('click');
                        const next = mineClicksLeft - 1;
                        setMineClicksLeft(next);
                        setProgress(((5 - next) / 5) * 100);
                        if (next === 0) {
                          completeActivity('mine');
                        }
                      }
                    }}
                  >
                    <div className="absolute top-1 right-2 text-[9px] font-mono text-cyan-400 animate-pulse uppercase tracking-widest font-bold">💥 CHẠM LIÊN TỤC VÀO ĐÁ ĐỂ ĐÀO!</div>
                    <motion.div 
                      whileTap={{ scale: 0.85 }}
                      className="text-5xl drop-shadow-[0_0_12px_rgba(34,211,238,0.5)] cursor-pointer select-none filter active:brightness-125"
                    >
                      🪨
                    </motion.div>
                    <div className="text-[10px] font-black text-cyan-400 mt-2 uppercase tracking-wider font-mono bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-md">
                      MỎ QUẶNG HP: {mineClicksLeft} / 5 CLICKS
                    </div>
                  </div>
                )}
                {activeActivity === 'gather' && (
                  <div className="relative w-full h-full p-2 select-none flex flex-col justify-between bg-gradient-to-b from-stone-900 to-stone-950">
                    <div className="text-[9px] font-mono text-emerald-400 animate-pulse text-center uppercase tracking-widest font-bold">🍀 CHẠM TỪNG NHÁNH LINH THẢO ĐỂ THU HOẠCH!</div>
                    <div className="flex-1 flex gap-4 items-center justify-center">
                      {gatherHerbs.map(herb => (
                        <button
                          key={herb.id}
                          disabled={herb.plucked}
                          onClick={() => {
                            playSound('success');
                            const updated = gatherHerbs.map(h => h.id === herb.id ? { ...h, plucked: true } : h);
                            setGatherHerbs(updated);
                            const pluckedCount = updated.filter(h => h.plucked).length;
                            setProgress((pluckedCount / 3) * 100);
                            if (pluckedCount === 3) {
                              completeActivity('gather');
                            }
                          }}
                          className={`text-4xl p-2 bg-stone-950/80 rounded-xl border transition-all active:scale-75 cursor-pointer ${
                            herb.plucked 
                              ? 'opacity-10 border-transparent pointer-events-none' 
                              : 'border-emerald-500/40 shadow-md shadow-emerald-500/10 hover:border-emerald-400 animate-bounce'
                          }`}
                        >
                          🌿
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeActivity === 'hunt' && (
                  <div 
                    className="relative w-full h-full select-none cursor-pointer flex flex-col items-center justify-center p-2 bg-gradient-to-b from-stone-900 to-stone-950 hover:bg-stone-850 transition-colors" 
                    onClick={() => {
                      if (huntHitsLeft > 0) {
                        playSound('attack');
                        const next = huntHitsLeft - 1;
                        setHuntHitsLeft(next);
                        setProgress(((4 - next) / 4) * 100);
                        if (next === 0) {
                          completeActivity('hunt');
                        }
                      }
                    }}
                  >
                    <div className="absolute top-1 right-2 text-[9px] font-mono text-red-400 animate-pulse uppercase tracking-widest font-bold">🎯 CHẠM VÀO YÊU THÚ ĐỂ DIỆT!</div>
                    <motion.div 
                      whileTap={{ scale: 0.8 }}
                      animate={{ 
                        x: [0, Math.sin(huntHitsLeft) * 20, -Math.sin(huntHitsLeft) * 20, 0],
                        y: [0, -10, 10, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="text-5xl cursor-pointer select-none filter active:hue-rotate-15 active:brightness-125 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    >
                      🦊
                    </motion.div>
                    <div className="text-[10px] font-black text-red-500 mt-2 uppercase tracking-wider font-mono bg-red-950/40 border border-red-950/30 px-2 py-0.5 rounded-md">
                      DÃ THÚ HP: {huntHitsLeft} / 4 HITS
                    </div>
                  </div>
                )}
                {activeActivity === 'fish' && (
                  <div className="relative flex flex-col items-center justify-center">
                    {fishState === 'waiting' && (
                      <div className="space-y-1">
                        <div className="text-4xl animate-float">🎣</div>
                        <div className="text-[9px] font-mono text-stone-500 tracking-wider animate-pulse">CHỜ CÁ CẮN CÂU...</div>
                      </div>
                    )}
                    {fishState === 'bite' && (
                      <button
                        onClick={handleReelIn}
                        className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-stone-950 font-black text-xs rounded-full shadow-lg shadow-red-500/40 animate-pulse scale-110 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        🎣 GIẬT CẦN NGAY !!!
                      </button>
                    )}
                  </div>
                )}
                {activeActivity === 'pray' && (
                  <div className="relative flex flex-col items-center justify-center">
                    <div className="text-4xl animate-pulse filter drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">🗿</div>
                    <div className="text-2xl mt-1 animate-bounce">🙇</div>
                    <div className="absolute inset-0 bg-yellow-500/10 filter blur-xl animate-pulse rounded-full pointer-events-none" />
                  </div>
                )}
                {activeActivity === 'escort' && (
                  <div className="relative flex flex-col items-center justify-center w-full px-4">
                    {banditActive ? (
                      <button
                        onClick={handleDefeatBandit}
                        className="px-4 py-2 bg-gradient-to-r from-red-700 via-stone-900 to-red-700 text-white rounded-lg border border-red-500/30 text-xs font-bold animate-pulse flex items-center gap-2 shadow-lg shadow-red-500/20"
                      >
                        🥷 CÀN QUÉT SƠN TẶC! ({banditClicks}/5 Cú Click)
                      </button>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="text-4xl animate-spin-slow">🎡</div>
                        <div className="text-3xl animate-bounce">🚚</div>
                      </div>
                    )}
                  </div>
                )}
                {activeActivity === 'delivery' && (
                  <div className="relative flex items-center gap-6">
                    <div className="text-4xl animate-bounce">📦</div>
                    <div className="text-4xl animate-pulse">🚶</div>
                  </div>
                )}
              </div>

              {/* Progress bar (except for active mini-games that pause) */}
              {!banditActive && fishState !== 'bite' && (
                <div className="space-y-1">
                  <div className="h-2 w-full bg-stone-900 rounded-full overflow-hidden border border-stone-850 p-0.5">
                    <div 
                      className="h-full bg-cyan-500 rounded-full transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-stone-500">{Math.round(progress)}% Hoàn Tất</span>
                </div>
              )}
            </div>
          )}

          {/* Display Activities Results / Rewards */}
          {activityResult && (
            <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-850 flex items-start gap-3 shrink-0" id="activity_results_box">
              <div className="p-2 bg-stone-900 rounded-full text-cyan-400 shrink-0" id="results_icon">
                <Sparkles size={16} className="animate-spin-slow" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Thông báo Linh Thông:</h4>
                <p className="text-[10px] text-stone-300 leading-relaxed">{activityResult}</p>
              </div>
            </div>
          )}

          {/* Activities Board List Scroller */}
          <div className="flex-1 overflow-y-auto space-y-2 pb-4 scrollbar-none" id="activities_scroller">
            <div className="border-b border-stone-900 pb-1.5 flex justify-between items-center shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">
                Khai phá linh thạch dã dã thủ công:
              </span>
              <span className="text-[9px] text-stone-400 font-mono">
                Khí huyết: <span className="text-red-400 font-bold">{player.stats.hp} HP</span>
              </span>
            </div>

            {ACTIVITIES.map((act) => {
              const isWorking = activeActivity === act.id;
              const isBusy = activeActivity !== null;

              return (
                <div 
                  key={act.id} 
                  className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition-all ${
                    isWorking 
                      ? 'bg-cyan-950/20 border-cyan-500/40 shadow-inner' 
                      : 'bg-stone-950/60 border-stone-900 hover:border-stone-800 hover:bg-stone-950'
                  }`}
                  id={`activity_card_${act.id}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="text-2xl p-2 bg-stone-900/80 rounded-xl border border-stone-850 shrink-0 select-none">
                      {act.emoji}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                        {act.name}
                      </h4>
                      <p className="text-[10px] text-stone-400 leading-relaxed max-w-xs">{act.desc}</p>
                      <div className="flex items-center gap-2 pt-0.5 text-[9px] font-mono">
                        <span className="text-cyan-400 font-black">⚡ Thưởng: Linh thạch & Tu vi</span>
                        <span className="text-stone-500">•</span>
                        <span className="text-stone-500">{act.duration}s</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isBusy || (cooldowns[act.id] > now)}
                    onClick={() => startAction(act.id)}
                    className={`px-3 py-1.5 rounded font-black text-[10px] active:scale-95 transition-all shrink-0 uppercase tracking-wider ${
                      isWorking
                        ? 'bg-cyan-600 text-stone-950 cursor-not-allowed'
                        : isBusy
                          ? 'bg-stone-900 border border-stone-850 text-stone-600 cursor-not-allowed'
                          : cooldowns[act.id] > now
                            ? 'bg-stone-950 border border-stone-900 text-stone-500 cursor-not-allowed'
                            : 'bg-stone-900 border border-stone-800 text-cyan-400 hover:bg-stone-800 cursor-pointer'
                    }`}
                    id={`activity_btn_${act.id}`}
                  >
                    {isWorking 
                      ? "ĐANG LÀM" 
                      : cooldowns[act.id] > now 
                        ? `HỒI: ${Math.ceil((cooldowns[act.id] - now) / 1000)}S` 
                        : "THI HÀNH"
                    }
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- SUBTAB: FARM ----------------- */}
      {subTab === 'farm' && (
        <div className="flex-1 flex flex-col gap-3 min-h-0" id="farm_module">
          
          {/* Header instructions / status */}
          <div className="bg-stone-950 border border-stone-900 p-3 rounded-xl flex justify-between items-center shrink-0 text-xs" id="farm_hud">
            <div className="flex items-center gap-2">
              <Sprout className="text-emerald-400 animate-bounce" size={16} />
              <div>
                <h4 className="font-bold text-stone-200 text-xs">LINH ĐIỀN CỔ GIA</h4>
                <p className="text-[9px] text-stone-500">Gieo linh thảo thạch quý, chăm bón gặt vàng tiên.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-500 font-black font-mono">💰 {player.spiritStones} Linh thạch</span>
            </div>
          </div>

          {/* Interactive Soil Grid (2x2 plots) */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0" id="farm_soil_plots_grid">
            {(visitingFriend ? friendPlots : farmPlots).map((plot) => {
              return (
                <div 
                  key={plot.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between h-28 relative overflow-hidden transition-all duration-200 ${
                    plot.status === 'empty' 
                      ? 'bg-stone-900/40 border-stone-800 hover:border-stone-700' 
                      : plot.status === 'growing'
                        ? 'bg-emerald-950/10 border-emerald-800/40'
                        : 'bg-amber-950/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                  }`}
                  id={`soil_plot_${plot.id}`}
                >
                  <span className="absolute top-1.5 left-2 text-[8px] font-mono text-stone-500">Ô ĐẤT #{plot.id}</span>
                  
                  <div className="flex-1 flex flex-col items-center justify-center pt-2" id={`plot_visual_${plot.id}`}>
                    {plot.status === 'empty' && (
                      <div className="text-center space-y-1">
                        <span className="text-2xl filter saturate-50">🟫</span>
                        <p className="text-[9px] font-bold text-stone-500 uppercase">Đất Hoang</p>
                      </div>
                    )}
                    {plot.status === 'growing' && (
                      <div className="text-center space-y-1 w-full px-2">
                        <span className="text-2xl animate-float">🌱</span>
                        <p className="text-[9px] font-bold text-emerald-400 truncate max-w-[120px]">{plot.seedId === 'long_tien_thao' ? 'Long Tiên...' : plot.seedId === 'cuu_diep_linh_thao' ? 'Cửu Diệp...' : 'U Linh Thảo'}</p>
                        {/* Real-time remaining progress bar */}
                        <div className="h-1 bg-stone-950 rounded-full overflow-hidden p-0.5">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${plot.growthProgress}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-mono text-stone-500 block">Còn {plot.timeRemaining}s</span>
                      </div>
                    )}
                    {plot.status === 'ripe' && (
                      <div className="text-center space-y-0.5 animate-pulse">
                        <span className="text-2xl">✨🌸✨</span>
                        <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{plot.seedId === 'long_tien_thao' ? '🌸 LONG TIÊN' : plot.seedId === 'cuu_diep_linh_thao' ? '🌿 CỬU DIỆP' : '🌱 U LINH'}</p>
                      
                      </div>
                    )}
                  </div>

                  {/* Actions inside soil plot */}
                  <div className="mt-1.5 shrink-0" id={`plot_actions_${plot.id}`}>
                    {visitingFriend ? (
                      stealJobs[plot.id] ? (
                        <div className="w-full py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[9px] font-black tracking-wider text-center uppercase">
                          Đang trộm {Math.max(0, Math.ceil((stealJobs[plot.id].endsAt - now) / 1000))}s
                        </div>
                      ) : plot.status === 'ripe' ? (
                        <button
                          onClick={() => handleStealCrop(plot.id)}
                          className="w-full py-1 bg-red-600 hover:bg-red-500 text-stone-950 font-black text-[9px] rounded-lg tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer uppercase"
                        >
                          <Swords size={9} /> HÁI TRỘM
                        </button>
                      ) : (
                        <div className="text-center text-[9px] text-stone-600 italic">Chưa chín</div>
                      )
                    ) : (
                      plot.status === 'empty' ? (
                        <button
                          onClick={() => { playSound('click'); setPlantingPlotId(plot.id); }}
                          className="w-full py-1 bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-750 font-bold text-[9px] rounded-lg tracking-wider active:scale-95 transition-all cursor-pointer uppercase"
                        >
                          Gieo Trồng
                        </button>
                      ) : plot.status === 'ripe' ? (
                        <button
                          onClick={() => handleHarvestCrop(plot.id)}
                          className="w-full py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-[9px] rounded-lg tracking-wider active:scale-95 transition-all cursor-pointer uppercase"
                        >
                          Thu Hoạch
                        </button>
                      ) : (
                        <div className="text-center text-[9px] text-stone-500 font-mono italic">Đang lớn...</div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seed choosing modal panel */}
          {plantingPlotId && (
            <div className="bg-stone-950 border border-emerald-500/20 p-3 rounded-xl space-y-2 shrink-0 animate-fade-in" id="seed_shop_panel">
              <div className="flex justify-between items-center border-b border-stone-900 pb-1">
                <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1">🛒 CHỌN HẠT GIỐNG ĐỂ GIEO:</span>
                <button 
                  onClick={() => setPlantingPlotId(null)}
                  className="text-[9px] text-stone-500 hover:text-stone-400 font-black"
                >
                  HUỶ
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5" id="seeds_options_grid">
                {SEEDS.map((seed) => (
                  <button
                    key={seed.id}
                    onClick={() => handlePlantSeed(plantingPlotId, seed)}
                    className="p-1.5 bg-stone-900/60 hover:bg-stone-900 border border-stone-800 rounded-lg flex flex-col items-center justify-between text-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="text-xl">{seed.emoji}</span>
                    <span className="text-[8px] font-bold text-stone-300 leading-tight truncate w-full">{seed.rewardName}</span>
                    <span className="text-[8px] text-stone-500 font-mono">T: {seed.duration}s</span>
                    <span className="text-[9px] font-black text-amber-500 font-mono">{seed.cost} L.T</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stealing alert / friend visit logs */}
          {activityResult && (
            <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-850 flex items-start gap-2.5 shrink-0" id="farm_results_box">
              <div className="p-1 bg-stone-900 rounded-full text-emerald-400 shrink-0">
                <Sprout size={14} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Mông Điền Linh Thông:</h4>
                <p className="text-[9px] text-stone-300 leading-relaxed">{activityResult}</p>
              </div>
            </div>
          )}

          {/* Friend Farms Directory to raid / steal */}
          <div className="flex-1 bg-stone-950 border border-stone-900 rounded-xl p-3 flex flex-col min-h-0" id="friend_farms_directory">
            <div className="flex justify-between items-center border-b border-stone-900 pb-1.5 mb-2 shrink-0">
              <span className="text-[9px] font-black text-stone-500 uppercase flex items-center gap-1">🥷 LẺN VÀO LINH ĐIỀN ĐẠO HỮU (TRỘM CẮP):</span>
              {visitingFriend && (
                <button
                  onClick={() => { playSound('click'); setVisitingFriend(null); }}
                  className="px-2 py-0.5 bg-stone-900 border border-stone-800 hover:bg-stone-800 rounded font-bold text-[9px] text-cyan-400 cursor-pointer"
                >
                  ← VỀ VƯỜN TA
                </button>
              )}
            </div>

            {visitingFriend ? (
              <>
              <div className="text-center p-3 bg-stone-900/20 border border-dashed border-red-500/20 rounded-lg space-y-1.5 shrink-0" id="visiting_friend_status">
                <p className="text-[10px] text-stone-300">Đang đột nhập khu vườn linh dược của <span className="text-amber-400 font-bold">{visitingFriend.name}</span>...</p>
                <p className="text-[9px] text-stone-500 italic">💡 Chỉ những vườn thật sự có cây chín mới hiện ra để trộm.</p>
              </div>

              {(Object.values(stealJobs) as StealJob[]).some((job) => job.friendUid === visitingFriend.uid) && (
                <div className="bg-stone-950 border border-amber-500/20 rounded-lg p-3 space-y-2 shrink-0" id="steal_progress_overview">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-amber-400 uppercase">Tiến trình trộm rau</span>
                    <span className="text-[9px] text-stone-500 font-mono">5 phút</span>
                  </div>
                  {(Object.values(stealJobs) as StealJob[])
                    .filter((job) => job.friendUid === visitingFriend.uid)
                    .map((job) => {
                      const progress = Math.max(0, Math.min(100, ((now - job.startedAt) / (job.endsAt - job.startedAt)) * 100));
                      const remain = Math.max(0, Math.ceil((job.endsAt - now) / 1000));
                      return (
                        <div key={job.plotId} className="space-y-1">
                          <div className="flex justify-between text-[9px] text-stone-400">
                            <span>Ô đất #{job.plotId}</span>
                            <span>{remain}s</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-900 overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
              </>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-none" id="friends_list_viewport">
                {FRIENDS_LIST.map((friend) => {
                  const rawPlots = Array.isArray(friend.raw?.farmPlots) ? friend.raw.farmPlots : [];
                  const ripeCount = rawPlots.filter((plot: any) => plot?.status === 'ripe').length;
                  return (
                    <div
                      key={friend.uid}
                      className="p-2 bg-stone-900/40 border border-stone-900 hover:border-stone-800 hover:bg-stone-900 rounded-xl flex items-center justify-between text-xs"
                      id={`friend_row_${friend.uid}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-stone-950 flex items-center justify-center font-bold text-stone-400 text-[10px]">
                          🧘
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-stone-300 text-[10px]">{friend.name}</p>
                          <p className="text-[8px] text-stone-500 font-mono">{friend.realmName}</p>
                          <p className="text-[8px] text-emerald-400 font-mono">Cây chín: {ripeCount}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleVisitFriend(friend)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-750 text-cyan-400 border border-stone-700 hover:border-cyan-500/30 rounded text-[9px] font-bold cursor-pointer"
                      >
                        ĐỘT NHẬP VƯỜN
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
