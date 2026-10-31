import { getIO } from "./io";
import { sessionRoom, userRoom } from "./room";

const safely = (action: () => void) => {
  try {
    action();
  } catch (error) {
    console.error("[socket] Eroare la deconectarea socket-urilor:", error);
  }
};

export const disconnectSession = (sessionId: string) => {
  safely(() => {
    getIO().in(sessionRoom(sessionId)).disconnectSockets(true);
  });
};

export const disconnectUser = (userId: string, exceptSessionId?: string) => {
  safely(() => {
    const sockets = getIO().in(userRoom(userId));

    if (exceptSessionId) {
      sockets.except(sessionRoom(exceptSessionId)).disconnectSockets(true);
    } else {
      sockets.disconnectSockets(true);
    }
  });
};
