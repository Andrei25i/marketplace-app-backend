const socketsByUser = new Map<string, Set<string>>();

export const presenceStore = {
  add(userId: string, socketId: string): boolean {
    const sockets = socketsByUser.get(userId);
    if (sockets) {
      sockets.add(socketId);
      return false;
    }
    socketsByUser.set(userId, new Set([socketId]));
    return true;
  },

  remove(userId: string, socketId: string): boolean {
    const sockets = socketsByUser.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);
    if (sockets.size > 0) return false;

    socketsByUser.delete(userId);
    return true;
  },

  isOnline(userId: string): boolean {
    return socketsByUser.has(userId);
  },
};
