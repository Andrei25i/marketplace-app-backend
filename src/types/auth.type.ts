export interface RegisterUserInput {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  city: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SessionIdParams {
  id: string;
}
