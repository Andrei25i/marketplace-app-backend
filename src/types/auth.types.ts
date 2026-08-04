export type RegisterUserInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  city: string;
};

export interface JwtPayload {
  id: number;
  email: string;
}
