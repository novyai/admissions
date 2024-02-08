import { HydratedCourse } from "@/types"
import { db } from "@db/client"

import { CoursesTable } from "@/components/courses-table"

export const revalidate = 0

const getAllCourses = async ({
  skip = 0,
  take = 20,
  filters = {},
  orderBy = {}
}): Promise<{ courses: HydratedCourse[]; total: number }> => {
  const where = {
    ...filters
  }

  const [courses, total] = await db.$transaction([
    db.course.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        department: true,
        conditions: true,
        prerequisites: true
      }
    }),
    db.course.count({ where })
  ])
  return { courses, total }
}

export default async function Page({
  searchParams
}: {
  searchParams: {
    skip?: string
    take?: string
    q?: string
    orderBy?: {
      [key: string]: "asc" | "desc"
    }
  }
}) {
  const { skip, take, q, orderBy } = searchParams

  const filters = q?.length
    ? {
        OR: [
          {
            courseSubject: {
              contains: q
            }
          },
          {
            name: {
              contains: q
            }
          }
        ]
      }
    : undefined

  const { courses, total } = await getAllCourses({
    skip: parseInt(skip ?? "0"),
    take: parseInt(take ?? "50"),
    filters,
    orderBy
  })

  return (
    <>
      <div className="w-full h-full overflow-y-auto">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight my-8 px-6">
          All Courses
        </h1>
        <CoursesTable courses={courses} total={total} />
      </div>
    </>
  )
}
