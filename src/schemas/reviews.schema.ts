import { z } from "zod";
import { reviewsConfig } from "../config/reviews.config";
import type {
  CreateReviewInput,
  ListReviewsQuery,
  ReviewIdParams,
  ReviewSortOption,
  SellerIdParams,
  UpdateReviewInput,
} from "../types/reviews.type";
import { decodeReviewCursor } from "../utils/reviewCursor";
import { limitSchema, optionalQuery, uuid } from "./common.schema";

export const REVIEW_SORTS = [
  "date_desc",
  "date_asc",
  "rating_desc",
  "rating_asc",
] as const satisfies readonly ReviewSortOption[];

const RATING_ERROR = "Nota trebuie să fie un număr întreg între 1 și 5.";
const RATING_FILTER_ERROR = "Filtrul de stele trebuie să fie între 1 și 5.";
const COMMENT_ERROR = `Comentariul poate avea maxim ${reviewsConfig.maxCommentLength} de caractere.`;
const INVALID_CURSOR = "Parametrul de paginare este invalid.";

const ratingSchema = z
  .number({ error: RATING_ERROR })
  .int({ error: RATING_ERROR })
  .min(1, { error: RATING_ERROR })
  .max(5, { error: RATING_ERROR });

const commentSchema = z
  .string({ error: "Comentariul este invalid." })
  .trim()
  .max(reviewsConfig.maxCommentLength, { error: COMMENT_ERROR })
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const reviewIdParams = z.object({
  id: uuid("ID-ul recenziei este invalid."),
}) satisfies z.ZodType<ReviewIdParams>;

export const sellerIdParams = z.object({
  sellerId: uuid("ID-ul vânzătorului este invalid."),
}) satisfies z.ZodType<SellerIdParams>;

export const createReviewBody = z.object({
  sellerId: uuid("ID-ul vânzătorului este invalid."),
  rating: ratingSchema,
  comment: commentSchema.optional().transform((v) => v ?? null),
}) satisfies z.ZodType<CreateReviewInput>;

export const updateReviewBody = z
  .object({
    rating: ratingSchema.optional(),
    comment: commentSchema.optional(),
  })
  .refine((d) => d.rating !== undefined || d.comment !== undefined, {
    error: "Trimite cel puțin nota sau comentariul.",
  }) satisfies z.ZodType<UpdateReviewInput>;

export const listReviewsQuery = z.object({
  sort: optionalQuery(
    z.enum(REVIEW_SORTS, { error: "Opțiunea de sortare este invalidă." }),
  ).transform((v) => v ?? "date_desc"),
  rating: optionalQuery(
    z.coerce
      .number({ error: RATING_FILTER_ERROR })
      .int({ error: RATING_FILTER_ERROR })
      .min(1, { error: RATING_FILTER_ERROR })
      .max(5, { error: RATING_FILTER_ERROR }),
  ),
  cursor: optionalQuery(
    z
      .string({ error: INVALID_CURSOR })
      .max(512, { error: INVALID_CURSOR })
      .transform((value, ctx) => {
        const cursor = decodeReviewCursor(value);
        if (!cursor) {
          ctx.issues.push({
            code: "custom",
            message: INVALID_CURSOR,
            input: value,
          });
          return z.NEVER;
        }
        return cursor;
      }),
  ),
  limit: limitSchema(reviewsConfig.pageSize, reviewsConfig.maxPageSize),
}) satisfies z.ZodType<ListReviewsQuery>;
