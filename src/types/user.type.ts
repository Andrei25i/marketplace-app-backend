export interface UpdateProfileDTO {
  first_name?: string | undefined;
  last_name?: string | undefined;
  email?: string | undefined;
  phone_number?: string | undefined;
  city?: string | undefined;
}

export interface DeleteAccountInput {
  password: string;
}

export interface UserIdParams {
  id: string;
}
