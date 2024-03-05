import OpenAI from "openai"
import { z } from "zod"
import ZodStream from "zod-stream"

import { rescheduleAgent } from "@/ai/agents/schedule-agent"
import { rescheduleCourseAgent } from "@/ai/agents/schema"

export const runtime = "edge"

export async function POST(request: Request): Promise<Response> {
	const {
		messages
		// prompt
	}: {
		messages: OpenAI.ChatCompletionCreateParams["messages"]
		prompt: string
	} = await request.json()

	try {
		const stream = await rescheduleAgent.completionStream({
			messages
		})

		const [responseStream, forkedStream] = stream.tee()

		handleForkedStream(forkedStream)

		return new Response(responseStream)
	} catch (error) {
		console.error(error)
		return new Response("Could not complete chat request.", {
			status: 500
		})
	}
}

async function handleForkedStream(stream: ReadableStream<Uint8Array>) {
	const client = new ZodStream()

	const extractionStream = await client.create({
		completionPromise: async function () {
			return stream
		},
		response_model: {
			schema: rescheduleCourseAgent,
			name: "Extract"
		}
	})

	let result: Partial<z.infer<typeof rescheduleCourseAgent>> = {}

	for await (const data of extractionStream) {
		result = data
	}

	return result
}
