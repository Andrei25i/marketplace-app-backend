import { Prisma } from "@prisma/client";

// P2002 - unique constraint violation
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";
