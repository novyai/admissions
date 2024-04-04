import { addChatStreamJob } from "@/queues/chat-stream"
import { addUserProfilePipelineJob } from "@/queues/profile-generation"
import { Elysia, t } from "elysia"

import { logger } from "@/lib/logger"

export const qGroup = new Elysia({ prefix: "/q" })
  .derive(async ({ request }) => {
    let hasAuth = false

    const url = new URL(request.url)
    const serviceToken = url.searchParams.get("serviceToken")

    hasAuth = serviceToken === process.env["SERVICE_TOKEN"]

    return {
      hasAuth
    }
  })
  .post(
    "/add/chat-stream",
    async ({ body, hasAuth, set }) => {
      if (!hasAuth) {
        set.status = 401
        throw new Error("Unauthorized")
      }

      logger.info({
        message: "Adding chat stream job",
        data: body.data
      })

      await addChatStreamJob(body.data.streamId, body.data)
    },
    {
      type: "json",
      body: t.Object({
        id: t.String(),
        data: t.Object({
          conversationId: t.String(),
          messageStreamIndex: t.Number(),
          isInitialMessage: t.Boolean(),
          endUserId: t.String(),
          meta: t.Record(t.String(), t.Unknown()),
          streamId: t.String(),
          prompt: t.String()
        })
      })
    }
  )
