import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes";
import { errorHandler } from "./middlewares/errorHandler.middleware";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serverul ruleaza pe http://localhost:${PORT}`);
});
