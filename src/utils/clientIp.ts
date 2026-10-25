import { Request } from "express";

export const getClientIp = (req: Request): string =>
  req.get("cf-connecting-ip")?.trim() ||
  req.get("true-client-ip")?.trim() ||
  req.ip ||
  "unknown";
