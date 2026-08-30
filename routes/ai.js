import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /ai/recommend
// body: { message: "Solo Levelingga o'xshash anime top", mood: "hayajonli" (ixtiyoriy) }
router.post("/recommend", async (req, res) => {
  try {
    const { message, mood } = req.body;
    if (!message) return res.status(400).json({ error: "message maydoni kerak" });

    const systemPrompt = `Sen anime tavsiya beruvchi AI yordamchisan. Foydalanuvchi o'zbek tilida so'rov beradi.
Javobni albatta quyidagi JSON formatda qaytar, boshqa hech qanday matn qo'shma:
{
  "recommendations": [
    { "title": "Anime nomi", "reason": "Nega tavsiya qilinganining qisqa sababi (o'zbek tilida)" }
  ]
}
${mood ? `Foydalanuvchining hozirgi kayfiyati: ${mood}. Shuni hisobga ol.` : ""}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const text = response.content.find((c) => c.type === "text")?.text || "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "AI tavsiya berishda xatolik", details: err.message });
  }
});

export default router;
