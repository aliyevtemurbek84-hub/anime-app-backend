import express from "express";
import { db } from "../config/firebase.js";
import { validateId, validateText, validateOptionalText, validateUrl } from "../services/utils/validate.js";

const router = express.Router();

const CURATED_TITLES = [
  "Attack on Titan",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "One Piece",
  "Naruto",
  "My Hero Academia",
  "Death Note",
  "Fullmetal Alchemist: Brotherhood",
  "Solo Leveling",
  "Chainsaw Man",
  "Spy x Family",
  "Tokyo Revengers",
  "Vinland Saga",
  "Bleach",
  "Hunter x Hunter",
  "One Punch Man",
  "Mob Psycho 100",
  "Violet Evergarden",
  "Your Lie in April",
  "Steins;Gate",
];

let curatedCache = null;
let curatedCacheTime = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 soat

async function fetchBannerForTitle(title) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title { romaji english }
        bannerImage
        coverImage { extraLarge }
      }
    }
  `;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: title } }),
  });

  const json = await res.json();
  const media = json?.data?.Media;
  if (!media) return null;

  return {
    id: media.id,
    animeTitle: media.title.english || media.title.romaji,
    imageUrl: media.bannerImage || media.coverImage?.extraLarge,
  };
}

// GET /wallpapers/curated
router.get("/curated", async (req, res) => {
  try {
    const now = Date.now();
    if (curatedCache && now - curatedCacheTime < CACHE_DURATION) {
      return res.json(curatedCache);
    }

    const results = [];
    for (const title of CURATED_TITLES) {
      try {
        const item = await fetchBannerForTitle(title);
        if (item && item.imageUrl) results.push(item);
      } catch (e) {
        // bitta anime muvaffaqiyatsiz bo'lsa, qolganini davom ettirish
      }
    }

    curatedCache = results;
    curatedCacheTime = now;

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Wallpaper'larni olishda xatolik", details: err.message });
  }
});

// POST /wallpapers/add
// body: { userId, username, animeTitle, imageUrl }
router.post("/add", async (req, res) => {
  try {
    const { userId, username, animeTitle, imageUrl } = req.body;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const animeTitleCheck = validateText(animeTitle, { fieldName: "animeTitle", maxLength: 200 });
    if (!animeTitleCheck.valid) return res.status(400).json({ error: animeTitleCheck.error });

    const imageCheck = validateUrl(imageUrl, { fieldName: "imageUrl" });
    if (!imageCheck.valid) return res.status(400).json({ error: imageCheck.error });

    const usernameCheck = validateOptionalText(username, { fieldName: "username", maxLength: 50 });
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

    const wallpaperRef = await db.collection("wallpapers").add({
      userId,
      username: usernameCheck.value || "Foydalanuvchi",
      animeTitle: animeTitleCheck.value,
      imageUrl: imageCheck.value,
      likes: [],
      createdAt: new Date().toISOString(),
    });

    res.json({ message: "Wallpaper qo'shildi", wallpaperId: wallpaperRef.id });
  } catch (err) {
    res.status(500).json({ error: "Qo'shishda xatolik", details: err.message });
  }
});

// GET /wallpapers/list
router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("wallpapers").get();
    let list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Ro'yxatni olishda xatolik", details: err.message });
  }
});

// POST /wallpapers/:wallpaperId/like
router.post("/:wallpaperId/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const { wallpaperId } = req.params;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const wpRef = db.collection("wallpapers").doc(wallpaperId);
    const wpDoc = await wpRef.get();

    if (!wpDoc.exists) {
      return res.status(404).json({ error: "Wallpaper topilmadi" });
    }

    const likes = wpDoc.data().likes || [];
    const alreadyLiked = likes.includes(userId);
    const updatedLikes = alreadyLiked
      ? likes.filter((id) => id !== userId)
      : [...likes, userId];

    await wpRef.update({ likes: updatedLikes });

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