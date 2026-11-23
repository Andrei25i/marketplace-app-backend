import type { Prisma } from "@prisma/client";
import type { Paginated } from "../types/chat.type";
import type {
  ListReviewsQuery,
  ReviewCursor,
  ReviewSortOption,
} from "../types/reviews.type";

interface CursorPayload {
  r: number;
  t: string;
  id: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type CursorRow = { rating: number; created_at: Date; id: string };

export const encodeReviewCursor = (row: CursorRow): string => {
  const payload: CursorPayload = {
    r: row.rating,
    t: row.created_at.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
};

export const decodeReviewCursor = (value: string): ReviewCursor | null => {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (typeof parsed !== "object" || parsed === null) return null;

    const { r, t, id } = parsed as Partial<CursorPayload>;
    if (typeof r !== "number" || !Number.isInteger(r) || r < 1 || r > 5) {
      return null;
    }
    if (typeof t !== "string" || Number.isNaN(Date.parse(t))) return null;
    if (typeof id !== "string" || !UUID_RE.test(id)) return null;

    return { rating: r, createdAt: new Date(t), id: id.toLowerCase() };
  } catch {
    return null;
  }
};

export const reviewOrderBy = (
  sort: ReviewSortOption,
): Prisma.reviewsOrderByWithRelationInput[] => {
  switch (sort) {
    case "date_asc":
      return [{ created_at: "asc" }, { id: "asc" }];
    case "rating_desc":
      return [{ rating: "desc" }, { created_at: "desc" }, { id: "desc" }];
    case "rating_asc":
      return [{ rating: "asc" }, { created_at: "desc" }, { id: "desc" }];
    case "date_desc":
    default:
      return [{ created_at: "desc" }, { id: "desc" }];
  }
};

export const reviewKeysetWhere = (
  sort: ReviewSortOption,
  cursor: ReviewCursor,
): Prisma.reviewsWhereInput => {
  const dateAsc = sort === "date_asc";

  const afterByDate: Prisma.reviewsWhereInput = {
    OR: [
      {
        created_at: dateAsc
          ? { gt: cursor.createdAt }
          : { lt: cursor.createdAt },
      },
      {
        created_at: cursor.createdAt,
        id: dateAsc ? { gt: cursor.id } : { lt: cursor.id },
      },
    ],
  };

  if (sort === "date_asc" || sort === "date_desc") return afterByDate;

  return {
    OR: [
      {
        rating:
          sort === "rating_desc"
            ? { lt: cursor.rating }
            : { gt: cursor.rating },
      },
      { rating: cursor.rating, ...afterByDate },
    ],
  };
};

export const reviewListWhere = (
  base: Prisma.reviewsWhereInput,
  { sort, rating, cursor }: ListReviewsQuery,
): Prisma.reviewsWhereInput => {
  const and: Prisma.reviewsWhereInput[] = [base];
  if (rating !== undefined) and.push({ rating });
  if (cursor) and.push(reviewKeysetWhere(sort, cursor));
  return { AND: and };
};

export const paginateReviews = <Row extends CursorRow, DTO>(
  rows: Row[],
  limit: number,
  toDTO: (row: Row) => DTO,
): Paginated<DTO> => {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    items: page.map(toDTO),
    nextCursor: hasMore && last ? encodeReviewCursor(last) : null,
  };
};
