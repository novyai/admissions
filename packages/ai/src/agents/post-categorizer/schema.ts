import { z } from "zod"

export const postCategorizerAgentSchema = z.object({
  categories: z
    .array(
      z.string()
    )
    .min(0)
    .describe(
      "A list of categories to which the post can belong."
    )
})
