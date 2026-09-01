import cron from "node-cron";
import axios from "axios";
import { db } from "../config/firebase.js";
import { sendNotification } from "./notificationService.js";

const ANILIST_URL = "https://graphql.anilist.co";
const REMINDER_WINDOW_MINUTES = 30;

async function getNextEpisodesBatch(animeIds) {
  const query = `
    query ($ids: [Int]) {
      Page(perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          id
          title { romaji english }
          nextAiringEpisode { airingAt episode }
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

async function checkUpcomingEpisodes() {
  try {
    const snapshot = await db
      .collection("anime_lists")
      .where("status", "==", "watching")
      .get();

    if (snapshot.empty) return;

    // animeId -> [ {docRef, userId, lastNotifiedEpisode} ]
    const byAnime = {};
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!byAnime[data.animeId]) byAnime[data.animeId] = [];
      byAnime[data.animeId].push({
        docRef: doc.ref,
        userId: data.userId,
        lastNotifiedEpisode: data.lastNotifiedEpisode || null,
      });
    }

    const animeIds = Object.keys(byAnime).map(Number);
    if (animeIds.length === 0) return;

    // AniList so'roviga ko'pi bilan 50 tadan yuboramiz
    const chunks = [];
    for (let i = 0; i < animeIds.length; i += 50) {
      chunks.push(animeIds.slice(i, i + 50));
    }

    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

    for (const chunk of chunks) {
      const mediaList = await getNextEpisodesBatch(chunk);

      for (const media of mediaList) {
        const next = media.nextAiringEpisode;
        if (!next) continue;

        const airingDate = new Date(next.airingAt * 1000);
        if (airingDate <= now || airingDate > windowEnd) continue;

        const title = media.title?.romaji || media.title?.english || "Anime";
        const watchers = byAnime[media.id] || [];

        for (const w of watchers) {
          if (w.lastNotifiedEpisode === next.episode) continue; // allaqachon xabar berilgan

          sendNotification({
            userId: w.userId,
            title: "Yangi epizod tez orada!",
            body: `"${title}" ${next.episode}-epizodi ${REMINDER_WINDOW_MINUTES} daqiqadan keyin chiqadi`,
            type: "episode_reminder",
            data: { animeId: media.id, episode: next.episode },
          });

          w.docRef.update({ lastNotifiedEpisode: next.episode }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error("Epizod eslatmasini tekshirishda xatolik:", e.message);
  }
}

export function startEpisodeReminderJob() {
  // Har 30 daqiqada bir marta tekshirish
  cron.schedule("*/30 * * * *", checkUpcomingEpisodes);
  console.log("Epizod eslatma job'i ishga tushdi");
}