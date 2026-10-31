import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
let currentUsername = "dgnl.empireteam"; // Username mặc định (không có @)
let tiktokLive = null;
let currentRoomId = null;
let isConnecting = false;

// Bộ nhớ chống trùng lặp sự kiện (Deduplication Cache)
const seenMessageIds = new Set();
const recentEventSignatures = new Map();
const MAX_SEEN_IDS = 3000;
const DEDUP_WINDOW_MS = 2500; // 2.5 giây

function getEventMsgId(data) {
  return data?.common?.msgId || data?.msgId || data?.id || data?.common?.messageId || "";
}

function isDuplicateEvent(type, data, userInfo, extraKey = "") {
  // 1. Kiểm tra msgId duy nhất từ TikTok protobuf
  const msgId = getEventMsgId(data);
  if (msgId && typeof msgId === "string" && msgId.length > 3) {
    if (seenMessageIds.has(msgId)) {
      return true; // Trùng lặp ID gói tin!
    }
    seenMessageIds.add(msgId);
    if (seenMessageIds.size > MAX_SEEN_IDS) {
      const oldest = seenMessageIds.values().next().value;
      seenMessageIds.delete(oldest);
    }
  }

  // 2. Kiểm tra chữ ký sự kiện trong cửa sổ thời gian ngắn
  const now = Date.now();
  const signature = `${type}::${userInfo.uniqueId}::${extraKey}`;
  const lastTime = recentEventSignatures.get(signature);

  if (recentEventSignatures.size > 2000) {
    for (const [k, t] of recentEventSignatures.entries()) {
      if (now - t > 10000) recentEventSignatures.delete(k);
    }
  }

  if (lastTime && now - lastTime < DEDUP_WINDOW_MS) {
    return true; // Trùng lặp sự kiện trong khoảng thời gian ngắn!
  }

  recentEventSignatures.set(signature, now);
  return false;
}

// Khởi tạo HTTP server phục vụ trang web giao diện và static files trong public/
const server = http.createServer((req, res) => {
  const reqUrl = req.url.split("?")[0];
  let filePath = path.join(__dirname, "public", reqUrl === "/" ? "index.html" : reqUrl);

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (reqUrl !== "/" && !ext) {
        // Fallback sang index.html nếu route ảo
        fs.readFile(path.join(__dirname, "public", "index.html"), (err2, data2) => {
          if (err2) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("File không tồn tại");
      return;
    }
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

// WebSocket Server để stream sự kiện từ TikTok về Browser
const wss = new WebSocketServer({ server });

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Trích xuất thông tin người dùng chính xác
function extractUserInfo(userObj) {
  if (!userObj) {
    return {
      uniqueId: "unknown",
      nickname: "Người dùng",
      avatar: ""
    };
  }

  // tiktok-live-connector v2.4+ lưu username ở displayId hoặc uniqueId
  const uniqueId = userObj.displayId || userObj.uniqueId || userObj.id || "unknown";
  const nickname = userObj.nickname || uniqueId;
  const avatar = userObj.avatarThumb?.urlList?.[0] || userObj.avatarMedium?.urlList?.[0] || "";

  return { uniqueId, nickname, avatar };
}

// Kết nối tới TikTok Live
async function connectToTikTok(targetUsername) {
  const cleanUsername = (targetUsername || "").trim().replace(/^@/, "");
  if (!cleanUsername) return;

  // Nếu đang kết nối hoặc đã kết nối với đúng kênh này thì không khởi tạo lại để tránh duplicate listener
  if (cleanUsername === currentUsername && tiktokLive && (tiktokLive.isConnected || isConnecting)) {
    console.log(`[TIKTOK] Đang hoặc đã kết nối tới @${cleanUsername}, giữ nguyên phiên làm việc hiện tại.`);
    return;
  }

  isConnecting = true;
  currentUsername = cleanUsername;

  // Dọn dẹp triệt để phiên kết nối cũ trước khi mở phiên mới
  if (tiktokLive) {
    try {
      tiktokLive.removeAllListeners();
      await tiktokLive.disconnect();
    } catch (e) {
      // bỏ qua lỗi disconnect cũ
    }
    tiktokLive = null;
  }

  // Dọn dẹp cache dedup khi chuyển kênh
  seenMessageIds.clear();
  recentEventSignatures.clear();

  console.log(`\n[TIKTOK] Đang kết nối tới TikTok Live: @${currentUsername}...`);
  broadcast({ type: "STATUS", state: "connecting", username: currentUsername });

  const activeClient = new TikTokLiveConnection(currentUsername, {
    processInitialData: false, // TẮT replay batch cũ để tránh trùng lặp ngay khi vừa kết nối
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: false,
  });
  tiktokLive = activeClient;

  // Lắng nghe bình luận (CHAT)
  activeClient.on(WebcastEvent.CHAT, (data) => {
    if (tiktokLive !== activeClient) return; // Bảo vệ stale instance
    const userInfo = extractUserInfo(data?.user);
    const comment = (data?.content || data?.comment || "").trim();
    if (isDuplicateEvent("CHAT", data, userInfo, comment)) return;

    console.log(`[CHAT] ${userInfo.nickname} (@${userInfo.uniqueId}): ${comment}`);

    broadcast({
      type: "CHAT",
      data: {
        ...userInfo,
        comment,
        msgId: getEventMsgId(data),
      },
    });
  });

  // Lắng nghe quà tặng (GIFT)
  activeClient.on(WebcastEvent.GIFT, (data) => {
    if (tiktokLive !== activeClient) return;
    const userInfo = extractUserInfo(data?.user);
    const giftName = data?.giftDetails?.giftName || data?.gift?.name || `Quà #${data?.giftId || ""}`;
    const repeatCount = data?.repeatCount || 1;
    const diamondCount = (data?.gift?.diamondCount || data?.diamondCount || 1) * repeatCount;
    const giftKey = `${giftName}::${repeatCount}::${data?.groupId || ""}`;
    if (isDuplicateEvent("GIFT", data, userInfo, giftKey)) return;

    console.log(`[GIFT] ${userInfo.nickname} tặng ${giftName} x${repeatCount} (${diamondCount} xu)`);

    broadcast({
      type: "GIFT",
      data: {
        ...userInfo,
        giftName,
        repeatCount,
        diamondCount,
        msgId: getEventMsgId(data),
      },
    });
  });

  // Lắng nghe người xem vào phòng (MEMBER / JOIN)
  activeClient.on(WebcastEvent.MEMBER, (data) => {
    if (tiktokLive !== activeClient) return;
    const userInfo = extractUserInfo(data?.user);
    if (isDuplicateEvent("MEMBER", data, userInfo, "JOIN")) return;

    console.log(`[JOIN] ${userInfo.nickname} (@${userInfo.uniqueId}) vào live`);

    broadcast({
      type: "JOIN",
      data: {
        ...userInfo,
        msgId: getEventMsgId(data),
      },
    });
  });

  // Lắng nghe thả tim (LIKE)
  activeClient.on(WebcastEvent.LIKE, (data) => {
    if (tiktokLive !== activeClient) return;
    const userInfo = extractUserInfo(data?.user);
    const likeCount = data?.count || data?.likeCount || 1;
    if (isDuplicateEvent("LIKE", data, userInfo, `${likeCount}`)) return;

    broadcast({
      type: "LIKE",
      data: {
        ...userInfo,
        likeCount,
        msgId: getEventMsgId(data),
      },
    });
  });

  // Lắng nghe Follow
  activeClient.on(WebcastEvent.FOLLOW, (data) => {
    if (tiktokLive !== activeClient) return;
    const userInfo = extractUserInfo(data?.user);
    if (isDuplicateEvent("FOLLOW", data, userInfo, "FOLLOW")) return;

    console.log(`[FOLLOW] ${userInfo.nickname} (@${userInfo.uniqueId}) đã follow`);

    broadcast({
      type: "FOLLOW",
      data: {
        ...userInfo,
        msgId: getEventMsgId(data),
      },
    });
  });

  // Lắng nghe Share
  activeClient.on(WebcastEvent.SHARE, (data) => {
    if (tiktokLive !== activeClient) return;
    const userInfo = extractUserInfo(data?.user);
    if (isDuplicateEvent("SHARE", data, userInfo, "SHARE")) return;

    console.log(`[SHARE] ${userInfo.nickname} (@${userInfo.uniqueId}) đã chia sẻ`);

    broadcast({
      type: "SHARE",
      data: {
        ...userInfo,
        msgId: getEventMsgId(data),
      },
    });
  });

  activeClient.on(WebcastEvent.DISCONNECTED, () => {
    if (tiktokLive !== activeClient) return;
    console.log("[TIKTOK] Đã ngắt kết nối với phòng live.");
    broadcast({ type: "STATUS", state: "disconnected", username: currentUsername });
  });

  activeClient.on(WebcastEvent.ERROR, (err) => {
    if (tiktokLive !== activeClient) return;
    console.error("[TIKTOK ERROR]", err?.message || err);
    broadcast({ type: "ERROR", message: err?.message || String(err) });
  });

  try {
    const state = await activeClient.connect();
    if (tiktokLive !== activeClient) return;
    currentRoomId = state.roomId;
    console.log(`[TIKTOK] Kết nối thành công! Room ID: ${state.roomId}`);
    broadcast({
      type: "STATUS",
      state: "connected",
      username: currentUsername,
      roomId: state.roomId,
    });
  } catch (err) {
    if (tiktokLive !== activeClient) return;
    console.error(`[TIKTOK] Kết nối thất bại: ${err?.message || err}`);
    broadcast({
      type: "ERROR",
      message: `Không thể kết nối tới @${currentUsername}. Hãy đảm bảo kênh đang phát livestream!`,
    });
  } finally {
    isConnecting = false;
  }
}

// Xử lý khi trình duyệt mở kết nối WebSocket
wss.on("connection", (ws) => {
  // Gửi trạng thái hiện tại về cho trình duyệt vừa mở
  ws.send(
    JSON.stringify({
      type: "INIT",
      username: currentUsername,
      state: tiktokLive?.isConnected ? "connected" : "idle",
      roomId: currentRoomId,
    })
  );

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === "SWITCH_USER" && data.username) {
        connectToTikTok(data.username);
      }
    } catch (err) {
      console.error("Lỗi parse message từ client:", err);
    }
  });
});

// Bắt lỗi nếu cổng 3000 bị chiếm dụng (EADDRINUSE)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ [LỖI] Cổng ${PORT} đang bị chiếm dụng (EADDRINUSE).`);
    console.error(`👉 Có thể bạn đang mở sẵn 1 cửa sổ chạy server khác ở background.`);
    console.error(`👉 Hãy đóng cửa sổ terminal/node cũ trước khi chạy lại.\n`);
  } else {
    console.error("Lỗi server HTTP:", err);
  }
  process.exit(1);
});

// Khởi động server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Giao diện web theo dõi TikTok Live đang chạy tại:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Bắt đầu kết nối tiktok ban đầu
  connectToTikTok(currentUsername);
});
