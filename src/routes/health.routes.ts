import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "up" });
  } catch {
    res.status(503).json({ status: "error", database: "down" });
  }
});

export default router;
