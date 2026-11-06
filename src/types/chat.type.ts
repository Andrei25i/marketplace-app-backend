export type MessageStatus = "sent" | "delivered" | "read";

export interface MessageAdRef {
  id: string;
  title: string;
}

export type AttachmentKind = "image" | "audio";

export interface MessageAttachmentDTO {
  id: string;
  kind: AttachmentKind;
  url: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
}

export interface MessageDTO {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  client_id: string | null;
  ad: MessageAdRef | null;
  attachments: MessageAttachmentDTO[];
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
  attachmentIds: string[];
}

export interface ReadResult {
  conversationId: string;
  readerId: string;
  otherUserId: string;
  readAt: string;
  upTo: string;
  count: number;
}

export interface ConversationParams {
  id: string;
}

export interface MessageParams {
  id: string;
  messageId: string;
}

export interface ListConversationsQuery {
  cursor?: Date | undefined;
  limit: number;
}

export interface ListMessagesQuery {
  before?: string | undefined;
  limit: number;
}

export interface CreateConversationInput {
  recipientId: string;
}

export interface EditMessageInput {
  content: string;
}

export interface MarkReadInput {
  upToMessageId: string | null;
}

export interface UploadVoiceInput {
  durationMs: number;
}
