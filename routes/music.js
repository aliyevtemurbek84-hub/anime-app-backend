import express from "express";
import { db } from "../config/firebase.js";
import { validateId, validateText, validateOptionalText, validateOptionalUrl } from "../services/utils/validate.js";

const router = express.Router();

// POST /music/add
// body: { userId, username, songTitle, artist, animeTitle, type, linkUrl }
// type: "OP" yoki "ED"
router.post("/add", async (req, res) => {
  try {
    const { userId, username, songTitle, artist, animeTitle, type, linkUrl } = req.body;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const songTitleCheck = validateText(songTitle, { fieldName: "songTitle", maxLength: 200 });
    if (!songTitleCheck.valid) return res.status(400).json({ error: songTitleCheck.error });

    const animeTitleCheck = validateText(animeTitle, { fieldName: "animeTitle", maxLength: 200 });
    if (!animeTitleCheck.valid) return res.status(400).json({ error: animeTitleCheck.error });

    if (type !== "OP" && type !== "ED") {
      return res.status(400).json({ error: "type faqat OP yoki ED bo'lishi kerak" });
    }

    const artistCheck = validateOptionalText(artist, { fieldName: "artist", maxLength: 150 });
    if (!artistCheck.valid) return res.status(400).json({ error: artistCheck.error });

    const usernameCheck = validateOptionalText(username, { fieldName: "username", maxLength: 50 });
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

    const linkCheck = validateOptionalUrl(linkUrl, { fieldName: "linkUrl" });
    if (!linkCheck.valid) return res.status(400).json({ error: linkCheck.error });

    const musicRef = await db.collection("music").add({
      userId,
      username: usernameCheck.value || "Foydalanuvchi",
      songTitle: songTitleCheck.value,
      artist: artistCheck.value,
      animeTitle: animeTitleCheck.value,
      type,
      linkUrl: linkCheck.value,
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

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

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