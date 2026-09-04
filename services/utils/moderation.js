// Oddiy xotiradagi (in-memory) rate limiter va so'zlar filtri
// Eslatma: Render'ning bepul tarifi bitta instance ishlatgani uchun bu yetarli;
// agar kelajakda bir nechta server instance ishlatilsa, Redis kabi umumiy xotira kerak bo'ladi.

const requestLog = new Map(); // key: "action:userId" -> [timestamp, timestamp, ...]

export function rateLimiter(action, maxRequests, windowSeconds) {
  return (req, res, next) => {
    const userId = req.body?.userId || req.params?.userId || "anonymous";
    const key = `${action}:${userId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const timestamps = (requestLog.get(key) || []).filter(
      (t) => now - t < windowMs
    );

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        error: `Juda tez-tez yuboryapsiz. ${windowSeconds} soniyada ko'pi bilan ${maxRequests} marta bajarish mumkin. Biroz kuting.`,
      });
    }

    timestamps.push(now);
    requestLog.set(key, timestamps);
    next();
  };
}

// Oddiy taqiqlangan so'zlar ro'yxati (kerak bo'lsa kengaytiring)
const BANNED_WORDS = [
  // o'zbekcha va ruscha so'kinish so'zlari shu yerga qo'shiladi
];

export function checkBannedWords(text) {
  if (!text) return { clean: true };
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return { clean: false, word };
    }
  }
  return { clean: true };
}