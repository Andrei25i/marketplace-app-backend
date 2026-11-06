import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { collectFieldErrors, sendValidationError } from "./validate.middleware";

const getBodyParserErrorType = (err: unknown): string | null =>
  typeof err === "object" &&
  err !== null &&
  "type" in err &&
  typeof err.type === "string"
    ? err.type
    : null;

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof MulterError) {
    const isVoice = req.originalUrl.includes("/attachments/voice");

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: isVoice
          ? "Mesajul vocal depășește dimensiunea maximă permisă (10MB)."
          : "Imaginea depășește dimensiunea maximă permisă (5MB).",
      });
    }
    if (
      err.code === "LIMIT_FILE_COUNT" ||
      err.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      return res.status(400).json({
        error: isVoice
          ? "Trimite un singur fișier audio."
          : "Doar fișiere imagine sunt permise (max 10).",
      });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return sendValidationError(res, collectFieldErrors(err));
  }

  const bodyErrorType = getBodyParserErrorType(err);
  if (bodyErrorType === "entity.parse.failed") {
    return res.status(400).json({
      error: "Corpul cererii nu este un JSON valid.",
      code: "INVALID_JSON",
    });
  }
  if (bodyErrorType === "entity.too.large") {
    return res.status(413).json({ error: "Datele trimise sunt prea mari." });
  }

  console.error(err);
  return res.status(500).json({ error: "A apărut o eroare neașteptată." });
};
