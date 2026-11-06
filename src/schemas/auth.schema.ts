import { z } from "zod";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterUserInput,
  ResetPasswordInput,
  SessionIdParams,
} from "../types/auth.type";
import {
  citySchema,
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  requiredString,
  uuid,
} from "./common.schema";

export const registerBody = z.object({
  first_name: nameSchema("Prenumele"),
  last_name: nameSchema("Numele"),
  email: emailSchema,
  phone_number: phoneSchema,
  password: passwordSchema,
  city: citySchema(100),
}) satisfies z.ZodType<RegisterUserInput>;

export const loginBody = z.object({
  email: emailSchema,
  password: requiredString("Parola este obligatorie."),
}) satisfies z.ZodType<LoginInput>;

export const forgotPasswordBody = z.object({
  email: emailSchema,
}) satisfies z.ZodType<ForgotPasswordInput>;

export const resetPasswordBody = z.object({
  token: requiredString("Link-ul de resetare este invalid.").max(2048, {
    error: "Link-ul de resetare este invalid.",
  }),
  newPassword: passwordSchema,
}) satisfies z.ZodType<ResetPasswordInput>;

export const changePasswordBody = z
  .object({
    currentPassword: requiredString("Parola actuală este obligatorie."),
    newPassword: passwordSchema,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    error: "Parola nouă trebuie să fie diferită de cea actuală.",
  }) satisfies z.ZodType<ChangePasswordInput>;

export const sessionIdParams = z.object({
  id: uuid("ID-ul sesiunii este invalid."),
}) satisfies z.ZodType<SessionIdParams>;
