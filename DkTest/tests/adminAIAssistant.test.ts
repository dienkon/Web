import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildAdminSystemInstruction,
  parseActionsFromAiText,
  askAdminAssistant,
  interpolateWorkflowParams,
  WorkflowExecutionContext,
} from "../src/services/ai/aiAdminAssistant";
import { GEMINI_3_5_FLASH_LITE } from "../src/services/ai/aiClient";

// Mock @google/genai
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContentStream: vi.fn(),
      };
      constructor() {}
    },
  };
});

describe("Admin AI Virtual Assistant (gemini-3.5-flash-lite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildAdminSystemInstruction", () => {
    it("includes gemini-3.5-flash-lite in system prompt", () => {
      const instruction = buildAdminSystemInstruction();
      expect(instruction).toContain(GEMINI_3_5_FLASH_LITE);
      expect(instruction).toContain("DkTEST Admin Autonomous AI Agent");
    });

    it("includes comprehensive admin route map", () => {
      const instruction = buildAdminSystemInstruction();
      expect(instruction).toContain("/admin/dashboard");
      expect(instruction).toContain("/admin/exams");
      expect(instruction).toContain("/admin/exams/new");
      expect(instruction).toContain("/admin/students");
      expect(instruction).toContain("/admin/wallet");
      expect(instruction).toContain("/admin/live-proctoring");
      expect(instruction).toContain("/admin/data-health");
      expect(instruction).toContain("/admin/settings");
    });

    it("defines full action block protocol including click, select, edit, and modal confirmations", () => {
      const instruction = buildAdminSystemInstruction();
      expect(instruction).toContain("NAVIGATE");
      expect(instruction).toContain("SEARCH");
      expect(instruction).toContain("FILL_FORM");
      expect(instruction).toContain("CLICK");
      expect(instruction).toContain("SELECT_OPTION");
      expect(instruction).toContain("EDIT_ITEM");
      expect(instruction).toContain("CONFIRM_MODAL");
      expect(instruction).toContain("TOGGLE_THEME");
      expect(instruction).toContain("TOGGLE_SIDEBAR");
      expect(instruction).toContain("TRIGGER_DATA_HEALTH");
      expect(instruction).toContain("RELOAD_DATA");
      expect(instruction).toContain("SCROLL");
      expect(instruction).toContain("COPY_TEXT");
      expect(instruction).toContain("CREATE_VOUCHER");
      expect(instruction).toContain("CREATE_EXAM_AI");
      expect(instruction).toContain("WORKFLOW");
    });

    it("embeds live page context and DOM summary when provided", () => {
      const context = {
        path: "/admin/exams",
        pageTitle: "Quản lý Đề thi",
        domSummary: "Bảng 1: Đề thi Toán 12 Học kỳ 1 | 45 phút | Công khai",
        userEmail: "superadmin@dktest.edu.vn",
        userRole: "admin",
      };
      const instruction = buildAdminSystemInstruction(context);
      expect(instruction).toContain("/admin/exams");
      expect(instruction).toContain("Quản lý Đề thi");
      expect(instruction).toContain("Đề thi Toán 12 Học kỳ 1");
      expect(instruction).toContain("superadmin@dktest.edu.vn");
    });
  });

  describe("parseActionsFromAiText", () => {
    it("extracts single action block and produces clean text", () => {
      const aiResponse = `Dạ, tôi sẽ chuyển bạn đến trang Tạo đề thi mới ngay bây giờ!
\`\`\`json:action
{
  "type": "NAVIGATE",
  "target": "/admin/exams/new",
  "label": "Chuyển tới trang Tạo đề thi mới"
}
\`\`\`
Bạn có cần tôi hỗ trợ gì thêm không?`;

      const { cleanText, actions } = parseActionsFromAiText(aiResponse);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("NAVIGATE");
      expect(actions[0].target).toBe("/admin/exams/new");
      expect(actions[0].label).toBe("Chuyển tới trang Tạo đề thi mới");

      expect(cleanText).not.toContain("```json:action");
      expect(cleanText).toContain("Dạ, tôi sẽ chuyển bạn đến trang Tạo đề thi mới ngay bây giờ!");
      expect(cleanText).toContain("Bạn có cần tôi hỗ trợ gì thêm không?");
    });

    it("extracts multiple actions and processes diverse types", () => {
      const aiResponse = `Đã tìm kiếm và cuộn trang:
\`\`\`json:action
{
  "type": "SEARCH",
  "query": "Học sinh 12A1",
  "label": "Tìm kiếm lớp 12A1"
}
\`\`\`
\`\`\`json:action
{
  "type": "SCROLL",
  "direction": "top",
  "label": "Cuộn lên đầu trang"
}
\`\`\``;

      const { cleanText, actions } = parseActionsFromAiText(aiResponse);

      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe("SEARCH");
      expect(actions[0].query).toBe("Học sinh 12A1");
      expect(actions[1].type).toBe("SCROLL");
      expect(actions[1].direction).toBe("top");
    });

    it("handles invalid json gracefully without throwing error", () => {
      const brokenResponse = `Lỗi cú pháp:
\`\`\`json:action
{ "type": "NAVIGATE", invalid_json
\`\`\`
Tiếp tục hỗ trợ.`;

      const { cleanText, actions } = parseActionsFromAiText(brokenResponse);
      expect(actions).toHaveLength(0);
      expect(cleanText).toContain("Lỗi cú pháp:");
    });

    it("does not remove regular markdown code blocks that are not actions", () => {
      const normalCode = `Dưới đây là đoạn code TypeScript:
\`\`\`typescript
const a: number = 42;
\`\`\`
Hết code.`;

      const { cleanText, actions } = parseActionsFromAiText(normalCode);
      expect(actions).toHaveLength(0);
      expect(cleanText).toContain("```typescript");
      expect(cleanText).toContain("const a: number = 42;");
    });

    it("parses CREATE_VOUCHER action block with parameters correctly", () => {
      const aiResponse = `Tôi sẽ tạo mã voucher giảm 50K ngay:
\`\`\`json:action
{
  "type": "CREATE_VOUCHER",
  "label": "Tạo Voucher GIAM50K (Giảm 50.000đ)",
  "params": {
    "code": "GIAM50K",
    "name": "Ưu đãi học sinh mới 50K",
    "type": "discount_fixed",
    "value": 50000,
    "minOrderVnd": 100000,
    "perUserLimit": 1,
    "isActive": true
  }
}
\`\`\`
Mã voucher đã sẵn sàng được kích hoạt!`;

      const { cleanText, actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("CREATE_VOUCHER");
      expect(actions[0].label).toBe("Tạo Voucher GIAM50K (Giảm 50.000đ)");
      expect(actions[0].params?.code).toBe("GIAM50K");
      expect(actions[0].params?.value).toBe(50000);
      expect(actions[0].params?.type).toBe("discount_fixed");
      expect(cleanText).not.toContain("```json:action");
      expect(cleanText).toContain("Tôi sẽ tạo mã voucher");
    });

    it("parses CREATE_EXAM_AI action block with parameters correctly", () => {
      const aiResponse = `Tôi sẽ tạo đề thi Toán 12 theo yêu cầu:
\`\`\`json:action
{
  "type": "CREATE_EXAM_AI",
  "label": "Tạo đề thi AI: Kiểm tra 15 phút Giải tích 12 Đạo hàm",
  "params": {
    "prompt": "Tạo đề kiểm tra 15 phút môn Toán 12 phần Đạo hàm gồm 5 câu trắc nghiệm...",
    "title": "Kiểm tra 15 phút Giải tích 12: Đạo hàm",
    "subject": "Toán học",
    "gradeCategory": "12",
    "timeLimit": 15,
    "autoSave": true
  }
}
\`\`\``;

      const { cleanText, actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("CREATE_EXAM_AI");
      expect(actions[0].params?.title).toBe("Kiểm tra 15 phút Giải tích 12: Đạo hàm");
      expect(actions[0].params?.timeLimit).toBe(15);
      expect(actions[0].params?.autoSave).toBe(true);
    });

    it("parses multi-step Make.com WORKFLOW action with nested steps", () => {
      const aiResponse = `Khởi chạy quy trình tự động hóa liên hoàn:
\`\`\`json:action
{
  "type": "WORKFLOW",
  "label": "Quy trình Make.com: Tạo Voucher + Tạo Đề thi AI + Điều hướng",
  "steps": [
    {
      "id": "step_vouch",
      "type": "CREATE_VOUCHER",
      "label": "Tạo Voucher TRIAN2026",
      "params": { "code": "TRIAN2026", "value": 20000 }
    },
    {
      "id": "step_exam",
      "type": "CREATE_EXAM_AI",
      "label": "Tạo đề thi Khảo sát Toán 12",
      "params": { "title": "Khảo sát Toán 12", "timeLimit": 15, "autoSave": true }
    },
    {
      "id": "step_nav",
      "type": "NAVIGATE",
      "label": "Chuyển tới Danh sách Đề thi",
      "target": "/admin/exams"
    }
  ]
}
\`\`\``;

      const { cleanText, actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("WORKFLOW");
      expect(actions[0].steps).toHaveLength(3);
      expect(actions[0].steps?.[0].type).toBe("CREATE_VOUCHER");
      expect(actions[0].steps?.[0].params?.code).toBe("TRIAN2026");
      expect(actions[0].steps?.[1].type).toBe("CREATE_EXAM_AI");
      expect(actions[0].steps?.[2].type).toBe("NAVIGATE");
      expect(actions[0].steps?.[2].target).toBe("/admin/exams");
    });

    it("parses JSON array of multiple actions within a single json block", () => {
      const aiResponse = `Đã phân tích yêu cầu của bạn:
\`\`\`json:action
[
  {
    "type": "LIST_VOUCHERS",
    "label": "Xem danh sách voucher"
  },
  {
    "type": "CREATE_VOUCHER",
    "label": "Tạo Voucher GIAM30K",
    "params": { "code": "GIAM30K", "value": 30000 }
  }
]
\`\`\`
Đang tiến hành xử lý...`;

      const { cleanText, actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe("LIST_VOUCHERS");
      expect(actions[1].type).toBe("CREATE_VOUCHER");
      expect(actions[1].params?.code).toBe("GIAM30K");
      expect(cleanText).not.toContain("LIST_VOUCHERS");
      expect(cleanText).toContain("Đang tiến hành xử lý...");
    });

    it("cleans trailing commas and comments before parsing JSON actions", () => {
      const aiResponse = `\`\`\`json:action
{
  // Cấu hình voucher giảm giá
  "type": "CREATE_VOUCHER",
  "label": "Tạo Voucher TEST_COMMA",
  "params": {
    "code": "TEST_COMMA",
    "value": 15000, /* 15k VNĐ */
  },
}
\`\`\``;

      const { actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("CREATE_VOUCHER");
      expect(actions[0].params?.code).toBe("TEST_COMMA");
      expect(actions[0].params?.value).toBe(15000);
    });

    it("parses DUPLICATE_EXAM and MERGE_EXAMS action blocks correctly", () => {
      const aiResponse = `\`\`\`json:action
{
  "type": "DUPLICATE_EXAM",
  "label": "Nhân bản đề thi",
  "params": {
    "examId": "ex_source_1",
    "newTitle": "Đề thi Toán 12 - Bản sao nâng cao"
  }
}
\`\`\`
\`\`\`json:action
{
  "type": "MERGE_EXAMS",
  "label": "Gộp 2 đề thi",
  "params": {
    "sourceExamIds": ["ex_1", "ex_2"],
    "title": "Đề thi tổng hợp Toán - Lý",
    "timeLimit": 90
  }
}
\`\`\``;

      const { actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe("DUPLICATE_EXAM");
      expect(actions[0].params?.examId).toBe("ex_source_1");
      expect(actions[1].type).toBe("MERGE_EXAMS");
      expect(actions[1].params?.sourceExamIds).toEqual(["ex_1", "ex_2"]);
      expect(actions[1].params?.timeLimit).toBe(90);
    });

    it("preserves URLs and text containing // and commas inside strings while cleaning comments", () => {
      const aiResponse = `\`\`\`json:action
{
  "type": "NAVIGATE",
  "label": "Mở liên kết tài liệu",
  "target": "https://dktest.edu.vn/admin/docs?ref=ai,assistant", // link tài liệu
  "text": "Kiểm tra tại https://google.com, chúc bạn thành công!",
}
\`\`\``;

      const { actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("NAVIGATE");
      expect(actions[0].target).toBe("https://dktest.edu.vn/admin/docs?ref=ai,assistant");
      expect(actions[0].text).toBe("Kiểm tra tại https://google.com, chúc bạn thành công!");
    });
  });

  describe("askAdminAssistant streaming execution", () => {
    it("calls generateContentStream with gemini-3.5-flash-lite as first model", async () => {
      const { getAiClient } = await import("../src/services/ai/aiClient");
      const client = getAiClient();
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: "Xin chào Admin! Tôi có thể giúp gì cho bạn?" };
        },
      };

      (client.models.generateContentStream as any).mockResolvedValueOnce(mockStream);

      const stream = await askAdminAssistant(
        [{ role: "user", text: "Trang này có bao nhiêu học sinh?" }],
        { path: "/admin/students", pageTitle: "Quản lý học sinh" }
      );

      expect(client.models.generateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-3.5-flash-lite",
        })
      );

      const chunks: string[] = [];
      for await (const chunk of stream) {
        if (chunk.text) chunks.push(chunk.text);
      }
      expect(chunks.join("")).toContain("Xin chào Admin");
    });

    it("sanitizes contents so conversation never starts with a model turn", async () => {
      const { getAiClient } = await import("../src/services/ai/aiClient");
      const client = getAiClient();
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: "Tôi đã sẵn sàng hỗ trợ!" };
        },
      };

      (client.models.generateContentStream as any).mockResolvedValueOnce(mockStream);

      // The client UI sends the initial welcome message with role: "model"
      await askAdminAssistant([
        { role: "model", text: "Chào Quản trị viên! Tôi là Trợ lý Ảo..." },
        { role: "user", text: "Trang này có bao nhiêu đề thi?" },
      ]);

      expect(client.models.generateContentStream).toHaveBeenCalled();
      const calledContents = (client.models.generateContentStream as any).mock.calls[0][0].contents;
      expect(calledContents[0].role).toBe("user");
      expect(calledContents[0].parts[0].text).toBe("Trang này có bao nhiêu đề thi?");
    });

    it("merges consecutive turns of the same role and filters out empty messages", async () => {
      const { getAiClient } = await import("../src/services/ai/aiClient");
      const client = getAiClient();
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: "Đã gộp thành công!" };
        },
      };

      (client.models.generateContentStream as any).mockResolvedValueOnce(mockStream);

      await askAdminAssistant([
        { role: "user", text: "Tin nhắn 1" },
        { role: "user", text: "Tin nhắn 2" },
        { role: "user", text: "   " }, // empty
      ]);

      const calledContents = (client.models.generateContentStream as any).mock.calls[0][0].contents;
      expect(calledContents).toHaveLength(1);
      expect(calledContents[0].role).toBe("user");
      expect(calledContents[0].parts).toHaveLength(2);
      expect(calledContents[0].parts[0].text).toBe("Tin nhắn 1");
      expect(calledContents[0].parts[1].text).toBe("Tin nhắn 2");
    });

    it("strips action json blocks formatted as ```json as well as ```json:action", () => {
      const aiResponse = `Đã hiểu yêu cầu!
\`\`\`json
{
  "type": "NAVIGATE",
  "target": "/admin/students",
  "label": "Chuyển tới Quản lý Học sinh"
}
\`\`\`
Hệ thống đang chuyển trang.`;

      const { cleanText, actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("NAVIGATE");
      expect(cleanText).not.toContain("```json");
      expect(cleanText).not.toContain('"NAVIGATE"');
      expect(cleanText).toContain("Đã hiểu yêu cầu!");
      expect(cleanText).toContain("Hệ thống đang chuyển trang.");
    });

    it("parses CLICK and SELECT_OPTION action types correctly", () => {
      const aiResponse = `\`\`\`json:action
{
  "type": "CLICK",
  "target": "Tạo đề thi mới",
  "label": "Bấm nút Tạo đề thi mới"
}
\`\`\`
\`\`\`json:action
{
  "type": "SELECT_OPTION",
  "field": "selectedSubject",
  "value": "Toán",
  "label": "Lọc theo môn Toán"
}
\`\`\``;

      const { actions } = parseActionsFromAiText(aiResponse);
      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe("CLICK");
      expect(actions[0].target).toBe("Tạo đề thi mới");
      expect(actions[1].type).toBe("SELECT_OPTION");
      expect(actions[1].field).toBe("selectedSubject");
      expect(actions[1].value).toBe("Toán");
    });

    it("falls back to candidate model when gemini-3.5-flash-lite returns 404 or unsupported", async () => {
      const { getAiClient } = await import("../src/services/ai/aiClient");
      const client = getAiClient();
      const notFoundError = new Error("models/gemini-3.5-flash-lite is not found for API version");
      const mockSuccessStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: "Phản hồi từ model dự phòng thành công!" };
        },
      };

      (client.models.generateContentStream as any)
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce(mockSuccessStream);

      const stream = await askAdminAssistant(
        [{ role: "user", text: "Kiểm tra hệ thống" }],
        { path: "/admin/dashboard" }
      );

      expect(client.models.generateContentStream).toHaveBeenCalledTimes(2);

      const chunks: string[] = [];
      for await (const chunk of stream) {
        if (chunk.text) chunks.push(chunk.text);
      }
      expect(chunks.join("")).toContain("Phản hồi từ model dự phòng");
    });
  });

  describe("interpolateWorkflowParams (Make.com Variable Interpolation)", () => {
    it("interpolates explicit step references like {{step_exam.examId}} and {{step_exam.title}}", () => {
      const context: WorkflowExecutionContext = {
        steps: {
          step_exam: {
            examId: "exam_math_123",
            title: "Khảo sát Toán 12 Học kỳ 1",
            questionCount: 40,
          },
        },
      };

      const rawAction = {
        id: "step_assign",
        type: "ASSIGN_HOMEWORK" as const,
        label: "Giao bài tập",
        status: "pending" as const,
        params: {
          examId: "{{step_exam.examId}}",
          examTitle: "{{step_exam.title}}",
          targetClass: "12A1",
        },
      };

      const resolved = interpolateWorkflowParams(rawAction, context);
      expect(resolved.params.examId).toBe("exam_math_123");
      expect(resolved.params.examTitle).toBe("Khảo sát Toán 12 Học kỳ 1");
      expect(resolved.params.targetClass).toBe("12A1");
    });

    it("interpolates step index references like {{step_1.code}}", () => {
      const context: WorkflowExecutionContext = {
        steps: {
          step_1: {
            code: "KM50K",
            id: "vouch_abc",
            value: 50000,
          },
        },
      };

      const rawAction = {
        id: "step_upd",
        type: "UPDATE_VOUCHER" as const,
        label: "Cập nhật voucher",
        status: "pending" as const,
        params: {
          id: "{{step_1.code}}",
          value: 60000,
        },
      };

      const resolved = interpolateWorkflowParams(rawAction, context);
      expect(resolved.params.id).toBe("KM50K");
      expect(resolved.params.value).toBe(60000);
    });

    it("provides contextual fallbacks for lastExamId and lastExamTitle when template variable is unresolved placeholder", () => {
      const context: WorkflowExecutionContext = {
        steps: {},
        lastExamId: "exam_fallback_789",
        lastExamTitle: "Đề thi Toán tốt nghiệp",
      };

      const rawAction = {
        id: "step_assign",
        type: "ASSIGN_HOMEWORK" as const,
        label: "Giao bài tập",
        status: "pending" as const,
        params: {
          examId: "{{examId}}",
          examTitle: "{{examTitle}}",
          targetClass: "12A2",
        },
      };

      const resolved = interpolateWorkflowParams(rawAction, context);
      expect(resolved.params.examId).toBe("exam_fallback_789");
      expect(resolved.params.examTitle).toBe("Đề thi Toán tốt nghiệp");
    });

    it("provides contextual fallback when action param examId is 'unknown'", () => {
      const context: WorkflowExecutionContext = {
        steps: {},
        lastExamId: "exam_auto_456",
        lastExamTitle: "Đề Lý 10",
      };

      const rawAction = {
        id: "step_assign",
        type: "ASSIGN_HOMEWORK" as const,
        label: "Giao bài tập",
        status: "pending" as const,
        params: {
          examId: "unknown",
          targetClass: "10B",
        },
      };

      const resolved = interpolateWorkflowParams(rawAction, context);
      expect(resolved.params.examId).toBe("exam_auto_456");
      expect(resolved.params.examTitle).toBe("Đề Lý 10");
    });

    it("interpolates variables in target, query, and text strings", () => {
      const context: WorkflowExecutionContext = {
        steps: {
          create_exam: {
            examId: "ex_new_99",
          },
        },
      };

      const navAction = {
        id: "step_nav",
        type: "NAVIGATE" as const,
        label: "Chuyển tới trang soạn thảo",
        status: "pending" as const,
        target: "/admin/exams/{{create_exam.examId}}/edit",
        params: {},
      };

      const resolved = interpolateWorkflowParams(navAction, context);
      expect(resolved.target).toBe("/admin/exams/ex_new_99/edit");
    });

    it("replaces multiple occurrences of template expressions in a single string", () => {
      const context: WorkflowExecutionContext = {
        steps: {
          s1: {
            code: "SALE20",
            examId: "ex_888",
          },
        },
      };

      const action = {
        id: "step_notify",
        type: "COPY_TEXT" as const,
        label: "Thông báo",
        status: "pending" as const,
        text: "Mã ưu đãi là {{s1.code}} áp dụng cho đề thi {{s1.examId}}!",
        params: {},
      };

      const resolved = interpolateWorkflowParams(action, context);
      expect(resolved.text).toBe("Mã ưu đãi là SALE20 áp dụng cho đề thi ex_888!");
    });
  });
});
