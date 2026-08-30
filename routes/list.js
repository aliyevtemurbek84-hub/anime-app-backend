import express from "express";
import { db, FieldValue } from "../config/firebase.js";

const router = express.Router();

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

    // Gamification: ro'yxatga qo'shganda ozgina XP berish
    await db.collection("users").doc(userId).update({
      xp: FieldValue.increment(5),
    });

    res.json({ message: "Ro'yxatga qo'shildi" });
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