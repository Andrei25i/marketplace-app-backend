import type { Request, RequestHandler, Response } from "express";
import type { ZodError, ZodType } from "zod";

type RequestPart = "params" | "query" | "body";
type ValidationSchemas = Partial<Record<RequestPart, ZodType>>;

const PARTS: RequestPart[] = ["params", "query", "body"];

export const collectFieldErrors = (
  error: ZodError,
  fallbackKey = "body",
  fields: Record<string, string> = {},
) => {
  for (const issue of error.issues) {
    const key =
      issue.path.length > 0 ? issue.path.map(String).join(".") : fallbackKey;
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
};

export const sendValidationError = (
  res: Response,
  fields: Record<string, string>,
) =>
  res.status(400).json({
    error: Object.values(fields)[0] ?? "Datele trimise sunt invalide.",
    code: "VALIDATION_ERROR",
    fields,
  });

export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, res, next) => {
    const fields: Record<string, string> = {};
    const validated: Partial<Record<RequestPart, unknown>> = {};

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part] ?? {});
      if (result.success) validated[part] = result.data;
      else collectFieldErrors(result.error, part, fields);
    }

    if (Object.keys(fields).length > 0) {
      sendValidationError(res, fields);
      return;
    }

    if (schemas.body) req.body = validated.body;
    req.validated = { ...req.validated, ...validated };
    next();
  };

export const fieldError = (field: string, message: string) => ({
  error: message,
  fields: { [field]: message },
});

export const getValidated = <T>(req: Request, part: RequestPart): T => {
  if (!req.validated || !(part in req.validated)) {
    throw new Error(
      `Lipsește validate({ ${part} }) pe ruta ${req.method} ${req.originalUrl}`,
    );
  }
  return req.validated[part] as T;
};
