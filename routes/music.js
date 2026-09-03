import express from "express";
import { db } from "../config/firebase.js";

const router = express.Router();

// POST /music/add
// body: { userId, username, songTitle, artist, animeTitle, type, linkUrl }
// type: "OP" yoki "ED"
router.post("/add", async (req, res) => {
  try {
    const { userId, username, songTitle, artist, animeTitle, type, linkUrl } = req.body;

    if (!userId || !songTitle || !animeTitle || !type) {
      return res.status(400).json({
        error: "userId, songTitle, animeTitle va type maydonlari kerak",
      });
    }

    if (type !== "OP" && type !== "ED") {
      return res.status(400).json({ error: "type faqat OP yoki ED bo'lishi kerak" });
    }

    const musicRef = await db.collection("music").add({
      userId,
      username: username || "Foydalanuvchi",
      songTitle: songTitle.trim(),
      artist: artist || null,
      animeTitle: animeTitle.trim(),
      type,
      linkUrl: linkUrl || null,
      likes: [],
      createdAt: new Date().toISOString(),
    });

    res.json({ message: "Qo'shiq qo'shildi", musicId: musicRef.id });
  } catch (err) {
    res.status(500).json({ error: "Qo'shishda xatolik", details: err.message });
  }
});

// GET /music/list
router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("music").get();
    let list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Ro'yxatni olishda xatolik", details: err.message });
  }
});

// POST /music/:musicId/like
// body: { userId }
router.post("/:musicId/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const { musicId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId kerak" });
    }

    const musicRef = db.collection("music").doc(musicId);
    const musicDoc = await musicRef.get();

    if (!musicDoc.exists) {
      return res.status(404).json({ error: "Yozuv topilmadi" });
    }

    const likes = musicDoc.data().likes || [];
    const alreadyLiked = likes.includes(userId);
    const updatedLikes = alreadyLiked
      ? likes.filter((id) => id !== userId)
      : [...likes, userId];

    await musicRef.update({ likes: updatedLikes });

    res.json({
      message: alreadyLiked ? "Like olib tashlandi" : "Like bosildi",
      likes: updatedLikes,
      likeCount: updatedLikes.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Like bosishda xatolik", details: err.message });
  }
});

export default router;