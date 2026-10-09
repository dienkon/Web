export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { examTitle, examCode, studentEmail, questionIndex, originalIndex, questionText, reason } = req.body || {};

  if (!reason || typeof reason !== "string") {
    return res.status(400).json({ error: "missing_reason", message: "Vui lòng nhập lý do báo cáo." });
  }

  const webhookUrl =
    process.env.DISCORD_REPORT_WEBHOOK_URL ||
    "https://discord.com/api/webhooks/1500812404190085120/R1oclYbsjomTS5AUdbVkCD1hw1FqZZhb8LzvrfsyJVozADVmXWDlf4Mk3HlGUKqRI8zn";

  const payload = {
    embeds: [
      {
        title: "🚩 BÁO CÁO CÂU HỎI BÀI THI CÓ LỖI",
        color: 15158332,
        fields: [
          {
            name: "📌 Thông tin bài thi",
            value: `**Tên:** ${examTitle || "N/A"}\n**Mã đề:** \`${examCode || "N/A"}\``,
            inline: false,
          },
          {
            name: "👤 Thí sinh báo cáo",
            value: `\`${studentEmail || "Thí sinh"}\``,
            inline: true,
          },
          {
            name: "🔢 Vị trí câu hỏi",
            value: `Đề hiện tại: **Câu ${(questionIndex ?? 0) + 1}**\nĐề gốc: **Câu ${(originalIndex ?? 0) + 1}**`,
            inline: true,
          },
          {
            name: "❓ Nội dung câu hỏi",
            value: questionText ? String(questionText).substring(0, 300) : "(Trống)",
            inline: false,
          },
          {
            name: "📝 Lý do báo cáo từ thí sinh",
            value: String(reason).trim().substring(0, 500),
            inline: false,
          },
        ],
        footer: {
          text: "Hệ thống báo cáo tự động DkTEST",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord Webhook failed with status ${response.status}`);
    }

    return res.status(200).json({ success: true, message: "Đã gửi báo cáo thành công!" });
  } catch (err: any) {
    console.error("[api/report-question] Failed:", err);
    return res.status(500).json({ error: "discord_error", message: "Không thể gửi báo cáo tới Discord." });
  }
}
