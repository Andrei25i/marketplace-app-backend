import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import {
  AdImage,
  CreateAdDTO,
  GetAdsFilters,
  UpdateAdDTO,
} from "../types/ads.type";
import { matchesText } from "../utils/normalizeText";
import { MediaService } from "./media.service";

const getPublicIds = (images: unknown): string[] =>
  Array.isArray(images)
    ? images
        .map((img: AdImage | null) => img?.public_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

export class AdsService {
  private mediaService = new MediaService();

  async getAllAds(filters: GetAdsFilters) {
    const { search, category, minPrice, maxPrice, sort, city, userId } =
      filters;

    const whereClause: Prisma.adsWhereInput = {};

    if (category !== undefined) {
      whereClause.category_id = category;
    }

    if (userId) {
      whereClause.user_id = userId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.price = {};
      if (minPrice !== undefined) whereClause.price.gte = minPrice;
      if (maxPrice !== undefined) whereClause.price.lte = maxPrice;
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

    return ads.filter(
      (ad) => matchesText(ad.title, search) && matchesText(ad.city, city),
    );
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

    const { users, categories, category_id, user_id, ...adData } = ad;

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
        phone_number: data.phone_number,
        currency: data.currency || "RON",
        images: data.images as unknown as Prisma.InputJsonValue,
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

    await prisma.ads.delete({ where: { id: adId } });

    const publicIds = getPublicIds(ad.images);
    await this.mediaService.deleteByPublicIds(publicIds);
  }

  async updateAd(adId: string, loggedUserId: string, data: UpdateAdDTO) {
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

    const updatedAd = await prisma.ads.update({
      where: { id: adId },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        phone_number: data.phone_number,
        currency: data.currency || "RON",
        images: data.images as unknown as Prisma.InputJsonValue,
        category_id: Number(data.category_id),
        city: data.city,
      },
    });

    const keptIds = new Set(getPublicIds(data.images));
    const removeIds = getPublicIds(ad.images).filter((id) => !keptIds.has(id));
    await this.mediaService.deleteByPublicIds(removeIds);

    return updatedAd;
  }
}
