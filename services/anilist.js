import axios from "axios";

const ANILIST_URL = "https://graphql.anilist.co";

// AniList GraphQL so'rovini yuborish uchun umumiy funksiya
async function anilistRequest(query, variables) {
  const res = await axios.post(
    ANILIST_URL,
    { query, variables },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 8000,
    }
  );
  return res.data.data;
}

// Har bir anime uchun kerakli maydonlar (GraphQL fragment)
const ANIME_FIELDS = `
  id
  title {
    romaji
    english
  }
  description
  coverImage {
    large
  }
  episodes
  averageScore
  genres
  status
  trailer {
    id
    site
  }
`;

// Anime qidirish (nom bo'yicha)
export async function searchAnime(query) {
  const gql = `
    query ($search: String) {
      Page(perPage: 15) {
        media(search: $search, type: ANIME) {
          ${ANIME_FIELDS}
        }
      }
    }
  `;
  const data = await anilistRequest(gql, { search: query });
  return data.Page.media.map(formatAnime);
}

// Bitta anime haqida to'liq ma'lumot (id - AniList ID)
export async function getAnimeById(id) {
  const gql = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${ANIME_FIELDS}
      }
    }
  `;
  const data = await anilistRequest(gql, { id: parseInt(id) });
  return formatAnime(data.Media);
}

// Janr bo'yicha anime ro'yxati
export async function getAnimeByGenre(genre, page = 1) {
  const gql = `
    query ($genre: String, $page: Int) {
      Page(page: $page, perPage: 15) {
        media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
          ${ANIME_FIELDS}
        }
      }
    }
  `;
  const data = await anilistRequest(gql, { genre, page });
  return data.Page.media.map(formatAnime);
}

// AniList javobini ilova uchun qulay formatga o'tkazish
function formatAnime(a) {
  return {
    malId: a.id, // Eslatma: bu endi AniList ID
    title: a.title?.romaji,
    titleEnglish: a.title?.english,
    synopsis: a.description?.replace(/<[^>]*>/g, ""), // HTML teglarini tozalash
    imageUrl: a.coverImage?.large,
    episodes: a.episodes,
    score: a.averageScore ? a.averageScore / 10 : null,
    genres: a.genres || [],
    status: a.status,
    trailerUrl:
      a.trailer?.site === "youtube"
        ? `https://www.youtube.com/watch?v=${a.trailer.id}`
        : null,
  };
}