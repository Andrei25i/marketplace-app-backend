export type CategorySortOption =
  "id" | "id_asc" | "id_desc" | "name_asc" | "name_desc";

export interface GetCategoriesFilters {
  sort?: CategorySortOption | undefined;
}

export interface CategoryIdParams {
  id: number;
}
