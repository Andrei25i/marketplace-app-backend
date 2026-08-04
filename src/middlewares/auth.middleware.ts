import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acces refuzat. Token lipsă." });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET nu este definit în .env");
    }

    const decodedPayload = jwt.verify(token, secret) as JwtPayload;
    req.user = decodedPayload;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token invalid sau expirat." });
  }
};
