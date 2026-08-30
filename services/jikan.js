import axios from "axios";

const JIKAN_BASE = "https://api.jikan.moe/v4";

// Jikan vaqti-vaqti bilan 504/503 xato beradi (MyAnimeList bilan bog'liq muammo).
// Shuning uchun har bir so'rovni bir necha marta qayta urinib ko'ramiz.
async function jikanRequest(url, params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, { params, timeout: 8000 });
      return res.data;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      const status = err.response?.status;
      const isRetryable = !status || status === 504 || status === 503 || status === 429;

      if (isLastAttempt || !isRetryable) {
        throw err;
      }

      // Qayta urinishdan oldin ozgina kutamiz (429 uchun ko'proq kutamiz)
      const waitMs = status === 429 ? 1500 : 500 * attempt;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

// Anime qidirish (nom bo'yicha)
export async function searchAnime(query) {
  const data = await jikanRequest(`${JIKAN_BASE}/anime`, { q: query, limit: 15 });
  return data.data.map(formatAnime);
}

// Bitta anime haqida to'liq ma'lumot
export async function getAnimeById(malId) {
  const data = await jikanRequest(`${JIKAN_BASE}/anime/${malId}/full`);
  return formatAnime(data.data);
}

// Janr bo'yicha anime ro'yxati
export async function getAnimeByGenre(genreId, page = 1) {
  const data = await jikanRequest(`${JIKAN_BASE}/anime`, {
    genres: genreId,
    page,
    order_by: "popularity",
  });
  return data.data.map(formatAnime);
}

// Jikan javobini ilova uchun qulay formatga o'tkazish
function formatAnime(a) {
  return {
    malId: a.mal_id,
    title: a.title,
    titleEnglish: a.title_english,
    synopsis: a.synopsis,
    imageUrl: a.images?.jpg?.large_image_url,
    episodes: a.episodes,
    score: a.score,
    genres: a.genres?.map((g) => g.name) || [],
    status: a.status,
    trailerUrl: a.trailer?.url,
  };
}