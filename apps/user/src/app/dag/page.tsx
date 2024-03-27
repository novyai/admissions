import { redirect } from "next/navigation"
import cseDegree from "@/cse_requirments.json"
import { auth, UserButton } from "@clerk/nextjs"
import { db, Prisma } from "@db/client"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile } from "@graph/types"
import { Button } from "@ui/components/ui/button"

import { createBlob } from "@/lib/version-blob"
import { Novy } from "@/components/novy-logo"

import { getAllNodesAndEdges } from "./action"
import { Editor } from "./editor"

export default async function Page() {
  const { userId, protect } = auth()

  protect({
    redirectUrl: "/"
  })

  if (!userId) {
    redirect("/")
  }

  let schedule = await db.schedule.findUnique({
    where: {
      userID: userId
    },
    include: {
      versions: {
        select: {
          scheduleId: true,
          blob: true,
          createdAt: true,
          id: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })

  if (!schedule || schedule?.versions.length == 0) {
    schedule = await createFirstScheduleAndVersion(userId)
  }

  return (
    <div className="flex h-screen w-screen flex-col  ">
      <div className="flex w-full flex-row border-r">
        <div className="border-b gap-2 h-[60px] flex items-center justify-center">
          <Button variant="outline" aria-label="Home" className="flex">
            <Novy width={32} height={32} />
            <h1 className="text-xxl font-semibold">Playground</h1>
          </Button>
        </div>
        <header className="sticky w-full top-0 z-10 flex h-[60px] items-center gap-1 border-b bg-background px-4">
          <div className="ml-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
      </div>
      <div className="flex flex-row w-full h-full gap-4 m-4">
        <Editor versions={schedule.versions} />
      </div>
    </div>
  )
}

async function createFirstScheduleAndVersion(userId: string) {
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

  const studentProfile = await getStudentProfileFromRequirements(baseProfile)

  const { defaultNodes } = await getAllNodesAndEdges(studentProfile)

  const schedule = await db.schedule.create({
    data: {
      userID: userId,
      versions: {
        create: {
          blob: createBlob(studentProfile, defaultNodes)
        }
      }
    },
    include: {
      versions: {
        select: {
          scheduleId: true,
          blob: true,
          createdAt: true,
          id: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })

  return schedule
}
