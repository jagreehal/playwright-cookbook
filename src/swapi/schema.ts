import { z } from 'zod';

export const SwapiPersonSchema = z.object({
  name: z.string(),
  height: z.string(),
  mass: z.string(),
  url: z.string().url(),
  films: z.array(z.string().url()),
});

export type SwapiPerson = z.infer<typeof SwapiPersonSchema>;
