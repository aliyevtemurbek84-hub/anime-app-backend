import express from "express";
import { db } from "../config/firebase.js";

const router = express.Router();

// XP dan level hisoblash: har 100 XP = 1 level
function calculateLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

// POST /user/list/add
// body: { userId, animeId, status: "watching" | "completed" | "plan_to_watch" | "dropped" }
router.post("/add", async (req, res) => {
  try {
    const { userId, animeId, status, animeTitle, animeImage } = req.body;

    if (!userId || !animeId || !status) {
      return res.status(400).json({ error: "userId, animeId va status maydonlari kerak" });
    }

    const docId = `${userId}_${animeId}`;

    await db.collection("anime_lists").doc(docId).set(
      {
        userId,
        animeId,
        status,
        animeTitle: animeTitle || null,
        animeImage: animeImage || null,
        progress: 0,
        rating: null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Gamification: XP va level'ni birgalikda, xavfsiz (transaction) yangilash
    const userRef = db.collection("users").doc(userId);
    const levelInfo = await db.runTransaction(async (t) => {
      const userSnap = await t.get(userRef);
      const currentXp = userSnap.data()?.xp || 0;
      const newXp = currentXp + 5;
      const newLevel = calculateLevel(newXp);
      t.update(userRef, { xp: newXp, level: newLevel });
      return { xp: newXp, level: newLevel };
    });

    res.json({
      message: "Ro'yxatga qo'shildi",
      xp: levelInfo.xp,
      level: levelInfo.level,
    });
  } catch (err) {
    res.status(500).json({ error: "Ro'yxatga qo'shishda xatolik", details: err.message });
  }
});

// GET /user/list/:userId?status=watching
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = db.collection("anime_lists").where("userId", "==", userId);
    if (status) query = query.where("status", "==", status);

    const snapshot = await query.get();
    const list = snapshot.docs.map((doc) => doc.data());

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Ro'yxatni olishda xatolik", details: err.message });
  }
});

export default router;