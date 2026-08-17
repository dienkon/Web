/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlayerCharacter, GameItem, Skill, Quest, ActiveEnemy, GameParticle } from '../types';
import { MAPS, ITEM_TEMPLATES, playSound, createEquipment } from '../utils/gameData';
import { addInventoryItem, normalizeInventoryItems } from '../utils/inventory';
import { Flame, Shield, Heart, Zap, Crosshair, Sparkles, Swords, User } from 'lucide-react';
import { listenAllOnlinePlayers, savePlayerData, addMailToInbox } from '../lib/firebase';

interface GameCanvasProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  skills: Skill[];
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
  currentMapId: string;
  activeQuests: Quest[];
  setActiveQuests: React.Dispatch<React.SetStateAction<Quest[]>>;
  user?: any; // Google auth user
}

export default function GameCanvas({
  player,
  setPlayer,
  inventory,
  setInventory,
  skills,
  setSkills,
  currentMapId,
  activeQuests,
  setActiveQuests,
  user
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard input states
  const keysPressed = useRef<Record<string, boolean>>({});

  // Virtual joystick state (for mobile)
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickStart, setJoystickStart] = useState({ x: 0, y: 0 });
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickVector = useRef({ x: 0, y: 0 });
  const [mobileControlsVisible, setMobileControlsVisible] = useState(true);
  const hideControlsTimer = useRef<number | null>(null);

  const showMobileControls = useCallback(() => {
    setMobileControlsVisible(true);
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = window.setTimeout(() => {
      setMobileControlsVisible(false);
    }, 2500);
  }, []);

  // Game loop references
  const playerPos = useRef({ x: 1000, y: 1000 });
  const enemies = useRef<ActiveEnemy[]>([]);
  const resources = useRef<{ id: string; itemId: string; name: string; x: number; y: number; size: number; color: string; respawnTimer: number }[]>([]);
  const particles = useRef<GameParticle[]>([]);
  const requestRef = useRef<number | null>(null);

  // Auto-targeting & Combat reference
  const currentTarget = useRef<ActiveEnemy | null>(null);
  const lastAttackTime = useRef(0);
  const isDashing = useRef(false);
  const dashTimer = useRef(0);
  const dashVector = useRef({ x: 0, y: 0 });

  // Active spells in play
  const activeSpells = useRef<{ id: string; x: number; y: number; radius: number; maxRadius: number; type: string; color: string; damage: number; life: number }[]>([]);

  // PK Cooldown
  const pkCooldown = useRef(0);

  // Selected Map Config
  const mapConfig = MAPS.find(m => m.id === currentMapId) || MAPS[0];

  // Initialize Map Assets (Trees, Rocks, Ruins)
  const mapDecorations = useRef<{ x: number; y: number; type: 'tree' | 'rock' | 'ruins'; size: number }[]>([]);

useEffect(() => {
  showMobileControls();
  return () => {
    if (hideControlsTimer.current)
      window.clearTimeout(hideControlsTimer.current);
  };
}, [showMobileControls]);

  // Trigger once on map change
  useEffect(() => {
    // Populate Map decorations
    const list: typeof mapDecorations.current = [];
    for (let i = 0; i < 60; i++) {
      list.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        type: Math.random() > 0.5 ? 'tree' : Math.random() > 0.4 ? 'rock' : 'ruins',
        size: 15 + Math.random() * 30
      });
    }
    mapDecorations.current = list;

    // Reset player pos
    playerPos.current = { x: 1000, y: 1000 };

    // Spawn initial monsters
    spawnMonsters();

    // Spawn initial gatherables
    spawnGatherables();
  }, [currentMapId]);

  const spawnMonsters = () => {
    const mapLvl = mapConfig.minLevel;
    const list: ActiveEnemy[] = [];
    
    // 8 normal mobs, 3 elite, 1 Boss
    for (let i = 0; i < 8; i++) {
      list.push(createEnemy('quái thường', mapLvl));
    }
    for (let i = 0; i < 3; i++) {
      list.push(createEnemy('tinh anh', mapLvl));
    }
    list.push(createEnemy('boss', mapLvl));
    
    enemies.current = list;
  };

  const createEnemy = (type: 'quái thường' | 'tinh anh' | 'boss' | 'boss bí cảnh', baseLvl: number): ActiveEnemy => {
    const rx = Math.random() * 1800 + 100;
    const ry = Math.random() * 1800 + 100;
    
    let hp = 100 + baseLvl * 15;
    let atk = 10 + baseLvl * 3;
    let def = 5 + baseLvl * 1.5;
    let size = 16;
    let color = '#ea580c'; // Orange
    let name = `Yêu Binh Quyệt`;

    if (type === 'tinh anh') {
      hp *= 3;
      atk *= 1.8;
      def *= 2;
      size = 24;
      color = '#a855f7'; // Purple
      name = `Thú Tinh Anh`;
    } else if (type === 'boss' || type === 'boss bí cảnh') {
      hp = type === 'boss' ? loadSharedBossHp() : hp * 10;
      atk *= 3;
      def *= 4;
      size = 38;
      color = '#ef4444'; // Red
      name = type === 'boss bí cảnh' ? `Bí Cảnh Thượng Cổ Ma Thần (BOSS)` : `Xích Quỷ Yêu Vương (BOSS)`;
    }

    // Determine Loot
    const lootList = [
      { itemId: 'linh_chi', name: 'Linh Chi', count: 1, chance: 0.7 },
      { itemId: 'huyen_thiet', name: 'Huyền Thiết', count: 1, chance: 0.6 },
      { itemId: 'yeu_dan', name: 'Yêu Đan', count: 1, chance: 0.4 },
      { itemId: 'da_cuong_hoa', name: 'Đá Cường Hóa', count: 1, chance: 0.3 },
      { itemId: 'random_equip', name: 'Trang Bị Rơi Khác', count: 1, chance: 0.3 }
    ];

    if (type === 'tinh anh') {
      lootList.push({ itemId: 'random_equip_tinh_anh', name: 'Kỳ bảo Tinh Anh', count: 1, chance: 0.35 });
    }

    if (type === 'boss' || type === 'boss bí cảnh') {
      lootList.push(
        { itemId: 'huyen_linh_qua', name: 'Huyền Linh Quả', count: 1, chance: 0.8 },
        { itemId: 'da_tinh_luyen', name: 'Đá Tinh Luyện', count: 1, chance: 0.7 },
        { itemId: 've_bi_canh', name: 'Vé Bí Cảnh', count: 1, chance: 0.5 },
        { itemId: 'truc_co_dan', name: 'Trúc Cơ Đan', count: 1, chance: 0.3 },
        { itemId: 'random_equip_boss', name: 'Thần Binh Boss', count: 1, chance: 1.0 }
      );
    }

    return {
      id: Math.random().toString(),
      name,
      type,
      x: rx,
      y: ry,
      hp,
      maxHp: hp,
      atk: Math.round(atk),
      def: Math.round(def),
      speed: type === 'boss' ? 70 : type === 'tinh anh' ? 100 : 80,
      color,
      size,
      targetX: rx,
      targetY: ry,
      state: 'patrol',
      stateTimer: Math.random() * 3,
      isHit: false,
      hitTimer: 0,
      lootItems: lootList
    };
  };

  const spawnGatherables = () => {
    const list: typeof resources.current = [];
    const herbs = ['linh_chi', 'bang_tam_thao', 'huyet_sam', 'huyen_linh_qua'];
    const ores = ['huyen_thiet', 'tinh_thiet', 'han_bang_thach', 'hoa_diem_thach'];

    for (let i = 0; i < 15; i++) {
      const isHerb = Math.random() > 0.5;
      const itemId = isHerb 
        ? herbs[Math.floor(Math.random() * Math.min(herbs.length, mapConfig.reqRealm + 1))]
        : ores[Math.floor(Math.random() * Math.min(ores.length, mapConfig.reqRealm + 1))];
      const name = isHerb ? 'Linh Thảo dại' : 'Quặng thạch';

      list.push({
        id: Math.random().toString(),
        itemId,
        name,
        x: Math.random() * 1800 + 100,
        y: Math.random() * 1800 + 100,
        size: 10,
        color: isHerb ? '#10b981' : '#f59e0b',
        respawnTimer: 0
      });
    }
    resources.current = list;
  };

  const [otherPlayers, setOtherPlayers] = useState<any[]>([]);
  const [nearbyPlayer, setNearbyPlayer] = useState<any | null>(null);
  const [pkLog, setPkLog] = useState<string | null>(null);
  const [selectedPlayerTarget, setSelectedPlayerTarget] = useState<any | null>(null);
  const portraitCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // 1. Sync self position to firestore/mock database
  useEffect(() => {
    const syncNow = () => {
      const uid = user?.uid || "guest_" + player.name.toLowerCase().replace(/\s+/g, '');
      void savePlayerData(uid, {
        uid,
        name: player.name,
        gender: player.gender,
        realmIndex: player.realmIndex,
        realmLevel: player.realmLevel,
        cultivation: player.cultivation,
        spiritStones: player.spiritStones,
        immortalJade: player.immortalJade,
        stats: player.stats,
        portraitUrl: (player as any).portraitUrl,
        portraitData: (player as any).portraitData,
        portraitSource: (player as any).portraitSource,
        currentMapId: currentMapId,
        x: playerPos.current.x,
        y: playerPos.current.y,
        isOnline: true,
        lastActive: Date.now(),
        currentActivity: 'khám phá'
      }, { syncCloud: false, syncPresence: true });
    };

    syncNow();
    const syncInterval = setInterval(syncNow, 500);

    return () => clearInterval(syncInterval);
  }, [user, currentMapId, player]);

  // 2. Fetch other online players' positions in real-time
  useEffect(() => {
    const unsubscribe = listenAllOnlinePlayers((activePlayers) => {
      const filtered = activePlayers.filter(p => 
        p.uid !== (user?.uid || "guest_" + player.name.toLowerCase().replace(/\s+/g, '')) &&
        (!p.currentMapId || p.currentMapId === currentMapId) &&
        p.isOnline === true &&
        Date.now() - (p.lastActive || 0) < 7 * 60 * 1000 // Active within last 7 minutes
      );
      setOtherPlayers(filtered);
    });

    return () => unsubscribe && unsubscribe();
  }, [currentMapId, user, player]);

  // 3. Periodic check for nearby players within PK distance (< 120 coordinates)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (otherPlayers.length === 0) {
        setNearbyPlayer(null);
        return;
      }
      let closest: any = null;
      let minDist = 120; // range limit
      otherPlayers.forEach(p => {
        const d = Math.sqrt((playerPos.current.x - p.x) * (playerPos.current.x - p.x) + (playerPos.current.y - p.y) * (playerPos.current.y - p.y));
        if (d < minDist) {
          minDist = d;
          closest = p;
        }
      });
      setNearbyPlayer(closest);
    }, 500);

    return () => clearInterval(checkInterval);
  }, [otherPlayers]);

  useEffect(() => {
    if (!nearbyPlayer || !selectedPlayerTarget) return;
    if (nearbyPlayer.uid !== selectedPlayerTarget.uid) {
      setSelectedPlayerTarget(null);
    }
  }, [nearbyPlayer, selectedPlayerTarget]);

  // World Boss shared health loading
  const loadSharedBossHp = () => {
    const key = `shared_boss_hp_${currentMapId}`;
    let hp = localStorage.getItem(key);
    if (!hp) {
      const initialHp = 10000 + (MAPS.find(m => m.id === currentMapId)?.minLevel || 10) * 3000;
      localStorage.setItem(key, initialHp.toString());
      return initialHp;
    }
    return parseInt(hp);
  };

  const damageSharedBoss = (dmg: number) => {
    const key = `shared_boss_hp_${currentMapId}`;
    const cur = loadSharedBossHp();
    const next = Math.max(0, cur - dmg);
    localStorage.setItem(key, next.toString());
    return next;
  };

  const compareCombatPower = (actor: any) => {
    const stats = actor?.stats || {};
    const realmScore = (Number(actor?.realmIndex || 0) * 10 + Number(actor?.realmLevel || 1)) * 120;
    return realmScore + Number(stats.atk || 0) * 6 + Number(stats.def || 0) * 4 + Number(stats.maxHp || 0) + Number(stats.crit || 0) * 12;
  };

  const getStoneTransfer = (target: any, basePercent: number) => {
    const percent = Math.min(0.2, Math.max(0.05, basePercent));
    return Math.max(1, Math.floor(Number(target?.spiritStones || 0) * percent));
  };

  const handlePKDuel = async (other: any) => {
    if (pkCooldown.current > 0) {
      setPkLog(`⏳ Chờ ${Math.ceil(pkCooldown.current)}s nữa để hồi sức PK!`);
      return;
    }
    pkCooldown.current = 10; // 10s cooldown
    playSound('ultimate');
    const ourPower = compareCombatPower(player);
    const otherPower = compareCombatPower(other);

    // Roll with variance
    const ourRoll = ourPower * (0.8 + Math.random() * 0.4);
    const otherRoll = otherPower * (0.8 + Math.random() * 0.4);

    const win = ourRoll >= otherRoll;
    const stolenStones = getStoneTransfer(other, 0.08 + Math.random() * 0.12);

    // Trigger visual sparks
    for (let i = 0; i < 20; i++) {
      particles.current.push({
        x: playerPos.current.x + (Math.random() - 0.5) * 80,
        y: playerPos.current.y + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 150,
        vy: (Math.random() - 0.5) * 150,
        color: win ? '#fde047' : '#ef4444',
        alpha: 1.0,
        life: 0.8,
        maxLife: 0.8,
        size: 5,
        type: 'aura'
      });
    }

    if (win) {
      playSound('success');
      setPlayer(prev => ({
        ...prev,
        spiritStones: prev.spiritStones + stolenStones
      }));
      setPkLog(`⚔️ Ngươi đã chiến thắng quyết đấu với ${other.name}, đoạt lấy +${stolenStones} Linh thạch!`);
      
      const REALMS_SHORT_PK = [
        'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 
        'Hợp Thể', 'Đại Thừa', 'Độ Kiếp', 'Tiên Nhân', 'Kim Tiên', 'Tiên Vương', 'Tiên Tôn', 'Tiên Đế'
      ];
      addMailToInbox({
        type: 'combat',
        title: 'PK thắng lợi',
        content: `Đạo hữu [${player.name}] (${REALMS_SHORT_PK[player.realmIndex]} Tầng ${player.realmLevel}) đã PK thắng [${other.name}], cướp đoạt ${stolenStones} Linh thạch!`,
        eventType: 'pk',
      });
    } else {
      playSound('attack');
      const lostStones = Math.min(player.spiritStones, Math.round(stolenStones * 0.5));
      setPlayer(prev => ({
        ...prev,
        spiritStones: Math.max(0, prev.spiritStones - lostStones)
      }));
      setPkLog(`💀 Thất bại! ${other.name} có đạo pháp thâm hậu hơn, ngươi bị thương nặng và tổn thất -${lostStones} Linh thạch!`);
      
      addMailToInbox({
        type: 'combat',
        title: 'PK thất bại',
        content: `Đạo hữu [${player.name}] đã tỷ thí thất bại dưới tay [${other.name}], tổn thất ${lostStones} Linh thạch!`,
        eventType: 'pk',
      });
    }

    // Auto clear pk log after 4s
    setTimeout(() => setPkLog(null), 4000);
  };

  const handleRobStones = async (other: any) => {
    if (pkCooldown.current > 0) {
      setPkLog(`⏳ Chờ ${Math.ceil(pkCooldown.current)}s nữa để trộm tiếp!`);
      return;
    }
    pkCooldown.current = 10; // 10s cooldown
    playSound('failure'); // sneaky sound or fail sound
    const powerRatio = compareCombatPower(player) / Math.max(1, compareCombatPower(other));
    const robChance = Math.min(0.85, Math.max(0.15, 0.35 + powerRatio * 0.25));
    const roll = Math.random();
    const success = roll < robChance;
    
    const stolenStones = getStoneTransfer(other, 0.05 + Math.random() * 0.15);

    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x: playerPos.current.x + (Math.random() - 0.5) * 60,
        y: playerPos.current.y + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120,
        color: success ? '#4ade80' : '#ef4444', // Green on success, red on fail
        alpha: 1.0,
        life: 0.6,
        maxLife: 0.6,
        size: 4,
        type: 'aura'
      });
    }

    if (success) {
      playSound('success');
      setPlayer(prev => ({
        ...prev,
        spiritStones: prev.spiritStones + stolenStones
      }));
      setPkLog(`🥷 CƯỚP THÀNH CÔNG! Ngươi đã âm thầm móc túi ${other.name}, nẫng đi +${stolenStones} Linh thạch!`);
      
      addMailToInbox({
        type: 'farm',
        title: 'Cướp Linh Thạch thành công',
        content: `Đạo hữu [${player.name}] đã lẻn sau lưng [${other.name}] cướp đoạt ${stolenStones} Linh thạch!`,
        eventType: 'rob_spirit',
      });
    } else {
      playSound('attack');
      const lostStones = Math.min(player.spiritStones, Math.round(stolenStones * 0.7));
      const damageTaken = Math.round(player.stats.maxHp * 0.2); // 20% max HP
      setPlayer(prev => {
        const newHp = Math.max(0, prev.stats.hp - damageTaken);
        
        if (newHp === 0) {
          const lostCult = Math.floor(prev.cultivation * 0.5);
          setTimeout(() => {
            addMailToInbox({
              type: 'combat',
              title: 'Tử nạn khi cướp đạo hữu',
              content: `Ngươi đã tử nạn do ăn đòn vả! Tu vi tổn thất 50% (-${lostCult}).`,
              eventType: 'rob_spirit',
            });
          }, 100);
          return {
            ...prev,
            spiritStones: Math.max(0, prev.spiritStones - lostStones),
            cultivation: Math.max(0, prev.cultivation - lostCult),
            stats: { ...prev.stats, hp: prev.stats.maxHp }
          };
        }

        return {
          ...prev,
          spiritStones: Math.max(0, prev.spiritStones - lostStones),
          stats: { ...prev.stats, hp: newHp }
        };
      });
      setPkLog(`💀 BỊ PHÁT HIỆN! ${other.name} quay lại vả ngươi hộc máu (-${damageTaken} HP) và làm ngươi rơi mất -${lostStones} Linh thạch!`);
      
      addMailToInbox({
        type: 'combat',
        title: 'Cướp Linh Thạch thất bại',
        content: `Đạo hữu [${player.name}] định cướp linh thạch của [${other.name}] nhưng bị vả hộc máu, làm rơi mất ${lostStones} Linh thạch!`,
        eventType: 'rob_spirit',
      });
    }

    // Auto clear pk log after 4s
    setTimeout(() => setPkLog(null), 4000);
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Refs for Game Loop state
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const skillsRef = useRef(skills);
  useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);

  // Main Canvas & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const handleResize = () => {
      const parent = containerRef.current;
      if (parent) {
        const newW = parent.clientWidth;
        const newH = parent.clientHeight || 500;
        if (canvas.width !== newW) canvas.width = newW;
        if (canvas.height !== newH) canvas.height = newH;
      }
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      update(dt);
      render(ctx, canvas);

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
    };
  }, [player, currentMapId]);

  // Update Game Physics
  const update = (dt: number) => {
    const playerState = playerRef.current;
    const speed = playerState.stats.movementSpeed;

    // Calculate movement vector
    let dx = 0;
    let dy = 0;

    // 1. Keyboard Controls
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

    // 2. Joystick Vector (Mobile Override)
    if (joystickActive) {
      dx = joystickVector.current.x;
      dy = joystickVector.current.y;
    }

    if (pkCooldown.current > 0) pkCooldown.current -= dt;

    // Apply Dash
    if (isDashing.current) {
      dashTimer.current -= dt;
      dx = dashVector.current.x * 3.5;
      dy = dashVector.current.y * 3.5;
      if (dashTimer.current <= 0) {
        isDashing.current = false;
      }
    }

    // Normalize diagonal movement
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;

      playerPos.current.x += dx * speed * dt;
      playerPos.current.y += dy * speed * dt;

      // Restrict within map borders
      playerPos.current.x = Math.max(50, Math.min(1950, playerPos.current.x));
      playerPos.current.y = Math.max(50, Math.min(1950, playerPos.current.y));

      // Spawn aura particles when moving
      if (Math.random() < 0.15) {
        particles.current.push({
          x: playerPos.current.x,
          y: playerPos.current.y + 10,
          vx: (Math.random() - 0.5) * 30,
          vy: -Math.random() * 40,
          color: player.gender === 'Nam' ? '#60a5fa' : '#f472b6',
          alpha: 0.6,
          life: 0.5,
          maxLife: 0.5,
          size: 3,
          type: 'aura'
        });
      }
    }

    // Auto-attack timer
    const currentAttackSpeed = player.stats.atkSpeed; // hits per sec
    const attackInterval = 1000 / currentAttackSpeed;
    const now = Date.now();

    // Auto-lock nearest enemy if target dead or far
    findNearestTarget();

    if (currentTarget.current && now - lastAttackTime.current >= attackInterval) {
      const dist = distance(playerPos.current, currentTarget.current);
      if (dist <= 120) {
        triggerBasicAttack(currentTarget.current);
        lastAttackTime.current = now;
      }
    }

    // Update enemies
    enemies.current.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      // Handle hit timers
      if (enemy.isHit) {
        enemy.hitTimer -= dt;
        if (enemy.hitTimer <= 0) enemy.isHit = false;
      }

      // Enemy AI State Machine
      enemy.stateTimer -= dt;
      const distToPlayer = distance(enemy, playerPos.current);

      if (distToPlayer < 250) {
        enemy.state = 'chase';
        enemy.targetX = playerPos.current.x;
        enemy.targetY = playerPos.current.y;
      } else if (enemy.state === 'chase' && distToPlayer >= 350) {
        enemy.state = 'patrol';
        enemy.stateTimer = Math.random() * 3;
      }

      if (enemy.state === 'patrol' && enemy.stateTimer <= 0) {
        enemy.targetX = enemy.x + (Math.random() - 0.5) * 150;
        enemy.targetY = enemy.y + (Math.random() - 0.5) * 150;
        enemy.stateTimer = 1.5 + Math.random() * 2;
      }

      // Move enemy towards target position
      const edx = enemy.targetX - enemy.x;
      const edy = enemy.targetY - enemy.y;
      const elen = Math.sqrt(edx * edx + edy * edy);
      if (elen > 10) {
        enemy.x += (edx / elen) * enemy.speed * dt;
        enemy.y += (edy / elen) * enemy.speed * dt;
      }

      // Enemy attack player
      if (distToPlayer < enemy.size + 15 && Math.random() < 0.02) {
        damagePlayer(enemy);
      }
    });

    // Update resources and check collection
    resources.current.forEach((res) => {
      if (res.respawnTimer > 0) {
        res.respawnTimer -= dt;
        return;
      }

      const dist = distance(playerPos.current, res);
      if (dist < 40) {
        // Collect!
        gatherResource(res);
      }
    });

    // Update active spell visual effects
    activeSpells.current.forEach((spell) => {
      spell.life -= dt;
      spell.radius += (spell.maxRadius - spell.radius) * 12 * dt;
      
      // Damage check for skills
      if (spell.life > 0.1 && spell.life < 0.2) {
        enemies.current.forEach((e) => {
          if (e.hp > 0 && distance(spell, e) <= spell.radius + e.size) {
            damageEnemy(e, spell.damage, false);
          }
        });
      }
    });
    activeSpells.current = activeSpells.current.filter((s) => s.life > 0);

    // Update particles
    particles.current.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    });
    particles.current = particles.current.filter((p) => p.life > 0);
  };

  const findNearestTarget = () => {
    let nearest: ActiveEnemy | null = null;
    let minDist = 300; // max auto-lock radius

    enemies.current.forEach((e) => {
      if (e.hp <= 0) return;
      const d = distance(playerPos.current, e);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    });

    currentTarget.current = nearest;
  };

  // Combat Mechanics
  const triggerBasicAttack = (enemy: ActiveEnemy) => {
    playSound('attack');
    const isCrit = Math.random() * 100 < player.stats.crit;
    let rawDmg = player.stats.atk;
    if (isCrit) rawDmg *= player.stats.critDamage;

    // Apply enemy defense
    const actualDmg = Math.max(1, Math.round(rawDmg - enemy.def * 0.5));

    damageEnemy(enemy, actualDmg, isCrit);

    // Swipe attack visual
    particles.current.push({
      x: enemy.x,
      y: enemy.y,
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      color: '#ffffff',
      alpha: 1,
      life: 0.25,
      maxLife: 0.25,
      size: 10,
      type: 'hit'
    });
  };

  const damageEnemy = (enemy: ActiveEnemy, damage: number, isCrit: boolean) => {
    if (enemy.hp <= 0) return;

    if (enemy.type === 'boss') {
      const nextHp = damageSharedBoss(damage);
      enemy.hp = nextHp;
    } else {
      enemy.hp = Math.max(0, enemy.hp - damage);
    }
    enemy.isHit = true;
    enemy.hitTimer = 0.15;

    // Create damage popup text
    particles.current.push({
      x: enemy.x,
      y: enemy.y - 20,
      vx: (Math.random() - 0.5) * 40,
      vy: -100 - Math.random() * 50,
      color: isCrit ? '#facc15' : '#ef4444', // yellow for crit, red for normal
      alpha: 1.0,
      life: 0.8,
      maxLife: 0.8,
      size: isCrit ? 16 : 12,
      type: 'damage',
      text: `${damage}${isCrit ? ' 暴 Bạo!' : ''}`
    });

    // Handle lifesteal
    if (player.stats.lifesteal > 0) {
      const healAmt = Math.round(damage * (player.stats.lifesteal / 100));
      if (healAmt > 0) {
        setPlayer(prev => {
          const newHp = Math.min(prev.stats.maxHp, prev.stats.hp + healAmt);
          return { ...prev, stats: { ...prev.stats, hp: newHp } };
        });
        particles.current.push({
          x: playerPos.current.x,
          y: playerPos.current.y - 20,
          vx: 0,
          vy: -60,
          color: '#22c55e',
          alpha: 1,
          life: 0.8,
          maxLife: 0.8,
          size: 11,
          type: 'heal',
          text: `+${healAmt} HP (Hút)`
        });
      }
    }

    // Death check
    if (enemy.hp <= 0) {
      triggerLoot(enemy);
      triggerQuestProgress(enemy.type === 'boss' ? 'boss' : enemy.type === 'tinh anh' ? 'elite' : 'normal');
    }
  };

  const damagePlayer = (enemy: ActiveEnemy) => {
    // Evasion check
    const dodge = Math.random() * 100 < player.stats.evasion;
    if (dodge) {
      particles.current.push({
        x: playerPos.current.x,
        y: playerPos.current.y - 25,
        vx: 0,
        vy: -50,
        color: '#3b82f6', // blue
        alpha: 1,
        life: 0.8,
        maxLife: 0.8,
        size: 12,
        type: 'damage',
        text: 'NÉ TRÁNH'
      });
      return;
    }

    // Block check
    const block = Math.random() * 100 < player.stats.block;
    let finalDmg = enemy.atk - player.stats.def * 0.3;
    if (block) {
      finalDmg *= 0.5; // reduce half
      particles.current.push({
        x: playerPos.current.x,
        y: playerPos.current.y - 20,
        vx: 0,
        vy: -50,
        color: '#64748b', // slate
        alpha: 1,
        life: 0.8,
        maxLife: 0.8,
        size: 11,
        type: 'damage',
        text: 'ĐỠ ĐÒN (-50%)'
      });
    }

    finalDmg = Math.max(1, Math.round(finalDmg));

    setPlayer(prev => {
      const newHp = Math.max(0, prev.stats.hp - finalDmg);
      
      // Death handling
      if (newHp === 0 && prev.stats.hp > 0) {
        const lostCult = Math.floor(prev.cultivation * 0.5);
        setTimeout(() => {
          alert(`💀 Ngươi đã tử nạn dưới vuốt quái vật! Tu vi tổn thất 50% (-${lostCult}).`);
        }, 100);
        
        // Reset player pos to center
        playerPos.current = { x: 1000, y: 1000 };
        
        return {
          ...prev,
          cultivation: Math.max(0, prev.cultivation - lostCult),
          stats: { ...prev.stats, hp: prev.stats.maxHp }
        };
      }
      
      return {
        ...prev,
        stats: { ...prev.stats, hp: newHp }
      };
    });

    // Dynamic red damage popup on player
    particles.current.push({
      x: playerPos.current.x,
      y: playerPos.current.y - 15,
      vx: (Math.random() - 0.5) * 30,
      vy: -60,
      color: '#ea580c', // Dark orange
      alpha: 1,
      life: 0.7,
      maxLife: 0.7,
      size: 12,
      type: 'damage',
      text: `-${finalDmg}`
    });
  };

  const triggerLoot = (enemy: ActiveEnemy) => {
    playSound('ping');
    
    // Earn Gold and EXP (Tu vi) based on monster type
    let goldReward = 5 + Math.round(Math.random() * 5);
    let expReward = 15 + Math.round(Math.random() * 15);

    if (enemy.type === 'tinh anh') {
      goldReward = 40 + Math.round(Math.random() * 20);
      expReward = 80 + Math.round(Math.random() * 50);
    } else if (enemy.type === 'boss') {
      goldReward = 200 + Math.round(Math.random() * 100);
      expReward = 1000 + Math.round(Math.random() * 500);
    }

    // Double experience if the player has unique artifacts
    const hasHondonChau = Object.values(player.equippedItems as Record<string, GameItem | null>).some((item) => item?.id === 'hon_don_chau');
    if (hasHondonChau) {
      expReward = Math.round(expReward * 1.5);
    }

    setPlayer(prev => {
      let newCult = prev.cultivation + expReward;
      return {
        ...prev,
        gold: prev.gold + goldReward,
        cultivation: newCult
      };
    });

    // Create Tu vi gain popup
    particles.current.push({
      x: enemy.x,
      y: enemy.y - 40,
      vx: 0,
      vy: -80,
      color: '#06b6d4', // cyan
      alpha: 1,
      life: 1.0,
      maxLife: 1.0,
      size: 13,
      type: 'xp',
      text: `+${expReward} Tu Vi`
    });

    // Roll loot chances
    const dropsCollected: string[] = [];
    enemy.lootItems.forEach((loot) => {
      if (Math.random() < loot.chance) {
        if (loot.itemId.startsWith('random_equip')) {
          // Generate a random equipment
          const slots: import('../types').EquipmentSlot[] = ['weapon', 'head', 'armor', 'boots', 'ring', 'necklace', 'artifact', 'wings'];
          const slot = slots[Math.floor(Math.random() * slots.length)];
          const rarities: import('../types').ItemRarity[] = ['Trắng', 'Lục', 'Lam', 'Tím', 'Cam', 'Đỏ'];
          
          let rarityIdx = 0; // Trắng
          if (loot.itemId === 'random_equip_tinh_anh') {
            rarityIdx = Math.floor(Math.random() * 3) + 1; // Lục, Lam, Tím
          } else if (loot.itemId === 'random_equip_boss') {
            rarityIdx = Math.floor(Math.random() * 3) + 3; // Tím, Cam, Đỏ
          } else {
            rarityIdx = Math.floor(Math.random() * 3); // Trắng, Lục, Lam
          }
          const rarity = rarities[rarityIdx];
          const levelReq = player.realmIndex * 10 + player.realmLevel;
          const equip = createEquipment(Math.random().toString(), `Vật phẩm ${rarity}`, slot, rarity, levelReq);
          
          dropsCollected.push(equip.name);
          setInventory((prev) => normalizeInventoryItems(addInventoryItem(prev, { ...equip, count: 1 } as GameItem, 1)));
          return;
        }

        dropsCollected.push(loot.name);
        setInventory((prevInv) => {
          const existing = prevInv.find((i) => i.id === loot.itemId);
          if (existing) {
            return prevInv.map((i) => i.id === loot.itemId ? { ...i, count: i.count + loot.count } : i);
          } else {
            const template = ITEM_TEMPLATES.consumables.find((i) => i.id === loot.itemId) ||
                             ITEM_TEMPLATES.herbs.find((i) => i.id === loot.itemId) ||
                             ITEM_TEMPLATES.ores.find((i) => i.id === loot.itemId) ||
                             ITEM_TEMPLATES.monster_materials.find((i) => i.id === loot.itemId) ||
                             ITEM_TEMPLATES.enhancement_stones.find((i) => i.id === loot.itemId) ||
                             ITEM_TEMPLATES.keys_tickets.find((i) => i.id === loot.itemId);
            
            if (template) {
              return normalizeInventoryItems(addInventoryItem(prevInv, { ...template, count: loot.count } as GameItem, loot.count));
            }
          }
          return prevInv;
        });
      }
    });

    if (dropsCollected.length > 0) {
      particles.current.push({
        x: enemy.x,
        y: enemy.y,
        vx: 0,
        vy: -30,
        color: '#f59e0b',
        alpha: 1,
        life: 1.2,
        maxLife: 1.2,
        size: 10,
        type: 'xp',
        text: `Nhặt: ${dropsCollected.join(', ')}`
      });
    }

    // Re-spawn this enemy after 15 seconds
    setTimeout(() => {
      enemies.current.push(createEnemy(enemy.type, mapConfig.minLevel));
    }, 15000);

    // Remove the dead enemy from current array
    enemies.current = enemies.current.filter((e) => e.id !== enemy.id);
  };

  const gatherResource = (res: typeof resources.current[0]) => {
    playSound('ping');
    
    setInventory((prevInv) => {
      const existing = prevInv.find((i) => i.id === res.itemId);
      if (existing) {
        return prevInv.map((i) => i.id === res.itemId ? { ...i, count: i.count + 1 } : i);
      } else {
        const template = ITEM_TEMPLATES.herbs.find((i) => i.id === res.itemId) || ITEM_TEMPLATES.ores.find((i) => i.id === res.itemId);
        if (template) {
          return normalizeInventoryItems(addInventoryItem(prevInv, { ...template, count: 1 } as GameItem, 1));
        }
      }
      return prevInv;
    });

    // Floating text feedback
    const itemTemplate = ITEM_TEMPLATES.herbs.find((i) => i.id === res.itemId) || ITEM_TEMPLATES.ores.find((i) => i.id === res.itemId);
    const itemName = itemTemplate ? itemTemplate.name : 'Vật phẩm';

    particles.current.push({
      x: res.x,
      y: res.y - 20,
      vx: 0,
      vy: -60,
      color: '#10b981',
      alpha: 1,
      life: 1.0,
      maxLife: 1.0,
      size: 12,
      type: 'xp',
      text: `Đã hái: +1 ${itemName}`
    });

    // Check quests for resource gathering
    triggerGatherQuestProgress(res.itemId);

    // Set respawn timer
    res.respawnTimer = 20; // 20s to respawn
  };

  // Quest Progression
  const triggerQuestProgress = (type: 'normal' | 'elite' | 'boss') => {
    setActiveQuests(prev => prev.map(q => {
      if (!q.completed && q.targetType === 'kill_monsters') {
        const matches = (type === 'boss' && q.desc.includes('Boss')) || 
                        (type === 'elite' && q.desc.includes('Tinh Anh')) || 
                        (type === 'normal' && !q.desc.includes('Boss') && !q.desc.includes('Tinh Anh'));
        if (matches) {
          const newCount = Math.min(q.targetCount, q.currentCount + 1);
          return { ...q, currentCount: newCount, completed: newCount >= q.targetCount };
        }
      }
      return q;
    }));
  };

  const triggerGatherQuestProgress = (itemId: string) => {
    setActiveQuests(prev => prev.map(q => {
      if (!q.completed && q.targetType === 'collect_resources' && q.targetId === itemId) {
        const newCount = Math.min(q.targetCount, q.currentCount + 1);
        return { ...q, currentCount: newCount, completed: newCount >= q.targetCount };
      }
      return q;
    }));
  };

  // Skill Activations
  const handleCastSkill = (skill: Skill) => {
    if (skill.currentCooldown > 0 || player.stats.mana < skill.manaCost) return;

    const hasVoKy = inventory.some((item) => item.id === 'vo_ky_tuyet_hoc');
    const hasThanPhap = inventory.some((item) => item.id === 'than_phap_cuu_bien');
    const hasTamPhap = inventory.some((item) => item.id === 'bi_thuat_tam_phap');
    const hasTranPhap = inventory.some((item) => item.id === 'tran_phap_dai_cuong');
    const hasCongPhap = inventory.some((item) => item.id === 'cong_phap_vo_kinh');

    // Consume Mana (Reduced cost if has Bi Thuat Tam Phap)
    const finalManaCost = Math.round(skill.manaCost * (hasTamPhap ? 0.7 : 1.0));

    setPlayer(prev => ({
      ...prev,
      stats: { ...prev.stats, hp: prev.stats.hp, mana: Math.max(0, prev.stats.mana - finalManaCost) }
    }));

    // Trigger visual effect and dynamic logic
    const baseMult = skill.damageMultiplier || 1.5;
    const finalDmg = Math.round(player.stats.atk * baseMult * (hasCongPhap ? 1.25 : 1.0));

    if (skill.id === 'thien_hoa_kiem') {
      playSound('skill');
      const fireDmg = Math.round(finalDmg * (hasVoKy ? 1.8 : 1.0));
      activeSpells.current.push({
        id: Math.random().toString(),
        x: playerPos.current.x,
        y: playerPos.current.y,
        radius: 10,
        maxRadius: hasVoKy ? 220 : 150,
        type: 'damage_aoe',
        color: 'rgba(239, 68, 68, 0.4)', // semi-transparent red
        damage: fireDmg,
        life: 0.35
      });
      if (hasVoKy) {
        particles.current.push({
          x: playerPos.current.x,
          y: playerPos.current.y - 30,
          vx: 0, vy: -50,
          color: '#ef4444', alpha: 1, life: 0.8, maxLife: 0.8, size: 10, type: 'heal',
          text: '🔥 HỎA KIẾM HOÀNG KIM (Đã kích hoạt Sổ tay Võ Kỹ x1.8)'
        });
      }
    } else if (skill.id === 'kim_giap_than') {
      playSound('success');
      const extraDef = hasCongPhap ? 65 : 40;
      // Buff defense temporarily
      setPlayer(prev => ({
        ...prev,
        stats: { ...prev.stats, def: prev.stats.def + extraDef }
      }));
      setTimeout(() => {
        setPlayer(prev => ({
          ...prev,
          stats: { ...prev.stats, def: Math.max(10, prev.stats.def - extraDef) }
        }));
      }, 5000);

      particles.current.push({
        x: playerPos.current.x,
        y: playerPos.current.y,
        vx: 0,
        vy: -40,
        color: '#eab308',
        alpha: 1,
        life: 1.0,
        maxLife: 1.0,
        size: 13,
        type: 'heal',
        text: `KIM GIÁP KHÁNG SÁT (+${extraDef} Giáp) ${hasCongPhap ? '👑 Công Pháp Vô Kính' : ''}`
      });
    } else if (skill.id === 'quy_nguyen_quyet') {
      playSound('success');
      const baseHeal = Math.round(player.stats.maxHp * (skill.healMultiplier || 0.25));
      const finalHeal = Math.round(baseHeal * (hasTamPhap ? 1.75 : 1.0));
      setPlayer(prev => ({
        ...prev,
        stats: { ...prev.stats, hp: Math.min(prev.stats.maxHp, prev.stats.hp + finalHeal) }
      }));
      particles.current.push({
        x: playerPos.current.x,
        y: playerPos.current.y - 20,
        vx: 0,
        vy: -70,
        color: '#22c55e',
        alpha: 1,
        life: 0.9,
        maxLife: 0.9,
        size: 14,
        type: 'heal',
        text: `+${finalHeal} HP ${hasTamPhap ? '🌿 Bí thuật Tâm Pháp (x1.75 Trị Liệu)' : '(Chữa Trị)'}`
      });
    } else if (skill.id === 'cuu_thien_phong_bo') {
      playSound('dash');
      // Simple swift dash
      isDashing.current = true;
      dashTimer.current = hasThanPhap ? 0.5 : 0.25;
      
      // Get facing vector or simple keyboard input direction
      let vx = 0; let vy = -1;
      if (keysPressed.current['w']) { vx = 0; vy = -1; }
      if (keysPressed.current['s']) { vx = 0; vy = 1; }
      if (keysPressed.current['a']) { vx = -1; vy = 0; }
      if (keysPressed.current['d']) { vx = 1; vy = 0; }
      dashVector.current = { x: vx, y: vy };

      if (hasThanPhap) {
        particles.current.push({
          x: playerPos.current.x, y: playerPos.current.y - 15,
          vx: 0, vy: -40,
          color: '#22d3ee', alpha: 1, life: 0.7, maxLife: 0.7, size: 9, type: 'heal',
          text: '⚡ LĂNG BA VI BỘ (Đã kích hoạt Thân Pháp Cửu Biến)'
        });
      }
    } else if (skill.id === 'tru_tien_tran_phap') {
      playSound('ultimate');
      const ultDmg = Math.round(finalDmg * (hasTranPhap ? 2.5 : 1.0));
      // Mega aoe explosion
      activeSpells.current.push({
        id: Math.random().toString(),
        x: playerPos.current.x,
        y: playerPos.current.y,
        radius: 20,
        maxRadius: hasTranPhap ? 460 : 300,
        type: 'ultimate_aoe',
        color: 'rgba(168, 85, 247, 0.45)', // deep violet
        damage: ultDmg,
        life: 0.6
      });

      if (hasTranPhap) {
        particles.current.push({
          x: playerPos.current.x, y: playerPos.current.y - 35,
          vx: 0, vy: -55,
          color: '#a855f7', alpha: 1, life: 1.1, maxLife: 1.1, size: 11, type: 'heal',
          text: '🌌 TRẬN PHÁP CHUNG CỰC (Đã kích hoạt Trận Pháp Đại Cương x2.5)'
        });
      }
    }

    // Set cooldown
    setSkills(prev => prev.map(s => {
      if (s.id === skill.id) {
        return { ...s, currentCooldown: s.cooldown };
      }
      return s;
    }));

    // Trigger tick countdown
    const cdTick = setInterval(() => {
      setSkills(prev => prev.map(s => {
        if (s.id === skill.id) {
          const nextCd = Math.max(0, s.currentCooldown - 1);
          if (nextCd <= 0) clearInterval(cdTick);
          return { ...s, currentCooldown: nextCd };
        }
        return s;
      }));
    }, 1000);
  };

  // Render HTML5 Canvas
  const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Coordinate offsets (camera centers around player)
    const cx = canvas.width / 2 - playerPos.current.x;
    const cy = canvas.height / 2 - playerPos.current.y;

    // Draw Map background & ground grid lines
    ctx.fillStyle = mapConfig.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = mapConfig.border + '22'; // low opacity grid lines
    ctx.lineWidth = 1;
    const gridSize = 100;
    const mapWidth = 2000;
    const mapHeight = 2000;

    // Draw grid
    const startX = Math.max(0, playerPos.current.x - canvas.width / 2);
    const endX = Math.min(mapWidth, playerPos.current.x + canvas.width / 2);
    const startY = Math.max(0, playerPos.current.y - canvas.height / 2);
    const endY = Math.min(mapHeight, playerPos.current.y + canvas.height / 2);

    for (let x = Math.floor(startX / gridSize) * gridSize; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + cx, startY + cy);
      ctx.lineTo(x + cx, endY + cy);
      ctx.stroke();
    }
    for (let y = Math.floor(startY / gridSize) * gridSize; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX + cx, y + cy);
      ctx.lineTo(endX + cx, y + cy);
      ctx.stroke();
    }

    // Draw Map Boundary Limits
    ctx.strokeStyle = mapConfig.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(cx, cy, mapWidth, mapHeight);

    // Draw Map Decorations
    mapDecorations.current.forEach((dec) => {
      const rx = dec.x + cx;
      const ry = dec.y + cy;
      if (rx < -50 || rx > canvas.width + 50 || ry < -50 || ry > canvas.height + 50) return;

      if (dec.type === 'tree') {
        // Draw green stylized geometric trees
        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.moveTo(rx, ry - dec.size);
        ctx.lineTo(rx - dec.size * 0.6, ry + dec.size * 0.4);
        ctx.lineTo(rx + dec.size * 0.6, ry + dec.size * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#115e59';
        ctx.fillRect(rx - 3, ry + dec.size * 0.4, 6, dec.size * 0.3);
      } else if (dec.type === 'rock') {
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.arc(rx, ry, dec.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.arc(rx - 3, ry - 3, dec.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ruins / Stone pillar
        ctx.fillStyle = '#78716c';
        ctx.fillRect(rx - dec.size * 0.3, ry - dec.size * 0.8, dec.size * 0.6, dec.size * 1.6);
        ctx.fillStyle = '#a8a29e';
        ctx.strokeRect(rx - dec.size * 0.3, ry - dec.size * 0.8, dec.size * 0.6, dec.size * 1.6);
      }
    });

    // Draw gathering resources
    resources.current.forEach((res) => {
      if (res.respawnTimer > 0) return;

      const rx = res.x + cx;
      const ry = res.y + cy;
      if (rx < -20 || rx > canvas.width + 20 || ry < -20 || ry > canvas.height + 20) return;

      // Outer shining aura
      ctx.fillStyle = res.color + '44';
      ctx.beginPath();
      ctx.arc(rx, ry, res.size * 1.8 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = res.color;
      ctx.beginPath();
      ctx.arc(rx, ry, res.size, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic sparkles
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx + Math.cos(Date.now() / 300) * 8, ry + Math.sin(Date.now() / 300) * 8, 2, 2);
    });

    // Draw active spells/AOEs
    activeSpells.current.forEach((spell) => {
      ctx.fillStyle = spell.color;
      ctx.beginPath();
      ctx.arc(spell.x + cx, spell.y + cy, spell.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw enemies
    enemies.current.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      const ex = enemy.x + cx;
      const ey = enemy.y + cy;
      if (ex < -50 || ex > canvas.width + 50 || ey < -50 || ey > canvas.height + 50) return;

      // Draw red crosshair over locked target
      if (currentTarget.current && currentTarget.current.id === enemy.id) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ex, ey, enemy.size * 1.7, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(ex - 2, ey - enemy.size * 1.9, 4, 6);
        ctx.fillRect(ex - 2, ey + enemy.size * 1.5, 4, 6);
      }

      // Draw enemy sprite base (highly polished geometric form)
      ctx.fillStyle = enemy.isHit ? '#ffffff' : enemy.color;
      ctx.beginPath();
      ctx.arc(ex, ey, enemy.size, 0, Math.PI * 2);
      ctx.fill();

      // Draw stylized demonic eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex - enemy.size * 0.4, ey - enemy.size * 0.2, 4, 3);
      ctx.fillRect(ex + enemy.size * 0.2, ey - enemy.size * 0.2, 4, 3);

      // HP Bar above head
      const hpPercent = enemy.hp / enemy.maxHp;
      const barW = enemy.size * 2;
      const barH = 4;
      ctx.fillStyle = '#ef444455';
      ctx.fillRect(ex - barW / 2, ey - enemy.size - 12, barW, barH);
      ctx.fillStyle = enemy.type === 'boss' ? '#a855f7' : '#ef4444';
      ctx.fillRect(ex - barW / 2, ey - enemy.size - 12, barW * hpPercent, barH);

      // Label below bar
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name, Math.round(ex), Math.round(ey - enemy.size - 16));
    });

    // Draw Player
    const px = playerPos.current.x + cx;
    const py = playerPos.current.y + cy;

    // Draw range ring of attack lock
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 120, 0, Math.PI * 2);
    ctx.stroke();

    // Visual glowing aura based on cultivation state
    const auraPulse = 20 + Math.sin(Date.now() / 150) * 4;
    const genderColor = player.gender === 'Nam' ? 'rgba(96, 165, 250, 0.25)' : 'rgba(244, 114, 182, 0.25)';
    ctx.fillStyle = genderColor;
    ctx.beginPath();
    ctx.arc(px, py, auraPulse, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = player.gender === 'Nam' ? '#2563eb' : '#db2777';
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();

    // Core Center Hair/Face style
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(px, py - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Floating name & Realm title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${player.name}`, Math.round(px), Math.round(py - 26));

    ctx.fillStyle = '#67e8f9';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${MAPS.find(m=>m.id===currentMapId)?.name || 'Dã Ngoại'}`, Math.round(px), Math.round(py - 38));

    // Floating HP Bar
    const playerHpPct = player.stats.hp / player.stats.maxHp;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(px - 20, py + 18, 40, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(px - 20, py + 18, 40 * playerHpPct, 4);

    // Draw Other Online Players
    otherPlayers.forEach((op) => {
      const opX = op.x + cx;
      const opY = op.y + cy;
      if (opX < -50 || opX > canvas.width + 50 || opY < -50 || opY > canvas.height + 50) return;

      // Pulse aura
      const opPulse = 18 + Math.sin(Date.now() / 150) * 3;
      const opGenderColor = op.gender === 'Nam' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(244, 114, 182, 0.2)';
      ctx.fillStyle = opGenderColor;
      ctx.beginPath();
      ctx.arc(opX, opY, opPulse, 0, Math.PI * 2);
      ctx.fill();

      // Avatar / Body
      if (!drawPortrait(ctx, (op as any).portraitData || (op as any).portraitUrl, opX, opY, 13)) {
        ctx.fillStyle = op.gender === 'Nam' ? '#0284c7' : '#be185d';
        ctx.beginPath();
        ctx.arc(opX, opY, 13, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(opX, opY - 4, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Name & Level labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      const REALMS_SHORT_PK = [
        'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 
        'Hợp Thể', 'Đại Thừa', 'Độ Kiếp', 'Tiên Nhân', 'Kim Tiên', 'Tiên Vương', 'Tiên Tôn', 'Tiên Đế'
      ];
      const opRealmName = REALMS_SHORT_PK[op.realmIndex || 0] || 'Phàm Nhân';
      ctx.fillText(`${op.name}`, Math.round(opX), Math.round(opY - 24));
      
      ctx.fillStyle = '#38bdf8';
      ctx.font = '9px sans-serif';
      ctx.fillText(`${opRealmName} (${op.realmLevel || 1})`, Math.round(opX), Math.round(opY - 14));

      // Simple active circle under target if they are close
      if (nearbyPlayer && nearbyPlayer.uid === op.uid) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.arc(opX, opY, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw Active Particles
    particles.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.text) {
        ctx.font = `bold ${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, Math.round(p.x + cx), Math.round(p.y + cy));
      } else {
        ctx.beginPath();
        ctx.arc(Math.round(p.x + cx), Math.round(p.y + cy), p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };

  // Distance calculator
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  };

  const drawPortrait = (ctx2d: CanvasRenderingContext2D, src: string | null | undefined, x: number, y: number, size: number) => {
    if (!src) return false;
    try {
      let cached = portraitCacheRef.current.get(src);
      if (!cached) {
        cached = new Image();
        cached.crossOrigin = 'anonymous';
        cached.src = src;
        portraitCacheRef.current.set(src, cached);
      }
      if (!cached.complete || cached.naturalWidth === 0) return false;

      ctx2d.save();
      ctx2d.beginPath();
      ctx2d.arc(x, y, size, 0, Math.PI * 2);
      ctx2d.closePath();
      ctx2d.clip();
      ctx2d.drawImage(cached, x - size, y - size, size * 2, size * 2);
      ctx2d.restore();
      return true;
    } catch {
      return false;
    }
  };

  // Joystick handlers for mobile touch
  const handleTouchStart = (e: React.TouchEvent) => {
    showMobileControls();

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const tx = touch.clientX - rect.left;
    const ty = touch.clientY - rect.top;

    // chỉ kích hoạt ở vùng dưới để tránh đè lên gameplay
    if (ty > rect.height * 0.45) {
      setJoystickActive(true);
      setJoystickStart({ x: tx, y: ty });
      setJoystickPos({ x: tx, y: ty });
      joystickVector.current = { x: 0, y: 0 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickActive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const tx = touch.clientX - rect.left;
    const ty = touch.clientY - rect.top;

    const dx = tx - joystickStart.x;
    const dy = ty - joystickStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45;

    if (dist < 1) {
      joystickVector.current = { x: 0, y: 0 };
      return;
    }

    const scale = Math.min(1, dist / maxRadius);
    joystickVector.current = {
      x: (dx / dist) * scale,
      y: (dy / dist) * scale,
    };

    const clamped = Math.min(dist, maxRadius);
    setJoystickPos({
      x: joystickStart.x + (dx / dist) * clamped,
      y: joystickStart.y + (dy / dist) * clamped,
    });

    showMobileControls();
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    joystickVector.current = { x: 0, y: 0 };
    showMobileControls();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cx = canvas.width / 2 - playerPos.current.x;
    const cy = canvas.height / 2 - playerPos.current.y;

    const candidates = otherPlayers.filter((op) => typeof op?.x === 'number' && typeof op?.y === 'number');
    let closest: any | null = null;
    let minDist = 24;

    candidates.forEach((op) => {
      const opX = op.x + cx;
      const opY = op.y + cy;
      const d = Math.hypot(clickX - opX, clickY - opY);
      if (d < minDist) {
        minDist = d;
        closest = op;
      }
    });

    setSelectedPlayerTarget(closest);
  };

  return (
    <div className="flex flex-col h-full select-none" id="game_canvas_wrapper">
      {/* HUD Info bar */}
      <div
        className={`bg-stone-900 border-t border-stone-800 p-2 flex flex-col gap-2 transition-all duration-200 ${
          mobileControlsVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
        id="skill_hotbar_container"
      >
        <span className="flex items-center gap-1">
          <Crosshair size={12} className="text-red-400 animate-pulse" /> Mục
          tiêu:{" "}
          <b className="text-white">
            {currentTarget.current ? currentTarget.current.name : "Chưa có"}
          </b>
        </span>
        <span className="text-stone-400 font-mono">
          Bản đồ: <b className="text-cyan-400 font-sans">{mapConfig.name}</b>{" "}
          (Lvl {mapConfig.minLevel}+)
        </span>
      </div>

      {/* Main Canvas view area */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black overflow-hidden active:cursor-grabbing touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={showMobileControls}
        onClick={handleCanvasClick}
        id="canvas_screen_host"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block w-full h-full"
        />

        {/* Nearby player info / selection */}
        {nearbyPlayer && !selectedPlayerTarget && (
          <button
            onClick={() => setSelectedPlayerTarget(nearbyPlayer)}
            className="absolute top-14 left-1/2 -translate-x-1/2 bg-stone-950/90 border border-red-500/50 px-3 py-2 rounded-lg flex items-center gap-3 z-50 shadow-lg animate-pulse text-left"
            id="nearby_pk_panel"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-red-400 flex items-center gap-1">
                <Swords size={12} className="text-red-500" /> PHÁT HIỆN ĐẠO HỮU
                PHƯƠNG XA
              </span>
              <span className="text-[9px] text-stone-300">
                Chạm vào nhân vật hoặc bấm để xem sơ lược
              </span>
            </div>
          </button>
        )}

        {selectedPlayerTarget && (
          <div
            className="absolute top-14 left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/40 px-4 py-3 rounded-xl z-50 shadow-xl min-w-[260px]"
            id="player_summary_panel"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-700 overflow-hidden flex items-center justify-center shrink-0">
                {(selectedPlayerTarget as any).portraitData || (selectedPlayerTarget as any).portraitUrl ? (
                  <img
                    src={(selectedPlayerTarget as any).portraitData || (selectedPlayerTarget as any).portraitUrl}
                    alt={selectedPlayerTarget.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">🧑‍🎨</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-amber-400">{selectedPlayerTarget.name}</p>
                    <p className="text-[10px] text-stone-400">
                      {MAPS[selectedPlayerTarget.realmIndex || 0]?.name || 'Tu sĩ'} - Tầng {selectedPlayerTarget.realmLevel || 1}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPlayerTarget(null)}
                    className="text-[10px] text-stone-500 hover:text-stone-300"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Tu vi: {Number(selectedPlayerTarget.cultivation || 0).toLocaleString()} | Linh thạch: {Number(selectedPlayerTarget.spiritStones || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-stone-500">
                  Hoạt động: {selectedPlayerTarget.currentActivity || 'nhàn rỗi'}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handlePKDuel(selectedPlayerTarget)}
                    className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-stone-950 font-black text-[9px] rounded active:scale-95 transition-all shadow-md cursor-pointer"
                  >
                    PK DUEL
                  </button>
                  <button
                    onClick={() => handleRobStones(selectedPlayerTarget)}
                    className="flex-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[9px] rounded active:scale-95 transition-all shadow-md cursor-pointer"
                  >
                    CƯỚP LT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PK Battle logs display */}
        {pkLog && (
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-950/95 border-2 border-amber-500 px-5 py-4 rounded-xl shadow-2xl z-50 max-w-[85%] text-center animate-bounce"
            id="pk_log_modal"
          >
            <h4 className="text-amber-400 font-bold text-xs tracking-widest mb-1.5 flex items-center justify-center gap-1 uppercase">
              ⚔️ LINH KIẾP TRANH HÙNG ⚔️
            </h4>
            <p className="text-[11px] text-stone-200 font-medium leading-relaxed font-sans">
              {pkLog}
            </p>
          </div>
        )}

        {/* Floating Virtual Joystick Ring when active */}
        {joystickActive && (
          <div
            className="absolute rounded-full border border-white/20 bg-black/40 pointer-events-none flex items-center justify-center"
            style={{
              left: joystickStart.x - 50,
              top: joystickStart.y - 50,
              width: 100,
              height: 100,
              zIndex: 60,
            }}
            id="mobile_joystick_ring"
          >
            <div
              className="absolute rounded-full bg-cyan-500 shadow-md shadow-cyan-500/50"
              style={{
                left: joystickPos.x - joystickStart.x + 35,
                top: joystickPos.y - joystickStart.y + 35,
                width: 30,
                height: 30,
              }}
              id="mobile_joystick_knob"
            />
          </div>
        )}
      </div>

      {/* Skill casting Hotbar at bottom */}
      <div
        className="bg-stone-900 border-t border-stone-800 p-2 flex flex-col gap-2"
        id="skill_hotbar_container"
      >
        <div
          className="flex items-center justify-between text-[11px] px-1"
          id="hotbar_header"
        >
          <span className="text-cyan-400 font-mono flex items-center gap-1">
            <Zap size={11} /> Linh lực: {Math.round(player.stats.mana)} /{" "}
            {player.stats.maxMana}
          </span>
          <span className="text-stone-400 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400 animate-spin-slow" />{" "}
            Chạm kỹ năng để thi triển:
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5" id="skill_buttons_grid">
          {skills.map((skill) => {
            const hasMana = player.stats.mana >= skill.manaCost;
            return (
              <button
                key={skill.id}
                id={`btn_skill_${skill.id}`}
                disabled={
                  !skill.unlocked || skill.currentCooldown > 0 || !hasMana
                }
                onClick={() => handleCastSkill(skill)}
                className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded border transition-all ${
                  skill.unlocked
                    ? skill.currentCooldown > 0
                      ? "bg-stone-950 border-stone-800 text-stone-600 cursor-not-allowed"
                      : !hasMana
                        ? "bg-red-950/20 border-red-900/30 text-stone-500 cursor-not-allowed"
                        : "bg-stone-800 hover:bg-stone-700 active:scale-95 border-stone-700 text-stone-100 hover:border-cyan-500/50"
                    : "bg-stone-950 border-stone-900 text-stone-700 cursor-not-allowed"
                }`}
              >
                {/* Visual Icon replacement based on skill branch */}
                <div className="mb-0.5" id={`icon_skill_${skill.id}`}>
                  {skill.branch === "sát thương" && (
                    <Flame
                      size={16}
                      className={
                        skill.unlocked && skill.currentCooldown === 0 && hasMana
                          ? "text-red-400"
                          : "text-stone-600"
                      }
                    />
                  )}
                  {skill.branch === "phòng thủ" && (
                    <Shield
                      size={16}
                      className={
                        skill.unlocked && skill.currentCooldown === 0 && hasMana
                          ? "text-yellow-400"
                          : "text-stone-600"
                      }
                    />
                  )}
                  {skill.branch === "hồi phục" && (
                    <Heart
                      size={16}
                      className={
                        skill.unlocked && skill.currentCooldown === 0 && hasMana
                          ? "text-green-400"
                          : "text-stone-600"
                      }
                    />
                  )}
                  {skill.branch === "di chuyển" && (
                    <Zap
                      size={16}
                      className={
                        skill.unlocked && skill.currentCooldown === 0 && hasMana
                          ? "text-cyan-400 animate-pulse"
                          : "text-stone-600"
                      }
                    />
                  )}
                </div>

                <span className="text-[9px] font-medium truncate w-full text-center">
                  {skill.name.split(" ")[0]}
                </span>

                {/* Cooldown overlay */}
                {skill.unlocked && skill.currentCooldown > 0 && (
                  <div
                    className="absolute inset-0 bg-black/80 flex items-center justify-center font-mono text-sm font-bold text-cyan-400 rounded"
                    id={`cd_overlay_${skill.id}`}
                  >
                    {skill.currentCooldown}s
                  </div>
                )}

                {/* Locked overlay */}
                {!skill.unlocked && (
                  <div
                    className="absolute inset-0 bg-stone-950/90 flex items-center justify-center text-[8px] text-stone-500 rounded font-medium font-mono text-center px-0.5"
                    id={`lock_overlay_${skill.id}`}
                  >
                    KHÓA
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
