# Anime App Backend

Anime tracker + AI tavsiya tizimi uchun backend (Node.js + Express + Firebase + Claude AI).

## O'rnatish

1. Paketlarni o'rnatish:
```bash
npm install
```

2. `.env.example` faylini `.env` deb nusxalang va o'z API kalitingizni kiriting:
```bash
cp .env.example .env
```

3. Firebase sozlash:
   - [Firebase Console](https://console.firebase.google.com) da yangi loyiha yarating
   - Project Settings > Service Accounts > "Generate new private key"
   - Yuklab olingan faylni `config/serviceAccountKey.json` deb saqlang
   - Firestore Database'ni yoqing (test mode'da boshlashingiz mumkin)
   - Authentication > Sign-in method > Email/Password'ni yoqing

4. Serverni ishga tushirish:
```bash
npm run dev
```

Server `http://localhost:3000` da ishga tushadi.

## Mavjud endpoint'lar

### Auth
- `POST /auth/register` — { email, password, username }
- `GET /auth/user/:uid`

### Anime
- `GET /anime/search?q=naruto`
- `GET /anime/:id`
- `GET /anime/genre/:genreId?page=1`

### Foydalanuvchi ro'yxati
- `POST /user/list/add` — { userId, animeId, status, animeTitle, animeImage }
- `GET /user/list/:userId?status=watching`

### AI
- `POST /ai/recommend` — { message, mood }

## Keyingi bosqichlar (rejalashtirilgan, hali qo'shilmagan)

- Gamification (badge tizimi, level oshirish logikasi)
- Spoiler filtri (comments route'i)
- Watch Party (Socket.io kerak bo'ladi, real-time uchun)
- Kalendar / bildirishnomalar (cron job kerak bo'ladi)
- Mood-based tavsiya (ai.js dagi mood parametrini kengaytirish)

## Muhim eslatma

Bu ilova video hosting/streaming qilmaydi — faqat anime tracker, community va AI tavsiya
xizmati. Video kontent uchun foydalanuvchilar tashqi platformalarga (Crunchyroll va h.k.)
yo'naltiriladi. Bu mualliflik huquqi muammolaridan qochish uchun ataylab shunday
loyihalashtirilgan.
