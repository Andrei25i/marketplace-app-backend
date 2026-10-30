import prisma from "../prisma";
import { presenceStore } from "./presence.store";
import { sessionRoom, userRoom } from "./room";
import { AppServer } from "./types";

const saveLastSeen = async (userId: string) => {
  const now = new Date();

  try {
    await prisma.user_presence.upsert({
      where: { user_id: userId },
      create: { user_id: userId, last_seen_at: now },
      update: { last_seen_at: now },
    });
  } catch (error) {
    console.error("Eroare la savlarea last_seen_at:", error);
  }
};

export const registerConnectionHandlers = (io: AppServer) => {
  io.on("connection", (socket) => {
    const { userId, sessionId } = socket.data;

    void socket.join([userRoom(userId), sessionRoom(sessionId)]);
    presenceStore.add(userId, socket.id);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[socket] conectat ${socket.id} (user ${userId})`);
    }

    socket.on("disconnect", (reason) => {
      const wentOffline = presenceStore.remove(userId, socket.id);
      if (wentOffline) void saveLastSeen(userId);

      if (process.env.NODE_ENV !== "production") {
        console.log(`[socket] deconectat ${socket.id} (${reason})`);
      }
    });
  });
};
