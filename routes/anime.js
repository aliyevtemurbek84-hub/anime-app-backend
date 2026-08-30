import express from "express";
import { searchAnime, getAnimeById, getAnimeByGenre } from "../services/anilist.js";

const router = express.Router();

// GET /anime/search?q=naruto
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Qidiruv so'zi kerak (q parametri)" });
    const results = await searchAnime(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Anime qidirishda xatolik", details: err.message });
  }
});

// GET /anime/:id
router.get("/:id", async (req, res) => {
  try {
    const anime = await getAnimeById(req.params.id);
    res.json(anime);
  } catch (err) {
    res.status(500).json({ error: "Anime topilmadi", details: err.message });
  }
});

// GET /anime/genre/:genreId
// Eslatma: AniList janr nomi bilan ishlaydi (masalan "Action"), raqam bilan emas
router.get("/genre/:genreId", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const results = await getAnimeByGenre(req.params.genreId, page);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Janr bo'yicha qidirishda xatolik", details: err.message });
  }
});

export default router;