import { createLater } from "@/lib"
import {
  Job,
  JobsOptions,
  Queue,
  QueueEvents,
  UnrecoverableError,
  Worker,
  WorkerOptions
} from "bullmq"
import { mergeDeepRight } from "ramda"
import z from "zod"

import { logger } from "@/lib/logger"
import redis from "@/lib/redis"

export interface CreateQueueReturn<S extends z.AnyZodObject> {
  q: Queue
  createWorker: (
    processor: (job: Job<z.infer<S>>) => Promise<unknown>,
    opts?: Partial<WorkerOptions>
  ) => Promise<Worker>
  add: (jobName: string, data: z.infer<S>, opts?: JobsOptions) => Promise<Job<z.infer<S>>>
  createJobStep: <D = object, T = void>(
    stepName: string,
    fn: (
      opts: { complete: (data: T) => void; reject: (reason?: unknown) => void },
      data: D
    ) => Promise<void> | void,
    opts?: { timeout: number }
  ) => { run: (data?: D) => Promise<T>; promise: () => Promise<T> }
}

export type StepDefinition = {
  name: string
  executionCount: number
  executions: {
    message?: string
    params?: unknown
    status: "completed" | "failed" | "waiting" | "active" | "timeout"
  }[]
}

/**
 * Create a queue with a schema and return a set of functions to interact with it.
 * The schema is used to validate the data being added to the queue.
 *
 * @param qName
 * @param schema
 * @returns @type CreateQueueReturn
 */
export function createQueue<S extends z.AnyZodObject>(
  qName: string,
  schema: S
): CreateQueueReturn<S> {
  const q = new Queue(qName, { connection: redis })
  const queueEvents = new QueueEvents(qName, { connection: redis })

  let steps: Record<string, StepDefinition> = {}

  queueEvents.on("error", error => {
    logger.error({ error, message: "Queue error", queue: qName, steps })
  })

  queueEvents.on("waiting", ({ jobId }) => {
    logger.info({
      message: `Job waiting`,
      jobId,
      queue: qName
    })
  })

  queueEvents.on("active", ({ jobId, prev }) => {
    logger.info({
      message: `Job active' previous status was ${prev}`,
      jobId,
      queue: qName
    })
  })

  queueEvents.on("completed", ({ jobId }) => {
    logger.info({ message: `${jobId} has completed and returned`, jobId, queue: qName, steps })
  })

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    logger.warn({
      message: `Job failed with reason: ${failedReason}`,
      jobId,
      queue: qName,
      steps
    })
  })

  /**
   * Create a worker to process jobs on the queue.
   * The processor function is called with the job data and should return a promise.
   * The promise should resolve with the result of the job.
   * If the promise rejects, the job will be retried.
   * If the promise throws an UnrecoverableError, the job will be removed from the queue.
   *
   * @param processor
   * @param opts
   * @returns @type Promise<Worker>
   * @example
   * const worker = await createWorker(async job => {
   *  logger.info(job.data)
   * return job.data
   * })
   */
  async function createWorker(
    processor: (job: Job<z.infer<S>>) => Promise<unknown>,
    opts: Partial<WorkerOptions> = {}
  ): Promise<Worker> {
    const worker = new Worker<z.infer<S>>(
      qName,
      async job => {
        let validation

        try {
          validation = schema.parse(job?.data)

          logger.info({
            message: `Processing job`,
            queue: qName,
            job: job?.name
          })

          steps = {}
          return await processor(job)
        } catch (e) {
          logger.error({
            error: e,
            message: `Uncaught error in job: ${job?.name}`,
            queue: qName,
            receivedData: job?.data,
            validation
          })

          throw new UnrecoverableError("Uncaught error in job.")
        }
      },
      {
        connection: redis,
        removeOnComplete: {
          age: 3600,
          count: 1000
        },
        removeOnFail: {
          age: 24 * 3600
        },
        concurrency: 250,
        ...opts
      }
    )

    worker.on("completed", job => {
      logger.info({
        message: `Job completed`,
        queue: qName,
        job: job?.name
      })
    })

    worker.on("failed", (job, err) => {
      logger.error({ error: err, message: `Failed job on queue`, queue: qName, job: job?.name })
    })

    async function handleShutdown(signal: string) {
      logger.info(`Received ${signal}. Closing worker.`)
      await worker.close()
      logger.info("Worker closed. Exiting process.")
      process.exit(0)
    }

    process.on("SIGINT", handleShutdown)
    process.on("SIGTERM", handleShutdown)

    return worker
  }

  /**
   * Create a job step to be used in a job pipeline.
   * The step function is called with the job data and should return a promise.
   * The promise should resolve with the result of the step.
   */
  function createJobStep<D = object, T = void>(
    stepName: string,
    fn: (
      opts: { complete: (data: T) => void; reject: (reason?: unknown) => void },
      data: D
    ) => void,
    opts: {
      timeout: number
    } = {
      timeout: 60000
    }
  ) {
    if (steps?.[stepName]) {
      logger.error({
        message: `Step has already been defined`,
        step: steps?.[stepName],
        stepName,
        queue: qName
      })

      throw new Error(`Step has already been defined: ${stepName}`)
    }

    steps[stepName] = {
      name: stepName,
      executionCount: 0,
      executions: []
    }

    function updateStepDef(cb: (stepDef: StepDefinition) => Partial<StepDefinition>) {
      const def = steps?.[stepName]

      if (!def) {
        logger.error({
          message: `Step definition not found`,
          step: stepName,
          queue: qName
        })

        throw new Error(`Step definition not found: ${stepName}`)
      }

      steps[stepName] = mergeDeepRight(def, cb(def))
    }

    let stepLater = createLater<T>()

    const reset = () => {
      stepLater = createLater<T>()
    }

    return {
      reset,
      promise: () => stepLater.promise,
      run: async function JobStepInternal(data?: D) {
        logger.info({
          message: `Starting step`,
          step: stepName,
          queue: qName
        })

        updateStepDef((stepDef: StepDefinition) => ({
          executionCount: stepDef.executionCount + 1,
          executions: stepDef.executions.concat({ status: "active", params: data })
        }))

        const stepTimeout = setTimeout(() => {
          stepLater.reject(`Step: ${stepName} timed out`)
          logger.warn({
            message: `Step timed out: ${stepName}`,
            queue: qName,
            step: stepName
          })

          updateStepDef((stepDef: StepDefinition) => ({
            executions: stepDef.executions.map((execution, index) =>
              index === stepDef.executions.length - 1 ? { status: "timeout" } : execution
            )
          }))
        }, opts.timeout)

        try {
          const data_default = data || ({} as D)

          fn(
            {
              complete: stepLater.resolve,
              reject: stepLater.reject
            },
            data_default
          )

          const stepReturn = await stepLater.promise
          clearTimeout(stepTimeout)

          logger.info({
            message: `Step completed: ${stepName}`,
            queue: qName,
            step: stepName
          })

          updateStepDef((stepDef: StepDefinition) => ({
            executions: stepDef.executions.map((execution, index) =>
              index === stepDef.executions.length - 1 ? { status: "completed" } : execution
            )
          }))

          return stepReturn
        } catch (e) {
          clearTimeout(stepTimeout)

          logger.error({
            error: e,
            stepName,
            queue: qName,
            message: `Failed step error: ${stepName}`
          })

          updateStepDef((stepDef: StepDefinition) => ({
            executions: stepDef.executions.map((execution, index) =>
              index === stepDef.executions.length - 1 ? { status: "failed" } : execution
            )
          }))

          throw new UnrecoverableError(`Failed step: ${stepName}`)
        } finally {
          reset()
        }
      }
    }
  }

  /**
   * Add a job to the queue.
   * The data is validated against the schema before being added to the queue.
   *
   * @param jobName
   * @param data
   * @param opts
   * @returns @type Promise<Job>
   */
  async function add(jobName: string, data: z.infer<S>, opts: JobsOptions = {}) {
    try {
      schema.parse(data)
      logger.info("Adding job to queue", jobName, q.name)

      return await q.add(jobName, data, {
        removeOnComplete: true,
        removeOnFail: true,
        ...opts
      })
    } catch (e) {
      logger.error({
        error: e,
        jobName,
        queue: q.name,
        message: `Job data does not match schema: ${jobName}`
      })

      throw new Error("job data does not match schema.")
    }
  }

  return {
    q,
    createWorker,
    add,
    createJobStep
  }
}
