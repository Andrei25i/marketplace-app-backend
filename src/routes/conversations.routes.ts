import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { attachmentLimiter, messageLimiter } from "../middlewares/chatLimiter";
import { ConversationsController } from "../controllers/conversations.controller";
import { upload, voiceUpload } from "../middlewares/upload.middleware";
import { chatConfig } from "../config/chat.config";
import { validate } from "../middlewares/validate.middleware";
import {
  conversationParams,
  createConversationBody,
  editMessageBody,
  listConversationsQuery,
  listMessagesQuery,
  markReadBody,
  messageParams,
  sendMessageBody,
  uploadVoiceBody,
} from "../schemas/conversations.schema";

const router = Router();
const conversationsController = new ConversationsController();

router.use(authMiddleware);

router.get(
  "/",
  validate({ query: listConversationsQuery }),
  conversationsController.list,
);
router.post(
  "/",
  validate({ body: createConversationBody }),
  conversationsController.create,
);
router.get("/unread-count", conversationsController.unreadCount);

router.get(
  "/:id",
  validate({ params: conversationParams }),
  conversationsController.getOne,
);
router.delete(
  "/:id",
  validate({ params: conversationParams }),
  conversationsController.hide,
);
router.post(
  "/:id/read",
  validate({ params: conversationParams, body: markReadBody }),
  conversationsController.markRead,
);

router.get(
  "/:id/messages",
  validate({ params: conversationParams, query: listMessagesQuery }),
  conversationsController.listMessages,
);
router.post(
  "/:id/attachments",
  attachmentLimiter,
  upload.array("images", chatConfig.maxAttachmentsPerMessage),
  validate({ params: conversationParams }),
  conversationsController.uploadAttachments,
);
router.post(
  "/:id/attachments/voice",
  attachmentLimiter,
  voiceUpload.single("voice"),
  validate({ params: conversationParams, body: uploadVoiceBody }),
  conversationsController.uploadVoice,
);
router.post(
  "/:id/messages",
  messageLimiter,
  validate({ params: conversationParams, body: sendMessageBody }),
  conversationsController.sendMessage,
);
router.patch(
  "/:id/messages/:messageId",
  validate({ params: messageParams, body: editMessageBody }),
  conversationsController.editMessage,
);
router.delete(
  "/:id/messages/:messageId",
  validate({ params: messageParams }),
  conversationsController.deleteMessage,
);

export default router;
