/**
 * Gamification, Achievements & Leaderboard View
 */
import { store } from "../../app/state.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { AchievementRules } from "../../app/constants.js";

export function renderGamificationView(container) {
  const { xp, level, streak, unlockedBadges } = store.getState().gamification;
  const user = store.getState().auth.currentUser;
  const userData = store.getState().user.data;

  const unlockedSet = new Set(unlockedBadges || []);
  const nextLevelXP = (level) * (level) * 100;
  const currentLevelBaseXP = (level - 1) * (level - 1) * 100;
  const xpInLevel = Math.max(0, xp - currentLevelBaseXP);
  const xpNeeded = Math.max(1, nextLevelXP - currentLevelBaseXP);
  const xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  const sampleLeaderboard = [
    { rank: 1, name: "Nguyễn Hoàng Nam", class: "12 Chuyên Toán", xp: 3250, badge: "🥇" },
    { rank: 2, name: "Lê Thị Thu Thảo", class: "12A1", xp: 2980, badge: "🥈" },
    { rank: 3, name: "Trần Đăng Khoa", class: "12A2", xp: 2640, badge: "🥉" },
    { rank: 4, name: userData?.name || user?.displayName || "Bạn", class: userData?.class || "Học sinh", xp, badge: "⭐", isMe: true },
    { rank: 5, name: "Vũ Phương Linh", class: "11 Chuyên Anh", xp: 1950, badge: "🎖️" },
  ];

  container.innerHTML = `
    <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <span>🏆</span> Thành tích & Bảng vinh danh học sinh
          </h1>
          <p class="text-xs text-gray-500 mt-1">Tích lũy điểm kinh nghiệm (XP), thăng cấp bậc và mở khóa các huy hiệu danh giá</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl text-center">
            <div class="text-xs text-amber-700 font-bold">Chuỗi học tập</div>
            <div class="text-lg font-black text-amber-800">🔥 ${streak} ngày</div>
          </div>
          <div class="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-center">
            <div class="text-xs text-emerald-700 font-bold">Cấp bậc</div>
            <div class="text-lg font-black text-emerald-800">Level ${level}</div>
          </div>
        </div>
      </div>

      <!-- XP Bar Card -->
      <div class="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-md space-y-3">
        <div class="flex items-center justify-between font-bold text-sm">
          <span>Tiến trình Level ${level}</span>
          <span>${xp} / ${nextLevelXP} XP</span>
        </div>
        <div class="w-full bg-black/20 rounded-full h-3 overflow-hidden">
          <div class="bg-amber-400 h-3 rounded-full transition-all duration-300" style="width: ${xpPct}%"></div>
        </div>
        <div class="flex items-center justify-between text-xs text-emerald-100">
          <span>Level ${level}</span>
          <span>Cần thêm ${nextLevelXP - xp} XP để lên Level ${level + 1}</span>
          <span>Level ${level + 1}</span>
        </div>
      </div>

      <!-- Two Columns: Badges & Leaderboard -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Badges Grid (2 Cols) -->
        <div class="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-gray-900">Bộ sưu tập huy hiệu danh dự</h3>
            <span class="text-xs font-semibold text-gray-500">${unlockedSet.size} / ${AchievementRules.length} đã mở</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${AchievementRules.map(rule => {
              const isUnlocked = unlockedSet.has(rule.id);
              return `
                <div class="p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${isUnlocked ? 'bg-emerald-50/40 border-emerald-200 shadow-xs' : 'bg-gray-50/60 border-gray-200 opacity-50 grayscale'}">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isUnlocked ? 'bg-emerald-100' : 'bg-gray-200'}">
                    ${rule.icon}
                  </div>
                  <div class="min-w-0 flex-1 space-y-1">
                    <div class="flex items-center justify-between">
                      <h4 class="font-bold text-xs text-gray-900 truncate">${escapeHtml(rule.title)}</h4>
                      <span class="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">+${rule.xp} XP</span>
                    </div>
                    <p class="text-[11px] text-gray-500 leading-snug">${escapeHtml(rule.description)}</p>
                    <div class="text-[10px] font-bold ${isUnlocked ? 'text-emerald-700' : 'text-gray-400'}">
                      ${isUnlocked ? '✓ Đã đạt được' : '🔒 Chưa mở khóa'}
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Leaderboard (1 Col) -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
          <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
            <span>🎖️</span> Bảng xếp hạng tuần
          </h3>

          <div class="space-y-3">
            ${sampleLeaderboard.map(item => `
              <div class="p-3.5 rounded-2xl border transition-all flex items-center justify-between ${item.isMe ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white border-gray-200'}">
                <div class="flex items-center gap-3">
                  <span class="w-7 text-center font-black text-sm text-gray-700">${item.badge}</span>
                  <div>
                    <div class="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      ${escapeHtml(item.name)}
                      ${item.isMe ? '<span class="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">Tôi</span>' : ''}
                    </div>
                    <div class="text-[10px] text-gray-400">${escapeHtml(item.class)}</div>
                  </div>
                </div>
                <div class="text-xs font-black text-emerald-700 font-mono">${item.xp.toLocaleString('vi-VN')} XP</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}
