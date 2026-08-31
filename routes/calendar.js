import express from "express";
import axios from "axios";
import { db } from "../config/firebase.js";

const router = express.Router();
const ANILIST_URL = "https://graphql.anilist.co";

// Bir nechta anime uchun keyingi epizod ma'lumotini AniList'dan olish
async function getNextEpisodes(animeIds) {
  if (animeIds.length === 0) return [];

  const query = `
    query ($ids: [Int]) {
      Page(perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          id
          title { romaji english }
          coverImage { large }
          nextAiringEpisode {
            airingAt
            episode
            timeUntilAiring
          }
        }
      }
    }
  `;

  const res = await axios.post(
    ANILIST_URL,
    { query, variables: { ids: animeIds } },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );

  return res.data?.data?.Page?.media || [];
}

// GET /user/calendar/:userId
// Foydalanuvchining "watching" ro'yxatidagi anime'lar uchun kelayotgan epizodlar
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db
      .collection("anime_lists")
      .where("userId", "==", userId)
      .where("status", "==", "watching")
      .get();

    const animeIds = snapshot.docs.map((doc) => doc.data().animeId);

    if (animeIds.length === 0) {
      return res.json([]);
    }

    const mediaList = await getNextEpisodes(animeIds);

    // Faqat hali davom etayotgan (keyingi epizodi bor) anime'larni qoldiramiz
    const calendar = mediaList
      .filter((m) => m.nextAiringEpisode)
      .map((m) => ({
        animeId: m.id,
        animeTitle: m.title?.romaji || m.title?.english,
        animeImage: m.coverImage?.large,
        episode: m.nextAiringEpisode.episode,
        airingAt: m.nextAiringEpisode.airingAt,
        airingDate: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString(),
        timeUntilAiring: m.nextAiringEpisode.timeUntilAiring,
      }))
      .sort((a, b) => a.airingAt - b.airingAt);

    res.json(calendar);
  } catch (err) {
    res.status(500).json({ error: "Kalendarni olishda xatolik", details: err.message });
  }
});

export default router;