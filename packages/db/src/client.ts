import { Prisma, PrismaClient } from "@prisma/client/edge"
import { withAccelerate } from "@prisma/extension-accelerate"

type AcceleratedPrismaClient = PrismaClient

export const db: AcceleratedPrismaClient = new PrismaClient().$extends(
  withAccelerate()
) as unknown as AcceleratedPrismaClient

export * from "@prisma/client/edge"

export default Prisma
