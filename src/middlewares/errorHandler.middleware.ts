import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

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

  if (err instanceof Error) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: "A apărut o eroare neașteptată." });
};
