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
  if (tiktokLive) {
    try {
      tiktokLive.disconnect();
    } catch (e) {
      // bỏ qua lỗi disconnect cũ
    }
    tiktokLive = null;
  }

  currentUsername = targetUsername.trim().replace(/^@/, "");
  console.log(`\n[TIKTOK] Đang kết nối tới TikTok Live: @${currentUsername}...`);
  broadcast({ type: "STATUS", state: "connecting", username: currentUsername });

  tiktokLive = new TikTokLiveConnection(currentUsername, {
    processInitialData: true,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: false,
  });

  // Lắng nghe bình luận (CHAT)
  tiktokLive.on(WebcastEvent.CHAT, (data) => {
    const userInfo = extractUserInfo(data?.user);
    // content chứa tin nhắn văn bản; fallback sang comment nếu có
    const comment = data?.content || data?.comment || "";

    console.log(`[CHAT] ${userInfo.nickname} (@${userInfo.uniqueId}): ${comment}`);

    broadcast({
      type: "CHAT",
      data: {
        ...userInfo,
        comment,
      },
    });
  });

  // Lắng nghe quà tặng (GIFT)
  tiktokLive.on(WebcastEvent.GIFT, (data) => {
    const userInfo = extractUserInfo(data?.user);
    const giftName = data?.giftDetails?.giftName || data?.gift?.name || `Quà #${data?.giftId || ""}`;
    const repeatCount = data?.repeatCount || 1;
    // Lấy số xu/kim cương thật của quà (diamondCount) hoặc fallback theo repeatCount
    const diamondCount = (data?.gift?.diamondCount || data?.diamondCount || 1) * repeatCount;

    console.log(`[GIFT] ${userInfo.nickname} tặng ${giftName} x${repeatCount} (${diamondCount} xu)`);

    broadcast({
      type: "GIFT",
      data: {
        ...userInfo,
        giftName,
        repeatCount,
        diamondCount,
      },
    });
  });

  // Lắng nghe người xem vào phòng (MEMBER / JOIN)
  tiktokLive.on(WebcastEvent.MEMBER, (data) => {
    const userInfo = extractUserInfo(data?.user);
    console.log(`[JOIN] ${userInfo.nickname} (@${userInfo.uniqueId}) vào live`);

    broadcast({
      type: "JOIN",
      data: userInfo,
    });
  });

  // Lắng nghe thả tim (LIKE)
  tiktokLive.on(WebcastEvent.LIKE, (data) => {
    const userInfo = extractUserInfo(data?.user);
    const likeCount = data?.count || data?.likeCount || 1;

    broadcast({
      type: "LIKE",
      data: {
        ...userInfo,
        likeCount,
      },
    });
  });

  // Lắng nghe Follow
  tiktokLive.on(WebcastEvent.FOLLOW, (data) => {
    const userInfo = extractUserInfo(data?.user);
    console.log(`[FOLLOW] ${userInfo.nickname} (@${userInfo.uniqueId}) đã follow`);

    broadcast({
      type: "FOLLOW",
      data: userInfo,
    });
  });

  // Lắng nghe Share
  tiktokLive.on(WebcastEvent.SHARE, (data) => {
    const userInfo = extractUserInfo(data?.user);
    console.log(`[SHARE] ${userInfo.nickname} (@${userInfo.uniqueId}) đã chia sẻ`);

    broadcast({
      type: "SHARE",
      data: userInfo,
    });
  });

  tiktokLive.on(WebcastEvent.DISCONNECTED, () => {
    console.log("[TIKTOK] Đã ngắt kết nối với phòng live.");
    broadcast({ type: "STATUS", state: "disconnected", username: currentUsername });
  });

  tiktokLive.on(WebcastEvent.ERROR, (err) => {
    console.error("[TIKTOK ERROR]", err?.message || err);
    broadcast({ type: "ERROR", message: err?.message || String(err) });
  });

  try {
    const state = await tiktokLive.connect();
    currentRoomId = state.roomId;
    console.log(`[TIKTOK] Kết nối thành công! Room ID: ${state.roomId}`);
    broadcast({
      type: "STATUS",
      state: "connected",
      username: currentUsername,
      roomId: state.roomId,
    });
  } catch (err) {
    console.error(`[TIKTOK] Kết nối thất bại: ${err?.message || err}`);
    broadcast({
      type: "ERROR",
      message: `Không thể kết nối tới @${currentUsername}. Hãy đảm bảo kênh đang phát livestream!`,
    });
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

// Khởi động server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Giao diện web theo dõi TikTok Live đang chạy tại:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Bắt đầu kết nối tiktok ban đầu
  connectToTikTok(currentUsername);
});
