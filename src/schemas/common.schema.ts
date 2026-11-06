import { z } from "zod";
import type { GetAdsFilters } from "../types/ads.type";

const INT_MAX = 2_147_483_647;
export const MAX_PRICE = 99_999_999.99;

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const collapseSpaces = (value: string) => value.replace(/\s+/g, " ");

export const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional()).optional();

export const uuid = (message: string) =>
  z.guid({ error: message }).transform((value) => value.toLowerCase());

export const intId = (message: string) =>
  z.coerce
    .number({ error: message })
    .int({ error: message })
    .min(1, { error: message })
    .max(INT_MAX, { error: message });

export const requiredString = (message: string) =>
  z.string({ error: message }).min(1, { error: message });

export const emailSchema = z
  .string({ error: "Adresa de email este obligatorie." })
  .trim()
  .toLowerCase()
  .min(1, { error: "Adresa de email este obligatorie." })
  .max(100, { error: "Adresa de email poate avea maxim 100 de caractere." })
  .pipe(z.email({ error: "Adresa de email nu este validă." }));

export const passwordSchema = z
  .string({ error: "Parola este obligatorie." })
  .min(6, { error: "Parola trebuie să aibă minim 6 caractere." })
  .max(72, { error: "Parola poate avea maxim 72 de caractere." });

export const nameSchema = (label: string) =>
  z
    .string({ error: `${label} este obligatoriu.` })
    .trim()
    .overwrite(collapseSpaces)
    .min(2, { error: `${label} trebuie să aibă cel puțin 2 caractere.` })
    .max(50, { error: `${label} poate avea maxim 50 de caractere.` })
    .regex(/^[\p{L}][\p{L}\s'-]*$/u, {
      error: `${label} poate conține doar litere, spații, apostrof și cratimă.`,
    });

export const phoneSchema = z
  .string({ error: "Numărul de telefon este obligatoriu." })
  .overwrite((value) => value.replace(/[\s().-]/g, ""))
  .regex(/^\+?\d{9,14}$/, {
    error: "Numărul de telefon nu este valid (9–14 cifre, opțional cu +).",
  });

export const citySchema = (max: number) =>
  z
    .string({ error: "Localitatea este obligatorie." })
    .trim()
    .overwrite(collapseSpaces)
    .min(2, { error: "Localitatea este obligatorie." })
    .max(max, { error: `Localitatea poate avea maxim ${max} de caractere.` });

export const limitSchema = (defaultValue: number, max: number) =>
  z.coerce
    .number({ error: "Parametrul limit trebuie să fie un număr." })
    .int({ error: "Parametrul limit trebuie să fie un număr întreg." })
    .min(1, { error: "Parametrul limit trebuie să fie cel puțin 1." })
    .max(max, { error: `Parametrul limit poate fi maxim ${max}.` })
    .default(defaultValue);

export const searchTextSchema = (label: string) =>
  optionalQuery(
    z
      .string({ error: "Parametrul de căutare este invalid." })
      .trim()
      .max(100, { error: `${label} poate avea maxim 100 de caractere.` }),
  );

export const priceFilterSchema = (label: string) =>
  optionalQuery(
    z.coerce
      .number({ error: `${label} trebuie să fie un număr.` })
      .min(0, { error: `${label} nu poate fi negativ.` })
      .max(MAX_PRICE, { error: `${label} este prea mare.` }),
  );

export const priceRangeIsValid = (
  q: Pick<GetAdsFilters, "minPrice" | "maxPrice">,
) =>
  q.minPrice === undefined ||
  q.maxPrice === undefined ||
  q.minPrice <= q.maxPrice;

export const PRICE_RANGE_MESSAGE =
  "Prețul maxim trebuie să fie mai mare sau egal cu prețul minim.";

export const AD_SORTS = [
  "price_asc",
  "price_desc",
  "date_asc",
  "date_desc",
  "name_asc",
  "name_desc",
] as const;
