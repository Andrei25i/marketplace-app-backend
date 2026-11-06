import { z } from "zod";
import type {
  FavoriteAdParams,
  GetFavoritesFilters,
} from "../types/favorites.type";
import { adFiltersShape } from "./ads.schema";
import {
  AD_SORTS,
  PRICE_RANGE_MESSAGE,
  optionalQuery,
  priceRangeIsValid,
  uuid,
} from "./common.schema";

const FAVORITE_SORTS = [
  ...AD_SORTS,
  "favorited_date_asc",
  "favorited_date_desc",
] as const;

export const getFavoritesQuery = z
  .object({
    ...adFiltersShape,
    sort: optionalQuery(
      z.enum(FAVORITE_SORTS, { error: "Opțiunea de sortare este invalidă." }),
    ),
  })
  .refine(priceRangeIsValid, {
    path: ["maxPrice"],
    error: PRICE_RANGE_MESSAGE,
  }) satisfies z.ZodType<GetFavoritesFilters>;

export const favoriteAdParams = z.object({
  adId: uuid("ID-ul anunțului este invalid."),
}) satisfies z.ZodType<FavoriteAdParams>;
