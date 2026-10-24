import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import prisma from "./prisma";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);
app.use(errorHandler);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serverul ruleaza pe http://localhost:${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} primit, se opreste serverul...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
