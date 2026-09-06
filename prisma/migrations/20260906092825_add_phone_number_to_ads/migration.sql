-- This is an empty migration.
ALTER TABLE "ads" ADD COLUMN "phone_number" VARCHAR(20);

UPDATE "ads"
SET "phone_number" = "users"."phone_number"
FROM "users"
WHERE "ads"."user_id" = "users"."id";

ALTER TABLE "ads" ALTER COLUMN "phone_number" SET NOT NULL;