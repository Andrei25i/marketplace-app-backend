import { chatConfig } from "../config/chat.config";
import { ConversationsService } from "../services/conversations.service";
import { isUuid } from "../utils/isUuid";
import { userRoom } from "./room";
import type { AppServer, AppSocket } from "./types";

const conversationsService = new ConversationsService();

const parseTyping = (payload: unknown) => {
  if (typeof payload !== "object" || payload === null) return null;

  const { conversationId, isTyping } = payload as {
    conversationId?: unknown;
    isTyping?: unknown;
  };

  if (typeof conversationId !== "string" || !isUuid(conversationId))
    return null;
  if (typeof isTyping !== "boolean") return null;

  return { conversationId: conversationId.toLowerCase(), isTyping };
};

const resolvePeer = async (socket: AppSocket, conversationId: string) => {
  const cached = socket.data.conversationPeers.get(conversationId);
  if (cached) return cached;

  const { otherUserId } = await conversationsService.getParticipation(
    socket.data.userId,
    conversationId,
  );
  socket.data.conversationPeers.set(conversationId, otherUserId);
  return otherUserId;
};

export const registerTypingHandlers = (io: AppServer, socket: AppSocket) => {
  socket.on("typing", (payload) => {
    const parsed = parseTyping(payload);
    if (!parsed) return;

    const { conversationId, isTyping } = parsed;
    const { typingAt } = socket.data;
    const now = Date.now();
    const last = typingAt.get(conversationId);

    if (isTyping) {
      if (last !== undefined && now - last < chatConfig.typingThrottleMs)
        return;
      typingAt.set(conversationId, now);
    } else {
      if (last === undefined) return;
      typingAt.delete(conversationId);
    }

    resolvePeer(socket, conversationId)
      .then((peerId) => {
        io.to(userRoom(peerId)).emit("typing", {
          conversationId,
          userId: socket.data.userId,
          isTyping,
        });
      })
      .catch(() => {
        typingAt.delete(conversationId);
      });
  });
};

export const stopTypingOnDisconnect = (io: AppServer, socket: AppSocket) => {
  for (const conversationId of socket.data.typingAt.keys()) {
    const peerId = socket.data.conversationPeers.get(conversationId);
    if (!peerId) continue;

    io.to(userRoom(peerId)).emit("typing", {
      conversationId,
      userId: socket.data.userId,
      isTyping: false,
    });
  }
  socket.data.typingAt.clear();
};
