import { error, log } from "node:console";
import { ConversationsService } from "../services/conversations.service";
import { getIO } from "./io";
import { userRoom } from "./room";
import { MessageDTO, ReadResult } from "../types/chat.type";

const logEmitError = (event: string) => (error: unknown) => {
  console.error(`[socket] Eroare la emiterea ${event}:`, error);
};

export class ChatEvents {
  private conversationsService = new ConversationsService();

  private async emitUnread(userId: string) {
    const total = await this.conversationsService.unreadTotal(userId);
    getIO().to(userRoom(userId)).emit("unread:updated", { total });
  }

  messageSent(
    senderId: string,
    reicipientId: string,
    conversationId: string,
    message: MessageDTO,
  ) {
    const run = async () => {
      const [senderConversation, recipientConversation] = await Promise.all([
        this.conversationsService.getForUser(senderId, conversationId),
        this.conversationsService.getForUser(reicipientId, conversationId),
      ]);

      const io = getIO();
      io.to(userRoom(senderId)).emit("message:new", {
        message,
        conversation: senderConversation,
      });
      io.to(userRoom(reicipientId)).emit("message:new", {
        message,
        conversation: recipientConversation,
      });

      await this.emitUnread(reicipientId);
    };

    run().catch(logEmitError("message:new"));
  }

  messageUpdated(
    senderId: string,
    recipientId: string,
    message: MessageDTO,
    unreadChanged = false,
  ) {
    const run = async () => {
      getIO()
        .to([userRoom(senderId), userRoom(recipientId)])
        .emit("message:updated", { message });

      if (unreadChanged) await this.emitUnread(recipientId);
    };

    run().catch(logEmitError("message:updated"));
  }

  conversationRead(result: ReadResult) {
    const run = async () => {
      getIO()
        .to([userRoom(result.readerId), userRoom(result.otherUserId)])
        .emit("conversation:read", {
          conversationId: result.conversationId,
          readerId: result.readerId,
          readAt: result.readAt,
          upTo: result.upTo,
        });

      await this.emitUnread(result.readerId);
    };

    run().catch(logEmitError("conversation:read"));
  }

  conversationHidden(userId: string, conversationId: string) {
    const run = async () => {
      getIO()
        .to(userRoom(userId))
        .emit("conversation:hidden", { conversationId });

      await this.emitUnread(userId);
    };

    run().catch(logEmitError("conversation:hidden"));
  }
}
