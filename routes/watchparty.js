import express from "express";
import { db } from "../config/firebase.js";

const router = express.Router();

// POST /watchparty/create
// body: { hostUserId, hostUsername, animeId, animeTitle, animeImage, scheduledTime, description }
router.post("/create", async (req, res) => {
  try {
    const {
      hostUserId,
      hostUsername,
      animeId,
      animeTitle,
      animeImage,
      scheduledTime,
      description,
    } = req.body;

    if (!hostUserId || !animeId || !scheduledTime) {
      return res.status(400).json({
        error: "hostUserId, animeId va scheduledTime maydonlari kerak",
      });
    }

    const partyRef = await db.collection("watch_parties").add({
      hostUserId,
      hostUsername: hostUsername || "Foydalanuvchi",
      animeId,
      animeTitle: animeTitle || null,
      animeImage: animeImage || null,
      scheduledTime,
      description: description || null,
      participants: [{ userId: hostUserId, username: hostUsername || "Foydalanuvchi" }],
      createdAt: new Date().toISOString(),
    });

    res.json({ message: "Uchrashuv yaratildi", partyId: partyRef.id });
  } catch (err) {
    res.status(500).json({ error: "Uchrashuv yaratishda xatolik", details: err.message });
  }
});

// GET /watchparty/list
router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("watch_parties").get();
    const parties = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Vaqt bo'yicha tartiblash (yaqin kelayotgani birinchi)
    parties.sort(
      (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );

    res.json(parties);
  } catch (err) {
    res.status(500).json({ error: "Ro'yxatni olishda xatolik", details: err.message });
  }
});

// GET /watchparty/:partyId
router.get("/:partyId", async (req, res) => {
  try {
    const doc = await db.collection("watch_parties").doc(req.params.partyId).get();
    if (!doc.exists) return res.status(404).json({ error: "Uchrashuv topilmadi" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: "Xatolik", details: err.message });
  }
});

// POST /watchparty/:partyId/join
// body: { userId, username }
router.post("/:partyId/join", async (req, res) => {
  try {
    const { userId, username } = req.body;
    const { partyId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId kerak" });
    }

    const partyRef = db.collection("watch_parties").doc(partyId);
    const partyDoc = await partyRef.get();

    if (!partyDoc.exists) {
      return res.status(404).json({ error: "Uchrashuv topilmadi" });
    }

    const participants = partyDoc.data().participants || [];
    const alreadyJoined = participants.some((p) => p.userId === userId);

    if (!alreadyJoined) {
      participants.push({ userId, username: username || "Foydalanuvchi" });
      await partyRef.update({ participants });
    }

    res.json({ message: "Uchrashuvga qo'shildingiz", participants });
  } catch (err) {
    res.status(500).json({ error: "Qo'shilishda xatolik", details: err.message });
  }
});

// POST /watchparty/:partyId/messages
// body: { userId, username, text }
router.post("/:partyId/messages", async (req, res) => {
  try {
    const { userId, username, text } = req.body;
    const { partyId } = req.params;

    if (!userId || !text || !text.trim()) {
      return res.status(400).json({ error: "userId va text kerak" });
    }

    await db.collection("watch_party_messages").add({
      partyId,
      userId,
      username: username || "Foydalanuvchi",
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });

    res.json({ message: "Xabar yuborildi" });
  } catch (err) {
    res.status(500).json({ error: "Xabar yuborishda xatolik", details: err.message });
  }
});

// GET /watchparty/:partyId/messages
router.get("/:partyId/messages", async (req, res) => {
  try {
    const { partyId } = req.params;

    const snapshot = await db
      .collection("watch_party_messages")
      .where("partyId", "==", partyId)
      .get();

    const messages = snapshot.docs.map((doc) => doc.data());
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Xabarlarni olishda xatolik", details: err.message });
  }
});

export default router;