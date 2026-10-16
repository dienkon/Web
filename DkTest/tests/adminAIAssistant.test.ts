import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildAdminSystemInstruction,
  parseActionsFromAiText,
  askAdminAssistant,
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
});
