import express from "express";
import { db } from "../config/firebase.js";

const router = express.Router();

// XP dan level hisoblash: har 100 XP = 1 level
function calculateLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

// Barcha mumkin bo'lgan badge'lar va ularning shartlari
const BADGE_DEFINITIONS = [
  {
    id: "first_step",
    name: "Birinchi qadam",
    description: "Birinchi anime'ni ro'yxatga qo'shdingiz",
    check: (stats) => stats.totalAnime >= 1,
  },
  {
    id: "anime_fan",
    name: "Anime muxlisi",
    description: "10 ta anime ro'yxatga qo'shildi",
    check: (stats) => stats.totalAnime >= 10,
  },
  {
    id: "collector_25",
    name: "Kolleksioner",
    description: "25 ta anime ro'yxatga qo'shildi",
    check: (stats) => stats.totalAnime >= 25,
  },
  {
    id: "dedicated_50",
    name: "Sodiq tomoshabin",
    description: "50 ta anime ro'yxatga qo'shildi",
    check: (stats) => stats.totalAnime >= 50,
  },
  {
    id: "hundred_club",
    name: "100 Anime Club",
    description: "100 ta anime ro'yxatga qo'shildi",
    check: (stats) => stats.totalAnime >= 100,
  },
  {
    id: "completionist_5",
    name: "Tugatuvchi",
    description: "5 ta anime'ni tugatdingiz",
    check: (stats) => stats.completedCount >= 5,
  },
  {
    id: "completionist_25",
    name: "Marafonchi",
    description: "25 ta anime'ni tugatdingiz",
    check: (stats) => stats.completedCount >= 25,
  },
  {
    id: "planner",
    name: "Rejachi",
    description: "10 ta anime'ni rejaga qo'shdingiz",
    check: (stats) => stats.planCount >= 10,
  },
  {
    id: "level_3",
    name: "O'sib boruvchi",
    description: "3-levelga yetdingiz",
    check: (stats) => stats.level >= 3,
  },
  {
    id: "level_5",
    name: "Tajribali",
    description: "5-levelga yetdingiz",
    check: (stats) => stats.level >= 5,
  },
  {
    id: "level_10",
    name: "Usta",
    description: "10-levelga yetdingiz",
    check: (stats) => stats.level >= 10,
  },
  {
    id: "level_20",
    name: "Afsonaviy",
    description: "20-levelga yetdingiz",
    check: (stats) => stats.level >= 20,
  },
];

// Foydalanuvchi shartlarga mos badge'larni tekshirish va yangilarini qaytarish
async function checkAndAwardBadges(userId, userRef, currentBadges, level) {
  const listSnapshot = await db
    .collection("anime_lists")
    .where("userId", "==", userId)
    .get();

  const allDocs = listSnapshot.docs.map((d) => d.data());
  const totalAnime = allDocs.length;
  const completedCount = allDocs.filter((d) => d.status === "completed").length;
  const planCount = allDocs.filter((d) => d.status === "plan_to_watch").length;

  const stats = { totalAnime, completedCount, planCount, level };
  const existingBadgeIds = (currentBadges || []).map((b) =>
    typeof b === "string" ? b : b.id
  );

  const newBadges = [];
  for (const badge of BADGE_DEFINITIONS) {
    if (!existingBadgeIds.includes(badge.id) && badge.check(stats)) {
      newBadges.push({ id: badge.id, name: badge.name, description: badge.description });
    }
  }

  if (newBadges.length > 0) {
    const updatedBadges = [...(currentBadges || []), ...newBadges];
    await userRef.update({ badges: updatedBadges });
  }

  return newBadges;
}

// POST /user/list/add
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

    const userRef = db.collection("users").doc(userId);
    const levelInfo = await db.runTransaction(async (t) => {
      const userSnap = await t.get(userRef);
      const currentXp = userSnap.data()?.xp || 0;
      const newXp = currentXp + 5;
      const newLevel = calculateLevel(newXp);
      t.update(userRef, { xp: newXp, level: newLevel });
      return {
        xp: newXp,
        level: newLevel,
        badges: userSnap.data()?.badges || [],
      };
    });

    const newBadges = await checkAndAwardBadges(
      userId,
      userRef,
      levelInfo.badges,
      levelInfo.level
    );

    res.json({
      message: "Ro'yxatga qo'shildi",
      xp: levelInfo.xp,
      level: levelInfo.level,
      newBadges,
    });
  } catch (err) {
    res.status(500).json({ error: "Ro'yxatga qo'shishda xatolik", details: err.message });
  }
});

// PUT /user/list/status
// body: { userId, animeId, status } - statusni o'zgartirish uchun (masalan completed'ga o'tkazish)
router.put("/status", async (req, res) => {
  try {
    const { userId, animeId, status } = req.body;

    if (!userId || !animeId || !status) {
      return res.status(400).json({ error: "userId, animeId va status maydonlari kerak" });
    }

    const docId = `${userId}_${animeId}`;
    await db.collection("anime_lists").doc(docId).update({
      status,
      updatedAt: new Date().toISOString(),
    });

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const currentBadges = userSnap.data()?.badges || [];
    const currentLevel = userSnap.data()?.level || 1;

    const newBadges = await checkAndAwardBadges(userId, userRef, currentBadges, currentLevel);

    res.json({ message: "Status yangilandi", newBadges });
  } catch (err) {
    res.status(500).json({ error: "Statusni yangilashda xatolik", details: err.message });
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