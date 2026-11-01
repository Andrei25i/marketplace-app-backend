import prisma from "../prisma";
import bcryptjs from "bcryptjs";
import { UpdateProfileDTO } from "../types/user.type";
import { Prisma } from "@prisma/client";
import { MediaService } from "./media.service";

export const privateUserSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone_number: true,
  city: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.usersSelect;

export class UserService {
  private mediaService = new MediaService();

  async getUserProfile(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: privateUserSelect,
    });

    if (!user) return null;

    return user;
  }

  async getPublicProfile(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        created_at: true,
      },
    });

    if (!user) return null;

    return user;
  }

  async deleteAccount(userId: string, passwordPlain: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        password_hash: true,
      },
    });

    if (!user) {
      throw new Error("NOT_FOUND");
    }

    const isMatch = await bcryptjs.compare(passwordPlain, user.password_hash);
    if (!isMatch) {
      throw new Error("INVALID_PASSWORD");
    }

    await prisma.users.delete({ where: { id: userId } });
    void this.mediaService.deleteUserFolder(userId);
  }

  async updateProfile(userId: string, data: UpdateProfileDTO) {
    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new Error("NOT_FOUND");
    }

    const newEmail =
      typeof data.email === "string" ? data.email.toLowerCase() : undefined;

    if (newEmail && newEmail !== currentUser.email.toLowerCase()) {
      const existingEmail = await prisma.users.findUnique({
        where: { email: newEmail },
      });

      if (existingEmail) {
        throw new Error("EMAIL_IN_USE");
      }
    }

    return prisma.users.update({
      where: { id: userId },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        ...(newEmail ? { email: newEmail } : {}),
        phone_number: data.phone_number,
        city: data.city,
      },
      select: privateUserSelect,
    });
  }
}
