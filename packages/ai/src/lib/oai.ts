import OpenAI from "openai"
import Instructor from "@instructor-ai/instructor"

export const oai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
  organization: process.env["OPENAI_ORG_ID"]
})

export const instructorOAI = Instructor({
  client: oai,
  mode: "TOOLS"
})

