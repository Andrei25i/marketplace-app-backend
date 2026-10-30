import { Prisma } from "@prisma/client";
import {
  ChatUserDTO,
  ConversationSummaryDTO,
  MessageDTO,
  MessageStatus,
} from "../types/chat.type";
import { presenceStore } from "../realtime/presence.store";

const toIso = (date: Date | null | undefined): string | null =>
  date ? date.toISOString() : null;

export const messageSelect = {
  id: true,
  conversation_id: true,
  sender_id: true,
  content: true,
  client_id: true,
  created_at: true,
  edited_at: true,
  deleted_at: true,
  delivered_at: true,
  read_at: true,
  ads: { select: { id: true, title: true } },
} satisfies Prisma.messagesSelect;

export type MessageRow = Prisma.messagesGetPayload<{
  select: typeof messageSelect;
}>;

export const getMessageStatus = (
  message: Pick<MessageRow, "delivered_at" | "read_at">,
): MessageStatus => {
  if (message.read_at) return "read";
  if (message.delivered_at) return "delivered";
  return "sent";
};

export const toMessageDTO = (message: MessageRow): MessageDTO => {
  const isDeleted = message.deleted_at !== null;

  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    content: isDeleted ? null : message.content,
    client_id: message.client_id,
    ad: isDeleted ? null : message.ads,
    status: getMessageStatus(message),
    created_at: message.created_at.toISOString(),
    edited_at: toIso(message.edited_at),
    deleted_at: toIso(message.deleted_at),
    delivered_at: toIso(message.delivered_at),
    read_at: toIso(message.read_at),
  };
};

export const chatUserSelect = {
  id: true,
  first_name: true,
  last_name: true,
  presence: { select: { last_seen_at: true } },
} satisfies Prisma.usersSelect;

export type ChatUserRow = Prisma.usersGetPayload<{
  select: typeof chatUserSelect;
}>;

export const toChatUserDTO = (user: ChatUserRow): ChatUserDTO => ({
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  is_online: presenceStore.isOnline(user.id),
  last_seen_at: toIso(user.presence?.last_seen_at),
});

export const conversationSelect = {
  id: true,
  last_message_at: true,
  user_low: { select: chatUserSelect },
  user_high: { select: chatUserSelect },
  last_message: { select: messageSelect },
} satisfies Prisma.conversationsSelect;

export type ConversationRow = Prisma.conversationsGetPayload<{
  select: typeof conversationSelect;
}>;

export const toConversationSummary = (
  me: string,
  row: ConversationRow,
  clearedAt: Date | null,
  unreadCount: number,
): ConversationSummaryDTO => {
  const otherUser = row.user_low.id === me ? row.user_high : row.user_low;

  const lastMessage =
    row.last_message && (!clearedAt || row.last_message.created_at > clearedAt)
      ? row.last_message
      : null;

  return {
    id: row.id,
    other_user: toChatUserDTO(otherUser),
    last_message: lastMessage ? toMessageDTO(lastMessage) : null,
    unread_count: unreadCount,
    last_message_at: toIso(lastMessage?.created_at),
  };
};
