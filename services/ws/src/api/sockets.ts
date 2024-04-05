import { Elysia, t } from "elysia"
import Redis from "ioredis"

import { createRedisSubscriber } from "@/lib/redis"

export const socketGroup = new Elysia({ prefix: "/ws" })
  .derive(
    async ({
      request
    }): Promise<{
      streamId: string | null
      userId: string | null
      sessionId: string | null
      redisSubscriber: Redis
    }> => {
      const url = new URL(request.url)

      const sessionId = url.searchParams.get("sessionId")
      const streamId = url.searchParams.get("streamId")
      const userId = url.searchParams.get("userId")

      return {
        streamId,
        userId,
        sessionId,
        redisSubscriber: createRedisSubscriber()
      }
    }
  )
  .ws("/", {
    open(ws) {
      const { streamId, userId, redisSubscriber } = ws.data

      if (streamId) {
        ws.subscribe(streamId)

        redisSubscriber.on("message", (channel, message) => {
          if (channel === streamId) {
            ws.send(message)
          }
        })

        redisSubscriber.subscribe(streamId)

        redisSubscriber.on("message", (channel, message) => {
          if (channel === streamId) {
            ws.send(message)
          }
        })

        ws.send({
          type: "message",
          data: `${userId} has subbed to ${streamId}`
        })
      }
    },
    body: t.Object({
      type: t.String(),
      data: t.Any()
    }),
    close(ws) {
      ws.data.redisSubscriber.unsubscribe()
      ws.data.streamId && ws.unsubscribe(ws.data.streamId)

      ws.close()
    }
  })
