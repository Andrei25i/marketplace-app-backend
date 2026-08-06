export type GetAdsFilters = {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  city?: string;
  userId?: string;
  sort?: string;
};

export type CreateAdDTO = {
  title: string;
  description: string;
  price: number;
  currency?: string;
  images: any;
  category_id: number;
  city: string;
  user_id: string;
};
