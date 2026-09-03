import express from "express";
import { db } from "../config/firebase.js";
import { sendNotification } from "../services/notificationService.js";
import { validateId, validateText, validateOptionalText, validateOptionalUrl } from "../services/utils/validate.js";

const router = express.Router();

// POST /reels/create
// body: { userId, username, text, linkUrl, imageUrl }
router.post("/create", async (req, res) => {
  try {
    const { userId, username, text, linkUrl, imageUrl } = req.body;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const textCheck = validateText(text, { fieldName: "text", maxLength: 500 });
    if (!textCheck.valid) return res.status(400).json({ error: textCheck.error });

    const usernameCheck = validateOptionalText(username, { fieldName: "username", maxLength: 50 });
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

    const linkCheck = validateOptionalUrl(linkUrl, { fieldName: "linkUrl" });
    if (!linkCheck.valid) return res.status(400).json({ error: linkCheck.error });

    const imageCheck = validateOptionalUrl(imageUrl, { fieldName: "imageUrl" });
    if (!imageCheck.valid) return res.status(400).json({ error: imageCheck.error });

    const reelRef = await db.collection("reels").add({
      userId,
      username: usernameCheck.value || "Foydalanuvchi",
      text: textCheck.value,
      linkUrl: linkCheck.value,
      imageUrl: imageCheck.value,
      likes: [],
      createdAt: new Date().toISOString(),
    });

    res.json({ message: "Reel yaratildi", reelId: reelRef.id });
  } catch (err) {
    res.status(500).json({ error: "Reel yaratishda xatolik", details: err.message });
  }
});

// GET /reels/feed
// Eng yangi reel'lar birinchi
router.get("/feed", async (req, res) => {
  try {
    const snapshot = await db.collection("reels").get();
    let reels = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    reels.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(reels);
  } catch (err) {
    res.status(500).json({ error: "Reel'larni olishda xatolik", details: err.message });
  }
});

// POST /reels/:reelId/like
// body: { userId }
router.post("/:reelId/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const { reelId } = req.params;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const reelRef = db.collection("reels").doc(reelId);
    const reelDoc = await reelRef.get();

    if (!reelDoc.exists) {
      return res.status(404).json({ error: "Reel topilmadi" });
    }

    const likes = reelDoc.data().likes || [];
    const alreadyLiked = likes.includes(userId);

    const updatedLikes = alreadyLiked
      ? likes.filter((id) => id !== userId)
      : [...likes, userId];

    await reelRef.update({ likes: updatedLikes });

    // Xabar (faqat yangi like bo'lsa va o'ziga o'zi bosmagan bo'lsa)
    const ownerId = reelDoc.data().userId;
    if (!alreadyLiked && ownerId && ownerId !== userId) {
      sendNotification({
        userId: ownerId,
        title: "Yangi like!",
        body: `Reel'ingizga like bosishdi`,
        type: "reel_like",
        data: { reelId },
      });
    }

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