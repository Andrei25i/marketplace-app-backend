-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reviewer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_rating_stats" (
    "user_id" UUID NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "rating_sum" INTEGER NOT NULL DEFAULT 0,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "count_1" INTEGER NOT NULL DEFAULT 0,
    "count_2" INTEGER NOT NULL DEFAULT 0,
    "count_3" INTEGER NOT NULL DEFAULT 0,
    "count_4" INTEGER NOT NULL DEFAULT 0,
    "count_5" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "seller_rating_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "reviews_seller_id_created_at_id_idx" ON "reviews"("seller_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "reviews_seller_id_rating_created_at_id_idx" ON "reviews"("seller_id", "rating" DESC, "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_created_at_id_idx" ON "reviews"("reviewer_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewer_id_seller_id_key" ON "reviews"("reviewer_id", "seller_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_review_reviewer" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_review_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seller_rating_stats" ADD CONSTRAINT "fk_rating_stats_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- =====================================================================
-- Reviews: constraints, rating aggregation and immutability guard
-- =====================================================================

-- 1) CHECK constraints
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_chk"   CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "reviews_not_self_chk" CHECK ("reviewer_id" <> "seller_id");

ALTER TABLE "seller_rating_stats"
  ADD CONSTRAINT "seller_rating_stats_non_negative_chk" CHECK (
    "review_count" >= 0 AND "rating_sum" >= 0 AND
    "count_1" >= 0 AND "count_2" >= 0 AND "count_3" >= 0 AND
    "count_4" >= 0 AND "count_5" >= 0
  );

-- 2) Incremental O(1) update of one seller's aggregate.
--    p_sign = +1 adds a rating, -1 removes one.
CREATE OR REPLACE FUNCTION seller_rating_apply_delta(
  p_seller uuid,
  p_rating smallint,
  p_sign   integer
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_sign > 0 THEN
    -- Upsert: the stats row is created on the seller's first review.
    -- ON CONFLICT DO UPDATE takes a row lock, so concurrent inserts are safe.
    INSERT INTO seller_rating_stats AS s
      (user_id, review_count, rating_sum, rating_avg,
       count_1, count_2, count_3, count_4, count_5)
    VALUES
      (p_seller, 1, p_rating, p_rating,
       (p_rating = 1)::int, (p_rating = 2)::int, (p_rating = 3)::int,
       (p_rating = 4)::int, (p_rating = 5)::int)
    ON CONFLICT (user_id) DO UPDATE SET
      review_count = s.review_count + 1,
      rating_sum   = s.rating_sum + EXCLUDED.rating_sum,
      count_1      = s.count_1 + EXCLUDED.count_1,
      count_2      = s.count_2 + EXCLUDED.count_2,
      count_3      = s.count_3 + EXCLUDED.count_3,
      count_4      = s.count_4 + EXCLUDED.count_4,
      count_5      = s.count_5 + EXCLUDED.count_5,
      rating_avg   = round(
                       (s.rating_sum + EXCLUDED.rating_sum)::numeric
                       / (s.review_count + 1), 2);
  ELSE
    -- Plain UPDATE (no upsert): when the seller's account is deleted,
    -- the stats row may already be gone through the cascade, and inserting
    -- a new row would violate the FK.
    UPDATE seller_rating_stats AS s SET
      review_count = s.review_count - 1,
      rating_sum   = s.rating_sum - p_rating,
      count_1      = s.count_1 - (p_rating = 1)::int,
      count_2      = s.count_2 - (p_rating = 2)::int,
      count_3      = s.count_3 - (p_rating = 3)::int,
      count_4      = s.count_4 - (p_rating = 4)::int,
      count_5      = s.count_5 - (p_rating = 5)::int,
      rating_avg   = CASE
                       WHEN s.review_count - 1 <= 0 THEN 0
                       ELSE round((s.rating_sum - p_rating)::numeric
                                  / (s.review_count - 1), 2)
                     END
    WHERE s.user_id = p_seller;
  END IF;
END;
$$;

-- 3) Trigger that keeps seller_rating_stats in sync
CREATE OR REPLACE FUNCTION reviews_stats_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM seller_rating_apply_delta(NEW.seller_id, NEW.rating, 1);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM seller_rating_apply_delta(OLD.seller_id, OLD.rating, -1);
  ELSIF TG_OP = 'UPDATE' AND NEW.rating IS DISTINCT FROM OLD.rating THEN
    PERFORM seller_rating_apply_delta(OLD.seller_id, OLD.rating, -1);
    PERFORM seller_rating_apply_delta(NEW.seller_id, NEW.rating, 1);
  END IF;
  RETURN NULL; -- AFTER trigger, the return value is ignored
END;
$$;

CREATE TRIGGER trg_reviews_stats
AFTER INSERT OR DELETE OR UPDATE OF rating ON "reviews"
FOR EACH ROW EXECUTE FUNCTION reviews_stats_trigger();

-- 4) Guard: a review cannot be moved to another author or seller
CREATE OR REPLACE FUNCTION reviews_guard_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reviewer_id <> OLD.reviewer_id OR NEW.seller_id <> OLD.seller_id THEN
    RAISE EXCEPTION 'reviews.reviewer_id and reviews.seller_id are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reviews_guard
BEFORE UPDATE OF reviewer_id, seller_id ON "reviews"
FOR EACH ROW EXECUTE FUNCTION reviews_guard_immutable();

-- 5) Maintenance: full recompute for one seller (repair/verification only)
CREATE OR REPLACE FUNCTION recompute_seller_rating(p_seller uuid) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO seller_rating_stats
    (user_id, review_count, rating_sum, rating_avg,
     count_1, count_2, count_3, count_4, count_5)
  SELECT
    p_seller,
    count(*),
    coalesce(sum(rating), 0),
    coalesce(round(avg(rating), 2), 0),
    count(*) FILTER (WHERE rating = 1),
    count(*) FILTER (WHERE rating = 2),
    count(*) FILTER (WHERE rating = 3),
    count(*) FILTER (WHERE rating = 4),
    count(*) FILTER (WHERE rating = 5)
  FROM reviews
  WHERE seller_id = p_seller
  ON CONFLICT (user_id) DO UPDATE SET
    review_count = EXCLUDED.review_count,
    rating_sum   = EXCLUDED.rating_sum,
    rating_avg   = EXCLUDED.rating_avg,
    count_1      = EXCLUDED.count_1,
    count_2      = EXCLUDED.count_2,
    count_3      = EXCLUDED.count_3,
    count_4      = EXCLUDED.count_4,
    count_5      = EXCLUDED.count_5;
$$;

-- 6) Idempotent backfill
SELECT recompute_seller_rating(t.seller_id)
FROM (SELECT DISTINCT seller_id FROM reviews) AS t;