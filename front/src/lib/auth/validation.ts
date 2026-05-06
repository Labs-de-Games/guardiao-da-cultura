import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  email: z.string().email("Please enter a valid email address"),
  nickname: z
    .string()
    .min(3, "Nickname must be at least 3 characters")
    .max(30, "Nickname must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Nickname can only contain letters, numbers, and underscores",
    ),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const tokenConfirmSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResendVerificationFormData = z.infer<
  typeof resendVerificationSchema
>;
export type TokenConfirmFormData = z.infer<typeof tokenConfirmSchema>;
