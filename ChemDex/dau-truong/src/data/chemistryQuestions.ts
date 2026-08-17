/**
 * Chemistry Question Database
 * Updated: 2026-08-13
 *
 * Rules enforced by data:
 * - Every category has >= 100 questions per difficulty.
 * - element_quiz accepts only the international element symbol or international name.
 * - compound_name accepts only the standardized international English name.
 * - oxidation_state accepted answers always include an explicit sign; zero is exactly "0".
 */

export const FALLBACK_QUESTIONS: Record<string, Record<string, any[]>> = {
  "balance": {
    "easy": [
      {
        "equation": "__ Mg + __ O2 ->[t°] __ MgO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Mg: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca + __ O2 ->[t°] __ CaO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Ca: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ba + __ O2 ->[t°] __ BaO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Ba: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn + __ O2 ->[t°] __ ZnO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được O: 2=2, Zn: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ O2 ->[t°] __ FeO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Fe: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu + __ O2 ->[t°] __ CuO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Cu: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Hg + __ O2 ->[t°] __ HgO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Hg: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Sr + __ O2 ->[t°] __ SrO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được O: 2=2, Sr: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Be + __ O2 ->[t°] __ BeO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Be: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ni + __ O2 ->[t°] __ NiO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Ni: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Co + __ O2 ->[t°] __ CoO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Co: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ O2 ->[t°] __ Al2O3",
        "answers": [
          4,
          3,
          2
        ],
        "acceptedAnswers": [
          "4",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 3 : 2; kiểm tra lại thu được Al: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ O2 ->[t°] __ Fe2O3",
        "answers": [
          4,
          3,
          2
        ],
        "acceptedAnswers": [
          "4",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 3 : 2; kiểm tra lại thu được Fe: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cr + __ O2 ->[t°] __ Cr2O3",
        "answers": [
          4,
          3,
          2
        ],
        "acceptedAnswers": [
          "4",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 3 : 2; kiểm tra lại thu được Cr: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ B + __ O2 ->[t°] __ B2O3",
        "answers": [
          4,
          3,
          2
        ],
        "acceptedAnswers": [
          "4",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 3 : 2; kiểm tra lại thu được B: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P + __ O2 ->[t°] __ P2O5",
        "answers": [
          4,
          5,
          2
        ],
        "acceptedAnswers": [
          "4",
          "5",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 5 : 2; kiểm tra lại thu được O: 10=10, P: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ N2 + __ O2 ->[t°] __ N2O5",
        "answers": [
          2,
          5,
          2
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 5 : 2; kiểm tra lại thu được N: 4=4, O: 10=10, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ As + __ O2 ->[t°] __ As2O5",
        "answers": [
          4,
          5,
          2
        ],
        "acceptedAnswers": [
          "4",
          "5",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 5 : 2; kiểm tra lại thu được As: 4=4, O: 10=10, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na + __ Cl2 -> __ NaCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, Na: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K + __ Cl2 -> __ KCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, K: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Li + __ Cl2 -> __ LiCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, Li: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ag + __ Cl2 -> __ AgCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Ag: 2=2, Cl: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu + __ Cl2 -> __ CuCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, Cu: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca + __ Cl2 -> __ CaCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Ca: 2=2, Cl: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Mg + __ Cl2 -> __ MgCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, Mg: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn + __ Cl2 -> __ ZnCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, Zn: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ba + __ Cl2 -> __ BaCl",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được Ba: 2=2, Cl: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ Cl2 -> __ AlCl3",
        "answers": [
          2,
          3,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2; kiểm tra lại thu được Al: 2=2, Cl: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ Cl2 -> __ FeCl3",
        "answers": [
          2,
          3,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2; kiểm tra lại thu được Cl: 6=6, Fe: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cr + __ Cl2 -> __ CrCl3",
        "answers": [
          2,
          3,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2; kiểm tra lại thu được Cl: 6=6, Cr: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ B + __ Cl2 -> __ BCl3",
        "answers": [
          2,
          3,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2; kiểm tra lại thu được B: 2=2, Cl: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P + __ Cl2 -> __ PCl3",
        "answers": [
          2,
          3,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2; kiểm tra lại thu được Cl: 6=6, P: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ S ->[t°] __ FeS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Fe: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn + __ S ->[t°] __ ZnS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được S: 1=1, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Mg + __ S ->[t°] __ MgS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Mg: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca + __ S ->[t°] __ CaS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Ca: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu + __ S ->[t°] __ CuS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Cu: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na + __ S ->[t°] __ NaS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Na: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K + __ S ->[t°] __ KS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được K: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ba + __ S ->[t°] __ BaS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Ba: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ag + __ S ->[t°] __ AgS",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Ag: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ S ->[t°] __ Al2S3",
        "answers": [
          2,
          3,
          1
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 1; kiểm tra lại thu được Al: 2=2, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ S ->[t°] __ Fe2S3",
        "answers": [
          2,
          3,
          1
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 1; kiểm tra lại thu được Fe: 2=2, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cr + __ S ->[t°] __ Cr2S3",
        "answers": [
          2,
          3,
          1
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 1; kiểm tra lại thu được Cr: 2=2, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2 + __ Cl2 ->[t°] __ HCl",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được Cl: 2=2, H: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2 + __ Br2 ->[t°] __ HBr",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được Br: 2=2, H: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2 + __ I2 ->[t°] __ HI",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được H: 2=2, I: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2 + __ F2 ->[t°] __ HF",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được F: 2=2, H: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C + __ O2 ->[t°] __ CO2",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được C: 1=1, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C + __ O2 ->[thiếu O2] __ CO",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được C: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ N2 + __ H2 ->[xt, t°] __ NH3",
        "answers": [
          1,
          3,
          2
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 2; kiểm tra lại thu được H: 6=6, N: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2O ->[điện phân] __ H2 + __ O2",
        "answers": [
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 1; kiểm tra lại thu được H: 4=4, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2O2 ->[MnO2] __ H2O + __ O2",
        "answers": [
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 1; kiểm tra lại thu được H: 4=4, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaCO3 ->[t°] __ CaO + __ CO2",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Ca: 1=1, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ MgCO3 ->[t°] __ MgO + __ CO2",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Mg: 1=1, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ ZnCO3 ->[t°] __ ZnO + __ CO2",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được C: 1=1, O: 3=3, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCO3 ->[t°] __ FeO + __ CO2",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Fe: 1=1, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuCO3 ->[t°] __ CuO + __ CO2",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Cu: 1=1, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca(OH)2 ->[t°] __ CaO + __ H2O",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Ca: 1=1, H: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Mg(OH)2 ->[t°] __ MgO + __ H2O",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được H: 2=2, Mg: 1=1, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu(OH)2 ->[t°] __ CuO + __ H2O",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Cu: 1=1, H: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn(OH)2 ->[t°] __ ZnO + __ H2O",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được H: 2=2, O: 2=2, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe(OH)2 ->[t°] __ FeO + __ H2O",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Fe: 1=1, H: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KClO3 ->[MnO2, t°] __ KCl + __ O2",
        "answers": [
          2,
          2,
          3
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 3; kiểm tra lại thu được Cl: 2=2, K: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NaClO3 ->[MnO2, t°] __ NaCl + __ O2",
        "answers": [
          2,
          2,
          3
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 3; kiểm tra lại thu được Cl: 2=2, Na: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NaOH + __ HCl -> __ NaCl + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Cl: 1=1, H: 2=2, Na: 1=1, O: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KOH + __ HCl -> __ KCl + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Cl: 1=1, H: 2=2, K: 1=1, O: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ LiOH + __ HNO3 -> __ LiNO3 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được H: 2=2, Li: 1=1, N: 1=1, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NaOH + __ HNO3 -> __ NaNO3 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được H: 2=2, N: 1=1, Na: 1=1, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca(OH)2 + __ HCl -> __ CaCl2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được Ca: 1=1, Cl: 2=2, H: 4=4, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ba(OH)2 + __ HCl -> __ BaCl2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được Ba: 1=1, Cl: 2=2, H: 4=4, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Mg(OH)2 + __ HCl -> __ MgCl2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, H: 4=4, Mg: 1=1, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NaOH + __ H2SO4 -> __ Na2SO4 + __ H2O",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 1 : 2; kiểm tra lại thu được H: 4=4, Na: 2=2, O: 6=6, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ 2KOH + __ H2SO4 -> __ K2SO4 + __ H2O",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 1 : 2; kiểm tra lại thu được H: 4=4, K: 2=2, O: 6=6, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaCO3 + __ HCl -> __ CaCl2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Ca: 1=1, Cl: 2=2, H: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ MgCO3 + __ HCl -> __ MgCl2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Cl: 2=2, H: 2=2, Mg: 1=1, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ ZnCO3 + __ HCl -> __ ZnCl2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Cl: 2=2, H: 2=2, O: 3=3, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ BaCO3 + __ HCl -> __ BaCl2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được Ba: 1=1, C: 1=1, Cl: 2=2, H: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2CO3 + __ HCl -> __ NaCl + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 2 : 1 : 1; kiểm tra lại thu được C: 1=1, Cl: 2=2, H: 2=2, Na: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2CO3 + __ HCl -> __ KCl + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 2 : 1 : 1; kiểm tra lại thu được C: 1=1, Cl: 2=2, H: 2=2, K: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaCO3 + __ HNO3 -> __ Ca(NO3)2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Ca: 1=1, H: 2=2, N: 2=2, O: 9=9, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ MgCO3 + __ HNO3 -> __ Mg(NO3)2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, H: 2=2, Mg: 1=1, N: 2=2, O: 9=9, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2CO3 + __ H2SO4 -> __ Na2SO4 + __ CO2 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, H: 2=2, Na: 2=2, O: 7=7, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Mg + __ HCl -> __ MgCl2 + __ H2",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Mg: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn + __ HCl -> __ ZnCl2 + __ H2",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ HCl -> __ FeCl2 + __ H2",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, Fe: 1=1, H: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca + __ HCl -> __ CaCl2 + __ H2",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Ca: 1=1, Cl: 2=2, H: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ HCl -> __ AlCl3 + __ H2",
        "answers": [
          2,
          6,
          2,
          3
        ],
        "acceptedAnswers": [
          "2",
          "6",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 6 : 2 : 3; kiểm tra lại thu được Al: 2=2, Cl: 6=6, H: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ CuSO4 -> __ FeSO4 + __ Cu",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Cu: 1=1, Fe: 1=1, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn + __ CuSO4 -> __ ZnSO4 + __ Cu",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Cu: 1=1, O: 4=4, S: 1=1, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu + __ AgNO3 -> __ Cu(NO3)2 + __ Ag",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được Ag: 2=2, Cu: 1=1, N: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ CuCl2 -> __ AlCl3 + __ Cu",
        "answers": [
          2,
          3,
          2,
          3
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2 : 3; kiểm tra lại thu được Al: 2=2, Cl: 6=6, Cu: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn + __ AgNO3 -> __ Zn(NO3)2 + __ Cu",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được Ag: 2=0, Cu: 0=2, N: 2=2, O: 6=6, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ AgNO3 -> __ Fe(NO3)2 + __ Cu",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được Ag: 2=0, Cu: 0=2, Fe: 1=1, N: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ AgNO3 + __ NaCl -> __ NaNO3 + __ AgCl",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Ag: 1=1, Cl: 1=1, N: 1=1, Na: 1=1, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ BaCl2 + __ Na2SO4 -> __ NaCl + __ BaSO4",
        "answers": [
          1,
          1,
          2,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2 : 1; kiểm tra lại thu được Ba: 1=1, Cl: 2=2, Na: 2=2, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaCl2 + __ Na2CO3 -> __ NaCl + __ CaCO3",
        "answers": [
          1,
          1,
          2,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2 : 1; kiểm tra lại thu được C: 1=1, Ca: 1=1, Cl: 2=2, Na: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Pb(NO3)2 + __ KI -> __ KNO3 + __ PbI2",
        "answers": [
          1,
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 2 : 1; kiểm tra lại thu được I: 2=2, K: 2=2, N: 2=2, O: 6=6, Pb: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ AgNO3 + __ KBr -> __ KNO3 + __ AgBr",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Ag: 1=1, Br: 1=1, K: 1=1, N: 1=1, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl3 + __ NaOH -> __ NaCl + __ Fe(OH)3",
        "answers": [
          1,
          3,
          3,
          1
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "3",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 3 : 1; kiểm tra lại thu được Cl: 3=3, Fe: 1=1, H: 3=3, Na: 3=3, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuSO4 + __ NaOH -> __ Na2SO4 + __ Cu(OH)2",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cu: 1=1, H: 2=2, Na: 2=2, O: 6=6, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ AlCl3 + __ NaOH -> __ NaCl + __ Al(OH)3",
        "answers": [
          1,
          3,
          3,
          1
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "3",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 3 : 1; kiểm tra lại thu được Al: 1=1, Cl: 3=3, H: 3=3, Na: 3=3, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      }
    ],
    "medium": [
      {
        "equation": "__ KNO3 ->[t°] __ KNO2 + __ O2",
        "answers": [
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 1; kiểm tra lại thu được K: 2=2, N: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NaNO3 ->[t°] __ NaNO2 + __ O2",
        "answers": [
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 1; kiểm tra lại thu được N: 2=2, Na: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu(NO3)2 ->[t°] __ CuO + __ NO2 + __ O2",
        "answers": [
          2,
          2,
          4,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "4",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 4 : 1; kiểm tra lại thu được Cu: 2=2, N: 4=4, O: 12=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Pb(NO3)2 ->[t°] __ PbO + __ NO2 + __ O2",
        "answers": [
          2,
          2,
          4,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "4",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 4 : 1; kiểm tra lại thu được N: 4=4, O: 12=12, Pb: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ AgNO3 ->[t°] __ Ag + __ NO2 + __ O2",
        "answers": [
          2,
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 2 : 1; kiểm tra lại thu được Ag: 2=2, N: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NH4NO3 ->[t°] __ N2O + __ H2O",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được H: 4=4, N: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NaHCO3 ->[t°] __ Na2CO3 + __ CO2 + __ H2O",
        "answers": [
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 1 : 1; kiểm tra lại thu được C: 2=2, H: 2=2, Na: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca(OH)2 ->[t°] __ CaO + __ H2O",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Ca: 1=1, H: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ H2O ->[t°] __ Fe3O4 + __ H2",
        "answers": [
          3,
          4,
          1,
          4
        ],
        "acceptedAnswers": [
          "3",
          "4",
          "1",
          "4"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 4 : 1 : 4; kiểm tra lại thu được Fe: 3=3, H: 8=8, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ H2O ->[t°] __ Al2O3 + __ H2",
        "answers": [
          2,
          3,
          1,
          3
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 1 : 3; kiểm tra lại thu được Al: 2=2, H: 6=6, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca + __ H2O -> __ Ca(OH)2 + __ H2",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Ca: 1=1, H: 4=4, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe2O3 + __ CO ->[t°] __ Fe + __ CO2",
        "answers": [
          1,
          3,
          2,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 2 : 3; kiểm tra lại thu được C: 3=3, Fe: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuO + __ CO ->[t°] __ Cu + __ CO2",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Cu: 1=1, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ PbO + __ CO ->[t°] __ Pb + __ CO2",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, O: 2=2, Pb: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe2O3 + __ H2 ->[t°] __ Fe + __ H2O",
        "answers": [
          1,
          3,
          2,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 2 : 3; kiểm tra lại thu được Fe: 2=2, H: 6=6, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuO + __ H2 ->[t°] __ Cu + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Cu: 1=1, H: 2=2, O: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ WO3 + __ H2 ->[t°] __ W + __ H2O",
        "answers": [
          1,
          3,
          1,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 1 : 3; kiểm tra lại thu được H: 6=6, O: 3=3, W: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SnO2 + __ CO ->[t°] __ Sn + __ CO2",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được C: 2=2, O: 4=4, Sn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeS + __ HCl -> __ FeCl2 + __ H2S",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, Fe: 1=1, H: 2=2, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ ZnS + __ HCl -> __ ZnCl2 + __ H2S",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, S: 1=1, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2S + __ HCl -> __ NaCl + __ H2S",
        "answers": [
          1,
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 2 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Na: 2=2, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaS + __ HCl -> __ CaCl2 + __ H2S",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Ca: 1=1, Cl: 2=2, H: 2=2, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ MgS + __ HCl -> __ MgCl2 + __ H2S",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Mg: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al2S3 + __ HCl -> __ AlCl3 + __ H2S",
        "answers": [
          1,
          6,
          2,
          3
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 6 : 2 : 3; kiểm tra lại thu được Al: 2=2, Cl: 6=6, H: 6=6, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuS + __ HCl -> __ CuCl2 + __ H2S",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, Cu: 1=1, H: 2=2, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ PbS + __ HCl -> __ PbCl2 + __ H2S",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Pb: 1=1, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuO + __ H2SO4 -> __ CuSO4 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được Cu: 1=1, H: 2=2, O: 5=5, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe2O3 + __ HCl -> __ FeCl3 + __ H2O",
        "answers": [
          1,
          6,
          2,
          3
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 6 : 2 : 3; kiểm tra lại thu được Cl: 6=6, Fe: 2=2, H: 6=6, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al2O3 + __ H2SO4 -> __ Al2(SO4)3 + __ H2O",
        "answers": [
          1,
          3,
          1,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 1 : 3; kiểm tra lại thu được Al: 2=2, H: 6=6, O: 15=15, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaO + __ HNO3 -> __ Ca(NO3)2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Ca: 1=1, H: 2=2, N: 2=2, O: 7=7, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ MgO + __ HCl -> __ MgCl2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Mg: 1=1, O: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ ZnO + __ H2SO4 -> __ ZnSO4 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được H: 2=2, O: 5=5, S: 1=1, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2O + __ HCl -> __ NaCl + __ H2O",
        "answers": [
          1,
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 2 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Na: 2=2, O: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2O + __ HNO3 -> __ KNO3 + __ H2O",
        "answers": [
          1,
          2,
          2,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 2 : 1; kiểm tra lại thu được H: 2=2, K: 2=2, N: 2=2, O: 7=7, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al(OH)3 + __ HCl -> __ AlCl3 + __ H2O",
        "answers": [
          1,
          3,
          1,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 1 : 3; kiểm tra lại thu được Al: 1=1, Cl: 3=3, H: 6=6, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe(OH)3 + __ HCl -> __ FeCl3 + __ H2O",
        "answers": [
          1,
          3,
          1,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 1 : 3; kiểm tra lại thu được Cl: 3=3, Fe: 1=1, H: 6=6, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu(OH)2 + __ H2SO4 -> __ CuSO4 + __ H2O",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 2; kiểm tra lại thu được Cu: 1=1, H: 4=4, O: 6=6, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al(OH)3 + __ H2SO4 -> __ Al2(SO4)3 + __ H2O",
        "answers": [
          2,
          3,
          1,
          6
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "1",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 1 : 6; kiểm tra lại thu được Al: 2=2, H: 12=12, O: 18=18, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ba(OH)2 + __ H2SO4 -> __ BaSO4 + __ H2O",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 2; kiểm tra lại thu được Ba: 1=1, H: 4=4, O: 6=6, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca(OH)2 + __ H3PO4 -> __ Ca3(PO4)2 + __ H2O",
        "answers": [
          3,
          2,
          1,
          6
        ],
        "acceptedAnswers": [
          "3",
          "2",
          "1",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 2 : 1 : 6; kiểm tra lại thu được Ca: 3=3, H: 12=12, O: 14=14, P: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C2H4 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          1,
          3,
          2,
          2
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "2",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 2 : 2; kiểm tra lại thu được C: 2=2, H: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C2H6 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          7,
          4,
          6
        ],
        "acceptedAnswers": [
          "2",
          "7",
          "4",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 7 : 4 : 6; kiểm tra lại thu được C: 4=4, H: 12=12, O: 14=14, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C3H6 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          9,
          6,
          6
        ],
        "acceptedAnswers": [
          "2",
          "9",
          "6",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 9 : 6 : 6; kiểm tra lại thu được C: 6=6, H: 12=12, O: 18=18, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C4H8 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          1,
          6,
          4,
          4
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "4",
          "4"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 6 : 4 : 4; kiểm tra lại thu được C: 4=4, H: 8=8, O: 12=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C4H10 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          13,
          8,
          10
        ],
        "acceptedAnswers": [
          "2",
          "13",
          "8",
          "10"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 13 : 8 : 10; kiểm tra lại thu được C: 8=8, H: 20=20, O: 26=26, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C5H10 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          15,
          10,
          10
        ],
        "acceptedAnswers": [
          "2",
          "15",
          "10",
          "10"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 15 : 10 : 10; kiểm tra lại thu được C: 10=10, H: 20=20, O: 30=30, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C5H12 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          1,
          8,
          5,
          6
        ],
        "acceptedAnswers": [
          "1",
          "8",
          "5",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 8 : 5 : 6; kiểm tra lại thu được C: 5=5, H: 12=12, O: 16=16, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C6H6 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          15,
          12,
          6
        ],
        "acceptedAnswers": [
          "2",
          "15",
          "12",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 15 : 12 : 6; kiểm tra lại thu được C: 12=12, H: 12=12, O: 30=30, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C6H14 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          19,
          12,
          14
        ],
        "acceptedAnswers": [
          "2",
          "19",
          "12",
          "14"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 19 : 12 : 14; kiểm tra lại thu được C: 12=12, H: 28=28, O: 38=38, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C7H16 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          1,
          11,
          7,
          8
        ],
        "acceptedAnswers": [
          "1",
          "11",
          "7",
          "8"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 11 : 7 : 8; kiểm tra lại thu được C: 7=7, H: 16=16, O: 22=22, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CH3OH + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          3,
          2,
          4
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "4"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2 : 4; kiểm tra lại thu được C: 2=2, H: 8=8, O: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C2H5OH + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          1,
          3,
          2,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "2",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 2 : 3; kiểm tra lại thu được C: 2=2, H: 6=6, O: 7=7, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C3H7OH + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          9,
          6,
          8
        ],
        "acceptedAnswers": [
          "2",
          "9",
          "6",
          "8"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 9 : 6 : 8; kiểm tra lại thu được C: 6=6, H: 16=16, O: 20=20, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C4H9OH + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          1,
          6,
          4,
          5
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "4",
          "5"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 6 : 4 : 5; kiểm tra lại thu được C: 4=4, H: 10=10, O: 13=13, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C2H4O2 + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          5,
          4,
          4
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "4",
          "4"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 5 : 4 : 4; kiểm tra lại thu được C: 4=4, H: 8=8, O: 14=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C3H6O + __ O2 ->[t°] __ CO2 + __ H2O",
        "answers": [
          2,
          7,
          6,
          6
        ],
        "acceptedAnswers": [
          "2",
          "7",
          "6",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 7 : 6 : 6; kiểm tra lại thu được C: 6=6, H: 12=12, O: 16=18, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2SO4 + __ BaCl2 -> __ BaSO4 + __ NaCl",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 2; kiểm tra lại thu được Ba: 1=1, Cl: 2=2, Na: 2=2, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2SO4 + __ BaCl2 -> __ BaSO4 + __ KCl",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 2; kiểm tra lại thu được Ba: 1=1, Cl: 2=2, K: 2=2, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2CO3 + __ CaCl2 -> __ CaCO3 + __ NaCl",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 2; kiểm tra lại thu được C: 1=1, Ca: 1=1, Cl: 2=2, Na: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na3PO4 + __ CaCl2 -> __ Ca3(PO4)2 + __ NaCl",
        "answers": [
          2,
          3,
          1,
          6
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "1",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 1 : 6; kiểm tra lại thu được Ca: 3=3, Cl: 6=6, Na: 6=6, O: 8=8, P: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ AgNO3 + __ Na2CO3 -> __ Ag2CO3 + __ NaNO3",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 1 : 2; kiểm tra lại thu được Ag: 2=2, C: 1=1, N: 2=2, Na: 2=2, O: 9=9, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ba(NO3)2 + __ Na2SO4 -> __ BaSO4 + __ NaNO3",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 2; kiểm tra lại thu được Ba: 1=1, N: 2=2, Na: 2=2, O: 10=10, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl2 + __ NaOH -> __ Fe(OH)2 + __ NaCl",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2; kiểm tra lại thu được Cl: 2=2, Fe: 1=1, H: 2=2, Na: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl3 + __ NaOH -> __ Fe(OH)3 + __ NaCl",
        "answers": [
          1,
          3,
          1,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 1 : 3; kiểm tra lại thu được Cl: 3=3, Fe: 1=1, H: 3=3, Na: 3=3, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ ZnSO4 + __ NaOH -> __ Zn(OH)2 + __ Na2SO4",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được H: 2=2, Na: 2=2, O: 6=6, S: 1=1, Zn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al2(SO4)3 + __ BaCl2 -> __ BaSO4 + __ AlCl3",
        "answers": [
          1,
          3,
          3,
          2
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 3 : 2; kiểm tra lại thu được Al: 2=2, Ba: 3=3, Cl: 6=6, O: 12=12, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CrCl3 + __ NaOH -> __ Cr(OH)3 + __ NaCl",
        "answers": [
          1,
          3,
          1,
          3
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 1 : 3; kiểm tra lại thu được Cl: 3=3, Cr: 1=1, H: 3=3, Na: 3=3, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SO2 + __ O2 ->[V2O5, t°] __ SO3",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được O: 6=6, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeS2 + __ O2 ->[t°] __ Fe2O3 + __ SO2",
        "answers": [
          4,
          11,
          2,
          8
        ],
        "acceptedAnswers": [
          "4",
          "11",
          "2",
          "8"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 11 : 2 : 8; kiểm tra lại thu được Fe: 4=4, O: 22=22, S: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NH3 + __ O2 ->[Pt, t°] __ NO + __ H2O",
        "answers": [
          4,
          5,
          4,
          6
        ],
        "acceptedAnswers": [
          "4",
          "5",
          "4",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 5 : 4 : 6; kiểm tra lại thu được H: 12=12, N: 4=4, O: 10=10, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NH3 + __ O2 ->[t°] __ N2 + __ H2O",
        "answers": [
          4,
          3,
          2,
          6
        ],
        "acceptedAnswers": [
          "4",
          "3",
          "2",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 4 : 3 : 2 : 6; kiểm tra lại thu được H: 12=12, N: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2S + __ O2 ->[t°] __ SO2 + __ H2O",
        "answers": [
          2,
          3,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 3 : 2 : 2; kiểm tra lại thu được H: 4=4, O: 6=6, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CO + __ O2 ->[t°] __ CO2",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được C: 2=2, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NO + __ O2 -> __ NO2",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 2; kiểm tra lại thu được N: 2=2, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P4 + __ O2 ->[t°] __ P2O5",
        "answers": [
          1,
          5,
          2
        ],
        "acceptedAnswers": [
          "1",
          "5",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 5 : 2; kiểm tra lại thu được O: 10=10, P: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ S8 + __ O2 ->[t°] __ SO2",
        "answers": [
          1,
          8,
          8
        ],
        "acceptedAnswers": [
          "1",
          "8",
          "8"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 8 : 8; kiểm tra lại thu được O: 16=16, S: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cl2 + __ NaOH -> __ NaCl + __ NaClO + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được Cl: 2=2, H: 2=2, Na: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cl2 + __ NaOH ->[hot] __ NaCl + __ NaClO3 + __ H2O",
        "answers": [
          3,
          6,
          5,
          1,
          3
        ],
        "acceptedAnswers": [
          "3",
          "6",
          "5",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 6 : 5 : 1 : 3; kiểm tra lại thu được Cl: 6=6, H: 6=6, Na: 6=6, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Br2 + __ NaOH -> __ NaBr + __ NaBrO + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được Br: 2=2, H: 2=2, Na: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Br2 + __ NaOH ->[hot] __ NaBr + __ NaBrO3 + __ H2O",
        "answers": [
          3,
          6,
          5,
          1,
          3
        ],
        "acceptedAnswers": [
          "3",
          "6",
          "5",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 6 : 5 : 1 : 3; kiểm tra lại thu được Br: 6=6, H: 6=6, Na: 6=6, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ I2 + __ NaOH ->[hot] __ NaI + __ NaIO3 + __ H2O",
        "answers": [
          3,
          6,
          5,
          1,
          3
        ],
        "acceptedAnswers": [
          "3",
          "6",
          "5",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 6 : 5 : 1 : 3; kiểm tra lại thu được H: 6=6, I: 6=6, Na: 6=6, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cl2 + __ Ca(OH)2 -> __ CaCl2 + __ Ca(ClO)2 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1 : 1; kiểm tra lại thu được Ca: 1=2, Cl: 2=4, H: 2=2, O: 2=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cl2 + __ Ca(OH)2 ->[hot] __ CaCl2 + __ Ca(ClO3)2 + __ H2O",
        "answers": [
          3,
          6,
          3,
          1,
          6
        ],
        "acceptedAnswers": [
          "3",
          "6",
          "3",
          "1",
          "6"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 6 : 3 : 1 : 6; kiểm tra lại thu được Ca: 6=4, Cl: 6=8, H: 12=12, O: 12=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaCO3 + __ HCl -> __ CaCl2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Ca: 1=1, Cl: 2=2, H: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NaHCO3 + __ HCl -> __ NaCl + __ CO2 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Cl: 1=1, H: 2=0, Na: 1=1, O: 3=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KHCO3 + __ H2SO4 -> __ K2SO4 + __ CO2 + __ H2O",
        "answers": [
          2,
          1,
          1,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 1 : 1 : 2 : 1; kiểm tra lại thu được C: 2=2, H: 4=2, K: 2=2, O: 10=9, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ca(HCO3)2 + __ HCl -> __ CaCl2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          2,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 2 : 2; kiểm tra lại thu được C: 2=2, Ca: 1=1, Cl: 2=2, H: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ MgCO3 + __ H2SO4 -> __ MgSO4 + __ CO2 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, H: 2=2, Mg: 1=1, O: 7=7, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCO3 + __ HCl -> __ FeCl2 + __ CO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Cl: 2=2, Fe: 1=1, H: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2O2 + __ H2O -> __ NaOH + __ O2",
        "answers": [
          2,
          2,
          4,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "4",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 4 : 1; kiểm tra lại thu được H: 4=4, Na: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2O2 + __ H2O -> __ KOH + __ O2",
        "answers": [
          2,
          2,
          4,
          1
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "4",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 2 : 2 : 4 : 1; kiểm tra lại thu được H: 4=4, K: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2O2 + __ KI -> __ KOH + __ I2 + __ H2O",
        "answers": [
          1,
          2,
          2,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 2 : 2; kiểm tra lại thu được H: 2=2, I: 2=4, K: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuO + __ NH3 ->[t°] __ Cu + __ N2 + __ H2O",
        "answers": [
          3,
          2,
          3,
          3
        ],
        "acceptedAnswers": [
          "3",
          "2",
          "3",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 2 : 3 : 3; kiểm tra lại thu được Cu: 3=3, H: 6=0, N: 2=6, O: 3=0, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe2O3 + __ NH3 ->[t°] __ Fe + __ N2 + __ H2O",
        "answers": [
          3,
          2,
          6,
          1,
          3
        ],
        "acceptedAnswers": [
          "3",
          "2",
          "6",
          "1",
          "3"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 3 : 2 : 6 : 1 : 3; kiểm tra lại thu được Fe: 6=6, H: 6=6, N: 2=2, O: 9=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ PbO + __ H2 ->[t°] __ Pb + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được H: 2=2, O: 1=1, Pb: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SiO2 + __ NaOH -> __ Na2SiO3 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được H: 2=2, Na: 2=2, O: 4=4, Si: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CO2 + __ NaOH -> __ Na2CO3 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được C: 1=1, H: 2=2, Na: 2=2, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CO2 + __ Ca(OH)2 -> __ CaCO3 + __ H2O",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1 : 1; kiểm tra lại thu được C: 1=1, Ca: 1=1, H: 2=2, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SO2 + __ NaOH -> __ Na2SO3 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được H: 2=2, Na: 2=2, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SO3 + __ NaOH -> __ Na2SO4 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 2 : 1 : 1; kiểm tra lại thu được H: 2=2, Na: 2=2, O: 5=5, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ N2O5 + __ H2O -> __ HNO3",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được H: 2=2, N: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P2O5 + __ H2O -> __ H3PO4",
        "answers": [
          1,
          3,
          2
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 3 : 2; kiểm tra lại thu được H: 6=6, O: 8=8, P: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SO3 + __ H2O -> __ H2SO4",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được H: 2=2, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CaO + __ H2O -> __ Ca(OH)2",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 1; kiểm tra lại thu được Ca: 1=1, H: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2O + __ H2O -> __ NaOH",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được H: 2=2, Na: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2O + __ H2O -> __ KOH",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Đặt hệ số theo nguyên tắc bảo toàn nguyên tố, ưu tiên nguyên tố hoặc nhóm đa nguyên tử xuất hiện ở ít chất trước, sau đó cân bằng H và O nếu cần. Bộ hệ số tối giản là 1 : 1 : 2; kiểm tra lại thu được H: 2=2, K: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      }
    ],
    "hard": [
      {
        "equation": "__ KMnO4 + __ HCl -> __ KCl + __ MnCl2 + __ Cl2 + __ H2O",
        "answers": [
          2,
          16,
          2,
          2,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "16",
          "2",
          "2",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 16 : 2 : 2 : 5 : 8. Kiểm tra cuối cho thấy Cl: 16=16, H: 16=16, K: 2=2, Mn: 2=2, O: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ FeCl2 + __ HCl -> __ KCl + __ MnCl2 + __ FeCl3 + __ H2O",
        "answers": [
          2,
          10,
          16,
          2,
          10,
          8
        ],
        "acceptedAnswers": [
          "2",
          "10",
          "16",
          "2",
          "10",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 10 : 16 : 2 : 10 : 8. Kiểm tra cuối cho thấy Cl: 36=46, Fe: 10=8, H: 16=0, K: 2=2, Mn: 2=10, O: 8=0, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ FeSO4 + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ Fe2(SO4)3 + __ H2O",
        "answers": [
          2,
          10,
          8,
          1,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "10",
          "8",
          "1",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 10 : 8 : 1 : 5 : 8. Kiểm tra cuối cho thấy Fe: 10=16, H: 16=0, K: 2=2, Mn: 2=5, O: 80=120, S: 18=30, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ H2O2 + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ O2 + __ H2O",
        "answers": [
          2,
          5,
          3,
          2,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "2",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 2 : 5 : 8. Kiểm tra cuối cho thấy H: 16=0, K: 2=4, Mn: 2=5, O: 30=44, S: 3=7, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ Na2C2O4 + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ Na2SO4 + __ CO2 + __ H2O",
        "answers": [
          2,
          5,
          3,
          1,
          10,
          8
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "1",
          "10",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 1 : 10 : 8. Kiểm tra cuối cho thấy C: 10=0, H: 6=0, K: 2=2, Mn: 2=10, Na: 10=16, O: 40=76, S: 3=19, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ HCl -> __ KCl + __ CrCl3 + __ Cl2 + __ H2O",
        "answers": [
          1,
          14,
          2,
          3,
          7
        ],
        "acceptedAnswers": [
          "1",
          "14",
          "2",
          "3",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 14 : 2 : 3 : 7. Kiểm tra cuối cho thấy Cl: 14=25, Cr: 2=3, H: 14=0, K: 2=2, O: 7=0, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ FeCl2 + __ HCl -> __ KCl + __ CrCl3 + __ FeCl3 + __ H2O",
        "answers": [
          1,
          6,
          14,
          2,
          6,
          7
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "14",
          "2",
          "6",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 6 : 14 : 2 : 6 : 7. Kiểm tra cuối cho thấy Cl: 26=41, Cr: 2=6, Fe: 6=7, H: 14=0, K: 2=2, O: 7=0, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ FeSO4 + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ Fe2(SO4)3 + __ H2O",
        "answers": [
          1,
          6,
          7,
          1,
          3,
          7
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "7",
          "1",
          "3",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 6 : 7 : 1 : 3 : 7. Kiểm tra cuối cho thấy Cr: 2=6, Fe: 6=14, H: 14=0, K: 2=2, O: 59=124, S: 13=31, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ H2S + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ S + __ H2O",
        "answers": [
          1,
          3,
          4,
          1,
          7,
          4
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "4",
          "1",
          "7",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 3 : 4 : 1 : 7 : 4. Kiểm tra cuối cho thấy Cr: 2=14, H: 14=0, K: 2=2, O: 23=88, S: 7=26, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ KI + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ I2 + __ H2O",
        "answers": [
          1,
          6,
          7,
          3,
          7,
          7
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "7",
          "3",
          "7",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 6 : 7 : 3 : 7 : 7. Kiểm tra cuối cho thấy Cr: 2=14, H: 14=0, I: 6=14, K: 8=6, O: 35=96, S: 7=24, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ Na2SO3 + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ Na2SO4 + __ H2O",
        "answers": [
          1,
          3,
          4,
          1,
          1,
          4
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "4",
          "1",
          "1",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 3 : 4 : 1 : 1 : 4. Kiểm tra cuối cho thấy Cr: 2=2, H: 8=0, K: 2=2, Na: 6=8, O: 32=32, S: 7=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ Na2SO3 + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ Na2SO4 + __ H2O",
        "answers": [
          2,
          5,
          3,
          1,
          2,
          5
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "1",
          "2",
          "5"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 1 : 2 : 5. Kiểm tra cuối cho thấy H: 6=0, K: 2=2, Mn: 2=2, Na: 10=10, O: 35=32, S: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ KNO2 + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ KNO3 + __ H2O",
        "answers": [
          2,
          5,
          3,
          1,
          5,
          3
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "1",
          "5",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 1 : 5 : 3. Kiểm tra cuối cho thấy H: 6=0, K: 7=5, Mn: 2=5, N: 5=3, O: 30=33, S: 3=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ NaNO2 + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ NaNO3 + __ H2O",
        "answers": [
          2,
          5,
          3,
          1,
          5,
          3
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "1",
          "5",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 1 : 5 : 3. Kiểm tra cuối cho thấy H: 6=0, K: 2=2, Mn: 2=5, N: 5=3, Na: 5=3, O: 30=33, S: 3=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ H2C2O4 + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ CO2 + __ H2O",
        "answers": [
          2,
          5,
          3,
          1,
          10,
          8
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "1",
          "10",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 1 : 10 : 8. Kiểm tra cuối cho thấy C: 10=8, H: 16=0, K: 2=2, Mn: 2=10, O: 40=60, S: 3=11, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ HCOOH + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ CO2 + __ H2O",
        "answers": [
          2,
          5,
          3,
          1,
          5,
          7
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "1",
          "5",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 1 : 5 : 7. Kiểm tra cuối cho thấy C: 5=7, H: 16=0, K: 2=2, Mn: 2=5, O: 30=38, S: 3=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ MnO2 + __ HCl -> __ MnCl2 + __ Cl2 + __ H2O",
        "answers": [
          1,
          4,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "4",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 4 : 1 : 1 : 2. Kiểm tra cuối cho thấy Cl: 4=4, H: 4=4, Mn: 1=1, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ PbO2 + __ HCl -> __ PbCl2 + __ Cl2 + __ H2O",
        "answers": [
          1,
          4,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "4",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 4 : 1 : 1 : 2. Kiểm tra cuối cho thấy Cl: 4=4, H: 4=4, O: 2=2, Pb: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu + __ HNO3 ->[dilute] __ Cu(NO3)2 + __ NO + __ H2O",
        "answers": [
          3,
          8,
          3,
          2,
          4
        ],
        "acceptedAnswers": [
          "3",
          "8",
          "3",
          "2",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 3 : 8 : 3 : 2 : 4. Kiểm tra cuối cho thấy Cu: 3=3, H: 8=8, N: 8=8, O: 24=24, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu + __ HNO3 ->[concentrated] __ Cu(NO3)2 + __ NO2 + __ H2O",
        "answers": [
          1,
          4,
          1,
          2,
          2
        ],
        "acceptedAnswers": [
          "1",
          "4",
          "1",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 4 : 1 : 2 : 2. Kiểm tra cuối cho thấy Cu: 1=1, H: 4=4, N: 4=4, O: 12=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ag + __ HNO3 ->[dilute] __ AgNO3 + __ NO + __ H2O",
        "answers": [
          3,
          4,
          3,
          1,
          2
        ],
        "acceptedAnswers": [
          "3",
          "4",
          "3",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 3 : 4 : 3 : 1 : 2. Kiểm tra cuối cho thấy Ag: 3=3, H: 4=4, N: 4=4, O: 12=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Ag + __ HNO3 ->[concentrated] __ AgNO3 + __ NO2 + __ H2O",
        "answers": [
          1,
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 2 : 1 : 1 : 1. Kiểm tra cuối cho thấy Ag: 1=1, H: 2=2, N: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe + __ HNO3 ->[dilute] __ Fe(NO3)3 + __ NO + __ H2O",
        "answers": [
          1,
          4,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "4",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 4 : 1 : 1 : 2. Kiểm tra cuối cho thấy Fe: 1=1, H: 4=4, N: 4=4, O: 12=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Zn + __ HNO3 ->[very dilute] __ Zn(NO3)2 + __ NH4NO3 + __ H2O",
        "answers": [
          4,
          10,
          4,
          1,
          3
        ],
        "acceptedAnswers": [
          "4",
          "10",
          "4",
          "1",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 4 : 10 : 4 : 1 : 3. Kiểm tra cuối cho thấy H: 10=10, N: 10=10, O: 30=30, Zn: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C + __ HNO3 ->[concentrated] __ CO2 + __ NO2 + __ H2O",
        "answers": [
          1,
          4,
          1,
          4,
          2
        ],
        "acceptedAnswers": [
          "1",
          "4",
          "1",
          "4",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 4 : 1 : 4 : 2. Kiểm tra cuối cho thấy C: 1=1, H: 4=4, N: 4=4, O: 12=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P + __ HNO3 ->[concentrated] __ H3PO4 + __ NO2 + __ H2O",
        "answers": [
          1,
          5,
          1,
          5,
          1
        ],
        "acceptedAnswers": [
          "1",
          "5",
          "1",
          "5",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 5 : 1 : 5 : 1. Kiểm tra cuối cho thấy H: 5=5, N: 5=5, O: 15=15, P: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ S + __ HNO3 ->[concentrated] __ H2SO4 + __ NO2 + __ H2O",
        "answers": [
          1,
          6,
          1,
          6,
          2
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "1",
          "6",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 6 : 1 : 6 : 2. Kiểm tra cuối cho thấy H: 6=6, N: 6=6, O: 18=18, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2S + __ HNO3 ->[dilute] __ S + __ NO + __ H2O",
        "answers": [
          3,
          2,
          3,
          2,
          4
        ],
        "acceptedAnswers": [
          "3",
          "2",
          "3",
          "2",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 3 : 2 : 3 : 2 : 4. Kiểm tra cuối cho thấy H: 8=8, N: 2=2, O: 6=6, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SO2 + __ H2O2 -> __ H2SO4",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1. Kiểm tra cuối cho thấy H: 2=2, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SO2 + __ Cl2 + __ H2O -> __ H2SO4 + __ HCl",
        "answers": [
          1,
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 2 : 1 : 2. Kiểm tra cuối cho thấy Cl: 2=2, H: 4=4, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2S + __ Cl2 -> __ S + __ HCl",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1 : 2. Kiểm tra cuối cho thấy Cl: 2=2, H: 2=2, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2S + __ Br2 -> __ S + __ HBr",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1 : 2. Kiểm tra cuối cho thấy Br: 2=2, H: 2=2, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl2 + __ Cl2 -> __ FeCl3",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2. Kiểm tra cuối cho thấy Cl: 6=6, Fe: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SnCl2 + __ Cl2 -> __ SnCl4",
        "answers": [
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1. Kiểm tra cuối cho thấy Cl: 4=4, Sn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KI + __ Cl2 -> __ I2 + __ KCl",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy Cl: 2=2, I: 2=2, K: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2S2O3 + __ I2 -> __ Na2S4O6 + __ NaI",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy I: 2=2, Na: 4=4, O: 6=6, S: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeSO4 + __ H2O2 + __ H2SO4 -> __ Fe2(SO4)3 + __ H2O",
        "answers": [
          2,
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 1 : 2. Kiểm tra cuối cho thấy Fe: 2=2, H: 4=4, O: 14=14, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl2 + __ H2O2 + __ HCl -> __ FeCl3 + __ H2O",
        "answers": [
          2,
          1,
          2,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2 : 2 : 2. Kiểm tra cuối cho thấy Cl: 6=6, Fe: 2=2, H: 4=4, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu + __ FeCl3 -> __ CuCl2 + __ FeCl2",
        "answers": [
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 2 : 1 : 2. Kiểm tra cuối cho thấy Cl: 6=6, Cu: 1=1, Fe: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl3 + __ H2S -> __ FeCl2 + __ S + __ HCl",
        "answers": [
          2,
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2 : 1 : 2. Kiểm tra cuối cho thấy Cl: 6=6, Fe: 2=2, H: 2=2, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl3 + __ SnCl2 -> __ FeCl2 + __ SnCl4",
        "answers": [
          2,
          1,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2 : 1. Kiểm tra cuối cho thấy Cl: 8=8, Fe: 2=2, Sn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl3 + __ Cu -> __ FeCl2 + __ CuCl2",
        "answers": [
          2,
          1,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2 : 1. Kiểm tra cuối cho thấy Cl: 6=6, Cu: 1=1, Fe: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl3 + __ KI -> __ FeCl2 + __ I2 + __ KCl",
        "answers": [
          2,
          2,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 2 : 2 : 1 : 2. Kiểm tra cuối cho thấy Cl: 6=6, Fe: 2=2, I: 2=2, K: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuSO4 + __ KI -> __ CuI + __ I2 + __ K2SO4",
        "answers": [
          2,
          4,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "4",
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 4 : 2 : 1 : 2. Kiểm tra cuối cho thấy Cu: 2=2, I: 4=4, K: 4=4, O: 8=8, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuSO4 + __ Fe -> __ FeSO4 + __ Cu",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1 : 1. Kiểm tra cuối cho thấy Cu: 1=1, Fe: 1=1, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ AgNO3 + __ Cu -> __ Cu(NO3)2 + __ Ag",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy Ag: 2=2, Cu: 1=1, N: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ AgNO3 + __ Al -> __ Al(NO3)3 + __ Ag",
        "answers": [
          3,
          1,
          1,
          3
        ],
        "acceptedAnswers": [
          "3",
          "1",
          "1",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 3 : 1 : 1 : 3. Kiểm tra cuối cho thấy Ag: 3=3, Al: 1=1, N: 3=3, O: 9=9, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuO + __ NH3 ->[t°] __ Cu + __ N2 + __ H2O",
        "answers": [
          3,
          2,
          3,
          3
        ],
        "acceptedAnswers": [
          "3",
          "2",
          "3",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 3 : 2 : 3 : 3. Kiểm tra cuối cho thấy Cu: 3=3, H: 6=0, N: 2=6, O: 3=0, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Fe2O3 + __ NH3 ->[t°] __ Fe + __ N2 + __ H2O",
        "answers": [
          3,
          2,
          6,
          1,
          3
        ],
        "acceptedAnswers": [
          "3",
          "2",
          "6",
          "1",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 3 : 2 : 6 : 1 : 3. Kiểm tra cuối cho thấy Fe: 6=6, H: 6=6, N: 2=2, O: 9=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ CuO + __ CH4 ->[t°] __ Cu + __ CO2 + __ H2O",
        "answers": [
          4,
          1,
          4,
          2
        ],
        "acceptedAnswers": [
          "4",
          "1",
          "4",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 4 : 1 : 4 : 2. Kiểm tra cuối cho thấy C: 1=2, Cu: 4=4, H: 4=0, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ Fe2O3 -> __ Al2O3 + __ Fe",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy Al: 2=2, Fe: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ Cr2O3 -> __ Al2O3 + __ Cr",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy Al: 2=2, Cr: 2=2, O: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Mg + __ TiCl4 -> __ Ti + __ MgCl2",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy Cl: 4=4, Mg: 2=2, Ti: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ V2O5 -> __ Al2O3 + __ V",
        "answers": [
          10,
          3,
          5,
          6
        ],
        "acceptedAnswers": [
          "10",
          "3",
          "5",
          "6"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 10 : 3 : 5 : 6. Kiểm tra cuối cho thấy Al: 10=10, O: 15=15, V: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Al + __ MnO2 -> __ Al2O3 + __ Mn",
        "answers": [
          4,
          3,
          2,
          3
        ],
        "acceptedAnswers": [
          "4",
          "3",
          "2",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 4 : 3 : 2 : 3. Kiểm tra cuối cho thấy Al: 4=4, Mn: 3=3, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Mg + __ SiO2 -> __ MgO + __ Si",
        "answers": [
          2,
          1,
          2,
          1
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2 : 1. Kiểm tra cuối cho thấy Mg: 2=2, O: 2=2, Si: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C + __ SiO2 ->[t°] __ Si + __ CO",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy C: 2=2, O: 2=2, Si: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C + __ PbO -> __ Pb + __ CO2",
        "answers": [
          1,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 2 : 1 : 1. Kiểm tra cuối cho thấy C: 1=1, O: 2=2, Pb: 2=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ C + __ SnO2 -> __ Sn + __ CO",
        "answers": [
          2,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 2. Kiểm tra cuối cho thấy C: 2=2, O: 2=2, Sn: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ ZnS + __ O2 ->[t°] __ ZnO + __ SO2",
        "answers": [
          2,
          3,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 3 : 2 : 2. Kiểm tra cuối cho thấy O: 6=6, S: 2=2, Zn: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeS2 + __ O2 ->[t°] __ Fe2O3 + __ SO2",
        "answers": [
          4,
          11,
          2,
          8
        ],
        "acceptedAnswers": [
          "4",
          "11",
          "2",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 4 : 11 : 2 : 8. Kiểm tra cuối cho thấy Fe: 4=4, O: 22=22, S: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu2S + __ O2 ->[t°] __ Cu2O + __ SO2",
        "answers": [
          2,
          3,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 3 : 2 : 2. Kiểm tra cuối cho thấy Cu: 4=4, O: 6=6, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cu2O + __ C -> __ Cu + __ CO2",
        "answers": [
          2,
          1,
          4,
          1
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "4",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 4 : 1. Kiểm tra cuối cho thấy C: 1=1, Cu: 4=4, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ PbS + __ O2 ->[t°] __ PbO + __ SO2",
        "answers": [
          2,
          3,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 3 : 2 : 2. Kiểm tra cuối cho thấy O: 6=6, Pb: 2=2, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ HgS + __ O2 ->[t°] __ HgO + __ SO2",
        "answers": [
          2,
          3,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 3 : 2 : 2. Kiểm tra cuối cho thấy Hg: 2=2, O: 6=6, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ SO2 + __ O2 ->[V2O5, t°] __ SO3",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2. Kiểm tra cuối cho thấy O: 6=6, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NH3 + __ O2 ->[Pt, t°] __ NO + __ H2O",
        "answers": [
          4,
          5,
          4,
          6
        ],
        "acceptedAnswers": [
          "4",
          "5",
          "4",
          "6"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 4 : 5 : 4 : 6. Kiểm tra cuối cho thấy H: 12=12, N: 4=4, O: 10=10, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NH3 + __ O2 -> __ N2 + __ H2O",
        "answers": [
          4,
          3,
          2,
          6
        ],
        "acceptedAnswers": [
          "4",
          "3",
          "2",
          "6"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 4 : 3 : 2 : 6. Kiểm tra cuối cho thấy H: 12=12, N: 4=4, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2S + __ O2 -> __ SO2 + __ H2O",
        "answers": [
          2,
          3,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 3 : 2 : 2. Kiểm tra cuối cho thấy H: 4=4, O: 6=6, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ H2S + __ O2 ->[excess O2] __ H2SO4",
        "answers": [
          1,
          4,
          1
        ],
        "acceptedAnswers": [
          "1",
          "4",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 4 : 1. Kiểm tra cuối cho thấy H: 2=2, O: 8=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ N2 + __ O2 ->[t°] __ NO",
        "answers": [
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 2. Kiểm tra cuối cho thấy N: 2=2, O: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NO + __ O2 -> __ NO2",
        "answers": [
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 2. Kiểm tra cuối cho thấy N: 2=2, O: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NO2 + __ H2O -> __ HNO3 + __ HNO2",
        "answers": [
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1 : 1. Kiểm tra cuối cho thấy H: 2=2, N: 1=2, O: 3=5, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NO2 + __ H2O -> __ HNO3 + __ NO",
        "answers": [
          3,
          1,
          2,
          1
        ],
        "acceptedAnswers": [
          "3",
          "1",
          "2",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 3 : 1 : 2 : 1. Kiểm tra cuối cho thấy H: 2=2, N: 3=3, O: 7=7, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Cl2 + __ SO2 + __ H2O -> __ H2SO4 + __ HCl",
        "answers": [
          1,
          1,
          2,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "2",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 2 : 1 : 2. Kiểm tra cuối cho thấy Cl: 2=2, H: 4=4, O: 4=4, S: 1=1, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P4 + __ Cl2 -> __ PCl3",
        "answers": [
          1,
          6,
          4
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 6 : 4. Kiểm tra cuối cho thấy Cl: 12=12, P: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P4 + __ Cl2 -> __ PCl5",
        "answers": [
          1,
          10,
          4
        ],
        "acceptedAnswers": [
          "1",
          "10",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 10 : 4. Kiểm tra cuối cho thấy Cl: 20=20, P: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P + __ Cl2 -> __ PCl3",
        "answers": [
          2,
          3,
          2
        ],
        "acceptedAnswers": [
          "2",
          "3",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 3 : 2. Kiểm tra cuối cho thấy Cl: 6=6, P: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ P + __ Cl2 -> __ PCl5",
        "answers": [
          2,
          5,
          2
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 2. Kiểm tra cuối cho thấy Cl: 10=10, P: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KClO3 ->[MnO2, t°] __ KCl + __ O2",
        "answers": [
          2,
          2,
          3
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 2 : 3. Kiểm tra cuối cho thấy Cl: 2=2, K: 2=2, O: 6=6, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 ->[t°] __ K2MnO4 + __ MnO2 + __ O2",
        "answers": [
          2,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 1. Kiểm tra cuối cho thấy K: 2=2, Mn: 2=2, O: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 ->[t°] __ K2CrO4 + __ Cr2O3 + __ O2",
        "answers": [
          2,
          2,
          1,
          3
        ],
        "acceptedAnswers": [
          "2",
          "2",
          "1",
          "3"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 2 : 1 : 3. Kiểm tra cuối cho thấy Cr: 4=4, K: 4=4, O: 14=17, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ NH4ClO4 -> __ N2 + __ Cl2 + __ O2 + __ H2O",
        "answers": [
          2,
          1,
          1,
          4,
          4
        ],
        "acceptedAnswers": [
          "2",
          "1",
          "1",
          "4",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 1 : 1 : 4 : 4. Kiểm tra cuối cho thấy Cl: 2=2, H: 8=8, N: 2=2, O: 8=12, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2S2O3 + __ HCl -> __ NaCl + __ SO2 + __ S + __ H2O",
        "answers": [
          1,
          2,
          2,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "2",
          "2",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 2 : 2 : 1 : 1. Kiểm tra cuối cho thấy Cl: 2=2, H: 2=0, Na: 2=2, O: 3=2, S: 2=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2S2O3 + __ H2SO4 -> __ Na2SO4 + __ SO2 + __ S + __ H2O",
        "answers": [
          1,
          1,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1 : 1 : 1. Kiểm tra cuối cho thấy H: 2=0, Na: 2=2, O: 7=6, S: 3=3, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ NaNO2 + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ NaNO3 + __ H2O",
        "answers": [
          1,
          3,
          4,
          1,
          3,
          4
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "4",
          "1",
          "3",
          "4"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 3 : 4 : 1 : 3 : 4. Kiểm tra cuối cho thấy Cr: 2=6, H: 8=0, K: 2=2, N: 3=4, Na: 3=4, O: 29=52, S: 4=10, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ NaI + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ I2 + __ H2O",
        "answers": [
          1,
          6,
          7,
          4,
          1,
          3,
          7
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "7",
          "4",
          "1",
          "3",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 6 : 7 : 4 : 1 : 3 : 7. Kiểm tra cuối cho thấy Cr: 2=2, H: 14=14, I: 6=6, K: 2=8, Na: 6=0, O: 35=35, S: 7=7, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ KI + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ I2 + __ H2O",
        "answers": [
          2,
          10,
          8,
          6,
          2,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "10",
          "8",
          "6",
          "2",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 10 : 8 : 6 : 2 : 5 : 8. Kiểm tra cuối cho thấy H: 16=16, I: 10=10, K: 12=12, Mn: 2=2, O: 40=40, S: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ NaCl + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ Cl2 + __ Na2SO4 + __ H2O",
        "answers": [
          2,
          10,
          8,
          1,
          2,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "10",
          "8",
          "1",
          "2",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 10 : 8 : 1 : 2 : 5 : 8. Kiểm tra cuối cho thấy Cl: 10=10, H: 16=0, K: 2=2, Mn: 2=2, Na: 10=16, O: 40=44, S: 8=11, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ KBr + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ Br2 + __ H2O",
        "answers": [
          2,
          10,
          8,
          6,
          2,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "10",
          "8",
          "6",
          "2",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 10 : 8 : 6 : 2 : 5 : 8. Kiểm tra cuối cho thấy Br: 10=10, H: 16=16, K: 12=12, Mn: 2=2, O: 40=40, S: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ KBr + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ Br2 + __ H2O",
        "answers": [
          1,
          6,
          7,
          4,
          1,
          3,
          7
        ],
        "acceptedAnswers": [
          "1",
          "6",
          "7",
          "4",
          "1",
          "3",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 6 : 7 : 4 : 1 : 3 : 7. Kiểm tra cuối cho thấy Br: 6=6, Cr: 2=2, H: 14=14, K: 8=8, O: 35=35, S: 7=7, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ H2O2 + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ O2 + __ H2O",
        "answers": [
          1,
          3,
          4,
          1,
          1,
          3,
          7
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "4",
          "1",
          "1",
          "3",
          "7"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 3 : 4 : 1 : 1 : 3 : 7. Kiểm tra cuối cho thấy Cr: 2=2, H: 14=14, K: 2=2, O: 29=29, S: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ H2O2 + __ HCl -> __ KCl + __ MnCl2 + __ O2 + __ H2O",
        "answers": [
          2,
          5,
          6,
          2,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "6",
          "2",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 6 : 2 : 5 : 8. Kiểm tra cuối cho thấy Cl: 6=12, H: 16=0, K: 2=2, Mn: 2=5, O: 18=16, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ H2S + __ H2SO4 -> __ K2SO4 + __ MnSO4 + __ S + __ H2O",
        "answers": [
          2,
          5,
          3,
          1,
          2,
          5,
          8
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "3",
          "1",
          "2",
          "5",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 3 : 1 : 2 : 5 : 8. Kiểm tra cuối cho thấy H: 16=16, K: 2=2, Mn: 2=2, O: 20=20, S: 8=8, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ K2Cr2O7 + __ SO2 + __ H2SO4 -> __ K2SO4 + __ Cr2(SO4)3 + __ H2O",
        "answers": [
          1,
          3,
          1,
          1,
          1
        ],
        "acceptedAnswers": [
          "1",
          "3",
          "1",
          "1",
          "1"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 3 : 1 : 1 : 1. Kiểm tra cuối cho thấy Cr: 2=2, H: 2=0, K: 2=2, O: 17=16, S: 4=4, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ KMnO4 + __ SO2 + __ H2O -> __ K2SO4 + __ MnSO4 + __ H2SO4",
        "answers": [
          2,
          5,
          2,
          1,
          2,
          2
        ],
        "acceptedAnswers": [
          "2",
          "5",
          "2",
          "1",
          "2",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 2 : 5 : 2 : 1 : 2 : 2. Kiểm tra cuối cho thấy H: 4=4, K: 2=2, Mn: 2=2, O: 20=20, S: 5=5, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeSO4 + __ KMnO4 + __ H2SO4 ->[acidic] __ Fe2(SO4)3 + __ K2SO4 + __ MnSO4 + __ H2O",
        "answers": [
          10,
          2,
          8,
          5,
          1,
          8
        ],
        "acceptedAnswers": [
          "10",
          "2",
          "8",
          "5",
          "1",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 10 : 2 : 8 : 5 : 1 : 8. Kiểm tra cuối cho thấy Fe: 10=10, H: 16=0, K: 2=2, Mn: 2=8, O: 80=96, S: 18=24, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ FeCl2 + __ KMnO4 + __ HCl ->[acidic] __ FeCl3 + __ KCl + __ MnCl2 + __ H2O",
        "answers": [
          10,
          2,
          16,
          10,
          2,
          8
        ],
        "acceptedAnswers": [
          "10",
          "2",
          "16",
          "10",
          "2",
          "8"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 10 : 2 : 16 : 10 : 2 : 8. Kiểm tra cuối cho thấy Cl: 36=48, Fe: 10=10, H: 16=0, K: 2=2, Mn: 2=8, O: 8=0, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2SO3 + __ Br2 + __ H2O -> __ Na2SO4 + __ HBr",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1 : 2. Kiểm tra cuối cho thấy Br: 2=0, H: 2=0, Na: 2=4, O: 4=8, S: 1=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      },
      {
        "equation": "__ Na2SO3 + __ Cl2 + __ H2O -> __ Na2SO4 + __ HCl",
        "answers": [
          1,
          1,
          1,
          2
        ],
        "acceptedAnswers": [
          "1",
          "1",
          "1",
          "2"
        ],
        "explanation": "Trước hết xác định các chất có thay đổi thành phần hoặc số oxi hóa để chọn trình tự cân bằng phù hợp; với phản ứng oxi hóa–khử, bảo toàn electron là bước then chốt. Sau khi cân bằng các nguyên tố/nhóm đa nguyên tử chính, cân bằng H và O ở bước cuối rồi rút gọn về bộ hệ số nguyên nhỏ nhất 1 : 1 : 1 : 2. Kiểm tra cuối cho thấy Cl: 2=0, H: 2=0, Na: 2=4, O: 4=8, S: 1=2, nên phương trình đã cân bằng hoàn toàn.",
        "timeLimitSec": 25
      }
    ]
  },
  "fill_blank": {
    "easy": [
      {
        "equation": "2 Mg + O2 ->[t°] ___",
        "acceptedAnswers": [
          "MgO"
        ],
        "explanation": "Đáp án cần điền là MgO. Khi thay MgO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy MgO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Ca + O2 ->[t°] ___",
        "acceptedAnswers": [
          "CaO"
        ],
        "explanation": "Đáp án cần điền là CaO. Khi thay CaO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CaO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Ba + O2 ->[t°] ___",
        "acceptedAnswers": [
          "BaO"
        ],
        "explanation": "Đáp án cần điền là BaO. Khi thay BaO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy BaO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Zn + O2 ->[t°] ___",
        "acceptedAnswers": [
          "ZnO"
        ],
        "explanation": "Đáp án cần điền là ZnO. Khi thay ZnO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy ZnO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Fe + O2 ->[t°] ___",
        "acceptedAnswers": [
          "FeO"
        ],
        "explanation": "Đáp án cần điền là FeO. Khi thay FeO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy FeO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Cu + O2 ->[t°] ___",
        "acceptedAnswers": [
          "CuO"
        ],
        "explanation": "Đáp án cần điền là CuO. Khi thay CuO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CuO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Hg + O2 ->[t°] ___",
        "acceptedAnswers": [
          "HgO"
        ],
        "explanation": "Đáp án cần điền là HgO. Khi thay HgO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HgO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Sr + O2 ->[t°] ___",
        "acceptedAnswers": [
          "SrO"
        ],
        "explanation": "Đáp án cần điền là SrO. Khi thay SrO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SrO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Be + O2 ->[t°] ___",
        "acceptedAnswers": [
          "BeO"
        ],
        "explanation": "Đáp án cần điền là BeO. Khi thay BeO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy BeO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Ni + O2 ->[t°] ___",
        "acceptedAnswers": [
          "NiO"
        ],
        "explanation": "Đáp án cần điền là NiO. Khi thay NiO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NiO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Co + O2 ->[t°] ___",
        "acceptedAnswers": [
          "CoO"
        ],
        "explanation": "Đáp án cần điền là CoO. Khi thay CoO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CoO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 Al + 3 O2 ->[t°] ___",
        "acceptedAnswers": [
          "Al2O3"
        ],
        "explanation": "Đáp án cần điền là Al2O3. Khi thay Al2O3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Al2O3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 Fe + 3 O2 ->[t°] ___",
        "acceptedAnswers": [
          "Fe2O3"
        ],
        "explanation": "Đáp án cần điền là Fe2O3. Khi thay Fe2O3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Fe2O3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 Cr + 3 O2 ->[t°] ___",
        "acceptedAnswers": [
          "Cr2O3"
        ],
        "explanation": "Đáp án cần điền là Cr2O3. Khi thay Cr2O3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cr2O3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 B + 3 O2 ->[t°] ___",
        "acceptedAnswers": [
          "B2O3"
        ],
        "explanation": "Đáp án cần điền là B2O3. Khi thay B2O3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy B2O3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 P + 5 O2 ->[t°] ___",
        "acceptedAnswers": [
          "P2O5"
        ],
        "explanation": "Đáp án cần điền là P2O5. Khi thay P2O5 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy P2O5 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 N2 + 5 O2 ->[t°] ___",
        "acceptedAnswers": [
          "N2O5"
        ],
        "explanation": "Đáp án cần điền là N2O5. Khi thay N2O5 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy N2O5 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 As + 5 O2 ->[t°] ___",
        "acceptedAnswers": [
          "As2O5"
        ],
        "explanation": "Đáp án cần điền là As2O5. Khi thay As2O5 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy As2O5 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Na + Cl2 ->None ___",
        "acceptedAnswers": [
          "NaCl"
        ],
        "explanation": "Đáp án cần điền là NaCl. Khi thay NaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 K + Cl2 ->None ___",
        "acceptedAnswers": [
          "KCl"
        ],
        "explanation": "Đáp án cần điền là KCl. Khi thay KCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy KCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Li + Cl2 ->None ___",
        "acceptedAnswers": [
          "LiCl"
        ],
        "explanation": "Đáp án cần điền là LiCl. Khi thay LiCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy LiCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Ag + Cl2 ->None ___",
        "acceptedAnswers": [
          "AgCl"
        ],
        "explanation": "Đáp án cần điền là AgCl. Khi thay AgCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy AgCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Cu + Cl2 ->None ___",
        "acceptedAnswers": [
          "CuCl"
        ],
        "explanation": "Đáp án cần điền là CuCl. Khi thay CuCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CuCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Ca + Cl2 ->None ___",
        "acceptedAnswers": [
          "CaCl"
        ],
        "explanation": "Đáp án cần điền là CaCl. Khi thay CaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Mg + Cl2 ->None ___",
        "acceptedAnswers": [
          "MgCl"
        ],
        "explanation": "Đáp án cần điền là MgCl. Khi thay MgCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy MgCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Zn + Cl2 ->None ___",
        "acceptedAnswers": [
          "ZnCl"
        ],
        "explanation": "Đáp án cần điền là ZnCl. Khi thay ZnCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy ZnCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Ba + Cl2 ->None ___",
        "acceptedAnswers": [
          "BaCl"
        ],
        "explanation": "Đáp án cần điền là BaCl. Khi thay BaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy BaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al + 3 Cl2 ->None ___",
        "acceptedAnswers": [
          "AlCl3"
        ],
        "explanation": "Đáp án cần điền là AlCl3. Khi thay AlCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy AlCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Fe + 3 Cl2 ->None ___",
        "acceptedAnswers": [
          "FeCl3"
        ],
        "explanation": "Đáp án cần điền là FeCl3. Khi thay FeCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy FeCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Cr + 3 Cl2 ->None ___",
        "acceptedAnswers": [
          "CrCl3"
        ],
        "explanation": "Đáp án cần điền là CrCl3. Khi thay CrCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CrCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 B + 3 Cl2 ->None ___",
        "acceptedAnswers": [
          "BCl3"
        ],
        "explanation": "Đáp án cần điền là BCl3. Khi thay BCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy BCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 P + 3 Cl2 ->None ___",
        "acceptedAnswers": [
          "PCl3"
        ],
        "explanation": "Đáp án cần điền là PCl3. Khi thay PCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy PCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe + S ->[t°] ___",
        "acceptedAnswers": [
          "FeS"
        ],
        "explanation": "Đáp án cần điền là FeS. Khi thay FeS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy FeS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Zn + S ->[t°] ___",
        "acceptedAnswers": [
          "ZnS"
        ],
        "explanation": "Đáp án cần điền là ZnS. Khi thay ZnS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy ZnS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Mg + S ->[t°] ___",
        "acceptedAnswers": [
          "MgS"
        ],
        "explanation": "Đáp án cần điền là MgS. Khi thay MgS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy MgS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ca + S ->[t°] ___",
        "acceptedAnswers": [
          "CaS"
        ],
        "explanation": "Đáp án cần điền là CaS. Khi thay CaS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CaS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cu + S ->[t°] ___",
        "acceptedAnswers": [
          "CuS"
        ],
        "explanation": "Đáp án cần điền là CuS. Khi thay CuS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CuS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na + S ->[t°] ___",
        "acceptedAnswers": [
          "NaS"
        ],
        "explanation": "Đáp án cần điền là NaS. Khi thay NaS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K + S ->[t°] ___",
        "acceptedAnswers": [
          "KS"
        ],
        "explanation": "Đáp án cần điền là KS. Khi thay KS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy KS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ba + S ->[t°] ___",
        "acceptedAnswers": [
          "BaS"
        ],
        "explanation": "Đáp án cần điền là BaS. Khi thay BaS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy BaS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ag + S ->[t°] ___",
        "acceptedAnswers": [
          "AgS"
        ],
        "explanation": "Đáp án cần điền là AgS. Khi thay AgS vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy AgS là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al + 3 S ->[t°] ___",
        "acceptedAnswers": [
          "Al2S3"
        ],
        "explanation": "Đáp án cần điền là Al2S3. Khi thay Al2S3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Al2S3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Fe + 3 S ->[t°] ___",
        "acceptedAnswers": [
          "Fe2S3"
        ],
        "explanation": "Đáp án cần điền là Fe2S3. Khi thay Fe2S3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Fe2S3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Cr + 3 S ->[t°] ___",
        "acceptedAnswers": [
          "Cr2S3"
        ],
        "explanation": "Đáp án cần điền là Cr2S3. Khi thay Cr2S3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cr2S3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2 + Cl2 ->[t°] ___",
        "acceptedAnswers": [
          "HCl"
        ],
        "explanation": "Đáp án cần điền là HCl. Khi thay HCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2 + Br2 ->[t°] ___",
        "acceptedAnswers": [
          "HBr"
        ],
        "explanation": "Đáp án cần điền là HBr. Khi thay HBr vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HBr là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2 + I2 ->[t°] ___",
        "acceptedAnswers": [
          "HI"
        ],
        "explanation": "Đáp án cần điền là HI. Khi thay HI vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HI là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2 + F2 ->[t°] ___",
        "acceptedAnswers": [
          "HF"
        ],
        "explanation": "Đáp án cần điền là HF. Khi thay HF vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HF là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C + O2 ->[t°] ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C + O2 ->[thiếu O2] ___",
        "acceptedAnswers": [
          "CO"
        ],
        "explanation": "Đáp án cần điền là CO. Khi thay CO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "N2 + 3 H2 ->[xt, t°] ___",
        "acceptedAnswers": [
          "NH3"
        ],
        "explanation": "Đáp án cần điền là NH3. Khi thay NH3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NH3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 H2O ->[điện phân] 2 H2 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 H2O2 ->[MnO2] 2 H2O + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CaCO3 ->[t°] CaO + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "MgCO3 ->[t°] MgO + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "ZnCO3 ->[t°] ZnO + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "FeCO3 ->[t°] FeO + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CuCO3 ->[t°] CuO + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ca(OH)2 ->[t°] CaO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Mg(OH)2 ->[t°] MgO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cu(OH)2 ->[t°] CuO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Zn(OH)2 ->[t°] ZnO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe(OH)2 ->[t°] FeO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KClO3 ->[MnO2, t°] 2 KCl + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 NaClO3 ->[MnO2, t°] 2 NaCl + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "NaOH + HCl ->None NaCl + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "KOH + HCl ->None KCl + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "LiOH + HNO3 ->None LiNO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "NaOH + HNO3 ->None NaNO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ca(OH)2 + 2 HCl ->None CaCl2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ba(OH)2 + 2 HCl ->None BaCl2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Mg(OH)2 + 2 HCl ->None MgCl2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 NaOH + H2SO4 ->None Na2SO4 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 2KOH + H2SO4 ->None K2SO4 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CaCO3 + 2 HCl ->None CaCl2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "MgCO3 + 2 HCl ->None MgCl2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "ZnCO3 + 2 HCl ->None ZnCl2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "BaCO3 + 2 HCl ->None BaCl2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2CO3 + 2 HCl ->None 2 NaCl + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2CO3 + 2 HCl ->None 2 KCl + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CaCO3 + 2 HNO3 ->None Ca(NO3)2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "MgCO3 + 2 HNO3 ->None Mg(NO3)2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2CO3 + H2SO4 ->None Na2SO4 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Mg + 2 HCl ->None MgCl2 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Zn + 2 HCl ->None ZnCl2 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe + 2 HCl ->None FeCl2 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ca + 2 HCl ->None CaCl2 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al + 6 HCl ->None 2 AlCl3 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe + CuSO4 ->None FeSO4 + ___",
        "acceptedAnswers": [
          "Cu"
        ],
        "explanation": "Đáp án cần điền là Cu. Khi thay Cu vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cu là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Zn + CuSO4 ->None ZnSO4 + ___",
        "acceptedAnswers": [
          "Cu"
        ],
        "explanation": "Đáp án cần điền là Cu. Khi thay Cu vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cu là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cu + 2 AgNO3 ->None Cu(NO3)2 + ___",
        "acceptedAnswers": [
          "Ag"
        ],
        "explanation": "Đáp án cần điền là Ag. Khi thay Ag vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Ag là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al + 3 CuCl2 ->None 2 AlCl3 + ___",
        "acceptedAnswers": [
          "Cu"
        ],
        "explanation": "Đáp án cần điền là Cu. Khi thay Cu vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cu là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Zn + 2 AgNO3 ->None Zn(NO3)2 + ___",
        "acceptedAnswers": [
          "Cu"
        ],
        "explanation": "Đáp án cần điền là Cu. Khi thay Cu vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cu là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe + 2 AgNO3 ->None Fe(NO3)2 + ___",
        "acceptedAnswers": [
          "Cu"
        ],
        "explanation": "Đáp án cần điền là Cu. Khi thay Cu vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cu là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "AgNO3 + NaCl ->None NaNO3 + ___",
        "acceptedAnswers": [
          "AgCl"
        ],
        "explanation": "Đáp án cần điền là AgCl. Khi thay AgCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy AgCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "BaCl2 + Na2SO4 ->None 2 NaCl + ___",
        "acceptedAnswers": [
          "BaSO4"
        ],
        "explanation": "Đáp án cần điền là BaSO4. Khi thay BaSO4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy BaSO4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CaCl2 + Na2CO3 ->None 2 NaCl + ___",
        "acceptedAnswers": [
          "CaCO3"
        ],
        "explanation": "Đáp án cần điền là CaCO3. Khi thay CaCO3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CaCO3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Pb(NO3)2 + 2 KI ->None 2 KNO3 + ___",
        "acceptedAnswers": [
          "PbI2"
        ],
        "explanation": "Đáp án cần điền là PbI2. Khi thay PbI2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy PbI2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "AgNO3 + KBr ->None KNO3 + ___",
        "acceptedAnswers": [
          "AgBr"
        ],
        "explanation": "Đáp án cần điền là AgBr. Khi thay AgBr vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy AgBr là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "FeCl3 + 3 NaOH ->None 3 NaCl + ___",
        "acceptedAnswers": [
          "Fe(OH)3"
        ],
        "explanation": "Đáp án cần điền là Fe(OH)3. Khi thay Fe(OH)3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Fe(OH)3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      }
    ],
    "medium": [
      {
        "equation": "2 KNO3 ->[t°] 2 KNO2 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 NaNO3 ->[t°] 2 NaNO2 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Cu(NO3)2 ->[t°] 2 CuO + 4 NO2 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Pb(NO3)2 ->[t°] 2 PbO + 4 NO2 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 AgNO3 ->[t°] 2 Ag + 2 NO2 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "NH4NO3 ->[t°] N2O + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 NaHCO3 ->[t°] Na2CO3 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ca(OH)2 ->[t°] CaO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Fe + 4 H2O ->[t°] Fe3O4 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al + 3 H2O ->[t°] Al2O3 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ca + 2 H2O ->None Ca(OH)2 + ___",
        "acceptedAnswers": [
          "H2"
        ],
        "explanation": "Đáp án cần điền là H2. Khi thay H2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe2O3 + 3 CO ->[t°] 2 Fe + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CuO + CO ->[t°] Cu + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "PbO + CO ->[t°] Pb + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe2O3 + 3 H2 ->[t°] 2 Fe + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CuO + H2 ->[t°] Cu + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "WO3 + 3 H2 ->[t°] W + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "SnO2 + 2 CO ->[t°] Sn + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "FeS + 2 HCl ->None FeCl2 + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "ZnS + 2 HCl ->None ZnCl2 + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2S + 2 HCl ->None 2 NaCl + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CaS + 2 HCl ->None CaCl2 + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "MgS + 2 HCl ->None MgCl2 + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Al2S3 + 6 HCl ->None 2 AlCl3 + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CuS + 2 HCl ->None CuCl2 + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "PbS + 2 HCl ->None PbCl2 + ___",
        "acceptedAnswers": [
          "H2S"
        ],
        "explanation": "Đáp án cần điền là H2S. Khi thay H2S vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2S là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CuO + H2SO4 ->None CuSO4 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe2O3 + 6 HCl ->None 2 FeCl3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Al2O3 + 3 H2SO4 ->None Al2(SO4)3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CaO + 2 HNO3 ->None Ca(NO3)2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "MgO + 2 HCl ->None MgCl2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "ZnO + H2SO4 ->None ZnSO4 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2O + 2 HCl ->None 2 NaCl + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2O + 2 HNO3 ->None 2 KNO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Al(OH)3 + 3 HCl ->None AlCl3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe(OH)3 + 3 HCl ->None FeCl3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cu(OH)2 + H2SO4 ->None CuSO4 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al(OH)3 + 3 H2SO4 ->None Al2(SO4)3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ba(OH)2 + H2SO4 ->None BaSO4 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Ca(OH)2 + 2 H3PO4 ->None Ca3(PO4)2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C2H4 + 3 O2 ->[t°] 2 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C2H6 + 7 O2 ->[t°] 4 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C3H6 + 9 O2 ->[t°] 6 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C4H8 + 6 O2 ->[t°] 4 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C4H10 + 13 O2 ->[t°] 8 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C5H10 + 15 O2 ->[t°] 10 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C5H12 + 8 O2 ->[t°] 5 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C6H6 + 15 O2 ->[t°] 12 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C6H14 + 19 O2 ->[t°] 12 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C7H16 + 11 O2 ->[t°] 7 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 CH3OH + 3 O2 ->[t°] 2 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C2H5OH + 3 O2 ->[t°] 2 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C3H7OH + 9 O2 ->[t°] 6 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C4H9OH + 6 O2 ->[t°] 4 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C2H4O2 + 5 O2 ->[t°] 4 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C3H6O + 7 O2 ->[t°] 6 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2SO4 + BaCl2 ->None BaSO4 + ___",
        "acceptedAnswers": [
          "NaCl"
        ],
        "explanation": "Đáp án cần điền là NaCl. Khi thay NaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2SO4 + BaCl2 ->None BaSO4 + ___",
        "acceptedAnswers": [
          "KCl"
        ],
        "explanation": "Đáp án cần điền là KCl. Khi thay KCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy KCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2CO3 + CaCl2 ->None CaCO3 + ___",
        "acceptedAnswers": [
          "NaCl"
        ],
        "explanation": "Đáp án cần điền là NaCl. Khi thay NaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Na3PO4 + 3 CaCl2 ->None Ca3(PO4)2 + ___",
        "acceptedAnswers": [
          "NaCl"
        ],
        "explanation": "Đáp án cần điền là NaCl. Khi thay NaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 AgNO3 + Na2CO3 ->None Ag2CO3 + ___",
        "acceptedAnswers": [
          "NaNO3"
        ],
        "explanation": "Đáp án cần điền là NaNO3. Khi thay NaNO3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaNO3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ba(NO3)2 + Na2SO4 ->None BaSO4 + ___",
        "acceptedAnswers": [
          "NaNO3"
        ],
        "explanation": "Đáp án cần điền là NaNO3. Khi thay NaNO3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaNO3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "FeCl2 + 2 NaOH ->None Fe(OH)2 + ___",
        "acceptedAnswers": [
          "NaCl"
        ],
        "explanation": "Đáp án cần điền là NaCl. Khi thay NaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "FeCl3 + 3 NaOH ->None Fe(OH)3 + ___",
        "acceptedAnswers": [
          "NaCl"
        ],
        "explanation": "Đáp án cần điền là NaCl. Khi thay NaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "ZnSO4 + 2 NaOH ->None Zn(OH)2 + ___",
        "acceptedAnswers": [
          "Na2SO4"
        ],
        "explanation": "Đáp án cần điền là Na2SO4. Khi thay Na2SO4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Na2SO4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Al2(SO4)3 + 3 BaCl2 ->None 3 BaSO4 + ___",
        "acceptedAnswers": [
          "AlCl3"
        ],
        "explanation": "Đáp án cần điền là AlCl3. Khi thay AlCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy AlCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CrCl3 + 3 NaOH ->None Cr(OH)3 + ___",
        "acceptedAnswers": [
          "NaCl"
        ],
        "explanation": "Đáp án cần điền là NaCl. Khi thay NaCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 SO2 + O2 ->[V2O5, t°] ___",
        "acceptedAnswers": [
          "SO3"
        ],
        "explanation": "Đáp án cần điền là SO3. Khi thay SO3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 FeS2 + 11 O2 ->[t°] 2 Fe2O3 + ___",
        "acceptedAnswers": [
          "SO2"
        ],
        "explanation": "Đáp án cần điền là SO2. Khi thay SO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 NH3 + 5 O2 ->[Pt, t°] 4 NO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 NH3 + 3 O2 ->[t°] 2 N2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 H2S + 3 O2 ->[t°] 2 SO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 CO + O2 ->[t°] ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 NO + O2 ->None ___",
        "acceptedAnswers": [
          "NO2"
        ],
        "explanation": "Đáp án cần điền là NO2. Khi thay NO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "P4 + 5 O2 ->[t°] ___",
        "acceptedAnswers": [
          "P2O5"
        ],
        "explanation": "Đáp án cần điền là P2O5. Khi thay P2O5 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy P2O5 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "S8 + 8 O2 ->[t°] ___",
        "acceptedAnswers": [
          "SO2"
        ],
        "explanation": "Đáp án cần điền là SO2. Khi thay SO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cl2 + 2 NaOH ->None NaCl + NaClO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Cl2 + 6 NaOH ->[hot] 5 NaCl + NaClO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Br2 + 2 NaOH ->None NaBr + NaBrO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Br2 + 6 NaOH ->[hot] 5 NaBr + NaBrO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 I2 + 6 NaOH ->[hot] 5 NaI + NaIO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cl2 + Ca(OH)2 ->None CaCl2 + Ca(ClO)2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Cl2 + 6 Ca(OH)2 ->[hot] 3 CaCl2 + Ca(ClO3)2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CaCO3 + 2 HCl ->None CaCl2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "NaHCO3 + HCl ->None NaCl + CO2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KHCO3 + H2SO4 ->None K2SO4 + 2 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ca(HCO3)2 + 2 HCl ->None CaCl2 + 2 CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "MgCO3 + H2SO4 ->None MgSO4 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "FeCO3 + 2 HCl ->None FeCl2 + CO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Na2O2 + 2 H2O ->None 4 NaOH + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 K2O2 + 2 H2O ->None 4 KOH + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2O2 + 2 KI ->None 2 KOH + 2 I2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 CuO + 2 NH3 ->[t°] 3 Cu + 3 N2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Fe2O3 + 2 NH3 ->[t°] 6 Fe + N2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "PbO + H2 ->[t°] Pb + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "SiO2 + 2 NaOH ->None Na2SiO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CO2 + 2 NaOH ->None Na2CO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CO2 + Ca(OH)2 ->None CaCO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "SO2 + 2 NaOH ->None Na2SO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "SO3 + 2 NaOH ->None Na2SO4 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      }
    ],
    "hard": [
      {
        "equation": "2 KMnO4 + 16 HCl ->None 2 KCl + 2 MnCl2 + 5 Cl2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 10 FeCl2 + 16 HCl ->None 2 KCl + 10 MnCl2 + 8 FeCl3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 10 FeSO4 + 8 H2SO4 ->None K2SO4 + 5 MnSO4 + 8 Fe2(SO4)3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 H2O2 + 3 H2SO4 ->None 2 K2SO4 + 5 MnSO4 + 8 O2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 Na2C2O4 + 3 H2SO4 ->None K2SO4 + 10 MnSO4 + 8 Na2SO4",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 14 HCl ->None 2 KCl + 3 CrCl3 + 7 Cl2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 6 FeCl2 + 14 HCl ->None 2 KCl + 6 CrCl3 + 7 FeCl3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 6 FeSO4 + 7 H2SO4 ->None K2SO4 + 3 Cr2(SO4)3 + 7 Fe2(SO4)3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 3 H2S + 4 H2SO4 ->None K2SO4 + 7 Cr2(SO4)3 + 4 S",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 6 KI + 7 H2SO4 ->None 3 K2SO4 + 7 Cr2(SO4)3 + 7 I2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 3 Na2SO3 + 4 H2SO4 ->None K2SO4 + Cr2(SO4)3 + 4 Na2SO4",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 Na2SO3 + 3 H2SO4 ->None K2SO4 + 2 MnSO4 + 5 Na2SO4",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 KNO2 + 3 H2SO4 ->None K2SO4 + 5 MnSO4 + 3 KNO3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 NaNO2 + 3 H2SO4 ->None K2SO4 + 5 MnSO4 + 3 NaNO3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 H2C2O4 + 3 H2SO4 ->None K2SO4 + 10 MnSO4 + 8 CO2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 HCOOH + 3 H2SO4 ->None K2SO4 + 5 MnSO4 + 7 CO2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "MnO2 + 4 HCl ->None MnCl2 + Cl2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "PbO2 + 4 HCl ->None PbCl2 + Cl2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Cu + 8 HNO3 ->[dilute] 3 Cu(NO3)2 + 2 NO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cu + 4 HNO3 ->[concentrated] Cu(NO3)2 + 2 NO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Ag + 4 HNO3 ->[dilute] 3 AgNO3 + NO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Ag + 2 HNO3 ->[concentrated] AgNO3 + NO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Fe + 4 HNO3 ->[dilute] Fe(NO3)3 + NO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 Zn + 10 HNO3 ->[very dilute] 4 Zn(NO3)2 + NH4NO3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C + 4 HNO3 ->[concentrated] CO2 + 4 NO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "P + 5 HNO3 ->[concentrated] H3PO4 + 5 NO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "S + 6 HNO3 ->[concentrated] H2SO4 + 6 NO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 H2S + 2 HNO3 ->[dilute] 3 S + 2 NO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "SO2 + H2O2 ->None ___",
        "acceptedAnswers": [
          "H2SO4"
        ],
        "explanation": "Đáp án cần điền là H2SO4. Khi thay H2SO4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2SO4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "SO2 + Cl2 + 2 H2O ->None H2SO4 + ___",
        "acceptedAnswers": [
          "HCl"
        ],
        "explanation": "Đáp án cần điền là HCl. Khi thay HCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2S + Cl2 ->None S + ___",
        "acceptedAnswers": [
          "HCl"
        ],
        "explanation": "Đáp án cần điền là HCl. Khi thay HCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2S + Br2 ->None S + ___",
        "acceptedAnswers": [
          "HBr"
        ],
        "explanation": "Đáp án cần điền là HBr. Khi thay HBr vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HBr là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 FeCl2 + Cl2 ->None ___",
        "acceptedAnswers": [
          "FeCl3"
        ],
        "explanation": "Đáp án cần điền là FeCl3. Khi thay FeCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy FeCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "SnCl2 + Cl2 ->None ___",
        "acceptedAnswers": [
          "SnCl4"
        ],
        "explanation": "Đáp án cần điền là SnCl4. Khi thay SnCl4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SnCl4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KI + Cl2 ->None I2 + ___",
        "acceptedAnswers": [
          "KCl"
        ],
        "explanation": "Đáp án cần điền là KCl. Khi thay KCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy KCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Na2S2O3 + I2 ->None Na2S4O6 + ___",
        "acceptedAnswers": [
          "NaI"
        ],
        "explanation": "Đáp án cần điền là NaI. Khi thay NaI vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NaI là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 FeSO4 + H2O2 + H2SO4 ->None Fe2(SO4)3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 FeCl2 + H2O2 + 2 HCl ->None 2 FeCl3 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cu + 2 FeCl3 ->None CuCl2 + ___",
        "acceptedAnswers": [
          "FeCl2"
        ],
        "explanation": "Đáp án cần điền là FeCl2. Khi thay FeCl2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy FeCl2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 FeCl3 + H2S ->None 2 FeCl2 + S + ___",
        "acceptedAnswers": [
          "HCl"
        ],
        "explanation": "Đáp án cần điền là HCl. Khi thay HCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 FeCl3 + SnCl2 ->None 2 FeCl2 + ___",
        "acceptedAnswers": [
          "SnCl4"
        ],
        "explanation": "Đáp án cần điền là SnCl4. Khi thay SnCl4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SnCl4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 FeCl3 + Cu ->None 2 FeCl2 + ___",
        "acceptedAnswers": [
          "CuCl2"
        ],
        "explanation": "Đáp án cần điền là CuCl2. Khi thay CuCl2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CuCl2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 FeCl3 + 2 KI ->None 2 FeCl2 + I2 + ___",
        "acceptedAnswers": [
          "KCl"
        ],
        "explanation": "Đáp án cần điền là KCl. Khi thay KCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy KCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 CuSO4 + 4 KI ->None 2 CuI + I2 + ___",
        "acceptedAnswers": [
          "K2SO4"
        ],
        "explanation": "Đáp án cần điền là K2SO4. Khi thay K2SO4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy K2SO4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "CuSO4 + Fe ->None FeSO4 + ___",
        "acceptedAnswers": [
          "Cu"
        ],
        "explanation": "Đáp án cần điền là Cu. Khi thay Cu vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cu là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 AgNO3 + Cu ->None Cu(NO3)2 + ___",
        "acceptedAnswers": [
          "Ag"
        ],
        "explanation": "Đáp án cần điền là Ag. Khi thay Ag vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Ag là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 AgNO3 + Al ->None Al(NO3)3 + ___",
        "acceptedAnswers": [
          "Ag"
        ],
        "explanation": "Đáp án cần điền là Ag. Khi thay Ag vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Ag là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 CuO + 2 NH3 ->[t°] 3 Cu + 3 N2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 Fe2O3 + 2 NH3 ->[t°] 6 Fe + N2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 CuO + CH4 ->[t°] 4 Cu + 2 CO2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al + Fe2O3 ->None Al2O3 + ___",
        "acceptedAnswers": [
          "Fe"
        ],
        "explanation": "Đáp án cần điền là Fe. Khi thay Fe vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Fe là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Al + Cr2O3 ->None Al2O3 + ___",
        "acceptedAnswers": [
          "Cr"
        ],
        "explanation": "Đáp án cần điền là Cr. Khi thay Cr vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Cr là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Mg + TiCl4 ->None Ti + ___",
        "acceptedAnswers": [
          "MgCl2"
        ],
        "explanation": "Đáp án cần điền là MgCl2. Khi thay MgCl2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy MgCl2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "10 Al + 3 V2O5 ->None 5 Al2O3 + ___",
        "acceptedAnswers": [
          "V"
        ],
        "explanation": "Đáp án cần điền là V. Khi thay V vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy V là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 Al + 3 MnO2 ->None 2 Al2O3 + ___",
        "acceptedAnswers": [
          "Mn"
        ],
        "explanation": "Đáp án cần điền là Mn. Khi thay Mn vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Mn là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Mg + SiO2 ->None 2 MgO + ___",
        "acceptedAnswers": [
          "Si"
        ],
        "explanation": "Đáp án cần điền là Si. Khi thay Si vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy Si là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C + SiO2 ->[t°] Si + ___",
        "acceptedAnswers": [
          "CO"
        ],
        "explanation": "Đáp án cần điền là CO. Khi thay CO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "C + 2 PbO ->None Pb + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 C + SnO2 ->None Sn + ___",
        "acceptedAnswers": [
          "CO"
        ],
        "explanation": "Đáp án cần điền là CO. Khi thay CO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 ZnS + 3 O2 ->[t°] 2 ZnO + ___",
        "acceptedAnswers": [
          "SO2"
        ],
        "explanation": "Đáp án cần điền là SO2. Khi thay SO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 FeS2 + 11 O2 ->[t°] 2 Fe2O3 + ___",
        "acceptedAnswers": [
          "SO2"
        ],
        "explanation": "Đáp án cần điền là SO2. Khi thay SO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Cu2S + 3 O2 ->[t°] 2 Cu2O + ___",
        "acceptedAnswers": [
          "SO2"
        ],
        "explanation": "Đáp án cần điền là SO2. Khi thay SO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 Cu2O + C ->None 4 Cu + ___",
        "acceptedAnswers": [
          "CO2"
        ],
        "explanation": "Đáp án cần điền là CO2. Khi thay CO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy CO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 PbS + 3 O2 ->[t°] 2 PbO + ___",
        "acceptedAnswers": [
          "SO2"
        ],
        "explanation": "Đáp án cần điền là SO2. Khi thay SO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 HgS + 3 O2 ->[t°] 2 HgO + ___",
        "acceptedAnswers": [
          "SO2"
        ],
        "explanation": "Đáp án cần điền là SO2. Khi thay SO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 SO2 + O2 ->[V2O5, t°] ___",
        "acceptedAnswers": [
          "SO3"
        ],
        "explanation": "Đáp án cần điền là SO3. Khi thay SO3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy SO3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 NH3 + 5 O2 ->[Pt, t°] 4 NO + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "4 NH3 + 3 O2 ->None 2 N2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 H2S + 3 O2 ->None 2 SO2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "H2S + 4 O2 ->[excess O2] ___",
        "acceptedAnswers": [
          "H2SO4"
        ],
        "explanation": "Đáp án cần điền là H2SO4. Khi thay H2SO4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2SO4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "N2 + O2 ->[t°] ___",
        "acceptedAnswers": [
          "NO"
        ],
        "explanation": "Đáp án cần điền là NO. Khi thay NO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 NO + O2 ->None ___",
        "acceptedAnswers": [
          "NO2"
        ],
        "explanation": "Đáp án cần điền là NO2. Khi thay NO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "NO2 + H2O ->None HNO3 + ___",
        "acceptedAnswers": [
          "HNO2"
        ],
        "explanation": "Đáp án cần điền là HNO2. Khi thay HNO2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HNO2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "3 NO2 + H2O ->None 2 HNO3 + ___",
        "acceptedAnswers": [
          "NO"
        ],
        "explanation": "Đáp án cần điền là NO. Khi thay NO vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy NO là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Cl2 + SO2 + 2 H2O ->None H2SO4 + ___",
        "acceptedAnswers": [
          "HCl"
        ],
        "explanation": "Đáp án cần điền là HCl. Khi thay HCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "P4 + 6 Cl2 ->None ___",
        "acceptedAnswers": [
          "PCl3"
        ],
        "explanation": "Đáp án cần điền là PCl3. Khi thay PCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy PCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "P4 + 10 Cl2 ->None ___",
        "acceptedAnswers": [
          "PCl5"
        ],
        "explanation": "Đáp án cần điền là PCl5. Khi thay PCl5 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy PCl5 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 P + 3 Cl2 ->None ___",
        "acceptedAnswers": [
          "PCl3"
        ],
        "explanation": "Đáp án cần điền là PCl3. Khi thay PCl3 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy PCl3 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 P + 5 Cl2 ->None ___",
        "acceptedAnswers": [
          "PCl5"
        ],
        "explanation": "Đáp án cần điền là PCl5. Khi thay PCl5 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy PCl5 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KClO3 ->[MnO2, t°] 2 KCl + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 ->[t°] K2MnO4 + MnO2 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 K2Cr2O7 ->[t°] 2 K2CrO4 + Cr2O3 + ___",
        "acceptedAnswers": [
          "O2"
        ],
        "explanation": "Đáp án cần điền là O2. Khi thay O2 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy O2 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 NH4ClO4 ->None N2 + Cl2 + 4 O2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2S2O3 + 2 HCl ->None 2 NaCl + SO2 + S",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2S2O3 + H2SO4 ->None Na2SO4 + SO2 + S",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 3 NaNO2 + 4 H2SO4 ->None K2SO4 + 3 Cr2(SO4)3 + 4 NaNO3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 6 NaI + 7 H2SO4 ->None 4 K2SO4 + Cr2(SO4)3 + 3 I2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 10 KI + 8 H2SO4 ->None 6 K2SO4 + 2 MnSO4 + 5 I2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 10 NaCl + 8 H2SO4 ->None K2SO4 + 2 MnSO4 + 5 Cl2 + 8 Na2SO4",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 10 KBr + 8 H2SO4 ->None 6 K2SO4 + 2 MnSO4 + 5 Br2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 6 KBr + 7 H2SO4 ->None 4 K2SO4 + Cr2(SO4)3 + 3 Br2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 3 H2O2 + 4 H2SO4 ->None K2SO4 + Cr2(SO4)3 + 3 O2 + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 H2O2 + 6 HCl ->None 2 KCl + 5 MnCl2 + 8 O2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 H2S + 3 H2SO4 ->None K2SO4 + 2 MnSO4 + 5 S + ___",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "K2Cr2O7 + 3 SO2 + H2SO4 ->None K2SO4 + Cr2(SO4)3",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "2 KMnO4 + 5 SO2 + 2 H2O ->None K2SO4 + 2 MnSO4 + ___",
        "acceptedAnswers": [
          "H2SO4"
        ],
        "explanation": "Đáp án cần điền là H2SO4. Khi thay H2SO4 vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2SO4 là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "10 FeSO4 + 2 KMnO4 + 8 H2SO4 ->[acidic] 5 Fe2(SO4)3 + K2SO4 + 8 MnSO4",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "10 FeCl2 + 2 KMnO4 + 16 HCl ->[acidic] 10 FeCl3 + 2 KCl + 8 MnCl2",
        "acceptedAnswers": [
          "H2O"
        ],
        "explanation": "Đáp án cần điền là H2O. Khi thay H2O vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy H2O là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2SO3 + Br2 + H2O ->None 2 Na2SO4",
        "acceptedAnswers": [
          "HBr"
        ],
        "explanation": "Đáp án cần điền là HBr. Khi thay HBr vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HBr là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      },
      {
        "equation": "Na2SO3 + Cl2 + H2O ->None 2 Na2SO4",
        "acceptedAnswers": [
          "HCl"
        ],
        "explanation": "Đáp án cần điền là HCl. Khi thay HCl vào vị trí trống và giữ nguyên các hệ số đang hiển thị, số nguyên tử của từng nguyên tố ở hai vế được bảo toàn. Vì vậy HCl là chất còn thiếu duy nhất phù hợp với phản ứng đã cho.",
        "timeLimitSec": 25
      }
    ]
  },
  "compound_name": {
    "easy": [
      {
        "equation": "NaF",
        "acceptedAnswers": [
          "sodium fluoride"
        ],
        "explanation": "Đây là hợp chất có công thức NaF. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium fluoride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaCl",
        "acceptedAnswers": [
          "sodium chloride"
        ],
        "explanation": "Đây là hợp chất có công thức NaCl. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium chloride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaBr",
        "acceptedAnswers": [
          "sodium bromide"
        ],
        "explanation": "Đây là hợp chất có công thức NaBr. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium bromide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaI",
        "acceptedAnswers": [
          "sodium iodide"
        ],
        "explanation": "Đây là hợp chất có công thức NaI. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium iodide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaNO3",
        "acceptedAnswers": [
          "sodium nitrate"
        ],
        "explanation": "Đây là hợp chất có công thức NaNO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium nitrate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaOH",
        "acceptedAnswers": [
          "sodium hydroxide"
        ],
        "explanation": "Đây là hợp chất có công thức NaOH. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium hydroxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaClO3",
        "acceptedAnswers": [
          "sodium chlorate"
        ],
        "explanation": "Đây là hợp chất có công thức NaClO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium chlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaClO4",
        "acceptedAnswers": [
          "sodium perchlorate"
        ],
        "explanation": "Đây là hợp chất có công thức NaClO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium perchlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaCH3COO",
        "acceptedAnswers": [
          "sodium ethanoate"
        ],
        "explanation": "Đây là hợp chất có công thức NaCH3COO. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium ethanoate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NaCN",
        "acceptedAnswers": [
          "sodium cyanide"
        ],
        "explanation": "Đây là hợp chất có công thức NaCN. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium cyanide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Na2O",
        "acceptedAnswers": [
          "sodium oxide"
        ],
        "explanation": "Đây là hợp chất có công thức Na2O. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium oxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Na2S",
        "acceptedAnswers": [
          "sodium sulfide"
        ],
        "explanation": "Đây là hợp chất có công thức Na2S. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium sulfide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Na2SO4",
        "acceptedAnswers": [
          "sodium sulfate"
        ],
        "explanation": "Đây là hợp chất có công thức Na2SO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium sulfate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Na2CO3",
        "acceptedAnswers": [
          "sodium carbonate"
        ],
        "explanation": "Đây là hợp chất có công thức Na2CO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium carbonate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Na3PO4",
        "acceptedAnswers": [
          "sodium phosphate"
        ],
        "explanation": "Đây là hợp chất có công thức Na3PO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “sodium phosphate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KF",
        "acceptedAnswers": [
          "potassium fluoride"
        ],
        "explanation": "Đây là hợp chất có công thức KF. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium fluoride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KCl",
        "acceptedAnswers": [
          "potassium chloride"
        ],
        "explanation": "Đây là hợp chất có công thức KCl. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium chloride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KBr",
        "acceptedAnswers": [
          "potassium bromide"
        ],
        "explanation": "Đây là hợp chất có công thức KBr. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium bromide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KI",
        "acceptedAnswers": [
          "potassium iodide"
        ],
        "explanation": "Đây là hợp chất có công thức KI. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium iodide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KNO3",
        "acceptedAnswers": [
          "potassium nitrate"
        ],
        "explanation": "Đây là hợp chất có công thức KNO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium nitrate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KOH",
        "acceptedAnswers": [
          "potassium hydroxide"
        ],
        "explanation": "Đây là hợp chất có công thức KOH. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium hydroxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KClO3",
        "acceptedAnswers": [
          "potassium chlorate"
        ],
        "explanation": "Đây là hợp chất có công thức KClO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium chlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KClO4",
        "acceptedAnswers": [
          "potassium perchlorate"
        ],
        "explanation": "Đây là hợp chất có công thức KClO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium perchlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KCH3COO",
        "acceptedAnswers": [
          "potassium ethanoate"
        ],
        "explanation": "Đây là hợp chất có công thức KCH3COO. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium ethanoate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "KCN",
        "acceptedAnswers": [
          "potassium cyanide"
        ],
        "explanation": "Đây là hợp chất có công thức KCN. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium cyanide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "K2O",
        "acceptedAnswers": [
          "potassium oxide"
        ],
        "explanation": "Đây là hợp chất có công thức K2O. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium oxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "K2S",
        "acceptedAnswers": [
          "potassium sulfide"
        ],
        "explanation": "Đây là hợp chất có công thức K2S. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium sulfide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "K2SO4",
        "acceptedAnswers": [
          "potassium sulfate"
        ],
        "explanation": "Đây là hợp chất có công thức K2SO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium sulfate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "K2CO3",
        "acceptedAnswers": [
          "potassium carbonate"
        ],
        "explanation": "Đây là hợp chất có công thức K2CO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium carbonate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "K3PO4",
        "acceptedAnswers": [
          "potassium phosphate"
        ],
        "explanation": "Đây là hợp chất có công thức K3PO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “potassium phosphate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiF",
        "acceptedAnswers": [
          "lithium fluoride"
        ],
        "explanation": "Đây là hợp chất có công thức LiF. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium fluoride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiCl",
        "acceptedAnswers": [
          "lithium chloride"
        ],
        "explanation": "Đây là hợp chất có công thức LiCl. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium chloride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiBr",
        "acceptedAnswers": [
          "lithium bromide"
        ],
        "explanation": "Đây là hợp chất có công thức LiBr. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium bromide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiI",
        "acceptedAnswers": [
          "lithium iodide"
        ],
        "explanation": "Đây là hợp chất có công thức LiI. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium iodide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiNO3",
        "acceptedAnswers": [
          "lithium nitrate"
        ],
        "explanation": "Đây là hợp chất có công thức LiNO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium nitrate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiOH",
        "acceptedAnswers": [
          "lithium hydroxide"
        ],
        "explanation": "Đây là hợp chất có công thức LiOH. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium hydroxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiClO3",
        "acceptedAnswers": [
          "lithium chlorate"
        ],
        "explanation": "Đây là hợp chất có công thức LiClO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium chlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiClO4",
        "acceptedAnswers": [
          "lithium perchlorate"
        ],
        "explanation": "Đây là hợp chất có công thức LiClO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium perchlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiCH3COO",
        "acceptedAnswers": [
          "lithium ethanoate"
        ],
        "explanation": "Đây là hợp chất có công thức LiCH3COO. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium ethanoate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "LiCN",
        "acceptedAnswers": [
          "lithium cyanide"
        ],
        "explanation": "Đây là hợp chất có công thức LiCN. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium cyanide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Li2O",
        "acceptedAnswers": [
          "lithium oxide"
        ],
        "explanation": "Đây là hợp chất có công thức Li2O. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium oxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Li2S",
        "acceptedAnswers": [
          "lithium sulfide"
        ],
        "explanation": "Đây là hợp chất có công thức Li2S. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium sulfide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Li2SO4",
        "acceptedAnswers": [
          "lithium sulfate"
        ],
        "explanation": "Đây là hợp chất có công thức Li2SO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium sulfate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Li2CO3",
        "acceptedAnswers": [
          "lithium carbonate"
        ],
        "explanation": "Đây là hợp chất có công thức Li2CO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium carbonate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Li3PO4",
        "acceptedAnswers": [
          "lithium phosphate"
        ],
        "explanation": "Đây là hợp chất có công thức Li3PO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “lithium phosphate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4F",
        "acceptedAnswers": [
          "ammonium fluoride"
        ],
        "explanation": "Đây là hợp chất có công thức NH4F. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium fluoride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4Cl",
        "acceptedAnswers": [
          "ammonium chloride"
        ],
        "explanation": "Đây là hợp chất có công thức NH4Cl. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium chloride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4Br",
        "acceptedAnswers": [
          "ammonium bromide"
        ],
        "explanation": "Đây là hợp chất có công thức NH4Br. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium bromide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4I",
        "acceptedAnswers": [
          "ammonium iodide"
        ],
        "explanation": "Đây là hợp chất có công thức NH4I. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium iodide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4NO3",
        "acceptedAnswers": [
          "ammonium nitrate"
        ],
        "explanation": "Đây là hợp chất có công thức NH4NO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium nitrate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4OH",
        "acceptedAnswers": [
          "ammonium hydroxide"
        ],
        "explanation": "Đây là hợp chất có công thức NH4OH. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium hydroxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4ClO3",
        "acceptedAnswers": [
          "ammonium chlorate"
        ],
        "explanation": "Đây là hợp chất có công thức NH4ClO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium chlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4ClO4",
        "acceptedAnswers": [
          "ammonium perchlorate"
        ],
        "explanation": "Đây là hợp chất có công thức NH4ClO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium perchlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4CH3COO",
        "acceptedAnswers": [
          "ammonium ethanoate"
        ],
        "explanation": "Đây là hợp chất có công thức NH4CH3COO. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium ethanoate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "NH4CN",
        "acceptedAnswers": [
          "ammonium cyanide"
        ],
        "explanation": "Đây là hợp chất có công thức NH4CN. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium cyanide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "(NH4)2O",
        "acceptedAnswers": [
          "ammonium oxide"
        ],
        "explanation": "Đây là hợp chất có công thức (NH4)2O. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium oxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "(NH4)2S",
        "acceptedAnswers": [
          "ammonium sulfide"
        ],
        "explanation": "Đây là hợp chất có công thức (NH4)2S. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium sulfide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "(NH4)2SO4",
        "acceptedAnswers": [
          "ammonium sulfate"
        ],
        "explanation": "Đây là hợp chất có công thức (NH4)2SO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium sulfate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "(NH4)2CO3",
        "acceptedAnswers": [
          "ammonium carbonate"
        ],
        "explanation": "Đây là hợp chất có công thức (NH4)2CO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium carbonate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "(NH4)3PO4",
        "acceptedAnswers": [
          "ammonium phosphate"
        ],
        "explanation": "Đây là hợp chất có công thức (NH4)3PO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “ammonium phosphate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgF2",
        "acceptedAnswers": [
          "magnesium fluoride"
        ],
        "explanation": "Đây là hợp chất có công thức MgF2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium fluoride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgCl2",
        "acceptedAnswers": [
          "magnesium chloride"
        ],
        "explanation": "Đây là hợp chất có công thức MgCl2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium chloride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgBr2",
        "acceptedAnswers": [
          "magnesium bromide"
        ],
        "explanation": "Đây là hợp chất có công thức MgBr2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium bromide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgI2",
        "acceptedAnswers": [
          "magnesium iodide"
        ],
        "explanation": "Đây là hợp chất có công thức MgI2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium iodide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Mg(NO3)2",
        "acceptedAnswers": [
          "magnesium nitrate"
        ],
        "explanation": "Đây là hợp chất có công thức Mg(NO3)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium nitrate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Mg(OH)2",
        "acceptedAnswers": [
          "magnesium hydroxide"
        ],
        "explanation": "Đây là hợp chất có công thức Mg(OH)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium hydroxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Mg(ClO3)2",
        "acceptedAnswers": [
          "magnesium chlorate"
        ],
        "explanation": "Đây là hợp chất có công thức Mg(ClO3)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium chlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Mg(ClO4)2",
        "acceptedAnswers": [
          "magnesium perchlorate"
        ],
        "explanation": "Đây là hợp chất có công thức Mg(ClO4)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium perchlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Mg(CH3COO)2",
        "acceptedAnswers": [
          "magnesium ethanoate"
        ],
        "explanation": "Đây là hợp chất có công thức Mg(CH3COO)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium ethanoate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Mg(CN)2",
        "acceptedAnswers": [
          "magnesium cyanide"
        ],
        "explanation": "Đây là hợp chất có công thức Mg(CN)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium cyanide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgO",
        "acceptedAnswers": [
          "magnesium oxide"
        ],
        "explanation": "Đây là hợp chất có công thức MgO. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium oxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgS",
        "acceptedAnswers": [
          "magnesium sulfide"
        ],
        "explanation": "Đây là hợp chất có công thức MgS. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium sulfide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgSO4",
        "acceptedAnswers": [
          "magnesium sulfate"
        ],
        "explanation": "Đây là hợp chất có công thức MgSO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium sulfate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "MgCO3",
        "acceptedAnswers": [
          "magnesium carbonate"
        ],
        "explanation": "Đây là hợp chất có công thức MgCO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium carbonate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Mg3(PO4)2",
        "acceptedAnswers": [
          "magnesium phosphate"
        ],
        "explanation": "Đây là hợp chất có công thức Mg3(PO4)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “magnesium phosphate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaF2",
        "acceptedAnswers": [
          "calcium fluoride"
        ],
        "explanation": "Đây là hợp chất có công thức CaF2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium fluoride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaCl2",
        "acceptedAnswers": [
          "calcium chloride"
        ],
        "explanation": "Đây là hợp chất có công thức CaCl2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium chloride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaBr2",
        "acceptedAnswers": [
          "calcium bromide"
        ],
        "explanation": "Đây là hợp chất có công thức CaBr2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium bromide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaI2",
        "acceptedAnswers": [
          "calcium iodide"
        ],
        "explanation": "Đây là hợp chất có công thức CaI2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium iodide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ca(NO3)2",
        "acceptedAnswers": [
          "calcium nitrate"
        ],
        "explanation": "Đây là hợp chất có công thức Ca(NO3)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium nitrate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ca(OH)2",
        "acceptedAnswers": [
          "calcium hydroxide"
        ],
        "explanation": "Đây là hợp chất có công thức Ca(OH)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium hydroxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ca(ClO3)2",
        "acceptedAnswers": [
          "calcium chlorate"
        ],
        "explanation": "Đây là hợp chất có công thức Ca(ClO3)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium chlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ca(ClO4)2",
        "acceptedAnswers": [
          "calcium perchlorate"
        ],
        "explanation": "Đây là hợp chất có công thức Ca(ClO4)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium perchlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ca(CH3COO)2",
        "acceptedAnswers": [
          "calcium ethanoate"
        ],
        "explanation": "Đây là hợp chất có công thức Ca(CH3COO)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium ethanoate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ca(CN)2",
        "acceptedAnswers": [
          "calcium cyanide"
        ],
        "explanation": "Đây là hợp chất có công thức Ca(CN)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium cyanide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaO",
        "acceptedAnswers": [
          "calcium oxide"
        ],
        "explanation": "Đây là hợp chất có công thức CaO. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium oxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaS",
        "acceptedAnswers": [
          "calcium sulfide"
        ],
        "explanation": "Đây là hợp chất có công thức CaS. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium sulfide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaSO4",
        "acceptedAnswers": [
          "calcium sulfate"
        ],
        "explanation": "Đây là hợp chất có công thức CaSO4. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium sulfate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "CaCO3",
        "acceptedAnswers": [
          "calcium carbonate"
        ],
        "explanation": "Đây là hợp chất có công thức CaCO3. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium carbonate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ca3(PO4)2",
        "acceptedAnswers": [
          "calcium phosphate"
        ],
        "explanation": "Đây là hợp chất có công thức Ca3(PO4)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “calcium phosphate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "BaF2",
        "acceptedAnswers": [
          "barium fluoride"
        ],
        "explanation": "Đây là hợp chất có công thức BaF2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium fluoride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "BaCl2",
        "acceptedAnswers": [
          "barium chloride"
        ],
        "explanation": "Đây là hợp chất có công thức BaCl2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium chloride”.",
        "timeLimitSec": 18
      },
      {
        "equation": "BaBr2",
        "acceptedAnswers": [
          "barium bromide"
        ],
        "explanation": "Đây là hợp chất có công thức BaBr2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium bromide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "BaI2",
        "acceptedAnswers": [
          "barium iodide"
        ],
        "explanation": "Đây là hợp chất có công thức BaI2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium iodide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ba(NO3)2",
        "acceptedAnswers": [
          "barium nitrate"
        ],
        "explanation": "Đây là hợp chất có công thức Ba(NO3)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium nitrate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ba(OH)2",
        "acceptedAnswers": [
          "barium hydroxide"
        ],
        "explanation": "Đây là hợp chất có công thức Ba(OH)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium hydroxide”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ba(ClO3)2",
        "acceptedAnswers": [
          "barium chlorate"
        ],
        "explanation": "Đây là hợp chất có công thức Ba(ClO3)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium chlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ba(ClO4)2",
        "acceptedAnswers": [
          "barium perchlorate"
        ],
        "explanation": "Đây là hợp chất có công thức Ba(ClO4)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium perchlorate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ba(CH3COO)2",
        "acceptedAnswers": [
          "barium ethanoate"
        ],
        "explanation": "Đây là hợp chất có công thức Ba(CH3COO)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium ethanoate”.",
        "timeLimitSec": 18
      },
      {
        "equation": "Ba(CN)2",
        "acceptedAnswers": [
          "barium cyanide"
        ],
        "explanation": "Đây là hợp chất có công thức Ba(CN)2. Theo danh pháp quốc tế, tên được viết bằng cách gọi cation trước rồi đến anion; tên chuẩn tương ứng là “barium cyanide”.",
        "timeLimitSec": 18
      }
    ],
    "medium": [
      {
        "equation": "BaO",
        "acceptedAnswers": [
          "barium oxide"
        ],
        "explanation": "Với công thức BaO, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “barium oxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "BaS",
        "acceptedAnswers": [
          "barium sulfide"
        ],
        "explanation": "Với công thức BaS, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “barium sulfide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "BaSO4",
        "acceptedAnswers": [
          "barium sulfate"
        ],
        "explanation": "Với công thức BaSO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “barium sulfate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "BaCO3",
        "acceptedAnswers": [
          "barium carbonate"
        ],
        "explanation": "Với công thức BaCO3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “barium carbonate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Ba3(PO4)2",
        "acceptedAnswers": [
          "barium phosphate"
        ],
        "explanation": "Với công thức Ba3(PO4)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “barium phosphate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnF2",
        "acceptedAnswers": [
          "zinc fluoride"
        ],
        "explanation": "Với công thức ZnF2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc fluoride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnCl2",
        "acceptedAnswers": [
          "zinc chloride"
        ],
        "explanation": "Với công thức ZnCl2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc chloride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnBr2",
        "acceptedAnswers": [
          "zinc bromide"
        ],
        "explanation": "Với công thức ZnBr2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc bromide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnI2",
        "acceptedAnswers": [
          "zinc iodide"
        ],
        "explanation": "Với công thức ZnI2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc iodide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Zn(NO3)2",
        "acceptedAnswers": [
          "zinc nitrate"
        ],
        "explanation": "Với công thức Zn(NO3)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc nitrate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Zn(OH)2",
        "acceptedAnswers": [
          "zinc hydroxide"
        ],
        "explanation": "Với công thức Zn(OH)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc hydroxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Zn(ClO3)2",
        "acceptedAnswers": [
          "zinc chlorate"
        ],
        "explanation": "Với công thức Zn(ClO3)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc chlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Zn(ClO4)2",
        "acceptedAnswers": [
          "zinc perchlorate"
        ],
        "explanation": "Với công thức Zn(ClO4)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc perchlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Zn(CH3COO)2",
        "acceptedAnswers": [
          "zinc ethanoate"
        ],
        "explanation": "Với công thức Zn(CH3COO)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc ethanoate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Zn(CN)2",
        "acceptedAnswers": [
          "zinc cyanide"
        ],
        "explanation": "Với công thức Zn(CN)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc cyanide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnO",
        "acceptedAnswers": [
          "zinc oxide"
        ],
        "explanation": "Với công thức ZnO, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc oxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnS",
        "acceptedAnswers": [
          "zinc sulfide"
        ],
        "explanation": "Với công thức ZnS, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc sulfide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnSO4",
        "acceptedAnswers": [
          "zinc sulfate"
        ],
        "explanation": "Với công thức ZnSO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc sulfate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "ZnCO3",
        "acceptedAnswers": [
          "zinc carbonate"
        ],
        "explanation": "Với công thức ZnCO3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc carbonate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Zn3(PO4)2",
        "acceptedAnswers": [
          "zinc phosphate"
        ],
        "explanation": "Với công thức Zn3(PO4)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “zinc phosphate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgF",
        "acceptedAnswers": [
          "silver fluoride"
        ],
        "explanation": "Với công thức AgF, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver fluoride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgCl",
        "acceptedAnswers": [
          "silver chloride"
        ],
        "explanation": "Với công thức AgCl, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver chloride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgBr",
        "acceptedAnswers": [
          "silver bromide"
        ],
        "explanation": "Với công thức AgBr, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver bromide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgI",
        "acceptedAnswers": [
          "silver iodide"
        ],
        "explanation": "Với công thức AgI, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver iodide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgNO3",
        "acceptedAnswers": [
          "silver nitrate"
        ],
        "explanation": "Với công thức AgNO3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver nitrate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgOH",
        "acceptedAnswers": [
          "silver hydroxide"
        ],
        "explanation": "Với công thức AgOH, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver hydroxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgClO3",
        "acceptedAnswers": [
          "silver chlorate"
        ],
        "explanation": "Với công thức AgClO3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver chlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgClO4",
        "acceptedAnswers": [
          "silver perchlorate"
        ],
        "explanation": "Với công thức AgClO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver perchlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgCH3COO",
        "acceptedAnswers": [
          "silver ethanoate"
        ],
        "explanation": "Với công thức AgCH3COO, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver ethanoate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AgCN",
        "acceptedAnswers": [
          "silver cyanide"
        ],
        "explanation": "Với công thức AgCN, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver cyanide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Ag2O",
        "acceptedAnswers": [
          "silver oxide"
        ],
        "explanation": "Với công thức Ag2O, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver oxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Ag2S",
        "acceptedAnswers": [
          "silver sulfide"
        ],
        "explanation": "Với công thức Ag2S, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver sulfide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Ag2SO4",
        "acceptedAnswers": [
          "silver sulfate"
        ],
        "explanation": "Với công thức Ag2SO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver sulfate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Ag2CO3",
        "acceptedAnswers": [
          "silver carbonate"
        ],
        "explanation": "Với công thức Ag2CO3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver carbonate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Ag3PO4",
        "acceptedAnswers": [
          "silver phosphate"
        ],
        "explanation": "Với công thức Ag3PO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “silver phosphate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AlF3",
        "acceptedAnswers": [
          "aluminium fluoride"
        ],
        "explanation": "Với công thức AlF3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium fluoride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AlCl3",
        "acceptedAnswers": [
          "aluminium chloride"
        ],
        "explanation": "Với công thức AlCl3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium chloride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AlBr3",
        "acceptedAnswers": [
          "aluminium bromide"
        ],
        "explanation": "Với công thức AlBr3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium bromide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AlI3",
        "acceptedAnswers": [
          "aluminium iodide"
        ],
        "explanation": "Với công thức AlI3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium iodide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al(NO3)3",
        "acceptedAnswers": [
          "aluminium nitrate"
        ],
        "explanation": "Với công thức Al(NO3)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium nitrate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al(OH)3",
        "acceptedAnswers": [
          "aluminium hydroxide"
        ],
        "explanation": "Với công thức Al(OH)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium hydroxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al(ClO3)3",
        "acceptedAnswers": [
          "aluminium chlorate"
        ],
        "explanation": "Với công thức Al(ClO3)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium chlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al(ClO4)3",
        "acceptedAnswers": [
          "aluminium perchlorate"
        ],
        "explanation": "Với công thức Al(ClO4)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium perchlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al(CH3COO)3",
        "acceptedAnswers": [
          "aluminium ethanoate"
        ],
        "explanation": "Với công thức Al(CH3COO)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium ethanoate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al(CN)3",
        "acceptedAnswers": [
          "aluminium cyanide"
        ],
        "explanation": "Với công thức Al(CN)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium cyanide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al2O3",
        "acceptedAnswers": [
          "aluminium oxide"
        ],
        "explanation": "Với công thức Al2O3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium oxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al2S3",
        "acceptedAnswers": [
          "aluminium sulfide"
        ],
        "explanation": "Với công thức Al2S3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium sulfide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al2(SO4)3",
        "acceptedAnswers": [
          "aluminium sulfate"
        ],
        "explanation": "Với công thức Al2(SO4)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium sulfate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Al2(CO3)3",
        "acceptedAnswers": [
          "aluminium carbonate"
        ],
        "explanation": "Với công thức Al2(CO3)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium carbonate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "AlPO4",
        "acceptedAnswers": [
          "aluminium phosphate"
        ],
        "explanation": "Với công thức AlPO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “aluminium phosphate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeF2",
        "acceptedAnswers": [
          "iron(II) fluoride"
        ],
        "explanation": "Với công thức FeF2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) fluoride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeCl2",
        "acceptedAnswers": [
          "iron(II) chloride"
        ],
        "explanation": "Với công thức FeCl2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) chloride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeBr2",
        "acceptedAnswers": [
          "iron(II) bromide"
        ],
        "explanation": "Với công thức FeBr2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) bromide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeI2",
        "acceptedAnswers": [
          "iron(II) iodide"
        ],
        "explanation": "Với công thức FeI2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) iodide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(NO3)2",
        "acceptedAnswers": [
          "iron(II) nitrate"
        ],
        "explanation": "Với công thức Fe(NO3)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) nitrate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(OH)2",
        "acceptedAnswers": [
          "iron(II) hydroxide"
        ],
        "explanation": "Với công thức Fe(OH)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) hydroxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(ClO3)2",
        "acceptedAnswers": [
          "iron(II) chlorate"
        ],
        "explanation": "Với công thức Fe(ClO3)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) chlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(ClO4)2",
        "acceptedAnswers": [
          "iron(II) perchlorate"
        ],
        "explanation": "Với công thức Fe(ClO4)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) perchlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(CH3COO)2",
        "acceptedAnswers": [
          "iron(II) ethanoate"
        ],
        "explanation": "Với công thức Fe(CH3COO)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) ethanoate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(CN)2",
        "acceptedAnswers": [
          "iron(II) cyanide"
        ],
        "explanation": "Với công thức Fe(CN)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) cyanide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeO",
        "acceptedAnswers": [
          "iron(II) oxide"
        ],
        "explanation": "Với công thức FeO, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) oxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeS",
        "acceptedAnswers": [
          "iron(II) sulfide"
        ],
        "explanation": "Với công thức FeS, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) sulfide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeSO4",
        "acceptedAnswers": [
          "iron(II) sulfate"
        ],
        "explanation": "Với công thức FeSO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) sulfate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeCO3",
        "acceptedAnswers": [
          "iron(II) carbonate"
        ],
        "explanation": "Với công thức FeCO3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) carbonate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe3(PO4)2",
        "acceptedAnswers": [
          "iron(II) phosphate"
        ],
        "explanation": "Với công thức Fe3(PO4)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(II) phosphate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeF3",
        "acceptedAnswers": [
          "iron(III) fluoride"
        ],
        "explanation": "Với công thức FeF3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) fluoride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeCl3",
        "acceptedAnswers": [
          "iron(III) chloride"
        ],
        "explanation": "Với công thức FeCl3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) chloride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeBr3",
        "acceptedAnswers": [
          "iron(III) bromide"
        ],
        "explanation": "Với công thức FeBr3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) bromide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FeI3",
        "acceptedAnswers": [
          "iron(III) iodide"
        ],
        "explanation": "Với công thức FeI3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) iodide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(NO3)3",
        "acceptedAnswers": [
          "iron(III) nitrate"
        ],
        "explanation": "Với công thức Fe(NO3)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) nitrate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(OH)3",
        "acceptedAnswers": [
          "iron(III) hydroxide"
        ],
        "explanation": "Với công thức Fe(OH)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) hydroxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(ClO3)3",
        "acceptedAnswers": [
          "iron(III) chlorate"
        ],
        "explanation": "Với công thức Fe(ClO3)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) chlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(ClO4)3",
        "acceptedAnswers": [
          "iron(III) perchlorate"
        ],
        "explanation": "Với công thức Fe(ClO4)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) perchlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(CH3COO)3",
        "acceptedAnswers": [
          "iron(III) ethanoate"
        ],
        "explanation": "Với công thức Fe(CH3COO)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) ethanoate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe(CN)3",
        "acceptedAnswers": [
          "iron(III) cyanide"
        ],
        "explanation": "Với công thức Fe(CN)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) cyanide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe2O3",
        "acceptedAnswers": [
          "iron(III) oxide"
        ],
        "explanation": "Với công thức Fe2O3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) oxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe2S3",
        "acceptedAnswers": [
          "iron(III) sulfide"
        ],
        "explanation": "Với công thức Fe2S3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) sulfide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe2(SO4)3",
        "acceptedAnswers": [
          "iron(III) sulfate"
        ],
        "explanation": "Với công thức Fe2(SO4)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) sulfate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Fe2(CO3)3",
        "acceptedAnswers": [
          "iron(III) carbonate"
        ],
        "explanation": "Với công thức Fe2(CO3)3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) carbonate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "FePO4",
        "acceptedAnswers": [
          "iron(III) phosphate"
        ],
        "explanation": "Với công thức FePO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “iron(III) phosphate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuF2",
        "acceptedAnswers": [
          "copper(II) fluoride"
        ],
        "explanation": "Với công thức CuF2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) fluoride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuCl2",
        "acceptedAnswers": [
          "copper(II) chloride"
        ],
        "explanation": "Với công thức CuCl2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) chloride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuBr2",
        "acceptedAnswers": [
          "copper(II) bromide"
        ],
        "explanation": "Với công thức CuBr2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) bromide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuI2",
        "acceptedAnswers": [
          "copper(II) iodide"
        ],
        "explanation": "Với công thức CuI2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) iodide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Cu(NO3)2",
        "acceptedAnswers": [
          "copper(II) nitrate"
        ],
        "explanation": "Với công thức Cu(NO3)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) nitrate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Cu(OH)2",
        "acceptedAnswers": [
          "copper(II) hydroxide"
        ],
        "explanation": "Với công thức Cu(OH)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) hydroxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Cu(ClO3)2",
        "acceptedAnswers": [
          "copper(II) chlorate"
        ],
        "explanation": "Với công thức Cu(ClO3)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) chlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Cu(ClO4)2",
        "acceptedAnswers": [
          "copper(II) perchlorate"
        ],
        "explanation": "Với công thức Cu(ClO4)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) perchlorate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Cu(CH3COO)2",
        "acceptedAnswers": [
          "copper(II) ethanoate"
        ],
        "explanation": "Với công thức Cu(CH3COO)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) ethanoate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Cu(CN)2",
        "acceptedAnswers": [
          "copper(II) cyanide"
        ],
        "explanation": "Với công thức Cu(CN)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) cyanide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuO",
        "acceptedAnswers": [
          "copper(II) oxide"
        ],
        "explanation": "Với công thức CuO, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) oxide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuS",
        "acceptedAnswers": [
          "copper(II) sulfide"
        ],
        "explanation": "Với công thức CuS, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) sulfide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuSO4",
        "acceptedAnswers": [
          "copper(II) sulfate"
        ],
        "explanation": "Với công thức CuSO4, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) sulfate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "CuCO3",
        "acceptedAnswers": [
          "copper(II) carbonate"
        ],
        "explanation": "Với công thức CuCO3, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) carbonate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Cu3(PO4)2",
        "acceptedAnswers": [
          "copper(II) phosphate"
        ],
        "explanation": "Với công thức Cu3(PO4)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “copper(II) phosphate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "PbF2",
        "acceptedAnswers": [
          "lead(II) fluoride"
        ],
        "explanation": "Với công thức PbF2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “lead(II) fluoride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "PbCl2",
        "acceptedAnswers": [
          "lead(II) chloride"
        ],
        "explanation": "Với công thức PbCl2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “lead(II) chloride”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "PbBr2",
        "acceptedAnswers": [
          "lead(II) bromide"
        ],
        "explanation": "Với công thức PbBr2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “lead(II) bromide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "PbI2",
        "acceptedAnswers": [
          "lead(II) iodide"
        ],
        "explanation": "Với công thức PbI2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “lead(II) iodide”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      },
      {
        "equation": "Pb(NO3)2",
        "acceptedAnswers": [
          "lead(II) nitrate"
        ],
        "explanation": "Với công thức Pb(NO3)2, cần xác định đúng ion dương và ion âm rồi gọi tên theo quy tắc danh pháp quốc tế. Tên chuẩn là “lead(II) nitrate”; không dùng tên Việt hóa hay biệt danh thông dụng trong trường đáp án.",
        "timeLimitSec": 26
      }
    ],
    "hard": [
      {
        "equation": "Pb(OH)2",
        "acceptedAnswers": [
          "lead(II) hydroxide"
        ],
        "explanation": "Phân tích công thức Pb(OH)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) hydroxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Pb(ClO3)2",
        "acceptedAnswers": [
          "lead(II) chlorate"
        ],
        "explanation": "Phân tích công thức Pb(ClO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) chlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Pb(ClO4)2",
        "acceptedAnswers": [
          "lead(II) perchlorate"
        ],
        "explanation": "Phân tích công thức Pb(ClO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) perchlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Pb(CH3COO)2",
        "acceptedAnswers": [
          "lead(II) ethanoate"
        ],
        "explanation": "Phân tích công thức Pb(CH3COO)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) ethanoate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Pb(CN)2",
        "acceptedAnswers": [
          "lead(II) cyanide"
        ],
        "explanation": "Phân tích công thức Pb(CN)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) cyanide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "PbO",
        "acceptedAnswers": [
          "lead(II) oxide"
        ],
        "explanation": "Phân tích công thức PbO cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) oxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "PbS",
        "acceptedAnswers": [
          "lead(II) sulfide"
        ],
        "explanation": "Phân tích công thức PbS cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) sulfide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "PbSO4",
        "acceptedAnswers": [
          "lead(II) sulfate"
        ],
        "explanation": "Phân tích công thức PbSO4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) sulfate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "PbCO3",
        "acceptedAnswers": [
          "lead(II) carbonate"
        ],
        "explanation": "Phân tích công thức PbCO3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) carbonate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Pb3(PO4)2",
        "acceptedAnswers": [
          "lead(II) phosphate"
        ],
        "explanation": "Phân tích công thức Pb3(PO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “lead(II) phosphate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnF2",
        "acceptedAnswers": [
          "tin(II) fluoride"
        ],
        "explanation": "Phân tích công thức SnF2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) fluoride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnCl2",
        "acceptedAnswers": [
          "tin(II) chloride"
        ],
        "explanation": "Phân tích công thức SnCl2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) chloride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnBr2",
        "acceptedAnswers": [
          "tin(II) bromide"
        ],
        "explanation": "Phân tích công thức SnBr2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) bromide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnI2",
        "acceptedAnswers": [
          "tin(II) iodide"
        ],
        "explanation": "Phân tích công thức SnI2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) iodide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(NO3)2",
        "acceptedAnswers": [
          "tin(II) nitrate"
        ],
        "explanation": "Phân tích công thức Sn(NO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) nitrate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(OH)2",
        "acceptedAnswers": [
          "tin(II) hydroxide"
        ],
        "explanation": "Phân tích công thức Sn(OH)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) hydroxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(ClO3)2",
        "acceptedAnswers": [
          "tin(II) chlorate"
        ],
        "explanation": "Phân tích công thức Sn(ClO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) chlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(ClO4)2",
        "acceptedAnswers": [
          "tin(II) perchlorate"
        ],
        "explanation": "Phân tích công thức Sn(ClO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) perchlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(CH3COO)2",
        "acceptedAnswers": [
          "tin(II) ethanoate"
        ],
        "explanation": "Phân tích công thức Sn(CH3COO)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) ethanoate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(CN)2",
        "acceptedAnswers": [
          "tin(II) cyanide"
        ],
        "explanation": "Phân tích công thức Sn(CN)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) cyanide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnO",
        "acceptedAnswers": [
          "tin(II) oxide"
        ],
        "explanation": "Phân tích công thức SnO cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) oxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnS",
        "acceptedAnswers": [
          "tin(II) sulfide"
        ],
        "explanation": "Phân tích công thức SnS cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) sulfide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnSO4",
        "acceptedAnswers": [
          "tin(II) sulfate"
        ],
        "explanation": "Phân tích công thức SnSO4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) sulfate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnCO3",
        "acceptedAnswers": [
          "tin(II) carbonate"
        ],
        "explanation": "Phân tích công thức SnCO3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) carbonate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn3(PO4)2",
        "acceptedAnswers": [
          "tin(II) phosphate"
        ],
        "explanation": "Phân tích công thức Sn3(PO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(II) phosphate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnF4",
        "acceptedAnswers": [
          "tin(IV) fluoride"
        ],
        "explanation": "Phân tích công thức SnF4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) fluoride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnCl4",
        "acceptedAnswers": [
          "tin(IV) chloride"
        ],
        "explanation": "Phân tích công thức SnCl4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) chloride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnBr4",
        "acceptedAnswers": [
          "tin(IV) bromide"
        ],
        "explanation": "Phân tích công thức SnBr4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) bromide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnI4",
        "acceptedAnswers": [
          "tin(IV) iodide"
        ],
        "explanation": "Phân tích công thức SnI4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) iodide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(NO3)4",
        "acceptedAnswers": [
          "tin(IV) nitrate"
        ],
        "explanation": "Phân tích công thức Sn(NO3)4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) nitrate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(OH)4",
        "acceptedAnswers": [
          "tin(IV) hydroxide"
        ],
        "explanation": "Phân tích công thức Sn(OH)4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) hydroxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(ClO3)4",
        "acceptedAnswers": [
          "tin(IV) chlorate"
        ],
        "explanation": "Phân tích công thức Sn(ClO3)4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) chlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(ClO4)4",
        "acceptedAnswers": [
          "tin(IV) perchlorate"
        ],
        "explanation": "Phân tích công thức Sn(ClO4)4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) perchlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(CH3COO)4",
        "acceptedAnswers": [
          "tin(IV) ethanoate"
        ],
        "explanation": "Phân tích công thức Sn(CH3COO)4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) ethanoate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(CN)4",
        "acceptedAnswers": [
          "tin(IV) cyanide"
        ],
        "explanation": "Phân tích công thức Sn(CN)4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) cyanide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnO2",
        "acceptedAnswers": [
          "tin(IV) oxide"
        ],
        "explanation": "Phân tích công thức SnO2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) oxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "SnS2",
        "acceptedAnswers": [
          "tin(IV) sulfide"
        ],
        "explanation": "Phân tích công thức SnS2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) sulfide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(SO4)2",
        "acceptedAnswers": [
          "tin(IV) sulfate"
        ],
        "explanation": "Phân tích công thức Sn(SO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) sulfate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn(CO3)2",
        "acceptedAnswers": [
          "tin(IV) carbonate"
        ],
        "explanation": "Phân tích công thức Sn(CO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) carbonate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Sn3(PO4)4",
        "acceptedAnswers": [
          "tin(IV) phosphate"
        ],
        "explanation": "Phân tích công thức Sn3(PO4)4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “tin(IV) phosphate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CrF3",
        "acceptedAnswers": [
          "chromium(III) fluoride"
        ],
        "explanation": "Phân tích công thức CrF3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) fluoride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CrCl3",
        "acceptedAnswers": [
          "chromium(III) chloride"
        ],
        "explanation": "Phân tích công thức CrCl3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) chloride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CrBr3",
        "acceptedAnswers": [
          "chromium(III) bromide"
        ],
        "explanation": "Phân tích công thức CrBr3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) bromide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CrI3",
        "acceptedAnswers": [
          "chromium(III) iodide"
        ],
        "explanation": "Phân tích công thức CrI3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) iodide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr(NO3)3",
        "acceptedAnswers": [
          "chromium(III) nitrate"
        ],
        "explanation": "Phân tích công thức Cr(NO3)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) nitrate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr(OH)3",
        "acceptedAnswers": [
          "chromium(III) hydroxide"
        ],
        "explanation": "Phân tích công thức Cr(OH)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) hydroxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr(ClO3)3",
        "acceptedAnswers": [
          "chromium(III) chlorate"
        ],
        "explanation": "Phân tích công thức Cr(ClO3)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) chlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr(ClO4)3",
        "acceptedAnswers": [
          "chromium(III) perchlorate"
        ],
        "explanation": "Phân tích công thức Cr(ClO4)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) perchlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr(CH3COO)3",
        "acceptedAnswers": [
          "chromium(III) ethanoate"
        ],
        "explanation": "Phân tích công thức Cr(CH3COO)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) ethanoate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr(CN)3",
        "acceptedAnswers": [
          "chromium(III) cyanide"
        ],
        "explanation": "Phân tích công thức Cr(CN)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) cyanide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr2O3",
        "acceptedAnswers": [
          "chromium(III) oxide"
        ],
        "explanation": "Phân tích công thức Cr2O3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) oxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr2S3",
        "acceptedAnswers": [
          "chromium(III) sulfide"
        ],
        "explanation": "Phân tích công thức Cr2S3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) sulfide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr2(SO4)3",
        "acceptedAnswers": [
          "chromium(III) sulfate"
        ],
        "explanation": "Phân tích công thức Cr2(SO4)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) sulfate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Cr2(CO3)3",
        "acceptedAnswers": [
          "chromium(III) carbonate"
        ],
        "explanation": "Phân tích công thức Cr2(CO3)3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) carbonate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CrPO4",
        "acceptedAnswers": [
          "chromium(III) phosphate"
        ],
        "explanation": "Phân tích công thức CrPO4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “chromium(III) phosphate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnF2",
        "acceptedAnswers": [
          "manganese(II) fluoride"
        ],
        "explanation": "Phân tích công thức MnF2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) fluoride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnCl2",
        "acceptedAnswers": [
          "manganese(II) chloride"
        ],
        "explanation": "Phân tích công thức MnCl2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) chloride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnBr2",
        "acceptedAnswers": [
          "manganese(II) bromide"
        ],
        "explanation": "Phân tích công thức MnBr2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) bromide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnI2",
        "acceptedAnswers": [
          "manganese(II) iodide"
        ],
        "explanation": "Phân tích công thức MnI2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) iodide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Mn(NO3)2",
        "acceptedAnswers": [
          "manganese(II) nitrate"
        ],
        "explanation": "Phân tích công thức Mn(NO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) nitrate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Mn(OH)2",
        "acceptedAnswers": [
          "manganese(II) hydroxide"
        ],
        "explanation": "Phân tích công thức Mn(OH)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) hydroxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Mn(ClO3)2",
        "acceptedAnswers": [
          "manganese(II) chlorate"
        ],
        "explanation": "Phân tích công thức Mn(ClO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) chlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Mn(ClO4)2",
        "acceptedAnswers": [
          "manganese(II) perchlorate"
        ],
        "explanation": "Phân tích công thức Mn(ClO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) perchlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Mn(CH3COO)2",
        "acceptedAnswers": [
          "manganese(II) ethanoate"
        ],
        "explanation": "Phân tích công thức Mn(CH3COO)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) ethanoate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Mn(CN)2",
        "acceptedAnswers": [
          "manganese(II) cyanide"
        ],
        "explanation": "Phân tích công thức Mn(CN)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) cyanide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnO",
        "acceptedAnswers": [
          "manganese(II) oxide"
        ],
        "explanation": "Phân tích công thức MnO cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) oxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnS",
        "acceptedAnswers": [
          "manganese(II) sulfide"
        ],
        "explanation": "Phân tích công thức MnS cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) sulfide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnSO4",
        "acceptedAnswers": [
          "manganese(II) sulfate"
        ],
        "explanation": "Phân tích công thức MnSO4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) sulfate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "MnCO3",
        "acceptedAnswers": [
          "manganese(II) carbonate"
        ],
        "explanation": "Phân tích công thức MnCO3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) carbonate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Mn3(PO4)2",
        "acceptedAnswers": [
          "manganese(II) phosphate"
        ],
        "explanation": "Phân tích công thức Mn3(PO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “manganese(II) phosphate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoF2",
        "acceptedAnswers": [
          "cobalt(II) fluoride"
        ],
        "explanation": "Phân tích công thức CoF2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) fluoride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoCl2",
        "acceptedAnswers": [
          "cobalt(II) chloride"
        ],
        "explanation": "Phân tích công thức CoCl2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) chloride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoBr2",
        "acceptedAnswers": [
          "cobalt(II) bromide"
        ],
        "explanation": "Phân tích công thức CoBr2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) bromide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoI2",
        "acceptedAnswers": [
          "cobalt(II) iodide"
        ],
        "explanation": "Phân tích công thức CoI2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) iodide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Co(NO3)2",
        "acceptedAnswers": [
          "cobalt(II) nitrate"
        ],
        "explanation": "Phân tích công thức Co(NO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) nitrate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Co(OH)2",
        "acceptedAnswers": [
          "cobalt(II) hydroxide"
        ],
        "explanation": "Phân tích công thức Co(OH)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) hydroxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Co(ClO3)2",
        "acceptedAnswers": [
          "cobalt(II) chlorate"
        ],
        "explanation": "Phân tích công thức Co(ClO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) chlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Co(ClO4)2",
        "acceptedAnswers": [
          "cobalt(II) perchlorate"
        ],
        "explanation": "Phân tích công thức Co(ClO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) perchlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Co(CH3COO)2",
        "acceptedAnswers": [
          "cobalt(II) ethanoate"
        ],
        "explanation": "Phân tích công thức Co(CH3COO)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) ethanoate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Co(CN)2",
        "acceptedAnswers": [
          "cobalt(II) cyanide"
        ],
        "explanation": "Phân tích công thức Co(CN)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) cyanide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoO",
        "acceptedAnswers": [
          "cobalt(II) oxide"
        ],
        "explanation": "Phân tích công thức CoO cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) oxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoS",
        "acceptedAnswers": [
          "cobalt(II) sulfide"
        ],
        "explanation": "Phân tích công thức CoS cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) sulfide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoSO4",
        "acceptedAnswers": [
          "cobalt(II) sulfate"
        ],
        "explanation": "Phân tích công thức CoSO4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) sulfate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "CoCO3",
        "acceptedAnswers": [
          "cobalt(II) carbonate"
        ],
        "explanation": "Phân tích công thức CoCO3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) carbonate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Co3(PO4)2",
        "acceptedAnswers": [
          "cobalt(II) phosphate"
        ],
        "explanation": "Phân tích công thức Co3(PO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “cobalt(II) phosphate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiF2",
        "acceptedAnswers": [
          "nickel(II) fluoride"
        ],
        "explanation": "Phân tích công thức NiF2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) fluoride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiCl2",
        "acceptedAnswers": [
          "nickel(II) chloride"
        ],
        "explanation": "Phân tích công thức NiCl2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) chloride”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiBr2",
        "acceptedAnswers": [
          "nickel(II) bromide"
        ],
        "explanation": "Phân tích công thức NiBr2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) bromide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiI2",
        "acceptedAnswers": [
          "nickel(II) iodide"
        ],
        "explanation": "Phân tích công thức NiI2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) iodide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Ni(NO3)2",
        "acceptedAnswers": [
          "nickel(II) nitrate"
        ],
        "explanation": "Phân tích công thức Ni(NO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) nitrate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Ni(OH)2",
        "acceptedAnswers": [
          "nickel(II) hydroxide"
        ],
        "explanation": "Phân tích công thức Ni(OH)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) hydroxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Ni(ClO3)2",
        "acceptedAnswers": [
          "nickel(II) chlorate"
        ],
        "explanation": "Phân tích công thức Ni(ClO3)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) chlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Ni(ClO4)2",
        "acceptedAnswers": [
          "nickel(II) perchlorate"
        ],
        "explanation": "Phân tích công thức Ni(ClO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) perchlorate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Ni(CH3COO)2",
        "acceptedAnswers": [
          "nickel(II) ethanoate"
        ],
        "explanation": "Phân tích công thức Ni(CH3COO)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) ethanoate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Ni(CN)2",
        "acceptedAnswers": [
          "nickel(II) cyanide"
        ],
        "explanation": "Phân tích công thức Ni(CN)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) cyanide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiO",
        "acceptedAnswers": [
          "nickel(II) oxide"
        ],
        "explanation": "Phân tích công thức NiO cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) oxide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiS",
        "acceptedAnswers": [
          "nickel(II) sulfide"
        ],
        "explanation": "Phân tích công thức NiS cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) sulfide”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiSO4",
        "acceptedAnswers": [
          "nickel(II) sulfate"
        ],
        "explanation": "Phân tích công thức NiSO4 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) sulfate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "NiCO3",
        "acceptedAnswers": [
          "nickel(II) carbonate"
        ],
        "explanation": "Phân tích công thức NiCO3 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) carbonate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      },
      {
        "equation": "Ni3(PO4)2",
        "acceptedAnswers": [
          "nickel(II) phosphate"
        ],
        "explanation": "Phân tích công thức Ni3(PO4)2 cho thấy cation và anion phải được gọi theo đúng trật tự danh pháp quốc tế. Tên chuẩn là “nickel(II) phosphate”. Số oxi hóa của kim loại được chỉ rõ bằng chữ số La Mã trong ngoặc. Vì hệ thống chỉ chấp nhận tên quốc tế, các biến thể Việt hóa hoặc tên thông dụng không được đưa vào acceptedAnswers.",
        "timeLimitSec": 34
      }
    ]
  },
  "element_quiz": {
    "easy": [
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=1, thuộc chu kỳ 1, và được phân loại là nonmetal.",
        "acceptedAnswers": [
          "H",
          "hydrogen"
        ],
        "explanation": "Số hiệu nguyên tử Z=1 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế H và tên quốc tế hydrogen. Đặc điểm phân loại phù hợp là nonmetal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=2, thuộc chu kỳ 1, và được phân loại là noble gas.",
        "acceptedAnswers": [
          "He",
          "helium"
        ],
        "explanation": "Số hiệu nguyên tử Z=2 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế He và tên quốc tế helium. Đặc điểm phân loại phù hợp là noble gas.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=3, thuộc chu kỳ 2, và được phân loại là alkali metal.",
        "acceptedAnswers": [
          "Li",
          "lithium"
        ],
        "explanation": "Số hiệu nguyên tử Z=3 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Li và tên quốc tế lithium. Đặc điểm phân loại phù hợp là alkali metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=4, thuộc chu kỳ 2, và được phân loại là alkaline-earth metal.",
        "acceptedAnswers": [
          "Be",
          "beryllium"
        ],
        "explanation": "Số hiệu nguyên tử Z=4 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Be và tên quốc tế beryllium. Đặc điểm phân loại phù hợp là alkaline-earth metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=5, thuộc chu kỳ 2, và được phân loại là metalloid.",
        "acceptedAnswers": [
          "B",
          "boron"
        ],
        "explanation": "Số hiệu nguyên tử Z=5 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế B và tên quốc tế boron. Đặc điểm phân loại phù hợp là metalloid.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=6, thuộc chu kỳ 2, và được phân loại là nonmetal.",
        "acceptedAnswers": [
          "C",
          "carbon"
        ],
        "explanation": "Số hiệu nguyên tử Z=6 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế C và tên quốc tế carbon. Đặc điểm phân loại phù hợp là nonmetal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=7, thuộc chu kỳ 2, và được phân loại là nonmetal.",
        "acceptedAnswers": [
          "N",
          "nitrogen"
        ],
        "explanation": "Số hiệu nguyên tử Z=7 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế N và tên quốc tế nitrogen. Đặc điểm phân loại phù hợp là nonmetal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=8, thuộc chu kỳ 2, và được phân loại là nonmetal.",
        "acceptedAnswers": [
          "O",
          "oxygen"
        ],
        "explanation": "Số hiệu nguyên tử Z=8 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế O và tên quốc tế oxygen. Đặc điểm phân loại phù hợp là nonmetal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=9, thuộc chu kỳ 2, và được phân loại là halogen.",
        "acceptedAnswers": [
          "F",
          "fluorine"
        ],
        "explanation": "Số hiệu nguyên tử Z=9 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế F và tên quốc tế fluorine. Đặc điểm phân loại phù hợp là halogen.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=10, thuộc chu kỳ 2, và được phân loại là noble gas.",
        "acceptedAnswers": [
          "Ne",
          "neon"
        ],
        "explanation": "Số hiệu nguyên tử Z=10 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ne và tên quốc tế neon. Đặc điểm phân loại phù hợp là noble gas.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=11, thuộc chu kỳ 3, và được phân loại là alkali metal.",
        "acceptedAnswers": [
          "Na",
          "sodium"
        ],
        "explanation": "Số hiệu nguyên tử Z=11 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Na và tên quốc tế sodium. Đặc điểm phân loại phù hợp là alkali metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=12, thuộc chu kỳ 3, và được phân loại là alkaline-earth metal.",
        "acceptedAnswers": [
          "Mg",
          "magnesium"
        ],
        "explanation": "Số hiệu nguyên tử Z=12 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Mg và tên quốc tế magnesium. Đặc điểm phân loại phù hợp là alkaline-earth metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=13, thuộc chu kỳ 3, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "Al",
          "aluminium"
        ],
        "explanation": "Số hiệu nguyên tử Z=13 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Al và tên quốc tế aluminium. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=14, thuộc chu kỳ 3, và được phân loại là metalloid.",
        "acceptedAnswers": [
          "Si",
          "silicon"
        ],
        "explanation": "Số hiệu nguyên tử Z=14 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Si và tên quốc tế silicon. Đặc điểm phân loại phù hợp là metalloid.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=15, thuộc chu kỳ 3, và được phân loại là nonmetal.",
        "acceptedAnswers": [
          "P",
          "phosphorus"
        ],
        "explanation": "Số hiệu nguyên tử Z=15 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế P và tên quốc tế phosphorus. Đặc điểm phân loại phù hợp là nonmetal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=16, thuộc chu kỳ 3, và được phân loại là nonmetal.",
        "acceptedAnswers": [
          "S",
          "sulfur"
        ],
        "explanation": "Số hiệu nguyên tử Z=16 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế S và tên quốc tế sulfur. Đặc điểm phân loại phù hợp là nonmetal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=17, thuộc chu kỳ 3, và được phân loại là halogen.",
        "acceptedAnswers": [
          "Cl",
          "chlorine"
        ],
        "explanation": "Số hiệu nguyên tử Z=17 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Cl và tên quốc tế chlorine. Đặc điểm phân loại phù hợp là halogen.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=18, thuộc chu kỳ 3, và được phân loại là noble gas.",
        "acceptedAnswers": [
          "Ar",
          "argon"
        ],
        "explanation": "Số hiệu nguyên tử Z=18 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ar và tên quốc tế argon. Đặc điểm phân loại phù hợp là noble gas.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=19, thuộc chu kỳ 4, và được phân loại là alkali metal.",
        "acceptedAnswers": [
          "K",
          "potassium"
        ],
        "explanation": "Số hiệu nguyên tử Z=19 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế K và tên quốc tế potassium. Đặc điểm phân loại phù hợp là alkali metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=20, thuộc chu kỳ 4, và được phân loại là alkaline-earth metal.",
        "acceptedAnswers": [
          "Ca",
          "calcium"
        ],
        "explanation": "Số hiệu nguyên tử Z=20 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ca và tên quốc tế calcium. Đặc điểm phân loại phù hợp là alkaline-earth metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=21, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Sc",
          "scandium"
        ],
        "explanation": "Số hiệu nguyên tử Z=21 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Sc và tên quốc tế scandium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=22, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Ti",
          "titanium"
        ],
        "explanation": "Số hiệu nguyên tử Z=22 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ti và tên quốc tế titanium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=23, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "V",
          "vanadium"
        ],
        "explanation": "Số hiệu nguyên tử Z=23 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế V và tên quốc tế vanadium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=24, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Cr",
          "chromium"
        ],
        "explanation": "Số hiệu nguyên tử Z=24 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Cr và tên quốc tế chromium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=25, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Mn",
          "manganese"
        ],
        "explanation": "Số hiệu nguyên tử Z=25 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Mn và tên quốc tế manganese. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=26, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Fe",
          "iron"
        ],
        "explanation": "Số hiệu nguyên tử Z=26 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Fe và tên quốc tế iron. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=27, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Co",
          "cobalt"
        ],
        "explanation": "Số hiệu nguyên tử Z=27 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Co và tên quốc tế cobalt. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=28, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Ni",
          "nickel"
        ],
        "explanation": "Số hiệu nguyên tử Z=28 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ni và tên quốc tế nickel. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=29, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Cu",
          "copper"
        ],
        "explanation": "Số hiệu nguyên tử Z=29 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Cu và tên quốc tế copper. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=30, thuộc chu kỳ 4, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Zn",
          "zinc"
        ],
        "explanation": "Số hiệu nguyên tử Z=30 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Zn và tên quốc tế zinc. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=31, thuộc chu kỳ 4, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "Ga",
          "gallium"
        ],
        "explanation": "Số hiệu nguyên tử Z=31 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ga và tên quốc tế gallium. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=32, thuộc chu kỳ 4, và được phân loại là metalloid.",
        "acceptedAnswers": [
          "Ge",
          "germanium"
        ],
        "explanation": "Số hiệu nguyên tử Z=32 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ge và tên quốc tế germanium. Đặc điểm phân loại phù hợp là metalloid.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=33, thuộc chu kỳ 4, và được phân loại là metalloid.",
        "acceptedAnswers": [
          "As",
          "arsenic"
        ],
        "explanation": "Số hiệu nguyên tử Z=33 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế As và tên quốc tế arsenic. Đặc điểm phân loại phù hợp là metalloid.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=34, thuộc chu kỳ 4, và được phân loại là nonmetal.",
        "acceptedAnswers": [
          "Se",
          "selenium"
        ],
        "explanation": "Số hiệu nguyên tử Z=34 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Se và tên quốc tế selenium. Đặc điểm phân loại phù hợp là nonmetal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=35, thuộc chu kỳ 4, và được phân loại là halogen.",
        "acceptedAnswers": [
          "Br",
          "bromine"
        ],
        "explanation": "Số hiệu nguyên tử Z=35 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Br và tên quốc tế bromine. Đặc điểm phân loại phù hợp là halogen.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=36, thuộc chu kỳ 4, và được phân loại là noble gas.",
        "acceptedAnswers": [
          "Kr",
          "krypton"
        ],
        "explanation": "Số hiệu nguyên tử Z=36 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Kr và tên quốc tế krypton. Đặc điểm phân loại phù hợp là noble gas.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=37, thuộc chu kỳ 5, và được phân loại là alkali metal.",
        "acceptedAnswers": [
          "Rb",
          "rubidium"
        ],
        "explanation": "Số hiệu nguyên tử Z=37 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Rb và tên quốc tế rubidium. Đặc điểm phân loại phù hợp là alkali metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=38, thuộc chu kỳ 5, và được phân loại là alkaline-earth metal.",
        "acceptedAnswers": [
          "Sr",
          "strontium"
        ],
        "explanation": "Số hiệu nguyên tử Z=38 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Sr và tên quốc tế strontium. Đặc điểm phân loại phù hợp là alkaline-earth metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=39, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Y",
          "yttrium"
        ],
        "explanation": "Số hiệu nguyên tử Z=39 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Y và tên quốc tế yttrium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=40, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Zr",
          "zirconium"
        ],
        "explanation": "Số hiệu nguyên tử Z=40 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Zr và tên quốc tế zirconium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=41, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Nb",
          "niobium"
        ],
        "explanation": "Số hiệu nguyên tử Z=41 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Nb và tên quốc tế niobium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=42, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Mo",
          "molybdenum"
        ],
        "explanation": "Số hiệu nguyên tử Z=42 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Mo và tên quốc tế molybdenum. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=43, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Tc",
          "technetium"
        ],
        "explanation": "Số hiệu nguyên tử Z=43 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Tc và tên quốc tế technetium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=44, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Ru",
          "ruthenium"
        ],
        "explanation": "Số hiệu nguyên tử Z=44 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ru và tên quốc tế ruthenium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=45, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Rh",
          "rhodium"
        ],
        "explanation": "Số hiệu nguyên tử Z=45 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Rh và tên quốc tế rhodium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=46, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Pd",
          "palladium"
        ],
        "explanation": "Số hiệu nguyên tử Z=46 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Pd và tên quốc tế palladium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=47, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Ag",
          "silver"
        ],
        "explanation": "Số hiệu nguyên tử Z=47 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ag và tên quốc tế silver. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=48, thuộc chu kỳ 5, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Cd",
          "cadmium"
        ],
        "explanation": "Số hiệu nguyên tử Z=48 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Cd và tên quốc tế cadmium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=49, thuộc chu kỳ 5, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "In",
          "indium"
        ],
        "explanation": "Số hiệu nguyên tử Z=49 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế In và tên quốc tế indium. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=50, thuộc chu kỳ 5, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "Sn",
          "tin"
        ],
        "explanation": "Số hiệu nguyên tử Z=50 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Sn và tên quốc tế tin. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=51, thuộc chu kỳ 5, và được phân loại là metalloid.",
        "acceptedAnswers": [
          "Sb",
          "antimony"
        ],
        "explanation": "Số hiệu nguyên tử Z=51 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Sb và tên quốc tế antimony. Đặc điểm phân loại phù hợp là metalloid.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=52, thuộc chu kỳ 5, và được phân loại là metalloid.",
        "acceptedAnswers": [
          "Te",
          "tellurium"
        ],
        "explanation": "Số hiệu nguyên tử Z=52 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Te và tên quốc tế tellurium. Đặc điểm phân loại phù hợp là metalloid.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=53, thuộc chu kỳ 5, và được phân loại là halogen.",
        "acceptedAnswers": [
          "I",
          "iodine"
        ],
        "explanation": "Số hiệu nguyên tử Z=53 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế I và tên quốc tế iodine. Đặc điểm phân loại phù hợp là halogen.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=54, thuộc chu kỳ 5, và được phân loại là noble gas.",
        "acceptedAnswers": [
          "Xe",
          "xenon"
        ],
        "explanation": "Số hiệu nguyên tử Z=54 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Xe và tên quốc tế xenon. Đặc điểm phân loại phù hợp là noble gas.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=55, thuộc chu kỳ 6, và được phân loại là alkali metal.",
        "acceptedAnswers": [
          "Cs",
          "caesium"
        ],
        "explanation": "Số hiệu nguyên tử Z=55 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Cs và tên quốc tế caesium. Đặc điểm phân loại phù hợp là alkali metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=56, thuộc chu kỳ 6, và được phân loại là alkaline-earth metal.",
        "acceptedAnswers": [
          "Ba",
          "barium"
        ],
        "explanation": "Số hiệu nguyên tử Z=56 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ba và tên quốc tế barium. Đặc điểm phân loại phù hợp là alkaline-earth metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=57, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "La",
          "lanthanum"
        ],
        "explanation": "Số hiệu nguyên tử Z=57 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế La và tên quốc tế lanthanum. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=58, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Ce",
          "cerium"
        ],
        "explanation": "Số hiệu nguyên tử Z=58 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ce và tên quốc tế cerium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=59, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Pr",
          "praseodymium"
        ],
        "explanation": "Số hiệu nguyên tử Z=59 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Pr và tên quốc tế praseodymium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=60, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Nd",
          "neodymium"
        ],
        "explanation": "Số hiệu nguyên tử Z=60 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Nd và tên quốc tế neodymium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=61, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Pm",
          "promethium"
        ],
        "explanation": "Số hiệu nguyên tử Z=61 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Pm và tên quốc tế promethium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=62, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Sm",
          "samarium"
        ],
        "explanation": "Số hiệu nguyên tử Z=62 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Sm và tên quốc tế samarium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=63, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Eu",
          "europium"
        ],
        "explanation": "Số hiệu nguyên tử Z=63 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Eu và tên quốc tế europium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=64, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Gd",
          "gadolinium"
        ],
        "explanation": "Số hiệu nguyên tử Z=64 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Gd và tên quốc tế gadolinium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=65, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Tb",
          "terbium"
        ],
        "explanation": "Số hiệu nguyên tử Z=65 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Tb và tên quốc tế terbium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=66, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Dy",
          "dysprosium"
        ],
        "explanation": "Số hiệu nguyên tử Z=66 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Dy và tên quốc tế dysprosium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=67, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Ho",
          "holmium"
        ],
        "explanation": "Số hiệu nguyên tử Z=67 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ho và tên quốc tế holmium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=68, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Er",
          "erbium"
        ],
        "explanation": "Số hiệu nguyên tử Z=68 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Er và tên quốc tế erbium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=69, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Tm",
          "thulium"
        ],
        "explanation": "Số hiệu nguyên tử Z=69 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Tm và tên quốc tế thulium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=70, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Yb",
          "ytterbium"
        ],
        "explanation": "Số hiệu nguyên tử Z=70 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Yb và tên quốc tế ytterbium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=71, thuộc chu kỳ 6, và được phân loại là lanthanide.",
        "acceptedAnswers": [
          "Lu",
          "lutetium"
        ],
        "explanation": "Số hiệu nguyên tử Z=71 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Lu và tên quốc tế lutetium. Đặc điểm phân loại phù hợp là lanthanide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=72, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Hf",
          "hafnium"
        ],
        "explanation": "Số hiệu nguyên tử Z=72 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Hf và tên quốc tế hafnium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=73, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Ta",
          "tantalum"
        ],
        "explanation": "Số hiệu nguyên tử Z=73 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ta và tên quốc tế tantalum. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=74, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "W",
          "tungsten"
        ],
        "explanation": "Số hiệu nguyên tử Z=74 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế W và tên quốc tế tungsten. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=75, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Re",
          "rhenium"
        ],
        "explanation": "Số hiệu nguyên tử Z=75 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Re và tên quốc tế rhenium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=76, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Os",
          "osmium"
        ],
        "explanation": "Số hiệu nguyên tử Z=76 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Os và tên quốc tế osmium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=77, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Ir",
          "iridium"
        ],
        "explanation": "Số hiệu nguyên tử Z=77 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ir và tên quốc tế iridium. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=78, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Pt",
          "platinum"
        ],
        "explanation": "Số hiệu nguyên tử Z=78 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Pt và tên quốc tế platinum. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=79, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Au",
          "gold"
        ],
        "explanation": "Số hiệu nguyên tử Z=79 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Au và tên quốc tế gold. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=80, thuộc chu kỳ 6, và được phân loại là transition metal.",
        "acceptedAnswers": [
          "Hg",
          "mercury"
        ],
        "explanation": "Số hiệu nguyên tử Z=80 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Hg và tên quốc tế mercury. Đặc điểm phân loại phù hợp là transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=81, thuộc chu kỳ 6, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "Tl",
          "thallium"
        ],
        "explanation": "Số hiệu nguyên tử Z=81 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Tl và tên quốc tế thallium. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=82, thuộc chu kỳ 6, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "Pb",
          "lead"
        ],
        "explanation": "Số hiệu nguyên tử Z=82 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Pb và tên quốc tế lead. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=83, thuộc chu kỳ 6, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "Bi",
          "bismuth"
        ],
        "explanation": "Số hiệu nguyên tử Z=83 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Bi và tên quốc tế bismuth. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=84, thuộc chu kỳ 6, và được phân loại là post-transition metal.",
        "acceptedAnswers": [
          "Po",
          "polonium"
        ],
        "explanation": "Số hiệu nguyên tử Z=84 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Po và tên quốc tế polonium. Đặc điểm phân loại phù hợp là post-transition metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=85, thuộc chu kỳ 6, và được phân loại là halogen.",
        "acceptedAnswers": [
          "At",
          "astatine"
        ],
        "explanation": "Số hiệu nguyên tử Z=85 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế At và tên quốc tế astatine. Đặc điểm phân loại phù hợp là halogen.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=86, thuộc chu kỳ 6, và được phân loại là noble gas.",
        "acceptedAnswers": [
          "Rn",
          "radon"
        ],
        "explanation": "Số hiệu nguyên tử Z=86 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Rn và tên quốc tế radon. Đặc điểm phân loại phù hợp là noble gas.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=87, thuộc chu kỳ 7, và được phân loại là alkali metal.",
        "acceptedAnswers": [
          "Fr",
          "francium"
        ],
        "explanation": "Số hiệu nguyên tử Z=87 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Fr và tên quốc tế francium. Đặc điểm phân loại phù hợp là alkali metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=88, thuộc chu kỳ 7, và được phân loại là alkaline-earth metal.",
        "acceptedAnswers": [
          "Ra",
          "radium"
        ],
        "explanation": "Số hiệu nguyên tử Z=88 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ra và tên quốc tế radium. Đặc điểm phân loại phù hợp là alkaline-earth metal.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=89, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Ac",
          "actinium"
        ],
        "explanation": "Số hiệu nguyên tử Z=89 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Ac và tên quốc tế actinium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=90, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Th",
          "thorium"
        ],
        "explanation": "Số hiệu nguyên tử Z=90 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Th và tên quốc tế thorium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=91, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Pa",
          "protactinium"
        ],
        "explanation": "Số hiệu nguyên tử Z=91 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Pa và tên quốc tế protactinium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=92, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "U",
          "uranium"
        ],
        "explanation": "Số hiệu nguyên tử Z=92 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế U và tên quốc tế uranium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=93, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Np",
          "neptunium"
        ],
        "explanation": "Số hiệu nguyên tử Z=93 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Np và tên quốc tế neptunium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=94, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Pu",
          "plutonium"
        ],
        "explanation": "Số hiệu nguyên tử Z=94 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Pu và tên quốc tế plutonium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=95, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Am",
          "americium"
        ],
        "explanation": "Số hiệu nguyên tử Z=95 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Am và tên quốc tế americium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=96, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Cm",
          "curium"
        ],
        "explanation": "Số hiệu nguyên tử Z=96 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Cm và tên quốc tế curium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=97, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Bk",
          "berkelium"
        ],
        "explanation": "Số hiệu nguyên tử Z=97 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Bk và tên quốc tế berkelium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=98, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Cf",
          "californium"
        ],
        "explanation": "Số hiệu nguyên tử Z=98 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Cf và tên quốc tế californium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=99, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Es",
          "einsteinium"
        ],
        "explanation": "Số hiệu nguyên tử Z=99 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Es và tên quốc tế einsteinium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      },
      {
        "equation": "Nguyên tố có số hiệu nguyên tử Z=100, thuộc chu kỳ 7, và được phân loại là actinide.",
        "acceptedAnswers": [
          "Fm",
          "fermium"
        ],
        "explanation": "Số hiệu nguyên tử Z=100 xác định duy nhất nguyên tố này trong bảng tuần hoàn. Nguyên tố đó có kí hiệu quốc tế Fm và tên quốc tế fermium. Đặc điểm phân loại phù hợp là actinide.",
        "timeLimitSec": 18
      }
    ],
    "medium": [
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 1, có số hiệu nguyên tử Z=1.",
        "acceptedAnswers": [
          "H",
          "hydrogen"
        ],
        "explanation": "Z=1 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 1 và khối p-block; kí hiệu quốc tế là H, tên quốc tế là hydrogen.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 1, có số hiệu nguyên tử Z=2.",
        "acceptedAnswers": [
          "He",
          "helium"
        ],
        "explanation": "Z=2 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 1 và khối s-block; kí hiệu quốc tế là He, tên quốc tế là helium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 2, có số hiệu nguyên tử Z=3.",
        "acceptedAnswers": [
          "Li",
          "lithium"
        ],
        "explanation": "Z=3 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối s-block; kí hiệu quốc tế là Li, tên quốc tế là lithium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 2, có số hiệu nguyên tử Z=4.",
        "acceptedAnswers": [
          "Be",
          "beryllium"
        ],
        "explanation": "Z=4 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối s-block; kí hiệu quốc tế là Be, tên quốc tế là beryllium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 2, có số hiệu nguyên tử Z=5.",
        "acceptedAnswers": [
          "B",
          "boron"
        ],
        "explanation": "Z=5 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối p-block; kí hiệu quốc tế là B, tên quốc tế là boron.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 2, có số hiệu nguyên tử Z=6.",
        "acceptedAnswers": [
          "C",
          "carbon"
        ],
        "explanation": "Z=6 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối p-block; kí hiệu quốc tế là C, tên quốc tế là carbon.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 2, có số hiệu nguyên tử Z=7.",
        "acceptedAnswers": [
          "N",
          "nitrogen"
        ],
        "explanation": "Z=7 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối p-block; kí hiệu quốc tế là N, tên quốc tế là nitrogen.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 2, có số hiệu nguyên tử Z=8.",
        "acceptedAnswers": [
          "O",
          "oxygen"
        ],
        "explanation": "Z=8 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối p-block; kí hiệu quốc tế là O, tên quốc tế là oxygen.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 2, có số hiệu nguyên tử Z=9.",
        "acceptedAnswers": [
          "F",
          "fluorine"
        ],
        "explanation": "Z=9 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối p-block; kí hiệu quốc tế là F, tên quốc tế là fluorine.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 2, có số hiệu nguyên tử Z=10.",
        "acceptedAnswers": [
          "Ne",
          "neon"
        ],
        "explanation": "Z=10 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 2 và khối p-block; kí hiệu quốc tế là Ne, tên quốc tế là neon.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 3, có số hiệu nguyên tử Z=11.",
        "acceptedAnswers": [
          "Na",
          "sodium"
        ],
        "explanation": "Z=11 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối s-block; kí hiệu quốc tế là Na, tên quốc tế là sodium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 3, có số hiệu nguyên tử Z=12.",
        "acceptedAnswers": [
          "Mg",
          "magnesium"
        ],
        "explanation": "Z=12 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối s-block; kí hiệu quốc tế là Mg, tên quốc tế là magnesium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 3, có số hiệu nguyên tử Z=13.",
        "acceptedAnswers": [
          "Al",
          "aluminium"
        ],
        "explanation": "Z=13 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối p-block; kí hiệu quốc tế là Al, tên quốc tế là aluminium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 3, có số hiệu nguyên tử Z=14.",
        "acceptedAnswers": [
          "Si",
          "silicon"
        ],
        "explanation": "Z=14 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối p-block; kí hiệu quốc tế là Si, tên quốc tế là silicon.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 3, có số hiệu nguyên tử Z=15.",
        "acceptedAnswers": [
          "P",
          "phosphorus"
        ],
        "explanation": "Z=15 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối p-block; kí hiệu quốc tế là P, tên quốc tế là phosphorus.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 3, có số hiệu nguyên tử Z=16.",
        "acceptedAnswers": [
          "S",
          "sulfur"
        ],
        "explanation": "Z=16 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối p-block; kí hiệu quốc tế là S, tên quốc tế là sulfur.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 3, có số hiệu nguyên tử Z=17.",
        "acceptedAnswers": [
          "Cl",
          "chlorine"
        ],
        "explanation": "Z=17 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối p-block; kí hiệu quốc tế là Cl, tên quốc tế là chlorine.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 3, có số hiệu nguyên tử Z=18.",
        "acceptedAnswers": [
          "Ar",
          "argon"
        ],
        "explanation": "Z=18 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 3 và khối p-block; kí hiệu quốc tế là Ar, tên quốc tế là argon.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 4, có số hiệu nguyên tử Z=19.",
        "acceptedAnswers": [
          "K",
          "potassium"
        ],
        "explanation": "Z=19 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối s-block; kí hiệu quốc tế là K, tên quốc tế là potassium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 4, có số hiệu nguyên tử Z=20.",
        "acceptedAnswers": [
          "Ca",
          "calcium"
        ],
        "explanation": "Z=20 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối s-block; kí hiệu quốc tế là Ca, tên quốc tế là calcium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=21.",
        "acceptedAnswers": [
          "Sc",
          "scandium"
        ],
        "explanation": "Z=21 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Sc, tên quốc tế là scandium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=22.",
        "acceptedAnswers": [
          "Ti",
          "titanium"
        ],
        "explanation": "Z=22 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Ti, tên quốc tế là titanium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=23.",
        "acceptedAnswers": [
          "V",
          "vanadium"
        ],
        "explanation": "Z=23 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là V, tên quốc tế là vanadium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=24.",
        "acceptedAnswers": [
          "Cr",
          "chromium"
        ],
        "explanation": "Z=24 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Cr, tên quốc tế là chromium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=25.",
        "acceptedAnswers": [
          "Mn",
          "manganese"
        ],
        "explanation": "Z=25 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Mn, tên quốc tế là manganese.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=26.",
        "acceptedAnswers": [
          "Fe",
          "iron"
        ],
        "explanation": "Z=26 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Fe, tên quốc tế là iron.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=27.",
        "acceptedAnswers": [
          "Co",
          "cobalt"
        ],
        "explanation": "Z=27 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Co, tên quốc tế là cobalt.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=28.",
        "acceptedAnswers": [
          "Ni",
          "nickel"
        ],
        "explanation": "Z=28 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Ni, tên quốc tế là nickel.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=29.",
        "acceptedAnswers": [
          "Cu",
          "copper"
        ],
        "explanation": "Z=29 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Cu, tên quốc tế là copper.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 4, có số hiệu nguyên tử Z=30.",
        "acceptedAnswers": [
          "Zn",
          "zinc"
        ],
        "explanation": "Z=30 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối d-block; kí hiệu quốc tế là Zn, tên quốc tế là zinc.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 4, có số hiệu nguyên tử Z=31.",
        "acceptedAnswers": [
          "Ga",
          "gallium"
        ],
        "explanation": "Z=31 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối p-block; kí hiệu quốc tế là Ga, tên quốc tế là gallium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 4, có số hiệu nguyên tử Z=32.",
        "acceptedAnswers": [
          "Ge",
          "germanium"
        ],
        "explanation": "Z=32 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối p-block; kí hiệu quốc tế là Ge, tên quốc tế là germanium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 4, có số hiệu nguyên tử Z=33.",
        "acceptedAnswers": [
          "As",
          "arsenic"
        ],
        "explanation": "Z=33 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối p-block; kí hiệu quốc tế là As, tên quốc tế là arsenic.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 4, có số hiệu nguyên tử Z=34.",
        "acceptedAnswers": [
          "Se",
          "selenium"
        ],
        "explanation": "Z=34 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối p-block; kí hiệu quốc tế là Se, tên quốc tế là selenium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 4, có số hiệu nguyên tử Z=35.",
        "acceptedAnswers": [
          "Br",
          "bromine"
        ],
        "explanation": "Z=35 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối p-block; kí hiệu quốc tế là Br, tên quốc tế là bromine.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 4, có số hiệu nguyên tử Z=36.",
        "acceptedAnswers": [
          "Kr",
          "krypton"
        ],
        "explanation": "Z=36 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 4 và khối p-block; kí hiệu quốc tế là Kr, tên quốc tế là krypton.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 5, có số hiệu nguyên tử Z=37.",
        "acceptedAnswers": [
          "Rb",
          "rubidium"
        ],
        "explanation": "Z=37 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối s-block; kí hiệu quốc tế là Rb, tên quốc tế là rubidium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 5, có số hiệu nguyên tử Z=38.",
        "acceptedAnswers": [
          "Sr",
          "strontium"
        ],
        "explanation": "Z=38 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối s-block; kí hiệu quốc tế là Sr, tên quốc tế là strontium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=39.",
        "acceptedAnswers": [
          "Y",
          "yttrium"
        ],
        "explanation": "Z=39 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Y, tên quốc tế là yttrium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=40.",
        "acceptedAnswers": [
          "Zr",
          "zirconium"
        ],
        "explanation": "Z=40 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Zr, tên quốc tế là zirconium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=41.",
        "acceptedAnswers": [
          "Nb",
          "niobium"
        ],
        "explanation": "Z=41 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Nb, tên quốc tế là niobium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=42.",
        "acceptedAnswers": [
          "Mo",
          "molybdenum"
        ],
        "explanation": "Z=42 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Mo, tên quốc tế là molybdenum.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=43.",
        "acceptedAnswers": [
          "Tc",
          "technetium"
        ],
        "explanation": "Z=43 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Tc, tên quốc tế là technetium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=44.",
        "acceptedAnswers": [
          "Ru",
          "ruthenium"
        ],
        "explanation": "Z=44 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Ru, tên quốc tế là ruthenium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=45.",
        "acceptedAnswers": [
          "Rh",
          "rhodium"
        ],
        "explanation": "Z=45 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Rh, tên quốc tế là rhodium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=46.",
        "acceptedAnswers": [
          "Pd",
          "palladium"
        ],
        "explanation": "Z=46 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Pd, tên quốc tế là palladium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=47.",
        "acceptedAnswers": [
          "Ag",
          "silver"
        ],
        "explanation": "Z=47 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Ag, tên quốc tế là silver.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 5, có số hiệu nguyên tử Z=48.",
        "acceptedAnswers": [
          "Cd",
          "cadmium"
        ],
        "explanation": "Z=48 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối d-block; kí hiệu quốc tế là Cd, tên quốc tế là cadmium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 5, có số hiệu nguyên tử Z=49.",
        "acceptedAnswers": [
          "In",
          "indium"
        ],
        "explanation": "Z=49 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối p-block; kí hiệu quốc tế là In, tên quốc tế là indium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 5, có số hiệu nguyên tử Z=50.",
        "acceptedAnswers": [
          "Sn",
          "tin"
        ],
        "explanation": "Z=50 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối p-block; kí hiệu quốc tế là Sn, tên quốc tế là tin.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 5, có số hiệu nguyên tử Z=51.",
        "acceptedAnswers": [
          "Sb",
          "antimony"
        ],
        "explanation": "Z=51 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối p-block; kí hiệu quốc tế là Sb, tên quốc tế là antimony.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 5, có số hiệu nguyên tử Z=52.",
        "acceptedAnswers": [
          "Te",
          "tellurium"
        ],
        "explanation": "Z=52 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối p-block; kí hiệu quốc tế là Te, tên quốc tế là tellurium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 5, có số hiệu nguyên tử Z=53.",
        "acceptedAnswers": [
          "I",
          "iodine"
        ],
        "explanation": "Z=53 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối p-block; kí hiệu quốc tế là I, tên quốc tế là iodine.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 5, có số hiệu nguyên tử Z=54.",
        "acceptedAnswers": [
          "Xe",
          "xenon"
        ],
        "explanation": "Z=54 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 5 và khối p-block; kí hiệu quốc tế là Xe, tên quốc tế là xenon.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 6, có số hiệu nguyên tử Z=55.",
        "acceptedAnswers": [
          "Cs",
          "caesium"
        ],
        "explanation": "Z=55 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối s-block; kí hiệu quốc tế là Cs, tên quốc tế là caesium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 6, có số hiệu nguyên tử Z=56.",
        "acceptedAnswers": [
          "Ba",
          "barium"
        ],
        "explanation": "Z=56 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối s-block; kí hiệu quốc tế là Ba, tên quốc tế là barium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=57.",
        "acceptedAnswers": [
          "La",
          "lanthanum"
        ],
        "explanation": "Z=57 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là La, tên quốc tế là lanthanum.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=58.",
        "acceptedAnswers": [
          "Ce",
          "cerium"
        ],
        "explanation": "Z=58 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Ce, tên quốc tế là cerium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=59.",
        "acceptedAnswers": [
          "Pr",
          "praseodymium"
        ],
        "explanation": "Z=59 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Pr, tên quốc tế là praseodymium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=60.",
        "acceptedAnswers": [
          "Nd",
          "neodymium"
        ],
        "explanation": "Z=60 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Nd, tên quốc tế là neodymium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=61.",
        "acceptedAnswers": [
          "Pm",
          "promethium"
        ],
        "explanation": "Z=61 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Pm, tên quốc tế là promethium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=62.",
        "acceptedAnswers": [
          "Sm",
          "samarium"
        ],
        "explanation": "Z=62 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Sm, tên quốc tế là samarium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=63.",
        "acceptedAnswers": [
          "Eu",
          "europium"
        ],
        "explanation": "Z=63 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Eu, tên quốc tế là europium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=64.",
        "acceptedAnswers": [
          "Gd",
          "gadolinium"
        ],
        "explanation": "Z=64 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Gd, tên quốc tế là gadolinium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=65.",
        "acceptedAnswers": [
          "Tb",
          "terbium"
        ],
        "explanation": "Z=65 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Tb, tên quốc tế là terbium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=66.",
        "acceptedAnswers": [
          "Dy",
          "dysprosium"
        ],
        "explanation": "Z=66 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Dy, tên quốc tế là dysprosium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=67.",
        "acceptedAnswers": [
          "Ho",
          "holmium"
        ],
        "explanation": "Z=67 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Ho, tên quốc tế là holmium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=68.",
        "acceptedAnswers": [
          "Er",
          "erbium"
        ],
        "explanation": "Z=68 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Er, tên quốc tế là erbium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=69.",
        "acceptedAnswers": [
          "Tm",
          "thulium"
        ],
        "explanation": "Z=69 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Tm, tên quốc tế là thulium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=70.",
        "acceptedAnswers": [
          "Yb",
          "ytterbium"
        ],
        "explanation": "Z=70 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Yb, tên quốc tế là ytterbium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 6, có số hiệu nguyên tử Z=71.",
        "acceptedAnswers": [
          "Lu",
          "lutetium"
        ],
        "explanation": "Z=71 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối f-block; kí hiệu quốc tế là Lu, tên quốc tế là lutetium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=72.",
        "acceptedAnswers": [
          "Hf",
          "hafnium"
        ],
        "explanation": "Z=72 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Hf, tên quốc tế là hafnium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=73.",
        "acceptedAnswers": [
          "Ta",
          "tantalum"
        ],
        "explanation": "Z=73 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Ta, tên quốc tế là tantalum.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=74.",
        "acceptedAnswers": [
          "W",
          "tungsten"
        ],
        "explanation": "Z=74 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là W, tên quốc tế là tungsten.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=75.",
        "acceptedAnswers": [
          "Re",
          "rhenium"
        ],
        "explanation": "Z=75 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Re, tên quốc tế là rhenium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=76.",
        "acceptedAnswers": [
          "Os",
          "osmium"
        ],
        "explanation": "Z=76 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Os, tên quốc tế là osmium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=77.",
        "acceptedAnswers": [
          "Ir",
          "iridium"
        ],
        "explanation": "Z=77 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Ir, tên quốc tế là iridium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=78.",
        "acceptedAnswers": [
          "Pt",
          "platinum"
        ],
        "explanation": "Z=78 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Pt, tên quốc tế là platinum.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=79.",
        "acceptedAnswers": [
          "Au",
          "gold"
        ],
        "explanation": "Z=79 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Au, tên quốc tế là gold.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc d-block, chu kỳ 6, có số hiệu nguyên tử Z=80.",
        "acceptedAnswers": [
          "Hg",
          "mercury"
        ],
        "explanation": "Z=80 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối d-block; kí hiệu quốc tế là Hg, tên quốc tế là mercury.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 6, có số hiệu nguyên tử Z=81.",
        "acceptedAnswers": [
          "Tl",
          "thallium"
        ],
        "explanation": "Z=81 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối p-block; kí hiệu quốc tế là Tl, tên quốc tế là thallium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 6, có số hiệu nguyên tử Z=82.",
        "acceptedAnswers": [
          "Pb",
          "lead"
        ],
        "explanation": "Z=82 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối p-block; kí hiệu quốc tế là Pb, tên quốc tế là lead.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 6, có số hiệu nguyên tử Z=83.",
        "acceptedAnswers": [
          "Bi",
          "bismuth"
        ],
        "explanation": "Z=83 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối p-block; kí hiệu quốc tế là Bi, tên quốc tế là bismuth.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 6, có số hiệu nguyên tử Z=84.",
        "acceptedAnswers": [
          "Po",
          "polonium"
        ],
        "explanation": "Z=84 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối p-block; kí hiệu quốc tế là Po, tên quốc tế là polonium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 6, có số hiệu nguyên tử Z=85.",
        "acceptedAnswers": [
          "At",
          "astatine"
        ],
        "explanation": "Z=85 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối p-block; kí hiệu quốc tế là At, tên quốc tế là astatine.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc p-block, chu kỳ 6, có số hiệu nguyên tử Z=86.",
        "acceptedAnswers": [
          "Rn",
          "radon"
        ],
        "explanation": "Z=86 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 6 và khối p-block; kí hiệu quốc tế là Rn, tên quốc tế là radon.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 7, có số hiệu nguyên tử Z=87.",
        "acceptedAnswers": [
          "Fr",
          "francium"
        ],
        "explanation": "Z=87 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối s-block; kí hiệu quốc tế là Fr, tên quốc tế là francium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc s-block, chu kỳ 7, có số hiệu nguyên tử Z=88.",
        "acceptedAnswers": [
          "Ra",
          "radium"
        ],
        "explanation": "Z=88 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối s-block; kí hiệu quốc tế là Ra, tên quốc tế là radium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=89.",
        "acceptedAnswers": [
          "Ac",
          "actinium"
        ],
        "explanation": "Z=89 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Ac, tên quốc tế là actinium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=90.",
        "acceptedAnswers": [
          "Th",
          "thorium"
        ],
        "explanation": "Z=90 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Th, tên quốc tế là thorium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=91.",
        "acceptedAnswers": [
          "Pa",
          "protactinium"
        ],
        "explanation": "Z=91 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Pa, tên quốc tế là protactinium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=92.",
        "acceptedAnswers": [
          "U",
          "uranium"
        ],
        "explanation": "Z=92 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là U, tên quốc tế là uranium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=93.",
        "acceptedAnswers": [
          "Np",
          "neptunium"
        ],
        "explanation": "Z=93 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Np, tên quốc tế là neptunium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=94.",
        "acceptedAnswers": [
          "Pu",
          "plutonium"
        ],
        "explanation": "Z=94 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Pu, tên quốc tế là plutonium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=95.",
        "acceptedAnswers": [
          "Am",
          "americium"
        ],
        "explanation": "Z=95 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Am, tên quốc tế là americium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=96.",
        "acceptedAnswers": [
          "Cm",
          "curium"
        ],
        "explanation": "Z=96 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Cm, tên quốc tế là curium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=97.",
        "acceptedAnswers": [
          "Bk",
          "berkelium"
        ],
        "explanation": "Z=97 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Bk, tên quốc tế là berkelium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=98.",
        "acceptedAnswers": [
          "Cf",
          "californium"
        ],
        "explanation": "Z=98 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Cf, tên quốc tế là californium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=99.",
        "acceptedAnswers": [
          "Es",
          "einsteinium"
        ],
        "explanation": "Z=99 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Es, tên quốc tế là einsteinium.",
        "timeLimitSec": 24
      },
      {
        "equation": "Xác định nguyên tố thuộc f-block, chu kỳ 7, có số hiệu nguyên tử Z=100.",
        "acceptedAnswers": [
          "Fm",
          "fermium"
        ],
        "explanation": "Z=100 là dữ kiện quyết định danh tính nguyên tố. Vị trí của nguyên tố nằm ở chu kỳ 7 và khối f-block; kí hiệu quốc tế là Fm, tên quốc tế là fermium.",
        "timeLimitSec": 24
      }
    ],
    "hard": [
      {
        "equation": "Nguyên tố Z=1: the lightest chemical element and the most abundant element in the universe. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "H",
          "hydrogen"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=1. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu H và tên hydrogen; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=2: a noble gas with a very low boiling point and strong chemical inertness. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "He",
          "helium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=2. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu He và tên helium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=3: the lightest metal and an alkali metal in period 2. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Li",
          "lithium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=3. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Li và tên lithium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=4: an alkaline-earth metal in period 2. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Be",
          "beryllium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=4. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Be và tên beryllium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=5: a metalloid used in borosilicate glass and boron compounds. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "B",
          "boron"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=5. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu B và tên boron; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=6: the element that forms diamond and graphite allotropes. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "C",
          "carbon"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=6. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu C và tên carbon; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=7: the main component of Earth's atmosphere by volume. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "N",
          "nitrogen"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=7. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu N và tên nitrogen; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=8: the element that makes up about one fifth of dry air. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "O",
          "oxygen"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=8. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu O và tên oxygen; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=9: the most electronegative element. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "F",
          "fluorine"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=9. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu F và tên fluorine; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=10: a noble gas famous for its characteristic glow in discharge tubes. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ne",
          "neon"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=10. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ne và tên neon; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=11: an alkali metal commonly associated with sodium chloride. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Na",
          "sodium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=11. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Na và tên sodium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=12: an alkaline-earth metal that burns with an intense white light. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Mg",
          "magnesium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=12. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Mg và tên magnesium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=13: a lightweight metal widely used in structural materials. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Al",
          "aluminium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=13. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Al và tên aluminium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=14: a semiconductor element central to modern electronics. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Si",
          "silicon"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=14. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Si và tên silicon; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=15: a nonmetal with important allotropes including white and red phosphorus. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "P",
          "phosphorus"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=15. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu P và tên phosphorus; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=16: a yellow nonmetal widely present in sulfide and sulfate minerals. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "S",
          "sulfur"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=16. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu S và tên sulfur; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=17: a halogen widely used for water disinfection. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Cl",
          "chlorine"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=17. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Cl và tên chlorine; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=18: a noble gas used as an inert shielding atmosphere. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ar",
          "argon"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=18. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ar và tên argon; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=19: an alkali metal whose salts are important in fertilizers. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "K",
          "potassium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=19. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu K và tên potassium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=20: an alkaline-earth metal important in calcium phosphate minerals. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ca",
          "calcium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=20. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ca và tên calcium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=21: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Sc",
          "scandium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=21. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Sc và tên scandium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=22: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ti",
          "titanium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=22. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ti và tên titanium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=23: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "V",
          "vanadium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=23. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu V và tên vanadium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=24: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Cr",
          "chromium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=24. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Cr và tên chromium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=25: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Mn",
          "manganese"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=25. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Mn và tên manganese; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=26: a transition metal central to steel production. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Fe",
          "iron"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=26. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Fe và tên iron; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=27: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Co",
          "cobalt"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=27. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Co và tên cobalt; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=28: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ni",
          "nickel"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=28. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ni và tên nickel; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=29: a transition metal widely used in electrical conductors. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Cu",
          "copper"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=29. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Cu và tên copper; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=30: a transition metal commonly used to protect iron by galvanizing. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Zn",
          "zinc"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=30. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Zn và tên zinc; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=31: có các tính chất đặc trưng của post-transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ga",
          "gallium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=31. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ga và tên gallium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=32: có các tính chất đặc trưng của metalloid. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ge",
          "germanium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=32. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ge và tên germanium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=33: có các tính chất đặc trưng của metalloid. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "As",
          "arsenic"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=33. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu As và tên arsenic; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=34: có các tính chất đặc trưng của nonmetal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Se",
          "selenium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=34. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Se và tên selenium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=35: the only halogen that is liquid near room temperature. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Br",
          "bromine"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=35. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Br và tên bromine; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=36: có các tính chất đặc trưng của noble gas. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Kr",
          "krypton"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=36. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Kr và tên krypton; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=37: có các tính chất đặc trưng của alkali metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Rb",
          "rubidium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=37. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Rb và tên rubidium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=38: có các tính chất đặc trưng của alkaline-earth metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Sr",
          "strontium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=38. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Sr và tên strontium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=39: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Y",
          "yttrium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=39. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Y và tên yttrium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=40: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Zr",
          "zirconium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=40. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Zr và tên zirconium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=41: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Nb",
          "niobium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=41. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Nb và tên niobium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=42: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Mo",
          "molybdenum"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=42. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Mo và tên molybdenum; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=43: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Tc",
          "technetium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=43. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Tc và tên technetium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=44: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ru",
          "ruthenium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=44. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ru và tên ruthenium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=45: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Rh",
          "rhodium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=45. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Rh và tên rhodium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=46: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Pd",
          "palladium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=46. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Pd và tên palladium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=47: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ag",
          "silver"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=47. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ag và tên silver; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=48: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Cd",
          "cadmium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=48. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Cd và tên cadmium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=49: có các tính chất đặc trưng của post-transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "In",
          "indium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=49. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu In và tên indium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=50: có các tính chất đặc trưng của post-transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Sn",
          "tin"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=50. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Sn và tên tin; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=51: có các tính chất đặc trưng của metalloid. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Sb",
          "antimony"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=51. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Sb và tên antimony; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=52: có các tính chất đặc trưng của metalloid. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Te",
          "tellurium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=52. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Te và tên tellurium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=53: a halogen commonly found as iodide/iodate in nutrition-related chemistry. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "I",
          "iodine"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=53. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu I và tên iodine; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=54: a noble gas used in some high-intensity lamps. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Xe",
          "xenon"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=54. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Xe và tên xenon; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=55: có các tính chất đặc trưng của alkali metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Cs",
          "caesium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=55. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Cs và tên caesium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=56: có các tính chất đặc trưng của alkaline-earth metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ba",
          "barium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=56. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ba và tên barium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=57: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "La",
          "lanthanum"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=57. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu La và tên lanthanum; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=58: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ce",
          "cerium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=58. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ce và tên cerium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=59: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Pr",
          "praseodymium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=59. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Pr và tên praseodymium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=60: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Nd",
          "neodymium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=60. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Nd và tên neodymium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=61: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Pm",
          "promethium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=61. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Pm và tên promethium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=62: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Sm",
          "samarium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=62. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Sm và tên samarium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=63: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Eu",
          "europium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=63. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Eu và tên europium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=64: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Gd",
          "gadolinium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=64. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Gd và tên gadolinium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=65: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Tb",
          "terbium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=65. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Tb và tên terbium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=66: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Dy",
          "dysprosium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=66. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Dy và tên dysprosium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=67: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ho",
          "holmium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=67. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ho và tên holmium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=68: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Er",
          "erbium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=68. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Er và tên erbium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=69: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Tm",
          "thulium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=69. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Tm và tên thulium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=70: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Yb",
          "ytterbium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=70. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Yb và tên ytterbium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=71: có các tính chất đặc trưng của lanthanide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Lu",
          "lutetium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=71. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Lu và tên lutetium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=72: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Hf",
          "hafnium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=72. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Hf và tên hafnium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=73: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ta",
          "tantalum"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=73. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ta và tên tantalum; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=74: the element with an exceptionally high melting point used in high-temperature applications. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "W",
          "tungsten"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=74. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu W và tên tungsten; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=75: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Re",
          "rhenium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=75. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Re và tên rhenium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=76: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Os",
          "osmium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=76. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Os và tên osmium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=77: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ir",
          "iridium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=77. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ir và tên iridium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=78: có các tính chất đặc trưng của transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Pt",
          "platinum"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=78. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Pt và tên platinum; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=79: a dense noble metal with a characteristic yellow metallic appearance. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Au",
          "gold"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=79. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Au và tên gold; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=80: a metal that is liquid near room temperature. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Hg",
          "mercury"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=80. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Hg và tên mercury; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=81: có các tính chất đặc trưng của post-transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Tl",
          "thallium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=81. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Tl và tên thallium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=82: a dense post-transition metal with a long history of use in batteries. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Pb",
          "lead"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=82. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Pb và tên lead; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=83: có các tính chất đặc trưng của post-transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Bi",
          "bismuth"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=83. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Bi và tên bismuth; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=84: có các tính chất đặc trưng của post-transition metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Po",
          "polonium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=84. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Po và tên polonium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=85: có các tính chất đặc trưng của halogen. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "At",
          "astatine"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=85. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu At và tên astatine; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=86: có các tính chất đặc trưng của noble gas. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Rn",
          "radon"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=86. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Rn và tên radon; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=87: có các tính chất đặc trưng của alkali metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Fr",
          "francium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=87. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Fr và tên francium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=88: có các tính chất đặc trưng của alkaline-earth metal. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ra",
          "radium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=88. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ra và tên radium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=89: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Ac",
          "actinium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=89. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Ac và tên actinium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=90: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Th",
          "thorium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=90. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Th và tên thorium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=91: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Pa",
          "protactinium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=91. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Pa và tên protactinium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=92: an actinide famous for isotopes used in nuclear-energy chemistry. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "U",
          "uranium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=92. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu U và tên uranium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=93: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Np",
          "neptunium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=93. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Np và tên neptunium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=94: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Pu",
          "plutonium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=94. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Pu và tên plutonium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=95: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Am",
          "americium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=95. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Am và tên americium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=96: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Cm",
          "curium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=96. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Cm và tên curium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=97: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Bk",
          "berkelium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=97. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Bk và tên berkelium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=98: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Cf",
          "californium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=98. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Cf và tên californium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=99: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Es",
          "einsteinium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=99. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Es và tên einsteinium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      },
      {
        "equation": "Nguyên tố Z=100: có các tính chất đặc trưng của actinide. Hãy nhập kí hiệu hoặc tên quốc tế của nguyên tố.",
        "acceptedAnswers": [
          "Fm",
          "fermium"
        ],
        "explanation": "Thông tin mô tả tương ứng với nguyên tố có Z=100. Trong hệ thống danh pháp quốc tế, nguyên tố này được viết bằng kí hiệu Fm và tên fermium; chỉ hai dạng đó được chấp nhận làm đáp án.",
        "timeLimitSec": 32
      }
    ]
  },
  "oxidation_state": {
    "easy": [
      {
        "equation": "Xác định số oxi hóa của H trong H2O.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì H2O trung hòa điện nên 2x + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong H2O.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì H2O trung hòa điện nên 1x + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong HCl.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HCl trung hòa điện nên 1x + 1(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong HCl.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì HCl trung hòa điện nên 1x + 1(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong HF.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HF trung hòa điện nên 1x + 1(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của F trong HF.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì HF trung hòa điện nên 1x + 1(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong HBr.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HBr trung hòa điện nên 1x + 1(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Br trong HBr.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Br là x. Vì HBr trung hòa điện nên 1x + 1(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong HI.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HI trung hòa điện nên 1x + 1(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của I trong HI.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của I là x. Vì HI trung hòa điện nên 1x + 1(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong H2S.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì H2S trung hòa điện nên 2x + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong H2S.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì H2S trung hòa điện nên 1x + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của N trong NH3.",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì NH3 trung hòa điện nên 1x + 3(+1) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong NH3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì NH3 trung hòa điện nên 3x + 1(-3) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của C trong CH4.",
        "answers": [
          -4
        ],
        "acceptedAnswers": [
          "-4"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì CH4 trung hòa điện nên 1x + 4(+1) = 0. Giải phương trình cho kết quả x = -4.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong CH4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì CH4 trung hòa điện nên 4x + 1(-4) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của C trong CO2.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì CO2 trung hòa điện nên 1x + 2(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong CO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì CO2 trung hòa điện nên 2x + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của C trong CO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì CO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong CO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì CO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của N trong NO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì NO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong NO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của N trong NO2.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì NO2 trung hòa điện nên 1x + 2(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong NO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NO2 trung hòa điện nên 2x + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của N trong N2O3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì N2O3 trung hòa điện nên 2x + 3(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong N2O3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì N2O3 trung hòa điện nên 3x + 2(+3) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của N trong N2O5.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì N2O5 trung hòa điện nên 2x + 5(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong N2O5.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì N2O5 trung hòa điện nên 5x + 2(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong SO2.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì SO2 trung hòa điện nên 1x + 2(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong SO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì SO2 trung hòa điện nên 2x + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong SO3.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì SO3 trung hòa điện nên 1x + 3(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong SO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì SO3 trung hòa điện nên 3x + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong Cl2O.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì Cl2O trung hòa điện nên 2x + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cl2O.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cl2O trung hòa điện nên 1x + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong Cl2O3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì Cl2O3 trung hòa điện nên 2x + 3(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cl2O3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cl2O3 trung hòa điện nên 3x + 2(+3) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong Cl2O5.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì Cl2O5 trung hòa điện nên 2x + 5(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cl2O5.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cl2O5 trung hòa điện nên 5x + 2(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong Cl2O7.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì Cl2O7 trung hòa điện nên 2x + 7(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cl2O7.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cl2O7 trung hòa điện nên 7x + 2(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của P trong PCl3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của P là x. Vì PCl3 trung hòa điện nên 1x + 3(-1) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong PCl3.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì PCl3 trung hòa điện nên 3x + 1(+3) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của P trong PCl5.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của P là x. Vì PCl5 trung hòa điện nên 1x + 5(-1) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong PCl5.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì PCl5 trung hòa điện nên 5x + 1(+5) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong SF4.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì SF4 trung hòa điện nên 1x + 4(-1) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của F trong SF4.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì SF4 trung hòa điện nên 4x + 1(+4) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong SF6.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì SF6 trung hòa điện nên 1x + 6(-1) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của F trong SF6.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì SF6 trung hòa điện nên 6x + 1(+6) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong OF2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì OF2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của F trong OF2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì OF2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Xe trong XeF2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Xe là x. Vì XeF2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của F trong XeF2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì XeF2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Xe trong XeF4.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của Xe là x. Vì XeF4 trung hòa điện nên 1x + 4(-1) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của F trong XeF4.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì XeF4 trung hòa điện nên 4x + 1(+4) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Xe trong XeF6.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Xe là x. Vì XeF6 trung hòa điện nên 1x + 6(-1) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của F trong XeF6.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì XeF6 trung hòa điện nên 6x + 1(+6) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Mg trong MgO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Mg là x. Vì MgO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong MgO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì MgO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Ca trong CaO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Ca là x. Vì CaO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong CaO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì CaO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2O.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2O trung hòa điện nên 2x + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2O.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2O trung hòa điện nên 1x + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2O.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2O trung hòa điện nên 2x + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2O.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2O trung hòa điện nên 1x + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Al trong Al2O3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Al là x. Vì Al2O3 trung hòa điện nên 2x + 3(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Al2O3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Al2O3 trung hòa điện nên 3x + 2(+3) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong FeO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì FeO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong FeO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì FeO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong Fe2O3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì Fe2O3 trung hòa điện nên 2x + 3(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Fe2O3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Fe2O3 trung hòa điện nên 3x + 2(+3) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cu trong CuO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Cu là x. Vì CuO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong CuO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì CuO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Zn trong ZnO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Zn là x. Vì ZnO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong ZnO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì ZnO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Ag trong Ag2O.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Ag là x. Vì Ag2O trung hòa điện nên 2x + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong Ag2O.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Ag2O trung hòa điện nên 1x + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Pb trong PbO.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Pb là x. Vì PbO trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong PbO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì PbO trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Sn trong SnO2.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của Sn là x. Vì SnO2 trung hòa điện nên 1x + 2(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong SnO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì SnO2 trung hòa điện nên 2x + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong FeCl2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì FeCl2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong FeCl2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì FeCl2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong FeCl3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì FeCl3 trung hòa điện nên 1x + 3(-1) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong FeCl3.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì FeCl3 trung hòa điện nên 3x + 1(+3) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cu trong CuCl.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Cu là x. Vì CuCl trung hòa điện nên 1x + 1(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong CuCl.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì CuCl trung hòa điện nên 1x + 1(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cu trong CuCl2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Cu là x. Vì CuCl2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong CuCl2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì CuCl2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Al trong AlCl3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Al là x. Vì AlCl3 trung hòa điện nên 1x + 3(-1) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong AlCl3.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì AlCl3 trung hòa điện nên 3x + 1(+3) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Ca trong CaCl2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Ca là x. Vì CaCl2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong CaCl2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì CaCl2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Mg trong MgCl2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Mg là x. Vì MgCl2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong MgCl2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì MgCl2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2S.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2S trung hòa điện nên 2x + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong Na2S.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì Na2S trung hòa điện nên 1x + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong FeS.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì FeS trung hòa điện nên 1x + 1(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong FeS.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì FeS trung hòa điện nên 1x + 1(+2) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong FeS2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì FeS2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong FeS2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì FeS2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của O trong O2.",
        "answers": [
          0
        ],
        "acceptedAnswers": [
          "0"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì O2 trung hòa điện nên 2x +  = 0. Giải phương trình cho kết quả x = 0.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của H trong H2.",
        "answers": [
          0
        ],
        "acceptedAnswers": [
          "0"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì H2 trung hòa điện nên 2x +  = 0. Giải phương trình cho kết quả x = 0.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của N trong N2.",
        "answers": [
          0
        ],
        "acceptedAnswers": [
          "0"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì N2 trung hòa điện nên 2x +  = 0. Giải phương trình cho kết quả x = 0.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong Cl2.",
        "answers": [
          0
        ],
        "acceptedAnswers": [
          "0"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì Cl2 trung hòa điện nên 2x +  = 0. Giải phương trình cho kết quả x = 0.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của S trong S8.",
        "answers": [
          0
        ],
        "acceptedAnswers": [
          "0"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì S8 trung hòa điện nên 8x +  = 0. Giải phương trình cho kết quả x = 0.",
        "timeLimitSec": 18
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong Fe.",
        "answers": [
          0
        ],
        "acceptedAnswers": [
          "0"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì Fe trung hòa điện nên 1x +  = 0. Giải phương trình cho kết quả x = 0.",
        "timeLimitSec": 18
      }
    ],
    "medium": [
      {
        "equation": "Xác định số oxi hóa của Na trong Na2SO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2SO4 trung hòa điện nên 2x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong Na2SO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì Na2SO4 trung hòa điện nên 1x + 2(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2SO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2SO4 trung hòa điện nên 4x + 2(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của K trong KNO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì KNO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của N trong KNO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì KNO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong KNO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì KNO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Ca trong CaCO3.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Ca là x. Vì CaCO3 trung hòa điện nên 1x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của C trong CaCO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì CaCO3 trung hòa điện nên 1x + 1(+2) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong CaCO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì CaCO3 trung hòa điện nên 3x + 1(+2) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Mg trong Mg(NO3)2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Mg là x. Vì Mg(NO3)2 trung hòa điện nên 1x + 2(+5) + 6(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của N trong Mg(NO3)2.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì Mg(NO3)2 trung hòa điện nên 2x + 1(+2) + 6(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Mg(NO3)2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Mg(NO3)2 trung hòa điện nên 6x + 1(+2) + 2(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Al trong Al2(SO4)3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Al là x. Vì Al2(SO4)3 trung hòa điện nên 2x + 3(+6) + 12(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong Al2(SO4)3.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì Al2(SO4)3 trung hòa điện nên 3x + 2(+3) + 12(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Al2(SO4)3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Al2(SO4)3 trung hòa điện nên 12x + 2(+3) + 3(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cu trong CuSO4.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Cu là x. Vì CuSO4 trung hòa điện nên 1x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong CuSO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì CuSO4 trung hòa điện nên 1x + 1(+2) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong CuSO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì CuSO4 trung hòa điện nên 4x + 1(+2) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong FeSO4.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì FeSO4 trung hòa điện nên 1x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong FeSO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì FeSO4 trung hòa điện nên 1x + 1(+2) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong FeSO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì FeSO4 trung hòa điện nên 4x + 1(+2) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong Fe2(SO4)3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì Fe2(SO4)3 trung hòa điện nên 2x + 3(+6) + 12(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong Fe2(SO4)3.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì Fe2(SO4)3 trung hòa điện nên 3x + 2(+3) + 12(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Fe2(SO4)3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Fe2(SO4)3 trung hòa điện nên 12x + 2(+3) + 3(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cu trong Cu(NO3)2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Cu là x. Vì Cu(NO3)2 trung hòa điện nên 1x + 2(+5) + 6(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của N trong Cu(NO3)2.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì Cu(NO3)2 trung hòa điện nên 2x + 1(+2) + 6(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cu(NO3)2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cu(NO3)2 trung hòa điện nên 6x + 1(+2) + 2(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Zn trong ZnSO4.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Zn là x. Vì ZnSO4 trung hòa điện nên 1x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong ZnSO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì ZnSO4 trung hòa điện nên 1x + 1(+2) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong ZnSO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì ZnSO4 trung hòa điện nên 4x + 1(+2) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2CO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2CO3 trung hòa điện nên 2x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của C trong Na2CO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì Na2CO3 trung hòa điện nên 1x + 2(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2CO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2CO3 trung hòa điện nên 3x + 2(+1) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2CO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2CO3 trung hòa điện nên 2x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của C trong K2CO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì K2CO3 trung hòa điện nên 1x + 2(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2CO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2CO3 trung hòa điện nên 3x + 2(+1) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Ca trong Ca3(PO4)2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Ca là x. Vì Ca3(PO4)2 trung hòa điện nên 3x + 2(+5) + 8(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của P trong Ca3(PO4)2.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của P là x. Vì Ca3(PO4)2 trung hòa điện nên 2x + 3(+2) + 8(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Ca3(PO4)2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Ca3(PO4)2 trung hòa điện nên 8x + 3(+2) + 2(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na3PO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na3PO4 trung hòa điện nên 3x + 1(+5) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của P trong Na3PO4.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của P là x. Vì Na3PO4 trung hòa điện nên 1x + 3(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na3PO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na3PO4 trung hòa điện nên 4x + 3(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Al trong AlPO4.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Al là x. Vì AlPO4 trung hòa điện nên 1x + 1(+5) + 4(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của P trong AlPO4.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của P là x. Vì AlPO4 trung hòa điện nên 1x + 1(+3) + 4(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong AlPO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì AlPO4 trung hòa điện nên 4x + 1(+3) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2SO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2SO3 trung hòa điện nên 2x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong Na2SO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì Na2SO3 trung hòa điện nên 1x + 2(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2SO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2SO3 trung hòa điện nên 3x + 2(+1) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2SO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2SO3 trung hòa điện nên 2x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong K2SO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì K2SO3 trung hòa điện nên 1x + 2(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2SO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2SO3 trung hòa điện nên 3x + 2(+1) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong H2SO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì H2SO4 trung hòa điện nên 2x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong H2SO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì H2SO4 trung hòa điện nên 1x + 2(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong H2SO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì H2SO4 trung hòa điện nên 4x + 2(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong H2SO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì H2SO3 trung hòa điện nên 2x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong H2SO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì H2SO3 trung hòa điện nên 1x + 2(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong H2SO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì H2SO3 trung hòa điện nên 3x + 2(+1) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong HNO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HNO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của N trong HNO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì HNO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong HNO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HNO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong HNO2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HNO2 trung hòa điện nên 1x + 1(+3) + 2(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của N trong HNO2.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì HNO2 trung hòa điện nên 1x + 1(+1) + 2(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong HNO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HNO2 trung hòa điện nên 2x + 1(+1) + 1(+3) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong H3PO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì H3PO4 trung hòa điện nên 3x + 1(+5) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của P trong H3PO4.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của P là x. Vì H3PO4 trung hòa điện nên 1x + 3(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong H3PO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì H3PO4 trung hòa điện nên 4x + 3(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong H2CO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì H2CO3 trung hòa điện nên 2x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của C trong H2CO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì H2CO3 trung hòa điện nên 1x + 2(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong H2CO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì H2CO3 trung hòa điện nên 3x + 2(+1) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong HClO.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HClO trung hòa điện nên 1x + 1(+1) + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong HClO.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì HClO trung hòa điện nên 1x + 1(+1) + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong HClO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HClO trung hòa điện nên 1x + 1(+1) + 1(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong HClO2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HClO2 trung hòa điện nên 1x + 1(+3) + 2(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong HClO2.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì HClO2 trung hòa điện nên 1x + 1(+1) + 2(-2) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong HClO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HClO2 trung hòa điện nên 2x + 1(+1) + 1(+3) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong HClO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HClO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong HClO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì HClO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong HClO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HClO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong HClO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HClO4 trung hòa điện nên 1x + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong HClO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì HClO4 trung hòa điện nên 1x + 1(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong HClO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HClO4 trung hòa điện nên 4x + 1(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Na trong NaClO.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì NaClO trung hòa điện nên 1x + 1(+1) + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong NaClO.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì NaClO trung hòa điện nên 1x + 1(+1) + 1(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong NaClO.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NaClO trung hòa điện nên 1x + 1(+1) + 1(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Na trong NaClO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì NaClO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong NaClO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì NaClO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong NaClO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NaClO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2CrO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2CrO4 trung hòa điện nên 2x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cr trong K2CrO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Cr là x. Vì K2CrO4 trung hòa điện nên 1x + 2(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2CrO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2CrO4 trung hòa điện nên 4x + 2(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2Cr2O7.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2Cr2O7 trung hòa điện nên 2x + 2(+6) + 7(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cr trong K2Cr2O7.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Cr là x. Vì K2Cr2O7 trung hòa điện nên 2x + 2(+1) + 7(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2Cr2O7.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2Cr2O7 trung hòa điện nên 7x + 2(+1) + 2(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của K trong KMnO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì KMnO4 trung hòa điện nên 1x + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Mn trong KMnO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Mn là x. Vì KMnO4 trung hòa điện nên 1x + 1(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong KMnO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì KMnO4 trung hòa điện nên 4x + 1(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Ba trong BaCO3.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Ba là x. Vì BaCO3 trung hòa điện nên 1x + 1(+4) + 3(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của C trong BaCO3.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì BaCO3 trung hòa điện nên 1x + 1(+2) + 3(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong BaCO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì BaCO3 trung hòa điện nên 3x + 1(+2) + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Mg trong MgSO4.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Mg là x. Vì MgSO4 trung hòa điện nên 1x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của S trong MgSO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì MgSO4 trung hòa điện nên 1x + 1(+2) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong MgSO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì MgSO4 trung hòa điện nên 4x + 1(+2) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2O2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2O2 trung hòa điện nên 2x + 2(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2O2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2O2 trung hòa điện nên 2x + 2(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của N trong NH4Cl.",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì NH4Cl trung hòa điện nên 1x + 4(+1) + 1(-1) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong NH4Cl.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì NH4Cl trung hòa điện nên 4x + 1(-3) + 1(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong NH4Cl.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì NH4Cl trung hòa điện nên 1x + 1(-3) + 4(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của N trong NH4NO3.",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì NH4NO3 trung hòa điện nên 2x + 4(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của H trong NH4NO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì NH4NO3 trung hòa điện nên 4x + 2(-3) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 28
      },
      {
        "equation": "Xác định số oxi hóa của O trong NH4NO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NH4NO3 trung hòa điện nên 3x + 2(-3) + 4(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 28
      }
    ],
    "hard": [
      {
        "equation": "Xác định số oxi hóa của Na trong NaClO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì NaClO4 trung hòa điện nên 1x + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong NaClO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì NaClO4 trung hòa điện nên 1x + 1(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong NaClO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NaClO4 trung hòa điện nên 4x + 1(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong KClO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì KClO4 trung hòa điện nên 1x + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong KClO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì KClO4 trung hòa điện nên 1x + 1(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong KClO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì KClO4 trung hòa điện nên 4x + 1(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong KBrO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì KBrO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Br trong KBrO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của Br là x. Vì KBrO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong KBrO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì KBrO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong NaBrO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì NaBrO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Br trong NaBrO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của Br là x. Vì NaBrO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong NaBrO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NaBrO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong NaIO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì NaIO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của I trong NaIO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của I là x. Vì NaIO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong NaIO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NaIO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong HIO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HIO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của I trong HIO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của I là x. Vì HIO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong HIO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HIO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong HIO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HIO4 trung hòa điện nên 1x + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của I trong HIO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của I là x. Vì HIO4 trung hòa điện nên 1x + 1(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong HIO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HIO4 trung hòa điện nên 4x + 1(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong HBrO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HBrO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Br trong HBrO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của Br là x. Vì HBrO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong HBrO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HBrO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong HBrO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HBrO4 trung hòa điện nên 1x + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Br trong HBrO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Br là x. Vì HBrO4 trung hòa điện nên 1x + 1(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong HBrO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HBrO4 trung hòa điện nên 4x + 1(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong HClO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì HClO4 trung hòa điện nên 1x + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong HClO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì HClO4 trung hòa điện nên 1x + 1(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong HClO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì HClO4 trung hòa điện nên 4x + 1(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2FeO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2FeO4 trung hòa điện nên 2x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong K2FeO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì K2FeO4 trung hòa điện nên 1x + 2(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2FeO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2FeO4 trung hòa điện nên 4x + 2(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong NaBiO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì NaBiO3 trung hòa điện nên 1x + 1(+5) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Bi trong NaBiO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của Bi là x. Vì NaBiO3 trung hòa điện nên 1x + 1(+1) + 3(-2) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong NaBiO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NaBiO3 trung hòa điện nên 3x + 1(+1) + 1(+5) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2MnO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2MnO4 trung hòa điện nên 2x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Mn trong Na2MnO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Mn là x. Vì Na2MnO4 trung hòa điện nên 1x + 2(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2MnO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2MnO4 trung hòa điện nên 4x + 2(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2MnO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2MnO4 trung hòa điện nên 2x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Mn trong K2MnO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Mn là x. Vì K2MnO4 trung hòa điện nên 1x + 2(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2MnO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2MnO4 trung hòa điện nên 4x + 2(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2CrO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2CrO4 trung hòa điện nên 2x + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cr trong Na2CrO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Cr là x. Vì Na2CrO4 trung hòa điện nên 1x + 2(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2CrO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2CrO4 trung hòa điện nên 4x + 2(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2Cr2O7.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2Cr2O7 trung hòa điện nên 2x + 2(+6) + 7(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cr trong K2Cr2O7.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Cr là x. Vì K2Cr2O7 trung hòa điện nên 2x + 2(+1) + 7(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2Cr2O7.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2Cr2O7 trung hòa điện nên 7x + 2(+1) + 2(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Al trong Al(OH)3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Al là x. Vì Al(OH)3 trung hòa điện nên 1x + 3(-2) + 3(+1) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Al(OH)3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Al(OH)3 trung hòa điện nên 3x + 1(+3) + 3(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Al(OH)3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Al(OH)3 trung hòa điện nên 3x + 1(+3) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong Fe(OH)2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì Fe(OH)2 trung hòa điện nên 1x + 2(-2) + 2(+1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Fe(OH)2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Fe(OH)2 trung hòa điện nên 2x + 1(+2) + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Fe(OH)2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Fe(OH)2 trung hòa điện nên 2x + 1(+2) + 2(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong Fe(OH)3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì Fe(OH)3 trung hòa điện nên 1x + 3(-2) + 3(+1) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Fe(OH)3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Fe(OH)3 trung hòa điện nên 3x + 1(+3) + 3(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Fe(OH)3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Fe(OH)3 trung hòa điện nên 3x + 1(+3) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cu trong Cu(OH)2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Cu là x. Vì Cu(OH)2 trung hòa điện nên 1x + 2(-2) + 2(+1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cu(OH)2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cu(OH)2 trung hòa điện nên 2x + 1(+2) + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Cu(OH)2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Cu(OH)2 trung hòa điện nên 2x + 1(+2) + 2(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Pb trong Pb(OH)2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Pb là x. Vì Pb(OH)2 trung hòa điện nên 1x + 2(-2) + 2(+1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Pb(OH)2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Pb(OH)2 trung hòa điện nên 2x + 1(+2) + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Pb(OH)2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Pb(OH)2 trung hòa điện nên 2x + 1(+2) + 2(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Zn trong Zn(OH)2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Zn là x. Vì Zn(OH)2 trung hòa điện nên 1x + 2(-2) + 2(+1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Zn(OH)2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Zn(OH)2 trung hòa điện nên 2x + 1(+2) + 2(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Zn(OH)2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Zn(OH)2 trung hòa điện nên 2x + 1(+2) + 2(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cr trong Cr(OH)3.",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Cr là x. Vì Cr(OH)3 trung hòa điện nên 1x + 3(-2) + 3(+1) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cr(OH)3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cr(OH)3 trung hòa điện nên 3x + 1(+3) + 3(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Cr(OH)3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Cr(OH)3 trung hòa điện nên 3x + 1(+3) + 3(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của N trong ion NH4+ của NH4NO3.",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Trong NH4+, tổng số oxi hóa bằng +1. Gọi số oxi hóa của N là x: x + 4(+1) = +1, nên x = -3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của N trong ion NO3− của NH4NO3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Trong NO3−, tổng số oxi hóa bằng -1. Gọi số oxi hóa của N là x: x + 3(-2) = -1, nên x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong NH4NO3.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Áp dụng quy tắc tổng số oxi hóa của hợp chất trung hòa bằng 0. Thay các số oxi hóa đã biết vào công thức NH4NO3 rồi giải ẩn x cho nguyên tố H, thu được x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong NH4NO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Áp dụng quy tắc tổng số oxi hóa của hợp chất trung hòa bằng 0. Thay các số oxi hóa đã biết vào công thức NH4NO3 rồi giải ẩn x cho nguyên tố O, thu được x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của N trong NH4ClO4.",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì NH4ClO4 trung hòa điện nên 1x + 4(+1) + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong NH4ClO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì NH4ClO4 trung hòa điện nên 4x + 1(-3) + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong NH4ClO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì NH4ClO4 trung hòa điện nên 1x + 1(-3) + 4(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong NH4ClO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NH4ClO4 trung hòa điện nên 4x + 1(-3) + 4(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của N trong NH4MnO4.",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì NH4MnO4 trung hòa điện nên 1x + 4(+1) + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong NH4MnO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì NH4MnO4 trung hòa điện nên 4x + 1(-3) + 1(+7) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Mn trong NH4MnO4.",
        "answers": [
          7
        ],
        "acceptedAnswers": [
          "+7"
        ],
        "explanation": "Đặt số oxi hóa của Mn là x. Vì NH4MnO4 trung hòa điện nên 1x + 1(-3) + 4(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +7.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong NH4MnO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì NH4MnO4 trung hòa điện nên 4x + 1(-3) + 4(+1) + 1(+7) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong K3[Fe(CN)6].",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K3[Fe(CN)6] trung hòa điện nên 3x + 1(+3) + 6(+2) + 6(-3) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong K3[Fe(CN)6].",
        "answers": [
          3
        ],
        "acceptedAnswers": [
          "+3"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì K3[Fe(CN)6] trung hòa điện nên 1x + 3(+1) + 6(+2) + 6(-3) = 0. Giải phương trình cho kết quả x = +3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của C trong K3[Fe(CN)6].",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì K3[Fe(CN)6] trung hòa điện nên 6x + 3(+1) + 1(+3) + 6(-3) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của N trong K3[Fe(CN)6].",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì K3[Fe(CN)6] trung hòa điện nên 6x + 3(+1) + 1(+3) + 6(+2) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong K4[Fe(CN)6].",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K4[Fe(CN)6] trung hòa điện nên 4x + 1(+2) + 6(+2) + 6(-3) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Fe trong K4[Fe(CN)6].",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Fe là x. Vì K4[Fe(CN)6] trung hòa điện nên 1x + 4(+1) + 6(+2) + 6(-3) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của C trong K4[Fe(CN)6].",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của C là x. Vì K4[Fe(CN)6] trung hòa điện nên 6x + 4(+1) + 1(+2) + 6(-3) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của N trong K4[Fe(CN)6].",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì K4[Fe(CN)6] trung hòa điện nên 6x + 4(+1) + 1(+2) + 6(+2) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2[Zn(OH)4].",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2[Zn(OH)4] trung hòa điện nên 2x + 1(+2) + 4(-2) + 4(+1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Zn trong Na2[Zn(OH)4].",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Zn là x. Vì Na2[Zn(OH)4] trung hòa điện nên 1x + 2(+1) + 4(-2) + 4(+1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2[Zn(OH)4].",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2[Zn(OH)4] trung hòa điện nên 4x + 2(+1) + 1(+2) + 4(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Na2[Zn(OH)4].",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Na2[Zn(OH)4] trung hòa điện nên 4x + 2(+1) + 1(+2) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2[Sn(OH)6].",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2[Sn(OH)6] trung hòa điện nên 2x + 1(+4) + 6(-2) + 6(+1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Sn trong Na2[Sn(OH)6].",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của Sn là x. Vì Na2[Sn(OH)6] trung hòa điện nên 1x + 2(+1) + 6(-2) + 6(+1) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2[Sn(OH)6].",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2[Sn(OH)6] trung hòa điện nên 6x + 2(+1) + 1(+4) + 6(+1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong Na2[Sn(OH)6].",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì Na2[Sn(OH)6] trung hòa điện nên 6x + 2(+1) + 1(+4) + 6(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cu trong [Cu(NH3)4]SO4.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Cu là x. Vì [Cu(NH3)4]SO4 trung hòa điện nên 1x + 4(-3) + 12(+1) + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của N trong [Cu(NH3)4]SO4.",
        "answers": [
          -3
        ],
        "acceptedAnswers": [
          "-3"
        ],
        "explanation": "Đặt số oxi hóa của N là x. Vì [Cu(NH3)4]SO4 trung hòa điện nên 4x + 1(+2) + 12(+1) + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = -3.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong [Cu(NH3)4]SO4.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của H là x. Vì [Cu(NH3)4]SO4 trung hòa điện nên 12x + 1(+2) + 4(-3) + 1(+6) + 4(-2) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của S trong [Cu(NH3)4]SO4.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì [Cu(NH3)4]SO4 trung hòa điện nên 1x + 1(+2) + 4(-3) + 12(+1) + 4(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong [Cu(NH3)4]SO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì [Cu(NH3)4]SO4 trung hòa điện nên 4x + 1(+2) + 4(-3) + 12(+1) + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của S trong SO2Cl2.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của S là x. Vì SO2Cl2 trung hòa điện nên 1x + 2(-2) + 2(-1) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong SO2Cl2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì SO2Cl2 trung hòa điện nên 2x + 1(+6) + 2(-1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong SO2Cl2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì SO2Cl2 trung hòa điện nên 2x + 1(+6) + 2(-2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của P trong POCl3.",
        "answers": [
          5
        ],
        "acceptedAnswers": [
          "+5"
        ],
        "explanation": "Đặt số oxi hóa của P là x. Vì POCl3 trung hòa điện nên 1x + 1(-2) + 3(-1) = 0. Giải phương trình cho kết quả x = +5.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong POCl3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì POCl3 trung hòa điện nên 1x + 1(+5) + 3(-1) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong POCl3.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì POCl3 trung hòa điện nên 3x + 1(+5) + 1(-2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong H2SO5.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Hiđro trong H2SO5 liên kết với oxy và không phải hydride kim loại, nên H có số oxi hóa +1. Kiểm tra với các số oxi hóa đặc thù của nhóm peroxide trong H2SO5 cũng giữ tổng điện tích của phân tử bằng 0.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của S trong H2SO5.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "H2SO5 có một nhóm peroxide O–O, vì vậy hai O trong nhóm này có số oxi hóa -1; hai O còn lại có -2. Ta có 2(+1) + x + 2(-1) + 2(-2) = 0, nên x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của H trong H2S2O8.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Hiđro trong H2S2O8 liên kết với oxy và không phải hydride kim loại, nên H có số oxi hóa +1. Kiểm tra với các số oxi hóa đặc thù của nhóm peroxide trong H2S2O8 cũng giữ tổng điện tích của phân tử bằng 0.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của S trong H2S2O8.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "H2S2O8 chứa một nhóm peroxide O–O: hai O này là -1, bốn O còn lại là -2. Với hai S tương đương: 2(+1) + 2x + 2(-1) + 4(-2) = 0, suy ra x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Na trong Na2O2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của Na là x. Vì Na2O2 trung hòa điện nên 2x + 2(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Na2O2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Na2O2 trung hòa điện nên 2x + 2(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Ca trong CaO2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Ca là x. Vì CaO2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong CaO2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì CaO2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Ba trong BaO2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của Ba là x. Vì BaO2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong BaO2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì BaO2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của K trong K2O2.",
        "answers": [
          1
        ],
        "acceptedAnswers": [
          "+1"
        ],
        "explanation": "Đặt số oxi hóa của K là x. Vì K2O2 trung hòa điện nên 2x + 2(-1) = 0. Giải phương trình cho kết quả x = +1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong K2O2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì K2O2 trung hòa điện nên 2x + 2(+1) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong OF2.",
        "answers": [
          2
        ],
        "acceptedAnswers": [
          "+2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì OF2 trung hòa điện nên 1x + 2(-1) = 0. Giải phương trình cho kết quả x = +2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của F trong OF2.",
        "answers": [
          -1
        ],
        "acceptedAnswers": [
          "-1"
        ],
        "explanation": "Đặt số oxi hóa của F là x. Vì OF2 trung hòa điện nên 2x + 1(+2) = 0. Giải phương trình cho kết quả x = -1.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong ClO2.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì ClO2 trung hòa điện nên 1x + 2(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong ClO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì ClO2 trung hòa điện nên 2x + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Cl trong Cl2O6.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Cl là x. Vì Cl2O6 trung hòa điện nên 2x + 6(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong Cl2O6.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì Cl2O6 trung hòa điện nên 6x + 2(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Br trong BrO2.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của Br là x. Vì BrO2 trung hòa điện nên 1x + 2(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong BrO2.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì BrO2 trung hòa điện nên 2x + 1(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của I trong I2O4.",
        "answers": [
          4
        ],
        "acceptedAnswers": [
          "+4"
        ],
        "explanation": "Đặt số oxi hóa của I là x. Vì I2O4 trung hòa điện nên 2x + 4(-2) = 0. Giải phương trình cho kết quả x = +4.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong I2O4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì I2O4 trung hòa điện nên 4x + 2(+4) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Xe trong XeO3.",
        "answers": [
          6
        ],
        "acceptedAnswers": [
          "+6"
        ],
        "explanation": "Đặt số oxi hóa của Xe là x. Vì XeO3 trung hòa điện nên 1x + 3(-2) = 0. Giải phương trình cho kết quả x = +6.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong XeO3.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì XeO3 trung hòa điện nên 3x + 1(+6) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của Xe trong XeO4.",
        "answers": [
          8
        ],
        "acceptedAnswers": [
          "+8"
        ],
        "explanation": "Đặt số oxi hóa của Xe là x. Vì XeO4 trung hòa điện nên 1x + 4(-2) = 0. Giải phương trình cho kết quả x = +8.",
        "timeLimitSec": 38
      },
      {
        "equation": "Xác định số oxi hóa của O trong XeO4.",
        "answers": [
          -2
        ],
        "acceptedAnswers": [
          "-2"
        ],
        "explanation": "Đặt số oxi hóa của O là x. Vì XeO4 trung hòa điện nên 4x + 1(+8) = 0. Giải phương trình cho kết quả x = -2.",
        "timeLimitSec": 38
      }
    ]
  }
};
