import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { originCheck } from "./middlewares/originCheck.middleware";
import { authConfig } from "./config/auth.config";
import { startSessionCleanup, stopSessionCleanup } from "./jobs/sessionCleanup";
import prisma from "./prisma";
import { closeRealtime, initRealtime } from "./realtime/io";
import {
  startSocketSessionSweep,
  stopSocketSessionSweep,
} from "./jobs/socketSessionSweep";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.disable("x-powered-by");

app.use(
  cors({
    origin: authConfig.frontendOrigin,
    credentials: true,
    exposedHeaders: ["X-User-Version"],
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", originCheck);
app.use("/api", apiRoutes);
app.use(errorHandler);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serverul ruleaza pe http://localhost:${PORT}`);
});

initRealtime(server);
startSessionCleanup();
startSocketSessionSweep();

const shutdown = (signal: string) => {
  console.log(`${signal} primit, se opreste serverul...`);
  stopSessionCleanup();
  stopSocketSessionSweep();

  void closeRealtime().then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
