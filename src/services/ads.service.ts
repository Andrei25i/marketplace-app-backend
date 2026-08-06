import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { GetAdsFilters } from "../types/ads.types";

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
}
