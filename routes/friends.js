import express from "express";
import { db } from "../config/firebase.js";
import { validateId, validateText } from "../services/utils/validate.js";

const router = express.Router();

// POST /friends/add
// body: { userId, friendUsername }
router.post("/add", async (req, res) => {
  try {
    const { userId, friendUsername } = req.body;

    const userIdCheck = validateId(userId, { fieldName: "userId" });
    if (!userIdCheck.valid) return res.status(400).json({ error: userIdCheck.error });

    const friendUsernameCheck = validateText(friendUsername, { fieldName: "friendUsername", maxLength: 50 });
    if (!friendUsernameCheck.valid) return res.status(400).json({ error: friendUsernameCheck.error });

    const snapshot = await db
      .collection("users")
      .where("username", "==", friendUsernameCheck.value)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Bunday foydalanuvchi topilmadi" });
    }

    const friendDoc = snapshot.docs[0];
    const friendId = friendDoc.id;

    if (friendId === userId) {
      return res.status(400).json({ error: "O'zingizni do'st sifatida qo'sha olmaysiz" });
    }

    const userRef = db.collection("users").doc(userId);
    const friendRef = db.collection("users").doc(friendId);

    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const currentFriends = userSnap.data().friendsList || [];
    if (currentFriends.includes(friendId)) {
      return res.status(400).json({ error: "Bu foydalanuvchi allaqachon do'stlaringizda" });
    }

    await userRef.update({ friendsList: [...currentFriends, friendId] });

    const friendData = friendDoc.data();
    const friendCurrentFriends = friendData.friendsList || [];
    if (!friendCurrentFriends.includes(userId)) {
      await friendRef.update({ friendsList: [...friendCurrentFriends, userId] });
    }

    res.json({
      message: "Do'st qo'shildi",
      friend: { uid: friendId, username: friendData.username },
    });
  } catch (err) {
    res.status(500).json({ error: "Do'st qo'shishda xatolik", details: err.message });
  }
});

// GET /friends/:userId
router.get("/:userId", async (req, res) => {
  try {
    const userSnap = await db.collection("users").doc(req.params.userId).get();
    if (!userSnap.exists) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    const friendIds = userSnap.data().friendsList || [];
    if (friendIds.length === 0) return res.json([]);

    const friends = [];
    for (const fid of friendIds) {
      const fDoc = await db.collection("users").doc(fid).get();
      if (fDoc.exists) {
        friends.push({
          uid: fid,
          username: fDoc.data().username,
          level: fDoc.data().level || 1,
        });
      }
    }

    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: "Do'stlarni olishda xatolik", details: err.message });
  }
});

// GET /friends/:userId/activity
router.get("/:userId/activity", async (req, res) => {
  try {
    const userSnap = await db.collection("users").doc(req.params.userId).get();
    if (!userSnap.exists) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    const friendIds = userSnap.data().friendsList || [];
    if (friendIds.length === 0) return res.json([]);

    // Firestore "in" so'rovi bir vaqtda ko'pi bilan 10 ta qiymatni qabul qiladi
    const chunks = [];
    for (let i = 0; i < friendIds.length; i += 10) {
      chunks.push(friendIds.slice(i, i + 10));
    }

    let allActivity = [];
    for (const chunk of chunks) {
      const snapshot = await db
        .collection("anime_lists")
        .where("userId", "in", chunk)
        .get();
      allActivity = allActivity.concat(snapshot.docs.map((d) => d.data()));
    }

    const usernameMap = {};
    for (const fid of friendIds) {
      const fDoc = await db.collection("users").doc(fid).get();
      if (fDoc.exists) usernameMap[fid] = fDoc.data().username;
    }

    allActivity = allActivity
      .map((a) => ({ ...a, username: usernameMap[a.userId] || "Foydalanuvchi" }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 30);

    res.json(allActivity);
  } catch (err) {
    res.status(500).json({ error: "Faoliyatni olishda xatolik", details: err.message });
  }
});

export default router;