import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { authConfig } from "../config/auth.config";
import { getDeviceInfo } from "../utils/deviceLabel";
import { isUuid } from "../utils/isUuid";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface ClientInfo {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export interface AuthenticatedSession {
  userId: string;
  sessionId: string;
  userVersion: number;
}

type RotateResult =
  { ok: true; userId: string; tokens: SessionTokens } | { ok: false };

const signRefresh = (sessionId: string, generation: number) =>
  crypto
    .createHmac("sha256", authConfig.refreshSecret)
    .update(`${sessionId}.${generation}`)
    .digest("base64url");

const buildRefreshToken = (sessionId: string, generation: number) =>
  `${sessionId}.${generation}.${signRefresh(sessionId, generation)}`;

const parseRefreshToken = (raw: unknown) => {
  if (typeof raw !== "string") return null;

  const [sessionId, generationRaw, signature, ...rest] = raw.split(".");
  if (rest.length > 0 || !sessionId || !generationRaw || !signature)
    return null;
  if (!isUuid(sessionId)) return null;

  const generation = Number(generationRaw);
  if (!Number.isSafeInteger(generation) || generation < 0) return null;

  const expected = Buffer.from(signRefresh(sessionId, generation));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return null;
  }

  return { sessionId, generation };
};

const signAccessToken = (userId: string, sessionId: string) =>
  jwt.sign({ sid: sessionId }, authConfig.accessSecret, {
    subject: userId,
    expiresIn: Math.floor(authConfig.accessTtlMs / 1000),
    algorithm: "HS256",
  });

const verifyAccessToken = (token: unknown, ignoreExpiration = false) => {
  if (typeof token !== "string" || !token) return null;

  try {
    const payload = jwt.verify(token, authConfig.accessSecret, {
      algorithms: ["HS256"],
      ignoreExpiration,
    });

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      !isUuid(payload.sid)
    ) {
      return null;
    }

    return { userId: payload.sub, sessionId: payload.sid as string };
  } catch {
    return null;
  }
};

export class SessionService {
  private nextExpiry(createdAt: Date) {
    return new Date(
      Math.min(
        Date.now() + authConfig.refreshIdleMs,
        createdAt.getTime() + authConfig.refreshAbsoluteMs,
      ),
    );
  }

  private issueTokens(
    userId: string,
    sessionId: string,
    generation: number,
    expiresAt: Date,
  ): SessionTokens {
    return {
      accessToken: signAccessToken(userId, sessionId),
      refreshToken: buildRefreshToken(sessionId, generation),
      refreshExpiresAt: expiresAt,
    };
  }

  async createSession(
    userId: string,
    client: ClientInfo,
  ): Promise<SessionTokens> {
    const now = new Date();

    await prisma.sessions.deleteMany({
      where: { user_id: userId, expires_at: { lt: now } },
    });

    const excess = await prisma.sessions.findMany({
      where: { user_id: userId },
      orderBy: { last_used_at: "desc" },
      skip: authConfig.maxSessionsPerUser - 1,
      select: { id: true },
    });

    if (excess.length > 0) {
      await prisma.sessions.deleteMany({
        where: { id: { in: excess.map((s) => s.id) } },
      });
    }

    const expiresAt = new Date(now.getTime() + authConfig.refreshIdleMs);

    const session = await prisma.sessions.create({
      data: {
        user_id: userId,
        expires_at: expiresAt,
        user_agent: client.userAgent?.slice(0, 512) ?? null,
        ip: client.ip?.slice(0, 64) ?? null,
      },
      select: { id: true, generation: true },
    });

    return this.issueTokens(userId, session.id, session.generation, expiresAt);
  }

  async rotate(rawToken: unknown): Promise<RotateResult> {
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) return { ok: false };

    const { sessionId, generation } = parsed;

    for (let attempt = 0; attempt < 2; attempt++) {
      const session = await prisma.sessions.findUnique({
        where: { id: sessionId },
      });

      if (!session) return { ok: false };

      const now = new Date();

      if (session.expires_at <= now) {
        await prisma.sessions.deleteMany({ where: { id: sessionId } });
        return { ok: false };
      }

      if (generation === session.generation) {
        const expiresAt = this.nextExpiry(session.created_at);

        const updated = await prisma.sessions.updateMany({
          where: { id: sessionId, generation },
          data: {
            generation: { increment: 1 },
            rotated_at: now,
            last_used_at: now,
            expires_at: expiresAt,
          },
        });

        if (updated.count === 1) {
          return {
            ok: true,
            userId: session.user_id,
            tokens: this.issueTokens(
              session.user_id,
              sessionId,
              generation + 1,
              expiresAt,
            ),
          };
        }

        continue;
      }

      const isPreviousWithinGrace =
        generation === session.generation - 1 &&
        session.rotated_at !== null &&
        now.getTime() - session.rotated_at.getTime() <=
          authConfig.refreshGraceMs;

      if (isPreviousWithinGrace) {
        return {
          ok: true,
          userId: session.user_id,
          tokens: this.issueTokens(
            session.user_id,
            sessionId,
            session.generation,
            session.expires_at,
          ),
        };
      }

      await prisma.sessions.deleteMany({ where: { id: sessionId } });
      return { ok: false };
    }

    return { ok: false };
  }

  async authenticate(
    accessToken: unknown,
  ): Promise<AuthenticatedSession | null> {
    const payload = verifyAccessToken(accessToken);
    if (!payload) return null;

    const session = await prisma.sessions.findUnique({
      where: { id: payload.sessionId },
      select: {
        user_id: true,
        expires_at: true,
        last_used_at: true,
        users: { select: { updated_at: true } },
      },
    });

    const now = Date.now();

    if (
      !session ||
      session.user_id !== payload.userId ||
      session.expires_at.getTime() <= now
    ) {
      return null;
    }

    if (now - session.last_used_at.getTime() > authConfig.lastUsedThrottleMs) {
      void prisma.sessions
        .updateMany({
          where: { id: payload.sessionId },
          data: { last_used_at: new Date(now) },
        })
        .catch((error) => console.error("Eroare la last_used_at:", error));
    }

    return {
      userId: session.user_id,
      sessionId: payload.sessionId,
      userVersion: session.users.updated_at.getTime(),
    };
  }

  async revokeFromCookies(
    refreshRaw: unknown,
    accessRaw: unknown,
  ): Promise<string | null> {
    const sessionId =
      parseRefreshToken(refreshRaw)?.sessionId ??
      verifyAccessToken(accessRaw, true)?.sessionId;

    if (!sessionId) return null;

    await prisma.sessions.deleteMany({ where: { id: sessionId } });
    return sessionId;
  }

  async revokeForUser(userId: string, sessionId: string) {
    const result = await prisma.sessions.deleteMany({
      where: { id: sessionId, user_id: userId },
    });
    return result.count;
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string) {
    const result = await prisma.sessions.deleteMany({
      where: {
        user_id: userId,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
    });
    return result.count;
  }

  async listForUser(userId: string, currentSessionId: string) {
    const sessions = await prisma.sessions.findMany({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      orderBy: { last_used_at: "desc" },
      select: {
        id: true,
        user_agent: true,
        ip: true,
        created_at: true,
        last_used_at: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      ...getDeviceInfo(s.user_agent),
      ip: s.ip,
      created_at: s.created_at,
      last_used_at: s.last_used_at,
      is_current: s.id === currentSessionId,
    }));
  }

  async cleanupExpired() {
    const result = await prisma.sessions.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });
    return result.count;
  }
}

export const sessionService = new SessionService();
