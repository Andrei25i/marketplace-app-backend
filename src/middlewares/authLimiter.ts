import { Request } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { getClientIp } from "../utils/clientIp";

const commonOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(getClientIp(req)),
  validate: { xForwardedForHeader: false },
};

export const authLimiter = rateLimit({
  ...commonOptions,
  max: 20,
  message: {
    error:
      "Prea multe încercări de autentificare. Încercați din nou mai târziu.",
  },
});

export const sessionLimiter = rateLimit({
  ...commonOptions,
  max: 300,
  message: { error: "Prea multe cereri. Încercați din nou mai târziu." },
});
