import { NextResponse } from "next/server"
import { Q_BASE_URL } from "@/constants"

export async function POST(request: Request): Promise<Response> {
  try {
    const {
      userId,
      prompt,
      conversationId,
      streamId,
      messageStreamIndex,
      meta = {},
      versionId
    } = await request.json()

    if (!userId) {
      return NextResponse.json({ message: "could send messages." }, { status: 403 })
    }

    if (prompt?.length > 1500) {
      return NextResponse.json(
        { message: "Message is too long." },
        { status: 400, statusText: "Message is too long." }
      )
    }

    await fetch(`${Q_BASE_URL}/add/chat-stream?serviceToken=${process.env["SERVICE_TOKEN"]}`, {
      method: "POST",
      body: JSON.stringify({
        id: `conversation-stream-${streamId}-${messageStreamIndex}`,
        data: {
          conversationId,
          userId,
          streamId,
          prompt,
          meta,
          isInitialMessage: false,
          messageStreamIndex,
          versionId
        }
      })
    })

    return new Response("ok")
  } catch (error) {
    console.error(JSON.stringify(error))
    return new Response("Could not complete chat request.")
  }
}
