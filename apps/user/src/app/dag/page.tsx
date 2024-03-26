import { redirect } from "next/navigation"
import cseDegree from "@/cse_requirments.json"
import { auth, UserButton } from "@clerk/nextjs"
import { db, Prisma, Version } from "@db/client"
import { getProfileFromSchedule, getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile, StudentProfile } from "@graph/types"
import { Button } from "@ui/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/ui/tooltip"
import { LifeBuoy } from "lucide-react"
import { Node as RFNode } from "reactflow"

import { Novy } from "@/components/novy-logo"
import { SemesterDAG } from "@/components/semester-dag"
import { getallNodesAndEdges } from "@/components/semester-dag/graph-to-node-utils"

export default async function Page() {
  const { userId, protect } = auth()

  protect({
    redirectUrl: "/"
  })

  if (!userId) {
    redirect("/")
  }

  console.log("userId", userId)
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
          createdAt: "desc"
        }
      }
    }
  })

  if (!schedule) {
    schedule = await createFirstScheduleAndVersion(userId)
  }

  const profile = await getProfileFromSchedule(schedule.versions[0]!.blob?.toString() ?? "")

  const { defaultNodes, defaultEdges } = await getallNodesAndEdges(profile)

  return (
    <div className="flex h-screen w-screen flex-row ">
      <div className="flex h-full flex-col border-r">
        <div className="border-b gap-2 h-[60px] flex items-center justify-center">
          <Button variant="outline" aria-label="Home" className="flex">
            <Novy width={32} height={32} />
            <h1 className="text-xxl font-semibold">Playground</h1>
          </Button>
        </div>
        <DagVersionSidebar versions={schedule.versions} />
        <nav className="mt-auto grid gap-1 p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="mt-auto rounded-lg" aria-label="Help">
                <LifeBuoy className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              Help
            </TooltipContent>
          </Tooltip>
        </nav>
      </div>
      <div className="flex flex-col w-full h-full">
        <header className="sticky top-0 z-10 flex h-[60px] items-center gap-1 border-b bg-background px-4">
          <div className="ml-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="grid flex-1 gap-4 overflow-auto p-4">
          <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl border p-4 lg:col-span-2">
            <SemesterDAG nodes={defaultNodes} edges={defaultEdges} />
          </div>
        </main>
      </div>
    </div>
  )
}

async function DagVersionSidebar({ versions }: { versions: Version[] }) {
  if (!versions.length) {
    // this should never be the case, cause on user creation we should create a first version
    return <p>No versions</p>
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {versions.map(version => {
        return <div key={version.id}>{version.id}</div>
      })}
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

  const { defaultNodes } = await getallNodesAndEdges(studentProfile)

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
          createdAt: "desc"
        }
      }
    }
  })

  return schedule
}

function createBlob(semesters: StudentProfile, nodes: RFNode[]): string {
  return JSON.stringify({
    profile: {
      requiredCourses: semesters.requiredCourses,
      transferCredits: semesters.transferCredits,
      timeToGraduate: semesters.timeToGraduate,
      coursePerSemester: semesters.coursePerSemester,
      currentSemester: semesters.currentSemester,
      semesters: semesters.semesters.map(s => s.map(c => c.id))
    },
    nodes: nodes.filter(n => n.type === "courseNode").map(n => ({ id: n.id, position: n.position }))
  })
}
