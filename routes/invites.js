import express from "express";
import { db } from "../config/firebase.js";
import { sendNotification } from "../services/notificationService.js";

const router = express.Router();

// POST /invites/send
// body: { fromUserId, fromUsername, toUserId, animeId, animeTitle, animeImage }
router.post("/send", async (req, res) => {
  try {
    const { fromUserId, fromUsername, toUserId, animeId, animeTitle, animeImage } = req.body;

    if (!fromUserId || !toUserId || !animeId) {
      return res.status(400).json({ error: "fromUserId, toUserId va animeId kerak" });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: "O'zingizga taklif yubora olmaysiz" });
    }

    const inviteRef = await db.collection("watch_invites").add({
      fromUserId,
      fromUsername: fromUsername || "Foydalanuvchi",
      toUserId,
      animeId,
      animeTitle: animeTitle || null,
      animeImage: animeImage || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    sendNotification({
      userId: toUserId,
      title: "Yangi taklif!",
      body: `${fromUsername || "Do'stingiz"} sizni "${animeTitle || 'anime'}"ni birga ko'rishga taklif qildi`,
      type: "watch_invite",
      data: { inviteId: inviteRef.id, animeId },
    });

    res.json({ message: "Taklif yuborildi", inviteId: inviteRef.id });
  } catch (err) {
    res.status(500).json({ error: "Taklif yuborishda xatolik", details: err.message });
  }
});

// GET /invites/:userId
// Foydalanuvchiga kelgan takliflar (default: faqat pending)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = db.collection("watch_invites").where("toUserId", "==", userId);
    if (status) query = query.where("status", "==", status);

    const snapshot = await query.get();
    const invites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    invites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: "Takliflarni olishda xatolik", details: err.message });
  }
});

// PUT /invites/:inviteId/respond
// body: { response: "accepted" | "declined" }
router.put("/:inviteId/respond", async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { response } = req.body;

    if (!["accepted", "declined"].includes(response)) {
      return res.status(400).json({ error: "response 'accepted' yoki 'declined' bo'lishi kerak" });
    }

    const inviteRef = db.collection("watch_invites").doc(inviteId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return res.status(404).json({ error: "Taklif topilmadi" });
    }

    await inviteRef.update({ status: response });

    const invite = inviteDoc.data();
    if (response === "accepted") {
      sendNotification({
        userId: invite.fromUserId,
        title: "Taklif qabul qilindi!",
        body: `Taklifingiz qabul qilindi — birga tomosha qilish vaqti!`,
        type: "watch_invite_accepted",
        data: { inviteId, animeId: invite.animeId },
      });
    }

    res.json({ message: "Javob saqlandi" });
  } catch (err) {
    res.status(500).json({ error: "Javob berishda xatolik", details: err.message });
  }
});

export default router;