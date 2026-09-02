import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import animeRoutes from "./routes/anime.js";
import listRoutes from "./routes/list.js";
import aiRoutes from "./routes/ai.js";
import statsRoutes from "./routes/stats.js";
import watchpartyRoutes from "./routes/watchparty.js";
import friendsRoutes from "./routes/friends.js";
import profileRoutes from "./routes/profile.js";
import calendarRoutes from "./routes/calendar.js";
import forumRoutes from "./routes/forum.js";
import invitesRoutes from "./routes/invites.js";
import reelsRoutes from "./routes/reels.js";
import moodRoutes from "./routes/mood.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/anime", animeRoutes);
app.use("/user/list", listRoutes);
app.use("/ai", aiRoutes);
app.use("/user/stats", statsRoutes);
app.use("/watchparty", watchpartyRoutes);
app.use("/friends", friendsRoutes);
app.use("/profile", profileRoutes);
app.use("/user/calendar", calendarRoutes);
app.use("/forum", forumRoutes);
app.use("/invites", invitesRoutes);
app.use("/reels", reelsRoutes);
app.use("/anime", moodRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Anime App Backend ishlayapti" });
});

import { startWatchPartyReminderJob } from "./services/watchPartyReminder.js";
import { startEpisodeReminderJob } from "./services/episodeReminder.js";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi`);
  startWatchPartyReminderJob();
  startEpisodeReminderJob();
});