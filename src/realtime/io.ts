import type { Server as HttpServer } from "node:http";
import { AppServer } from "./types";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket.type";
import { chatConfig } from "../config/chat.config";
import { authConfig } from "../config/auth.config";
import { socketAuth } from "./socketAuth";
import { registerConnectionHandlers } from "./connection";

let io: AppServer | null = null;

export const initRealtime = (server: HttpServer): AppServer => {
  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    path: "/api/socket.io",
    serveClient: false,
    maxHttpBufferSize: chatConfig.socketMaxPayloadBytes,
    cors: {
      origin: authConfig.frontendOrigin,
      credentials: true,
    },
  });

  io.use(socketAuth);
  registerConnectionHandlers(io);

  return io;
};

export const getIO = (): AppServer => {
  if (!io) throw new Error("Socket.io nu este inițializat.");
  return io;
};

export const closeRealtime = () =>
  new Promise<void>((resolve) => {
    if (!io) return resolve();
    void io.close(() => resolve());
  });
