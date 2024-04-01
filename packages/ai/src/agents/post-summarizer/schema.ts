import { z } from "zod"

export const summarizerAgentSchema = z.object({
  title: z
    .string()
    .describe(
      "Craft a compelling title that captures the essence of the discussion and poses a question or presents a statement that encourages community engagement. The title should be engaging and invite users to contribute their thoughts and experiences."
    )
    .optional(),
  content: z
    .string()
    .describe(
      "Detail the conversation's core insights and advice, strategically incorporating questions or points of debate that spark discussion. Aim to present the summary in a way that not only informs but also intrigues, prompting readers to share their own stories, solutions, and questions."
    ),
  relevantResources: z
    .array(
      z.object({
        title: z.string().describe("Clearly state the resource title, indicating its relevance and inviting exploration."),
        url: z
          .string()
          .url()
          .describe("Provide a valid, direct URL to the resource, ensuring it's easily accessible for further reading."),
        content: z.string().describe("Summarize the resource's key point or insight, making its connection to the discussion clear and compelling.")
      })
    )
    .min(0)
    .describe(
      "List the most impactful resources related to the discussion, including URLs and summaries that highlight their relevance and encourage users to explore. Each resource should serve as a conversation starter or a deep-dive opportunity for interested readers."
    )
})
