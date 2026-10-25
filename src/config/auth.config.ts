const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabila de mediu ${name} nu este setată.`);
  }
  return value;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

export const authConfig = {
  accessSecret: required("JWT_SECRET"),
  refreshSecret: required("REFRESH_TOKEN_SECRET"),
  resetSecret: required("JWT_RESET_SECRET"),
  frontendOrigin: required("FRONTEND_URL").trim().replace(/\/$/, ""),

  accessTtlMs:
    (Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60) * SECOND,
  refreshIdleMs: 30 * DAY,
  refreshAbsoluteMs: 90 * DAY,
  refreshGraceMs: 60 * SECOND,
  maxSessionsPerUser: 10,
  lastUsedThrottleMs: 5 * MINUTE,

  cookieSecure: process.env.COOKIE_SECURE !== "false",
};
