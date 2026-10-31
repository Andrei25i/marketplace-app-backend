import { ConversationSummaryDTO, MessageDTO } from "./chat.type";

export type AckResponse<T> =
  { ok: true; data: T } | { ok: false; error: string };

export interface MessageNewPayload {
  message: MessageDTO;
  conversation: ConversationSummaryDTO;
}

export interface MessageUpdatedPayload {
  message: MessageDTO;
}

export interface MessageDeliveredPayload {
  conversationId: string;
  messageIds: string[];
  deliveredAt: string;
}

export interface ConversationReadPayload {
  conversationId: string;
  readerId: string;
  readAt: string;
  upTo: string;
}

export interface ConversationRefPayload {
  conversationId: string;
}

export interface UnreadPayload {
  total: number;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceDTO {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}

export interface ServerToClientEvents {
  "message:new": (payload: MessageNewPayload) => void;
  "message:updated": (payload: MessageUpdatedPayload) => void;
  "message:delivered": (payload: MessageDeliveredPayload) => void;
  "conversation:read": (payload: ConversationReadPayload) => void;
  "conversation:hidden": (payload: ConversationRefPayload) => void;
  "unread:updated": (payload: UnreadPayload) => void;
  "typing": (payload: TypingPayload) => void;
  "presence:update": (payload: PresenceDTO) => void;
}

export interface ClientToServerEvents {
  "message:received": (payload: { messageIds: string[] }) => void;
  "typing": (payload: { conversationId: string; isTyping: boolean }) => void;
  "presence:subscribe": (
    payload: { userIds: string[] },
    ack: (res: AckResponse<PresenceDTO[]>) => void,
  ) => void;
  "presence:unsubscribe": (payload: { userIds: string[] }) => void;
}

export interface SocketData {
  userId: string;
  sessionId: string;
  conversationPeers: Map<string, string>;
  typingAt: Map<string, number>;
}

export type InterServerEvents = Record<string, never>;
