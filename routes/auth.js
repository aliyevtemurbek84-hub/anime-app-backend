import express from "express";
import axios from "axios";
import { authAdmin, db } from "../config/firebase.js";

const router = express.Router();

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /auth/register
// body: { email, password, username }
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res
        .status(400)
        .json({ error: "email, password va username maydonlari kerak" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Email formati noto'g'ri" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Parol kamida 6 belgidan iborat bo'lishi kerak" });
    }

    if (username.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Foydalanuvchi nomi kamida 2 belgidan iborat bo'lishi kerak" });
    }

    const userRecord = await authAdmin.createUser({
      email,
      password,
      displayName: username,
    });

    // Foydalanuvchi profilini Firestore'da yaratish
    await db.collection("users").doc(userRecord.uid).set({
      username,
      email,
      level: 1,
      xp: 0,
      badges: [],
      friendsList: [],
      createdAt: new Date().toISOString(),
    });

    res.json({ uid: userRecord.uid, message: "Ro'yxatdan o'tish muvaffaqiyatli" });
  } catch (err) {
    let message = "Ro'yxatdan o'tishda xatolik";
    if (err.code === "auth/email-already-exists") {
      message = "Bu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan";
    }
    res.status(400).json({ error: message, details: err.message });
  }
});

// POST /auth/login
// body: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email va password kerak" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Email formati noto'g'ri" });
    }

    // Firebase Auth REST API orqali parolni tekshirish
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { localId, idToken, email: userEmail } = response.data;

    // Firestore'dan foydalanuvchi profilini olish
    const userDoc = await db.collection("users").doc(localId).get();

    res.json({
      uid: localId,
      email: userEmail,
      idToken,
      profile: userDoc.exists ? userDoc.data() : null,
      message: "Kirish muvaffaqiyatli",
    });
  } catch (err) {
    const firebaseError = err.response?.data?.error?.message || err.message;
    res.status(401).json({ error: "Email yoki parol noto'g'ri", details: firebaseError });
  }
});

// PUT /auth/fcm-token
// body: { userId, fcmToken }
router.put("/fcm-token", async (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) {
    return res.status(400).json({ error: "userId va fcmToken talab qilinadi" });
  }
  try {
    await db.collection("users").doc(userId).update({ fcmToken });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Tokenni saqlashda xatolik" });
  }
});

// GET /auth/user/:uid
router.get("/user/:uid", async (req, res) => {

// GET /auth/user/:uid
router.get("/user/:uid", async (req, res) => {
  try {
    const doc = await db.collection("users").doc(req.params.uid).get();
    if (!doc.exists) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: "Xatolik", details: err.message });
  }
});

export default router;