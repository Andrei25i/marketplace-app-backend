import { sessionRoom, userRoom } from "./room";
import { AppServer } from "./types";
import { deliverPendingOnConnect, registerDeliveryHandlers } from "./delivery";
import { markOffline, markOnline, registerPresenceHandlers } from "./presence";
import { registerTypingHandlers, stopTypingOnDisconnect } from "./typing";

export const registerConnectionHandlers = (io: AppServer) => {
  io.on("connection", (socket) => {
    const { userId, sessionId } = socket.data;

    void socket.join([userRoom(userId), sessionRoom(sessionId)]);
    markOnline(io, userId, socket.id);

    registerDeliveryHandlers(io, socket);
    registerPresenceHandlers(socket);
    registerTypingHandlers(io, socket);

    deliverPendingOnConnect(io, userId);

    socket.on("disconnect", () => {
      stopTypingOnDisconnect(io, socket);
      markOffline(io, userId, socket.id);
    });
  });
};
