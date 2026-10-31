import { chatConfig } from "../config/chat.config";
import prisma from "../prisma";
import { AckResponse, PresenceDTO } from "../types/socket.type";
import { isUuid } from "../utils/isUuid";
import { presenceStore } from "./presence.store";
import { presenceRoom } from "./room";
import { AppServer, AppSocket } from "./types";

const parseUserIds = (payload: unknown): string[] => {
  if (typeof payload !== "object" || payload === null) return [];

  const raw = (payload as { userIds?: unknown }).userIds;
  if (!Array.isArray(raw)) return [];

  const ids = raw
    .filter((id): id is string => typeof id === "string" && isUuid(id))
    .map((id) => id.toLowerCase());

  return [...new Set(ids)].slice(0, chatConfig.presenceSubscribeLimit);
};

const filterConversationPeers = async (me: string, userIds: string[]) => {
  const rows = await prisma.conversations.findMany({
    where: {
      OR: [
        { user_low_id: me, user_high_id: { in: userIds } },
        { user_high_id: me, user_low_id: { in: userIds } },
      ],
    },
    select: { user_low_id: true, user_high_id: true },
  });

  return rows.map((row) =>
    row.user_low_id === me ? row.user_high_id : row.user_low_id,
  );
};

const getPresence = async (userIds: string[]): Promise<PresenceDTO[]> => {
  const rows = await prisma.user_presence.findMany({
    where: { user_id: { in: userIds } },
    select: { user_id: true, last_seen_at: true },
  });
  const lastSeen = new Map(rows.map((row) => [row.user_id, row.last_seen_at]));

  return userIds.map((userId) => ({
    userId,
    online: presenceStore.isOnline(userId),
    lastSeenAt: lastSeen.get(userId)?.toISOString() ?? null,
  }));
};

const saveLastSeen = async (userId: string, at: Date) => {
  await prisma.user_presence.upsert({
    where: { user_id: userId },
    create: { user_id: userId, last_seen_at: at },
    update: { last_seen_at: at },
  });
};

export const markOnline = (io: AppServer, userId: string, socketId: string) => {
  const isFirstSocket = presenceStore.add(userId, socketId);
  const returnedDuringGrace = presenceStore.cancelOffline(userId);

  if (isFirstSocket && !returnedDuringGrace) {
    io.to(presenceRoom(userId)).emit("presence:update", {
      userId,
      online: true,
      lastSeenAt: null,
    });
  }
};

export const markOffline = (
  io: AppServer,
  userId: string,
  socketId: string,
) => {
  const wasLastSocket = presenceStore.remove(userId, socketId);
  if (!wasLastSocket) return;

  presenceStore.scheduleOffine(userId, chatConfig.presenceGraceMs, () => {
    const now = new Date();

    saveLastSeen(userId, now)
      .catch((error: unknown) => {
        console.error("Eroare la încărcarea last_seen_at:", error);
      })
      .finally(() => {
        io.to(presenceRoom(userId)).emit("presence:update", {
          userId,
          online: false,
          lastSeenAt: now.toISOString(),
        });
      });
  });
};

export const registerPresenceHandlers = (socket: AppSocket) => {
  socket.on("presence:subscribe", (payload, ack) => {
    const reply = (response: AckResponse<PresenceDTO[]>) => {
      if (typeof ack === "function") ack(response);
    };

    const userIds = parseUserIds(payload);
    if (userIds.length === 0) return reply({ ok: true, data: [] });

    filterConversationPeers(socket.data.userId, userIds)
      .then(async (allowed) => {
        await socket.join(allowed.map(presenceRoom));
        reply({ ok: true, data: await getPresence(allowed) });
      })
      .catch((error: unknown) => {
        console.error("[socket] Eroare la presence:subscribe:", error);
        reply({ ok: false, error: "SERVER_ERROR" });
      });
  });

  socket.on("presence:unsubscribe", (payload) => {
    for (const userId of parseUserIds(payload)) {
      void socket.leave(presenceRoom(userId));
    }
  });
};
