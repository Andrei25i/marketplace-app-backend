import { sessionService } from "../services/session.service";

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;

const runCleanup = async () => {
  try {
    const deleted = await sessionService.cleanupExpired();
    if (deleted > 0) {
      console.log(`Curățare sesiuni: ${deleted} sesiuni expirate șterse.`);
    }
  } catch (error) {
    console.error("Eroare la curățarea sesiunilor:", error);
  }
};

export const startSessionCleanup = () => {
  void runCleanup();
  timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  timer.unref();
};

export const stopSessionCleanup = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
