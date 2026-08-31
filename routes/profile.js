import express from "express";
import { db } from "../config/firebase.js";
import axios from "axios";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

// Mashhur anime personajlari - shulardan avatar tanlanadi
const CHARACTER_NAMES = [
  "Naruto Uzumaki",
  "Monkey D. Luffy",
  "Son Goku",
  "Itachi Uchiha",
  "Levi Ackerman",
  "Mikasa Ackerman",
  "Satoru Gojo",
  "Tanjiro Kamado",
  "Nezuko Kamado",
  "Light Yagami",
  "Edward Elric",
  "Zenitsu Agatsuma",
];

// Natijalarni serverda vaqtincha eslab qolish (har so'rovda AniList'ga
// qayta murojaat qilmaslik uchun)
let cachedAvatars = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 12; // 12 soat

async function fetchCharacterImage(name) {
  const query = `
    query ($search: String) {
      Character(search: $search) {
        image { large }
      }
    }
  `;
  const res = await axios.post(
    ANILIST_URL,
    { query, variables: { search: name } },
    { headers: { "Content-Type": "application/json" }, timeout: 8000 }
  );
  return res.data?.data?.Character?.image?.large || null;
}

async function getAvatarList() {
  const now = Date.now();
  if (cachedAvatars && now - cacheTime < CACHE_DURATION) {
    return cachedAvatars;
  }

  const results = [];
  for (let i = 0; i < CHARACTER_NAMES.length; i++) {
    try {
      const url = await fetchCharacterImage(CHARACTER_NAMES[i]);
      if (url) {
        results.push({ id: `avatar_${i + 1}`, name: CHARACTER_NAMES[i], url });
      }
    } catch (e) {
      // Agar bironta personaj topilmasa, shunchaki o'tkazib yuboramiz
    }
  }

  cachedAvatars = results;
  cacheTime = now;
  return results;
}

// GET /profile/avatars - barcha mavjud avatar variantlarini olish
router.get("/avatars", async (req, res) => {
  try {
    const avatars = await getAvatarList();
    res.json(avatars);
  } catch (err) {
    res.status(500).json({ error: "Avatarlarni olishda xatolik", details: err.message });
  }
});

// PUT /profile/avatar - foydalanuvchi avatarini o'rnatish
// body: { userId, avatarId, avatarUrl }
router.put("/avatar", async (req, res) => {
  try {
    const { userId, avatarId, avatarUrl } = req.body;

    if (!userId || !avatarId || !avatarUrl) {
      return res.status(400).json({ error: "userId, avatarId va avatarUrl kerak" });
    }

    await db.collection("users").doc(userId).update({
      avatarUrl,
      avatarId,
    });

    res.json({ message: "Avatar yangilandi", avatarUrl });
  } catch (err) {
    res.status(500).json({ error: "Avatarni yangilashda xatolik", details: err.message });
  }
});

export default router;