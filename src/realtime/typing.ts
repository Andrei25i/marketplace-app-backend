import { chatConfig } from "../config/chat.config";
import { ConversationsService } from "../services/conversations.service";
import { isUuid } from "../utils/isUuid";
import { userRoom } from "./room";
import type { AppServer, AppSocket } from "./types";
import type { ChatActivity } from "../types/socket.type";

const conversationsService = new ConversationsService();

const parseTyping = (payload: unknown) => {
  if (typeof payload !== "object" || payload === null) return null;

  const { conversationId, isTyping, kind } = payload as {
    conversationId?: unknown;
    isTyping?: unknown;
    kind?: unknown;
  };

  if (typeof conversationId !== "string" || !isUuid(conversationId))
    return null;
  if (typeof isTyping !== "boolean") return null;

  const activity: ChatActivity =
    kind === undefined ? "typing" : (kind as ChatActivity);
  if (activity !== "typing" && activity !== "recording") return null;

  return {
    conversationId: conversationId.toLowerCase(),
    isTyping,
    kind: activity,
  };
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

    const { conversationId, isTyping, kind } = parsed;
    const { typingAt } = socket.data;
    const now = Date.now();
    const last = typingAt.get(conversationId);

    if (isTyping) {
      if (
        last !== undefined &&
        last.kind === kind &&
        now - last.at < chatConfig.typingThrottleMs
      )
        return;
      typingAt.set(conversationId, { at: now, kind });
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
          kind,
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
      kind: "typing",
    });
  }
  socket.data.typingAt.clear();
};
