import { chatConfig } from "../config/chat.config";
import prisma from "../prisma";
import { MessageAttachmentDTO } from "../types/chat.type";
import { chatMediaPublicId, userTag } from "../utils/mediaPaths";
import { attachmentSelect } from "./chat.mappers";
import { ConversationsService } from "./conversations.service";
import { MediaService, UploadedMedia } from "./media.service";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
]);

export class AttachmentsService {
  private mediaService = new MediaService();
  private conversationsService = new ConversationsService();

  async uploadImages(
    me: string,
    conversationId: string,
    files: Express.Multer.File[],
  ): Promise<MessageAttachmentDTO[]> {
    await this.conversationsService.getParticipation(me, conversationId);

    if (files.length === 0) throw new Error("NO_FILES");
    if (files.length > chatConfig.maxAttachmentsPerMessage) {
      throw new Error("TOO_MANY_ATTACHMENTS");
    }
    if (files.some((file) => !ALLOWED_IMAGE_TYPES.has(file.mimetype))) {
      throw new Error("UNSUPPORTED_FILE_TYPE");
    }

    const results = await Promise.allSettled(
      files.map((file) =>
        this.mediaService.uploadBuffer({
          buffer: file.buffer,
          publicId: chatMediaPublicId(me, conversationId),
          tags: [userTag(me), "chat"],
        }),
      ),
    );

    const uploaded = results
      .filter(
        (r): r is PromiseFulfilledResult<UploadedMedia> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    if (uploaded.length !== files.length) {
      results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .forEach((r) => console.error("[chat] Upload eșuat:", r.reason));
      await this.mediaService.deleteByPublicIds(
        uploaded.map((u) => u.public_id),
      );
      throw new Error("UPLOAD_FAILED");
    }

    try {
      return await prisma.$transaction(
        uploaded.map((media) =>
          prisma.message_attachments.create({
            data: {
              conversation_id: conversationId,
              uploader_id: me,
              kind: "image",
              public_id: media.public_id,
              resource_type: media.resource_type,
              url: media.url,
              width: media.width ?? null,
              height: media.height ?? null,
              bytes: media.bytes,
              format: media.format ?? null,
            },
            select: attachmentSelect,
          }),
        ),
      );
    } catch (error) {
      await this.mediaService.deleteByPublicIds(
        uploaded.map((u) => u.public_id),
      );
      throw error;
    }
  }

  async cleanupPending(): Promise<number> {
    const cutoff = new Date(Date.now() - chatConfig.pendingAttachmentTtlMs);

    const removed = await prisma.$queryRaw<
      { public_id: string; resource_type: string }[]
    >`
      DELETE FROM message_attachments
      WHERE message_id IS NULL
        AND id IN (
          SELECT id FROM message_attachments
          WHERE message_id IS NULL AND created_at < ${cutoff}
          ORDER BY created_at
          LIMIT 500
        )
      RETURNING public_id, resource_type
    `;

    await this.mediaService.deleteAssets(removed);
    return removed.length;
  }
}
