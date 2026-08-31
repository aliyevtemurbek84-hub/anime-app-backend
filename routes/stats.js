import express from "express";
import { db } from "../config/firebase.js";

const router = express.Router();

// GET /user/stats/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db
      .collection("anime_lists")
      .where("userId", "==", userId)
      .get();

    const allDocs = snapshot.docs.map((d) => d.data());

    const totalAnime = allDocs.length;
    const watchingCount = allDocs.filter((d) => d.status === "watching").length;
    const completedCount = allDocs.filter((d) => d.status === "completed").length;
    const planCount = allDocs.filter((d) => d.status === "plan_to_watch").length;
    const droppedCount = allDocs.filter((d) => d.status === "dropped").length;

    const totalEpisodesWatched = allDocs.reduce(
      (sum, d) => sum + (d.progress || 0),
      0
    );

    const completionRate =
      totalAnime > 0 ? Math.round((completedCount / totalAnime) * 100) : 0;

    res.json({
      totalAnime,
      watchingCount,
      completedCount,
      planCount,
      droppedCount,
      totalEpisodesWatched,
      completionRate,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Statistikani olishda xatolik", details: err.message });
  }
});

export default router;