import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { Paginated } from "../types/chat.type";
import {
  CreateReviewInput,
  ListReviewsQuery,
  ReviewDTO,
  UpdateReviewInput,
  WrittenReviewDTO,
} from "../types/reviews.type";
import { isRecordNotFound, isUniqueViolation } from "../utils/prismaErrors";
import {
  paginateReviews,
  reviewListWhere,
  reviewOrderBy,
} from "../utils/reviewCursor";
import {
  sellerReviewSelect,
  toReviewDTO,
  toWrittenReviewDTO,
  writtenReviewSelect,
} from "./reviews.mappers";

export class ReviewsService {
  async listForSeller(
    sellerId: string,
    query: ListReviewsQuery,
  ): Promise<Paginated<ReviewDTO>> {
    const [seller, rows] = await Promise.all([
      prisma.users.findUnique({
        where: { id: sellerId },
        select: { id: true },
      }),
      prisma.reviews.findMany({
        where: reviewListWhere({ seller_id: sellerId }, query),
        orderBy: reviewOrderBy(query.sort),
        take: query.limit + 1,
        select: sellerReviewSelect,
      }),
    ]);

    if (!seller) throw new Error("SELLER_NOT_FOUND");

    return paginateReviews(rows, query.limit, toReviewDTO);
  }

  async listWritten(
    me: string,
    query: ListReviewsQuery,
  ): Promise<Paginated<WrittenReviewDTO>> {
    const rows = await prisma.reviews.findMany({
      where: reviewListWhere({ reviewer_id: me }, query),
      orderBy: reviewOrderBy(query.sort),
      take: query.limit + 1,
      select: writtenReviewSelect,
    });

    return paginateReviews(rows, query.limit, toWrittenReviewDTO);
  }

  async getMineForSeller(
    me: string,
    sellerId: string,
  ): Promise<ReviewDTO | null> {
    const row = await prisma.reviews.findUnique({
      where: {
        reviewer_id_seller_id: { reviewer_id: me, seller_id: sellerId },
      },
      select: sellerReviewSelect,
    });
    return row ? toReviewDTO(row) : null;
  }

  async create(me: string, input: CreateReviewInput): Promise<ReviewDTO> {
    if (input.sellerId === me) throw new Error("SELF_REVIEW");

    const seller = await prisma.users.findUnique({
      where: { id: input.sellerId },
      select: { id: true },
    });
    if (!seller) throw new Error("SELLER_NOT_FOUND");

    const now = new Date();

    try {
      const row = await prisma.reviews.create({
        data: {
          reviewer_id: me,
          seller_id: input.sellerId,
          rating: input.rating,
          comment: input.comment,
          created_at: now,
          updated_at: now,
        },
        select: sellerReviewSelect,
      });
      return toReviewDTO(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("ALREADY_REVIEWED", { cause: error });
      }
      throw error;
    }
  }

  async update(
    me: string,
    reviewId: string,
    input: UpdateReviewInput,
  ): Promise<ReviewDTO> {
    const existing = await prisma.reviews.findUnique({
      where: { id: reviewId },
      select: { ...sellerReviewSelect, reviewer_id: true },
    });

    if (!existing) throw new Error("NOT_FOUND");
    if (existing.reviewer_id !== me) throw new Error("FORBIDDEN");

    const data: Prisma.reviewsUpdateInput = {};
    if (input.rating !== undefined && input.rating !== existing.rating) {
      data.rating = input.rating;
    }
    if (input.comment !== undefined && input.comment !== existing.comment) {
      data.comment = input.comment;
    }

    if (Object.keys(data).length === 0) return toReviewDTO(existing);

    try {
      const row = await prisma.reviews.update({
        where: { id: reviewId, reviewer_id: me },
        data,
        select: sellerReviewSelect,
      });
      return toReviewDTO(row);
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new Error("NOT_FOUND", { cause: error });
      }
      throw error;
    }
  }

  async remove(me: string, reviewId: string): Promise<{ sellerId: string }> {
    const existing = await prisma.reviews.findUnique({
      where: { id: reviewId },
      select: { reviewer_id: true, seller_id: true },
    });

    if (!existing) throw new Error("NOT_FOUND");
    if (existing.reviewer_id !== me) throw new Error("FORBIDDEN");

    try {
      await prisma.reviews.delete({ where: { id: reviewId, reviewer_id: me } });
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new Error("NOT_FOUND", { cause: error });
      }
      throw error;
    }

    return { sellerId: existing.seller_id };
  }
}
