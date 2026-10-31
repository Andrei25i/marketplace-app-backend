import { chatConfig } from "../config/chat.config";
import prisma from "../prisma";
import { getIO } from "../realtime/io";

let timer: NodeJS.Timeout | null = null;

const runSweep = async () => {
  try {
    const sockets = await getIO().fetchSockets();
    if (sockets.length === 0) return;

    const sessionIds = [...new Set(sockets.map((s) => s.data.sessionId))];

    const valid = await prisma.sessions.findMany({
      where: { id: { in: sessionIds }, expires_at: { gt: new Date() } },
      select: { id: true },
    });
    const validIds = new Set(valid.map((s) => s.id));

    let closed = 0;
    for (const socket of sockets) {
      if (!validIds.has(socket.data.sessionId)) {
        socket.disconnect(true);
        closed++;
      }
    }

    if (closed > 0) {
      console.log(
        `[socket] Sweep: ${closed} socket-uri cu sesiuni invalide închise.`,
      );
    }
  } catch (error) {
    console.error("[socket] Eroare la verificarea sesiunilor socket:", error);
  }
};

export const startSocketSessionSweep = () => {
  timer = setInterval(() => void runSweep(), chatConfig.socketSweepIntervalMs);
  timer.unref();
};

export const stopSocketSessionSweep = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
