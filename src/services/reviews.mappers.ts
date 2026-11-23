import { Prisma } from "@prisma/client";
import {
  RatingSummaryDTO,
  ReviewDTO,
  WrittenReviewDTO,
} from "../types/reviews.type";

const reviewUserSelect = {
  id: true,
  first_name: true,
  last_name: true,
} satisfies Prisma.usersSelect;

const reviewBaseSelect = {
  id: true,
  rating: true,
  comment: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.reviewsSelect;

export const sellerReviewSelect = {
  ...reviewBaseSelect,
  reviewer: { select: reviewUserSelect },
} satisfies Prisma.reviewsSelect;

export const writtenReviewSelect = {
  ...reviewBaseSelect,
  seller: { select: reviewUserSelect },
} satisfies Prisma.reviewsSelect;

export const ratingStatsSelect = {
  review_count: true,
  rating_avg: true,
  count_1: true,
  count_2: true,
  count_3: true,
  count_4: true,
  count_5: true,
} satisfies Prisma.seller_rating_statsSelect;

type ReviewBaseRow = Prisma.reviewsGetPayload<{
  select: typeof reviewBaseSelect;
}>;
export type SellerReviewRow = Prisma.reviewsGetPayload<{
  select: typeof sellerReviewSelect;
}>;
export type WrittenReviewRow = Prisma.reviewsGetPayload<{
  select: typeof writtenReviewSelect;
}>;
export type RatingStatsRow = Prisma.seller_rating_statsGetPayload<{
  select: typeof ratingStatsSelect;
}>;

const toBaseDTO = (row: ReviewBaseRow) => ({
  id: row.id,
  rating: row.rating,
  comment: row.comment,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
  is_edited: row.updated_at.getTime() > row.created_at.getTime(),
});

export const toReviewDTO = (row: SellerReviewRow): ReviewDTO => ({
  ...toBaseDTO(row),
  reviewer: row.reviewer,
});

export const toWrittenReviewDTO = (
  row: WrittenReviewRow,
): WrittenReviewDTO => ({
  ...toBaseDTO(row),
  seller: row.seller,
});

export const toRatingSummary = (
  stats: RatingStatsRow | null | undefined,
): RatingSummaryDTO => ({
  average: stats ? stats.rating_avg.toNumber() : 0,
  count: stats?.review_count ?? 0,
  distribution: {
    1: stats?.count_1 ?? 0,
    2: stats?.count_2 ?? 0,
    3: stats?.count_3 ?? 0,
    4: stats?.count_4 ?? 0,
    5: stats?.count_5 ?? 0,
  },
});
