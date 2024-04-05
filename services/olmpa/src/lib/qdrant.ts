import { oai } from "@ai/lib/oai"
import Qdrant, { QdrantClient } from "@qdrant/js-client-rest"

import { logger } from "@/lib/logger"

export async function ensureCollectionExists(collectionName: string) {
  try {
    const exists = await qdrant.getCollection(collectionName)

    if (exists) {
      logger.debug(`Collection '${collectionName}' already exists.`)
      return
    }
  } catch (error) {
    const typedError = error as { status: number }
    if (typedError?.status === 404) {
      logger.debug({
        message: "Collection does not exist",
        collectionName
      })
    } else {
      logger.error({
        message: "Error checking collection",
        error: error
      })
      throw error
    }
  }

  await qdrant.createCollection(collectionName, {
    vectors: {
      size: 1536,
      distance: "Cosine"
    }
  })

  logger.debug(`Collection '${collectionName}' created successfully.`)
}

const isLocal = process?.env?.["IS_LOCAL"] === "1"
const isQA = process?.env?.["RW_ENV"] === "QA"
const QDRANT_BASE =
  isLocal ? "localhost"
  : isQA ? "qdrant"
  : `qdrant`

export const qdrant = new QdrantClient({ host: QDRANT_BASE, port: 6333 })

export const collection = async (
  name: string
): Promise<{
  add: <T extends Record<string, unknown>>(input: string, data: T) => Promise<void>
  query: (
    query: string,
    opts: Partial<Qdrant.Schemas["SearchRequest"]>
  ) => Promise<
    {
      id: string | number
      version: number
      score: number
      payload?:
        | Record<string, unknown>
        | {
            [key: string]: unknown
          }
        | null
        | undefined
    }[]
  >
}> => {
  try {
    await ensureCollectionExists(name)

    return {
      add: async <T extends Record<string, unknown>>(input: string, data: T) => {
        const embeddedQResponse = await oai.embeddings.create({
          model: "text-embedding-ada-002",
          input: input
        })

        const embedding = embeddedQResponse?.data?.[0]?.embedding ?? []

        await qdrant.upsert(name, {
          points: [
            {
              id: crypto.randomUUID(),
              vector: embedding,
              payload: {
                ...(data ?? {})
              }
            }
          ]
        })
      },
      query: async (
        query: string,
        opts: Partial<Qdrant.Schemas["SearchRequest"]> = {
          limit: 10
        }
      ) => {
        const embeddedQResponse = await oai.embeddings.create({
          model: "text-embedding-ada-002",
          input: query
        })

        const embeddedQ = embeddedQResponse?.data?.[0]?.embedding

        if (!embeddedQ) {
          return []
        }

        const searchResult = await qdrant.search(name, {
          vector: embeddedQ,
          ...opts
        })

        logger.info({
          message: "Fetched semantic search results",
          query,
          results: searchResult?.length ?? 0
        })

        return searchResult
      }
    }
  } catch (e) {
    logger.error({
      message: "Error fetching semantic results",
      error: e
    })

    throw new Error("Error fetching semantic results")
  }
}
