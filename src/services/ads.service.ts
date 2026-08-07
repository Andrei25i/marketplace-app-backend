import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { CreateAdDTO, GetAdsFilters, UpdateAdDTO } from "../types/ads.types";
import cloudinary from "../config/cloudinary";

export class AdsService {
  async getAllAds(filters: GetAdsFilters) {
    const { search, category, minPrice, maxPrice, sort, city, userId } =
      filters;

    const whereClause: Prisma.adsWhereInput = {};

    if (search) {
      whereClause.title = { contains: search, mode: "insensitive" };
    }

    if (category) {
      whereClause.category_id = parseInt(category);
    }

    if (city) {
      whereClause.city = { contains: city, mode: "insensitive" };
    }

    if (userId && userId.trim() !== "") {
      whereClause.user_id = userId;
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = parseFloat(minPrice);
      if (maxPrice) whereClause.price.lte = parseFloat(maxPrice);
    }

    let orderByClause: Prisma.adsOrderByWithRelationInput = {
      created_at: "desc",
    };

    switch (sort) {
      case "price_asc":
        orderByClause = { price: "asc" };
        break;
      case "price_desc":
        orderByClause = { price: "desc" };
        break;
      case "date_asc":
        orderByClause = { created_at: "asc" };
        break;
      case "date_desc":
        orderByClause = { created_at: "desc" };
        break;
      case "name_asc":
        orderByClause = { title: "asc" };
        break;
      case "name_desc":
        orderByClause = { title: "desc" };
        break;
    }

    const ads = await prisma.ads.findMany({
      where: whereClause,
      orderBy: orderByClause,
      include: {
        users: {
          select: { first_name: true, last_name: true },
        },
        categories: {
          select: { name: true },
        },
      },
    });

    return ads;
  }

  async getAdById(id: string) {
    const ad = await prisma.ads.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ad) return null;

    const { users, categories, ...adData } = ad;

    return {
      ...adData,
      user: users,
      category: categories,
    };
  }

  async createAd(data: CreateAdDTO) {
    const newAd = await prisma.ads.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || "RON",
        images: data.images,
        city: data.city,
        category_id: data.category_id,
        user_id: data.user_id,
      },
    });

    return newAd;
  }

  async deleteAd(adId: string, loggedUserId: string): Promise<void> {
    const ad = await prisma.ads.findUnique({
      where: { id: adId },
      select: { user_id: true, images: true },
    });

    if (!ad) {
      throw new Error("NOT_FOUND");
    }

    if (ad.user_id !== loggedUserId) {
      throw new Error("FORBIDDEN");
    }

    const images = ad.images as Array<{ public_id?: string }> | null;

    if (images && Array.isArray(images) && images.length > 0) {
      try {
        const deletePromises = images.map((img) => {
          if (img.public_id) {
            return cloudinary.uploader.destroy(img.public_id);
          }
          return Promise.resolve();
        });

        await Promise.all(deletePromises);
      } catch (cloudinaryErr) {
        console.error(
          "Eroare la ștergerea fișierelor din Cloudinary:",
          cloudinaryErr,
        );
      }
    }

    await prisma.ads.delete({
      where: { id: adId },
    });
  }

  async updateAd(adId: string, loggedUserId: string, data: UpdateAdDTO) {
    const ad = await prisma.ads.findUnique({
      where: { id: adId },
      select: { user_id: true },
    });

    if (!ad) {
      throw new Error("NOT_FOUND");
    }

    if (ad.user_id !== loggedUserId) {
      throw new Error("FORBIDDEN");
    }

    const updatedAd = await prisma.ads.update({
      where: { id: adId },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || "RON",
        images: data.images as any,
        category_id: Number(data.category_id),
        city: data.city,
      },
    });

    if (
      data.deletedPublicIds &&
      Array.isArray(data.deletedPublicIds) &&
      data.deletedPublicIds.length > 0
    ) {
      const deletePromises = data.deletedPublicIds.map((public_id) =>
        cloudinary.uploader.destroy(public_id),
      );

      Promise.allSettled(deletePromises).then((results) => {
        results.forEach((res, index) => {
          if (res.status === "rejected") {
            console.error(
              `Eroare la ștergerea imaginii ${data.deletedPublicIds![index]} din Cloudinary:`,
              res.reason,
            );
          }
        });
      });
    }

    return updatedAd;
  }
}
