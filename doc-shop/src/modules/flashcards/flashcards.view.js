/**
 * Flashcard Study & Spaced Repetition View
 */
import { store } from "../../app/state.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { flashcardService } from "../../services/flashcard.service.js";
import { gamificationService } from "../../services/gamification.service.js";
import { toast } from "../../components/toast.js";
import { confirmDialog } from "../../components/ConfirmDialog.js";
import { modal } from "../../components/Modal.js";

export function renderFlashcardsView(container) {
  let activeDeckId = null;
  let studyMode = false;
  let currentCardIndex = 0;
  let isCardFlipped = false;

  function render() {
    const decks = store.getState().flashcards.decks || {};
    const deckList = Object.values(decks);

    if (studyMode && activeDeckId && decks[activeDeckId]) {
      renderStudySession(decks[activeDeckId]);
      return;
    }

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>🧠</span> Flashcard - Ghi nhớ ngắt quãng (SRS)
            </h1>
            <p class="text-xs text-gray-500 mt-1">Học từ vựng, định lý và công thức nhanh gấp 3 lần bằng thuật toán lặp lại ngắt quãng</p>
          </div>
          <button id="fc-create-deck-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto">
            <span>➕</span> Tạo bộ thẻ mới
          </button>
        </div>

        <!-- Decks Grid -->
        ${deckList.length === 0 ? `
          <div class="bg-white rounded-3xl p-12 text-center space-y-3 border border-gray-200 shadow-sm">
            <span class="text-5xl block">📇</span>
            <h3 class="text-base font-bold text-gray-900">Chưa có bộ Flashcard nào</h3>
            <p class="text-xs text-gray-500 max-w-sm mx-auto">Tạo bộ thẻ ôn tập đầu tiên cho môn học của bạn để bắt đầu luyện trí nhớ siêu đẳng!</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${deckList.map(deck => {
              const totalCards = deck.cards.length;
              const masteredCards = deck.cards.filter(c => c.status === "mastered").length;
              const masteryPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

              return `
                <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-5 card-hover">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200">
                        ${escapeHtml(deck.subject)}
                      </span>
                      <span class="text-xs text-gray-400 font-medium">${totalCards} thẻ</span>
                    </div>
                    <h3 class="font-extrabold text-base text-gray-900 leading-snug">${escapeHtml(deck.title)}</h3>
                    
                    <!-- Mastery bar -->
                    <div class="space-y-1.5 pt-2">
                      <div class="flex items-center justify-between text-xs text-gray-500">
                        <span>Độ thuần thục:</span>
                        <span class="font-bold text-emerald-600">${masteryPct}%</span>
                      </div>
                      <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div class="bg-emerald-500 h-2 rounded-full" style="width: ${masteryPct}%"></div>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
                    <button data-action="study-deck" data-deck-id="${deck.id}" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 ${totalCards === 0 ? 'opacity-50 pointer-events-none' : ''}">
                      <span>▶</span> Bắt đầu ôn (${totalCards})
                    </button>
                    <button data-action="add-card" data-deck-id="${deck.id}" class="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors" title="Thêm thẻ mới">
                      + Thẻ
                    </button>
                    <button data-action="delete-deck" data-deck-id="${deck.id}" class="p-2.5 text-gray-400 hover:text-red-600 rounded-xl transition-colors" title="Xóa bộ thẻ">
                      🗑️
                    </button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      </div>
    `;

    // Bind events
    container.querySelector("#fc-create-deck-btn")?.addEventListener("click", () => {
      const formHtml = `
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tên bộ thẻ</label>
          <input type="text" name="title" required placeholder="Ví dụ: Từ vựng Tiếng Anh Unit 1" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Môn học</label>
          <input type="text" name="subject" placeholder="Toán, Lý, Hóa, Sinh, Tiếng Anh..." value="Tổng hợp" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      `;

      modal.openForm("Tạo bộ thẻ Flashcard mới", formHtml, async (formData) => {
        const title = formData.get("title")?.trim();
        const subject = formData.get("subject")?.trim() || "Tổng hợp";
        if (!title) return;

        flashcardService.createDeck({ title, subject });
        toast.success("Đã tạo bộ thẻ mới!");
        render();
      }, "Tạo bộ thẻ");
    });

    container.querySelectorAll('[data-action="add-card"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const deckId = btn.dataset.deckId;
        const formHtml = `
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Mặt trước (Câu hỏi / Từ vựng / Khái niệm)</label>
            <textarea name="front" rows="2" required placeholder="Mặt trước..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Mặt sau (Câu trả lời / Nghĩa / Công thức)</label>
            <textarea name="back" rows="3" required placeholder="Mặt sau..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Ví dụ hoặc ghi chú (không bắt buộc)</label>
            <input type="text" name="example" placeholder="Ví dụ hoặc mẹo ghi nhớ..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        `;

        modal.openForm("Thêm thẻ mới vào bộ", formHtml, async (formData) => {
          const front = formData.get("front")?.trim();
          const back = formData.get("back")?.trim();
          const example = formData.get("example")?.trim() || "";
          if (!front || !back) return;

          flashcardService.addCard(deckId, { front, back, example });
          toast.success("Đã thêm thẻ mới vào bộ!");
          render();
        }, "Thêm thẻ");
      });
    });

    container.querySelectorAll('[data-action="delete-deck"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const confirmed = await confirmDialog("Bạn có chắc muốn xóa bộ thẻ này?", {
          title: "Xóa bộ thẻ?",
          confirmText: "Xóa",
          cancelText: "Hủy",
          variant: "danger",
        });

        if (confirmed) {
          flashcardService.deleteDeck(btn.dataset.deckId);
          toast.success("Đã xóa bộ thẻ!");
          render();
        }
      });
    });

    container.querySelectorAll('[data-action="study-deck"]').forEach(btn => {
      btn.addEventListener("click", () => {
        activeDeckId = btn.dataset.deckId;
        studyMode = true;
        currentCardIndex = 0;
        isCardFlipped = false;
        render();
      });
    });
  }

  function renderStudySession(deck) {
    const cards = deck.cards;
    const card = cards[currentCardIndex];
    const progressPct = Math.round(((currentCardIndex + 1) / cards.length) * 100);

    container.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-6 fade-in pb-12">
        <!-- Top Session Nav -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <button id="fc-exit-btn" class="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1">
            ✕ Thoát phiên ôn
          </button>
          <div class="text-xs font-bold text-gray-700">
            Thẻ ${currentCardIndex + 1} / ${cards.length}
          </div>
          <span class="text-xs font-semibold text-emerald-600">${escapeHtml(deck.title)}</span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div class="bg-emerald-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
        </div>

        <!-- 3D Interactive Flashcard -->
        <div id="fc-card-container" class="cursor-pointer perspective-1000 min-h-[320px]">
          <div id="fc-card-inner" class="w-full min-h-[320px] bg-white rounded-3xl border-2 ${isCardFlipped ? 'border-emerald-400 bg-emerald-50/20' : 'border-gray-200'} shadow-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-200 hover:shadow-xl relative">
            <div class="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${isCardFlipped ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}">
              ${isCardFlipped ? 'Mặt sau (Đáp án)' : 'Mặt trước (Câu hỏi)'}
            </div>

            <div class="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-4">
              ${isCardFlipped ? 'ĐÁP ÁN & GIẢI THÍCH' : 'BẤM VÀO THẺ ĐỂ LẬT'}
            </div>

            <h2 class="text-xl md:text-2xl font-black text-gray-900 max-w-lg mb-3">
              ${escapeHtml(isCardFlipped ? card.back : card.front)}
            </h2>

            ${isCardFlipped && card.example ? `
              <p class="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl max-w-md border border-emerald-100 mt-2">
                💡 <em>Ví dụ: ${escapeHtml(card.example)}</em>
              </p>
            ` : ''}

            <span class="absolute bottom-4 text-[11px] text-gray-400">Bấm thẻ hoặc Space để lật</span>
          </div>
        </div>

        <!-- Rating Buttons (Visible when flipped) -->
        <div class="flex items-center justify-center gap-3 ${isCardFlipped ? 'opacity-100' : 'opacity-40 pointer-events-none'} transition-opacity">
          <button data-rate="again" class="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-2xl border border-red-200 shadow-xs transition-colors text-center">
            <div>Chưa thuộc</div>
            <div class="text-[10px] font-normal opacity-75">Ôn lại ngay (1)</div>
          </button>
          <button data-rate="hard" class="flex-1 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-2xl border border-amber-200 shadow-xs transition-colors text-center">
            <div>Khó nhớ</div>
            <div class="text-[10px] font-normal opacity-75">1-2 ngày (2)</div>
          </button>
          <button data-rate="good" class="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-2xl border border-blue-200 shadow-xs transition-colors text-center">
            <div>Nhớ tốt</div>
            <div class="text-[10px] font-normal opacity-75">3-4 ngày (3)</div>
          </button>
          <button data-rate="easy" class="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-2xl border border-emerald-200 shadow-xs transition-colors text-center">
            <div>Rất dễ</div>
            <div class="text-[10px] font-normal opacity-75">1 tuần (4)</div>
          </button>
        </div>
      </div>
    `;

    // Events
    container.querySelector("#fc-exit-btn")?.addEventListener("click", () => {
      studyMode = false;
      render();
    });

    container.querySelector("#fc-card-container")?.addEventListener("click", () => {
      isCardFlipped = !isCardFlipped;
      renderStudySession(deck);
    });

    container.querySelectorAll("[data-rate]").forEach(btn => {
      btn.addEventListener("click", () => {
        const rating = btn.dataset.rate;
        flashcardService.rateCard(deck.id, card.id, rating);

        if (currentCardIndex + 1 < cards.length) {
          currentCardIndex++;
          isCardFlipped = false;
          renderStudySession(deck);
        } else {
          // Finished deck
          gamificationService.addXP(40, `Hoàn thành phiên ôn tập: ${deck.title}`);
          toast.success("🎉 Xuất sắc! Bạn đã hoàn thành toàn bộ thẻ trong phiên này!");
          studyMode = false;
          render();
        }
      });
    });
  }

  render();
}
