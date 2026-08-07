import { Prisma } from "@prisma/client";
import { GetFavoritesFilters } from "../types/favorites.types";
import prisma from "../prisma";

export class FavoritesService {
  async getFavoriteAds(userId: string, filters: GetFavoritesFilters) {
    const { search, category, minPrice, maxPrice, sort, city } = filters;

    const whereClause: Prisma.favoritesWhereInput = {
      user_id: userId,
    };

    const adsWhere: Prisma.adsWhereInput = {};

    if (search && search.trim() !== "") {
      adsWhere.title = { contains: search, mode: "insensitive" };
    }

    if (category && category.trim() !== "") {
      const parsedCat = parseInt(category);
      if (!isNaN(parsedCat)) adsWhere.category_id = parsedCat;
    }

    if (city && city.trim() !== "") {
      adsWhere.city = { contains: city, mode: "insensitive" };
    }

    if (
      (minPrice && minPrice.trim() !== "") ||
      (maxPrice && maxPrice.trim() !== "")
    ) {
      adsWhere.price = {};
      if (minPrice) adsWhere.price.gte = parseFloat(minPrice);
      if (maxPrice) adsWhere.price.lte = parseFloat(maxPrice);
    }

    if (Object.keys(adsWhere).length > 0) {
      whereClause.ads = adsWhere;
    }

    let orderByClause: Prisma.favoritesOrderByWithRelationInput = {
      created_at: "desc",
    };

    switch (sort) {
      case "price_asc":
        orderByClause = { ads: { price: "asc" } };
        break;
      case "price_desc":
        orderByClause = { ads: { price: "desc" } };
        break;
      case "date_asc":
        orderByClause = { ads: { created_at: "asc" } };
        break;
      case "date_desc":
        orderByClause = { ads: { created_at: "desc" } };
        break;
      case "name_asc":
        orderByClause = { ads: { title: "asc" } };
        break;
      case "name_desc":
        orderByClause = { ads: { title: "desc" } };
        break;
      case "favorited_date_asc":
        orderByClause = { created_at: "asc" };
        break;
      case "favorited_date_desc":
        orderByClause = { created_at: "desc" };
        break;
    }

    const favorites = await prisma.favorites.findMany({
      where: whereClause,
      orderBy: orderByClause,
      include: {
        ads: {
          include: {
            categories: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return favorites.map((fav) => {
      const { categories, ...adData } = fav.ads;

      return {
        ...adData,
        category: categories,
        favorited_at: fav.created_at,
      };
    });
  }

  async addFavorite(adId: string, userId: string) {
    const ad = await prisma.ads.findUnique({
      where: { id: adId },
      select: { id: true },
    });

    if (!ad) {
      throw new Error("NOT_FOUND");
    }

    const existingFavorite = await prisma.favorites.findFirst({
      where: {
        user_id: userId,
        ad_id: adId,
      },
    });

    if (existingFavorite) {
      throw new Error("ALREADY_FAVORITED");
    }

    const newFavorite = await prisma.favorites.create({
      data: {
        user_id: userId,
        ad_id: adId,
      },
    });

    return newFavorite;
  }

  async deleteFavorite(adId: string, userId: string) {
    const favorite = await prisma.favorites.findFirst({
      where: {
        user_id: userId,
        ad_id: adId,
      },
    });

    if (!favorite) {
      throw new Error("FAVORITE_NOT_FOUND");
    }

    const deletedFavorite = await prisma.favorites.deleteMany({
      where: { user_id: userId, ad_id: adId },
    });

    return deletedFavorite;
  }
}
