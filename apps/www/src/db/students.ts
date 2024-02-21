import { HydratedStudent, StudentTranscript } from "@/types"
import { db, Prisma } from "@db/client"

export const getAllStudents = async ({
  skip = 0,
  take = 20,
  filters,
  orderBy
}: {
  skip: number
  take: number
  filters?: Prisma.StudentFindManyArgs["where"]
  orderBy?: Prisma.StudentFindManyArgs["orderBy"]
}): Promise<{
  students: HydratedStudent[]
  total: number
}> => {
  const where: Prisma.StudentFindManyArgs["where"] = {
    ...filters
  }
  try {
    const [students, total] = await db.$transaction([
      db.student.findMany({
        skip,
        take,
        where: {
          universityGrades: {
            some: {
              course: {
                department: {
                  code: "CAP"
                }
              }
            }
          },
          ...where
        },
        orderBy,
        include: {
          user: true,
          degreeData: true,
          transferGrades: true,
          universityGrades: true
        }
      }),

      db.student.count({ where })
    ])

    if (!students) {
      throw new Error("Students not found")
    }

    return { students: students as HydratedStudent[], total }
  } catch (error) {
    console.error("Failed to get all students: ", error)
    throw new Error("Failed to get all students")
  }
}

export const findStudentById = async (id: string) => {
  try {
    return await db.student.findUnique({
      where: {
        id: id
      },
      include: {
        user: true,
        degreeData: true
      }
    })
  } catch (error) {
    console.error("Failed to get the student by ID: ", error)
    throw new Error("Failed to get the student by ID")
  }
}

export async function getTranscriptForStudent({
  studentId
}: {
  studentId: string
}): Promise<StudentTranscript> {
  try {
    const transcript = await db.student.findUnique({
      where: {
        id: studentId
      },
      include: {
        universityGrades: {
          orderBy: { term: "desc" },
          include: {
            course: true
          }
        },
        degreeData: true,
        user: true,
        transferGrades: {
          orderBy: { term: "desc" }
        }
      }
    })

    if (!transcript || !transcript.user) {
      throw new Error("Transcript not found")
    }

    return {
      user: transcript.user,
      degreeData: transcript.degreeData,
      universityGrades: transcript.universityGrades,
      transferGrades: transcript.transferGrades
    }
  } catch (error) {
    console.error("Error fetching transcript:", error)
    throw new Error("Failed to fetch transcript")
  }
}

export async function getStudentGPA({ studentId }: { studentId: string }) {
  try {
    const [universityGrades, transferGrades, gradeDefinitions] = await db.$transaction([
      db.universityGrade.findMany({
        where: { studentId },
        orderBy: { term: "desc" },
        select: {
          term: true,
          finalGrade: true,
          creditHours: true
        }
      }),
      db.transferGrade.findMany({
        where: { studentId },
        orderBy: { term: "desc" },
        select: {
          term: true,
          equivalentGrade: true,
          creditHours: true,
          countInGPA: true,
          courseTitle: true
        }
      }),
      db.grade.findMany({})
    ])

    const standardizedUniversityGrades = universityGrades.map(grade => ({
      gradeCode: grade.finalGrade,
      creditHours: grade.creditHours,
      countInGPA: true
    }))

    const standardizedTransferGrades = transferGrades.map(grade => ({
      gradeCode: grade.equivalentGrade,
      creditHours: grade.creditHours,
      countInGPA: grade.countInGPA
    }))

    const combinedGrades = [...standardizedUniversityGrades, ...standardizedTransferGrades]

    let totalQualityPoints = 0
    let totalCredits = 0
    let completedCourses = 0
    let passedCourses = 0

    combinedGrades.forEach(({ gradeCode, creditHours, countInGPA }) => {
      const gradeDef = gradeDefinitions.find(def => def.gradeCode === gradeCode)

      if (gradeDef && gradeDef.gradeGPAInd && countInGPA) {
        totalQualityPoints += gradeDef.gradeQualityPoints * creditHours
        totalCredits += creditHours

        if (gradeDef.gradeCompletedInd) {
          completedCourses++
        }

        if (gradeDef.gradePassedInd) {
          passedCourses++
        }
      }
    })

    const gpa = totalQualityPoints / totalCredits

    return {
      gpa,
      totalCredits,
      completedCourses,
      passedCourses
    }
  } catch (error) {
    console.error("Failed to fetch and calculate metrics:", error)
    throw new Error("Failed to fetch and calculate metrics")
  }
}
