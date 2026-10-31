const socketsByUser = new Map<string, Set<string>>();
const offlineTimers = new Map<string, NodeJS.Timeout>();

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
    return socketsByUser.has(userId) || offlineTimers.has(userId);
  },

  scheduleOffine(userId: string, delayMs: number, onOffline: () => void) {
    const timer = setTimeout(() => {
      offlineTimers.delete(userId);
      onOffline();
    }, delayMs);
    timer.unref();
    offlineTimers.set(userId, timer);
  },

  cancelOffline(userId: string): boolean {
    const timer = offlineTimers.get(userId);
    if (!timer) return false;

    clearTimeout(timer);
    offlineTimers.delete(userId);
    return true;
  },
};
