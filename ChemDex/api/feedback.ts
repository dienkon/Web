export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { rawOCR, finalEquation, rating, comment } = req.body || {};

    if (!rating) {
      return res
        .status(400)
        .json({ error: "Rating is required (like or dislike)." });
    }

    console.log("[Feedback]", {
      rawOCR: rawOCR || "",
      finalEquation: finalEquation || "",
      rating,
      comment: comment || "",
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, message: "Feedback received!" });
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to process feedback.",
      details: err?.message || String(err),
    });
  }
}
