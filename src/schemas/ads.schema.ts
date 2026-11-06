import { z } from "zod";
import type {
  AdIdParams,
  AdImage,
  AdInput,
  DeleteImagesInput,
  GetAdsFilters,
} from "../types/ads.type";
import {
  AD_SORTS,
  MAX_PRICE,
  PRICE_RANGE_MESSAGE,
  citySchema,
  intId,
  optionalQuery,
  phoneSchema,
  priceFilterSchema,
  priceRangeIsValid,
  searchTextSchema,
  uuid,
} from "./common.schema";

export const MAX_AD_IMAGES = 10;

const cloudinaryPrefix = () =>
  `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;

export const adIdParams = z.object({
  id: uuid("ID-ul anunțului este invalid."),
}) satisfies z.ZodType<AdIdParams>;

export const adFiltersShape = {
  search: searchTextSchema("Textul căutat"),
  category: optionalQuery(intId("Categoria din filtru este invalidă.")),
  minPrice: priceFilterSchema("Prețul minim"),
  maxPrice: priceFilterSchema("Prețul maxim"),
  city: searchTextSchema("Localitatea"),
};

export const getAdsQuery = z
  .object({
    ...adFiltersShape,
    userId: optionalQuery(
      uuid("ID-ul utilizatorului din filtru este invalid."),
    ),
    sort: optionalQuery(
      z.enum(AD_SORTS, { error: "Opțiunea de sortare este invalidă." }),
    ),
  })
  .refine(priceRangeIsValid, {
    path: ["maxPrice"],
    error: PRICE_RANGE_MESSAGE,
  }) satisfies z.ZodType<GetAdsFilters>;

export const adImageSchema = z
  .object({
    url: z
      .string({ error: "Adresa imaginii lipsește." })
      .max(500, { error: "Adresa imaginii este prea lungă." }),
    public_id: z
      .string({ error: "Identificatorul imaginii lipsește." })
      .min(1, { error: "Identificatorul imaginii lipsește." })
      .max(255, { error: "Identificatorul imaginii este invalid." }),
  })
  .refine(
    (img) =>
      img.url.startsWith(cloudinaryPrefix()) && img.url.includes(img.public_id),
    {
      path: ["url"],
      error: "Imaginea nu a fost încărcată prin aplicație. Încarc-o din nou.",
    },
  ) satisfies z.ZodType<AdImage>;

export const adBody = z.object({
  title: z
    .string({ error: "Titlul este obligatoriu." })
    .trim()
    .min(3, { error: "Titlul trebuie să aibă cel puțin 3 caractere." })
    .max(255, { error: "Titlul poate avea maxim 255 de caractere." }),
  description: z
    .string({ error: "Descrierea este obligatorie." })
    .trim()
    .min(10, { error: "Descrierea trebuie să aibă cel puțin 10 caractere." })
    .max(5000, { error: "Descrierea poate avea maxim 5000 de caractere." }),
  price: z.coerce
    .number({ error: "Prețul este obligatoriu." })
    .positive({ error: "Prețul trebuie să fie mai mare decât 0." })
    .max(MAX_PRICE, { error: "Prețul este prea mare." })
    .transform((v) => Math.round(v * 100) / 100),
  phone_number: phoneSchema,
  currency: z
    .enum(["RON", "EUR"], { error: "Moneda trebuie să fie RON sau EUR." })
    .default("RON"),
  category_id: intId("Selectează o categorie validă."),
  city: citySchema(255),
  images: z
    .array(adImageSchema, { error: "Trebuie să existe cel puțin o imagine." })
    .min(1, { error: "Trebuie să existe cel puțin o imagine." })
    .max(MAX_AD_IMAGES, {
      error: `Poți folosi maximum ${MAX_AD_IMAGES} imagini.`,
    })
    .refine(
      (imgs) => new Set(imgs.map((i) => i.public_id)).size === imgs.length,
      { error: "Aceeași imagine apare de mai multe ori." },
    ),
}) satisfies z.ZodType<AdInput>;

export const deleteImagesBody = z.object({
  publicIds: z
    .array(
      z
        .string({ error: "Lista de imagini este invalidă." })
        .min(1, { error: "Lista de imagini este invalidă." })
        .max(255, { error: "Lista de imagini este invalidă." }),
      { error: "Lista de imagini este invalidă." },
    )
    .max(100, { error: "Poți șterge maxim 100 de imagini odată." }),
}) satisfies z.ZodType<DeleteImagesInput>;
