import { z } from "zod";

export const interestSchema = z.object({
  email: z.string().email("Digite um endereço de e-mail válido."),
});

export type InterestFormData = z.infer<typeof interestSchema>;
