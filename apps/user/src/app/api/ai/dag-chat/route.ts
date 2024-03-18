
import OpenAI from "openai"

import { instructorOAI } from "@/lib/oai"
import { additionalCoursesSchema } from "@/agents/scheduler/schema"
import { generatePrimaryIdentity } from "@/agents/scheduler"
import { getCoursesFromSubjectNumber } from "@/db/courses"
import { getOutsideCourseNode } from "@/components/semester-dag/graph-to-node-utils"

export async function POST(request: Request): Promise<Response> {
  const {
    messages,
    electives
  }: {
    messages: OpenAI.ChatCompletionCreateParams["messages"],
    electives: {
      courseSubject: string;
      courseNumber: string;
      name: string;
    }[]
  } = await request.json()

  try {

    // make a completion call with your generated params
    const extraction = await instructorOAI.chat.completions.create({
      response_model: {
        schema: additionalCoursesSchema,
        name: "USF CSE Advisor"
      },

      messages: [
        {
          role: "system",
          content: generatePrimaryIdentity(electives)
        },
        ...messages,
      ],
      model: "gpt-4-turbo-preview"
    })

    const newCourses = await getCoursesFromSubjectNumber(extraction.courses)

    const newNodes = newCourses.map(
      (c, i) => getOutsideCourseNode(
        {
          id: c.id,
          earliestFinish: undefined,
          latestFinish: undefined,
          dependents: Array.from(
            new Set(
              []
            )
          ),
          prerequisites: Array.from(
            new Set(
              []
            )
          ),
          name: c.name,
          raw_course: c
        }
        , { x: 400 - 200 * i, y: -200 })
    )

    return new Response(JSON.stringify({ nodes: newNodes }))
  } catch (error) {
    console.error(error)
    return new Response("Could not complete chat request.", {
      status: 500
    })
  }
}
