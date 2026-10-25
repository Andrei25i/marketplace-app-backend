import { CookieOptions, Response } from "express";
import { authConfig } from "../config/auth.config";
import type { SessionTokens } from "../services/session.service";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: authConfig.cookieSecure,
  sameSite: "lax",
};

const accessOptions: CookieOptions = { ...baseOptions, path: "/api" };
const refreshOptions: CookieOptions = { ...baseOptions, path: "/api/auth" };

export const setAuthCookies = (res: Response, tokens: SessionTokens) => {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...accessOptions,
    maxAge: authConfig.accessTtlMs,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...refreshOptions,
    expires: tokens.refreshExpiresAt,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE, accessOptions);
  res.clearCookie(REFRESH_COOKIE, refreshOptions);
};
