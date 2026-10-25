import { Request, Response, NextFunction } from "express";
import { sessionService } from "../services/session.service";
import { ACCESS_COOKIE } from "../utils/authCookies";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const auth = await sessionService.authenticate(
      req.cookies?.[ACCESS_COOKIE],
    );

    if (!auth) {
      return res.status(401).json({
        error: "Sesiune invalidă sau expirată.",
        code: "UNAUTHENTICATED",
      });
    }

    req.user = { id: auth.userId, sessionId: auth.sessionId };
    res.setHeader("X-User-Version", String(auth.userVersion));
    next();
  } catch (error) {
    next(error);
  }
};
