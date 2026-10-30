import { DeliveryBatch, MessagesService } from "../services/messages.service";
import { isUuid } from "../utils/isUuid";
import { userRoom } from "./room";
import { AppServer, AppSocket } from "./types";

const MAX_IDS_PER_EVENT = 100;

const messagesService = new MessagesService();

const emitDeliveries = (io: AppServer, batches: DeliveryBatch[]) => {
  for (const batch of batches) {
    io.to(userRoom(batch.senderId)).emit("message:delivered", {
      conversationId: batch.conversationId,
      messageIds: batch.messageIds,
      deliveredAt: batch.deliveredAt,
    });
  }
};

const parseMessageIds = (payload: unknown): string[] => {
  if (typeof payload !== "object" || payload === null) return [];

  const raw = (payload as { messageIds?: unknown }).messageIds;
  if (!Array.isArray(raw)) return [];

  const ids = raw
    .filter((id): id is string => typeof id === "string" && isUuid(id))
    .map((id) => id.toLowerCase());

  return [...new Set(ids)].slice(0, MAX_IDS_PER_EVENT);
};

const logError = (context: string) => (error: unknown) => {
  console.error(`[socket] ${context}:`, error);
};

export const deliverPendingOnConnect = (io: AppServer, userId: string) => {
  messagesService
    .markAllDeliveredFor(userId)
    .then((batches) => emitDeliveries(io, batches))
    .catch(logError("Eroare la livrarea mesajelor de conectare"));
};

export const registerDeliveryHandlers = (io: AppServer, socket: AppSocket) => {
  socket.on("message:received", (payload) => {
    const messageIds = parseMessageIds(payload);
    if (messageIds.length === 0) return;

    messagesService
      .markDelivered(socket.data.userId, messageIds)
      .then((batches) => emitDeliveries(io, batches))
      .catch(logError("Eroare la confirmarea livrării"));
  });
};
