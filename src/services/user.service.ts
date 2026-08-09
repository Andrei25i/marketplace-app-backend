import prisma from "../prisma";
import bcryptjs from "bcryptjs";
import cloudinary from "../config/cloudinary";
import { UpdateProfileDTO } from "../types/user.types";

export class UserService {
  async getUserProfile(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        city: true,
        created_at: true,
      },
    });

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

    const userAds = await prisma.ads.findMany({
      where: { user_id: userId },
      select: {
        images: true,
      },
    });

    const publicIdsToDelete: string[] = [];
    for (const ad of userAds) {
      const images = ad.images as Array<{ public_id?: string }> | null;
      if (images && Array.isArray(images)) {
        images.forEach((img) => {
          if (img.public_id) publicIdsToDelete.push(img.public_id);
        });
      }
    }

    if (publicIdsToDelete.length > 0) {
      const deletePromises = publicIdsToDelete.map((id) =>
        cloudinary.uploader.destroy(id),
      );
      Promise.allSettled(deletePromises).catch(console.error);
    }

    await prisma.users.delete({
      where: { id: userId },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileDTO) {
    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new Error("NOT_FOUND");
    }

    if (data.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const existingEmail = await prisma.users.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingEmail) {
        throw new Error("EMAIL_IN_USE");
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email.toLowerCase(),
        phone_number: data.phone_number,
        city: data.city,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        city: true,
        created_at: true,
      },
    });

    return updatedUser;
  }
}
