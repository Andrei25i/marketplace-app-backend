import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { ConversationSummaryDTO, Paginated } from "../types/chat.type";
import { isUniqueViolation } from "../utils/prismaErrors";
import { conversationSelect, toConversationSummary } from "./chat.mappers";

export interface Participation {
  clearedAt: Date | null;
  otherUserId: string;
}

const participantKey = (conversationId: string, userId: string) => ({
  conversation_id_user_id: { conversation_id: conversationId, user_id: userId },
});

export class ConversationsService {
  async getParticipation(
    me: string,
    conversationId: string,
    db: Prisma.TransactionClient = prisma,
  ): Promise<Participation> {
    const participant = await db.conversation_participants.findUnique({
      where: participantKey(conversationId, me),
      select: {
        cleared_at: true,
        conversations: { select: { user_low_id: true, user_high_id: true } },
      },
    });

    if (!participant) throw new Error("CONVERSATION_NOT_FOUND");

    const { user_low_id, user_high_id } = participant.conversations;

    return {
      clearedAt: participant.cleared_at,
      otherUserId: user_low_id === me ? user_high_id : user_low_id,
    };
  }

  async findOrCreate(
    me: string,
    recipientIdRaw: string,
  ): Promise<ConversationSummaryDTO> {
    const recipientId = recipientIdRaw.toLowerCase();

    if (recipientId === me) throw new Error("CANNOT_MESSAGE_SELF");

    const recipient = await prisma.users.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) throw new Error("RECIPIENT_NOT_FOUND");

    const [low, high] =
      me < recipientId ? [me, recipientId] : [recipientId, me];
    const pairKey = {
      user_low_id_user_high_id: { user_low_id: low, user_high_id: high },
    };

    let conversationId: string;

    try {
      const conversation = await prisma.conversations.upsert({
        where: pairKey,
        create: {
          user_low_id: low,
          user_high_id: high,
          participants: { create: [{ user_id: low }, { user_id: high }] },
        },
        update: {},
        select: { id: true },
      });
      conversationId = conversation.id;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      const existing = await prisma.conversations.findUnique({
        where: pairKey,
        select: { id: true },
      });
      if (!existing) throw error;
      conversationId = existing.id;
    }

    return this.getForUser(me, conversationId);
  }

  async getForUser(
    me: string,
    conversationId: string,
  ): Promise<ConversationSummaryDTO> {
    const participant = await prisma.conversation_participants.findUnique({
      where: participantKey(conversationId, me),
      select: {
        cleared_at: true,
        conversations: { select: conversationSelect },
      },
    });

    if (!participant) throw new Error("CONVERSATION_NOT_FOUND");

    const unread = await this.unreadCounts(me, [conversationId]);

    return toConversationSummary(
      me,
      participant.conversations,
      participant.cleared_at,
      unread.get(conversationId) ?? 0,
    );
  }

  async listForUser(
    me: string,
    cursor: Date | null,
    limit: number,
  ): Promise<Paginated<ConversationSummaryDTO>> {
    const rows = await prisma.conversation_participants.findMany({
      where: {
        user_id: me,
        is_hidden: false,
        conversations: {
          last_message_id: { not: null },
          ...(cursor ? { last_message_at: { lt: cursor } } : {}),
        },
      },
      orderBy: [
        { conversations: { last_message_at: "desc" } },
        { conversation_id: "desc" },
      ],
      take: limit + 1,
      select: {
        cleared_at: true,
        conversations: { select: conversationSelect },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const unread = await this.unreadCounts(
      me,
      page.map((row) => row.conversations.id),
    );

    const items = page.map((row) =>
      toConversationSummary(
        me,
        row.conversations,
        row.cleared_at,
        unread.get(row.conversations.id) ?? 0,
      ),
    );

    const lastAt = page.at(-1)?.conversations.last_message_at;

    return {
      items,
      nextCursor: hasMore && lastAt ? lastAt.toISOString() : null,
    };
  }

  async unreadTotal(me: string): Promise<number> {
    const [row] = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM messages m
      JOIN conversation_participants p
        ON p.conversation_id = m.conversation_id AND p.user_id = ${me}::uuid
      WHERE m.sender_id <> ${me}::uuid
        AND m.read_at IS NULL
        AND m.deleted_at IS NULL
        AND (p.cleared_at IS NULL OR m.created_at > p.cleared_at)
    `;

    return row?.total ?? 0;
  }

  async hide(me: string, conversationId: string): Promise<void> {
    await this.getParticipation(me, conversationId);

    await prisma.conversation_participants.update({
      where: participantKey(conversationId, me),
      data: { is_hidden: true, cleared_at: new Date() },
    });
  }

  private async unreadCounts(
    me: string,
    conversationIds: string[],
  ): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map();

    const rows = await prisma.$queryRaw<
      { conversation_id: string; count: number }[]
    >`
      SELECT m.conversation_id, COUNT(*)::int AS count
      FROM messages m
      JOIN conversation_participants p
        ON p.conversation_id = m.conversation_id AND p.user_id = ${me}::uuid
      WHERE m.conversation_id = ANY(${conversationIds}::uuid[])
        AND m.sender_id <> ${me}::uuid
        AND m.read_at IS NULL
        AND m.deleted_at IS NULL
        AND (p.cleared_at IS NULL OR m.created_at > p.cleared_at)
      GROUP BY m.conversation_id
    `;

    return new Map(rows.map((row) => [row.conversation_id, row.count]));
  }
}
