import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Digite um endereço de e-mail válido."),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "Precisamos saber seu nome."),
  lastName: z.string().min(1, "Precisamos saber seu sobrenome."),
  dateOfBirth: z.string().min(1, "Precisamos saber sua data de nascimento."),
  email: z.string().email("Digite um endereço de e-mail válido."),
  nickname: z
    .string()
    .min(3, "Apelidos precisam ter pelo menos 3 caracteres.")
    .max(30, "Apelidos podem ter no máximo 30 caracteres.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Apelidos podem ter apenas letras, números e sublinha (_).",
    ),
  isInstitution: z.boolean().optional(),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Digite um endereço de e-mail válido."),
});

export const tokenConfirmSchema = z.object({
  token: z.string().min(1, "O token é necessário para confirmar a ação."),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResendVerificationFormData = z.infer<
  typeof resendVerificationSchema
>;
export type TokenConfirmFormData = z.infer<typeof tokenConfirmSchema>;
