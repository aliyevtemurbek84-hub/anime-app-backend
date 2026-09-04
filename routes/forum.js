import express from "express";
import { db } from "../config/firebase.js";
import { sendNotification } from "../services/notificationService.js";
import { validateId, validateText, validateOptionalText } from "../services/utils/validate.js";
import { rateLimiter, checkBannedWords } from "../services/utils/moderation.js";

const router = express.Router();

// Ruxsat etilgan kategoriyalar
const CATEGORIES = ["discussion", "recommendations", "general"];

// POST /forum/post
// body: { userId, username, category, text }
router.post("/post", rateLimiter("forum_post", 5, 60), async (req, res) => {
  try {
    const { userId, username, category, text } = req.body;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Noto'g'ri kategoriya" });
    }

    const textCheck = validateText(text, { fieldName: "text", maxLength: 2000 });
    if (!textCheck.valid) return res.status(400).json({ error: textCheck.error });

    const bannedCheck = checkBannedWords(textCheck.value);
    if (!bannedCheck.clean) {
      return res.status(400).json({ error: "Matnda nomaqbul so'z aniqlandi" });
    }

    const usernameCheck = validateOptionalText(username, { fieldName: "username", maxLength: 50 });
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

    const postRef = await db.collection("forum_posts").add({
      userId,
      username: usernameCheck.value || "Foydalanuvchi",
      category,
      text: textCheck.value,
      likes: [],
      commentCount: 0,
      createdAt: new Date().toISOString(),
    });

    res.json({ message: "Post yaratildi", postId: postRef.id });
  } catch (err) {
    res.status(500).json({ error: "Post yaratishda xatolik", details: err.message });
  }
});

// GET /forum/posts?category=...
router.get("/posts", async (req, res) => {
  try {
    const { category } = req.query;

    let query = db.collection("forum_posts");
    if (category && category !== "all") {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.get();
    let posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Postlarni olishda xatolik", details: err.message });
  }
});

// POST /forum/post/:postId/like
// body: { userId }
router.post("/post/:postId/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const postRef = db.collection("forum_posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post topilmadi" });
    }

    const likes = postDoc.data().likes || [];
    const alreadyLiked = likes.includes(userId);

    const updatedLikes = alreadyLiked
      ? likes.filter((id) => id !== userId)
      : [...likes, userId];

    await postRef.update({ likes: updatedLikes });

    // Faqat yangi like bosilganda va post egasi boshqa odam bo'lsa xabar yuborish
    const postOwnerId = postDoc.data().userId;
    if (!alreadyLiked && postOwnerId && postOwnerId !== userId) {
      sendNotification({
        userId: postOwnerId,
        title: "Yangi like!",
        body: `Postingizga like bosishdi`,
        type: "forum_like",
        data: { postId },
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

// POST /forum/post/:postId/comment
// body: { userId, username, text }
router.post("/post/:postId/comment", rateLimiter("forum_comment", 10, 60), async (req, res) => {
  try {
    const { userId, username, text } = req.body;
    const { postId } = req.params;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const textCheck = validateText(text, { fieldName: "text", maxLength: 1000 });
    if (!textCheck.valid) return res.status(400).json({ error: textCheck.error });

    const bannedCheck = checkBannedWords(textCheck.value);
    if (!bannedCheck.clean) {
      return res.status(400).json({ error: "Matnda nomaqbul so'z aniqlandi" });
    }

    const usernameCheck = validateOptionalText(username, { fieldName: "username", maxLength: 50 });
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

    const postRef = db.collection("forum_posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post topilmadi" });
    }

    await db.collection("forum_comments").add({
      postId,
      userId,
      username: usernameCheck.value || "Foydalanuvchi",
      text: textCheck.value,
      createdAt: new Date().toISOString(),
    });

    const currentCount = postDoc.data().commentCount || 0;
    await postRef.update({ commentCount: currentCount + 1 });

    // Post egasi boshqa odam bo'lsa xabar yuborish
    const postOwnerId = postDoc.data().userId;
    if (postOwnerId && postOwnerId !== userId) {
      sendNotification({
        userId: postOwnerId,
        title: "Yangi izoh!",
        body: `${username || "Foydalanuvchi"} postingizga izoh qoldirdi`,
        type: "forum_comment",
        data: { postId },
      });
    }

    res.json({ message: "Izoh qo'shildi" });
  } catch (err) {
    res.status(500).json({ error: "Izoh qo'shishda xatolik", details: err.message });
  }
});

// GET /forum/post/:postId/comments
router.get("/post/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;

    const snapshot = await db
      .collection("forum_comments")
      .where("postId", "==", postId)
      .get();

    const comments = snapshot.docs.map((doc) => doc.data());
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Izohlarni olishda xatolik", details: err.message });
  }
});

export default router;