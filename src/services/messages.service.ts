import { chatConfig } from "../config/chat.config";
import prisma from "../prisma";
import {
  MessageDTO,
  Paginated,
  ReadResult,
  SendMessageInput,
} from "../types/chat.type";
import { isUniqueViolation } from "../utils/prismaErrors";
import { messageSelect, toMessageDTO } from "./chat.mappers";
import { ConversationsService } from "./conversations.service";

export interface SendResult {
  message: MessageDTO;
  recipientId: string;
  created: boolean;
}

export interface MessageMutationResult {
  message: MessageDTO;
  recipientId: string;
}

export interface DeliveryBatch {
  conversationId: string;
  senderId: string;
  messageIds: string[];
  deliveredAt: string;
}

type DeliveredRow = { id: string; conversation_id: string; sender_id: string };

const groupDeliveries = (
  rows: DeliveredRow[],
  deliveredAt: Date,
): DeliveryBatch[] => {
  const batches = new Map<string, DeliveryBatch>();

  for (const row of rows) {
    const batch = batches.get(row.conversation_id) ?? {
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      messageIds: [],
      deliveredAt: deliveredAt.toISOString(),
    };
    batch.messageIds.push(row.id);
    batches.set(row.conversation_id, batch);
  }

  return [...batches.values()];
};

export class MessagesService {
  private conversationsService = new ConversationsService();

  async list(
    me: string,
    conversationId: string,
    before: string | null,
    limit: number,
  ): Promise<Paginated<MessageDTO>> {
    const { clearedAt } = await this.conversationsService.getParticipation(
      me,
      conversationId,
    );

    if (before) {
      const cursorMessage = await prisma.messages.findFirst({
        where: { id: before, conversation_id: conversationId },
        select: { id: true },
      });
      if (!cursorMessage) throw new Error("INVALID_CURSOR");
    }

    const rows = await prisma.messages.findMany({
      where: {
        conversation_id: conversationId,
        ...(clearedAt ? { created_at: { gt: clearedAt } } : {}),
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
      take: limit + 1,
      select: messageSelect,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.reverse().map(toMessageDTO),
      nextCursor: hasMore ? (page[0]?.id ?? null) : null,
    };
  }

  async send(
    me: string,
    conversationId: string,
    input: SendMessageInput,
  ): Promise<SendResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const { otherUserId } =
          await this.conversationsService.getParticipation(
            me,
            conversationId,
            tx,
          );

        if (input.adId) {
          const ad = await tx.ads.findUnique({
            where: { id: input.adId },
            select: { id: true },
          });
          if (!ad) throw new Error("AD_NOT_FOUND");
        }

        const message = await tx.messages.create({
          data: {
            conversation_id: conversationId,
            sender_id: me,
            content: input.content,
            client_id: input.clientId,
            ad_id: input.adId,
          },
          select: messageSelect,
        });

        await tx.conversations.updateMany({
          where: {
            id: conversationId,
            OR: [
              { last_message_at: null },
              { last_message_at: { lte: message.created_at } },
            ],
          },
          data: {
            last_message_id: message.id,
            last_message_at: message.created_at,
          },
        });

        await tx.conversation_participants.updateMany({
          where: { conversation_id: conversationId, is_hidden: true },
          data: { is_hidden: false },
        });

        return {
          message: toMessageDTO(message),
          recipientId: otherUserId,
          created: true,
        };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      const existing = await prisma.messages.findUnique({
        where: {
          sender_id_client_id: { sender_id: me, client_id: input.clientId },
        },
        select: messageSelect,
      });

      if (!existing) throw error;
      if (existing.conversation_id !== conversationId) {
        throw new Error("CLIENT_ID_CONFLICT", { cause: error });
      }

      const { otherUserId } = await this.conversationsService.getParticipation(
        me,
        conversationId,
      );

      return {
        message: toMessageDTO(existing),
        recipientId: otherUserId,
        created: false,
      };
    }
  }

  async edit(
    me: string,
    conversationId: string,
    messageId: string,
    content: string,
  ): Promise<MessageMutationResult> {
    const { otherUserId } = await this.conversationsService.getParticipation(
      me,
      conversationId,
    );
    const existing = await this.getOwnMessage(me, conversationId, messageId);

    if (Date.now() - existing.created_at.getTime() > chatConfig.editWindowMs) {
      throw new Error("EDIT_WINDOW_EXPIRED");
    }

    const updated = await prisma.messages.update({
      where: { id: messageId },
      data: { content, edited_at: new Date() },
      select: messageSelect,
    });

    return { message: toMessageDTO(updated), recipientId: otherUserId };
  }

  async softDelete(
    me: string,
    conversationId: string,
    messageId: string,
  ): Promise<MessageMutationResult> {
    const { otherUserId } = await this.conversationsService.getParticipation(
      me,
      conversationId,
    );
    await this.getOwnMessage(me, conversationId, messageId);

    const deleted = await prisma.messages.update({
      where: { id: messageId },
      data: { deleted_at: new Date(), content: "" },
      select: messageSelect,
    });

    return { message: toMessageDTO(deleted), recipientId: otherUserId };
  }

  async markRead(
    me: string,
    conversationId: string,
    upToMessageId: string | null,
  ): Promise<ReadResult | null> {
    const { otherUserId, clearedAt } =
      await this.conversationsService.getParticipation(me, conversationId);

    const now = new Date();
    let upTo = now;

    if (upToMessageId) {
      const target = await prisma.messages.findFirst({
        where: { id: upToMessageId, conversation_id: conversationId },
        select: { created_at: true },
      });
      if (!target) throw new Error("MESSAGE_NOT_FOUND");
      upTo = target.created_at;
    }

    const received = {
      conversation_id: conversationId,
      sender_id: otherUserId,
      created_at: {
        lte: upTo,
        ...(clearedAt ? { gt: clearedAt } : {}),
      },
    };

    const [, read] = await prisma.$transaction([
      prisma.messages.updateMany({
        where: { ...received, delivered_at: null },
        data: { delivered_at: now },
      }),
      prisma.messages.updateMany({
        where: { ...received, read_at: null },
        data: { read_at: now },
      }),
      prisma.conversation_participants.update({
        where: {
          conversation_id_user_id: {
            conversation_id: conversationId,
            user_id: me,
          },
        },
        data: { last_read_at: now },
      }),
    ]);

    if (read.count === 0) return null;

    return {
      conversationId,
      readerId: me,
      otherUserId,
      readAt: now.toISOString(),
      upTo: upTo.toISOString(),
      count: read.count,
    };
  }

  async markDeliverd(
    recipientId: string,
    messageIds: string[],
  ): Promise<DeliveryBatch[]> {
    if (messageIds.length === 0) return [];

    const now = new Date();
    const rows = await prisma.messages.updateManyAndReturn({
      where: {
        id: { in: messageIds },
        sender_id: { not: recipientId },
        delivered_at: null,
        conversations: { participants: { some: { user_id: recipientId } } },
      },
      data: { delivered_at: now },
      select: { id: true, conversation_id: true, sender_id: true },
    });

    return groupDeliveries(rows, now);
  }

  async markAllDeliveredFor(userId: string): Promise<DeliveryBatch[]> {
    const now = new Date();
    const rows = await prisma.messages.updateManyAndReturn({
      where: {
        sender_id: { not: userId },
        delivered_at: null,
        conversations: { participants: { some: { user_id: userId } } },
      },
      data: { delivered_at: now },
      select: { id: true, conversation_id: true, sender_id: true },
    });

    return groupDeliveries(rows, now);
  }

  private async getOwnMessage(
    me: string,
    conversationId: string,
    messageId: string,
  ) {
    const message = await prisma.messages.findFirst({
      where: { id: messageId, conversation_id: conversationId },
      select: messageSelect,
    });

    if (!message) throw new Error("MESSAGE_NOT_FOUND");
    if (message.sender_id !== me) throw new Error("NOT_MESSAGE_OWNER");
    if (message.deleted_at) throw new Error("MESSAGE_DELETED");

    return message;
  }
}
