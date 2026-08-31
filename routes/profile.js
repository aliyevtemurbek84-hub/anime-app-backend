import express from "express";
import { db } from "../config/firebase.js";
import axios from "axios";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

// Mashhur anime personajlari - shulardan avatar tanlanadi
const CHARACTER_NAMES = [
  "Naruto Uzumaki",
  "Sasuke Uchiha",
  "Monkey D. Luffy",
  "Roronoa Zoro",
  "Son Goku",
  "Vegeta",
  "Itachi Uchiha",
  "Kakashi Hatake",
  "Levi",
  "Mikasa Ackerman",
  "Eren Yeager",
  "Armin Arlert",
  "Satoru Gojo",
  "Yuji Itadori",
  "Megumi Fushiguro",
  "Tanjiro Kamado",
  "Nezuko Kamado",
  "Zenitsu Agatsuma",
  "Inosuke Hashibira",
  "Light Yagami",
  "L Lawliet",
  "Edward Elric",
  "Alphonse Elric",
  "Izuku Midoriya",
  "Katsuki Bakugo",
  "Shoto Todoroki",
  "Ichigo Kurosaki",
  "Rukia Kuchiki",
  "Natsu Dragneel",
  "Lucy Heartfilia",
  "Killua Zoldyck",
  "Gon Freecss",
  "Saitama",
  "Genos",
  "Rimuru Tempest",
  "Ainz Ooal Gown",
  "Kirito",
  "Asuna Yuuki",
  "Rem",
  "Emilia",
  "Violet Evergarden",
  "Chika Fujiwara",
  "Kaguya Shinomiya",
  "Miyuki Shirogane",
  "Anya Forger",
  "Loid Forger",
  "Yor Forger",
  "Power",
  "Denji",
  "Makima",
  "Shigeo Kageyama",
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
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      // Agar bironta personaj topilmasa yoki xato bo'lsa, o'tkazib yuboramiz
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