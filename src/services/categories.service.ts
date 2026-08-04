import prisma from "../prisma";

export class CategoriesService {
  async getAllCategories(sort?: string) {
    let orderBy: any = { id: "asc" };

    if (sort === "name_asc") orderBy = { name: "asc" };
    else if (sort === "name_desc") orderBy = { name: "desc" };
    else if (sort === "id_asc") orderBy = { id: "asc" };
    else if (sort === "id_desc") orderBy = { id: "desc" };

    return await prisma.categories.findMany({
      orderBy: orderBy,
    });
  }

  async getCategoryById(id: number) {
    return await prisma.categories.findUnique({
      where: {
        id: id,
      },
    });
  }
}
