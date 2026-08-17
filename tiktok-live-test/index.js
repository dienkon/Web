// index.js
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

// Username TikTok, KHÔNG có @
const username = "dgnl.empireteam";

// 2.4.2 của bạn đang lỗi khi options = undefined,
// nên truyền {} để tránh crash ở processInitialData.
const tiktokLive = new TikTokLiveConnection(username, {
  processInitialData: true,
  fetchRoomInfoOnConnect: true,
  enableExtendedGiftInfo: false,
});

async function main() {
  try {
    const state = await tiktokLive.connect();
    console.log("Connected!");
    console.log("Room ID:", state.roomId);
  } catch (err) {
    console.error("Connect failed:", err);
    process.exit(1);
  }
}

tiktokLive.on(WebcastEvent.CHAT, (data) => {
  const user = data?.user?.uniqueId ?? "unknown";
  const comment = data?.comment ?? "";
  console.log(`[CHAT] ${user}: ${comment}`);
});

tiktokLive.on(WebcastEvent.GIFT, (data) => {
  const user = data?.user?.uniqueId ?? "unknown";
  const giftId = data?.giftId ?? "unknown";
  console.log(`[GIFT] ${user} -> giftId=${giftId}`);
});

tiktokLive.on(WebcastEvent.FOLLOW, (data) => {
  const user = data?.user?.uniqueId ?? "unknown";
  console.log(`[FOLLOW] ${user}`);
});

tiktokLive.on(WebcastEvent.LIKE, (data) => {
  const user = data?.user?.uniqueId ?? "unknown";
  console.log(`[LIKE] ${user}`);
});

tiktokLive.on(WebcastEvent.MEMBER, (data) => {
  const user = data?.user?.uniqueId ?? "unknown";
  console.log(`[JOIN] ${user}`);
});

tiktokLive.on(WebcastEvent.SHARE, (data) => {
  const user = data?.user?.uniqueId ?? "unknown";
  console.log(`[SHARE] ${user}`);
});

tiktokLive.on(WebcastEvent.CONNECTED, () => {
  console.log("WebSocket connected.");
});

tiktokLive.on(WebcastEvent.DISCONNECTED, () => {
  console.log("Disconnected.");
});

tiktokLive.on(WebcastEvent.ERROR, (err) => {
  console.error("Stream error:", err);
});

main();
