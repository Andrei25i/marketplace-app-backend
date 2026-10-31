import { Request, Response } from "express";
import { ConversationsService } from "../services/conversations.service";
import { MessagesService } from "../services/messages.service";
import { chatConfig } from "../config/chat.config";
import { isUuid } from "../utils/isUuid";
import { normalizeMessageContent } from "../utils/messageContent";
import { ChatEvents } from "../realtime/chat.events";

const EDIT_WINDOW_MINUTES = Math.round(chatConfig.editWindowMs / 60_000);

const CHAT_ERRORS: Record<string, [number, string]> = {
  CONVERSATION_NOT_FOUND: [404, "Conversația nu a fost găsită."],
  RECIPIENT_NOT_FOUND: [404, "Utilizatorul nu a fost găsit sau nu există."],
  CANNOT_MESSAGE_SELF: [400, "Nu îți poți trimite mesaje ție însuți."],
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

const uuidOrNull = (value: unknown): string | null =>
  typeof value === "string" && isUuid(value) ? value.toLowerCase() : null;

const parseLimit = (raw: unknown, fallback: number, max: number): number => {
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(value, max);
};

const CONTENT_ERROR = `Mesajul trebuie să conțină între 1 și ${chatConfig.maxMessageLength} de caractere.`;

export class ConversationsController {
  private conversationsService = new ConversationsService();
  private messagesService = new MessagesService();
  private chatEvents = new ChatEvents();

  private requireUser(req: Request, res: Response): string | null {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Neautorizat." });
      return null;
    }
    return userId;
  }

  private requireConversationId(req: Request, res: Response): string | null {
    const conversationId = uuidOrNull(req.params.id);
    if (!conversationId) {
      res.status(400).json({ error: "ID-ul conversației este invalid." });
      return null;
    }
    return conversationId;
  }

  list = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { cursor: rawCursor, limit: rawLimit } = req.query;
    let cursor: Date | null = null;

    if (rawCursor !== undefined) {
      const parsed = typeof rawCursor === "string" ? new Date(rawCursor) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: CHAT_ERRORS.INVALID_CURSOR?.[1] });
      }
      cursor = parsed;
    }

    const limit = parseLimit(
      rawLimit,
      chatConfig.conversationsPageSize,
      chatConfig.conversationsMaxPageSize,
    );

    try {
      const page = await this.conversationsService.listForUser(
        me,
        cursor,
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

    const recipientId = uuidOrNull(req.body?.recipientId);
    if (!recipientId) {
      return res
        .status(400)
        .json({ error: "ID-ul destinatarului este invalid." });
    }

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
    const conversationId = this.requireConversationId(req, res);
    if (!conversationId) return;

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
    const conversationId = this.requireConversationId(req, res);
    if (!conversationId) return;

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
    const conversationId = this.requireConversationId(req, res);
    if (!conversationId) return;

    const { before: rawBefore, limit: rawLimit } = req.query;
    const before = rawBefore === undefined ? null : uuidOrNull(rawBefore);

    if (rawBefore !== undefined && !before) {
      return res.status(400).json({ error: CHAT_ERRORS.INVALID_CURSOR?.[1] });
    }

    const limit = parseLimit(
      rawLimit,
      chatConfig.messagesPageSize,
      chatConfig.messagesMaxPageSize,
    );

    try {
      const page = await this.messagesService.list(
        me,
        conversationId,
        before,
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
    const conversationId = this.requireConversationId(req, res);
    if (!conversationId) return;

    const body = req.body ?? {};
    const content = normalizeMessageContent(body.content);
    const clientId = uuidOrNull(body.clientId);
    const adId = body.adId == null ? null : uuidOrNull(body.adId);

    if (!content) {
      return res.status(400).json({ error: CONTENT_ERROR });
    }
    if (!clientId) {
      return res
        .status(400)
        .json({ error: "Identificatorul mesajului (clientId) este invalid." });
    }
    if (body.adId != null && !adId) {
      return res.status(400).json({ error: "ID-ul anunțului este invalid." });
    }

    try {
      const result = await this.messagesService.send(me, conversationId, {
        content,
        clientId,
        adId,
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

  editMessage = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;
    const conversationId = this.requireConversationId(req, res);
    if (!conversationId) return;

    const messageId = uuidOrNull(req.params.messageId);
    if (!messageId) {
      return res.status(400).json({ error: "ID-ul mesajului este invalid." });
    }

    const content = normalizeMessageContent(req.body?.content);
    if (!content) {
      return res.status(400).json({ error: CONTENT_ERROR });
    }

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
    const conversationId = this.requireConversationId(req, res);
    if (!conversationId) return;

    const messageId = uuidOrNull(req.params.messageId);
    if (!messageId) {
      return res.status(400).json({ error: "ID-ul mesajului este invalid." });
    }

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
    const conversationId = this.requireConversationId(req, res);
    if (!conversationId) return;

    const rawUpTo = req.body?.upToMessageId;
    const upToMessageId = rawUpTo == null ? null : uuidOrNull(rawUpTo);

    if (rawUpTo != null && !upToMessageId) {
      return res.status(400).json({ error: "ID-ul mesajului este invalid." });
    }

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
