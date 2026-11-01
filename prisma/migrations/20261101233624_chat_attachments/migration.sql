-- CreateEnum
CREATE TYPE "attachment_kind" AS ENUM ('image', 'audio');

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "message_id" UUID,
    "conversation_id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "kind" "attachment_kind" NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "resource_type" VARCHAR(10) NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER NOT NULL,
    "format" VARCHAR(16),
    "duration_ms" INTEGER,
    "position" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_attachments_public_id_key" ON "message_attachments"("public_id");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_position_idx" ON "message_attachments"("message_id", "position");

-- CreateIndex
CREATE INDEX "message_attachments_conversation_id_idx" ON "message_attachments"("conversation_id");

-- CreateIndex
CREATE INDEX "message_attachments_uploader_id_idx" ON "message_attachments"("uploader_id");

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "fk_attachment_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "fk_attachment_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "fk_attachment_uploader" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Partial index for the cleanup job (uploaded but never sent)
CREATE INDEX "message_attachments_pending_idx" ON "message_attachments" ("created_at") WHERE "message_id" IS NULL;

-- Sanity checks
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_position_chk" CHECK ("position" >= 0 AND "position" < 10);
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_bytes_chk" CHECK ("bytes" > 0);
