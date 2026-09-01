import express from "express";
import { db } from "../firebase.js";

const router = express.Router();

const MOOD_GENRES = {
  sad: ["Drama", "Sports"],
  funny: ["Comedy", "Slice of Life"],
  intense: ["Action", "Thriller", "Horror"],
  romantic: ["Romance"],
  thoughtful: ["Mystery", "Psychological", "Sci-Fi"],
};

const MOOD_LABELS_UZ = {
  sad: "Ma'yus / motivatsiya kerak",
  funny: "Kulgi kerak",
  intense: "Zo'riqish / qiziqarli his-tuyg'u",
  romantic: "Romantik kayfiyat",
  thoughtful: "Fikrlashni sevaman",
};

const ANILIST_QUERY = `
query ($genres: [String], $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(genre_in: $genres, type: ANIME, sort: SCORE_DESC, isAdult: false) {
      id
      title {
        romaji
        english
      }
      coverImage {
        large
      }
      averageScore
      genres
      description
      episodes
    }
  }
}
`;

router.get("/mood/:mood", async (req, res) => {
  const { mood } = req.params;
  const { userId } = req.query;

  const genres = MOOD_GENRES[mood];
  if (!genres) {
    return res.status(400).json({ error: "Noto'g'ri kayfiyat turi" });
  }

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { genres, page: 1, perPage: 20 },
      }),
    });

    const json = await response.json();
    let results = json?.data?.Page?.media || [];

    // Foydalanuvchi ro'yxatida bor animeларни chiqarib tashlash
    if (userId) {
      const listSnap = await db
        .collection("users")
        .doc(userId)
        .collection("animeList")
        .get();
      const existingIds = new Set(listSnap.docs.map((d) => d.id));
      results = results.filter((a) => !existingIds.has(String(a.id)));
    }

    res.json({
      mood,
      label: MOOD_LABELS_UZ[mood],
      results: results.slice(0, 12),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Tavsiyalarni olishda xatolik" });
  }
});

export default router;