CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."ads" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "category_id" INTEGER,
    "city" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'RON',
    "images" JSONB DEFAULT '[]',

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."favorites" (
    "user_id" UUID NOT NULL,
    "ad_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","ad_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."ads" ADD CONSTRAINT "fk_category" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ads" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "fk_ad" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
