import prisma from "../prisma";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { RegisterUserInput } from "../types";
import { EmailService } from "./email.service";
import { capitalizeName } from "../utils/capitalizeName";
import { authConfig } from "../config/auth.config";
import { privateUserSelect } from "./user.service";

const hashPassword = async (plain: string) =>
  bcryptjs.hash(plain, await bcryptjs.genSalt(10));

export class AuthService {
  private emailService = new EmailService();

  async registerUser(userData: RegisterUserInput) {
    const normalizedEmail = userData.email.toLowerCase();

    const existingUser = await prisma.users.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error("EMAIL_EXISTS");
    }

    return prisma.users.create({
      data: {
        first_name: capitalizeName(userData.first_name),
        last_name: capitalizeName(userData.last_name),
        email: normalizedEmail,
        phone_number: userData.phone_number,
        password_hash: await hashPassword(userData.password),
        city: userData.city,
      },
      select: privateUserSelect,
    });
  }

  async loginUser(email: string, passwordString: string) {
    const user = await prisma.users.findFirst({
      where: { email: email.toLowerCase() },
      select: { ...privateUserSelect, password_hash: true },
    });

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const { password_hash, ...profile } = user;
    const isMatch = await bcryptjs.compare(passwordString, password_hash);

    if (!isMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return profile;
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { password_hash: true },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const isMatch = await bcryptjs.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new Error("INVALID_PASSWORD");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.users.update({
        where: { id: userId },
        data: { password_hash: passwordHash, password_changed_at: new Date() },
      }),
      prisma.sessions.deleteMany({
        where: { user_id: userId, id: { not: currentSessionId } },
      }),
    ]);
  }

  async forgotPassword(email: string) {
    const user = await prisma.users.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const resetToken = jwt.sign({ id: user.id }, authConfig.resetSecret, {
      expiresIn: "15m",
      algorithm: "HS256",
    });

    this.emailService.sendPasswordResetEmail(
      { first_name: user.first_name, email: user.email },
      resetToken,
    );

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let userId: string;
    let issuedAt: number;

    try {
      const payload = jwt.verify(token, authConfig.resetSecret, {
        algorithms: ["HS256"],
      });

      if (
        typeof payload === "string" ||
        typeof payload.id !== "string" ||
        typeof payload.iat !== "number"
      ) {
        throw new Error("INVALID_TOKEN");
      }

      userId = payload.id;
      issuedAt = payload.iat;
    } catch (error) {
      throw new Error("INVALID_TOKEN", { cause: error });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { password_changed_at: true },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (
      user.password_changed_at &&
      Math.floor(user.password_changed_at.getTime() / 1000) >= issuedAt
    ) {
      throw new Error("INVALID_TOKEN");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.users.update({
        where: { id: userId },
        data: { password_hash: passwordHash, password_changed_at: new Date() },
      }),
      prisma.sessions.deleteMany({ where: { user_id: userId } }),
    ]);
  }
}
