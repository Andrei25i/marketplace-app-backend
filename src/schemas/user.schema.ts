import { z } from "zod";
import type {
  DeleteAccountInput,
  UpdateProfileDTO,
  UserIdParams,
} from "../types/user.type";
import {
  citySchema,
  emailSchema,
  nameSchema,
  phoneSchema,
  requiredString,
  uuid,
} from "./common.schema";

export const userIdParams = z.object({
  id: uuid("ID-ul utilizatorului este invalid."),
}) satisfies z.ZodType<UserIdParams>;

export const updateProfileBody = z
  .object({
    first_name: nameSchema("Prenumele").optional(),
    last_name: nameSchema("Numele").optional(),
    email: emailSchema.optional(),
    phone_number: phoneSchema.optional(),
    city: citySchema(100).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    error:
      "Nu ați furnizat date noi pentru actualizare. Nicio acțiune nu a fost efectuată.",
  }) satisfies z.ZodType<UpdateProfileDTO>;

export const deleteAccountBody = z.object({
  password: requiredString(
    "Parola este necesară pentru a confirma ștergerea contului.",
  ),
}) satisfies z.ZodType<DeleteAccountInput>;
