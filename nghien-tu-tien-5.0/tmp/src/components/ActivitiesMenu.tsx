import React, { useState, useEffect, useRef } from 'react';
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
  { id: 'pray', name: 'Cầu Phúc Cơ Duyên', emoji: '🙏', desc: 'Triều bái bái kiến bức tượng Sáng Thế Thần cổ xưa nhận cơ duyên may mắn.', duration: 30, linhKhiCost: 8 },
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
  
  // We keep the old result state so the farm/activities logic can reuse it,
  // but every non-trivial result is shown with alert instead of a visible box.
  useEffect(() => {
    if (!activityResult) return;
    const timer = window.setTimeout(() => {
      window.alert(activityResult);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activityResult]);

  type MineRock = {
    id: number;
    x: number;
    y: number;
    hp: number;
    kind: number;
  };

  type MazeCell = {
    wall: boolean;
  };

  // Fishing Minigame States
  const [fishState, setFishState] = useState<'idle' | 'waiting' | 'bite' | 'success' | 'fail'>('idle');
  const [fishProgress, setFishProgress] = useState(0);
  const [fishZoneStart, setFishZoneStart] = useState(28);
  const [fishZoneSize, setFishZoneSize] = useState(20);
  const [fishCursor, setFishCursor] = useState(0);
  const [fishSpeed, setFishSpeed] = useState(1.2);
  const [fishDifficulty, setFishDifficulty] = useState(1);
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

  // New activity states
  const [mineRocks, setMineRocks] = useState<MineRock[]>([]);
  const [mineBrokenCount, setMineBrokenCount] = useState(0);
  const [huntFox, setHuntFox] = useState<{ id: number; x: number; y: number; size: number } | null>(null);
  const [deliveryMaze, setDeliveryMaze] = useState<MazeCell[][]>([]);
  const [deliveryPos, setDeliveryPos] = useState({ x: 0, y: 0 });
  const [deliveryMoves, setDeliveryMoves] = useState(0);

  const fishSpawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fishFailRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fishMoveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const huntMoveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const huntFailRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));

  const playerPower = Number((player as any)?.realmIndex ?? 0) * 12
    + Number((player as any)?.cultivation ?? 0) / 150
    + Number((player as any)?.stats?.hp ?? 0) / 25;

  const rewardRangeByActivity: Record<ActivityType, [number, number]> = {
    mine: [18, 70],
    gather: [12, 45],
    hunt: [25, 120],
    fish: [30, 165],
    pray: [10, 45],
    escort: [90, 260],
    delivery: [35, 180],
  };

 const rollSpiritStones = (id: ActivityType, bonus = 0) => {
   const [baseMin, baseMax] = rewardRangeByActivity[id];

   const power = playerPower;
   const luck = player.stats.luck ?? 0;

   // Tăng theo sức mạnh
   const growth = Math.sqrt(power) * 4;

   // Luck chỉ ảnh hưởng nhẹ
   const luckGrowth = Math.sqrt(luck) * 2;

   const min = Math.max(
     10,
     Math.floor(baseMin + growth + luckGrowth + bonus * 2),
   );

   const max = Math.min(
     700,
     Math.floor(baseMax + growth * 1.4 + luckGrowth * 3 + bonus * 5),
   );

   let reward = randInt(min, max);

   // Crit reward theo Luck
   const critChance = Math.min(0.002 + luck / 10000, 0.02); // 0.2% -> tối đa 2%

   if (Math.random() < critChance) {
     reward += randInt(50, 150);
   }

   // Jackpot cực hiếm
   const jackpotChance = Math.min(0.0002 + luck / 100000, 0.001); // 0.02% -> tối đa 0.1%

   if (Math.random() < jackpotChance) {
     reward = 1000;
   }

   return Math.min(reward, 1000);
 };

  const maybeGrantTienNgoc = () => {
    if (Math.random() >= 0.01) return 0;
    return randInt(1, 20);
  };

  const clearFishingTimers = () => {
    if (fishSpawnRef.current) {
      clearTimeout(fishSpawnRef.current);
      fishSpawnRef.current = null;
    }
    if (fishFailRef.current) {
      clearTimeout(fishFailRef.current);
      fishFailRef.current = null;
    }
    if (fishMoveRef.current) {
      clearInterval(fishMoveRef.current);
      fishMoveRef.current = null;
    }
  };

  const clearHuntTimers = () => {
    if (huntMoveRef.current) {
      clearInterval(huntMoveRef.current);
      huntMoveRef.current = null;
    }
    if (huntFailRef.current) {
      clearTimeout(huntFailRef.current);
      huntFailRef.current = null;
    }
  };

  const makeMineRock = (id: number): MineRock => ({
    id,
    x: randInt(14, 84),
    y: randInt(20, 78),
    hp: randInt(1, 10),
    kind: randInt(0, 3),
  });

  const makeMineRocks = () => [0, 1, 2].map((id) => makeMineRock(id));

  const makeFoxPosition = (id: number) => ({
    id,
    x: randInt(10, 86),
    y: randInt(12, 70),
    size: clamp(14 + Math.floor(playerPower / 10), 14, 26),
  });

  const makeMaze = (size: number) => {
    const grid: MazeCell[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ wall: true }))
    );

    let x = 0;
    let y = 0;
    grid[y][x].wall = false;

    while (x < size - 1 || y < size - 1) {
      if (x === size - 1) {
        y += 1;
      } else if (y === size - 1) {
        x += 1;
      } else if (Math.random() < 0.5) {
        x += 1;
      } else {
        y += 1;
      }
      grid[y][x].wall = false;
    }

    // Add some random open space to make the maze less linear.
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if ((row === 0 && col === 0) || (row === size - 1 && col === size - 1)) continue;
        if (grid[row][col].wall && Math.random() < 0.25) {
          grid[row][col].wall = false;
        }
      }
    }

    return grid;
  };

  const resetDeliveryMaze = () => {
    const size = clamp(5 + Math.floor(playerPower / 16), 5, 7);
    setDeliveryMaze(makeMaze(size));
    setDeliveryPos({ x: 0, y: 0 });
    setDeliveryMoves(0);
    setProgress(0);
  };

  useEffect(() => {
    if (activeActivity !== 'mine') return;
    setMineBrokenCount(0);
    setMineRocks(makeMineRocks());
    setProgress(0);
  }, [activeActivity]);

  useEffect(() => {
    if (activeActivity !== 'hunt') return;

    clearHuntTimers();
    setHuntFox(makeFoxPosition(Date.now()));
    setProgress(0);

  const pace = clamp(1400 - Math.floor(playerPower * 4), 650, 1400);

    huntMoveRef.current = window.setInterval(() => {
      setHuntFox((prev) => makeFoxPosition((prev?.id ?? 0) + 1));
    }, pace);

    huntFailRef.current = window.setTimeout(() => {
      if (activeActivity === 'hunt') {
        playSound('failure');
        clearHuntTimers();
        setActiveActivity(null);
        setCooldowns((prev) => ({
          ...prev,
          hunt: Date.now() + 9000,
        }));
        setActivityResult('🦊 Con cáo chạy mất trước khi ngươi kịp chạm tay vào!');
      }
    }, clamp(12000 - Math.floor(playerPower * 30), 7000, 12000));

    return () => clearHuntTimers();
  }, [activeActivity, playerPower]);

  useEffect(() => {
    if (activeActivity !== 'delivery') return;
    resetDeliveryMaze();
  }, [activeActivity]);

  useEffect(() => {
    if (activeActivity !== 'mine') return;
    setProgress((mineBrokenCount / 3) * 100);
  }, [mineBrokenCount, activeActivity]);

  useEffect(() => {
    return () => {
      clearFishingTimers();
      clearHuntTimers();
    };
  }, []);
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
    { id: 'u_linh_thao', name: 'U Linh Thảo Hạt Giống', cost: 50, duration: 60, emoji: '🌱', rewardName: 'U Linh Thảo', stones: 100, exp: 15 },
    { id: 'cuu_diep_linh_thao', name: 'Cửu Diệp Linh Thảo Hạt Giống', cost: 120, duration: 300, emoji: '🌿', rewardName: 'Cửu Diệp Linh Thảo', stones: 250, exp: 35 },
    { id: 'long_tien_thao', name: 'Long Tiên Thảo Hạt Giống', cost: 300, duration: 600, emoji: '🌸', rewardName: 'Long Tiên Thảo', stones: 600, exp: 80 }
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
    if (activeActivity && ['pray', 'escort'].includes(activeActivity)) {
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
      setMineBrokenCount(0);
      setMineRocks(makeMineRocks());
    } else if (id === 'gather') {
      setGatherHerbs([
        { id: 1, x: 20, y: 15, plucked: false },
        { id: 2, x: 50, y: 30, plucked: false },
        { id: 3, x: 15, y: 55, plucked: false }
      ]);
    } else if (id === 'hunt') {
      setHuntHitsLeft(4);
      clearHuntTimers();
      setHuntFox(makeFoxPosition(Date.now()));
    } else if (id === 'delivery') {
      resetDeliveryMaze();
    }
  };
  // Fishing Minigame Engine
  const startFishingMinigame = () => {
    clearFishingTimers();

    const difficulty = clamp(1 + Math.floor(playerPower / 12) + randInt(0, 1), 1, 4);
    const zoneSize = clamp(26 - difficulty * 4, 8, 22);
    const zoneStart = clamp(randInt(12, 78 - zoneSize), 8, 86 - zoneSize);
    const speed = clamp(1.1 + difficulty * 0.45, 1.1, 3);

    setFishDifficulty(difficulty);
    setFishZoneStart(zoneStart);
    setFishZoneSize(zoneSize);
    setFishCursor(0);
    setFishSpeed(speed);
    setFishState('waiting');
    setFishProgress(0);
    setActivityResult("🎣 Đang thả mồi... Hãy chờ cá cắn!");

    fishSpawnRef.current = window.setTimeout(() => {
      playSound('ping');
      setFishState('bite');
      setFishCursor(0);
      setFishProgress(0);
      setActivityResult("❗ CÁ CẮN CÂU! Canh thanh chạy để ấn đúng vạch xanh!");

      const startTime = Date.now();
      fishMoveRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        setFishCursor((prev) => {
          const next = prev + (speed * 0.75);
          const wrapped = next >= 100 ? next - 100 : next;
          setFishProgress(clamp((elapsed / 4200) * 100, 0, 100));
          return wrapped;
        });
      }, 26);

      fishFailRef.current = window.setTimeout(() => {
        clearFishingTimers();
        setFishState('fail');
        setActiveActivity(null);
        setCooldowns((prev) => ({
          ...prev,
          fish: Date.now() + 8000,
        }));
        setActivityResult("❌ Hụt mất rồi! Cá nuốt mồi và bơi đi mất.");
        playSound('failure');
      }, clamp(4200 - Math.floor(playerPower * 14), 2200, 4200));
    }, randInt(1500, 3000));
  };

  // Click Giật Cần
  const handleReelIn = () => {
    if (fishState !== 'bite') return;

    const inGreenZone = fishCursor >= fishZoneStart && fishCursor <= fishZoneStart + fishZoneSize;
    clearFishingTimers();

    if (!inGreenZone) {
      playSound('failure');
      setFishState('fail');
      setActiveActivity(null);
      setCooldowns((prev) => ({
        ...prev,
        fish: Date.now() + 8000,
      }));
      setActivityResult("❌ Giật sớm / giật trễ một nhịp, cá chạy mất!");
      return;
    }

    playSound('success');
    setFishState('success');
    completeActivity('fish', fishDifficulty);
  };
  // Complete Activity Rewards
  const completeActivity = (id: ActivityType, bonus = 0) => {
    if (activeActivity !== id && !['pray', 'escort'].includes(id)) {
      return;
    }

    let msg = "";
    let stonesEarned = 0;
    let expGained = 0;

    const tieTinhNgoc = maybeGrantTienNgoc();

    if (id === 'mine') {
      stonesEarned = rollSpiritStones('mine', bonus + mineBrokenCount);
      expGained = player.realmIndex * 3 + bonus;
      msg = `⛏️ Đào đá thành công! Vỡ đủ 3 cục đá và nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi.`;

    } else if (id === 'gather') {
      stonesEarned = rollSpiritStones('gather', bonus + 1);
      expGained = player.realmIndex * 3;
      setInventory(prev => {
        const existing = prev.find(i => i.id === 'linh_chi');
        if (existing) {
          return prev.map(i => i.id === 'linh_chi' ? { ...i, count: i.count + 2 } : i);
        } else {
          const temp = getItemTemplate('linh_chi') || { id: 'linh_chi', name: 'Linh Chi', type: 'herb', rarity: 'Trắng', desc: 'Dược liệu cơ bản để luyện đan.', count: 1 };
          return normalizeInventoryItems(addInventoryItem(prev, { ...temp, count: 2 } as GameItem, 2));
        }
      });
      msg = `🌿 Hái linh thảo xong! Nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi và 2 nhánh Linh Chi.`;

    } else if (id === 'hunt') {
      stonesEarned = rollSpiritStones('hunt', bonus + 2);
      expGained = player.realmIndex * 5 + bonus;
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
      msg = `🏹 Săn bắt cáo thành công! Nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi và 1 nguyên liệu yêu thú.`;

    } else if (id === 'fish') {
      stonesEarned = rollSpiritStones('fish', bonus + fishDifficulty * 2);
      expGained = player.realmIndex * 2 + fishDifficulty;
      msg = `🎣 Câu cá chuẩn nhịp thành công! Nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi.`;

    } else if (id === 'pray') {
      stonesEarned = rollSpiritStones('pray', bonus);
      expGained = player.realmIndex * 10;

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
        msg = `🙏 Tượng thần phát sáng! Ban tặng ngươi 1 Vé Quay Thưởng, +${stonesEarned} Linh thạch và +${expGained} Tu vi.`;
      } else {
        msg = `🙏 Thành tâm cầu phúc, ngươi nhận được +${stonesEarned} Linh thạch và +${expGained} Tu vi.`;
      }

    } else if (id === 'escort') {
      stonesEarned = rollSpiritStones('escort', bonus);
      expGained = player.realmIndex * 6;
      msg = `🚚 Hộ tống linh xa cập bến an toàn! Nhận được +${stonesEarned} Linh thạch và +${expGained} Tu vi.`;

    } else if (id === 'delivery') {
      stonesEarned = rollSpiritStones('delivery', bonus + deliveryMoves);
      expGained = player.realmIndex * 4 + Math.floor(bonus / 2);
      msg = `📦 Vượt qua mê cung giao tiên đan! Nhận được +${stonesEarned} Linh thạch, +${expGained} Tu vi.`;
    }

    if (tieTinhNgoc > 0) {
      setInventory(prev => {
        const existing = prev.find(i => i.id === 'tien_ngoc');
        if (existing) {
          return prev.map(i => i.id === 'tien_ngoc' ? { ...i, count: i.count + tieTinhNgoc } : i);
        }
        return [
          ...prev,
          {
            id: 'tien_ngoc',
            name: 'Tiên Ngọc',
            type: 'gem',
            rarity: 'Cam',
            desc: 'Tiên ngọc hiếm nhận từ hoạt động dã ngoại.',
            count: tieTinhNgoc,
          } as GameItem,
        ];
      });
      msg += ` Và may mắn nhận thêm ${tieTinhNgoc} Tiên Ngọc!`;
    }

    playSound('success');
    setPlayer(prev => ({
      ...prev,
      spiritStones: prev.spiritStones + stonesEarned,
      cultivation: prev.cultivation + expGained
    }));

    const cooldownDurations: Record<ActivityType, number> = {
  mine: 3 * 60 * 1000,      // 3 phút
  gather: 2 * 60 * 1000,    // 2 phút
  hunt: 5 * 60 * 1000,      // 5 phút
  fish: 4 * 60 * 1000,      // 4 phút
  pray: 10 * 60 * 1000,     // 10 phút
  escort: 15 * 60 * 1000,   // 15 phút
  delivery: 6 * 60 * 1000   // 6 phút
};

    setCooldowns(prev => ({
      ...prev,
      [id]: Date.now() + cooldownDurations[id]
    }));

    setActivityResult(msg);
    setActiveActivity(null);
    setFishState('idle');
    setMineBrokenCount(0);
    setMineRocks([]);
    setHuntFox(null);
    clearFishingTimers();
    clearHuntTimers();
    setTimeout(() => onSave(), 500);
  };

  useEffect(() => {
    localStorage.setItem('player_activities_cooldowns', JSON.stringify(cooldowns));
  }, [cooldowns]);
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
                  <div className="relative w-full h-full select-none overflow-hidden rounded-xl bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800">
                    <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-cyan-400">
                      <span>⛏️ Đập 3 lần / cục đá</span>
                      <span>{mineBrokenCount}/3 đá đã vỡ</span>
                    </div>

                    <div className="absolute inset-0">
                      {mineRocks.map((rock) => (
                        <button
                          key={rock.id}
                          onClick={() => {
                            if (activeActivity !== 'mine') return;
                            playSound('click');
                            setMineRocks((prev) => {
                              let broke = false;
                              const next = prev.map((item) => {
                                if (item.id !== rock.id) return item;
                                const hp = item.hp - 1;
                                if (hp <= 0) {
                                  broke = true;
                                  return makeMineRock(item.id);
                                }
                                return { ...item, hp };
                              });

                              if (broke) {
                                setMineBrokenCount((count) => {
                                  const nextCount = count + 1;
                                  if (nextCount >= 3) {
                                    window.setTimeout(() => completeActivity('mine', nextCount), 160);
                                  }
                                  return nextCount;
                                });
                              }
                              return next;
                            });
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border border-stone-700 bg-stone-950/90 shadow-md shadow-black/30 active:scale-90 transition-transform"
                          style={{
                            left: `${rock.x}%`,
                            top: `${rock.y}%`,
                            width: 42 + rock.kind * 4,
                            height: 42 + rock.kind * 4,
                          }}
                        >
                          <span className="text-2xl select-none">🪨</span>
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700 text-[8px] font-bold text-cyan-300">
                            {rock.hp}
                          </span>
                        </button>
                      ))}
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
                {activeActivity === 'hunt' && huntFox && (
                  <div className="relative w-full h-full select-none overflow-hidden rounded-xl bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800">
                    <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-red-400">
                      <span>🦊 Chạm đúng ngay lúc nó xuất hiện</span>
                      <span>Cáo đang chạy...</span>
                    </div>

                    <button
                      onClick={() => {
                        if (activeActivity !== 'hunt') return;
                        playSound('attack');
                        clearHuntTimers();
                        setHuntFox(null);
                        setProgress(100);
                        completeActivity('hunt', 1);
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-950/95 border border-red-500/40 shadow-lg shadow-red-500/20 active:scale-90 transition-transform"
                      style={{
                        left: `${huntFox.x}%`,
                        top: `${huntFox.y}%`,
                        width: huntFox.size * 2.1,
                        height: huntFox.size * 2.1,
                      }}
                    >
                      <motion.div
                        animate={{ x: [0, 3, -3, 0], y: [0, -2, 2, 0] }}
                        transition={{ repeat: Infinity, duration: 0.9 }}
                        className="text-4xl select-none"
                        style={{ fontSize: `${huntFox.size}px` }}
                      >
                        🦊
                      </motion.div>
                    </button>
                  </div>
                )}
                {activeActivity === 'fish' && (
                  <div className="relative w-full h-full rounded-xl bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 p-2 flex flex-col justify-center gap-3">
                    {fishState === 'waiting' && (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="text-4xl animate-float">🎣</div>
                        <div className="text-[9px] font-mono text-stone-500 tracking-wider animate-pulse">CHỜ CÁ CẮN...</div>
                      </div>
                    )}

                    {fishState === 'bite' && (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-amber-400">Câu cá kiểu thanh trượt</span>
                          <span className="text-stone-500">Khó: {fishDifficulty}/4</span>
                        </div>

                        <div className="relative h-6 w-full rounded-full border border-stone-700 bg-stone-950 overflow-hidden">
                          <div
                            className="absolute top-0 h-full bg-emerald-500/40 border-l border-r border-emerald-300/60"
                            style={{
                              left: `${fishZoneStart}%`,
                              width: `${fishZoneSize}%`,
                            }}
                          />
                          <div
                            className="absolute top-0 h-full w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.95)]"
                            style={{
                              left: `${fishCursor}%`,
                              transform: 'translateX(-50%)',
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[8px] font-mono text-stone-500">
                          <span>Ấn khi thanh trắng chạm vùng xanh</span>
                          <span>{Math.round(fishProgress)}%</span>
                        </div>

                        <button
                          onClick={handleReelIn}
                          className="mx-auto px-5 py-2 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-stone-950 font-black text-xs rounded-full shadow-lg shadow-red-500/40 animate-pulse scale-110 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          🎣 GIẬT CẦN NGAY !!!
                        </button>
                      </div>
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
                {activeActivity === 'delivery' && deliveryMaze.length > 0 && (
                  <div className="relative w-full h-full rounded-xl bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 p-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-amber-400">Giải mê cung giao tiên đan</span>
                      <span className="text-stone-500">Bước: {deliveryMoves}</span>
                    </div>

                    <div
                      className="grid gap-0.5 mx-auto"
                      style={{ gridTemplateColumns: `repeat(${deliveryMaze.length}, minmax(0, 1fr))` }}
                    >
                      {deliveryMaze.map((row, y) =>
                        row.map((cell, x) => {
                          const isPlayer = deliveryPos.x === x && deliveryPos.y === y;
                          const isGoal = x === deliveryMaze.length - 1 && y === deliveryMaze.length - 1;
                          return (
                            <div
                              key={`${x}-${y}`}
                              className={`aspect-square w-4 sm:w-5 rounded-[3px] border ${
                                cell.wall
                                  ? 'bg-stone-800 border-stone-700'
                                  : isGoal
                                    ? 'bg-amber-500 border-amber-300'
                                    : isPlayer
                                      ? 'bg-cyan-500 border-cyan-300'
                                      : 'bg-stone-950 border-stone-800'
                              }`}
                            />
                          );
                        })
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 mx-auto w-full max-w-[160px]">
                      <div />
                      <button
                        onClick={() => {
                          if (activeActivity !== 'delivery') return;
                          setDeliveryPos((prev) => {
                            const next = { x: prev.x, y: prev.y - 1 };
                            const cell = deliveryMaze[next.y]?.[next.x];
                            if (!cell || cell.wall) return prev;
                            const moved = deliveryMoves + 1;
                            setDeliveryMoves(moved);
                            setProgress(clamp((moved / (deliveryMaze.length * 2)) * 100, 0, 100));
                            if (next.x === deliveryMaze.length - 1 && next.y === deliveryMaze.length - 1) {
                              window.setTimeout(() => completeActivity('delivery', moved), 120);
                            }
                            return next;
                          });
                        }}
                        className="rounded-md bg-stone-800 text-stone-100 text-[10px] py-1 font-black"
                      >
                        ↑
                      </button>
                      <div />
                      <button
                        onClick={() => {
                          if (activeActivity !== 'delivery') return;
                          setDeliveryPos((prev) => {
                            const next = { x: prev.x - 1, y: prev.y };
                            const cell = deliveryMaze[next.y]?.[next.x];
                            if (!cell || cell.wall) return prev;
                            const moved = deliveryMoves + 1;
                            setDeliveryMoves(moved);
                            setProgress(clamp((moved / (deliveryMaze.length * 2)) * 100, 0, 100));
                            if (next.x === deliveryMaze.length - 1 && next.y === deliveryMaze.length - 1) {
                              window.setTimeout(() => completeActivity('delivery', moved), 120);
                            }
                            return next;
                          });
                        }}
                        className="rounded-md bg-stone-800 text-stone-100 text-[10px] py-1 font-black"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => {
                          if (activeActivity !== 'delivery') return;
                          setDeliveryPos((prev) => {
                            const next = { x: prev.x, y: prev.y + 1 };
                            const cell = deliveryMaze[next.y]?.[next.x];
                            if (!cell || cell.wall) return prev;
                            const moved = deliveryMoves + 1;
                            setDeliveryMoves(moved);
                            setProgress(clamp((moved / (deliveryMaze.length * 2)) * 100, 0, 100));
                            if (next.x === deliveryMaze.length - 1 && next.y === deliveryMaze.length - 1) {
                              window.setTimeout(() => completeActivity('delivery', moved), 120);
                            }
                            return next;
                          });
                        }}
                        className="rounded-md bg-stone-800 text-stone-100 text-[10px] py-1 font-black"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => {
                          if (activeActivity !== 'delivery') return;
                          setDeliveryPos((prev) => {
                            const next = { x: prev.x + 1, y: prev.y };
                            const cell = deliveryMaze[next.y]?.[next.x];
                            if (!cell || cell.wall) return prev;
                            const moved = deliveryMoves + 1;
                            setDeliveryMoves(moved);
                            setProgress(clamp((moved / (deliveryMaze.length * 2)) * 100, 0, 100));
                            if (next.x === deliveryMaze.length - 1 && next.y === deliveryMaze.length - 1) {
                              window.setTimeout(() => completeActivity('delivery', moved), 120);
                            }
                            return next;
                          });
                        }}
                        className="rounded-md bg-stone-800 text-stone-100 text-[10px] py-1 font-black"
                      >
                        →
                      </button>
                    </div>
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
          {false && (
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
          {false && (
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
