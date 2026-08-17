/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PlayerCharacter, GameItem, Skill, Companion, SpiritBeast, Quest, BaseStats, GameSave, MailMessage } from './types';
import { 
  DEFAULT_BASE_STATS, 
  ITEM_TEMPLATES, 
  SKILL_TREE_TEMPLATES, 
  COMPANION_TEMPLATES, 
  SPIRIT_BEAST_TEMPLATES, 
  MAPS, 
  REALMS, 
  playSound,
  getItemTemplate 
} from './utils/gameData';
import { getEquipmentBaseStats } from './utils/gameData';
import { normalizeInventoryItems } from './utils/inventory';

// Component imports
import CharacterSheet from './components/CharacterSheet';
import SectMenu from './components/SectMenu';
import AlchemyMenu from './components/AlchemyMenu';
import DungeonMenu from './components/DungeonMenu';
import PvPMenu from './components/PvPMenu';
import CompanionMenu from './components/CompanionMenu';
import SystemCompanion from './components/SystemCompanion';

// New Custom Components
import MeditationScreen from './components/MeditationScreen';
import ActivitiesMenu from './components/ActivitiesMenu';
import VillageMap from './components/VillageMap';
import AuctionHouse from './components/AuctionHouse';
import CommunityMenu from './components/CommunityMenu';
import CharacterPortraitStudio from './components/CharacterPortraitStudio';
import { ConfirmProvider } from "./components/ConfirmProvider";

// Firebase Client Imports
import { 
  signInWithGoogle, 
  logoutUser, 
  onAuthChanged, 
  savePlayerData, 
  listenPlayerData, 
  isFirebaseLive,
  findPlayerByCharacterCode,
  bindCharacterCodeToUser,
  saveLocalSyncMirror,
  loadLocalSyncMirror,
  clearLocalSyncMirror,
  getLocalMailInbox,
  listenMailbox,
  setActiveMailOwner,
  addMailToInbox,
} from './lib/firebase';

import { 
  Coins, 
  Gem, 
  Zap, 
  BookOpen, 
  Compass, 
  Users, 
  Hammer, 
  Swords, 
  Sparkles, 
  Award, 
  Menu, 
  FileText, 
  Save, 
  RefreshCw, 
  Moon,
  Cpu,
  Gavel,
  LogIn,
  LogOut,
  CloudLightning,
  Sun,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


export default function App() {
  // --- Auth & Sync States ---
  const [user, setUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [characterCodeInput, setCharacterCodeInput] = useState<string>('');
  const [characterCodeMessage, setCharacterCodeMessage] = useState<string>('');
  const [mails, setMails] = useState<MailMessage[]>([]);

  useEffect(() => {
    const onMailAdded = (event: Event) => {
      const customEvent = event as CustomEvent<MailMessage & { recipientUid?: string }>;
      const nextMail = customEvent.detail;
      if (!nextMail) return;
      setMails((prev) => {
        if (prev.some((mail) => mail.id === nextMail.id)) return prev;
        return [nextMail, ...prev].slice(0, 200);
      });
      setPlayer((prev) => {
        const existing = Array.isArray((prev as any).mails) ? ((prev as any).mails as MailMessage[]) : [];
        if (existing.some((mail) => mail.id === nextMail.id)) return prev;
        return {
          ...prev,
          mails: [nextMail, ...existing].slice(0, 200),
        } as any;
      });
    };

    window.addEventListener('ntt-mail-added', onMailAdded as EventListener);
    return () => window.removeEventListener('ntt-mail-added', onMailAdded as EventListener);
  }, []);

  // --- Beautiful Alert Toasts State ---
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const latestSaveRef = useRef<GameSave | null>(null);
  const saveDirtyRef = useRef(false);
  const syncIdentityRef = useRef<string>('');
  const hydrationRef = useRef(true);
  const cloudLoadedRef = useRef(false);
  const saveInFlightRef = useRef(false);

  const stripUndefinedDeep = (value: any): any => {
    if (Array.isArray(value)) return value.map(stripUndefinedDeep);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, stripUndefinedDeep(v)]),
      );
    }
    return value;
  };

  const mergeGameSave = (base?: Partial<GameSave> | null, incoming?: Partial<GameSave> | null): GameSave => {
    const current = buildGameSave();
    const safeBase = (base || {}) as Partial<GameSave>;
    const safeIncoming = (incoming || {}) as Partial<GameSave>;

    return stripUndefinedDeep({
      ...current,
      ...safeBase,
      ...safeIncoming,
      player: {
        ...(current.player as any),
        ...((safeBase.player || {}) as any),
        ...((safeIncoming.player || {}) as any),
        mails: Array.isArray((safeIncoming.player as any)?.mails)
          ? ((safeIncoming.player as any).mails as MailMessage[]).slice(-200)
          : Array.isArray((safeBase.player as any)?.mails)
            ? ((safeBase.player as any).mails as MailMessage[]).slice(-200)
            : Array.isArray((current.player as any)?.mails)
              ? ((current.player as any).mails as MailMessage[]).slice(-200)
              : [],
      } as any,
      inventory: normalizeInventoryItems(Array.isArray(safeIncoming.inventory)
        ? safeIncoming.inventory
        : Array.isArray(safeBase.inventory)
          ? safeBase.inventory
          : current.inventory),
      skills: Array.isArray(safeIncoming.skills)
        ? safeIncoming.skills
        : Array.isArray(safeBase.skills)
          ? safeBase.skills
          : current.skills,
      companions: Array.isArray(safeIncoming.companions)
        ? safeIncoming.companions
        : Array.isArray(safeBase.companions)
          ? safeBase.companions
          : current.companions,
      spiritBeasts: Array.isArray(safeIncoming.spiritBeasts)
        ? safeIncoming.spiritBeasts
        : Array.isArray(safeBase.spiritBeasts)
          ? safeBase.spiritBeasts
          : current.spiritBeasts,
      activeQuests: Array.isArray(safeIncoming.activeQuests)
        ? safeIncoming.activeQuests
        : Array.isArray(safeBase.activeQuests)
          ? safeBase.activeQuests
          : current.activeQuests,
      completedQuests: Array.isArray(safeIncoming.completedQuests)
        ? safeIncoming.completedQuests
        : Array.isArray(safeBase.completedQuests)
          ? safeBase.completedQuests
          : current.completedQuests,
      sectId:
        safeIncoming.sectId !== undefined
          ? safeIncoming.sectId ?? null
          : safeBase.sectId !== undefined
            ? safeBase.sectId ?? null
            : current.sectId ?? null,
      sectLevel: safeIncoming.sectLevel ?? safeBase.sectLevel ?? current.sectLevel,
      unlockedMaps: Array.isArray(safeIncoming.unlockedMaps)
        ? safeIncoming.unlockedMaps
        : Array.isArray(safeBase.unlockedMaps)
          ? safeBase.unlockedMaps
          : current.unlockedMaps,
      currentMapId: safeIncoming.currentMapId || safeBase.currentMapId || current.currentMapId,
      alchemyLevel: safeIncoming.alchemyLevel ?? safeBase.alchemyLevel ?? current.alchemyLevel,
      alchemyExp: safeIncoming.alchemyExp ?? safeBase.alchemyExp ?? current.alchemyExp,
      craftingLevel: safeIncoming.craftingLevel ?? safeBase.craftingLevel ?? current.craftingLevel,
      craftingExp: safeIncoming.craftingExp ?? safeBase.craftingExp ?? current.craftingExp,
      arenaRank: safeIncoming.arenaRank ?? safeBase.arenaRank ?? current.arenaRank,
      luckySpinCount: safeIncoming.luckySpinCount ?? safeBase.luckySpinCount ?? current.luckySpinCount,
      claimedCodes: Array.isArray(safeIncoming.claimedCodes)
        ? safeIncoming.claimedCodes
        : Array.isArray(safeBase.claimedCodes)
          ? safeBase.claimedCodes
          : current.claimedCodes,
      mails: Array.isArray((safeIncoming as any).mails)
        ? ((safeIncoming as any).mails as MailMessage[]).slice(-200)
        : Array.isArray((safeBase as any).mails)
          ? ((safeBase as any).mails as MailMessage[]).slice(-200)
          : Array.isArray((current as any).mails)
            ? ((current as any).mails as MailMessage[]).slice(-200)
            : [],
    }) as GameSave;
  };


  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message: string) => {
      const id = Math.random().toString();
      const title = message.split('\n')[0]?.slice(0, 60) || 'Thông báo hệ thống';

      let type: 'info' | 'success' | 'error' = 'info';
      const msgLower = message.toLowerCase();
      if (
        msgLower.includes('thành công') || 
        msgLower.includes('chúc mừng') || 
        msgLower.includes('nhận') || 
        msgLower.includes('thắng') || 
        msgLower.includes('✅') || 
        msgLower.includes('đạt') || 
        msgLower.includes('luyện thành')
      ) {
        type = 'success';
      } else if (
        msgLower.includes('thất bại') || 
        msgLower.includes('không đủ') || 
        msgLower.includes('chưa đủ') || 
        msgLower.includes('yêu cầu') || 
        msgLower.includes('trọng thương') || 
        msgLower.includes('bị vả') || 
        msgLower.includes('❌') || 
        msgLower.includes('💀') || 
        msgLower.includes('mất') || 
        msgLower.includes('thùng rỗng')
      ) {
        type = 'error';
      }

      setToasts(prev => {
        if (prev.some(t => t.message === message)) {
          return prev;
        }
        return [...prev, { id, message, type }];
      });

      const lowered = `${title}\n${message}`.toLowerCase();
      const shouldStoreMail =
        lowered.includes('pk') ||
        lowered.includes('cướp linh thạch') ||
        lowered.includes('cướp linh thach') ||
        lowered.includes('song tu') ||
        lowered.includes('trộm rau') ||
        lowered.includes('trom rau');

      if (shouldStoreMail) {
        const eventType = lowered.includes('trộm rau') || lowered.includes('trom rau')
          ? 'farm'
          : lowered.includes('song tu')
            ? 'friend'
            : 'combat';

        const mail: MailMessage = {
          id: `mail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: eventType as MailMessage['type'],
          title,
          content: message,
          read: false,
          createdAt: Date.now(),
          actionRefId: `alert_${Date.now()}`,
        };

        addMailToInbox({
          ...mail,
          fromName: 'Hệ thống',
          eventType,
        } as any);
      }

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    const tryFullscreen = async () => {
      try {
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        const isMobile = window.matchMedia("(max-width: 1024px)").matches;

        // Cố gắng fullscreen sớm nhất có thể
        if (
          !document.fullscreenElement &&
          document.documentElement.requestFullscreen
        ) {
          await document.documentElement.requestFullscreen();
        }

        // Ép UI theo chiều dọc trên mobile
        if (isMobile && isPortrait) {
          document.documentElement.classList.add("portrait-lock");
        }

        window.scrollTo(0, 1);
      } catch {
        // Browser chặn fullscreen nếu chưa có gesture
      }
    };

    void tryFullscreen();

    const onFirstInteraction = () => {
      void tryFullscreen();
    };

    window.addEventListener("touchstart", onFirstInteraction, {
      once: true,
      passive: true,
    });
    window.addEventListener("click", onFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("click", onFirstInteraction);
      document.documentElement.classList.remove("portrait-lock");
    };
  }, []);


  const [player, setPlayer] = useState<PlayerCharacter>({
    name: 'Đạo Hữu Vô Danh',
    gender: 'Nam',
    appearanceId: 1,
    origin: 'Phế Sài Nghịch Thiên Gia Tộc',
    realmIndex: 0,
    realmLevel: 1,
    cultivation: 0,
    cultivationNeeded: 1000,
    stats: { ...DEFAULT_BASE_STATS },
    progressionStats: {},
    gold: 1500,
    spiritStones: 500,
    immortalJade: 150,
    reputation: 0,
    sectContribution: 0,
    pvpPoints: 0,
    equippedItems: {
      weapon: null,
      head: null,
      armor: null,
      boots: null,
      ring: null,
      necklace: null,
      artifact: null,
      wings: null
    }
  });

  const [inventory, setInventory] = useState<GameItem[]>([
    { id: 'tu_khi_dan', name: 'Tụ Khí Đan', type: 'consumable', rarity: 'Trắng', desc: 'Đan dược tăng một ít tu vi tức thì.', count: 3 },
    { id: 've_bi_canh', name: 'Vé Bí Cảnh', type: 'key', rarity: 'Lam', desc: 'Giấy thông hành vào Bí Cảnh Ngẫu Nhiên.', count: 2 },
    { id: 've_dau_truong', name: 'Vé Đấu Trường', type: 'key', rarity: 'Lục', desc: 'Dùng để tranh tài PvP trên bảng xếp hạng.', count: 4 },
    { id: 've_quay_thuong', name: 'Vé Quay Thưởng', type: 'key', rarity: 'Tím', desc: 'Lượt quay Vòng Quay May Mắn của Hệ thống.', count: 2 },
    { id: 'huyen_thiet', name: 'Huyền Thiết', type: 'ore', rarity: 'Trắng', desc: 'Quặng sắt đen dùng chế tạo trang bị phàm nhân.', count: 6 },
    { id: 'linh_chi', name: 'Linh Chi', type: 'herb', rarity: 'Trắng', desc: 'Dược liệu cơ bản để luyện đan.', count: 8 },
    { id: 've_doi_ten', name: 'Vé Đổi Tên', type: 'special', rarity: 'Lục', desc: 'Vật phẩm thần bí giúp thay đổi danh tính giang hồ.', count: 1 }
  ]);

  const [skills, setSkills] = useState<Skill[]>(SKILL_TREE_TEMPLATES);
  const [companions, setCompanions] = useState<Companion[]>(COMPANION_TEMPLATES);
  const [spiritBeasts, setSpiritBeasts] = useState<SpiritBeast[]>(SPIRIT_BEAST_TEMPLATES);
  const [sectId, setSectId] = useState<string | null>(null);
  const [sectLevel, setSectLevel] = useState<number>(1);
  const [currentMapId, setCurrentMapId] = useState<string>('tan_thu_thon');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Novel System points / count tracking
  const [luckySpinCount, setLuckySpinCount] = useState(0);
  const [claimedCodes, setClaimedCodes] = useState<string[]>([]);
  const [alchemyLevel, setAlchemyLevel] = useState(1);
  const [alchemyExp, setAlchemyExp] = useState(0);
  const [craftingLevel, setCraftingLevel] = useState(1);
  const [craftingExp, setCraftingExp] = useState(0);
  const [arenaRank, setArenaRank] = useState(145);

  const [activeQuests, setActiveQuests] = useState<Quest[]>([
    {
      id: 'quest_kill_mobs',
      title: 'Tân Thủ Rèn Luyện Dã Ngoại',
      desc: 'Đi dã ngoại đồ sát 5 Yêu Binh dã ngoại để làm nóng kinh mạch gân cốt.',
      type: 'chính tuyến',
      targetType: 'kill_monsters',
      targetCount: 5,
      currentCount: 0,
      rewardGold: 150,
      rewardExp: 200,
      rewardItems: [{ itemId: 'tu_khi_dan', count: 1 }],
      completed: false,
      claimed: false
    },
    {
      id: 'quest_gather_herbs',
      title: 'Hái Dược Luyện Đan',
      desc: 'Thu thập 3 nhánh Linh Chi dã ngoại mang về nộp hệ thống nung đan.',
      type: 'phụ tuyến',
      targetType: 'collect_resources',
      targetId: 'linh_chi',
      targetCount: 3,
      currentCount: 0,
      rewardGold: 100,
      rewardExp: 150,
      rewardItems: [{ itemId: 've_quay_thuong', count: 1 }],
      completed: false,
      claimed: false
    }
  ]);

  const [completedQuests, setCompletedQuests] = useState<string[]>([]);

  // Navigation state
  // Tab types: 'meditation' | 'activities' | 'village' | 'character' | 'forge' | 'companions' | 'dungeon' | 'arena' | 'system' | 'settings' | 'auction'
  const [activeTab, setActiveTab] = useState<string>('meditation');
  const [afkOfflineGains, setAfkOfflineGains] = useState<number | null>(null);

  const blankEquipped = (): Record<any, GameItem | null> => ({
  weapon: null,
  head: null,
  armor: null,
  boots: null,
  ring: null,
  necklace: null,
  artifact: null,
  wings: null

  
});

 

function buildGameSave(playerOverride?: PlayerCharacter): GameSave {
  return {
    player: playerOverride ?? player,
    inventory,
    skills,
    companions,
    spiritBeasts,
    activeQuests,
    completedQuests,
    sectId: sectId ?? null,
    sectLevel,
    unlockedMaps: [currentMapId],
    currentMapId,
    alchemyLevel,
    alchemyExp,
    craftingLevel,
    craftingExp,
    arenaRank,
    lastSavedAt: Date.now(),
    afkEarnTimer: 0,
    luckySpinCount,
    claimedCodes,
    characterCode: normalizeCharacterCode(
      characterCodeInput ||
        (playerOverride ?? (player as any)).characterCode ||
        "",
    ),
    friends: ((playerOverride ?? player) as any).friends || [],
    mails: ((playerOverride ?? player) as any).mails || mails || [],
    farmPlots: ((playerOverride ?? player) as any).farmPlots || [],
    tribulationState:
      ((playerOverride ?? player) as any).tribulationState || null,
    portraitUrl: ((playerOverride ?? player) as any).portraitUrl,
    portraitData: ((playerOverride ?? player) as any).portraitData,
    portraitSource: ((playerOverride ?? player) as any).portraitSource,
  };
}

function applyGameSave(parsed: Partial<GameSave>) {
  if (parsed.player) setPlayer(parsed.player);
  if (parsed.inventory !== undefined) setInventory(parsed.inventory as GameItem[]);
  if (parsed.skills !== undefined) setSkills(parsed.skills as Skill[]);
  if (parsed.companions !== undefined) setCompanions(parsed.companions as Companion[]);
  if (parsed.spiritBeasts !== undefined) setSpiritBeasts(parsed.spiritBeasts as SpiritBeast[]);
  if (parsed.sectId !== undefined) setSectId(parsed.sectId ?? null);
  if (parsed.sectLevel !== undefined) setSectLevel(parsed.sectLevel);
  if (parsed.currentMapId !== undefined) setCurrentMapId(parsed.currentMapId);
  if (parsed.alchemyLevel !== undefined) setAlchemyLevel(parsed.alchemyLevel);
  if (parsed.alchemyExp !== undefined) setAlchemyExp(parsed.alchemyExp);
  if (parsed.craftingLevel !== undefined) setCraftingLevel(parsed.craftingLevel);
  if (parsed.craftingExp !== undefined) setCraftingExp(parsed.craftingExp);
  if (parsed.arenaRank !== undefined) setArenaRank(parsed.arenaRank);
  if (parsed.luckySpinCount !== undefined) setLuckySpinCount(parsed.luckySpinCount);
  if (parsed.claimedCodes !== undefined) setClaimedCodes(parsed.claimedCodes);
  if (parsed.activeQuests !== undefined) setActiveQuests(parsed.activeQuests as Quest[]);
  if (parsed.completedQuests !== undefined) setCompletedQuests(parsed.completedQuests);
  if (parsed.mails !== undefined) setMails(parsed.mails as MailMessage[]);
  if (parsed.portraitUrl || parsed.portraitData || parsed.portraitSource) {
    setPlayer(prev => ({
      ...prev,
      portraitUrl: parsed.portraitUrl ?? (prev as any).portraitUrl,
      portraitData: parsed.portraitData ?? (prev as any).portraitData,
      portraitSource: parsed.portraitSource ?? (prev as any).portraitSource,
    } as any));
  }
}

// thêm gần khu vực helper
const normalizeCharacterCode = (value: string) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

function pickFreshestSave(...saves: Array<Partial<GameSave> | null | undefined>): Partial<GameSave> | null {
  return saves
    .filter((save): save is Partial<GameSave> => Boolean(save))
    .sort((a, b) => (Number(b?.lastSavedAt || 0) - Number(a?.lastSavedAt || 0)))[0] || null;
}

async function saveGameToCloud(data: any, uidOverride?: string) {
  const uid = uidOverride || user?.uid;
  if (!uid) return;
  if (hydrationRef.current) return;
  if (saveInFlightRef.current) return;

  saveInFlightRef.current = true;
  try {
    const fallbackSave = buildGameSave();
    const sourceSave: GameSave = data?.player
      ? (data as GameSave)
      : {
          ...fallbackSave,
          player: {
            ...fallbackSave.player,
            ...(data || {}),
          },
        };

    const nextData: GameSave = stripUndefinedDeep({
      ...sourceSave,
      player: {
        ...sourceSave.player,
        characterCode: normalizeCharacterCode(
          sourceSave.player?.characterCode || characterCodeInput || '',
        ),
        isRealUser: Boolean(user && String(user.uid || '').startsWith('mock_') === false),
        providerId:
          user?.providerData?.[0]?.providerId ||
          (String(user?.uid || '').startsWith('mock_') ? 'mock' : 'google.com'),
        mails: ((sourceSave.player as any).mails || mails || []).slice(-200),
      },
      sectId: sourceSave.sectId ?? null,
      characterCode: normalizeCharacterCode(
        sourceSave.characterCode || sourceSave.player?.characterCode || characterCodeInput || '',
      ),
    }) as GameSave;

    await Promise.all([
      saveLocalSyncMirror(uid, nextData),
      saveLocalSyncMirror('local_bootstrap', nextData),
    ]);
    await savePlayerData(uid, nextData, { syncCloud: true, syncPresence: false });
    saveDirtyRef.current = false;

    const code = normalizeCharacterCode(nextData.characterCode || nextData.player.characterCode || '');
    if (code) {
      await bindCharacterCodeToUser(uid, code, nextData);
    }
  } finally {
    saveInFlightRef.current = false;
  }
}

function updateLatestSnapshot() {
  if (hydrationRef.current) return;
  const snapshot = buildGameSave();
  latestSaveRef.current = snapshot;
  saveDirtyRef.current = true;
  const identity = normalizeCharacterCode(snapshot.characterCode || snapshot.player.characterCode || characterCodeInput || '');
  syncIdentityRef.current = user?.uid || identity || 'local';
}

useEffect(() => {
  updateLatestSnapshot();
}, [
  user,
  player,
  inventory,
  skills,
  companions,
  spiritBeasts,
  activeQuests,
  completedQuests,
  sectId,
  sectLevel,
  currentMapId,
  alchemyLevel,
  alchemyExp,
  craftingLevel,
  craftingExp,
  arenaRank,
  luckySpinCount,
  claimedCodes,
  mails,
  characterCodeInput,
]);

const handleCharacterCodeSync = async () => {
  if (!user) {
    alert('Hãy đăng nhập Google trước khi đồng bộ mã nhân vật.');
    return;
  }

  const code = normalizeCharacterCode(characterCodeInput);
  if (!code) {
    setCharacterCodeMessage('Hãy nhập mã nhân vật hợp lệ.');
    return;
  }

  setIsSyncing(true);
  try {
    const imported = await findPlayerByCharacterCode(code);
    if (imported) {
      const importedSave: GameSave = imported?.player
        ? ({ ...imported, characterCode: code } as GameSave)
        : ({
            ...buildGameSave(),
            player: {
              ...buildGameSave().player,
              ...(imported || {}),
              characterCode: code,
            },
            characterCode: code,
          } as GameSave);

      applyGameSave(importedSave);
      setCharacterCodeInput(code);
      await saveGameToCloud(importedSave, user.uid);
      setCharacterCodeMessage(`Đã tìm thấy dữ liệu cũ và đồng bộ theo mã ${code}.`);
      alert(`Đã tải dữ liệu cũ theo mã ${code}.`);
      return;
    }

    const current = buildGameSave();
    const merged: GameSave = {
      ...current,
      player: {
        ...current.player,
        characterCode: code,
      },
      characterCode: code,
    };
    await saveGameToCloud(merged, user.uid);
    applyGameSave(merged);
    setCharacterCodeMessage(`Đã gắn mã ${code} vào nhân vật hiện tại.`);
    alert(`Đã gắn mã ${code} vào nhân vật hiện tại.`);
  } catch (error) {
    console.error(error);
    setCharacterCodeMessage('Đồng bộ mã nhân vật thất bại.');
    alert('Đồng bộ mã nhân vật thất bại.');
  } finally {
    setIsSyncing(false);
  }
};

  // --- Auth Change Subscriber ---
  useEffect(() => {
    const unsubscribe = onAuthChanged((currentUser) => {
      if (currentUser && !String(currentUser.uid || '').startsWith('mock_')) {
        const providers = Array.isArray(currentUser.providerData) ? currentUser.providerData : [];
        const hasGoogle = providers.some((p: any) => p?.providerId === 'google.com');
        if (!hasGoogle) {
          void logoutUser();
          setUser(null);
          setIsAuthLoading(false);
          return;
        }
      }

      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        hydrationRef.current = true;
        cloudLoadedRef.current = false;

        listenPlayerData(currentUser.uid, (cloudData) => {
          void (async () => {
            const uidMirror = await loadLocalSyncMirror(currentUser.uid);
            const codeMirror = await loadLocalSyncMirror(cloudData?.characterCode || cloudData?.player?.characterCode || '');
            const bootstrapMirror = await loadLocalSyncMirror('local_bootstrap');
            const localMirror = pickFreshestSave(uidMirror, codeMirror, bootstrapMirror);

            const merged = mergeGameSave(localMirror, cloudData);

            applyGameSave(merged);
            setCharacterCodeInput(
              normalizeCharacterCode(
                merged.characterCode || merged.player?.characterCode || '',
              ),
            );

            if (merged.player?.portraitUrl || merged.player?.portraitData || merged.player?.portraitSource) {
              setPlayer(prev => ({
                ...prev,
                portraitUrl: merged.player?.portraitUrl,
                portraitData: merged.player?.portraitData,
                portraitSource: merged.player?.portraitSource,
              } as any));
            }

            if (!merged.player?.name && currentUser.displayName) {
              setPlayer(prev => ({
                ...prev,
                name: currentUser.displayName || prev.name
              }));
            }

            cloudLoadedRef.current = true;
            hydrationRef.current = false;
            latestSaveRef.current = merged;
            saveDirtyRef.current = false;
          })();
        });
      } else {
        hydrationRef.current = false;
        cloudLoadedRef.current = false;
      }
    });

    return () => unsubscribe && unsubscribe();
  }, []);

 const processedCombatEvents = useRef(new Set<string>());

useEffect(() => {
  if (!user?.uid) return;

  setActiveMailOwner(user.uid);
  setMails(getLocalMailInbox(user.uid));

  const unsubscribeMailbox = listenMailbox(user.uid, (messages) => {
    const list = Array.isArray(messages) ? messages : [];

    setMails(list);

    setPlayer((prev) => {
      let nextPlayer: any = {
        ...prev,
        mails: list,
      };

      for (const mail of list) {
        if (
          mail.type !== "combat_event" ||
          processedCombatEvents.current.has(mail.id)
        ) {
          continue;
        }

        processedCombatEvents.current.add(mail.id);

        try {
          const data = JSON.parse(mail.content);

          nextPlayer = {
            ...nextPlayer,
            cultivation: Math.max(
              0,
              nextPlayer.cultivation + (data.cultivation ?? 0)
            ),
            spiritStones: Math.max(
              0,
              nextPlayer.spiritStones + (data.spiritStones ?? 0)
            ),
            stats: {
              ...nextPlayer.stats,
              hp: Math.max(
                0,
                Math.min(
                  nextPlayer.stats.maxHp,
                  nextPlayer.stats.hp + (data.hp ?? 0)
                )
              ),
              mana: Math.max(
                0,
                Math.min(
                  nextPlayer.stats.maxMana,
                  nextPlayer.stats.mana + (data.mana ?? 0)
                )
              ),
            },
          };
        } catch (e) {
          console.warn("combat_event parse failed:", e);
        }
      }

      return nextPlayer;
    });
  });

  return () => {
    unsubscribeMailbox?.();
  };
}, [user?.uid]);

     

   
  // Update presence status to other players in the village
  const playerRef = useRef(player);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      const currentPlayer = playerRef.current;
      const presenceData = {
        isOnline: true,
        lastActive: Date.now(),
        currentActivity:
          activeTab === "meditation"
            ? "thiền định"
            : activeTab === "activities"
              ? "đào mỏ"
              : "nhàn rỗi",
        providerId: user?.providerData?.[0]?.providerId || "google.com",
        isRealUser: true,
      };

      await savePlayerData(
        user.uid,
        { player: { ...currentPlayer, ...presenceData } },
        { syncCloud: false, syncPresence: true },
      );
    };

    updatePresence();
    const presenceTimer = window.setInterval(updatePresence, 30000);

    return () => {
      window.clearInterval(presenceTimer);
      void savePlayerData(
        user.uid,
        {
          player: {
            ...playerRef.current,
            isOnline: false,
            currentActivity: "offline",
            providerId: user?.providerData?.[0]?.providerId || "google.com",
            isRealUser: true,
          },
        },
        { syncCloud: false, syncPresence: true },
      );
    };
  }, [user, activeTab]);

  // Load latest bootstrap mirror on mount as a safe fallback
  useEffect(() => {
    let cancelled = false;

    const hydrateBootstrap = async () => {
      try {
        const saved = await loadLocalSyncMirror('local_bootstrap');
        if (!saved || cancelled) return;

        const elapsedSecs = Math.floor((Date.now() - (saved.lastSavedAt || Date.now())) / 1000);
        const afkGained = elapsedSecs > 15 ? Math.round(Math.min(28800, elapsedSecs) * 0.8) : 0;

        const hydratedSave: GameSave = afkGained > 0
          ? {
              ...saved,
              lastSavedAt: Date.now(),
              player: {
                ...(saved.player as any),
                cultivation: Number((saved.player as any)?.cultivation || 0) + afkGained,
              },
            } as GameSave
          : (saved as GameSave);

        applyGameSave(hydratedSave);
        latestSaveRef.current = hydratedSave;
        saveDirtyRef.current = afkGained > 0;
        if (afkGained > 0) {
          setAfkOfflineGains(afkGained);
          void saveLocalSyncMirror('local_bootstrap', hydratedSave);
        }
      } catch (e) {
        console.warn('Bootstrap mirror load failed:', e);
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    void hydrateBootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Recurrent Auto-save timer every 5 seconds (local mirror) + 7 minutes (cloud flush)
  useEffect(() => {
    if (!user) return;

    const uid = user.uid;
    const pushLocalMirror = () => {
      const snapshot = latestSaveRef.current || buildGameSave();
      if (!saveDirtyRef.current) return;
      void Promise.all([
        saveLocalSyncMirror(uid, snapshot),
        saveLocalSyncMirror('local_bootstrap', snapshot),
      ]);
      saveDirtyRef.current = false;
    };

    const flushCloud = () => {
      const snapshot = latestSaveRef.current || buildGameSave();
      if (!snapshot) return;
      void saveGameToCloud(snapshot, uid);
    };

    pushLocalMirror();
    const localTimer = window.setInterval(pushLocalMirror, 5000);

    const cloudTimer = window.setInterval(flushCloud, 7 * 60 * 1000);

    const onPageHidden = () => {
      if (!document.hidden) return;
      const snapshot = latestSaveRef.current || buildGameSave();
      void Promise.all([
        saveLocalSyncMirror(uid, snapshot),
        saveLocalSyncMirror('local_bootstrap', snapshot),
        hydrationRef.current ? Promise.resolve() : saveGameToCloud(snapshot, uid),
      ]);
    };

    document.addEventListener('visibilitychange', onPageHidden);
    window.addEventListener('pagehide', onPageHidden);

    return () => {
      window.clearInterval(localTimer);
      window.clearInterval(cloudTimer);
      document.removeEventListener('visibilitychange', onPageHidden);
      window.removeEventListener('pagehide', onPageHidden);
    };
  }, [user]);

  const saveGame = async () => {
    const dataToSave = latestSaveRef.current || buildGameSave();
    if (user) {
      await Promise.all([
        saveLocalSyncMirror(user.uid, dataToSave),
        saveLocalSyncMirror('local_bootstrap', dataToSave),
      ]);
      if (!hydrationRef.current) {
        await saveGameToCloud(dataToSave, user.uid);
      }
    }
  };

  const syncToCloud = async () => {
    if (!user) {
      alert('Chỉ đồng bộ đám mây khi đang đăng nhập Google.');
      return;
    }
    if (hydrationRef.current) {
      alert('Dữ liệu đang nạp, thử lại sau ít giây.');
      return;
    }

    setIsSyncing(true);
    try {
      const localMirror = await loadLocalSyncMirror(user.uid);
      const dataToSave = mergeGameSave(localMirror, latestSaveRef.current || buildGameSave());
      await saveGameToCloud(dataToSave, user.uid);
      alert('Đã đồng bộ lên đám mây.');
    } finally {
      setIsSyncing(false);
    }
  };



  useEffect(() => {
    const onBeforeUnload = () => {
      const snapshot = buildGameSave();
      void Promise.all([
        saveLocalSyncMirror('local_bootstrap', snapshot),
        user ? saveLocalSyncMirror(user.uid, snapshot) : Promise.resolve(),
      ]);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [user]);

  const resetGame = async () => {
    if (
      !window.confirm(
        "Ngươi thực sự muốn Tẩy Tủy Chuyển Sinh? Toàn bộ quá trình tu luyện sẽ quay về cát bụi.",
      )
    ) {
      return;
    }

    playSound("failure");

    hydrationRef.current = true;
    cloudLoadedRef.current = false;
    latestSaveRef.current = null;
    saveDirtyRef.current = false;

    // Xóa cloud
    if (user) {
      await savePlayerData(user.uid, {});
    }

    // Xóa toàn bộ local save
    if (user) {
      await clearLocalSyncMirror(user.uid);
    }

    await clearLocalSyncMirror("local_bootstrap");

    // Xóa các key localStorage khác
    localStorage.clear();

    sessionStorage.clear();

    // Reload để app tạo player mặc định
    window.location.replace("/");
  };

  // --- Dynamic Stats calculation engine ---
  // --- Dynamic Stats calculation engine ---
const handleRecalculateStats = () => {
  // console.log("======================================");
  // console.log("RECALCULATE STATS");
  // console.log("======================================");

  const base = { ...DEFAULT_BASE_STATS };
  const realmPower = player.realmIndex * 10 + player.realmLevel;
  const realmFactor = 1 + Math.max(0, realmPower - 1) * 0.12;

  // console.log("DEFAULT_BASE_STATS:", DEFAULT_BASE_STATS);
  // console.log("Base:", base);
  // console.log("Realm Power:", realmPower);
  // console.log("Realm Factor:", realmFactor);

  const nextStats = {
    ...base,
    maxHp: Math.round(base.maxHp * realmFactor),
    maxMana: Math.round(base.maxMana * (1 + Math.max(0, realmPower - 1) * 0.08)),
    atk: Math.round(base.atk * realmFactor),
    def: Math.round(base.def * realmFactor),
  };

  // console.log("Initial Stats:", structuredClone(nextStats));

  // console.log("===== Equipped Items =====");
  // console.log(player.equippedItems);

  Object.entries(player.equippedItems).forEach(([slot, val]) => {
    const item = val as GameItem | null;

  
    if (!item) {
      // console.log("EMPTY");
      return;
    }


    const sourceStats = getEquipmentBaseStats(item);

    // console.log("SourceStats:", sourceStats);

    if (!sourceStats) {
      console.log("NO SOURCE STATS");
      return;
    }

    const enhFactor =
      1 + Math.max(0, item.enhancementLevel || 0) * 0.15;

    let gearAtk = Math.round((sourceStats.atk || 0) * enhFactor);
    let gearDef = Math.round((sourceStats.def || 0) * enhFactor);
    let gearHp = Math.round((sourceStats.maxHp || 0) * enhFactor);
    let gearMana = Math.round((sourceStats.maxMana || 0) * enhFactor);
    let gearCrit = Math.round((sourceStats.crit || 0) * enhFactor);
    let gearEvasion = Math.round((sourceStats.evasion || 0) * enhFactor);

    
    

    if (item.gemSlots) {
      item.gemSlots.forEach((slot) => {
        if (!slot.filled || !slot.gemName) return;

        // console.log("Gem:", slot.gemName);

        if (slot.gemName.includes("Hồng Ngọc")) gearAtk += 50;
        else if (slot.gemName.includes("Lam Ngọc")) gearHp += 300;
        else if (slot.gemName.includes("Tử Ngọc")) gearCrit += 8;
        else if (slot.gemName.includes("Tiên Ngọc Gem")) {
          gearAtk += 80;
          gearHp += 500;
          gearDef += 20;
          gearCrit += 5;
        }
      });
    }

    nextStats.atk += gearAtk;
    nextStats.def += gearDef;
    nextStats.maxHp += gearHp;
    nextStats.maxMana += gearMana;
    nextStats.crit += gearCrit;
    nextStats.evasion += gearEvasion;

    Object.entries(sourceStats).forEach(([statKey, value]) => {
      const key = statKey as keyof BaseStats;

      if (
        ["atk", "def", "maxHp", "maxMana", "crit", "evasion"].includes(key)
      )
        return;

      if (typeof value === "number" && nextStats[key] !== undefined) {
        (nextStats[key] as number) += Number.isInteger(value)
          ? Math.round(value * enhFactor)
          : value * enhFactor;
      }
    });

    // console.log("After Add:", structuredClone(nextStats));
  });

  // console.log("===== Final Before Companion =====");
  // console.log(structuredClone(nextStats));

  companions.forEach((comp) => {
    if (comp.unlocked && comp.active) {
      // console.log("Companion:", comp.name);

      nextStats.atk = Math.round(nextStats.atk * (1 + comp.stars * 0.05));
      nextStats.def = Math.round(nextStats.def * (1 + comp.stars * 0.05));
    }
  });

  
  setPlayer((prev) => {
    

    const oldMaxHp = Math.max(1, prev.stats.maxHp || 1);
    const hpRatio = Math.min(
      1,
      Math.max(0, (prev.stats.hp || oldMaxHp) / oldMaxHp)
    );

    const oldMaxMana = Math.max(1, prev.stats.maxMana || 1);
    const manaRatio = Math.min(
      1,
      Math.max(0, (prev.stats.mana || oldMaxMana) / oldMaxMana)
    );

    return {
      ...prev,
      stats: {
        ...nextStats,
        hp: Math.max(
          1,
          Math.min(nextStats.maxHp, Math.round(nextStats.maxHp * hpRatio))
        ),
        mana: Math.max(
          0,
          Math.min(
            nextStats.maxMana,
            Math.round(nextStats.maxMana * manaRatio)
          )
        ),
      },
    };
  });
};

useEffect(() => {
  handleRecalculateStats();
}, [player.equippedItems, player.realmIndex, player.realmLevel, companions]);

  // Login handler
  const handleLogin = async () => {
    playSound('success');
    const u = await signInWithGoogle();
    if (u) {
      setUser(u);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    playSound('failure');
    await logoutUser();
    setUser(null);
  };

  // Main Authentication Login splash screen if not authenticated
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center font-sans antialiased" id="game_app_host">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-stone-500 uppercase tracking-widest animate-pulse">Khởi tạo đại lộ tiên kiếp...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center font-sans antialiased" id="game_app_host">
        
        {/* Smartphone Viewport Frame */}
        <div className="w-full max-w-md h-screen md:h-[880px] md:rounded-3xl md:border-8 md:border-stone-800 md:shadow-2xl bg-stone-900 flex flex-col justify-center items-center p-8 relative overflow-hidden text-center" id="smartphone_viewframe">
          
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />
          
          {/* Animated solar halo ring */}
          <div className="absolute w-64 h-64 rounded-full bg-cyan-600/10 filter blur-3xl opacity-40 animate-pulse pointer-events-none" />
          
          <div className="space-y-6 z-10">
            <div className="relative inline-block animate-float">
              <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">🧘</span>
              <span className="absolute -bottom-1 -right-1 text-2xl animate-spin-slow">🌀</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400">
                Nghiện Tu Tiên 5.0
              </h1>
              <p className="text-[10px] uppercase font-mono tracking-widest text-stone-500">
                ☁️ TIÊN QUỐC VẠN ĐẠO CLOUD EDITION ☁️
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
              Bước chân vào linh lộ, thiền định bế quan, thám hiểm đào khoáng đan dược thủ công, kề vai sát cánh cùng chư vị đạo hữu đồng môn trong cùng một làng cổ sơ!
            </p>

            <div className="space-y-3 pt-4">
              {/* Main Google Login Trigger */}
              <button
                onClick={handleLogin}
                className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold rounded-full shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                id="google_signin_btn"
              >
                <LogIn size={15} /> ĐĂNG NHẬP BẰNG GOOGLE
              </button>


            </div>

            <span className="text-[8px] text-stone-600 block">
              Dữ liệu được lưu trữ tự động trên đám mây đám mây bảo mật cao của Google.
            </span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
    <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center font-sans antialiased" id="game_app_host">
      
      {/* Smartphone frame container (optimized vertically for phone gameplay layout) */}
      <div className="w-full max-w-md h-screen md:h-[880px] md:rounded-3xl md:border-8 md:border-stone-800 md:shadow-2xl bg-stone-900 flex flex-col overflow-hidden relative" id="smartphone_viewframe">
        
        {/* Ambient background decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/80 z-50 pointer-events-none" />

        {/* 1. Header State Stats HUD bar */}
        <div className="bg-stone-950 border-b border-stone-850 p-3 pt-4 space-y-2.5 shrink-0" id="game_hud_header">
          
          {/* Identity info row */}
          <div className="flex justify-between items-center" id="hud_identity_row">
            <div className="text-left space-y-0.5" id="hud_player_identity">
              <div className="flex items-center gap-1.5" id="hud_title_pair">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-stone-100">{player.name}</span>
              </div>
              <p className="text-[10px] text-cyan-400 font-medium">
                Cảnh giới: <span className="font-bold">{REALMS[player.realmIndex]} - Tầng {player.realmLevel}/10</span>
              </p>
            </div>

            {/* Cloud Sync Status Indicator bubble */}
            <div className="flex items-center gap-1.5 shrink-0" id="cloud_sync_bubble">
              {isSyncing ? (
                <span className="text-[8px] font-mono font-bold text-amber-500 flex items-center gap-1">
                  <CloudLightning size={10} className="animate-spin" /> ĐANG SYNC MÂY
                </span>
              ) : (
                <span className="text-[8px] font-mono font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900/30">
                  <Sparkles size={9} /> CLOUD SYNCED
                </span>
              )}
            </div>
          </div>

          {/* Currencies HUD display */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-stone-300" id="hud_currencies_grid">
            <div className="bg-stone-900/60 p-1 rounded border border-stone-850 flex items-center gap-1 px-1.5 justify-start" title="Vàng">
              <Coins size={12} className="text-yellow-500" />
              <span className="font-bold truncate">{(player.gold ?? 0).toLocaleString()}</span>
            </div>
            <div className="bg-stone-900/60 p-1 rounded border border-stone-850 flex items-center gap-1 px-1.5 justify-start" title="Linh thạch">
              <Gem size={12} className="text-cyan-400" />
              <span className="font-bold truncate">{(player.spiritStones ?? 0).toLocaleString()}</span>
            </div>
            <div className="bg-stone-900/60 p-1 rounded border border-stone-850 flex items-center gap-1 px-1.5 justify-start" title="Tiên ngọc">
              <Sparkles size={12} className="text-amber-400" />
              <span className="font-bold truncate">{(player.immortalJade ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Offline AFK gains popup overlay */}
        {afkOfflineGains !== null && (
          <div className="absolute inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center p-6 text-center space-y-4" id="offline_afk_modal">
            <div className="p-4 bg-stone-900 rounded-full border-2 border-cyan-500 text-cyan-400 animate-bounce" id="offline_icon">
              <Sparkles size={40} />
            </div>
            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider">Cơ Duyên Thiền Định Offline</h3>
            <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
              Thời gian qua ngươi đã bế quan tu luyện dã ngoại tại linh địa dồi dào nguyên khí dã dã. Hệ thống tích lũy cho ngươi:
            </p>
            <div className="bg-stone-950 p-4 rounded-lg border border-stone-850 w-full max-w-xs" id="afk_gain_box">
              <span className="text-cyan-400 font-mono text-base font-bold">+{(afkOfflineGains ?? 0).toLocaleString()} Tu Vi</span>
            </div>
            <button
              onClick={() => { playSound('success'); setAfkOfflineGains(null); }}
              className="bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold px-8 py-2.5 rounded text-xs active:scale-95 transition-all"
            >
              LĨNH NGỘ VÀ PHI THĂNG
            </button>
          </div>
        )}

        {/* 2. Main Tab View host (Screen display area) */}
        <div className="flex-1 overflow-y-auto bg-stone-900/30 scrollbar-none pb-20" id="main_tab_viewport">
          
          {/* Tab: MEDITATION (Thiền Định - Giao diện chính ngồi thiền định) */}
          {activeTab === 'meditation' && (
            <MeditationScreen
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              onSave={saveGame}
              onUpdateStats={handleRecalculateStats}
            />
          )}

          {/* Tab: ACTIVITIES (Các hoạt động thủ công nhận Linh Thạch dã dã) */}
          {activeTab === 'activities' && (
            <ActivitiesMenu
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              onSave={saveGame}
            />
          )}

          {/* Tab: VILLAGE (Làng Tông Môn - Connect các chơi vào đúng làng luôn nha) */}
          {activeTab === 'village' && (
            <VillageMap
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              skills={skills}
              setSkills={setSkills}
              currentMapId={currentMapId}
              setCurrentMapId={setCurrentMapId}
              activeQuests={activeQuests}
              setActiveQuests={setActiveQuests}
              user={user}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Tab: CHARACTER (Nhân Vật) */}
          {activeTab === 'character' && (
            <CharacterSheet
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              skills={skills}
              setSkills={setSkills}
              onUpdateStats={handleRecalculateStats}
            />
          )}

          {/* Tab: FORGE (Lò Luyện đan/luyện khí) */}
          {activeTab === 'forge' && (
            <AlchemyMenu
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              alchemyLevel={alchemyLevel}
              setAlchemyLevel={setAlchemyLevel}
              alchemyExp={alchemyExp}
              setAlchemyExp={setAlchemyExp}
              craftingLevel={craftingLevel}
              setCraftingLevel={setCraftingLevel}
              craftingExp={craftingExp}
              setCraftingExp={setCraftingExp}
            />
          )}

          {/* Tab: COMPANIONS (Đồng hành) */}
          {activeTab === 'companions' && (
            <CompanionMenu
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              companions={companions}
              setCompanions={setCompanions}
              spiritBeasts={spiritBeasts}
              setSpiritBeasts={setSpiritBeasts}
              onUpdateStats={handleRecalculateStats}
            />
          )}

          {/* Tab: SECT (Tông Môn) */}
          {activeTab === 'sect' && (
            <SectMenu
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              sectId={sectId}
              setSectId={setSectId}
              sectLevel={sectLevel}
              setSectLevel={setSectLevel}
              skills={skills}
              setSkills={setSkills}
            />
          )}

          {/* Tab: DUNGEON (Bí Cảnh) */}
          {activeTab === 'dungeon' && (
            <DungeonMenu
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
            />
          )}

          {/* Tab: ARENA (Đấu Trường) */}
          {activeTab === 'arena' && (
            <PvPMenu
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              arenaRank={arenaRank}
              setArenaRank={setArenaRank}
            />
          )}

          {/* Tab: SYSTEM AI (Hệ thống) */}
          {activeTab === 'system' && (
            <SystemCompanion
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              luckySpinCount={luckySpinCount}
              setLuckySpinCount={setLuckySpinCount}
              claimedCodes={claimedCodes}
              setClaimedCodes={setClaimedCodes}
            />
          )}

          {/* Tab: AUCTION (Đấu Giá) */}
          {activeTab === 'auction' && (
            <AuctionHouse
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
            />
          )}

          {activeTab === 'community' && (
            <CommunityMenu
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
            />
          )}

          {/* Tab: GUIDE (Hướng Dẫn) */}
          {activeTab === 'guide' && (
            <div className="p-4 text-left space-y-4 text-stone-200" id="tab_view_guide">
              <h3 className="text-sm font-black text-stone-100 uppercase border-b border-stone-850 pb-2">Hướng Dẫn Tóm Tắt</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-black text-cyan-300 uppercase">Thiền Định</p>
                  <p className="text-[11px] text-stone-300 leading-relaxed">Tu luyện thủ công, tự động, nhận tu vi ngoại tuyến và đột phá cảnh giới theo mốc.</p>
                </div>
                <div className="bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-black text-emerald-300 uppercase">Lò Luyện</p>
                  <p className="text-[11px] text-stone-300 leading-relaxed">Luyện đan, rèn khí, tinh luyện trang bị, tự động dừng khi hết nguyên liệu.</p>
                </div>
                <div className="bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-black text-amber-300 uppercase">Trang Bị & Chỉ Số</p>
                  <p className="text-[11px] text-stone-300 leading-relaxed">Chỉ số cộng dồn theo trang bị, phẩm chất và cường hóa, hiển thị theo trạng thái online mới nhất.</p>
                </div>
                <div className="bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-black text-pink-300 uppercase">Hòm Thư</p>
                  <p className="text-[11px] text-stone-300 leading-relaxed">Nhận thông báo hệ thống, thư giao dịch, PK, tông môn và tin nhắn được đẩy sang Zalo nếu bật webhook.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: SETTINGS (Cài đặt) */}
          {activeTab === 'settings' && (
            <div className="p-4 text-left space-y-4 text-stone-200" id="tab_view_settings">
              <h3 className="text-sm font-black text-stone-100 uppercase border-b border-stone-850 pb-2">Thiết Lập Kỳ Linh</h3>
              
              {/* Account profile cloud sync display */}
              <div className="bg-stone-900 border border-stone-800 p-3 rounded-lg text-xs space-y-2" id="settings_profile_recap">
                <p className="text-stone-400 font-bold uppercase flex items-center gap-1.5">
                  <Sun size={12} className="text-amber-500 animate-pulse" /> Trạng thái đám mây (Cloud Sync)
                </p>
                <div className="space-y-1 text-stone-300">
                  <p>• Trạng thái: <span className={user ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>{user ? "Đã đồng bộ Cloud" : "Chưa đăng nhập"}</span></p>
                  <p>• Google Email: <span className="text-stone-400 font-mono text-[11px]">{user ? user.email : "Chưa đăng nhập"}</span></p>
                  <p>• Danh vọng: <span className="text-cyan-400 font-bold">{player.reputation}</span> điểm</p>
                  <p>• Mã hiện tại: <span className="text-amber-300 font-mono text-[11px]">{normalizeCharacterCode(characterCodeInput || player.characterCode || '') || 'Chưa đặt'}</span></p>
                </div>

                {user ? (
                  <button
                    onClick={async () => { playSound('failure'); await logoutUser(); }}
                    className="mt-2 text-[10px] font-black px-2.5 py-1 bg-red-950/40 border border-red-900/40 text-red-400 rounded hover:bg-red-900/20 active:scale-95 transition-all"
                  >
                    Đăng xuất Đạo hữu
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const loggedIn = await signInWithGoogle();
                      if (loggedIn) {
                        alert("Đăng nhập Google thành công! Gia nhập tiên cảnh!");
                      }
                    }}
                    className="mt-2 text-[10px] font-black px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-stone-950 rounded hover:from-cyan-500 active:scale-95 transition-all"
                  >
                    Đăng nhập Google Cloud
                  </button>
                )}
              </div>

              {/* Mã nhân vật & đồng bộ dữ liệu cũ */}
              <div className="bg-stone-900 border border-stone-800 p-3 rounded-lg text-xs space-y-2" id="settings_character_code_box">
                <p className="text-stone-400 font-bold uppercase flex items-center gap-1.5">
                  <FileText size={12} className="text-cyan-400" /> Đồng bộ mã nhân vật
                </p>
                <input
                  value={characterCodeInput}
                  onChange={(e) => setCharacterCodeInput(e.target.value)}
                  placeholder="Nhập mã nhân vật cũ của bạn"
                  className="w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-[11px] outline-none text-stone-200 placeholder:text-stone-600 font-mono"
                />
                <button
                  onClick={handleCharacterCodeSync}
                  className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-black text-[11px] active:scale-95 transition-all"
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Đang đồng bộ...' : 'Kết nối & tải dữ liệu theo mã'}
                </button>
                <p className="text-[10px] text-stone-500 leading-relaxed">Nhập đúng mã cũ để tải lại dữ liệu đã lưu. Nếu mã chưa có dữ liệu, hệ thống sẽ gắn mã đó vào hồ sơ hiện tại.</p>
                {characterCodeMessage ? <p className="text-[10px] text-emerald-400 font-semibold">{characterCodeMessage}</p> : null}
              </div>

              {/* Hòm thư thông báo */}
              <div className="bg-stone-900 border border-stone-800 p-3 rounded-lg space-y-2" id="settings_mailbox_box">
                <p className="text-stone-400 font-bold uppercase flex items-center gap-1.5">
                  <Mail size={12} className="text-pink-400" /> Hòm thư hệ thống ({((player as any).mails || mails).filter((m: any) => !m.read).length})
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {((player as any).mails || mails).slice(0, 8).map((mail: any) => (
                    <div key={mail.id} className={`p-2 rounded-lg border text-[10px] ${mail.read ? 'bg-stone-950 border-stone-850 text-stone-500' : 'bg-stone-950 border-pink-900/40 text-stone-200'}`}>
                      <div className="flex justify-between gap-2">
                        <span className="font-bold text-pink-400">{mail.title}</span>
                        <span className="text-[9px] text-stone-500">{(new Date(mail.createdAt) ?? new Date()).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-line leading-relaxed">{mail.content}</p>
                    </div>
                  ))}
                  {((player as any).mails || mails).length === 0 && (
                    <p className="text-[10px] text-stone-500">Chưa có thông báo nào.</p>
                  )}
                </div>
              </div>

              {/* Database and save actions */}
              <div className="space-y-2" id="settings_actions_list">
                <p className="text-[10px] text-stone-500 font-bold uppercase">Hệ Thống Dữ Liệu Lưu Trữ (Durable Storage):</p>
                
                <button
                  onClick={() => { playSound('success'); syncToCloud(); }}
                  className="w-full py-2.5 bg-stone-800 hover:bg-stone-750 rounded border border-stone-700 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <Save size={14} className="text-green-400" /> ĐỒNG BỘ ĐÁM MÂY (MANUAL CLOUD SYNC)
                </button>

                <button
                  onClick={resetGame}
                  className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/40 rounded border border-red-900/30 text-xs font-bold text-red-400 flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <RefreshCw size={14} className="text-red-400" /> TẨY TỦY CHUYỂN SINH (HARD RESET STATE)
                </button>
              </div>

              {/* Game Credits credits card */}
              <div className="bg-stone-950 p-3.5 border border-stone-900 rounded-lg text-[10px] text-stone-500 space-y-1" id="game_credits_card">
                <p className="text-amber-500/80 font-bold uppercase">Nghiện Tu Tiên 5.0 - Bản Thần Bản</p>
                <p>© 2026 Nghiện Tu Tiên Studio. Tối ưu hóa mượt mà cho trải nghiệm màn hình dọc di động 60FPS.</p>
                <p>Mật chú, thần thú hộ vệ, đan dược, rèn kiếm rồng phượng nạm ngọc.</p>
              </div>
            </div>
          )}

        </div>

        {/* 3. Global Bottom Navigation Tab Bar (Mobile Smartphone-like rails) */}
        <div className="absolute bottom-0 left-0 w-full bg-stone-950 border-t border-stone-850 grid grid-cols-5 py-2.5 px-1 shrink-0 z-40" id="global_tab_bar">
          
          <button
            onClick={() => { playSound('click'); setActiveTab('meditation'); }}
            className={`flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all ${
              activeTab === 'meditation' ? 'text-amber-500 font-bold' : 'text-stone-500 hover:text-stone-400'
            }`}
            id="tab_nav_meditation"
          >
            <Moon size={18} className={activeTab === 'meditation' ? 'animate-spin-slow' : ''} />
            <span className="text-[8px] font-bold">Thiền Định</span>
          </button>

          <button
            onClick={() => { playSound('click'); setActiveTab('activities'); }}
            className={`flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all ${
              activeTab === 'activities' ? 'text-amber-500 font-bold' : 'text-stone-500 hover:text-stone-400'
            }`}
            id="tab_nav_activities"
          >
            <Hammer size={18} />
            <span className="text-[8px] font-bold">Hoạt Động</span>
          </button>

          <button
            onClick={() => { playSound('click'); setActiveTab('village'); }}
            className={`flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all ${
              activeTab === 'village' ? 'text-amber-500 font-bold' : 'text-stone-500 hover:text-stone-400'
            }`}
            id="tab_nav_village"
          >
            <Users size={18} />
            <span className="text-[8px] font-bold">Làng Chung</span>
          </button>

          <button
            onClick={() => { playSound('click'); setActiveTab('character'); }}
            className={`flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all ${
              activeTab === 'character' ? 'text-amber-500' : 'text-stone-500 hover:text-stone-400'
            }`}
            id="tab_nav_character"
          >
            <BookOpen size={18} />
            <span className="text-[8px] font-bold">Nhân Vật</span>
          </button>

          {/* Nested Drawer overlay trigger for remaining menus */}
          <div className="relative flex flex-col items-center justify-center" id="nested_drawer_tab">
            <button
              onClick={() => { playSound('click'); setShowMoreMenu(!showMoreMenu); }}
              className={`flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all ${
                ['sect', 'forge', 'companions', 'dungeon', 'arena', 'system', 'settings', 'guide'].includes(activeTab) 
                  ? 'text-amber-500' 
                  : 'text-stone-500 hover:text-stone-400'
              }`}
              id="tab_nav_more"
            >
              <Menu size={18} />
              <span className="text-[8px] font-bold">Menu</span>
            </button>

            {/* Click popup flyout menu */}
            <div className={`absolute bottom-11 right-1/2 translate-x-1/2 bg-stone-950 border border-stone-800 p-1.5 rounded-lg shadow-xl transition-all duration-200 z-50 flex flex-col gap-1 w-32 ${
              showMoreMenu 
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
            }`} id="more_flyout_panel">
              <button
                onClick={() => { playSound('click'); setActiveTab('forge'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                <Hammer size={12} className="text-emerald-400" /> Lò Luyện
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('companions'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                <Users size={12} className="text-cyan-400" /> Đồng Hành
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('sect'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                <Users size={12} className="text-amber-500" /> Tông Môn
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('dungeon'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                <Compass size={12} className="text-cyan-400" /> Bí Cảnh
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('arena'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                <Swords size={12} className="text-red-500" /> Đấu Trường
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('system'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                <Cpu size={12} className="text-purple-400" /> Hệ Thống
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('community'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white"
              >
                <Users size={12} className="text-pink-400" /> Cộng Đồng
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('guide'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white border-t border-stone-900 mt-1"
              >
                <BookOpen size={12} className="text-cyan-300" /> Hướng Dẫn
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('auction'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white border-t border-stone-900 mt-1"
              >
                <Gavel size={12} className="text-amber-400" /> Đấu Giá
              </button>
              <button
                onClick={() => { playSound('click'); setActiveTab('settings'); setShowMoreMenu(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-900 text-[10px] font-bold flex items-center gap-1.5 text-stone-300 hover:text-white border-t border-stone-900 mt-1"
              >
                <FileText size={12} className="text-stone-400" /> Cài Đặt
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  if (confirm('Đạo hữu có chắc muốn thoát trò chơi? (Nếu chơi trên web, tab sẽ được đóng)')) {
                    window.close(); // For browser tabs
                  }
                  setShowMoreMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-red-950/40 text-[10px] font-bold flex items-center gap-1.5 text-red-400 hover:text-red-300 border-t border-stone-900 mt-1"
              >
                <LogOut size={12} className="text-red-500" /> Thoát Web
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Beautiful custom animated Toast alert system overlay */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-[340px] px-4 pointer-events-none" id="custom_toast_container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`p-3 rounded-xl border shadow-xl flex items-start gap-2.5 pointer-events-auto bg-stone-950/95 backdrop-blur-md ${
                toast.type === 'success'
                  ? 'border-emerald-500/40 text-emerald-400'
                  : toast.type === 'error'
                    ? 'border-red-500/40 text-red-400'
                    : 'border-cyan-500/40 text-cyan-400'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <span className="text-sm">✨</span>}
                {toast.type === 'error' && <span className="text-sm">⚠️</span>}
                {toast.type === 'info' && <span className="text-sm">🔮</span>}
              </div>
              <div className="flex-1 text-[10px] sm:text-xs font-semibold leading-relaxed text-stone-200">
                {toast.message}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-stone-500 hover:text-stone-300 transition-colors text-[10px] px-1 cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
    </ConfirmProvider>
  );
}
