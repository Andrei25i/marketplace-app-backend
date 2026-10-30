const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const chatConfig = {
  // Messages
  maxMessageLength: 2000,
  editWindowMs: 15 * MINUTE,

  // Pagination
  conversationsPageSize: 20,
  conversationsMaxPageSize: 50,
  messagesPageSize: 30,
  messagesMaxPageSize: 100,

  // Rate limit message sending (per user)
  messageRateWindowMs: 10 * SECOND,
  messageRateMax: 30,

  // Realtime
  typingThrottleMs: 2 * SECOND,
  presenceGraceMs: 5 * SECOND,
  presenceSubscribeLimit: 50,
  deliveryAckTimeoutMs: 5 * SECOND,
  socketSweepIntervalMs: 5 * MINUTE,
  socketMaxPayloadBytes: 16 * 1024,
} as const;
