export type MessageStatus = "sent" | "delivered" | "read";

export interface MessageAdRef {
  id: string;
  title: string;
}

export interface MessageDTO {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  client_id: string | null;
  ad: MessageAdRef | null;
  status: MessageStatus;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
}

export interface ChatUserDTO {
  id: string;
  first_name: string;
  last_name: string;
  is_online: boolean;
  last_seen_at: string | null;
}

export interface ConversationSummaryDTO {
  id: string;
  other_user: ChatUserDTO;
  last_message: MessageDTO | null;
  unread_count: number;
  last_message_at: string | null;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface SendMessageInput {
  content: string;
  clientId: string;
  adId: string | null;
}

export interface ReadResult {
  conversationId: string;
  readerId: string;
  otherUserId: string;
  readAt: string;
  upTo: string;
  count: number;
}
