export type ReviewSortOption =
  "date_desc" | "date_asc" | "rating_desc" | "rating_asc";

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface ReviewUserDTO {
  id: string;
  first_name: string;
  last_name: string;
}

interface ReviewBaseDTO {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface ReviewDTO extends ReviewBaseDTO {
  reviewer: ReviewUserDTO;
}

export interface WrittenReviewDTO extends ReviewBaseDTO {
  seller: ReviewUserDTO;
}

export interface RatingSummaryDTO {
  average: number;
  count: number;
  distribution: Record<RatingValue, number>;
}

export interface ReviewIdParams {
  id: string;
}

export interface SellerIdParams {
  sellerId: string;
}

export interface CreateReviewInput {
  sellerId: string;
  rating: number;
  comment: string | null;
}

export interface UpdateReviewInput {
  rating?: number | undefined;
  comment?: string | null | undefined;
}

export interface ReviewCursor {
  rating: number;
  createdAt: Date;
  id: string;
}

export interface ListReviewsQuery {
  sort: ReviewSortOption;
  rating?: number | undefined;
  cursor?: ReviewCursor | undefined;
  limit: number;
}
