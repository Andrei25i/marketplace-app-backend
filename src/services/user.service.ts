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

    const otherFiles = await prisma.message_attachments.findMany({
      where: {
        uploader_id: { not: userId },
        conversations: {
          OR: [{ user_low_id: userId }, { user_high_id: userId }],
        },
      },
      select: { public_id: true, resource_type: true },
    });

    const conversations = await prisma.conversations.findMany({
      where: { OR: [{ user_low_id: userId }, { user_high_id: userId }] },
      select: { id: true, user_low_id: true, user_high_id: true },
    });

    await prisma.users.delete({ where: { id: userId } });

    void this.mediaService.deleteUserFolder(userId);
    void this.mediaService.deleteAssets(otherFiles);

    return conversations.map((c) => ({
      conversationId: c.id,
      otherUserId: c.user_low_id === userId ? c.user_high_id : c.user_low_id,
    }));
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

    const updateData: Prisma.usersUpdateInput = {};
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (newEmail) updateData.email = newEmail;
    if (data.phone_number !== undefined) {
      updateData.phone_number = data.phone_number;
    }
    if (data.city !== undefined) updateData.city = data.city;

    return prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: privateUserSelect,
    });
  }
}
