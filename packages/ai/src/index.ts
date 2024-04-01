import { z } from "zod";
import { oai } from "./lib/oai";
import Instructor from "@instructor-ai/instructor"


const s = z.object({
  questions: z.object({
    question: z.string({
      description: "The question a student would like to ask the their advisor. Make them specifically about adding and dropping specific courses"
    }),
    why: z.string({
      description: "Why does the student want to ask the advisor this question?"
    })
  }).array().min(10)
})


const instructor = Instructor({
  client: oai,
  mode: "TOOLS",
}
)

const response = await instructor.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [{
    role: "system",
    content: "You are goal is to generate a list of questions a college student would like to ask their advisor."
  }],
  temperature: 0.5,
  max_tokens: 1000,
  response_model: {
    schema: s,
    name: "Question Generator",

  }
})

console.log(response)

