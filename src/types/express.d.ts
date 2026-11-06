export interface AuthUser {
  id: string;
  sessionId: string;
}

export type ValidatedParts = Partial<
  Record<"params" | "query" | "body", unknown>
>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated?: ValidatedParts;
    }
  }
}
