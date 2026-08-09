import prisma from "../prisma";

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
}
