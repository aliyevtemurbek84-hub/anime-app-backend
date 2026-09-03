import express from "express";
import { db } from "../config/firebase.js";
import { validateId, validateText, validateOptionalText } from "../services/utils/validate.js";

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

    const hostUserIdCheck = validateId(hostUserId, { fieldName: "hostUserId" });
    if (!hostUserIdCheck.valid) return res.status(400).json({ error: hostUserIdCheck.error });

    if (animeId == null || Number.isNaN(Number(animeId))) {
      return res.status(400).json({ error: "animeId to'g'ri raqam bo'lishi kerak" });
    }

    const scheduledDate = new Date(scheduledTime);
    if (!scheduledTime || Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "scheduledTime to'g'ri sana bo'lishi kerak" });
    }

    const hostUsernameCheck = validateOptionalText(hostUsername, { fieldName: "hostUsername", maxLength: 50 });
    if (!hostUsernameCheck.valid) return res.status(400).json({ error: hostUsernameCheck.error });

    const descriptionCheck = validateOptionalText(description, { fieldName: "description", maxLength: 500 });
    if (!descriptionCheck.valid) return res.status(400).json({ error: descriptionCheck.error });

    const resolvedHostUsername = hostUsernameCheck.value || "Foydalanuvchi";

    const partyRef = await db.collection("watch_parties").add({
      hostUserId,
      hostUsername: resolvedHostUsername,
      animeId,
      animeTitle: animeTitle || null,
      animeImage: animeImage || null,
      scheduledTime,
      description: descriptionCheck.value,
      participants: [{ userId: hostUserId, username: resolvedHostUsername }],
      reminderSent: false,
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

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

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
// body: { userId, username, text, isSpoiler }
router.post("/:partyId/messages", async (req, res) => {
  try {
    const { userId, username, text, isSpoiler } = req.body;
    const { partyId } = req.params;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const textCheck = validateText(text, { fieldName: "text", maxLength: 1000 });
    if (!textCheck.valid) return res.status(400).json({ error: textCheck.error });

    const usernameCheck = validateOptionalText(username, { fieldName: "username", maxLength: 50 });
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

    await db.collection("watch_party_messages").add({
      partyId,
      userId,
      username: usernameCheck.value || "Foydalanuvchi",
      text: textCheck.value,
      isSpoiler: isSpoiler === true,
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