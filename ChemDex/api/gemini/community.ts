import {
  callWithGeminiFallback,
  generateContentWithModelFallback,
  safeParseJson,
} from "./client";

const MAIN_MODEL = "gemini-3.5-flash-lite";

type ChatMessage = {
  role: "user" | "model";
  content: string;
};

type ModerationResult = {
  approved: boolean;
  reason: string;
};

type SearchResult = {
  matchingIds: string[];
  analysis: string;
};

async function generateText(prompt: string, systemInstruction: string) {
  return await callWithGeminiFallback(async (ai) => {
    return await generateContentWithModelFallback(
      ai,
      MAIN_MODEL,
      () => ({
        contents: prompt,
        config: {
          systemInstruction,
        },
      })
    );
  });
}

async function generateJson(prompt: string, systemInstruction: string) {
  return await callWithGeminiFallback(async (ai) => {
    return await generateContentWithModelFallback(
      ai,
      MAIN_MODEL,
      () => ({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      })
    );
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { action } = body ?? {};

    // =====================================================
    // ASK
    // =====================================================
    if (action === "ask") {
      const prompt =
        typeof body?.prompt === "string" ? body.prompt.trim() : "";

      if (!prompt) {
        return res.status(400).json({
          error: "No prompt provided",
        });
      }

      const response = await generateText(
        prompt,
        "Bạn là Trợ lý AI Hóa Học thông minh thuộc ứng dụng ChemDex. Trả lời chính xác, dễ hiểu, trình bày công thức hóa học và toán học bằng LaTeX. Sử dụng Markdown gọn, rõ, dễ đọc."
      );

      return res.status(200).json({
        text: response?.text ?? "",
      });
    }

    // =====================================================
    // CHAT
    // =====================================================
    if (action === "chat") {
      const messages = body?.messages;

      if (!Array.isArray(messages)) {
        return res.status(400).json({
          error: "Invalid messages format",
        });
      }

      const formattedContents = messages
        .filter(
          (m: any): m is ChatMessage =>
            m &&
            (m.role === "user" || m.role === "model") &&
            typeof m.content === "string"
        )
        .map((m: ChatMessage) => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));

      if (formattedContents.length === 0) {
        return res.status(400).json({
          error: "Messages không hợp lệ hoặc đang trống.",
        });
      }

      const response = await callWithGeminiFallback(async (ai) => {
        return await generateContentWithModelFallback(
          ai,
          MAIN_MODEL,
          () => ({
            contents: formattedContents as any,
            config: {
              systemInstruction:
                "Bạn là Trợ lý AI Hóa Học ChemDex (Gemini Chemistry Assistant). Giải đáp các bài tập hóa học từ phổ thông tới nâng cao, giải thích phản ứng, chuỗi hóa học, cân bằng phương trình, giải bài tập hóa học và tư vấn phương pháp học tập hiệu quả. Trình bày đẹp mắt bằng Markdown. Sử dụng LaTeX cho công thức hóa học, phương trình và ký hiệu toán học.",
            },
          })
        );
      });

      return res.status(200).json({
        text: response?.text ?? "",
      });
    }

    // =====================================================
    // MODERATE
    // =====================================================
    if (action === "moderate") {
      const text =
        typeof body?.text === "string" ? body.text.trim() : "";

      const type = body?.type === "post" ? "post" : "comment";

      if (!text) {
        return res.status(200).json({
          approved: true,
          reason: "Nội dung trống",
        });
      }

      try {
        const prompt = `Bạn là hệ thống kiểm duyệt nội dung tự động cho Diễn đàn Hóa Học ChemDex.

Kiểm tra xem nội dung ${type === "post" ? "bài viết" : "bình luận"} sau có vi phạm các quy tắc: xúc phạm, phản cảm, tục tĩu, quảng cáo rác, spam, phá hoại hay không.

Nội dung:
"${text}"

Hãy trả về DUY NHẤT JSON hợp lệ theo định dạng:
{
  "approved": true/false,
  "reason": "Lý do ngắn gọn nếu từ chối hoặc 'Phù hợp' nếu chấp nhận"
}

Không thêm Markdown.
Không thêm giải thích ngoài JSON.`;

        const response = await generateJson(prompt, "");
        const parsed = (safeParseJson(response?.text) || {}) as Partial<ModerationResult>;

        return res.status(200).json({
          approved: typeof parsed.approved === "boolean" ? parsed.approved : true,
          reason:
            typeof parsed.reason === "string" && parsed.reason.trim()
              ? parsed.reason
              : "Phù hợp",
        });
      } catch (modErr) {
        console.warn("Moderation fallback due to AI error:", modErr);
        return res.status(200).json({
          approved: true,
          reason: "Phù hợp (Dự phòng)",
        });
      }
    }

    // =====================================================
    // SEARCH POSTS
    // =====================================================
    if (action === "search-posts") {
      const searchQuery =
        typeof body?.query === "string" ? body.query.trim() : "";

      const posts = body?.posts;

      if (!searchQuery || !Array.isArray(posts)) {
        return res.status(200).json({
          matchingIds: [],
          analysis: "",
        });
      }

      try {
        const postSummaries = posts.map((p: any) => ({
          id: String(p?.id ?? ""),
          content: String(p?.content ?? ""),
          author: String(p?.authorName ?? ""),
        }));

        const prompt = `Người dùng đang tìm kiếm chủ đề: "${searchQuery}" trên diễn đàn Hóa Học ChemDex.

Danh sách các bài viết hiện có:
${JSON.stringify(postSummaries, null, 2)}

Nhiệm vụ:
1. Phân tích ngữ nghĩa từ khóa tìm kiếm.
2. Chọn các bài viết liên quan nhất.
3. Có thể xét cả từ đồng nghĩa hoặc chủ đề hóa học liên quan.
4. Trả về danh sách ID liên quan và 1 câu phân tích ngắn.

Trả về DUY NHẤT JSON:
{
  "matchingIds": ["id1", "id2"],
  "analysis": "AI Phân tích: ..."
}

Không thêm Markdown.
Không thêm giải thích ngoài JSON.`;

        const response = await generateJson(prompt, "");
        const parsed = (safeParseJson(response?.text) || {}) as Partial<SearchResult>;

        return res.status(200).json({
          matchingIds: Array.isArray(parsed.matchingIds)
            ? parsed.matchingIds.map(String)
            : [],
          analysis: typeof parsed.analysis === "string" ? parsed.analysis : "",
        });
      } catch (searchErr) {
        console.warn("Search posts fallback due to AI error:", searchErr);
        // Fallback: simple text match
        const matchingIds = posts
          .filter((p: any) =>
            String(p?.content || "").toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((p: any) => String(p?.id || ""));

        return res.status(200).json({
          matchingIds,
          analysis: "Tìm kiếm từ khóa cơ bản.",
        });
      }
    }

    return res.status(400).json({
      error:
        "action không hợp lệ. Sử dụng: ask, chat, moderate hoặc search-posts.",
    });
  } catch (error: any) {
    console.error("COMMUNITY GEMINI API ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi khi xử lý Community AI.",
    });
  }
}
