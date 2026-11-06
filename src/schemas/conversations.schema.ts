import { z } from "zod";
import { chatConfig } from "../config/chat.config";
import { normalizeMessageContent } from "../utils/messageContent";
import type {
  ConversationParams,
  CreateConversationInput,
  EditMessageInput,
  ListConversationsQuery,
  ListMessagesQuery,
  MarkReadInput,
  MessageParams,
  SendMessageInput,
  UploadVoiceInput,
} from "../types/chat.type";
import { limitSchema, optionalQuery, uuid } from "./common.schema";

const conversationId = uuid("ID-ul conversației este invalid.");
const messageId = uuid("ID-ul mesajului este invalid.");
const INVALID_CURSOR = "Parametrul de paginare este invalid.";

const SEND_CONTENT_ERROR = `Mesajul trebuie să conțină text sau cel puțin o imagine (maximum ${chatConfig.maxMessageLength} de caractere).`;
const EDIT_CONTENT_ERROR = `Textul mesajului este invalid sau depășește ${chatConfig.maxMessageLength} de caractere.`;

export const conversationParams = z.object({
  id: conversationId,
}) satisfies z.ZodType<ConversationParams>;

export const messageParams = z.object({
  id: conversationId,
  messageId,
}) satisfies z.ZodType<MessageParams>;

export const listConversationsQuery = z.object({
  cursor: optionalQuery(
    z
      .string({ error: INVALID_CURSOR })
      .refine((v) => !Number.isNaN(Date.parse(v)), { error: INVALID_CURSOR })
      .transform((v) => new Date(v)),
  ),
  limit: limitSchema(
    chatConfig.conversationsPageSize,
    chatConfig.conversationsMaxPageSize,
  ),
}) satisfies z.ZodType<ListConversationsQuery>;

export const listMessagesQuery = z.object({
  before: optionalQuery(uuid(INVALID_CURSOR)),
  limit: limitSchema(
    chatConfig.messagesPageSize,
    chatConfig.messagesMaxPageSize,
  ),
}) satisfies z.ZodType<ListMessagesQuery>;

export const createConversationBody = z.object({
  recipientId: uuid("ID-ul destinatarului este invalid."),
}) satisfies z.ZodType<CreateConversationInput>;

export const sendMessageBody = z
  .object({
    content: z.unknown(),
    clientId: uuid("Identificatorul mesajului (clientId) este invalid."),
    adId: uuid("ID-ul anunțului este invalid.")
      .nullish()
      .transform((v) => v ?? null),
    attachmentIds: z
      .array(uuid("Lista de imagini este invalidă."), {
        error: "Lista de imagini este invalidă.",
      })
      .max(chatConfig.maxAttachmentsPerMessage, {
        error: `Poți trimite maximum ${chatConfig.maxAttachmentsPerMessage} imagini într-un mesaj.`,
      })
      .refine((ids) => new Set(ids).size === ids.length, {
        error: "Aceeași imagine apare de mai multe ori.",
      })
      .nullish()
      .transform((v) => v ?? []),
  })
  .transform((data, ctx) => {
    const content = normalizeMessageContent(data.content, {
      allowEmpty: data.attachmentIds.length > 0,
    });
    if (content === null) {
      ctx.issues.push({
        code: "custom",
        message: SEND_CONTENT_ERROR,
        path: ["content"],
        input: data.content,
      });
      return z.NEVER;
    }
    return { ...data, content };
  }) satisfies z.ZodType<SendMessageInput>;

export const editMessageBody = z
  .object({ content: z.unknown() })
  .transform((data, ctx) => {
    const content = normalizeMessageContent(data.content, { allowEmpty: true });
    if (content === null) {
      ctx.issues.push({
        code: "custom",
        message: EDIT_CONTENT_ERROR,
        path: ["content"],
        input: data.content,
      });
      return z.NEVER;
    }
    return { content };
  }) satisfies z.ZodType<EditMessageInput>;

export const markReadBody = z.object({
  upToMessageId: uuid("ID-ul mesajului este invalid.")
    .nullish()
    .transform((v) => v ?? null),
}) satisfies z.ZodType<MarkReadInput>;

export const uploadVoiceBody = z.object({
  durationMs: z.coerce
    .number({ error: "Durata mesajului vocal este invalidă." })
    .positive({ error: "Durata mesajului vocal este invalidă." })
    .max(chatConfig.maxVoiceDurationMs + chatConfig.voiceDurationToleranceMs, {
      error: `Mesajul vocal trebuie să aibă cel mult ${Math.round(chatConfig.maxVoiceDurationMs / 60_000)} minute.`,
    })
    .transform(Math.round),
}) satisfies z.ZodType<UploadVoiceInput>;
