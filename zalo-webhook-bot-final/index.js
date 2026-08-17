const {
  GAME_SHOP_ITEMS,
  CULTIVATION_REALMS,
  SCENARIOS,
  ACTION_TEXT,
  TREASURE_TABLE,
} = require("./data");

const express = require("express");
const dotenv = require("dotenv");
const { Chess } = require("chess.js");
const activeChess = new Map(); // chat_id -> Chess room

const CHESS_PIECES = {
  w: { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" },
  b: { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" },
};

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

// AI (Gemini)
const AI_ENABLED =
  String(process.env.AI_ENABLED || "true").toLowerCase() === "true";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const AUTO_AI = String(process.env.AUTO_AI || "true").toLowerCase() === "true";

const MAX_REPLY_LENGTH = 50000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

let totalMessages = 0;

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

let db = null;

try {
  const serviceAccount = require("./firebase-service-account.json");
  initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore();
  console.log("✅ Đã kết nối Firebase Firestore.");
} catch (err) {
  console.error("❌ Lỗi Firebase (Sẽ dùng RAM tạm thời):", err.message);
}

const memoryStore = new Map();
const activeBosses = new Map(); // chat_id -> Boss Data
const activeXO = new Map(); // chat_id -> XO Data

const Database = {
  async getProfile(key) {
    if (db) {
      try {
        const doc = await db.collection("game_profiles").doc(key).get();
        if (doc.exists) return doc.data();
      } catch (e) {
        console.error("Lỗi đọc Firebase:", e);
      }
    }
    return memoryStore.get(key) || null;
  },
  async saveProfile(key, data) {
    memoryStore.set(key, data);
    if (db) {
      try {
        await db.collection("game_profiles").doc(key).set(data);
      } catch (e) {
        console.error("Lỗi ghi Firebase:", e);
      }
    }
  },
  async deleteProfile(key) {
    memoryStore.delete(key);
    if (db) {
      try {
        await db.collection("game_profiles").doc(key).delete();
      } catch (e) {
        console.error("Lỗi xóa Firebase:", e);
      }
    }
  },
  async getAllProfiles() {
    let all = [];
    if (db) {
      try {
        const snap = await db.collection("game_profiles").get();
        snap.forEach((doc) => all.push(doc.data()));
        return all;
      } catch (e) {
        console.error("Lỗi lấy ds Firebase:", e);
      }
    }
    return Array.from(memoryStore.values());
  },
};

// --- AUTO GENERATE 50 ITEMS PER CATEGORY ---
(function generateItems() {
  const prefixes = [
    "Huyền",
    "Thiên",
    "Địa",
    "Linh",
    "Thánh",
    "Ma",
    "Thần",
    "Yêu",
    "Quỷ",
    "Huyết",
    "Băng",
    "Hỏa",
    "Lôi",
    "Phong",
    "Ám",
    "Quang",
  ];
  const danSuffixes = ["Đan", "Tán", "Dịch", "Hương", "Châu"];
  const vuKhiSuffixes = [
    "Kiếm",
    "Đao",
    "Thương",
    "Côn",
    "Trượng",
    "Giáp",
    "Thuẫn",
    "Khôi",
    "Nhẫn",
  ];
  const congPhapSuffixes = [
    "Quyết",
    "Công",
    "Pháp",
    "Điển",
    "Chân Kinh",
    "Bí Lục",
  ];
  const khacSuffixes = [
    "Phù",
    "Trận Bàn",
    "Lệnh Bài",
    "La Bàn",
    "Ngọc Giản",
    "Bình",
    "Chậu",
  ];

  function rnd(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  for (let i = 0; i < 1; i++) {
    // Đan dược
    let danId = `gen-dan-${i}`;
    let pPrice = (i + 1) * 200;
    GAME_SHOP_ITEMS[danId] = {
      type: "dan",
      name: `${rnd(prefixes)} ${rnd(danSuffixes)} Bậc ${i + 1}`,
      emoji: "💊",
      price: pPrice,
      effect: `+${(i + 1) * 5} Linh khí, +${(i + 1) * 2} Máu`,
      desc: "Đan dược thượng thừa",
      stats: { linhKhi: (i + 1) * 5, hp_bonus: (i + 1) * 2 },
    };
    // Vũ khí
    let vkId = `gen-vk-${i}`;
    GAME_SHOP_ITEMS[vkId] = {
      type: "trang-bi",
      name: `${rnd(prefixes)} ${rnd(vuKhiSuffixes)} Bậc ${i + 1}`,
      emoji: "⚔️",
      price: pPrice * 2,
      effect: `+${(i + 1) * 4} Sức, +${(i + 1) * 3} Thủ`,
      stats: { power: (i + 1) * 4, defense: (i + 1) * 3 },
    };
    // Công pháp
    let cpId = `gen-cp-${i}`;
    GAME_SHOP_ITEMS[cpId] = {
      type: "cong-phap",
      name: `${rnd(prefixes)} ${rnd(congPhapSuffixes)} Bậc ${i + 1}`,
      emoji: "📜",
      price: pPrice * 5,
      effect: `Học: +${(i + 1) * 10} HP, +${(i + 1) * 5} Sức`,
      desc: "Công pháp hiếm có",
      stats: { hp_bonus: (i + 1) * 10, power: (i + 1) * 5 },
    };
    // Khác
    let khacId = `gen-khac-${i}`;
    GAME_SHOP_ITEMS[khacId] = {
      type: "khac",
      name: `${rnd(prefixes)} ${rnd(khacSuffixes)} Bậc ${i + 1}`,
      emoji: "📦",
      price: pPrice,
      effect: "Vật dụng hỗ trợ",
      desc: "Bảo vật kỳ lạ",
    };
  }
})();

// Utils
function normalizeText(text) {
  return typeof text === "string"
    ? text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
    : "";
}
function getIncomingSecret(req) {
  return req.headers["x-bot-api-secret-token"] || "";
}
function unwrapResult(body) {
  return body?.result || body?.data?.result || body;
}
function extractChatId(body) {
  const m = unwrapResult(body)?.message || body?.message || body?.data?.message;
  return (
    m?.chat?.id || m?.chat_id || body?.chat_id || body?.data?.chat_id || null
  );
}
function extractText(body) {
  const m = unwrapResult(body)?.message || body?.message || body?.data?.message;
  return m?.text || body?.text || body?.data?.text || null;
}
function extractSenderName(body) {
  const m = unwrapResult(body)?.message || body?.message;
  return (
    m?.from?.display_name ||
    m?.from?.name ||
    body?.from?.display_name ||
    "Đạo Hữu"
  );
}

function extractSenderId(body) {
  const m = unwrapResult(body)?.message || body?.message;
  return (
    m?.from?.id || m?.from?.user_id || body?.sender_id || body?.from?.id || null
  );
}
function stripBotMentions(text) {
  let out = normalizeText(text);
  const patterns = [
  /@?bot\s*skibidi\s*gemini[\s,.:;!?-]*/gi,
  /@?bot\s*nghi[eệ]n\s*tu\s*ti[eê]n[\s,.:;!?-]*/gi,
];
  for (const re of patterns) out = out.replace(re, " ");
  return out.replace(/\s+/g, " ").trim();
}
function formatReplyForSender(senderName, text) {
  return `✨ TRUYỀN ÂM ĐẾN ${senderName} ✨\n━━━━━━━━━━━━━━━━\n${text}`;
}
function getRandomMsg(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function slugifyMaNvBase(name) {
  const base = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "user").slice(0, 12);
}

function randomFriendSuffix(len = 4) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generateFriendCode(name) {
  const base = slugifyMaNvBase(name);
  const all = await Database.getAllProfiles();
  const used = new Set(
    all.map((p) => String(p.maNv || "").toLowerCase()).filter(Boolean),
  );

  let code = "";
  do {
    code = `${base}-${randomFriendSuffix(4)}`;
  } while (used.has(code));

  return code;
}

function extractMentionName(text) {
  const raw = normalizeText(text);
  if (!raw) return null;

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  const token = parts[1].replace(/^@+/, "").trim().toLowerCase();
  if (!token) return null;

  // Chặn lệnh đánh số và nước đi cờ vua
  if (/^\d+$/.test(token)) return null;
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(token)) return null;

  return token;
}

function normalizeLookupToken(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseSlashCommand(text) {
  const raw = normalizeText(text);
  if (!raw.startsWith("/")) return null;

  const parts = raw.split(/\s+/).filter(Boolean);
  const cmd = (parts[0] || "").toLowerCase();
  const args = parts.slice(1);

  return { cmd, args, raw };
}

function extractTargetToken(text) {
  const raw = normalizeText(text);
  if (!raw) return null;

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  // lấy toàn bộ phần sau command
  const target = parts.slice(1).join(" ").replace(/^@+/, "").trim();
  if (!target) return null;

  if (/^\d+$/.test(target)) return null;
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(target)) return null;

  return target.toLowerCase();
}

async function findProfileByName(token) {
  const key = String(token || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (!key) return null;

  const allProfiles = await Database.getAllProfiles();
  return (
    allProfiles.find((p) => String(p.maNv || "").toLowerCase() === key) ||
    allProfiles.find((p) => String(p.name || "").toLowerCase() === key) ||
    null
  );
}



async function notifyPlayer(profile, text, currentChatId = null) {
  if (!profile?.lastChatId || !text) return;
  if (
    currentChatId !== null &&
    String(profile.lastChatId) === String(currentChatId)
  )
    return;
  await sendMessage(profile.lastChatId, text);
}

// Hệ thống Linh Thạch
function formatLT(amount) {
  if (amount <= 0) return "0 Linh Thạch 💎";
  return `${Number(amount).toLocaleString("vi-VN")} Linh Thạch 💎`;
}

async function sendMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return null;
  try {
    await fetch(
      `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: String(chatId),
          text: String(text || ""),
        }),
      },
    );
  } catch (err) {
    console.error("Lỗi sendMessage:", err);
  }
}

async function sendChatAction(chatId, action = "typing") {
  if (!BOT_TOKEN || !chatId) return null;
  try {
    await fetch(
      `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendChatAction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: String(chatId), action }),
      },
    );
  } catch (err) {}
}

async function sendLongMessage(chatId, text) {
  const src = normalizeText(text);
  if (!src) return;
  const chunks = [];
  let remaining = src;
  while (remaining.length > MAX_REPLY_LENGTH) {
    let cut = remaining.lastIndexOf("\n", MAX_REPLY_LENGTH);
    if (cut < 100) cut = MAX_REPLY_LENGTH;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  for (const chunk of chunks) await sendMessage(chatId, chunk);
}

// ===============================
// HÀM PHỤ KIẾM LINH THẠCH MỚI
// ===============================
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function ensureCooldown(profile, key) {
  if (!profile.cooldowns) profile.cooldowns = {};
  if (profile.cooldowns[key] === undefined) profile.cooldowns[key] = 0;
}

function canUseAction(profile, key, now) {
  ensureCooldown(profile, key);
  return profile.cooldowns[key] <= now;
}

function setActionCooldown(profile, key, now, ms) {
  ensureCooldown(profile, key);
  profile.cooldowns[key] = now + ms;
}

function addMoney(profile, min, max, bonus = 0) {
  const gain = randInt(min, max) + Math.max(0, Math.floor(bonus));
  profile.money += gain;
  return gain;
}

function addXp(profile, min, max) {
  const gain = randInt(min, max);
  profile.exp += gain;
  return gain;
}

function formatCd(msLeft) {
  return `${formatTime(Math.ceil(msLeft / 1000))}`;
}

// Logic Level
function getNextLevelExp(level) {
  const realm = Math.floor((level - 1) / 10);
  const tier = ((level - 1) % 10) + 1;

  const realmBase = [
    100, 2000, 15000, 80000, 300000, 1000000, 3000000, 10000000,
  ];

  const base = realmBase[Math.min(realm, realmBase.length - 1)];

  return Math.floor(base * Math.pow(1.35, tier - 1));
}
function isBreakthroughPoint(level) {
  return level % 10 === 0;
}

function getRealmInfo(level) {
  let remaining = Math.max(1, Number(level) || 1);
  for (const realm of CULTIVATION_REALMS) {
    if (remaining <= realm.tiers)
      return { name: `${realm.name} Tầng ${remaining}`, emoji: realm.emoji };
    remaining -= realm.tiers;
  }
  const last = CULTIVATION_REALMS[CULTIVATION_REALMS.length - 1];
  return { name: `${last.name} Viên Mãn`, emoji: last.emoji };
}

async function getOrCreateProfile(chatId, senderId, senderName) {
  const key = senderId
    ? `user:${senderId}`
    : `chat:${chatId}:${normalizeText(senderName).toLowerCase()}`;
  let profile = await Database.getProfile(key);
  if (!profile) {
    profile = {
      key,
      name: senderName,
      maNv: await generateFriendCode(senderName),
      lastChatId: chatId,
      money: 1000,
      linhKhi: 100,
      hp: 100,
      max_hp: 100,
      materials: { ore: 0, herb: 0 },
      exp: 0,
      level: 1,
      pendingTribulation: false,
      power: 5,
      defense: 5,
      luck: 5,
      agility: 5,
      charisma: 5,
      xpRate: 0,
      inventory: {},
      equippedCongPhap: [],
      farm: {
        slots: [
          { seed: null, plantedAt: 0, readyAt: 0 },
          { seed: null, plantedAt: 0, readyAt: 0 },
          { seed: null, plantedAt: 0, readyAt: 0 },
        ],
        maxSlots: 3,
      },
      cultivation: { active: false, startTime: 0 },
      cooldowns: {
        mine: 0,
        farm: 0,
        cauca: 0,
        work: 0,
        rob: 0,
        pk: 0,
        songtu: 0,

        daily: 0,
        quest: 0,
        patrol: 0,
        delivery: 0,
        hunt: 0,
        gather: 0,
        salvage: 0,
        treasure: 0,
        escort: 0,
        trade: 0,
        pray: 0,
      },
      itemBonuses: {},
      lastActionAt: Date.now(),
    };
  } else {
    profile.name = senderName;
    profile.lastChatId = chatId;
    if (!profile.maNv)
      profile.maNv = await generateFriendCode(profile.name || senderName);
    // Migrate Nông Trại cũ sang phiên bản nhiều ô
    if (!profile.farm || !profile.farm.slots) {
      const oldSeed = profile.farm?.seed;
      const oldPlant = profile.farm?.plantedAt || 0;
      const oldReady = profile.farm?.readyAt || 0;
      profile.farm = {
        slots: [
          { seed: oldSeed, plantedAt: oldPlant, readyAt: oldReady },
          { seed: null, plantedAt: 0, readyAt: 0 },
          { seed: null, plantedAt: 0, readyAt: 0 },
        ],
        maxSlots: 3,
      };
    }
    if (!profile.materials)
      profile.materials = { ore: profile.ore || 0, herb: 0 };
    if (!profile.equippedCongPhap) profile.equippedCongPhap = [];
    if (!profile.hp) {
      profile.hp = 100;
      profile.max_hp = 100;
    }
    if (profile.pendingTribulation === undefined)
      profile.pendingTribulation = false;
    if (!profile.itemBonuses) profile.itemBonuses = {};
  }
  return profile;
}

function applyItemEffect(profile, itemId, amount, direction = 1) {
  const item = GAME_SHOP_ITEMS[itemId];
  if (!item || !item.stats || item.type === "cong-phap") return;
  const sign = direction >= 0 ? 1 : -1;
  profile.power += (item.stats.power || 0) * amount * sign;
  profile.defense += (item.stats.defense || 0) * amount * sign;
  profile.luck += (item.stats.luck || 0) * amount * sign;
  profile.agility += (item.stats.agility || 0) * amount * sign;
  profile.charisma += (item.stats.charisma || 0) * amount * sign;
  if (item.stats.linhKhi) profile.linhKhi += item.stats.linhKhi * amount * sign;
  if (item.stats.hp_bonus)
    profile.max_hp += item.stats.hp_bonus * amount * sign;
}

function grantItem(profile, itemId, amount = 1) {
  const item = GAME_SHOP_ITEMS[itemId];
  if (!item) return;

  const prev = profile.inventory[itemId] || 0;
  profile.inventory[itemId] = prev + amount;

  // Vũ khí / trang bị chỉ cộng 1 lần, không stack theo số lượng
  if (item.type === "trang-bi") {
    profile.itemBonuses ??= {};
    if (!profile.itemBonuses[itemId]) {
      profile.itemBonuses[itemId] = true;
      applyItemEffect(profile, itemId, 1, 1);
    }
    return;
  }

  applyItemEffect(profile, itemId, amount, 1);
}

function removeItemEffect(profile, itemId, amount = 1) {
  const item = GAME_SHOP_ITEMS[itemId];
  if (!item) return;

  // Nếu là trang bị thì chỉ gỡ bonus khi hết hẳn item đó trong túi
  if (item.type === "trang-bi") {
    const left = profile.inventory[itemId] || 0;
    if (left <= 0) {
      profile.itemBonuses ??= {};
      if (profile.itemBonuses[itemId]) {
        applyItemEffect(profile, itemId, 1, -1);
        delete profile.itemBonuses[itemId];
      }
    }
    return;
  }

  applyItemEffect(profile, itemId, amount, -1);
}

function isAdminUser(senderName) {
  return (
    String(senderName || "")
      .trim()
      .toLowerCase() === "dienkon"
  );
}

function calcRealtimeCultivation(profile) {
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

function stopCultivation(profile) {
  if (!profile.cultivation?.active) return null;
  const calc = calcRealtimeCultivation(profile);
  if (calc.secs < 10) {
    profile.cultivation.active = false;
    return {
      ok: false,
      message: "🛑 Ngồi chưa nóng chỗ đã xuất quan, tu vi không tăng tiến.",
    };
  }
  profile.exp += calc.xp;
  profile.linhKhi += calc.linhKhi;
  profile.cultivation.active = false;
  return {
    ok: true,
    xp: calc.xp.toFixed(2),
    linhKhi: calc.linhKhi,
    secs: calc.secs,
  };
}

async function checkLevelUp(profile, chatId) {
  let leveledUp = false;
  let tribulationSummary = [];

  while (profile.exp >= getNextLevelExp(profile.level)) {
    if (isBreakthroughPoint(profile.level)) {
      let winRate =
        30 +
        profile.defense * 0.5 +
        profile.luck * 1 +
        profile.agility * 0.5 -
        profile.level * 1.5;
      winRate = Math.max(10, Math.min(95, winRate));

      if (Math.random() * 100 <= winRate) {
        profile.pendingTribulation = false;
        profile.exp -= getNextLevelExp(profile.level);
        profile.level += 1;
        profile.power += 5;
        profile.defense += 5;
        profile.max_hp += 50;
        profile.hp = profile.max_hp;
        tribulationSummary.push(
          `✅ Vượt thiên kiếp cấp ${profile.level - 1} thành công! Thưởng: +5 Sức/Thủ, +50 HP.`,
        );
      } else {
        profile.hp = 1;
        profile.exp = Math.max(0, profile.level - 1);
        tribulationSummary.push(
          `💀 Bị lôi kiếp đánh trọng thương ở cấp ${profile.level}, Bị giáng cấp.`,
        );
      }
    } else {
      profile.exp -= getNextLevelExp(profile.level);
      profile.level += 1;
      profile.money += 200; // Thưởng 200 Linh Thạch
      profile.power += 2;
      profile.defense += 2;
      profile.max_hp += 20;
      profile.hp = profile.max_hp;
      leveledUp = true;
    }
  }

  if (leveledUp) {
    const realm = getRealmInfo(profile.level);
    await sendLongMessage(
      chatId,
      `🎇 ĐỘT PHÁ THÀNH CÔNG 🎇\n\nChúc mừng ${profile.name} tiến vào: ${realm.emoji} ${realm.name}\n🎁 Thưởng: 200 Linh Thạch, +20 Max HP, +2 Sức/Thủ.`,
    );
  }

  if (tribulationSummary.length > 0) {
    // Chỉ gửi tối đa 20 dòng báo cáo để tránh tin nhắn quá dài nếu xui xẻo tột độ
    let report =
      tribulationSummary.length > 20
        ? tribulationSummary.slice(0, 20).join("\n") +
          `\n... và ${tribulationSummary.length - 20} lần khác.`
        : tribulationSummary.join("\n");
    await sendLongMessage(chatId, `⛈️ BÁO CÁO ĐỘ KIẾP TỰ ĐỘNG ⛈️\n` + report);
  }
}
function formatCdExact(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s} giây`;
  if (s === 0) return `${m} phút`;
  return `${m} phút ${s} giây`;
}

function giveItem(profile, itemId, amount = 1) {
  profile.inventory ??= {};
  profile.inventory[itemId] = (profile.inventory[itemId] || 0) + amount;
}

function pickWeighted(list) {
  const total = list.reduce((sum, x) => sum + x.weight, 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

const BOSS_SUMMON_COOLDOWN_MS = 45 * 60 * 1000; // 45 phút / người
const BOSS_MIN_HP_RATIO_TO_SUMMON = 0.35; // máu quá thấp thì không được gọi
const BOSS_MIN_HP_RATIO_TO_ATTACK = 0.25; // máu quá thấp thì không được đánh boss

function getBossPhase(boss) {
  const ratio = boss.hp / boss.max_hp;
  if (ratio > 0.7) return 1;
  if (ratio > 0.4) return 2;
  if (ratio > 0.15) return 3;
  return 4;
}

function generateBossMathForBoss(boss) {
  const phase = getBossPhase(boss);

  // Phase 1: cộng trừ đơn
  if (phase === 1) {
    const a = randInt(5, 30);
    const b = randInt(1, 20);
    const op = Math.random() < 0.5 ? "+" : "-";
    const answer = op === "+" ? a + b : Math.max(a, b) - Math.min(a, b);
    const x = op === "+" ? a : Math.max(a, b);
    const y = op === "+" ? b : Math.min(a, b);
    return { question: `${x} ${op} ${y} = ?`, answer };
  }

  // Phase 2: cộng/trừ có 3 số
  if (phase === 2) {
    const a = randInt(10, 50);
    const b = randInt(5, 30);
    const c = randInt(1, 20);
    const answer = a + b - c;
    return { question: `${a} + ${b} - ${c} = ?`, answer };
  }

  // Phase 3: nhân + cộng/trừ
  if (phase === 3) {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    const c = randInt(1, 25);
    const d = randInt(1, 20);
    const answer = a * b + c - d;
    return { question: `${a} x ${b} + ${c} - ${d} = ?`, answer };
  }

  // Phase 4: có chia, bảo đảm ra số nguyên
  const d = randInt(2, 9);
  const x = randInt(3, 12);
  const y = randInt(1, 8);
  const z = randInt(1, 12);
  const sub = randInt(1, 6);
  const a = d * x;
  const b = d * y;
  const answer = x + y + z - sub;
  return {
    question: `(${a} + ${b}) / ${d} + ${z} - ${sub} = ?`,
    answer,
  };
}

function refreshBossQuestion(boss) {
  boss.phase = getBossPhase(boss);
  boss.math = generateBossMathForBoss(boss);
}

function renderChessBoard(game) {
  const board = game.board();
  const lines = [];

  for (let r = 0; r < 8; r++) {
    let row = `${8 - r} `;
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        row += CHESS_PIECES[piece.color][piece.type] + " ";
      } else {
        row += ((r + c) % 2 === 0 ? "⬜" : "⬛") + " ";
      }
    }
    lines.push(row.trimEnd());
  }

  lines.push("  a b c d e f g h");
  return lines.join("\n");
}

function parseChessMove(text) {
  const t = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const m = t.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
  if (!m) return null;
  return { from: m[1], to: m[2], promotion: m[3] || "q" };
}

function getChessTurnName(match) {
  return match.game.turn() === "w" ? match.white.name : match.black.name;
}

function getChessCurrentPlayer(match) {
  return match.game.turn() === "w" ? match.white : match.black;
}

function isExpScrollItem(item, itemId) {
  const hay =
    `${itemId || ""} ${item?.name || ""} ${item?.desc || ""} ${item?.effect || ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  return (
    item?.type === "sach-kinh-nghiem" ||
    item?.type === "book-xp" ||
    hay.includes("kinh nghiem") ||
    hay.includes("sach kinh nghiem") ||
    hay.includes("cuon kinh nghiem") ||
    hay.includes("experience")
  );
}

async function buildGameAiContext({ profile, chatId, question }) {
  const all = await Database.getAllProfiles();

  const topLevel = [...all]
    .sort(
      (a, b) => (b.level || 1) - (a.level || 1) || (b.exp || 0) - (a.exp || 0),
    )
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      level: p.level || 1,
      exp: Math.floor(p.exp || 0),
      money: p.money || 0,
    }));

  const topMoney = [...all]
    .sort((a, b) => (b.money || 0) - (a.money || 0))
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      money: p.money || 0,
      level: p.level || 1,
    }));

  const boss = activeBosses.get(chatId);
  const inv = Object.entries(profile.inventory || {})
    .filter(([, c]) => c > 0)
    .slice(0, 20)
    .map(([id, count]) => ({
      id,
      name: GAME_SHOP_ITEMS[id]?.name || id,
      type: GAME_SHOP_ITEMS[id]?.type || "unknown",
      count,
    }));

  const cooldowns = {
    goiboss: Math.max(0, (profile.cooldowns?.goiboss || 0) - Date.now()),
    work: Math.max(0, (profile.cooldowns?.work || 0) - Date.now()),
    mine: Math.max(0, (profile.cooldowns?.mine || 0) - Date.now()),
    pray: Math.max(0, (profile.cooldowns?.pray || 0) - Date.now()),
    treasure: Math.max(0, (profile.cooldowns?.treasure || 0) - Date.now()),
  };

  return {
    player: {
      name: profile.name,
      level: profile.level,
      exp: Math.floor(profile.exp || 0),
      hp: profile.hp,
      max_hp: profile.max_hp,
      money: profile.money,
      linhKhi: profile.linhKhi,
      power: profile.power,
      defense: profile.defense,
      luck: profile.luck,
      agility: profile.agility,
      charisma: profile.charisma,
      inventory: inv,
      equippedCongPhap: (profile.equippedCongPhap || []).map(
        (id) => GAME_SHOP_ITEMS[id]?.name || id,
      ),
      cooldowns,
    },
    boss: boss
      ? {
          name: boss.name,
          hp: boss.hp,
          max_hp: boss.max_hp,
          tier: boss.tierInfo?.name,
          question: boss.math?.question,
          phase: boss.phase || getBossPhase(boss),
        }
      : null,
    topLevel,
    topMoney,
    commands: [
      "/me",
      "/inv",
      "/shop",
      "/buy",
      "/sell",
      "/use",
      "/hoc",
      "/goiboss",
      "/danhboss",
      "/work",
      "/mine",
      "/pray",
      "/treasure",
      "/top rank",
      "/top money",
    ],
    question,
  };
}

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds));

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];

  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);

  return parts.join(" ");
}
function buildProfileText(profile) {
  const realm = getRealmInfo(profile.level);
  const calc = calcRealtimeCultivation(profile);
  const realExp = profile.exp + calc.xp;
  let status = profile.cultivation?.active
    ? `🧘 Đang bế quan (${formatTime(calc.secs)}) [+${calc.rate.toFixed(2)} XP/s]
Dự tính cần ${formatTime(Math.ceil((getNextLevelExp(profile.level) - realExp) / calc.rate))} để đột phá
    `
    : "💤 Đang nhàn rỗi";
  if (profile.pendingTribulation) status = "⚠️ Kẹt bình cảnh - Chờ ĐỘ KIẾP!";

  return `📜 HỒ SƠ TU TIÊN 📜
━━━━━━━━━━━━━━━━━━
👤 Đạo hiệu: *${profile.name}*
✨ Cảnh giới: ${realm.emoji} ${realm.name} (Cấp ${profile.level})
📈 Tu vi: ${Math.floor(realExp)} / ${getNextLevelExp(profile.level)} XP
❤️ Sinh lực: ${profile.hp}/${profile.max_hp}
💎 Tài sản: ${formatLT(profile.money)}
☁️ Linh Khí: ${profile.linhKhi + calc.linhKhi}
📦 Vật liệu: ⛏️ Khoáng: ${profile.materials.ore} | 🌿 Thảo dược: ${profile.materials.herb}
━━━━━━━━━━━━━━━━━━
⚔️ CHỈ SỐ BẢN THÂN:
💪 Sức: ${profile.power} 
🛡️ Thủ: ${profile.defense} 
🏃 Nhanh nhẹn: ${profile.agility}
🍀 May Mắn: ${profile.luck} 
💖 Mị Lực: ${profile.charisma} 
📚 Ngộ đạo: +${(profile.xpRate * 0.1).toFixed(2)} XP/s

Trạng thái: ${status}
📜 Công pháp: ${profile.equippedCongPhap.length > 0 ? profile.equippedCongPhap.map((k) => GAME_SHOP_ITEMS[k].name).join(", ") : "Chưa có"}`;
}

const BOSS_TIERS = [
  { name: "Tiểu Yêu", mult: 1, rewardLT: 1000, hpMult: 1 },
  { name: "Đại Yêu", mult: 2, rewardLT: 5000, hpMult: 3 },
  { name: "Yêu Vương", mult: 4, rewardLT: 10000, hpMult: 8 },
  { name: "Ma Tôn", mult: 8, rewardLT: 30000, hpMult: 100 },
];

function generateBossMath(level) {
  const tier = Math.ceil(level / 10);
  let num1, num2, op, ans;
  if (tier <= 2) {
    num1 = Math.floor(Math.random() * 20) + 1;
    num2 = Math.floor(Math.random() * 20) + 1;
    op = "+";
    ans = num1 + num2;
  } else if (tier === 3) {
    num1 = Math.floor(Math.random() * 30) + 10;
    num2 = Math.floor(Math.random() * 30) + 10;
    op = "-";
    if (num1 < num2) {
      let temp = num1;
      num1 = num2;
      num2 = temp;
    }
    ans = num1 - num2;
  } else {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    op = "x";
    ans = num1 * num2;
  }
  return { question: `${num1} ${op} ${num2} = ?`, answer: ans };
}

async function handleGameCommand(
  cleanText,
  profile,
  chatId,
  senderId,
  senderName,
) {
  const parts = cleanText.trim().split(/\s+/);
  const lowerCmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const now = Date.now();

  const HELP_TEXT = `📜 TÀNG KINH CÁC - HƯỚNG DẪN 📜
━━━━━━━━━━━━━━━━━━━━
👤 CÁ NHÂN & TU LUYỆN
▸ /me: Xem hồ sơ cá nhân
▸ /tuluyen: Bắt đầu bế quan
▸ /show @Tên: Soi người khác
▸ /stop: Xuất quan nhận XP
▸ /xo @Tên <tiền>: Đánh Tic-Tac-Toe
▸ /covua @Tên [tiền]: Thách đấu cờ vua
▸ /covua e2e4: Đi quân
▸ /covua resign: Đầu hàng
▸ /songtu @Tên: Song tu đạo lữ

🛒 GIAO DỊCH & VẬT PHẨM
▸ /shop <dan/vu-khi/cong-phap/khac> [trang: số]: Mở shop
▸ /buy <mã> [số_lượng] | /sell <mã> [số_lượng]: Mua bán
▸ /use <mã> [số_lượng]: Dùng vật phẩm trong túi
▸ /inv: Xem túi đồ
▸ /hoc <mã>: Lĩnh ngộ công pháp

🏡 NÔNG TRẠI & CHẾ TẠO
▸ /farm: Quản lý Linh Điền
▸ /luyendan | /luyenkhi: Chế tạo
▸ /cauca: Buông cần câu cá

⚔️ CHIẾN ĐẤU & TƯƠNG TÁC
▸ /work | /mine: Làm nhiệm vụ
▸ /pk @Tên | /rob @Tên: Tương tác
▸ /goiboss | /danhboss <đáp_án>: Săn Boss
▸ /taixiu <tai/xiu> <tiền_linh_thạch>: Cờ bạc
▸ /muaruong | /moruong | /tileruong: Rương
▸ /top rank | /top money: Bảng xếp hạng
▸ /hd: Xem các hoạt động có thể làm
▸ /cd: Xem toàn bộ cooldown


━━━━━━━━━━━━━━━━━━━━`;

  const HOAT_DONG_TEXT = `🎉 HOẠT ĐỘNG HẰNG NGÀY 🎉
▸ /diemdanh: Nhận thưởng điểm danh
▸ /nv: Làm nhiệm vụ ngắn
▸ /tuantra: Tuần tra tông môn
▸ /giaohang: Giao hàng nhận tip
▸ /hunt: Săn thú linh
▸ /gather: Hái dược ngoài rừng
▸ /salvage: Nhặt phế liệu
▸ /treasure: Tầm bảo ngẫu nhiên
▸ /escort: Hộ tống thương nhân
▸ /trade: Lướt chênh lệch chợ
▸ /pray: Cầu cơ duyên nhận lộc
`;

  if (lowerCmd === "/help") return HELP_TEXT;
  if (lowerCmd == "/hd") return HOAT_DONG_TEXT;

  // ===========================
  // /cd - XEM TOÀN BỘ COOLDOWN
  // ===========================
  if (lowerCmd === "/cd" || lowerCmd === "/cooldown") {
    const cds = profile.cooldowns || {};
    const now = Date.now();

    const ACTIONS = [
      ["work", "💼 Đi làm"],
      ["mine", "⛏️ Đào mỏ"],
      ["farm", "🌾 Nông trại"],
      ["cauca", "🎣 Câu cá"],
      ["rob", "🥷 Cướp"],
      ["pk", "⚔️ PK"],
      ["songtu", "💕 Song tu"],
      ["daily", "📅 Điểm danh"],
      ["quest", "📜 Nhiệm vụ"],
      ["patrol", "🛡️ Tuần tra"],
      ["delivery", "📦 Giao hàng"],
      ["hunt", "🏹 Săn thú"],
      ["gather", "🌿 Hái dược"],
      ["salvage", "♻️ Nhặt phế liệu"],
      ["treasure", "💎 Tầm bảo"],
      ["escort", "🚚 Hộ tống"],
      ["trade", "💰 Giao dịch"],
      ["pray", "🙏 Cầu nguyện"],
      ["goiboss", "👹 Gọi Boss"],
    ];

    let lines = [];

    for (const [key, name] of ACTIONS) {
      const end = cds[key] || 0;

      if (end <= now) {
        lines.push(`🟢 ${name}: Sẵn sàng`);
      } else {
        lines.push(`🔴 ${name}: ${formatCdExact(end - now)}`);
      }
    }

    return `⏳ DANH SÁCH COOLDOWN\n━━━━━━━━━━━━━━━━━━\n${lines.join("\n")}`;
  }

  if (lowerCmd === "/admin") {
    if (!isAdminUser(senderName)) {
      return "🛑 Bạn không đủ quyền thực thi";
    }

    const sub = (args[0] || "").toLowerCase();
    if (!sub) {
      return `🛡️ LỆNH ADMIN 🛡️
━━━━━━━━━━━━━━━━━━━━
▸ /admin -> Xem danh sách lệnh
▸ /admin set @tag <field> <value>
▸ /admin give @tag <itemId> <amount>
▸ /admin addmoney @tag <amount>
▸ /admin heal @tag
▸ /admin reset @tag
  /admin list
━━━━━━━━━━━━━━━━━━━━`;
    }

    let targetProfile = profile;
    let targetMentionName = null;

    // @s, @self, @me -> chính mình (không cần tag thật)
    if (/@(s|self|me)\b/i.test(cleanText)) {
      targetProfile = profile;
      targetMentionName = profile.name.toLowerCase();
    } else {
      targetMentionName = extractMentionName(cleanText);

      if (targetMentionName) {
        targetProfile = await findProfileByName(targetMentionName);

        if (!targetProfile) {
          return `🕵️ Không tìm thấy người chơi ${targetMentionName}.`;
        }
      }
    }

    if (sub === "list") {
      const all = await Database.getAllProfiles();

      if (!all.length) {
        return "📭 Chưa có user nào trong hệ thống.";
      }

      // Sắp xếp: rank cao trước, nếu bằng thì money cao trước
      all.sort((a, b) => b.level - a.level || b.money - a.money);

      const lines = all.map((p, i) => {
        const rank = p.level || 1;
        const money = formatLT(p.money || 0);
        const id = p.key || p.id || "unknown";
        return `${i + 1}. ${p.name} - Cấp ${rank} - ${money} - ${id}`;
      });

      // Chia nhỏ nếu quá dài
      const text = `🛡️ DANH SÁCH NGƯỜI CHƠI 🛡️
━━━━━━━━━━━━━━━━━━━━
Tên - Rank - Money - ID
${lines.join("\n")}`;

      return text;
    }

    if (sub === "set") {
      const field = (targetMentionName ? args[2] : args[1])?.toLowerCase();
      const rawValue = targetMentionName ? args[3] : args[2];
      if (!field || rawValue === undefined) {
        return "🛑 Dùng: `/admin set @tag <field> <value>`";
      }
      const value = Number(rawValue);
      if (!Number.isFinite(value)) {
        return "🛑 Giá trị phải là số.";
      }
      const keyMap = {
        money: "money",
        linhkhi: "linhKhi",
        hp: "hp",
        max_hp: "max_hp",
        power: "power",
        defense: "defense",
        luck: "luck",
        agility: "agility",
        charisma: "charisma",
        level: "level",
        exp: "exp",
        xpRate: "xpRate",
      };
      const targetKey = keyMap[field];
      if (!targetKey) {
        return "🛑 Field hỗ trợ: money, linhkhi, hp, max_hp, power, defense, luck, agility, charisma, level, exp, xpRate.";
      }
      targetProfile[targetKey] =
        targetKey === "level" ? Math.max(1, Math.floor(value)) : value;
      if (targetKey === "exp")
        targetProfile.exp = Math.max(0, Math.floor(value));
      if (targetKey === "level")
        targetProfile.level = Math.max(1, Math.floor(value));
      return `✅ Đã đặt ${field} cho ${targetProfile.name} = ${value}.`;
    }

    if (sub === "give") {
      const itemId = (targetMentionName ? args[2] : args[1])?.toLowerCase();
      const amount = parseInt(targetMentionName ? args[3] : args[2], 10) || 1;
      if (!itemId || !GAME_SHOP_ITEMS[itemId]) {
        return "🛑 Dùng: `/admin give @tag <itemId> <amount>`";
      }
      grantItem(targetProfile, itemId, amount);
      return `✅ Đã tặng ${targetProfile.name} ${amount} x ${GAME_SHOP_ITEMS[itemId].name}.`;
    }

    if (sub === "addmoney") {
      const amount = parseInt(
        (targetMentionName ? args[2] : args[1]) || "0",
        10,
      );
      if (!Number.isFinite(amount)) {
        return "🛑 Dùng: `/admin addmoney @tag <amount>`";
      }
      targetProfile.money += amount;
      return `✅ Đã cộng ${formatLT(amount)} cho ${targetProfile.name}.`;
    }

    if (sub === "heal") {
      targetProfile.hp = targetProfile.max_hp;
      targetProfile.linhKhi = Math.max(targetProfile.linhKhi, 100);
      return `✅ Đã hồi phục ${targetProfile.name}.`;
    }

    if (sub === "reset") {
      targetProfile.money = 1000;
      targetProfile.linhKhi = 100;
      targetProfile.hp = 100;
      targetProfile.max_hp = 100;
      targetProfile.exp = 0;
      targetProfile.level = 1;
      targetProfile.power = 5;
      targetProfile.defense = 5;
      targetProfile.luck = 5;
      targetProfile.agility = 5;
      targetProfile.charisma = 5;
      targetProfile.inventory = {};
      targetProfile.equippedCongPhap = [];
      targetProfile.itemBonuses = {};
      activeChess.delete(chatId);
      return `✅ Đã reset trạng thái cho ${targetProfile.name}.`;
    }

    return "🛑 Lệnh admin không hợp lệ. Gõ `/admin` để xem danh sách.";
  }

  if (["/profile", "/tu-tien", "/info", "/me"].includes(lowerCmd))
    return buildProfileText(profile);

  if (lowerCmd === "/ma-nv" || lowerCmd === "/manv") {
    if (!profile.maNv)
      profile.maNv = await generateFriendCode(profile.name || senderName);

    return `🔑 MÃ BẠN BÈ
━━━━━━━━━━━━━━━━━━
👤 Tên: ${profile.name}
🧷 Mã: ${profile.maNv}

👉 Dùng mã này thay cho @tag trong các lệnh tương tác.
Ví dụ: /pk ${profile.maNv}`;
  }

  if (lowerCmd === "/show") {
    const targetMentionName = extractMentionName(cleanText);

    if (!targetMentionName) {
      return "🛑 Dùng: /show @Tên";
    }

    const targetProfile = await findProfileByName(targetMentionName);

    if (!targetProfile) {
      return `🕵️ Không tìm thấy ${targetMentionName}.`;
    }

    return buildProfileText(targetProfile);
  }

  if (lowerCmd == "/tuluyen" || lowerCmd == "/tl") {
    if (profile.cultivation.active)
      return "🧘 Ngươi đang bế quan rồi, muốn tẩu hỏa nhập ma sao?";
    profile.cultivation = { active: true, startTime: now };
    return "🧘 Khí trầm đan điền, nhắm mắt tĩnh tâm. Ngươi bắt đầu bế quan tu luyện... (Dùng lệnh `/stop` để xuất quan)";
  }

  // --- HỆ THỐNG CỬA HÀNG ĐẸP MẮT ---
  if (lowerCmd === "/shop") {
    const category = (args[0] || "").toLowerCase();
    const page = Math.max(1, parseInt(args[1], 10) || 1);
    const PAGE_SIZE = 8;

    const cats = {
      dan: { key: "dan", title: "ĐAN DƯỢC", emoji: "💊" },
      "vu-khi": { key: "trang-bi", title: "VŨ KHÍ & GIÁP", emoji: "⚔️" },
      "cong-phap": { key: "cong-phap", title: "CÔNG PHÁP", emoji: "📜" },
      khac: { key: "khac", title: "KHÁC", emoji: "📦" },
    };

    if (!cats[category]) {
      return `🛒 TRÂN BẢO CÁC 🛒
━━━━━━━━━━━━━━━━━━━━
Xin chọn gian hàng muốn xem:
▸ 💊 \`/shop dan [trang]\` (Đan dược)
▸ ⚔️ \`/shop vu-khi [trang]\` (Vũ khí & Giáp)
▸ 📜 \`/shop cong-phap [trang]\` (Bí kíp)
▸ 📦 \`/shop khac [trang]\` (Nông cụ, Hạt giống)
━━━━━━━━━━━━━━━━━━━━
💡 Dùng \`/buy <mã>\` để mua hàng. Giá tính bằng Linh Thạch.`;
    }

    const shopType = cats[category].key;

    const items = Object.entries(GAME_SHOP_ITEMS)
      .filter(([_, v]) => v.type === shopType)
      .map(([k, i]) => ({
        id: k,
        ...i,
      }));

    if (items.length === 0) {
      return `🛒 GIAN HÀNG: ${cats[category].title} 🛒
━━━━━━━━━━━━━━━━━━━━
Hiện chưa có vật phẩm nào trong mục này.`;
    }

    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);

    const filtered = pageItems
      .map(
        (i) => `🔹 ${i.emoji} *${i.name}* [\`${i.id}\`]
   💰 Giá: ${formatLT(i.price)}
   📝 _${i.effect || i.desc || "Không có mô tả"}_`,
      )
      .join("\n\n");

    return `🛒 GIAN HÀNG: ${cats[category].emoji} ${cats[category].title} 🛒
━━━━━━━━━━━━━━━━━━━━
Trang ${safePage}/${totalPages}
${filtered}
━━━━━━━━━━━━━━━━━━━━
👉 Dùng \`/buy <mã>\` để mua.
👉 Xem trang khác: \`/shop ${category} ${safePage + 1}\` hoặc \`/shop ${category} ${safePage - 1}\``;
  }

  if (lowerCmd === "/hoc") {
    const cpId = args[0]?.toLowerCase();
    if (
      !cpId ||
      !GAME_SHOP_ITEMS[cpId] ||
      GAME_SHOP_ITEMS[cpId].type !== "cong-phap"
    )
      return "🛑 Mã công pháp không hợp lệ.";
    if (!profile.inventory[cpId])
      return "🛑 Ngươi chưa mua quyển công pháp này trong túi đồ!";
    if (profile.equippedCongPhap.includes(cpId))
      return "🛑 Ngươi đã học môn này rồi, học nữa tẩu hỏa nhập ma!";

    profile.inventory[cpId]--;
    profile.equippedCongPhap.push(cpId);
    const s = GAME_SHOP_ITEMS[cpId].stats;
    if (s.hp_bonus) profile.max_hp += s.hp_bonus;
    if (s.power) profile.power += s.power;
    if (s.defense) profile.defense += s.defense;
    if (s.agility) profile.agility += s.agility;
    profile.hp = profile.max_hp;
    return `📜 Lĩnh ngộ thành công ${GAME_SHOP_ITEMS[cpId].name}!\nCảm giác khí huyết cuồn cuộn, sức mạnh tăng vọt!`;
  }

  if (lowerCmd === "/farm") {
    const action = args[0]?.toLowerCase();

    // Giao diện chính Nông Trại
    if (!action) {
      let invSeeds = "";
      if (profile.inventory["hat-giong-thuong"])
        invSeeds += `🌱 Mì (x${profile.inventory["hat-giong-thuong"]}) `;
      if (profile.inventory["hat-giong-hiem"])
        invSeeds += `🩸 Sâm (x${profile.inventory["hat-giong-hiem"]}) `;
      if (!invSeeds) invSeeds = "Trống";

      let farmUI = `🏡 NÔNG TRẠI CỦA ${profile.name} (${profile.farm.maxSlots} Ô đất)\n--------------------------------\n🌱 Kho hạt giống: ${invSeeds}\n--------------------------------\n`;

      profile.farm.slots.forEach((slot, index) => {
        if (!slot.seed) {
          farmUI += `[${index + 1}] 🟫 Đất trống\n`;
        } else {
          const isReady = slot.readyAt <= now;
          const seedName =
            slot.seed === "hiem" ? "Huyết Sâm" : "Lúa mì/Thảo dược";
          const icon = slot.seed === "hiem" ? "🩸" : "🌾";
          if (isReady) {
            farmUI += `[${index + 1}] ${icon} ${seedName}: Đã chín! 🧺\n`;
          } else {
            const minLeft = Math.ceil((slot.readyAt - now) / 60000);
            const secLeft = Math.ceil(((slot.readyAt - now) % 60000) / 1000);
            farmUI += `[${index + 1}] 🌱 ${seedName}: Đang lớn... (Còn ${minLeft}p ${secLeft}s) ⏳\n`;
          }
        }
      });

      let nextCost = profile.farm.maxSlots * 2000;
      let costText =
        profile.farm.maxSlots >= 10 ? "Đã tối đa" : formatLT(nextCost);
      farmUI += `\n👉 Gieo hạt: "/farm gieo" | Thu hoạch: "/farm thuhoach"\n👉 Mua hạt giống: "/shop khac" | Mua ô đất: "/farm dat" (Giá: ${costText})`;
      return farmUI;
    }

    if (action === "gieo") {
      if (profile.linhKhi < 10)
        return "☁️ Linh khí cạn kiệt (<10), không đủ tưới tiêu để gieo hạt.";

      // Tìm ô đất trống
      const emptyIndex = profile.farm.slots.findIndex((s) => !s.seed);
      if (emptyIndex === -1)
        return "🛑 Đất đã trồng kín cả rồi, chờ thu hoạch hoặc mua thêm ô đất!";

      // Chọn hạt giống (ưu tiên hạt thường)
      let seedType = null;
      if (profile.inventory["hat-giong-thuong"] > 0) {
        seedType = "thuong";
        profile.inventory["hat-giong-thuong"]--;
      } else if (profile.inventory["hat-giong-hiem"] > 0) {
        seedType = "hiem";
        profile.inventory["hat-giong-hiem"]--;
      }

      if (!seedType)
        return "🛑 Bạn không có hạt giống nào! Dùng `/shop khac` và `/buy` để mua.";

      profile.linhKhi -= 10;
      const growTime = seedType === "hiem" ? 15 * 60000 : 5 * 60000; // 15p cho sâm, 5p cho thảo dược
      profile.farm.slots[emptyIndex] = {
        seed: seedType,
        plantedAt: now,
        readyAt: now + growTime,
      };

      return `🌱 Đã gieo thành công Hạt ${seedType === "hiem" ? "Huyết Sâm" : "Lúa mì"} vào ô số ${emptyIndex + 1} (Tốn 10 Linh Khí).`;
    }

    if (action === "thuhoach") {
      let herbs = 0;
      let expGained = 0;
      let harvestedCount = 0;

      for (let i = 0; i < profile.farm.slots.length; i++) {
        let slot = profile.farm.slots[i];
        if (slot.seed && slot.readyAt <= now) {
          if (slot.seed === "hiem") {
            herbs += Math.floor(Math.random() * 2) + 1;
            expGained += 50;
          } else {
            herbs += Math.floor(Math.random() * 3) + 2;
            expGained += 15;
          }
          profile.farm.slots[i] = { seed: null, plantedAt: 0, readyAt: 0 };
          harvestedCount++;
        }
      }

      if (harvestedCount === 0)
        return "🛑 Ruộng nhà bạn chưa có cây nào chín để gặt cả!";
      profile.materials.herb += herbs;
      profile.exp += expGained;
      return `🌾 Đã thu hoạch ${harvestedCount} ô đất! Nhận được ${herbs} Thảo dược và ${expGained} XP.`;
    }

    if (action === "dat") {
      if (profile.farm.maxSlots >= 10)
        return "🛑 Trang trại đã đạt giới hạn tối đa (10 ô).";
      const cost = profile.farm.maxSlots * 2000; // Giá tăng dần
      if (profile.money < cost)
        return `💸 Bạn cần ${formatLT(cost)} để mở rộng thêm 1 ô đất!`;
      profile.money -= cost;
      profile.farm.maxSlots++;
      profile.farm.slots.push({ seed: null, plantedAt: 0, readyAt: 0 });
      return `🏡 Chúc mừng! Bạn đã tốn ${formatLT(cost)} để mở rộng Linh Điền lên ${profile.farm.maxSlots} ô!`;
    }

    return "🛑 Lệnh không hợp lệ. Gõ `/farm` để xem hướng dẫn.";
  }

  if (lowerCmd === "/luyendan") {
    if (profile.linhKhi < 50 || profile.materials.herb < 3)
      return "🛑 Luyện đan cần: 50 Linh Khí & 3 Thảo Dược.";
    profile.linhKhi -= 50;
    profile.materials.herb -= 3;
    const success = Math.random() < 0.6; // 60% thành công
    if (success) {
      grantItem(profile, "dai-hoan-dan", 1);
      return `🔥 Lò nung rực lửa... 💥 Mùi hương tỏa ra! Ngươi luyện thành công 1 Đại Hoàn Đan!`;
    } else {
      // Cơ chế nổ lò
      const noLo = Math.random() < 0.5; // 50% nổ lò nếu xịt
      if (noLo) {
        const dmg = Math.floor(Math.random() * 20) + 10;
        profile.hp = Math.max(1, profile.hp - dmg);
        return `💥 BÙM! NỔ LÒ RỒI! Hỏa hầu mất kiểm soát, lò đan nổ văng miểng trúng bạn mất ${dmg} HP. Thảo dược hóa thành tro bụi đen sì!`;
      }
      return `🔥 Lò nung tắt lịm... Mùi khét lẹt. Luyện đan thất bại, dược liệu hỏng bét.`;
    }
  }

  if (lowerCmd === "/luyenkhi") {
    if (profile.linhKhi < 100 || profile.materials.ore < 5)
      return "🛑 Luyện khí cần: 100 Linh Khí & 5 Khoáng Thạch.";
    profile.linhKhi -= 100;
    profile.materials.ore -= 5;
    const items = ["thiet-kiem", "thiet-giap", "huyet-dao", "hoa-long-giap"];
    const success = Math.random() < 0.6;
    if (success) {
      const randItem = items[Math.floor(Math.random() * items.length)];
      grantItem(profile, randItem, 1);
      return `🔨 Tiếng búa chan chát... Ánh sáng lóe lên! Ngươi rèn thành công ${GAME_SHOP_ITEMS[randItem].name}!`;
    }
    return `🔨 Tiếng búa chan chát... KENG! Phôi thép gãy đôi, mồ hôi ướt sũng. Rèn thất bại.`;
  }

  if (lowerCmd === "/dokiep") {
    return "🛑 Hệ thống độ kiếp giờ đây là TỰ ĐỘNG NGẦM khi bạn tu luyện. Không cần gọi lôi kiếp thủ công nữa!";
  }

  if (lowerCmd === "/muaruong") {
    let amount = parseInt(args[0], 10) || 1;
    let cost = amount * 500;
    if (profile.money < cost)
      return `💸 Không đủ Linh Thạch! ${amount} rương giá ${formatLT(cost)}.`;
    profile.money -= cost;
    profile.inventory["ruong-bi-an"] =
      (profile.inventory["ruong-bi-an"] || 0) + amount;
    return `🎁 Đã mua ${amount} Rương Bí Ẩn thành công! Tốn ${formatLT(cost)}. Dùng /moruong <số_lượng> để mở.`;
  }

  if (lowerCmd === "/tileruong") {
    return `🎁 TỶ LỆ RƯƠNG BÍ ẨN 🎁\n- 5% Trúng Cực Phẩm Đan Dược\n- 10% Trúng Cực Phẩm Vũ Khí\n- 15% Trúng 2000 Linh Thạch\n- 70% Trúng rác (Nhận lại 50 Linh Thạch an ủi)`;
  }

  if (lowerCmd === "/moruong") {
    let amount = parseInt(args[0], 10) || 1;
    let count = profile.inventory["ruong-bi-an"] || 0;
    if (count < amount)
      return `📦 Ngươi chỉ có ${count} Rương Bí Ẩn. Dùng /muaruong để mua thêm.`;

    profile.inventory["ruong-bi-an"] -= amount;
    let totalLT = 0;
    let wonItems = [];

    for (let i = 0; i < amount; i++) {
      let r = Math.random();
      if (r < 0.05) wonItems.push(`gen-dan-${Math.floor(Math.random() * 50)}`);
      else if (r < 0.15)
        wonItems.push(`gen-vk-${Math.floor(Math.random() * 50)}`);
      else if (r < 0.3) totalLT += 2000;
      else totalLT += 50;
    }

    for (let item of wonItems) grantItem(profile, item, 1);
    profile.money += totalLT;

    let msg = `🎁 Đã mở ${amount} Rương Bí Ẩn!\n`;
    if (totalLT > 0) msg += `💰 Nhận được ${formatLT(totalLT)}.\n`;
    if (wonItems.length > 0) {
      msg += `✨ Trang bị trúng thưởng:\n`;
      let itemCounts = {};
      wonItems.forEach((i) => (itemCounts[i] = (itemCounts[i] || 0) + 1));
      for (let k in itemCounts) {
        msg += `- ${GAME_SHOP_ITEMS[k].name} x${itemCounts[k]}\n`;
      }
    }
    return msg;
  }

  if (lowerCmd === "/covua" || lowerCmd === "/chess" || lowerCmd === "/cv") {
    const sub = (args[0] || "").toLowerCase();

    // Tạo phòng: /covua @Tên [cược]
    if (cleanText.includes("@") && !parseChessMove(sub) && sub !== "resign") {
      if (activeChess.has(chatId))
        return "⚠️ Trong khu vực này đã có một ván cờ vua đang diễn ra.";

      const targetMentionName = extractMentionName(cleanText);
      if (!targetMentionName) return "🛑 Dùng: `/covua @Tên [tiền]`";

      const target = await findProfileByName(targetMentionName);
      if (!target) return "🕵️ Không tìm thấy đối thủ.";
      if (target.key === profile.key) return "🤡 Tự đấu với chính mình à?";

      const bet = Math.max(0, parseInt(args[1], 10) || 0);
      if (profile.money < bet) return `💸 Bạn không đủ ${formatLT(bet)}.`;
      if (target.money < bet) return `💸 Đối thủ không đủ ${formatLT(bet)}.`;

      const match = {
        game: new Chess(),
        white: profile,
        black: target,
        bet,
        createdAt: now,
        timer: setTimeout(
          () => {
            activeChess.delete(chatId);
            sendMessage(chatId, "⌛ Ván cờ vua bị hủy do quá lâu không ai đi.");
          },
          20 * 60 * 1000,
        ),
      };

      activeChess.set(chatId, match);

      return `♟️ VÁN CỜ VUA ĐÃ BẮT ĐẦU ♟️
━━━━━━━━━━━━━━━━━━━━
Trắng: ${match.white.name}
Đen: ${match.black.name}
Cược: ${formatLT(bet)}

${renderChessBoard(match.game)}

👉 Lượt của ${getChessTurnName(match)}
Dùng: \`/covua e2e4\` hoặc \`/cv e2e4\`
👉 Đầu hàng: \`/covua resign\``;
    }

    const match = activeChess.get(chatId);
    if (!match) return "♟️ Hiện chưa có ván cờ vua nào trong phòng này.";

    const myColor =
      match.white.key === profile.key
        ? "w"
        : match.black.key === profile.key
          ? "b"
          : null;

    if (!myColor) return "🛑 Bạn không nằm trong ván cờ này.";

    // Đầu hàng
    if (sub === "resign" || sub === "thua") {
      clearTimeout(match.timer);
      activeChess.delete(chatId);

      const winner = myColor === "w" ? match.black : match.white;
      const loser = myColor === "w" ? match.white : match.black;

      if (match.bet > 0) {
        const loseRef = (await Database.getProfile(loser.key)) || loser;
        const winRef = (await Database.getProfile(winner.key)) || winner;
        const stake = Math.min(match.bet, loseRef.money || 0);
        loseRef.money = Math.max(0, loseRef.money - stake);
        winRef.money += stake;
        await Database.saveProfile(loseRef.key, loseRef);
        await Database.saveProfile(winRef.key, winRef);
      }

      return `🏳️ ${profile.name} đã đầu hàng!
🏆 ${winner.name} chiến thắng${match.bet > 0 ? ` và nhận ${formatLT(match.bet)}` : ""}.`;
    }

    // Đi quân: /covua e2e4
    const move = parseChessMove(sub || args[0]);
    if (!move) {
      return `🛑 Dùng:
- \`/covua @Tên [cược]\` để tạo ván
- \`/covua e2e4\` để đi quân
- \`/covua resign\` để đầu hàng`;
    }

    if (match.game.turn() !== myColor) {
      return `⏳ Chưa tới lượt của bạn. Lượt hiện tại là ${getChessTurnName(match)}.`;
    }

    let result;
    try {
      result = match.game.move(move);
    } catch (e) {
      return "❌ Nước đi không hợp lệ.";
    }

    if (!result) return "❌ Nước đi không hợp lệ.";

    if (match.game.isCheckmate()) {
      clearTimeout(match.timer);
      activeChess.delete(chatId);

      const winner = myColor === "w" ? match.white : match.black;
      const loser = myColor === "w" ? match.black : match.white;

      if (match.bet > 0) {
        const loseRef = (await Database.getProfile(loser.key)) || loser;
        const winRef = (await Database.getProfile(winner.key)) || winner;
        const stake = Math.min(match.bet, loseRef.money || 0);
        loseRef.money = Math.max(0, loseRef.money - stake);
        winRef.money += stake;
        await Database.saveProfile(loseRef.key, loseRef);
        await Database.saveProfile(winRef.key, winRef);
      }

      return `♟️ ${winner.name} chiếu hết!
🏆 Ván cờ kết thúc.
${renderChessBoard(match.game)}
${match.bet > 0 ? `🎁 ${winner.name} nhận ${formatLT(match.bet)} từ ${loser.name}.` : ""}`;
    }

    if (match.game.isStalemate()) {
      clearTimeout(match.timer);
      activeChess.delete(chatId);
      return `⚖️ Hòa cờ!
${renderChessBoard(match.game)}`;
    }

    if (match.game.isThreefoldRepetition()) {
      clearTimeout(match.timer);
      activeChess.delete(chatId);
      return `⚖️ Hòa do lặp nước đi 3 lần!
${renderChessBoard(match.game)}`;
    }

    if (match.game.isInsufficientMaterial()) {
      clearTimeout(match.timer);
      activeChess.delete(chatId);
      return `⚖️ Hòa do không đủ quân để chiếu hết!
${renderChessBoard(match.game)}`;
    }

    return `♟️ Nước đi hợp lệ: ${result.san}
${renderChessBoard(match.game)}

👉 Lượt của ${getChessTurnName(match)}`;
  }

  if (lowerCmd === "/xo") {
    if (args.length === 0)
      return "❌ Dùng: /xo @Tên <tiền_cược> để thách đấu, hoặc /xo <1-9> để đánh.";

    if (args[0].startsWith("@")) {
      if (activeXO.has(chatId))
        return "⚠️ Đang có ván XO diễn ra trong khu vực này. Chờ ván đó kết thúc!";
      let bet = parseInt(args[1], 10) || 0;
      if (bet < 0) return "❌ Tiền cược không hợp lệ.";
      if (profile.money < bet)
        return `💸 Ngươi không đủ ${formatLT(bet)} để cược.`;

      const targetMentionName = extractMentionName(cleanText);
      const target = await findProfileByName(targetMentionName);
      if (!target) return "🕵️ Đối thủ tàng hình không thấy.";
      if (target.key === profile.key) return "🤡 Tự đánh mình?";
      if (target.money < bet)
        return `💸 Đối thủ không đủ ${formatLT(bet)} để cược.`;

      activeXO.set(chatId, {
        p1: profile,
        p2: target,
        bet: bet,
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        turn: 1,
        timer: setTimeout(() => {
          activeXO.delete(chatId);
          sendMessage(
            chatId,
            `⌛ Ván cờ XO giữa ${profile.name} và ${target.name} bị hủy do quá thời gian.`,
          );
        }, 120000),
      });

      return `⚔️ ${profile.name} thách đấu XO với ${target.name}! (Cược: ${formatLT(bet)})\nLưới cờ 1-9:\n1 2 3\n4 5 6\n7 8 9\n\n👉 Lượt của ${profile.name} (X). Gõ \`/xo <vị_trí>\` để đánh!`;
    } else {
      let match = activeXO.get(chatId);
      if (!match) return "❌ Không có ván XO nào đang diễn ra ở đây.";

      let playerNum =
        match.p1.key === profile.key ? 1 : match.p2.key === profile.key ? 2 : 0;
      if (playerNum === 0) return "❌ Bạn không phải người chơi trong ván này.";
      if (playerNum !== match.turn) return "❌ Chưa tới lượt của bạn.";

      let pos = parseInt(args[0], 10) - 1;
      if (isNaN(pos) || pos < 0 || pos > 8 || match.board[pos] !== 0)
        return "❌ Vị trí không hợp lệ. Gõ từ 1-9 vào ô trống.";

      match.board[pos] = playerNum;

      const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ];
      let winner = 0;
      for (let l of lines) {
        if (
          match.board[l[0]] &&
          match.board[l[0]] === match.board[l[1]] &&
          match.board[l[1]] === match.board[l[2]]
        ) {
          winner = match.board[l[0]];
          break;
        }
      }

      let renderBoard = () => {
        let b = match.board.map((v) =>
          v === 1 ? "❌" : v === 2 ? "⭕" : "⬜",
        );
        return `${b[0]}${b[1]}${b[2]}\n${b[3]}${b[4]}${b[5]}\n${b[6]}${b[7]}${b[8]}`;
      };

      if (winner !== 0) {
        clearTimeout(match.timer);
        activeXO.delete(chatId);

        let pWin = winner === 1 ? match.p1 : match.p2;
        let pLose = winner === 1 ? match.p2 : match.p1;
        let pWinRef = await Database.getProfile(pWin.key);
        let pLoseRef = await Database.getProfile(pLose.key);

        if (pLoseRef.money < match.bet) match.bet = pLoseRef.money;
        pWinRef.money += match.bet;
        pLoseRef.money -= match.bet;

        await Database.saveProfile(pWinRef.key, pWinRef);
        await Database.saveProfile(pLoseRef.key, pLoseRef);

        return `🎉 BÀN CỜ XO KẾT THÚC 🎉\n\n${renderBoard()}\n\n🏆 ${pWin.name} chiến thắng và nhận được ${formatLT(match.bet)} từ ${pLose.name}!`;
      }

      if (!match.board.includes(0)) {
        clearTimeout(match.timer);
        activeXO.delete(chatId);
        return `⚖️ BÀN CỜ XO HÒA ⚖️\n\n${renderBoard()}\n\nCả hai bất phân thắng bại!`;
      }

      match.turn = match.turn === 1 ? 2 : 1;
      let nextPlayer = match.turn === 1 ? match.p1 : match.p2;
      return `Bàn cờ XO:\n${renderBoard()}\n\n👉 Lượt của ${nextPlayer.name} (${match.turn === 1 ? "X" : "O"}). Gõ \`/xo <vị_trí>\` để đánh!`;
    }
  }

  if (lowerCmd === "/top") {
    const type = args[0]?.toLowerCase();
    const all = await Database.getAllProfiles();
    if (type === "money") {
      all.sort((a, b) => b.money - a.money);
      let list = all
        .slice(0, 10)
        .map((p, i) => `${i + 1}. ${p.name}: ${formatLT(p.money)}`)
        .join("\n");
      return `🏆 BẢNG XẾP HẠNG PHÚ HỘ 🏆\n━━━━━━━━━━━━━━━━━━━━\n${list}`;
    } else if (type === "rank" || type === "level") {
      all.sort((a, b) => b.level - a.level || b.exp - a.exp);
      let list = all
        .slice(0, 10)
        .map((p, i) => {
          const realm = getRealmInfo(p.level);
          return `${i + 1}. ${p.name}: ${realm.emoji} ${realm.name}`;
        })
        .join("\n");
      return `🏆 BẢNG XẾP HẠNG TU VI 🏆\n━━━━━━━━━━━━━━━━━━━━\n${list}`;
    }
    return "📊 Dùng: `/top rank` (Xếp hạng Cảnh giới) hoặc `/top money` (Xếp hạng Linh thạch).";
  }

  if (lowerCmd === "/cauca") {
    if (!profile.inventory["can-cau"])
      return "🎣 Bạn chưa có Cần Câu! Ra `/shop khac` để mua nhé.";
    if (profile.cooldowns.cauca > now)
      return `⏳ Mặt hồ tĩnh lặng, cá chê mồi. Hãy đợi ${((profile.cooldowns.cauca - now) / 1000) | 0}s nữa.`;

    profile.cooldowns.cauca = now + 180000; // 3 phút
    const isWin = Math.random() < 0.7; // 70% dính cá

    if (isWin) {
      const rewardLT = Math.floor(Math.random() * 150) + 50;
      profile.money += rewardLT;
      profile.exp += 5;
      return `🎣 ${getRandomMsg(SCENARIOS.fish)}! Đem bán thu được ${formatLT(rewardLT)} và 5 XP.`;
    } else {
      return `🎣 Đứng mỏi cả chân, muỗi đốt sưng chân mà mồi thì bị cá con rỉa sạch. Trắng tay!`;
    }
  }

  if (lowerCmd === "/songtu") {
    const targetMentionName = extractMentionName(cleanText);
    if (!targetMentionName)
      return "💞 Dùng: `/songtu @Tên` hoặc `/songtu ma-bạn-bè` để mời một đạo lữ song tu!";
    if (profile.cooldowns.songtu > now)
      return `⏳ Nguyên khí chưa hồi phục, chờ ${((profile.cooldowns.songtu - now) / 60000) | 0} phút.`;

    const target = await findProfileByName(targetMentionName);
    if (!target) return "🕵️ Không tìm thấy đạo lữ này trong giới tu tiên.";
    if (target.key === profile.key)
      return "🤡 Tự biên tự diễn à? Tìm người khác đi!";

    const expGain = 40 + (profile.charisma + target.charisma);
    profile.exp += expGain;
    target.exp += expGain;

    profile.cooldowns.songtu = now + 3600000;
    await Database.saveProfile(target.key, target);

    await notifyPlayer(
      target,
      `💞 ${profile.name} mời bạn song tu. Hai người cùng nhận ${expGain} XP.`,
      chatId,
    );

    return `💞 ${profile.name} và ${target.name} khoanh chân tĩnh tọa, âm dương giao hòa.
✨ Linh khí luân chuyển quanh người! Cả hai cùng nhận được ${expGain} XP!`;
  }

  if (lowerCmd === "/goiboss") {
    if (activeBosses.has(chatId)) {
      return "⚠️ Khu vực này đang có một con Boss rồi. Diệt nó trước đã.";
    }

    if ((profile.cooldowns.goiboss || 0) > now) {
      return `⏳ Bạn vừa triệu hồi boss gần đây rồi. Chờ ${formatCdExact(
        profile.cooldowns.goiboss - now,
      )} nữa.`;
    }

    if (profile.hp <= profile.max_hp * BOSS_MIN_HP_RATIO_TO_SUMMON) {
      return "🛑 Máu quá thấp, không đủ khí lực để mở trận triệu hồi boss.";
    }

    if (profile.linhKhi < 300 || profile.money < 300) {
      return "🛑 Trận pháp gọi Boss cần tế lễ 300 Linh Khí và 300 Linh Thạch.";
    }

    profile.linhKhi -= 300;
    profile.money -= 300;
    profile.cooldowns.goiboss = now + BOSS_SUMMON_COOLDOWN_MS;

    const roll = Math.random();
    let tierIndex = 0;
    if (roll > 0.95) tierIndex = 3;
    else if (roll > 0.8) tierIndex = 2;
    else if (roll > 0.5) tierIndex = 1;

    const tier = BOSS_TIERS[tierIndex];

    const bossHp = Math.floor((900 + profile.level * 180) * tier.hpMult);
    const boss = {
      name: `${tier.name} Vô Danh`,
      tierInfo: tier,
      hp: bossHp,
      max_hp: bossHp,
      level: profile.level,
      phase: 1,
      math: null,
      timer: null,
    };

    refreshBossQuestion(boss);

    boss.timer = setTimeout(
      () => {
        activeBosses.delete(chatId);
        sendMessage(
          chatId,
          "🌫️ Boss đã thoát trận vì quá lâu không ai hạ được nó.",
        );
      },
      8 * 60 * 1000,
    );

    activeBosses.set(chatId, boss);

    return `👹 [KHU VỰC CẢNH BÁO] 👹
${profile.name} đã hiến tế mở Không Gian Trận!
🐲 Phẩm chất: ${tier.name}
❤️ Máu boss: ${bossHp}
⏳ Cooldown gọi boss của bạn: ${formatCdExact(BOSS_SUMMON_COOLDOWN_MS)}

Nó gầm lên một bài toán: ${boss.math.question}
👉 Dùng lệnh: \`/danhboss <đáp_án>\` để đánh boss!`;
  }

  if (lowerCmd === "/danhboss") {
    const boss = activeBosses.get(chatId);
    if (!boss) return "🛑 Quanh đây không có Boss nào cả.";

    if (profile.hp <= profile.max_hp * BOSS_MIN_HP_RATIO_TO_ATTACK) {
      return "🛑 Máu quá thấp, bạn không đủ sức đánh Boss lúc này.";
    }

    const ans = Number(args[0]);
    if (!Number.isFinite(ans)) {
      return "🛑 Phải nhập số đáp án. Ví dụ: `/danhboss 10`";
    }

    if (ans === boss.math.answer) {
      const phase = getBossPhase(boss);
      const dmg =
        Math.floor(profile.power * (1.6 + boss.tierInfo.mult * 0.35)) +
        phase * 12 +
        Math.floor(profile.luck * 0.4);

      boss.hp = Math.max(0, boss.hp - dmg);

      if (boss.hp <= 0) {
        clearTimeout(boss.timer);
        activeBosses.delete(chatId);

        const rewardLT = boss.tierInfo.rewardLT;
        profile.money += rewardLT;
        profile.linhKhi += 700;

        return `⚔️ CHÍ MẠNG! ${profile.name} chém đứt đầu ${boss.name}!
🎉 CHIẾN THẮNG!
🎁 Thưởng: ${formatLT(rewardLT)} và 700 Linh Khí!`;
      }

      refreshBossQuestion(boss);
      return `💥 Trả lời đúng! Gây ${dmg} sát thương.
👹 Boss còn ${boss.hp}/${boss.max_hp} HP!
Nó càng yếu thì câu hỏi càng hiểm hơn: ${boss.math.question}`;
    } else {
      const phase = getBossPhase(boss);
      const dmgToPlayer = Math.max(
        15,
        Math.floor(boss.max_hp * (0.08 + phase * 0.03)),
      );
      profile.hp = Math.max(1, profile.hp - dmgToPlayer);

      refreshBossQuestion(boss);
      return `❌ Sai rồi! Boss vả bạn mất ${dmgToPlayer} máu.
👹 Câu hỏi mới: ${boss.math.question}`;
    }
  }

  if (lowerCmd === "/work") {
    if (profile.cooldowns.work > now)
      return `⏳ Cơ thể rã rời, hãy nghỉ ${((profile.cooldowns.work - now) / 1000) | 0}s.`;
    profile.cooldowns.work = now + 120000;
    const earn = Math.floor(Math.random() * 80) + 50;
    profile.money += earn;
    return `💼 ${getRandomMsg(SCENARIOS.work)}, nhận được ${formatLT(earn)}.
Quay lại làm sau ${formatTime(profile.cooldowns.work - now)} nhé!`;
  }

  if (lowerCmd === "/mine") {
    if (profile.cooldowns.mine > now)
      return `⏳ Cuốc mẻ rồi, đợi hồi sức ${((profile.cooldowns.mine - now) / 1000) | 0}s.`;
    profile.cooldowns.mine = now + 45000;
    const m = Math.floor(Math.random() * 30) + 20;
    profile.money += m;
    profile.materials.ore += 2;
    return `⛏️ ${getRandomMsg(SCENARIOS.mine)}. Nhận được 2 Khoáng thạch và ${formatLT(m)}.
Quay lại đào sau ${formatTime(profile.cooldowns.mine - now)} nhé!`;
  }

  if (lowerCmd === "/rob") {
  const targetToken = extractTargetToken(cleanText);
  if (!targetToken)
    return "🥷 Dùng: `/rob @Tên` hoặc `/rob ma-bạn-bè` để đi móc túi!";

  if (profile.cooldowns.rob > now)
    return `⏳ Quan phủ đang tuần tra gắt gao, chờ ${((profile.cooldowns.rob - now) / 1000) | 0}s hãy ra tay.`;

  const target = await findProfileByName(targetToken);
  if (!target) return "🕵️ Đối tượng không tồn tại.";
  if (target.key === profile.key) return "🤡 Trộm tiền của chính mình à?";



    profile.cooldowns.rob = now + 300000; // 5p
    const winRate = 0.4 + (profile.agility - target.agility) * 0.01;

    if (Math.random() < winRate && target.money > 100) {
      const stealPercent = (Math.floor(Math.random() * 16) + 5) / 100;
      const stolen = Math.floor(target.money * stealPercent);

      target.money = Math.max(0, target.money - stolen);
      profile.money += stolen;

      await Database.saveProfile(target.key, target);

      const msg = `🥷 ${profile.name} đã móc túi bạn và lấy mất ${formatLT(stolen)} (${Math.round(stealPercent * 100)}% Linh Thạch).`;
      await notifyPlayer(target, msg, chatId);

      return `🥷 Bóng đêm chập choạng, ${profile.name} lẻn ra sau lưng ${target.name} trộm thành công ${formatLT(stolen)} (${Math.round(stealPercent * 100)}% Linh Thạch)!`;
    } else {
      const losePercent = (Math.floor(Math.random() * 16) + 5) / 100;
      const penalty = Math.floor(profile.money * losePercent);

      profile.money = Math.max(0, profile.money - penalty);

      const msg = `🚨 ${profile.name} định móc túi bạn nhưng thất bại. Bạn làm họ rơi mất ${formatLT(penalty)}.`;
      await notifyPlayer(target, msg, chatId);

      return `🚨 BỊ BẮT! ${target.name} phát hiện và đấm bạn sấp mặt! Chạy rơi mất ${formatLT(penalty)} (${Math.round(losePercent * 100)}% Linh Thạch)!`;
    }
  }

  if (lowerCmd === "/sync") {
    const code = String(args[0] || "")
      .trim()
      .toLowerCase();

    if (!code) {
      return "🛑 Dùng: /sync <ma-nv>";
    }

    const allProfiles = await Database.getAllProfiles();
    const oldProfile = allProfiles.find(
      (p) =>
        String(p.maNv || "")
          .trim()
          .toLowerCase() === code,
    );

    if (!oldProfile) {
      return "❌ Không tìm thấy tài khoản cũ với mã này.";
    }

    const oldKey = oldProfile.key;
    const newKey = `user:${senderId}`;

    if (oldKey === newKey) {
      return "✅ Tài khoản này đã được đồng bộ rồi.";
    }

    const currentProfile = await Database.getProfile(newKey);

    if (currentProfile && currentProfile.level > 1) {
      return "❌ Tài khoản này đã có dữ liệu, không thể sync.";
    }
    const synced = JSON.parse(JSON.stringify(oldProfile));
    synced.key = newKey;
    synced.name = senderName;
    synced.lastChatId = chatId;

    await Database.saveProfile(newKey, synced);
    await Database.deleteProfile(oldKey);

    return `🎉 Đồng bộ thành công!
🔑 Mã: ${code}
👤 ${senderName}
✅ Tài khoản cũ đã bị xóa sau khi chuyển dữ liệu.`;
  }
  if (lowerCmd === "/pk") {
  const targetToken = extractTargetToken(cleanText);
  if (!targetToken)
    return "🛑 Dùng: `/pk @Tên` hoặc `/pk ma-bạn-bè` để đưa thẻ thách đấu!";

  const target = await findProfileByName(targetToken);
  if (!target) return "🕵️ Đối thủ tàng hình không thấy.";
  if (target.key === profile.key) return "🤡 Tự đánh mình? Tẩu hỏa nhập ma à!";
 

    profile.cooldowns.pk = now + 120000;

    const myDmg = profile.power * (1 + Math.random() * (profile.luck * 0.05));
    const enemyDmg = target.power * (1 + Math.random() * (target.luck * 0.05));

    if (Math.random() < target.agility * 0.01) {
      await notifyPlayer(
        target,
        `⚔️ ${profile.name} vừa PK bạn nhưng bạn né gọn!`,
        chatId,
      );
      return `💨 ${target.name} dùng bộ pháp tàn ảnh né gọn đòn tấn công của bạn! PK hòa.`;
    }

    if (myDmg > target.defense && myDmg > enemyDmg) {
      const stealPercent = (Math.floor(Math.random() * 16) + 5) / 100;
      const stolen = Math.floor(target.money * stealPercent);

      target.money = Math.max(0, target.money - stolen);
      profile.money += stolen;
      target.hp = Math.max(1, target.hp - Math.floor(myDmg - target.defense));

      await Database.saveProfile(target.key, target);

      await notifyPlayer(
        target,
        `⚔️ ${profile.name} PK bạn thành công, bạn mất ${formatLT(stolen)} và bị thương.`,
        chatId,
      );

      return `⚔️ Lên! ${profile.name} ${getRandomMsg(SCENARIOS.pk_win)} ${target.name} hộc máu!
🏆 Cướp được ${formatLT(stolen)} (${Math.round(stealPercent * 100)}% Linh Thạch). Đối thủ trọng thương!`;
    } else {
      const losePercent = (Math.floor(Math.random() * 16) + 5) / 100;
      const penalty = Math.floor(profile.money * losePercent);

      profile.money = Math.max(0, profile.money - penalty);
      target.money += penalty;
      profile.hp = Math.max(1, profile.hp - 30);

      await Database.saveProfile(target.key, target);

      await notifyPlayer(
        target,
        `⚔️ ${profile.name} PK bạn thất bại, nhưng bạn vẫn nhận được ${formatLT(penalty)} từ phản chưởng.`,
        chatId,
      );

      return `💀 Bùm! ${profile.name} ${getRandomMsg(SCENARIOS.pk_lose)} ${target.name} phản chưởng!
💸 Rơi mất ${formatLT(penalty)} (${Math.round(losePercent * 100)}% Linh Thạch) cho đối phương, mất 30 Máu.`;
    }
  }

  if (lowerCmd === "/diemdanh") {
    if (!canUseAction(profile, "daily", now)) {
      return `⏳ /diemdanh đã dùng rồi. Chờ ${formatCdExact(profile.cooldowns.daily - now)} nữa.`;
    }
    setActionCooldown(profile, "daily", now, 24 * 60 * 60 * 1000);

    const lt = addMoney(profile, 180, 360, profile.level * 10);
    const xp = addXp(profile, 15, 35);
    const text = pick(ACTION_TEXT.daily);

    return `🎁 Điểm danh thành công!
${text}.
Nhận được ${formatLT(lt)} và ${xp} XP.`;
  }

  if (lowerCmd === "/nv") {
    if (!canUseAction(profile, "quest", now)) {
      return `⏳ /nv đang hồi. Chờ ${formatCdExact(profile.cooldowns.quest - now)} nữa.`;
    }
    setActionCooldown(profile, "quest", now, 10 * 60 * 1000);

    const lt = addMoney(profile, 120, 260, profile.luck * 4);
    const xp = addXp(profile, 10, 25);
    const text = pick(ACTION_TEXT.quest);

    return `📜 ${text}.
Hoàn thành nhiệm vụ, nhận ${formatLT(lt)} và ${xp} XP.
Quay lại làm nhiệm vụ sau ${formatCdExact(profile.cooldowns.quest - now)} nữa nhé!`;
  }

  if (lowerCmd === "/tuantra") {
    if (!canUseAction(profile, "patrol", now)) {
      return `⏳ /tuantra đang hồi. Chờ ${formatCdExact(profile.cooldowns.patrol - now)} nữa.`;
    }
    setActionCooldown(profile, "patrol", now, 8 * 60 * 1000);

    const lt = addMoney(profile, 160, 320, profile.defense * 3);
    const xp = addXp(profile, 8, 18);
    const text = pick(ACTION_TEXT.patrol);

    return `🛡️ ${text}.
Được thưởng ${formatLT(lt)} và ${xp} XP.
Quay lại tuần tra sau ${formatCdExact(profile.cooldowns.patrol - now)} nữa nhé!`;
  }

  if (lowerCmd === "/giaohang") {
    if (!canUseAction(profile, "delivery", now)) {
      return `⏳ /giaohang đang hồi. Chờ ${formatCdExact(profile.cooldowns.delivery - now)} nữa.`;
    }
    setActionCooldown(profile, "delivery", now, 7 * 60 * 1000);

    const tip =
      Math.random() < 0.3 ? randInt(50, 180) + profile.charisma * 2 : 0;
    const lt = addMoney(profile, 140, 280, profile.charisma * 4 + tip);
    const xp = addXp(profile, 6, 15);
    const text = pick(ACTION_TEXT.delivery);

    return `📦 ${text}.
Nhận ${formatLT(lt)} và ${xp} XP.
Quay lại giao hàng sau ${formatCdExact(profile.cooldowns.delivery - now)} nữa nhé!`;
  }

  if (lowerCmd === "/hunt") {
    if (!canUseAction(profile, "hunt", now)) {
      return `⏳ /hunt đang hồi. Chờ ${formatCdExact(profile.cooldowns.hunt - now)} nữa.`;
    }
    setActionCooldown(profile, "hunt", now, 6 * 60 * 1000);

    const lt = addMoney(
      profile,
      150,
      340,
      profile.power * 2 + profile.agility * 2,
    );
    const xp = addXp(profile, 10, 20);
    profile.materials.ore = (profile.materials.ore || 0) + randInt(0, 2);
    const text = pick(ACTION_TEXT.hunt);

    return `🐾 ${text}.
Nhận ${formatLT(lt)}, ${xp} XP và thêm chút vật liệu.
Quay lại săn bắn sau ${formatCdExact(profile.cooldowns.hunt - now)} nữa nhé!`;
  }

  if (lowerCmd === "/gather") {
    if (!canUseAction(profile, "gather", now)) {
      return `⏳ /gather đang hồi. Chờ ${formatCdExact(profile.cooldowns.gather - now)} nữa.`;
    }
    setActionCooldown(profile, "gather", now, 5 * 60 * 1000);

    const lt = addMoney(profile, 100, 240, profile.luck * 5);
    const xp = addXp(profile, 8, 16);
    profile.materials.herb = (profile.materials.herb || 0) + randInt(1, 3);
    const text = pick(ACTION_TEXT.gather);

    return `🌿 ${text}.
Nhận ${formatLT(lt)}, ${xp} XP và thêm thảo dược.
Quay lại hái lượm sau ${formatCdExact(profile.cooldowns.gather - now)} nữa nhé!`;
  }

  if (lowerCmd === "/salvage") {
    if (!canUseAction(profile, "salvage", now)) {
      return `⏳ /salvage đang hồi. Chờ ${formatCdExact(profile.cooldowns.salvage - now)} nữa.`;
    }
    setActionCooldown(profile, "salvage", now, 6 * 60 * 1000);

    const lt = addMoney(profile, 90, 220, Math.floor(profile.level * 6));
    const xp = addXp(profile, 5, 14);
    const text = pick(ACTION_TEXT.salvage);

    return `♻️ ${text}.
Bán lại được ${formatLT(lt)} và ${xp} XP.
Quay lại thu hồi sau ${formatCdExact(profile.cooldowns.salvage - now)} nữa nhé!`;
  }

  if (lowerCmd === "/escort") {
    if (profile.level < 5) {
      return "🛑 /escort cần ít nhất cấp 5 để nhận hộ tống.";
    }
    if (!canUseAction(profile, "escort", now)) {
      return `⏳ /escort đang hồi. Chờ ${formatCdExact(profile.cooldowns.escort - now)} nữa.`;
    }
    setActionCooldown(profile, "escort", now, 15 * 60 * 1000);

    const danger = Math.random() < 0.2;
    const lt = addMoney(
      profile,
      danger ? 260 : 220,
      danger ? 520 : 420,
      profile.defense * 2 + profile.level * 8,
    );
    const xp = addXp(profile, 12, 30);
    const text = pick(ACTION_TEXT.escort);

    return `🚚 Hộ tống hoàn thành!
${danger ? "Gặp chút tập kích giữa đường nhưng vẫn xử lý gọn." : "Đường đi khá êm, thương nhân trả rất hậu."}
${text}.
Nhận ${formatLT(lt)} và ${xp} XP.`;
  }

  if (lowerCmd === "/trade") {
    if (!canUseAction(profile, "trade", now)) {
      return `⏳ /trade đang hồi. Chờ ${formatCdExact(profile.cooldowns.trade - now)} nữa.`;
    }
    setActionCooldown(profile, "trade", now, 10 * 60 * 1000);

    const swing = randInt(0, 100);
    let lt = 0;
    let note = "";

    if (swing > 85) {
      lt = addMoney(
        profile,
        500,
        1000,
        profile.luck * 8 + profile.charisma * 4,
      );
      note = "📈 Bắt đúng nhịp thị trường, lướt sóng cực đẹp!";
    } else if (swing > 55) {
      lt = addMoney(profile, 180, 420, profile.luck * 4 + profile.charisma * 2);
      note = "📊 Mua bán có lãi nhẹ.";
    } else {
      lt = addMoney(profile, 50, 160, profile.luck * 2);
      note = "📉 Lời ít nhưng vẫn không lỗ.";
    }

    const xp = addXp(profile, 6, 18);
    const text = pick(ACTION_TEXT.trade);

    return `${note}
${text}.
Nhận ${formatLT(lt)} và ${xp} XP.
Quay lại giao dịch sau ${formatCdExact(profile.cooldowns.trade - now)} nữa nhé!`;
  }

  if (lowerCmd === "/pray") {
    if (!canUseAction(profile, "pray", now)) {
      return `⏳ /pray đang hồi. Chờ ${formatCdExact(profile.cooldowns.pray - now)} nữa.`;
    }
    setActionCooldown(profile, "pray", now, 20 * 60 * 1000);

    const blessed = Math.random() < 0.35 + profile.luck * 0.01;
    const lt = blessed
      ? addMoney(profile, 250, 900, profile.luck * 8)
      : addMoney(profile, 30, 120);
    const xp = addXp(profile, 10, 20);
    const text = pick(ACTION_TEXT.pray);

    return blessed
      ? `🙏 Cầu được đáp!
${text}.
Trời ban lộc, nhận ${formatLT(lt)} và ${xp} XP.`
      : `🙏 Cầu hơi hụt, nhưng vẫn có lộc mỏng.
${text}.
Nhận ${formatLT(lt)} và ${xp} XP.
Quay lại cầu phúc sau ${formatCdExact(profile.cooldowns.pray - now)} nữa nhé!`;
  }
  if (lowerCmd === "/treasure") {
    if (!canUseAction(profile, "treasure", now)) {
      return `⏳ /treasure đang hồi. Chờ ${formatCdExact(profile.cooldowns.treasure - now)} nữa.`;
    }
    setActionCooldown(profile, "treasure", now, 12 * 60 * 1000);

    const loot = pickWeighted(TREASURE_TABLE);

    const lt = addMoney(
      profile,
      loot.money[0],
      loot.money[1],
      profile.luck * 6 + profile.level * 3,
    );
    const xp = addXp(profile, loot.xp[0], loot.xp[1]);

    let extra = "";
    if (loot.herb) {
      const qty = randInt(loot.herb[0], loot.herb[1]);
      profile.materials.herb = (profile.materials.herb || 0) + qty;
      if (qty > 0) extra += `\nNhận thêm ${qty} thảo dược.`;
    }
    if (loot.ore) {
      const qty = randInt(loot.ore[0], loot.ore[1]);
      profile.materials.ore = (profile.materials.ore || 0) + qty;
      if (qty > 0) extra += `\nNhận thêm ${qty} quặng.`;
    }
    if (loot.item) {
      giveItem(profile, loot.item.id, loot.item.qty || 1);
      extra += `\nRơi ra vật phẩm: ${loot.item.id} x${loot.item.qty || 1}.`;
    }

    return `${loot.title}
Nhận ${formatLT(lt)} và ${xp} XP.${extra}
Quay lại tìm kho báu sau ${formatCdExact(profile.cooldowns.treasure - now)} nữa nhé!`;
  }
  // Cờ bạc
  if (lowerCmd === "/taixiu") {
    const c = args[0]?.toLowerCase(),
      b = parseInt(args[1], 10); // Đặt cược bằng linh thạch
    if (!["tai", "xiu"].includes(c) || isNaN(b) || b <= 0)
      return "🎲 Dùng lệnh: `/taixiu <tai/xiu> <tiền_linh_thạch>`";
    if (profile.money < b)
      return `💸 Không đủ vốn! Bạn chỉ có ${formatLT(profile.money)}.`;
    profile.money -= b;
    const d1 = Math.floor(Math.random() * 6) + 1,
      d2 = Math.floor(Math.random() * 6) + 1,
      d3 = Math.floor(Math.random() * 6) + 1;
    const s = d1 + d2 + d3,
      r = s >= 11 ? "tai" : "xiu",
      win = c === r;
    if (win) profile.money += b * 2;
    return `🎲 Lắc... Mở!: ${d1}-${d2}-${d3} (Tổng ${s}: ${r.toUpperCase()})\n${win ? `🎉 ĂN! Lụm ${formatLT(b * 2)}!` : `💀 TOANG! Mất sạch ${formatLT(b)}.`}`;
  }

  if (lowerCmd === "/key") {
    return senderId
      ? `🔑 SenderID của bạn:\n\n${senderId}`
      : "❌ Không lấy được SenderID.";
  }

  if (lowerCmd === "/use") {
    const id = args[0]?.toLowerCase();
    const amount = Math.max(1, parseInt(args[1], 10) || 1);

    if (!id) return "🛑 Dùng: `/use <mã> [số_lượng]`";
    const item = GAME_SHOP_ITEMS[id];
    if (!item) return "🛑 Không có vật phẩm này!";

    const owned = profile.inventory[id] || 0;
    if (owned < amount) return `🛑 Ngươi chỉ có ${owned} ${item.name}.`;

    // Cuốn kinh nghiệm / sách kinh nghiệm
    if (isExpScrollItem(item, id)) {
      profile.inventory[id] -= amount;
      if (profile.inventory[id] <= 0) delete profile.inventory[id];

      const baseXp =
        Number(
          item.stats?.exp || item.stats?.xp || item.exp || item.xp || 120,
        ) || 120;
      const bonusXp = Math.floor(
        baseXp * amount + profile.level * 8 + profile.luck * 2,
      );
      profile.exp += bonusXp;

      return `📖 Đã dùng ${amount} ${item.name}!\n✨ Nhận ${bonusXp} XP.`;
    }

    // Đan dược
    if (item.type === "dan") {
      profile.inventory[id] -= amount;
      if (profile.inventory[id] <= 0) delete profile.inventory[id];

      const statsMap = {
        linhKhi: "✨ Linh Khí",
        luck: "🍀 May Mắn",
        power: "⚔️ Công",
        defense: "🛡️ Thủ",
        agility: "💨 Nhanh Nhẹn",
        charisma: "💖 Mị Lực",
        xpRate: "📚 Ngộ đạo",
        hp_bonus: "❤️ HP",
      };

      const bonusText = [];

      // ===== Hồi máu cố định =====
      if (item.heal) {
        const heal = item.heal * amount;
        const before = profile.hp;

        profile.hp = Math.min(profile.max_hp, profile.hp + heal);

        bonusText.push(`❤️ Hồi ${profile.hp - before} HP`);
      }

      // ===== Hồi máu theo % =====
      if (item.healPercent) {
        const before = profile.hp;

        if (item.healPercent >= 100) {
          profile.hp = profile.max_hp;
        } else {
          const heal = Math.floor((profile.max_hp * item.healPercent) / 100);
          profile.hp = Math.min(profile.max_hp, profile.hp + heal);
        }

        bonusText.push(`❤️ Hồi ${profile.hp - before} HP`);
      }

      // ===== Các chỉ số cũ =====
      for (const [key, label] of Object.entries(statsMap)) {
        const value = (item.stats?.[key] || 0) * amount;
        if (value !== 0) {
          if (key === "hp_bonus") {
            profile.max_hp = (profile.max_hp || 0) + value;
            profile.hp = Math.min(profile.max_hp, profile.hp + value);
          } else {
            profile[key] = (profile[key] || 0) + value;
          }
          bonusText.push(`${label} +${value}`);
        }
      }

      return `✨ Đã sử dụng ${amount} ${item.name}!\n\n${bonusText.join("\n")}`;
    }

    return `📦 ${item.name} không thể dùng trực tiếp.`;
  }

  if (lowerCmd === "/buy") {
    const id = args[0]?.toLowerCase();
    const amount = Math.max(1, parseInt(args[1], 10) || 1);
    if (!id) return "🛑 Dùng: `/buy <mã> [số_lượng]`";
    const item = GAME_SHOP_ITEMS[id];
    if (!item) return "🛑 Không có món này!";
    const totalCost = item.price * amount;
    if (profile.money < totalCost)
      return `💸 Thiếu linh thạch! ${amount} món này giá ${formatLT(totalCost)}.`;
    profile.money -= totalCost;
    grantItem(profile, id, amount);
    return `✅ Đã mua ${amount} x ${item.name} thành công! Trừ đi ${formatLT(totalCost)}.`;
  }

  if (lowerCmd === "/sell") {
    const id = args[0]?.toLowerCase();
    const amount = Math.max(1, parseInt(args[1], 10) || 1);
    if (!id) return "🛑 Dùng: `/sell <mã> [số_lượng]`";
    const item = GAME_SHOP_ITEMS[id];
    if (!item) return "🛑 Không có món này!";
    const owned = profile.inventory[id] || 0;
    if (owned < amount) return `🛑 Ngươi chỉ có ${owned} ${item.name}.`;
    if (item.type === "cong-phap" && profile.equippedCongPhap.includes(id)) {
      return "📜 Công pháp đang lĩnh ngộ, không thể bán.";
    }
    const sellPrice = Math.max(1, Math.floor(item.price * 0.5));
    profile.inventory[id] -= amount;
    if (profile.inventory[id] <= 0) delete profile.inventory[id];
    removeItemEffect(profile, id, amount);
    profile.money += sellPrice * amount;
    return `💸 Đã bán ${amount} x ${item.name} lấy ${formatLT(sellPrice * amount)}.`;
  }

  if (["/inv", "/inventory"].includes(lowerCmd)) {
    const l = Object.entries(profile.inventory || {})
      .filter(([, c]) => c > 0)
      .map(
        ([k, c]) =>
          `x${c} ${GAME_SHOP_ITEMS[k]?.emoji || "📦"} ${GAME_SHOP_ITEMS[k]?.name || k} (${k}) `,
      );
    return l.length
      ? `🎒 TÚI CÀN KHÔN 🎒\n━━━━━━━━━━━━━━━━━━━━\n${l.join("\n")}`
      : "🎒 Túi trống rỗng. Chuột chạy qua còn rớt nước mắt.";
  }

  return null;
}

// ===============================
// GEMINI AI LAYER (GAME-AWARE)
// ===============================

function normalizeQueryText(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const GAME_AI_KEYWORDS = [
  "tu vi",
  "tu tien",
  "canh gioi",
  "dot pha",
  "be quan",
  "luc",
  "level",
  "exp",
  "boss",
  "shop",
  "danh boss",
  "goi boss",
  "linh thach",
  "linh khi",
  "cong phap",
  "hoc cong phap",
  "farm",
  "nong trai",
  "luyen dan",
  "luyen khi",
  "inv",
  "inventory",
  "me",
  "profile",
  "info",
  "help",
  "xo",
  "co vua",
  "pk",
  "rob",
  "work",
  "mine",
  "pray",
  "trade",
  "escort",
  "gather",
  "hunt",
  "treasure",
  "tuan tra",
  "diem danh",
  "mua",
  "ban",
  "use",
  "buy",
  "sell",
];

function looksLikeGameQuestion(text) {
  const q = normalizeQueryText(text);
  if (!q) return false;

  if (GAME_AI_KEYWORDS.some((k) => q.includes(normalizeQueryText(k)))) {
    return true;
  }

  const askPattern =
    /(lam sao|cach nao|nen lam gi|nen mua gi|dung lenh nao|lenh gi|vi sao|tai sao|how to|how do i).*(tu vi|tu tien|canh gioi|boss|shop|linh thach|linh khi|cong phap|farm|xo|co vua|pk|rob|work|mine|pray|trade|escort|gather|hunt|treasure|diem danh|inv|inventory|profile|info|help)/i;

  return askPattern.test(q);
}

function buildSystemPrompt() {
  return [
    "Bạn là trợ lý cho bot Zalo game tu tiên.",
    "Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, thân thiện.",
    "Nếu câu hỏi liên quan game/hệ thống, phải ưu tiên dữ liệu hệ thống được cung cấp.",
    "Không bịa ra lệnh, vật phẩm, chỉ số, boss, hay cơ chế không có trong dữ liệu.",
    "Nếu thiếu dữ liệu thì nói ngắn gọn là chưa thấy trong hệ thống.",
    "Nếu người dùng hỏi cách làm, hãy chỉ đúng lệnh/cú pháp khả dụng.",
    "Tính cách hài hước, thích khịa",
    "Tối đa 1 đến 7 câu.",
  ].join("\n");
}

function buildGameSystemPrompt() {
  return [
    "Bạn là trợ lý chuyên trả lời câu hỏi về hệ thống game tu tiên.",
    "Nhiệm vụ chính: dựa vào JSON hệ thống để trả lời đúng.",
    "Ưu tiên: tu vi, cảnh giới, level, exp, HP, linh khí, shop, boss, farm, inventory, công pháp, luyện đan, luyện khí, nhiệm vụ, điểm danh, cờ XO, cờ vua.",
    "Không bịa lệnh, vật phẩm, chỉ số, hay quy tắc chưa có trong JSON.",
    "Nếu thiếu dữ liệu, nói rõ 'chưa thấy trong hệ thống'.",
    "Nếu câu hỏi mơ hồ, trả lời ngắn và gợi ý lệnh phù hợp.",
    "Tính cách hài hước, thích khịa",
    "Rất ngắn gọn, 1 đến 7 câu.",
  ].join("\n");
}

async function askGemini({
  prompt,
  imageUrl = null,
  systemInstruction = null,
}) {
  if (!AI_ENABLED || !GEMINI_API_KEY) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const parts = [];
  if (prompt) parts.push({ text: String(prompt) });

  if (imageUrl) {
    const media = await downloadRemoteBlobAsBase64(imageUrl);
    parts.push({
      inlineData: {
        mimeType: media.mimeType,
        data: media.base64,
      },
    });
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.5,
      topP: 0.9,
      maxOutputTokens: 512,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: String(systemInstruction) }],
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} ${JSON.stringify(data)}`,
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("")
        .trim() || "";

    return text || null;
  } catch (err) {
    console.error("[AI] Gemini error:", err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function buildGameAiContext({ profile, chatId, question }) {
  const all = await Database.getAllProfiles();

  const topLevel = [...all]
    .sort(
      (a, b) => (b.level || 1) - (a.level || 1) || (b.exp || 0) - (a.exp || 0),
    )
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      level: p.level || 1,
      exp: Math.floor(p.exp || 0),
      money: p.money || 0,
    }));

  const topMoney = [...all]
    .sort((a, b) => (b.money || 0) - (a.money || 0))
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      money: p.money || 0,
      level: p.level || 1,
    }));

  const boss = activeBosses.get(chatId);
  const realm = getRealmInfo(profile.level);
  const realCult = calcRealtimeCultivation(profile);

  const inv = Object.entries(profile.inventory || {})
    .filter(([, c]) => c > 0)
    .slice(0, 20)
    .map(([id, count]) => ({
      id,
      name: GAME_SHOP_ITEMS[id]?.name || id,
      type: GAME_SHOP_ITEMS[id]?.type || "unknown",
      count,
    }));

  const cooldowns = {};
  for (const [k, v] of Object.entries(profile.cooldowns || {})) {
    cooldowns[k] = Math.max(0, (v || 0) - Date.now());
  }

  return {
    player: {
      name: profile.name,
      level: profile.level,
      realm: `${realm.emoji} ${realm.name}`,
      exp: Math.floor(profile.exp || 0),
      hp: profile.hp,
      max_hp: profile.max_hp,
      money: profile.money,
      linhKhi: profile.linhKhi,
      power: profile.power,
      defense: profile.defense,
      luck: profile.luck,
      agility: profile.agility,
      charisma: profile.charisma,
      inventory: inv,
      equippedCongPhap: (profile.equippedCongPhap || []).map(
        (id) => GAME_SHOP_ITEMS[id]?.name || id,
      ),
      cultivation: {
        active: !!profile.cultivation?.active,
        secs: realCult.secs,
        rate: realCult.rate,
        expBonus: realCult.xp,
        linhKhiBonus: realCult.linhKhi,
      },
      cooldowns,
    },
    boss: boss
      ? {
          name: boss.name,
          hp: boss.hp,
          max_hp: boss.max_hp,
          tier: boss.tierInfo?.name || boss.tier || null,
          question: boss.math?.question || null,
          phase: boss.phase || null,
        }
      : null,
    topLevel,
    topMoney,
    commands: [
      "/me",
      "/info",
      "/help",
      "/inv",
      "/shop",
      "/buy",
      "/sell",
      "/use",
      "/hoc",
      "/tuluyen",
      "/stop",
      "/farm",
      "/luyendan",
      "/luyenkhi",
      "/cauca",
      "/work",
      "/mine",
      "/pray",
      "/treasure",
      "/goiboss",
      "/danhboss",
      "/xo",
      "/covua",
    ],
    question,
  };
}

async function askGeminiWithGameData({
  question,
  senderName,
  profile,
  chatId,
}) {
  const ctx = await buildGameAiContext({ profile, chatId, question });

  const prompt = [
    `Người chơi hỏi: ${question}`,
    senderName ? `Người hỏi: ${senderName}` : "",
    "Dữ liệu hệ thống (JSON):",
    JSON.stringify(ctx, null, 2),
    "Hãy trả lời dựa trên dữ liệu hệ thống ở trên.",
    "Nếu hỏi cách lên tu vi, hãy chỉ đúng hướng trong hệ thống hiện có.",
    "Nếu thiếu dữ liệu, nói ngắn là chưa thấy trong hệ thống.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return askGemini({
    prompt,
    systemInstruction: buildGameSystemPrompt(),
  });
}

async function processIncomingEvent(body) {
    const chatId = extractChatId(body);
    if (!chatId) return;

    const senderName = extractSenderName(body);
    const senderId = extractSenderId(body);

    const rawText = normalizeText(extractText(body));
    const cleanText = stripBotMentions(rawText);

    if (!cleanText) return;

    totalMessages++;

    const profile = await getOrCreateProfile(
        chatId,
        senderId,
        senderName
    );

    let isSayCommand = false;
    let replyText = null;
    let cultMsg = "";

    const viewCmds = [
        "/tu-tien",
        "/profile",
        "/info",
        "/me",
        "/inv",
        "/inventory",
        "/shop",
        "/farm",
        "/tuluyen",
        "/tl",
        "/help",
    ];

    const lowerText = cleanText
        .toLowerCase()
        .trim()
        .split(" ")[0];

    // Nếu đang bế quan thì ngắt khi thực hiện lệnh khác
    if (
        profile.cultivation?.active &&
        !viewCmds.includes(lowerText)
    ) {
        const res = stopCultivation(profile);

        if (res && res.ok) {
            cultMsg = `\n\n⚠️ Động tĩnh làm ngắt bế quan: +${res.xp} XP`;
        }
    }

    // EXP & hồi máu
    profile.exp += 2;

    if (profile.hp > 1 && profile.hp < profile.max_hp) {
        profile.hp = Math.min(
            profile.max_hp,
            profile.hp + 2
        );
    }

    // Xử lý lệnh game
    if (!replyText && cleanText.startsWith("/")) {
        replyText = await handleGameCommand(
            cleanText,
            profile,
            chatId,
            senderId,
            senderName
        );
    }

    // AI trả lời
    if (!replyText && !cleanText.startsWith("/") && AUTO_AI) {
        await sendChatAction(chatId, "typing");
        replyText = await askGeminiWithGameData({
    question: cleanText,
    senderName,
    profile,
    chatId,
    });
    }

    // Kiểm tra lên cấp
    await checkLevelUp(profile, chatId);

    // Lưu dữ liệu
    await Database.saveProfile(profile.key, profile);

    // Gửi phản hồi
    if (replyText || cultMsg) {
        const finalMsg = isSayCommand
            ? replyText
            : `${
                  replyText
                      ? formatReplyForSender(senderName, replyText)
                      : ""
              }${cultMsg}`;

        await sendLongMessage(chatId, finalMsg.trim());
    }
}

app.post("/webhook", async (req, res) => {
    try {
        if (
            WEBHOOK_SECRET &&
            getIncomingSecret(req) !== WEBHOOK_SECRET
        ) {
            return res.status(403).json({
                ok: false,
            });
        }

        res.status(200).json({
            ok: true,
        });

        processIncomingEvent(req.body).catch((e) =>
            console.error(e)
        );
    } catch (error) {
        res.status(500).json({
            ok: false,
        });
    }
});

app.get("/", (req, res) => {
    res.send("🏯 HỆ THỐNG TU TIÊN HOÀN THIỆN ĐANG CHẠY.");
});

app.listen(PORT, () => {
    console.log(
        `🚀 Tu Tiên Server Mở Tại Cổng ${PORT}`
    );
});