import { Elysia } from "elysia"

import { ElysiaLogging, logger } from "@/lib/logger"

import { qGroup } from "./api/q"

const elysiaLogger = ElysiaLogging(logger, {
  level: process.env?.["LOG_LEVEL"] || "info",
  format: "json"
})

export const app = new Elysia()
  .onError(({ code, error }) => {
    logger.error(`Error code: ${code} ${error.stack}`, {
      error
    })

    return new Response(error.toString())
  })
  .get("/health", () => {
    return new Response("ok")
  })
  .get("/", () => {
    return new Response("ok")
  })
  .use(elysiaLogger)
  .use(qGroup)
  .listen(process.env["PORT"] ?? 6969)

logger.info(`🦊 | Running at http://${app.server?.hostname}:${app.server?.port}`)

process.on("uncaughtException", async err => {
  logger.fatal(err, "uncaught exception detected")
  app.stop().then(() => {
    process.exit(1)
  })

  setTimeout(() => {
    process.abort()
  }, 1000).unref()
  process.exit(1)
})
