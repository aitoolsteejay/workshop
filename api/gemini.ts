import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { prompt, systemPrompt, image } = req.body || {};
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }
    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const parts: any[] = [
      {
        text: `${systemPrompt || "You are a B2B growth strategy expert. Return valid JSON when asked."}\n\n${prompt}`,
      },
    ];
    if (image?.data && image?.mimeType) {
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 16384,
          },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      if (response.status === 429) {
        res.status(429).json({ error: "Rate limited. Please try again in a moment." });
        return;
      }
      res.status(500).json({ error: "AI generation failed" });
      return;
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (data.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      console.error("Gemini response truncated: hit maxOutputTokens");
    }

    res.status(200).json({ result });
  } catch (e) {
    console.error("gemini error:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
