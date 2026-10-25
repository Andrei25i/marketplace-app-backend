import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: process.env.APP_VERSION ?? "dev",
    uptime: process.uptime(),
  });
});

router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "up" });
  } catch {
    res.status(503).json({ status: "error", database: "down" });
  }
});

const cookieTest = (req: Request, res: Response) => {
  res.cookie("render_test", String(Date.now()), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api",
    maxAge: 5 * 60 * 1000,
  });

  res.json({
    receivedCookies: req.headers.cookie ?? null,
    origin: req.get("origin") ?? null,
    host: req.get("host"),
    ip: req.ip,
    forwardedFor: req.get("x-forwarded-for") ?? null,
    trueClientIp: req.get("true-client-ip") ?? null,
    cfConnectingIp: req.get("cf-connecting-ip") ?? null,
  });
};

router.get("/cookie-test", cookieTest);
router.post("/cookie-test", cookieTest);

export default router;
