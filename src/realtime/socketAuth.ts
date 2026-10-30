import { parseCookie } from "cookie";
import { authConfig } from "../config/auth.config";
import { AppSocket } from "./types";
import { sessionService } from "../services/session.service";
import { ACCESS_COOKIE } from "../utils/authCookies";
import { ExtendedError } from "socket.io";

type SocketAuthError = "FORBIDDEN_ORIGIN" | "UNAUTHENTICATED";

const authenticateSocket = async (
  socket: AppSocket,
): Promise<SocketAuthError | null> => {
  const origin = socket.handshake.headers.origin;
  if (origin && origin !== authConfig.frontendOrigin) return "FORBIDDEN_ORIGIN";

  const cookies = parseCookie(socket.handshake.headers.cookie ?? "");
  const auth = await sessionService.authenticate(cookies[ACCESS_COOKIE]);
  if (!auth) return "UNAUTHENTICATED";

  socket.data.userId = auth.userId;
  socket.data.sessionId = auth.sessionId;
  socket.data.verifiedConversations = new Set();
  socket.data.typingAt = new Map();

  return null;
};

export const socketAuth = (
  socket: AppSocket,
  next: (err?: ExtendedError) => void,
) => {
  authenticateSocket(socket)
    .then((error) => next(error ? new Error(error) : undefined))
    .catch((error: unknown) => {
      console.error("Eroare la autentificarea socket-ului:", error);
      next(new Error("SERVER_ERROR"));
    });
};
