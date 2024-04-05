import { db } from "@repo/db"

export const universitiesWithDepartments = await db.university.findMany({
  include: {
    departments: true
  }
})
