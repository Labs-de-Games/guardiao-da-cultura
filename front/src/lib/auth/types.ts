export type Role = "player" | "institution" | "admin";

export interface User {
  id: string;
  email: string;
  nickname: string;
  firstName: string;
  lastName: string;
  role: Role;
  isEmailVerified: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
}

export interface LoginCredentials {
  email: string;
}

export interface RegisterCredentials {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  nickname: string;
  role?: Extract<Role, "institution">;
}

export interface ResendVerificationData {
  email: string;
}

export interface LoginConfirmData {
  token: string;
}

export interface VerifyEmailConfirmData {
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
