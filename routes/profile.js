import express from "express";
import { db } from "../config/firebase.js";

const router = express.Router();

// Oldindan belgilangan avatar variantlari (DiceBear - bepul, URL orqali ishlaydigan xizmat)
// Fayl yuklash shart emas - har biri shunchaki tashqi rasm manzili
const AVATAR_OPTIONS = [
  { id: "avatar_1", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Naruto&backgroundColor=b6e3f4" },
  { id: "avatar_2", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Sasuke&backgroundColor=c0aede" },
  { id: "avatar_3", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Luffy&backgroundColor=ffd5dc" },
  { id: "avatar_4", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Goku&backgroundColor=ffdfbf" },
  { id: "avatar_5", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Levi&backgroundColor=d1d4f9" },
  { id: "avatar_6", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Mikasa&backgroundColor=c0f4de" },
  { id: "avatar_7", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Eren&backgroundColor=f4c0c0" },
  { id: "avatar_8", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Tanjiro&backgroundColor=c0e4f4" },
  { id: "avatar_9", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Nezuko&backgroundColor=f4d9c0" },
  { id: "avatar_10", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Itachi&backgroundColor=e0c0f4" },
  { id: "avatar_11", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Gojo&backgroundColor=c0f4e8" },
  { id: "avatar_12", url: "https://api.dicebear.com/9.x/adventurer/png?seed=Zenitsu&backgroundColor=f4f0c0" },
];

// GET /profile/avatars - barcha mavjud avatar variantlarini olish
router.get("/avatars", (req, res) => {
  res.json(AVATAR_OPTIONS);
});

// PUT /profile/avatar - foydalanuvchi avatarini o'rnatish
// body: { userId, avatarId }
router.put("/avatar", async (req, res) => {
  try {
    const { userId, avatarId } = req.body;

    if (!userId || !avatarId) {
      return res.status(400).json({ error: "userId va avatarId kerak" });
    }

    const selected = AVATAR_OPTIONS.find((a) => a.id === avatarId);
    if (!selected) {
      return res.status(400).json({ error: "Noto'g'ri avatarId" });
    }

    await db.collection("users").doc(userId).update({
      avatarUrl: selected.url,
      avatarId: selected.id,
    });

    res.json({ message: "Avatar yangilandi", avatarUrl: selected.url });
  } catch (err) {
    res.status(500).json({ error: "Avatarni yangilashda xatolik", details: err.message });
  }
});

export default router;