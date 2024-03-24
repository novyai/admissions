import cseDegree from "@/cse_requirments.json"
import { db, Prisma } from "@db/client"
import { getStudentProfile } from "@repo/graph/profile"
import { BaseStudentProfile } from "@repo/graph/types"

import { SemesterDAG } from "@/components/semester-dag"

import { getallNodesAndEdges } from "./graph-to-node-utils"

export const TemporayDag = async () => {
  const deptCourses = cseDegree.map((course): Prisma.CourseWhereInput => {
    return {
      department: {
        code: course.course_dept
      },
      courseNumber: course.course_code
    }
  })

  const requiredCourses = await db.course.findMany({
    where: {
      OR: deptCourses
    },
    select: {
      id: true
    }
  })

  const { id: precalcId } = (await db.course.findFirst({
    select: {
      id: true
    },
    where: {
      courseSubject: "MAC",
      courseNumber: "1147"
    }
  })) ?? {
    id: null
  }

  if (!precalcId) {
    throw new Error("Precalc course not found")
  }

  const baseProfile: BaseStudentProfile = {
    requiredCourses: requiredCourses.map(course => course.id),
    transferCredits: [],
    timeToGraduate: 8,
    coursePerSemester: 6,
    currentSemester: 0
  }

  const studentProfile = await getStudentProfile(baseProfile)

  const { defaultNodes, defaultEdges } = await getallNodesAndEdges(studentProfile)

  return <SemesterDAG nodes={defaultNodes} edges={defaultEdges} />
}
