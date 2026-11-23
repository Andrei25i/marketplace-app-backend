const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const reviewsConfig = {
  maxCommentLength: 1000,

  pageSize: 10,
  maxPageSize: 50,

  writeRateWindowMs: 10 * MINUTE,
  writeRateMax: 20,
} as const;
