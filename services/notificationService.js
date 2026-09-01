import { db, messaging } from "../config/firebase.js";

// Firestore'da bildirishnoma yozuvi yaratish + FCM push yuborish
export async function sendNotification({
  userId,
  title,
  body,
  type,
  data = {},
}) {
  try {
    // 1) Firestore'ga saqlash (ilova ichida ko'rish uchun, keyinroq kerak bo'lsa)
    await db.collection("users").doc(userId).collection("notifications").add({
      title,
      body,
      type,
      data,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 2) Foydalanuvchining FCM tokenini olish
    const userDoc = await db.collection("users").doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      // Foydalanuvchi hali push uchun ro'yxatdan o'tmagan (masalan ruxsat bermagan)
      return;
    }

    // 3) Push xabar yuborish
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    });
  } catch (e) {
    console.error("Bildirishnoma yuborishda xatolik:", e.message);
    // Xato bo'lsa ham asosiy amal (post yaratish, like bosish va h.k.) to'xtamasin
  }
}