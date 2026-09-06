import { AdSortOption } from "./ads.type";

export type FavoriteSortOption =
  | AdSortOption
  | "favorited_date_asc"
  | "favorited_date_desc";

export type GetFavoritesFilters = {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: FavoriteSortOption;
  city?: string;
};
