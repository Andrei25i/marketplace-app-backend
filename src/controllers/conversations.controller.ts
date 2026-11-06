import { Request, Response } from "express";
import { ConversationsService } from "../services/conversations.service";
import { MessagesService } from "../services/messages.service";
import { chatConfig } from "../config/chat.config";
import { ChatEvents } from "../realtime/chat.events";
import { AttachmentsService } from "../services/attachments.service";
import { getValidated } from "../middlewares/validate.middleware";
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

const EDIT_WINDOW_MINUTES = Math.round(chatConfig.editWindowMs / 60_000);

const CHAT_ERRORS: Record<string, [number, string]> = {
  CONVERSATION_NOT_FOUND: [404, "Conversația nu a fost găsită."],
  RECIPIENT_NOT_FOUND: [404, "Utilizatorul nu a fost găsit sau nu există."],
  CANNOT_MESSAGE_SELF: [400, "Nu îți poți trimite mesaje ție însuți."],
  EMPTY_MESSAGE: [400, "Un mesaj fără imagini nu poate rămâne fără text."],
  AD_NOT_FOUND: [404, "Anunțul nu există sau a fost șters."],
  MESSAGE_NOT_FOUND: [404, "Mesajul nu a fost găsit."],
  NOT_MESSAGE_OWNER: [403, "Poți modifica doar mesajele trimise de tine."],
  MESSAGE_DELETED: [409, "Mesajul a fost deja șters."],
  EDIT_WINDOW_EXPIRED: [
    403,
    `Mesajele pot fi editate doar în primele ${EDIT_WINDOW_MINUTES} minute.`,
  ],
  INVALID_CURSOR: [400, "Parametrul de paginare este invalid."],
  CLIENT_ID_CONFLICT: [409, "Identificatorul mesajului este deja folosit."],
  NO_FILES: [400, "Nu ai trimis nicio imagine."],
  TOO_MANY_ATTACHMENTS: [
    400,
    `Poți trimite maximum ${chatConfig.maxAttachmentsPerMessage} imagini într-un mesaj.`,
  ],
  UNSUPPORTED_FILE_TYPE: [
    400,
    "Format neacceptat. Folosește JPG, PNG, WEBP, GIF, HEIC sau AVIF.",
  ],
  UPLOAD_FAILED: [502, "Imaginile nu au putut fi încărcate. Încearcă din nou."],
  INVALID_ATTACHMENTS: [
    400,
    "Unele imagini nu mai sunt disponibile. Încarcă-le din nou.",
  ],
  NO_VOICE_FILE: [400, "Nu ai trimis niciun mesaj vocal."],
  UNSUPPORTED_AUDIO_TYPE: [400, "Formatul audio nu este acceptat."],
  VOICE_UPLOAD_FAILED: [
    502,
    "Mesajul vocal nu a putut fi încărcat. Încearcă din nou.",
  ],
  INVALID_VOICE_DURATION: [
    400,
    `Mesajul vocal trebuie să aibă cel mult ${Math.round(chatConfig.maxVoiceDurationMs / 60_000)} minute.`,
  ],
  INVALID_VOICE_MESSAGE: [
    400,
    "Un mesaj vocal nu poate conține text sau imagini.",
  ],
  MESSAGE_NOT_EDITABLE: [400, "Mesajele vocale nu pot fi editate."],
};

const sendChatError = (res: Response, error: unknown, context: string) => {
  const mapped =
    error instanceof Error ? CHAT_ERRORS[error.message] : undefined;

  if (mapped) {
    const [status, message] = mapped;
    return res.status(status).json({ error: message });
  }

  console.error(`${context}:`, error);
  return res.status(500).json({ error: "Eroare internă a serverului." });
};

export class ConversationsController {
  private conversationsService = new ConversationsService();
  private messagesService = new MessagesService();
  private chatEvents = new ChatEvents();
  private attachmentsService = new AttachmentsService();

  private requireUser(req: Request, res: Response): string | null {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Neautorizat." });
      return null;
    }
    return userId;
  }

  list = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { cursor, limit } = getValidated<ListConversationsQuery>(
      req,
      "query",
    );

    try {
      const page = await this.conversationsService.listForUser(
        me,
        cursor ?? null,
        limit,
      );
      return res.status(200).json(page);
    } catch (error) {
      return sendChatError(res, error, "Eroare la listarea conversațiilor");
    }
  };

  create = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { recipientId } = req.body as CreateConversationInput;

    try {
      const conversation = await this.conversationsService.findOrCreate(
        me,
        recipientId,
      );
      return res.status(200).json(conversation);
    } catch (error) {
      return sendChatError(res, error, "Eroare la crearea conversației");
    }
  };

  unreadCount = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    try {
      const total = await this.conversationsService.unreadTotal(me);
      return res.status(200).json({ total });
    } catch (error) {
      return sendChatError(
        res,
        error,
        "Eroare la numărarea mesajelor necitite",
      );
    }
  };

  getOne = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId } = getValidated<ConversationParams>(
      req,
      "params",
    );

    try {
      const conversation = await this.conversationsService.getForUser(
        me,
        conversationId,
      );
      return res.status(200).json(conversation);
    } catch (error) {
      return sendChatError(res, error, "Eroare la preluarea conversației");
    }
  };

  hide = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId } = getValidated<ConversationParams>(
      req,
      "params",
    );

    try {
      await this.conversationsService.hide(me, conversationId);
      this.chatEvents.conversationHidden(me, conversationId);
      return res.status(204).end();
    } catch (error) {
      return sendChatError(res, error, "Eroare la ștergerea conversației");
    }
  };

  listMessages = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId } = getValidated<ConversationParams>(
      req,
      "params",
    );
    const { before, limit } = getValidated<ListMessagesQuery>(req, "query");

    try {
      const page = await this.messagesService.list(
        me,
        conversationId,
        before ?? null,
        limit,
      );
      return res.status(200).json(page);
    } catch (error) {
      return sendChatError(res, error, "Eroare la preluarea mesajelor");
    }
  };

  sendMessage = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId } = getValidated<ConversationParams>(
      req,
      "params",
    );
    const { content, clientId, adId, attachmentIds } =
      req.body as SendMessageInput;

    try {
      const result = await this.messagesService.send(me, conversationId, {
        content,
        clientId,
        adId,
        attachmentIds,
      });

      if (result.created) {
        this.chatEvents.messageSent(
          me,
          result.recipientId,
          conversationId,
          result.message,
        );
      }

      return res.status(result.created ? 201 : 200).json(result.message);
    } catch (error) {
      return sendChatError(res, error, "Eroare la trimiterea mesajului");
    }
  };

  uploadAttachments = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId } = getValidated<ConversationParams>(
      req,
      "params",
    );
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    try {
      const attachments = await this.attachmentsService.uploadImages(
        me,
        conversationId,
        files,
      );
      return res.status(201).json(attachments);
    } catch (error) {
      return sendChatError(res, error, "Eroare la încărcarea imaginilor");
    }
  };

  uploadVoice = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId } = getValidated<ConversationParams>(
      req,
      "params",
    );
    const { durationMs } = req.body as UploadVoiceInput;

    try {
      const attachment = await this.attachmentsService.uploadVoice(
        me,
        conversationId,
        req.file,
        durationMs,
      );
      return res.status(201).json(attachment);
    } catch (error) {
      return sendChatError(res, error, "Eroare la încărcarea mesajului vocal");
    }
  };

  editMessage = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId, messageId } = getValidated<MessageParams>(
      req,
      "params",
    );
    const { content } = req.body as EditMessageInput;

    try {
      const result = await this.messagesService.edit(
        me,
        conversationId,
        messageId,
        content,
      );
      this.chatEvents.messageUpdated(me, result.recipientId, result.message);

      return res.status(200).json(result.message);
    } catch (error) {
      return sendChatError(res, error, "Eroare la editarea mesajului");
    }
  };

  deleteMessage = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId, messageId } = getValidated<MessageParams>(
      req,
      "params",
    );

    try {
      const result = await this.messagesService.softDelete(
        me,
        conversationId,
        messageId,
      );
      this.chatEvents.messageUpdated(
        me,
        result.recipientId,
        result.message,
        true,
      );

      return res.status(200).json(result.message);
    } catch (error) {
      return sendChatError(res, error, "Eroare la ștergerea mesajului");
    }
  };

  markRead = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id: conversationId } = getValidated<ConversationParams>(
      req,
      "params",
    );
    const { upToMessageId } = req.body as MarkReadInput;

    try {
      const result = await this.messagesService.markRead(
        me,
        conversationId,
        upToMessageId,
      );
      if (result) this.chatEvents.conversationRead(result);

      return res.status(200).json({
        readAt: result?.readAt ?? null,
        count: result?.count ?? 0,
      });
    } catch (error) {
      return sendChatError(
        res,
        error,
        "Eroare la marcarea mesajelor ca citite",
      );
    }
  };
}
