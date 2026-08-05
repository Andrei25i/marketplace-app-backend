import prisma from "../prisma";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { RegisterUserInput } from "../types";
import { EmailService } from "./email.service";

export class AuthService {
  private emailService = new EmailService();

  async registerUser(userData: RegisterUserInput) {
    const normalizedEmail = userData.email.toLowerCase();

    const existingUser = await prisma.users.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new Error("EMAIL_EXISTS");
    }

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(userData.password, salt);

    const newUser = await prisma.users.create({
      data: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: normalizedEmail,
        phone_number: userData.phone_number,
        password_hash: passwordHash,
        city: userData.city,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        created_at: true,
      },
    });

    return newUser;
  }

  async loginUser(email: string, passwordString: string) {
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.users.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isMatch = await bcryptjs.compare(passwordString, user.password_hash);

    if (!isMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET nu este definit în fișierul .env");
    }

    const payload = {
      id: user.id,
      email: user.email,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "24h" });

    return {
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        city: user.city,
        created_at: user.created_at,
      },
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.users.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return null;
    }

    const resetSecret = process.env.JWT_RESET_SECRET;
    if (!resetSecret) {
      throw new Error("JWT_RESET_SECRET nu este definit în fișierul .env");
    }

    const resetToken = jwt.sign({ id: user.id }, resetSecret, {
      expiresIn: "15m",
    });

    this.emailService.sendPasswordResetEmail(
      { first_name: user.first_name, email: user.email },
      resetToken,
    );

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetSecret = process.env.JWT_RESET_SECRET;
    if (!resetSecret) {
      throw new Error("JWT_RESET_SECRET nu este definit");
    }

    try {
      const decoded = jwt.verify(token, resetSecret) as { id: string };

      const salt = await bcryptjs.genSalt(10);
      const passwordHash = await bcryptjs.hash(newPassword, salt);

      const updatedResult = await prisma.users.updateMany({
        where: { id: decoded.id },
        data: { password_hash: passwordHash },
      });

      if (updatedResult.count === 0) {
        throw new Error("USER_NOT_FOUND");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "USER_NOT_FOUND") {
        throw error;
      }
      throw new Error("INVALID_TOKEN");
    }
  }
}
