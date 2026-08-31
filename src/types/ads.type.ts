export type AdSortOption =
  | "price_asc"
  | "price_desc"
  | "date_asc"
  | "date_desc"
  | "name_asc"
  | "name_desc";

export type GetAdsFilters = {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  city?: string;
  userId?: string;
  sort?: AdSortOption;
};

export interface AdImage {
  url?: string;
  public_id?: string;
}

export type CreateAdDTO = {
  title: string;
  description: string;
  price: number;
  currency?: string;
  images: AdImage[];
  category_id: number;
  city: string;
  user_id: string;
};

export interface UpdateAdDTO {
  title: string;
  description: string;
  price: number;
  currency?: string;
  images: AdImage[];
  category_id: number;
  city: string;
  deletedPublicIds?: string[];
}
