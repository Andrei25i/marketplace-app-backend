import { z } from "zod";
import type {
  CategoryIdParams,
  GetCategoriesFilters,
} from "../types/categories.type";
import { intId, optionalQuery } from "./common.schema";

export const getCategoriesQuery = z.object({
  sort: optionalQuery(
    z.enum(["id", "id_asc", "id_desc", "name_asc", "name_desc"], {
      error: "Opțiunea de sortare este invalidă.",
    }),
  ),
}) satisfies z.ZodType<GetCategoriesFilters>;

export const categoryIdParams = z.object({
  id: intId("ID-ul categoriei trebuie să fie un număr valid."),
}) satisfies z.ZodType<CategoryIdParams>;
