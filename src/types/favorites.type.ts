import type { AdSortOption, GetAdsFilters } from "./ads.type";

export type FavoriteSortOption =
  AdSortOption | "favorited_date_asc" | "favorited_date_desc";

export interface GetFavoritesFilters extends Omit<
  GetAdsFilters,
  "userId" | "sort"
> {
  sort?: FavoriteSortOption | undefined;
}

export interface FavoriteAdParams {
  adId: string;
}
