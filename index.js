import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import animeRoutes from "./routes/anime.js";
import listRoutes from "./routes/list.js";
import aiRoutes from "./routes/ai.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Route guruhlari
app.use("/auth", authRoutes);
app.use("/anime", animeRoutes);
app.use("/user/list", listRoutes);
app.use("/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Anime App Backend ishlayapti" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi`);
});
