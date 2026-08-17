# main.py
from __future__ import annotations

import asyncio
import json
import os
import time
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from TikTokLive import TikTokLiveClient
from TikTokLive.events import (
    CommentEvent,
    ConnectEvent,
    DisconnectEvent,
    FollowEvent,
    GiftEvent,
    JoinEvent,
    LikeEvent,
    ShareEvent,
)

USERNAME = "cophamlieu.fatima0208"
STATS_FILE = Path("tiktok_stats.json")
REPORT_EVERY_SECONDS = 60


def now_str() -> str:
    return datetime.now().strftime("%H:%M:%S")


def safe_nickname(event) -> str:
    return getattr(getattr(event, "user", None), "nickname", None) or "unknown"


def safe_unique_id(event) -> str:
    return getattr(getattr(event, "user", None), "unique_id", None) or "unknown"


def fmt_duration(seconds: int) -> str:
    m, s = divmod(max(0, int(seconds)), 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h}h {m}m {s}s"
    if m:
        return f"{m}m {s}s"
    return f"{s}s"


def top_lines(counter: Counter, title: str, limit: int = 5) -> str:
    if not counter:
        return f"{title}: chưa có dữ liệu"
    lines = [f"{title}:"]
    for i, (name, count) in enumerate(counter.most_common(limit), start=1):
        lines.append(f"  {i}. {name} — {count}")
    return "\n".join(lines)


@dataclass
class LiveStats:
    started_at: float = field(default_factory=time.time)

    comments: int = 0
    gifts: int = 0
    follows: int = 0
    likes: int = 0
    shares: int = 0
    joins: int = 0

    unique_chatters: set[str] = field(default_factory=set)
    top_commenters: Counter = field(default_factory=Counter)
    top_gifts: Counter = field(default_factory=Counter)
    top_gifters: Counter = field(default_factory=Counter)

    last_question: str = ""
    last_answer: str = ""

    def uptime(self) -> str:
        return fmt_duration(time.time() - self.started_at)

    def to_json(self) -> dict:
        return {
            "started_at": self.started_at,
            "comments": self.comments,
            "gifts": self.gifts,
            "follows": self.follows,
            "likes": self.likes,
            "shares": self.shares,
            "joins": self.joins,
            "unique_chatters": list(self.unique_chatters),
            "top_commenters": dict(self.top_commenters),
            "top_gifts": dict(self.top_gifts),
            "top_gifters": dict(self.top_gifters),
            "last_question": self.last_question,
            "last_answer": self.last_answer,
        }

    @classmethod
    def from_json(cls, data: dict) -> "LiveStats":
        stats = cls()
        stats.started_at = data.get("started_at", time.time())
        stats.comments = data.get("comments", 0)
        stats.gifts = data.get("gifts", 0)
        stats.follows = data.get("follows", 0)
        stats.likes = data.get("likes", 0)
        stats.shares = data.get("shares", 0)
        stats.joins = data.get("joins", 0)
        stats.unique_chatters = set(data.get("unique_chatters", []))
        stats.top_commenters = Counter(data.get("top_commenters", {}))
        stats.top_gifts = Counter(data.get("top_gifts", {}))
        stats.top_gifters = Counter(data.get("top_gifters", {}))
        stats.last_question = data.get("last_question", "")
        stats.last_answer = data.get("last_answer", "")
        return stats


stats = LiveStats()
client = TikTokLiveClient(unique_id=USERNAME)
report_task: Optional[asyncio.Task] = None
report_enabled = True


def load_stats() -> None:
    global stats
    if STATS_FILE.exists():
        try:
            stats = LiveStats.from_json(json.loads(STATS_FILE.read_text(encoding="utf-8")))
            print(f"[{now_str()}] Đã load stats từ {STATS_FILE}")
        except Exception as e:
            print(f"[{now_str()}] Không load được stats: {e}")


def save_stats() -> None:
    try:
        STATS_FILE.write_text(
            json.dumps(stats.to_json(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        print(f"[{now_str()}] Không lưu được stats: {e}")


def print_summary(prefix: str = "[SUMMARY]") -> None:
    print(
        f"\n{prefix} uptime={stats.uptime()} | "
        f"comments={stats.comments} | gifts={stats.gifts} | follows={stats.follows} | "
        f"likes={stats.likes} | shares={stats.shares} | joins={stats.joins} | "
        f"unique_chatters={len(stats.unique_chatters)}"
    )
    print(top_lines(stats.top_commenters, "Top comment"))
    print(top_lines(stats.top_gifts, "Top gift"))
    print(top_lines(stats.top_gifters, "Top gifter"))
    if stats.last_question:
        print(f"Last ask: {stats.last_question}")
        print(f"Last answer: {stats.last_answer}")
    print()


def build_help() -> str:
    return (
        "Lệnh hỗ trợ:\n"
        "  !help            - xem lệnh\n"
        "  !stats           - xem thống kê\n"
        "  !top             - top người comment / gift\n"
        "  !save            - lưu stats ra file\n"
        "  !reset           - xoá stats hiện tại\n"
        "  ask <nội dung>   - hỏi bot, bot trả lời trong console\n"
    )


def answer_question(question: str) -> str:
    q = question.strip().lower()

    if not q:
        return "Bạn chưa nhập nội dung sau ask."

    if "mấy giờ" in q or "time" in q:
        return f"Bây giờ là {datetime.now().strftime('%H:%M:%S')}."

    if "ai" in q and len(q) <= 20:
        return "Bạn đang hỏi về ai đó. Gõ rõ hơn một chút để mình trả lời gọn hơn."

    if any(word in q for word in ["stats", "thống kê", "số liệu"]):
        return (
            f"Hiện có {stats.comments} comment, {stats.gifts} gift, "
            f"{stats.likes} like, {stats.shares} share, {stats.follows} follow."
        )

    if any(word in q for word in ["top", "nhiều nhất", "ai comment nhiều"]):
        if stats.top_commenters:
            name, count = stats.top_commenters.most_common(1)[0]
            return f"Top comment hiện tại là {name} với {count} comment."
        return "Chưa có dữ liệu top comment."

    fallback = [
        "Mình đã nhận câu hỏi đó.",
        "Câu này hay đó, nhưng cần thêm ngữ cảnh để trả lời chuẩn hơn.",
        "Mình chưa có đủ dữ liệu, thử hỏi rõ hơn một chút.",
        "Đã ghi nhận câu hỏi.",
    ]
    return fallback[hash(q) % len(fallback)]


def handle_command(comment_text: str, user_name: str) -> None:
    text = comment_text.strip()
    lower = text.lower()

    if lower in {"!help", "/help", "help"}:
        print(build_help())
        return

    if lower in {"!stats", "/stats"}:
        print_summary("[STATS]")
        return

    if lower in {"!top", "/top"}:
        print(top_lines(stats.top_commenters, "Top comment"))
        print(top_lines(stats.top_gifts, "Top gift"))
        print(top_lines(stats.top_gifters, "Top gifter"))
        return

    if lower in {"!save", "/save"}:
        save_stats()
        print(f"[{now_str()}] Đã lưu stats vào {STATS_FILE}")
        return

    if lower in {"!reset", "/reset"}:
        global stats
        stats = LiveStats()
        print(f"[{now_str()}] Đã reset stats hiện tại")
        return

    if lower.startswith("ask "):
        question = text[4:].strip()
        answer = answer_question(question)
        stats.last_question = question
        stats.last_answer = answer
        print(f"[ASK] {user_name}: {question}")
        print(f"[BOT] {answer}")
        return

    # Có thể thêm command riêng ở đây sau
    if lower.startswith("say "):
        msg = text[4:].strip()
        print(f"[SAY] {user_name}: {msg}")
        return


async def report_loop() -> None:
    while True:
        await asyncio.sleep(REPORT_EVERY_SECONDS)
        if report_enabled and client.connected:
            save_stats()
            print_summary("[AUTO REPORT]")


@client.on(ConnectEvent)
async def on_connect(event: ConnectEvent):
    global report_task
    print(f"[{now_str()}] Connected to @{event.unique_id}")
    print(f"[{now_str()}] Room ID: {client.room_id}")
    print(f"[{now_str()}] Uptime counters started.")
    print(build_help())

    if report_task is None or report_task.done():
        report_task = asyncio.create_task(report_loop())


@client.on(DisconnectEvent)
async def on_disconnect(event: DisconnectEvent):
    global report_task
    print(f"[{now_str()}] Disconnected from live")
    save_stats()
    print_summary("[FINAL]")

    if report_task and not report_task.done():
        report_task.cancel()
        try:
            await report_task
        except asyncio.CancelledError:
            pass
    report_task = None


@client.on(CommentEvent)
async def on_comment(event: CommentEvent):
    user = safe_nickname(event)
    unique_id = safe_unique_id(event)
    comment = getattr(event, "comment", "") or ""

    stats.comments += 1
    stats.unique_chatters.add(unique_id)
    stats.top_commenters[user] += 1

    print(f"[CHAT] {user}: {comment}")

    if comment.startswith("!") or comment.lower().startswith("ask "):
        handle_command(comment, user)


@client.on(GiftEvent)
async def on_gift(event: GiftEvent):
    user = safe_nickname(event)
    gift = getattr(event, "gift", None)
    gift_name = getattr(gift, "name", "unknown gift") if gift else "unknown gift"
    repeat_count = getattr(event, "repeat_count", 1)

    stats.gifts += int(repeat_count) if isinstance(repeat_count, int) else 1
    stats.top_gifts[gift_name] += int(repeat_count) if isinstance(repeat_count, int) else 1
    stats.top_gifters[user] += int(repeat_count) if isinstance(repeat_count, int) else 1

    # Nếu muốn bớt rối CMD thì chỉ in khi gift đủ quan trọng
    if repeat_count != 1 or getattr(gift, "streakable", False):
        print(f"[GIFT] {user}: {gift_name} x{repeat_count}")


@client.on(FollowEvent)
async def on_follow(event: FollowEvent):
    user = safe_nickname(event)
    stats.follows += 1
    print(f"[FOLLOW] {user}")


@client.on(LikeEvent)
async def on_like(event: LikeEvent):
    user = safe_nickname(event)
    like_count = getattr(event, "like_count", getattr(event, "repeat_count", 1))
    like_count = int(like_count) if isinstance(like_count, int) else 1
    stats.likes += like_count

    # Không spam CMD mỗi lần like; chỉ log nhẹ nếu muốn:
    # print(f"[LIKE] {user}: +{like_count}")


@client.on(ShareEvent)
async def on_share(event: ShareEvent):
    user = safe_nickname(event)
    stats.shares += 1

    # Không spam CMD mỗi lần share; chỉ log nhẹ nếu muốn:
    # print(f"[SHARE] {user}")


@client.on(JoinEvent)
async def on_join(event: JoinEvent):
    user = safe_nickname(event)
    stats.joins += 1

    # Join cũng có thể rất nhiều nên để im cho gọn
    # print(f"[JOIN] {user}")


if __name__ == "__main__":
    load_stats()
    print(f"[{now_str()}] Starting client for @{USERNAME}")
    try:
        client.run()
    finally:
        save_stats()