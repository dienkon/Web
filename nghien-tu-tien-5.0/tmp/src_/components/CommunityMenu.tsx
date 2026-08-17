import React, { useEffect, useState, useRef } from "react";
import { PlayerCharacter, GameItem, MailMessage } from "../types";
import { playSound, REALMS } from "../utils/gameData";
import {
  Trophy,
  Users,
  Sword,
  Hand,
  Heart,
  Mail,
  Gem,
  Clock3,
} from "lucide-react";
import {
  listenAllPlayers,
  addMailToInbox,
  savePlayerData,
  db,
} from "../lib/firebase";
import { doc, updateDoc,increment,
  arrayUnion, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";



const ONLINE_TIMEOUT_MS = 2 * 60 * 1000;
const COOLDOWN_STORAGE_PREFIX = "community_menu_cooldowns";

const getCultivationRealm = (player: any) => {
  if (!player) return "Chưa rõ";

  const realmName = REALMS[player.realmIndex] || "Vô Danh";
  const realmLevel = Number(player.realmLevel ?? 1);

  if (realmLevel >= 10) {
    return `${realmName} Đỉnh Phong`;
  }

  return `${realmName} Tầng ${realmLevel}`;
};

const isPlayerOnline = (player: any) => {
  const activity = String(
    player?.presence?.currentActivity || player?.currentActivity || "offline",
  ).toLowerCase();

  return activity !== "offline";
};

const safeMailId = () =>
  `mail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const pushMail = (
  payload: Partial<MailMessage> & {
    type: MailMessage["type"];
    title: string;
    content: string;
    recipientUid?: string;
    toUid?: string;
    targetUid?: string;
    fromUid?: string;
    fromName?: string;
    audience?: "self" | "target";
  },
) => {
  addMailToInbox(
    {
      id: safeMailId(),
      read: false,
      createdAt: Date.now(),
      ...payload,
    } as MailMessage,

    payload.recipientUid,
  );
};

const notifyBoth = (
  selfPlayer: any,
  target: any,
  selfPayload: { type: MailMessage["type"]; title: string; content: string },
  targetPayload: { type: MailMessage["type"]; title: string; content: string },
  mirrorTarget = false,
  saveMail = true,
) => {
  const selfUid = String(selfPlayer?.uid || "");
  const targetUid = String(target?.uid || "");
  const fromName = String(selfPlayer?.name || "Ẩn danh");

  alert(selfPayload.content);

  if (saveMail) {
    pushMail({
      ...selfPayload,
      fromUid: selfUid,
      fromName,
      recipientUid: selfUid,
      toUid: selfUid,
      targetUid,
      audience: "self",
    });
  }

  if (saveMail && mirrorTarget && targetUid && targetUid !== selfUid) {
    pushMail({
      ...targetPayload,
      fromUid: selfUid,
      fromName,
      recipientUid: targetUid,
      toUid: targetUid,
      targetUid,
      audience: "target",
    });
  }
};

interface CommunityMenuProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
}

type TabKey = "leaderboard" | "friends" | "mail";

type BoardKey = "cultivation" | "battle" | "wealth" | "jade" | "online";

export default function CommunityMenu({
  player,
  setPlayer,
  inventory,
  setInventory,
}: CommunityMenuProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("leaderboard");
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [lastActionTime, setLastActionTime] = useState<number>(0);

  const [cultivationLimit, setCultivationLimit] = useState(10);
  const [battleLimit, setBattleLimit] = useState(10);
  const [wealthLimit, setWealthLimit] = useState(10);
  const [jadeLimit, setJadeLimit] = useState(10);
  const [onlineLimit, setOnlineLimit] = useState(10);
  const [friendLimit, setFriendLimit] = useState(10);

  // ===== Cooldown riêng cho từng hành động =====
  const actionCooldownRef = useRef({
    rob: 0,
    dual: 0,
    pk: 0,
  });

  const cooldownStorageKey = (action: "rob" | "dual" | "pk") =>
    `${COOLDOWN_STORAGE_PREFIX}:${String(player?.uid || "guest")}:${action}`;

  const loadCooldowns = () => {
    if (typeof window === "undefined") return;
    try {
      const loaded = {
        rob: Number(localStorage.getItem(cooldownStorageKey("rob")) || 0),
        dual: Number(localStorage.getItem(cooldownStorageKey("dual")) || 0),
        pk: Number(localStorage.getItem(cooldownStorageKey("pk")) || 0),
      };

      actionCooldownRef.current = loaded;
    } catch {
      // ignore storage issues
    }
  };

  const saveCooldown = (action: "rob" | "dual" | "pk", timestamp: number) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(cooldownStorageKey(action), String(timestamp));
    } catch {
      // ignore storage issues
    }
  };

  const processedCombatEventsKey = () =>
    `${COOLDOWN_STORAGE_PREFIX}:${String(player?.uid || "guest")}:combat_processed`;

  const readProcessedCombatEvents = () => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const raw = localStorage.getItem(processedCombatEventsKey());
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(parsed.filter((id) => typeof id === "string"));
    } catch {
      return new Set<string>();
    }
  };

  const writeProcessedCombatEvents = (ids: Set<string>) => {
    if (typeof window === "undefined") return;
    try {
      const compact = Array.from(ids).slice(-200);
      localStorage.setItem(processedCombatEventsKey(), JSON.stringify(compact));
    } catch {
      // ignore storage issues
    }
  };

  const buildCombatState = (
    prev: any,
    opts: {
      hpDelta?: number;
      cultivationDelta?: number;
      spiritStonesDelta?: number;
      manaDelta?: number;
      isDeadPenaltyCultLossRate?: number;
      isDeadPenaltyStoneLossRate?: number;
    },
  ) => {
    const next = prev || {};
    const nextStats = { ...(next.stats || {}) };

    const maxHp = Math.max(1, num(nextStats.maxHp));
    const maxMana = Math.max(1, num(nextStats.maxMana));

    if (typeof opts.hpDelta === "number") {
      nextStats.hp = clamp(num(nextStats.hp) + opts.hpDelta, 0, maxHp);
    }
    if (typeof opts.manaDelta === "number") {
      nextStats.mana = clamp(num(nextStats.mana) + opts.manaDelta, 0, maxMana);
    }

    const baseCultivation = Math.max(
      0,
      num(next.cultivation) + (opts.cultivationDelta || 0),
    );
    const baseSpiritStones = Math.max(
      0,
      num(next.spiritStones) + (opts.spiritStonesDelta || 0),
    );
    const nextDead = nextStats.hp <= 0;

    return {
      ...next,
      cultivation: nextDead
        ? Math.floor(
            baseCultivation * (1 - (opts.isDeadPenaltyCultLossRate ?? 0.4)),
          )
        : baseCultivation,
      spiritStones: nextDead
        ? Math.max(
            0,
            Math.floor(
              baseSpiritStones *
                (1 - (opts.isDeadPenaltyStoneLossRate ?? 0.05)),
            ),
          )
        : baseSpiritStones,
      stats: nextDead
        ? {
            ...nextStats,
            hp: maxHp,
            mana: maxMana,
          }
        : nextStats,
      isDead: false,
    };
  };

  const mergeRemotePatch = (base: any, patch?: Record<string, any>) => {
    if (!patch || typeof patch !== "object") return base;
    const next = { ...(base || {}) };

    for (const [key, value] of Object.entries(patch)) {
      if (key === "stats" && value && typeof value === "object") {
        next.stats = {
          ...(next.stats || {}),
          ...(value as Record<string, any>),
        };
        continue;
      }

      if (Array.isArray(value)) {
        next[key] = [...value];
        continue;
      }

      if (value && typeof value === "object") {
        next[key] = { ...(next[key] || {}), ...(value as Record<string, any>) };
        continue;
      }

      next[key] = value;
    }

    return next;
  };

 const stripUndefinedDeep = (value: any): any => {
   if (value === undefined) return undefined;

   if (Array.isArray(value)) {
     return value.map(stripUndefinedDeep).filter((item) => item !== undefined);
   }

   if (value && typeof value === "object") {
     const out: Record<string, any> = {};
     for (const [key, val] of Object.entries(value)) {
       const cleaned = stripUndefinedDeep(val);
       if (cleaned !== undefined) out[key] = cleaned;
     }
     return out;
   }

   return value;
 };

 const queueCombatEvent = async (
   target: any,
   opts: {
     hpDelta?: number;
     cultivationDelta?: number;
     spiritStonesDelta?: number;
     manaDelta?: number;
     isDeadPenaltyCultLossRate?: number;
     isDeadPenaltyStoneLossRate?: number;
     selfPayload?: {
       type: MailMessage["type"];
       title: string;
       content: string;
     };
     targetPayload?: {
       type: MailMessage["type"];
       title: string;
       content: string;
     };
     kind?: string;
     fieldPatch?: Record<string, any>;
   },
 ) => {
   const senderUid = getAuth().currentUser?.uid ?? "";
   const targetUid = String(target?.uid || "");

   console.log("UIDs:", senderUid, targetUid);

   if (!senderUid || !targetUid) {
     console.log("RETURN NULL");
     return null;
   }

   const defaultSelfPayload = opts.selfPayload || {
     type: "combat" as const,
     title: "Chiến đấu",
     content: "Bạn vừa tạo một hiệu ứng chiến đấu.",
   };

   const defaultTargetPayload = opts.targetPayload || {
     type: "combat" as const,
     title: "Bị tác động",
     content: `Bạn vừa nhận một hiệu ứng chiến đấu từ [${String(
       player?.name || "Ẩn danh",
     )}].`,
   };

   const event = {
     id: `combat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
     kind: opts.kind || "combat",
     fromUid: senderUid,
     fromName: String(player?.name || "Ẩn danh"),
     targetUid,
     createdAt: Date.now(),
     hpDelta: opts.hpDelta ?? 0,
     cultivationDelta: opts.cultivationDelta ?? 0,
     spiritStonesDelta: opts.spiritStonesDelta ?? 0,
     manaDelta: opts.manaDelta ?? 0,
     isDeadPenaltyCultLossRate: opts.isDeadPenaltyCultLossRate ?? null,
     isDeadPenaltyStoneLossRate: opts.isDeadPenaltyStoneLossRate ?? null,
     selfPayload: defaultSelfPayload,
     targetPayload: defaultTargetPayload,
   };

   let updatedTarget: any;

   try {
     updatedTarget = mergeRemotePatch(
       buildCombatState(target, {
         hpDelta: opts.hpDelta ?? 0,
         cultivationDelta: opts.cultivationDelta ?? 0,
         spiritStonesDelta: opts.spiritStonesDelta ?? 0,
         manaDelta: opts.manaDelta ?? 0,
         isDeadPenaltyCultLossRate: opts.isDeadPenaltyCultLossRate ?? 0,
         isDeadPenaltyStoneLossRate: opts.isDeadPenaltyStoneLossRate ?? 0,
       }),
       opts.fieldPatch,
     );

     updatedTarget.combatEvents = [
       ...(Array.isArray(target?.combatEvents)
         ? target.combatEvents
         : []
       ).slice(-24),
       event,
     ];

     console.log("merge OK");
     console.log("combatEvents OK");
   } catch (e) {
     console.error("LỖI TRƯỚC TRY UPDATE:", e);
     return null;
   }

   try {
     const playerRef = doc(db, "players", targetUid);
     console.log("Updating:", playerRef.path);

     const rawData = {
       // nested player.*
       "player.spiritStones": updatedTarget.spiritStones,
       "player.cultivation": updatedTarget.cultivation,
       "player.stats": updatedTarget.stats,
       "player.combatEvents": updatedTarget.combatEvents,
       "player.isDead": updatedTarget.isDead,

       // top-level mirror
       spiritStones: updatedTarget.spiritStones,
       cultivation: updatedTarget.cultivation,
       stats: updatedTarget.stats,
       combatEvents: updatedTarget.combatEvents,
       isDead: updatedTarget.isDead,

       lastCombatFrom: senderUid,
       lastCombatAt: Date.now(),
     };

     const data = stripUndefinedDeep(rawData);

     for (const [k, v] of Object.entries(rawData)) {
       if (v === undefined) console.error("UNDEFINED FIELD =>", k);
     }

     console.log("DATA TO UPDATE:", data);

     await updateDoc(playerRef, data);
     const snap = await getDoc(playerRef);
     console.log("Firestore says:", snap.data()?.spiritStones);

     console.log("Update success");
   } catch (e) {
     console.error("UPDATE FAIL");
     console.error(e);
   }

   return event;
 };

  const applyIncomingCombatEvent = async (event: any, sourcePlayer?: any) => {
    const targetUid = String(event?.targetUid || "");
    const selfUid = String(player?.uid || "");
    const eventId = String(event?.id || "");
    const fromUid = String(event?.fromUid || "");

    if (!eventId || !targetUid || !selfUid) return false;
    if (targetUid !== selfUid) return false;
    if (fromUid === selfUid) return false;

    const processed = readProcessedCombatEvents();
    if (processed.has(eventId)) return false;

    const targetPayload = event?.targetPayload || {
      type: "combat" as const,
      title: "Combat Event",
      content:
        event?.content ||
        `Bạn nhận một hiệu ứng chiến đấu từ [${String(
          event?.fromName || "Ẩn danh",
        )}].`,
    };

    if (targetPayload?.content) {
      alert(String(targetPayload.content));
    }

    pushMail({
      ...targetPayload,
      fromUid: fromUid,
      fromName: String(event?.fromName || sourcePlayer?.name || "Ẩn danh"),
      recipientUid: selfUid,
      toUid: selfUid,
      targetUid: selfUid,
      audience: "self",
    });

    let committed: any = null;
    await new Promise<void>((resolve) => {
      setPlayer((prev) => {
        committed = buildCombatState(prev, {
          hpDelta: Number(event?.hpDelta || 0),
          cultivationDelta: Number(event?.cultivationDelta || 0),
          spiritStonesDelta: Number(event?.spiritStonesDelta || 0),
          manaDelta: Number(event?.manaDelta || 0),
          isDeadPenaltyCultLossRate: event?.isDeadPenaltyCultLossRate,
          isDeadPenaltyStoneLossRate: event?.isDeadPenaltyStoneLossRate,
        });
        resolve();
        return committed;
      });
    });

    if (committed) {
      try {
        await savePlayerData(selfUid, committed, {
          syncCloud: true,
          syncPresence: true,
        });
      } catch (error) {
        console.error("applyIncomingCombatEvent save failed:", error);
      }

      setAllPlayers((prev) =>
        prev.map((p) => (String(p?.uid || "") === selfUid ? committed : p)),
      );
    }

    processed.add(eventId);
    writeProcessedCombatEvents(processed);
    return true;
  };

  const flushIncomingCombatEvents = async () => {
    const selfUid = String(player?.uid || "");
    if (!selfUid || !Array.isArray(allPlayers) || allPlayers.length === 0) {
      return;
    }

    // combatEvents duoc luu vao document cua TARGET (chinh minh)
    // nen phai doc tu ban ghi selfUid trong allPlayers, khong phai sourcePlayer
    const selfRecord = allPlayers.find((p) => String(p?.uid || "") === selfUid);
    const events = Array.isArray(selfRecord?.combatEvents)
      ? (selfRecord.combatEvents as any[])
      : [];

    if (!events.length) return;

    const pending: Array<{ event: any; sourcePlayer: any }> = [];

    for (const event of events) {
      if (!event?.id) continue;
      if (String(event?.targetUid || "") !== selfUid) continue;
      if (String(event?.fromUid || "") === selfUid) continue;
      const sourcePlayer = allPlayers.find(
        (p) => String(p?.uid || "") === String(event?.fromUid || ""),
      );
      pending.push({ event, sourcePlayer });
    }

    for (const item of pending) {
      await applyIncomingCombatEvent(item.event, item.sourcePlayer);
    }
  };

  const ROB_CD = 5 * 60 * 1000; // 5 phút
  const DUAL_CD = 30 * 60 * 1000; // 30 phút
  const PK_CD = 1 * 1 * 1000; // 3 phút

  useEffect(() => {
    const unsub = listenAllPlayers((players) => setAllPlayers(players || []));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    loadCooldowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.uid]);

  useEffect(() => {
    if (!player?.uid || allPlayers.length === 0) return;
    void flushIncomingCombatEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.uid, allPlayers]);

  // Giữ lại props để không bị báo unused khi project bật lint nghiêm
  void inventory;
  void setInventory;

  const visiblePlayers = allPlayers.filter((p) => {
    if (!p) return false;
    const uid = String(p.uid || "");
    const providerId = String(p.providerId || "");
    return (
      p.isRealUser !== false &&
      providerId !== "mock" &&
      !uid.startsWith("guest_") &&
      uid !== (player as any).uid
    );
  });

  const friends = visiblePlayers; // theo yêu cầu: hiện tên các player khác trên máy chủ
  const mails: MailMessage[] = (player as any).mails || [];

  const safeNum = (value: any) => Number(value || 0);

  const getRealmSortScore = (p: any) => {
    const realmIndex = safeNum(p?.realmIndex);
    const realmLevel = safeNum(p?.realmLevel);
    return realmIndex * 1000 + realmLevel;
  };

  const topCultivation = [...visiblePlayers]
    .sort((a, b) => getRealmSortScore(b) - getRealmSortScore(a))
    .slice(0, cultivationLimit);

  const topBattlePower = [...visiblePlayers]
    .sort(
      (a, b) =>
        safeNum(b.stats?.atk) +
        safeNum(b.stats?.maxHp) -
        (safeNum(a.stats?.atk) + safeNum(a.stats?.maxHp)),
    )
    .slice(0, battleLimit);

  const topWealth = [...visiblePlayers]
    .sort((a, b) => safeNum(b.spiritStones) - safeNum(a.spiritStones))
    .slice(0, wealthLimit);

  const topJade = [...visiblePlayers]
    .sort((a, b) => safeNum(b.immortalJade) - safeNum(a.immortalJade))
    .slice(0, jadeLimit);

  const topOnline = [...visiblePlayers]
    .sort((a, b) => {
      const onlineScore = Number(isPlayerOnline(b)) - Number(isPlayerOnline(a));
      if (onlineScore !== 0) return onlineScore;
      return safeNum(b.lastActive) - safeNum(a.lastActive);
    })
    .slice(0, onlineLimit);

  const handleActionCooldown = () => {
    const now = Date.now();
    if (now - lastActionTime < 10000) {
      alert("Đạo hữu cần nghỉ 10 giây trước khi làm tiếp.");
      return false;
    }
    setLastActionTime(now);
    return true;
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const num = (v: any) => Number(v ?? 0);

  const getStatPack = (entity: any) => {
    const s = entity?.stats || {};
    const maxHp = Math.max(1, num(s.maxHp));
    const maxMana = Math.max(1, num(s.maxMana));

    return {
      hp: clamp(num(s.hp), 0, maxHp),
      hpRate: clamp(num(s.hp) / maxHp, 0, 1),
      mana: clamp(num(s.mana), 0, maxMana),
      manaRate: clamp(num(s.mana) / maxMana, 0, 1),
      maxHp,
      maxMana,

      atk: num(s.atk),
      def: num(s.def),
      atkSpeed: num(s.atkSpeed),
      evasion: num(s.evasion),
      crit: num(s.crit),
      critDamage: num(s.critDamage),
      resistance: num(s.resistance),
      movementSpeed: num(s.movementSpeed),
      penetration: num(s.penetration),
      lifesteal: num(s.lifesteal),
      cooldownReduction: num(s.cooldownReduction),
      block: num(s.block),
      xpRate: num(s.xpRate),
    };
  };

  const checkCooldown = (
    key: "rob" | "dual" | "pk",
    cdMs: number,
    label: string,
  ) => {
    const now = Date.now();
    const last = actionCooldownRef.current[key];
    const remain = cdMs - (now - last);

    if (remain > 0) {
      const sec = Math.ceil(remain / 1000);
      alert(`${label} đang hồi chiêu. Còn ${sec}s nữa.`);
      return false;
    }

    actionCooldownRef.current[key] = now;
    saveCooldown(key, now);
    return true;
  };

  const scoreCombat = (s: ReturnType<typeof getStatPack>) => {
    return (
      s.atk * 2.1 +
      s.def * 1.8 +
      s.maxHp * 0.12 +
      s.maxMana * 0.05 +
      s.atkSpeed * 0.95 +
      s.evasion * 1.0 +
      s.crit * 1.05 +
      s.critDamage * 0.18 +
      s.resistance * 1.15 +
      s.movementSpeed * 0.45 +
      s.penetration * 1.35 +
      s.lifesteal * 0.85 +
      s.cooldownReduction * 0.35 +
      s.block * 1.1 +
      s.hpRate * 18 +
      s.manaRate * 8
    );
  };

  const scoreStealth = (s: ReturnType<typeof getStatPack>) => {
    return (
      s.atkSpeed * 1.6 +
      s.evasion * 1.7 +
      s.movementSpeed * 1.1 +
      s.penetration * 0.95 +
      s.crit * 0.55 +
      s.cooldownReduction * 0.35 +
      s.hpRate * 10 +
      s.manaRate * 6
    );
  };

  const scoreGuard = (s: ReturnType<typeof getStatPack>) => {
    return (
      s.def * 1.7 +
      s.resistance * 1.6 +
      s.block * 1.45 +
      s.evasion * 0.75 +
      s.maxHp * 0.08 +
      s.maxMana * 0.04 +
      s.hpRate * 12 +
      s.manaRate * 5
    );
  };

  const reviveWithPenalty = (cultLossRate: number, stoneLossRate: number) => {
    setPlayer((prev) => ({
      ...prev,
      cultivation: Math.floor(prev.cultivation * (1 - cultLossRate)),
      spiritStones: Math.max(
        0,
        prev.spiritStones - Math.floor(prev.spiritStones * stoneLossRate),
      ),
      stats: {
        ...prev.stats,
        hp: prev.stats.maxHp,
        mana: prev.stats.maxMana,
      },
      isDead: false,
    }));
  };

  const applyDamage = (damage: number) => {
    setPlayer((prev) => {
      const nextHp = Math.max(0, prev.stats.hp - damage);
      return {
        ...prev,
        stats: { ...prev.stats, hp: nextHp },
        isDead: nextHp === 0,
      };
    });
  };

  const updateRemotePlayer = async (
    target: any,
    opts: {
      hpDelta?: number;
      cultivationDelta?: number;
      spiritStonesDelta?: number;
      manaDelta?: number;
      isDeadPenaltyCultLossRate?: number;
      isDeadPenaltyStoneLossRate?: number;
      selfPayload?: {
        type: MailMessage["type"];
        title: string;
        content: string;
      };
      targetPayload?: {
        type: MailMessage["type"];
        title: string;
        content: string;
      };
      kind?: string;
      fieldPatch?: Record<string, any>;
    },
  ) => {
    return queueCombatEvent(target, opts);
  };

  const applyTargetHpCultStoneDelta = async (
    target: any,
    opts: {
      hpDelta?: number;
      cultivationDelta?: number;
      spiritStonesDelta?: number;
      manaDelta?: number;
      isDeadPenaltyCultLossRate?: number;
      isDeadPenaltyStoneLossRate?: number;
      selfPayload?: {
        type: MailMessage["type"];
        title: string;
        content: string;
      };
      targetPayload?: {
        type: MailMessage["type"];
        title: string;
        content: string;
      };
      kind?: string;
      fieldPatch?: Record<string, any>;
    },
  ) => {
    return updateRemotePlayer(target, opts);
  };

  // ===== FULL HÀM 1: Cướp Linh Thạch =====
  const handleRob = async (target: any) => {
    if (!checkCooldown("rob", ROB_CD, "Cướp Linh Thạch")) return;
    if (!target) return;

    playSound("attack");

    const ps = getStatPack(player);
    const ts = getStatPack(target);

    const stealth = scoreStealth(ps);
    const guard = scoreGuard(ts);
    const combatGap = scoreCombat(ps) - scoreCombat(ts);

    const successChance = clamp(
      0.18 +
        (stealth - guard) / 520 +
        combatGap / 1800 +
        ps.hpRate * 0.06 +
        ps.manaRate * 0.03 -
        ts.hpRate * 0.05,
      0.08,
      0.88,
    );

    const success = Math.random() < successChance;

    if (success) {
      const targetStones = Math.max(0, num(target.spiritStones));
      const targetCult = Math.max(0, num(target.cultivation));

      const stealStonePct = clamp(
        0.03 +
          ps.penetration / 12000 +
          ps.crit / 12000 +
          ps.atkSpeed / 18000 -
          ts.block / 18000 -
          ts.resistance / 22000,
        0.02,
        0.11,
      );

      const stealXpPct = clamp(
        0.004 +
          ps.xpRate / 30000 +
          ps.cooldownReduction / 30000 -
          ts.resistance / 40000,
        0.002,
        0.018,
      );

      const stolenStones = Math.min(
        targetStones,
        Math.max(25, Math.round(targetStones * stealStonePct)),
      );

      const stolenCult = Math.min(
        targetCult,
        Math.max(
          8,
          Math.round(
            Math.max(player.cultivationNeeded * 0.006, targetCult * stealXpPct),
          ),
        ),
      );

      setPlayer((prev) => ({
        ...prev,
        spiritStones: prev.spiritStones + stolenStones,
        cultivation: prev.cultivation + stolenCult,
      }));

      await queueCombatEvent(target, {
        spiritStonesDelta: -stolenStones,
        cultivationDelta: -stolenCult,
        hpDelta: 0,
        manaDelta: 0,
        kind: "rob",
        selfPayload: {
          type: "farm",
          title: "Cướp Linh Thạch thành công",
          content: `Bạn cướp ${stolenStones} Linh thạch và ${stolenCult} tu vi từ [${target.name}].`,
        },
        targetPayload: {
          type: "combat",
          title: "Bị cướp Linh Thạch",
          content: `Bạn bị [${player.name}] cướp ${stolenStones} Linh thạch và ${stolenCult} tu vi.`,
        },
      });

      notifyBoth(
        player,
        target,
        {
          type: "farm",
          title: "Cướp Linh Thạch thành công",
          content: `Bạn cướp ${stolenStones} Linh thạch và ${stolenCult} tu vi từ [${target.name}].`,
        },
        {
          type: "combat",
          title: "Bị cướp Linh Thạch",
          content: `Bạn bị [${player.name}] cướp ${stolenStones} Linh thạch và ${stolenCult} tu vi.`,
        },
        true,
      );
    } else {
      const failPressure =
        ps.atk * 0.08 +
        ps.penetration * 0.35 +
        ps.crit * 0.12 +
        ps.atkSpeed * 0.15 -
        ts.def * 0.06 -
        ts.resistance * 0.05 -
        ts.block * 0.05;

      const damage = clamp(
        Math.round(ps.maxHp * clamp(0.12 - failPressure / 1200, 0.08, 0.22)),
        1,
        Math.max(1, Math.round(ps.maxHp * 0.22)),
      );

      const lostStones = Math.min(
        player.spiritStones,
        Math.max(
          10,
          Math.round(
            player.spiritStones *
              clamp(0.01 + ts.evasion / 25000 + ts.block / 25000, 0.01, 0.04),
          ),
        ),
      );

      const lostCult = Math.min(
        player.cultivation,
        Math.max(
          6,
          Math.round(
            player.cultivationNeeded *
              clamp(0.004 + ts.resistance / 30000, 0.004, 0.012),
          ),
        ),
      );

      const targetBonusCult = Math.max(1, Math.floor(lostCult * 0.5));
      const targetBonusStones = Math.max(1, Math.floor(lostStones * 0.35));

      applyDamage(damage);

      setPlayer((prev) => ({
        ...prev,
        spiritStones: Math.max(0, prev.spiritStones - lostStones),
        cultivation: Math.max(0, prev.cultivation - lostCult),
      }));

      await queueCombatEvent(target, {
        hpDelta: 0,
        cultivationDelta: targetBonusCult,
        spiritStonesDelta: targetBonusStones,
        manaDelta: 0,
        kind: "rob",
        selfPayload: {
          type: "combat",
          title: "Cướp Linh Thạch thất bại",
          content: `Bạn bị phát hiện khi cướp [${target.name}], mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
        targetPayload: {
          type: "combat",
          title: "Phát hiện kẻ cướp",
          content: `Bạn phát hiện [${player.name}] cướp thất bại. Đối phương mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
      });

      notifyBoth(
        player,
        target,
        {
          type: "combat",
          title: "Cướp Linh Thạch thất bại",
          content: `Bạn bị phát hiện khi cướp [${target.name}], mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
        {
          type: "combat",
          title: "Phát hiện kẻ cướp",
          content: `Bạn phát hiện [${player.name}] cướp thất bại. Đối phương mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
        true,
      );

      if (player.stats.hp - damage <= 0) {
        reviveWithPenalty(0.42, 0.06);
      }
    }
  };

  // ===== FULL HÀM 2: Song tu =====
  const handleDualCultivate = async (target: any) => {
    if (!checkCooldown("dual", DUAL_CD, "Song tu")) return;
    if (!target) return;

    playSound("success");

    const ps = getStatPack(player);
    const ts = getStatPack(target);

    const harmony =
      1 +
      clamp((ps.manaRate + ts.manaRate) / 2 - 0.5, -0.18, 0.18) +
      clamp((ps.resistance + ts.resistance) / 20000, 0, 0.05) +
      clamp((ps.cooldownReduction + ts.cooldownReduction) / 40000, 0, 0.04) +
      clamp((ps.lifesteal + ts.lifesteal) / 50000, 0, 0.02) -
      clamp(Math.abs(ps.atkSpeed - ts.atkSpeed) / 12000, 0, 0.05) -
      clamp(Math.abs(ps.evasion - ts.evasion) / 12000, 0, 0.05);

    const baseGain =
      player.cultivationNeeded *
      clamp(
        0.004 +
          (ps.xpRate + ts.xpRate) / 50000 +
          (ps.manaRate + ts.manaRate) / 60 +
          (ps.resistance + ts.resistance) / 30000,
        0.003,
        0.01,
      );

    const gainedCult = Math.max(1, Math.round(baseGain * harmony));

    setPlayer((prev) => ({
      ...prev,
      cultivation: prev.cultivation + gainedCult,
    }));

    await queueCombatEvent(target, {
      cultivationDelta: gainedCult,
      hpDelta: 0,
      manaDelta: 0,
      kind: "dual",
      selfPayload: {
        type: "friend",
        title: "Song tu thành công",
        content: `Bạn và [${target.name}] cùng nhận ${gainedCult} tu vi.`,
      },
      targetPayload: {
        type: "friend",
        title: "Song tu thành công",
        content: `Bạn và [${player.name}] cùng nhận ${gainedCult} tu vi.`,
      },
    });

    notifyBoth(
      player,
      target,
      {
        type: "friend",
        title: "Song tu thành công",
        content: `Bạn và [${target.name}] cùng nhận ${gainedCult} tu vi.`,
      },
      {
        type: "friend",
        title: "Song tu thành công",
        content: `Bạn và [${player.name}] cùng nhận ${gainedCult} tu vi.`,
      },
      true,
    );
  };

  // ===== FULL HÀM 3: PK =====
  const handlePk = async (target: any) => {
    if (!checkCooldown("pk", PK_CD, "PK")) return;
    if (!target) return;

    playSound("attack");

    const ps = getStatPack(player);
    const ts = getStatPack(target);

    const myScore = scoreCombat(ps);
    const enemyScore = scoreCombat(ts);

    const winChance = clamp(
      0.25 + (myScore - enemyScore) / 520 + (ps.hpRate - ts.hpRate) * 0.12,
      0.1,
      0.92,
    );

    const success = Math.random() < winChance;

    if (success) {
      const damage = clamp(
        Math.round(
          ps.atk * 1.6 +
            ps.penetration * 0.55 +
            ps.crit * 0.25 +
            ps.critDamage * 0.08 +
            ps.atkSpeed * 0.18 +
            ps.movementSpeed * 0.08 +
            ps.hpRate * 12 -
            ts.def * 0.7 -
            ts.resistance * 0.55 -
            ts.block * 0.45 -
            ts.evasion * 0.25,
        ),
        Math.max(1, Math.round(ts.maxHp * 0.08)),
        Math.max(1, Math.round(ts.maxHp * 0.28)),
      );

      const stolenStones = Math.min(
        Math.max(0, num(target.spiritStones)),
        Math.max(
          15,
          Math.round(
            num(target.spiritStones) *
              clamp(
                0.012 + ps.penetration / 15000 + ps.xpRate / 40000,
                0.01,
                0.04,
              ),
          ),
        ),
      );

      const stolenCult = Math.min(
        Math.max(0, num(target.cultivation)),
        Math.max(
          8,
          Math.round(
            Math.max(
              target.cultivationNeeded * 0.008,
              num(target.cultivation) *
                clamp(0.006 + ps.xpRate / 40000, 0.005, 0.02),
            ),
          ),
        ),
      );

      applyDamage(0); // giữ flow đồng bộ, không làm gì ở đây

      setPlayer((prev) => ({
        ...prev,
        spiritStones: prev.spiritStones + stolenStones,
        cultivation: prev.cultivation + stolenCult,
      }));

      await queueCombatEvent(target, {
        hpDelta: -damage,
        spiritStonesDelta: -stolenStones,
        cultivationDelta: -stolenCult,
        manaDelta: 0,
        kind: "pk",
        selfPayload: {
          type: "combat",
          title: "PK thành công",
          content: `Bạn thắng [${target.name}], gây ${damage} sát thương, cướp ${stolenStones} Linh thạch và ${stolenCult} tu vi.`,
        },
        targetPayload: {
          type: "combat",
          title: "Bị PK",
          content: `Bạn bị [${player.name}] PK thua, mất ${damage} HP, ${stolenStones} Linh thạch và ${stolenCult} tu vi.`,
        },
      });

      notifyBoth(
        player,
        target,
        {
          type: "combat",
          title: "PK thành công",
          content: `Bạn thắng [${target.name}], gây ${damage} sát thương, cướp ${stolenStones} Linh thạch và ${stolenCult} tu vi.`,
        },
        {
          type: "combat",
          title: "Bị PK",
          content: `Bạn bị [${player.name}] PK thua, mất ${damage} HP, ${stolenStones} Linh thạch và ${stolenCult} tu vi.`,
        },
        true,
      );
    } else {
      const damage = clamp(
        Math.round(
          ts.atk * 1.65 +
            ts.penetration * 0.55 +
            ts.crit * 0.2 +
            ts.atkSpeed * 0.18 +
            ts.movementSpeed * 0.08 +
            ts.hpRate * 10 -
            ps.def * 0.65 -
            ps.resistance * 0.45 -
            ps.block * 0.4 -
            ps.evasion * 0.2,
        ),
        Math.max(1, Math.round(ps.maxHp * 0.1)),
        Math.max(1, Math.round(ps.maxHp * 0.35)),
      );

      const lostStones = Math.min(
        player.spiritStones,
        Math.max(
          12,
          Math.round(
            player.spiritStones *
              clamp(
                0.01 + ts.penetration / 20000 + ts.block / 25000,
                0.01,
                0.035,
              ),
          ),
        ),
      );

      const lostCult = Math.min(
        player.cultivation,
        Math.max(
          8,
          Math.round(
            player.cultivationNeeded *
              clamp(0.005 + ts.resistance / 25000, 0.005, 0.015),
          ),
        ),
      );

      applyDamage(damage);

      setPlayer((prev) => ({
        ...prev,
        spiritStones: Math.max(0, prev.spiritStones - lostStones),
        cultivation: Math.max(0, prev.cultivation - lostCult),
      }));

      await queueCombatEvent(target, {
        hpDelta: 0,
        spiritStonesDelta: Math.max(1, Math.floor(lostStones * 0.5)),
        cultivationDelta: Math.max(1, Math.floor(lostCult * 0.4)),
        manaDelta: 0,
        kind: "pk",
        selfPayload: {
          type: "combat",
          title: "PK thất bại",
          content: `Bạn bị [${target.name}] phản sát, mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
        targetPayload: {
          type: "combat",
          title: "PK phản sát thành công",
          content: `Bạn phản sát [${player.name}], khiến đối phương mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
      });

      notifyBoth(
        player,
        target,
        {
          type: "combat",
          title: "PK thất bại",
          content: `Bạn bị [${target.name}] phản sát, mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
        {
          type: "combat",
          title: "PK phản sát thành công",
          content: `Bạn phản sát [${player.name}], khiến đối phương mất ${damage} HP, ${lostStones} Linh thạch và ${lostCult} tu vi.`,
        },
        true,
      );

      if (player.stats.hp - damage <= 0) {
        reviveWithPenalty(0.5, 0.06);
      }
    }
  };

  const tabs = [
    { key: "leaderboard" as const, icon: Trophy, label: "Phong Danh" },
    { key: "friends" as const, icon: Users, label: "Bằng Hữu" },
    { key: "mail" as const, icon: Mail, label: "Hòm Thư" },
  ];

  const renderBoard = (
    title: string,
    Icon: React.ComponentType<{ size?: number; className?: string }>,
    list: any[],
    valueText: (p: any) => string,
    limit: number,
    onToggle: () => void,
  ) => (
    <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-3">
      <h4 className="text-sm font-black text-amber-400 uppercase flex items-center gap-2">
        <Icon size={14} /> {title}
      </h4>

      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="text-xs text-stone-500 bg-stone-950 p-3 rounded border border-stone-800">
            Chưa có dữ liệu.
          </div>
        ) : (
          list.map((p, i) => (
            <div
              key={p.uid || `${title}-${i}`}
              className="flex justify-between items-center bg-stone-950 p-2 rounded border border-stone-800"
            >
              <span className="font-bold text-xs">
                {i + 1}. {p.name || "Ẩn danh"}
              </span>
              <span className="font-mono text-[10px] text-cyan-300">
                {valueText(p)}
              </span>
            </div>
          ))
        )}
      </div>

      {list.length >= limit && (
        <button
          onClick={onToggle}
          className="w-full mt-2 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-stone-800 transition-all"
        >
          {limit === 10 ? "Xem thêm" : "Thu gọn"}
        </button>
      )}
    </div>
  );

  const serverPlayerList = friends.slice(0, friendLimit);

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-200" id="community_menu">
      <div className="flex bg-stone-950 rounded-xl p-1 border border-stone-850">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => {
                playSound("click");
                setActiveTab(t.key);
              }}
              className={`flex-1 py-2 text-xs font-black uppercase rounded-lg flex items-center justify-center gap-1 transition-all ${
                activeTab === t.key
                  ? "bg-amber-600 text-stone-950 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "leaderboard" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderBoard(
            "Cảnh Giới",
            Trophy,
            topCultivation,
            (p) => getCultivationRealm(p),
            cultivationLimit,
            () => setCultivationLimit((prev) => (prev === 10 ? 20 : 10)),
          )}

          {renderBoard(
            "Linh Thạch",
            Hand,
            topWealth,
            (p) => `${safeNum(p.spiritStones).toLocaleString()}`,
            wealthLimit,
            () => setWealthLimit((prev) => (prev === 10 ? 20 : 10)),
          )}

          {renderBoard(
            "Tiên Ngọc",
            Gem,
            topJade,
            (p) => `${safeNum(p.immortalJade).toLocaleString()}`,
            jadeLimit,
            () => setJadeLimit((prev) => (prev === 10 ? 20 : 10)),
          )}
        </div>
      )}

      {activeTab === "friends" && (
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-4">
          <h4 className="text-sm font-black text-amber-500 uppercase flex items-center gap-2">
            <Users size={14} /> Danh sách đạo hữu trên máy chủ
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {serverPlayerList.length === 0 ? (
              <div className="text-xs text-stone-500 bg-stone-950 p-3 rounded border border-stone-800">
                Chưa có player nào để hiển thị.
              </div>
            ) : (
              serverPlayerList.map((p) => (
                <div
                  key={p.uid}
                  className="bg-stone-950 p-3 rounded-lg border border-stone-800 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <h5 className="font-bold text-stone-200 text-xs">
                      {p.name || "Ẩn danh"}
                    </h5>
                    <span
                      className={`text-[10px] ${
                        isPlayerOnline(p)
                          ? "text-emerald-400"
                          : "text-stone-500"
                      }`}
                    >
                      {isPlayerOnline(p) ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div className="text-[10px] text-stone-500">
                    {getCultivationRealm(p)} | Linh thạch:{" "}
                    {safeNum(p.spiritStones).toLocaleString()}
                    {isPlayerOnline(p) && (
                      <>
                        {" "}
                        | Hoạt động:{" "}
                        {p?.currentActivity?.name ??
                          p?.currentActivity ??
                          p?.presence?.currentActivity ??
                          p?.presence?.status ??
                          "Online"}
                      </>
                    )}
                  </div>

                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => handleDualCultivate(p)}
                      className="flex-1 bg-pink-950/40 hover:bg-pink-900 text-pink-400 border border-pink-900 rounded py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 transition-all"
                    >
                      <Heart size={10} /> Song Tu
                    </button>

                    <button
                      onClick={() => handleRob(p)}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 transition-all"
                    >
                      <Hand size={10} /> Cướp
                    </button>

                    <button
                      onClick={() => handlePk(p)}
                      className="flex-1 bg-red-950/40 hover:bg-red-900 text-red-400 border border-red-900 rounded py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 transition-all"
                    >
                      <Sword size={10} /> PK
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {serverPlayerList.length >= friendLimit && (
            <button
              onClick={() => setFriendLimit((prev) => (prev === 10 ? 20 : 10))}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-stone-800 transition-all"
            >
              {friendLimit === 10 ? "Xem thêm" : "Thu gọn"}
            </button>
          )}
        </div>
      )}

      {activeTab === "mail" && (
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-3">
          <h4 className="text-sm font-black text-cyan-400 uppercase flex items-center gap-2">
            <Mail size={14} /> Hòm Thư
          </h4>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {(mails.length
              ? mails
              : [
                  {
                    id: "sys_1",
                    type: "system",
                    title: "Tin hệ thống",
                    content: "Chào đạo hữu, đây là hòm thư mẫu.",
                    read: false,
                    createdAt: Date.now(),
                  },
                ]
            ).map((m) => (
              <div
                key={m.id}
                className="bg-stone-950 border border-stone-800 rounded-lg p-3"
              >
                <div className="flex justify-between items-center">
                  <p className="font-bold text-xs text-stone-200">{m.title}</p>
                  <span className="text-[10px] text-stone-500">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
