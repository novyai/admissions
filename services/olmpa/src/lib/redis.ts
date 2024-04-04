import Redis, { RedisOptions } from "ioredis"

import { logger } from "./logger"

function isLocal() {
  return process.env?.["IS_LOCAL"] === "1"
}

function createRedisInstance() {
  let redisConfig: RedisOptions

  if (isLocal()) {
    logger.info("Using local redis")
    redisConfig = {
      host: "127.0.0.1",
      port: 6379,
      password: "",
      maxRetriesPerRequest: null
    }
  } else {
    redisConfig = {
      port: process.env["REDISPORT"] ? parseInt(process.env["REDISPORT"], 10) : 18294,
      host: process.env["REDISHOST"],
      password: process.env["REDISPASSWORD"],
      maxRetriesPerRequest: null
    }
  }

  const redis = new Redis(redisConfig)

  redis.on("connect", () => logger.info("Connected to Redis"))

  redis.on("error", function (error) {
    logger.error("Redis error", {
      error
    })
  })

  return redis
}

export const createRedisSubscriber = () => {
  const redisSubscriber = createRedisInstance()
  redisSubscriber.on("error", function (error) {
    logger.error("Redis subscriber error", {
      error
    })
  })

  return redisSubscriber
}

export default createRedisInstance()
