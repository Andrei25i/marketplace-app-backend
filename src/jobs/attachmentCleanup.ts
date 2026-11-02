import { chatConfig } from "../config/chat.config";
import { AttachmentsService } from "../services/attachments.service";

const attachmentsService = new AttachmentsService();
let timer: NodeJS.Timeout | null = null;

const runCleanup = async () => {
  try {
    const deleted = await attachmentsService.cleanupPending();
    if (deleted > 0) {
      console.log(`Curățare atașamente: ${deleted} imagini netrimise șterse.`);
    }
  } catch (error) {
    console.error("Eroare la curățarea atașamentelor:", error);
  }
};

export const startAttachmentCleanup = () => {
  void runCleanup();
  timer = setInterval(runCleanup, chatConfig.attachmentCleanupIntervalMs);
  timer.unref();
};

export const stopAttachmentCleanup = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
