import { z } from "zod";

export const interestSchema = z.object({
  email: z
    .string()
    .email("Digite um endereço de e-mail válido.")
    .optional()
    .or(z.literal("")),
  is_interested: z.boolean(),
});

export type InterestFormData = z.infer<typeof interestSchema>;
