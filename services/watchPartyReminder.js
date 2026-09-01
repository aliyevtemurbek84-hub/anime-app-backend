import cron from "node-cron";
import { db } from "../config/firebase.js";
import { sendNotification } from "./notificationService.js";

const REMINDER_WINDOW_MINUTES = 15;

async function checkUpcomingWatchParties() {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

    const snapshot = await db
      .collection("watch_parties")
      .where("reminderSent", "==", false)
      .get();

    for (const doc of snapshot.docs) {
      const party = doc.data();
      const startTime = new Date(party.scheduledTime);

      // Boshlanish vaqti hozirdan windowEnd oralig'ida (va o'tib ketmagan)
      if (startTime > now && startTime <= windowEnd) {
        const participants = party.participants || [];

        for (const p of participants) {
          sendNotification({
            userId: p.userId,
            title: "Ko'rish uchrashuvi boshlanmoqda!",
            body: `"${party.animeTitle || 'Anime'}" ${REMINDER_WINDOW_MINUTES} daqiqadan keyin boshlanadi`,
            type: "watchparty_reminder",
            data: { partyId: doc.id },
          });
        }

        await doc.ref.update({ reminderSent: true });
      }
    }
  } catch (e) {
    console.error("Watch party eslatmasini tekshirishda xatolik:", e.message);
  }
}

export function startWatchPartyReminderJob() {
  // Har 5 daqiqada bir marta tekshirish
  cron.schedule("*/5 * * * *", checkUpcomingWatchParties);
  console.log("Watch Party eslatma job'i ishga tushdi");
}