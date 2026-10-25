import { Request, Response, NextFunction } from "express";
import { authConfig } from "../config/auth.config";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const originCheck = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");

  if (!origin || origin === authConfig.frontendOrigin) return next();

  return res.status(403).json({ error: "Origine nepermisă." });
};
