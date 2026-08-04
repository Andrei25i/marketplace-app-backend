import prisma from "../prisma";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { RegisterUserInput } from "../types";

export class AuthService {
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
}
