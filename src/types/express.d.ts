export interface AuthUser {
  id: string;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
