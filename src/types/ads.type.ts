export type AdSortOption =
  | "price_asc"
  | "price_desc"
  | "date_asc"
  | "date_desc"
  | "name_asc"
  | "name_desc";

export type AdCurrency = "RON" | "EUR";

export interface GetAdsFilters {
  search?: string | undefined;
  category?: number | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  city?: string | undefined;
  userId?: string | undefined;
  sort?: AdSortOption | undefined;
}

export interface AdImage {
  url: string;
  public_id: string;
}

export interface AdInput {
  title: string;
  description: string;
  price: number;
  phone_number: string;
  currency: AdCurrency;
  category_id: number;
  city: string;
  images: AdImage[];
}

export type CreateAdDTO = AdInput & { user_id: string };
export type UpdateAdDTO = AdInput;

export interface AdIdParams {
  id: string;
}

export interface DeleteImagesInput {
  publicIds: string[];
}
