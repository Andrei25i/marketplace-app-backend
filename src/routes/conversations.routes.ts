import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { messageLimiter } from "../middlewares/chatLimiter";
import { ConversationsController } from "../controllers/conversations.controller";

const router = Router();
const conversationsController = new ConversationsController();

router.use(authMiddleware);

router.get("/", conversationsController.list);
router.post("/", conversationsController.create);
router.get("/unread-count", conversationsController.unreadCount);

router.get("/:id", conversationsController.getOne);
router.delete("/:id", conversationsController.hide);
router.post("/:id/read", conversationsController.markRead);

router.get("/:id/messages", conversationsController.listMessages);
router.post(
  "/:id/messages",
  messageLimiter,
  conversationsController.sendMessage,
);
router.patch("/:id/messages/:messageId", conversationsController.editMessage);
router.delete(
  "/:id/messages/:messageId",
  conversationsController.deleteMessage,
);

export default router;
