import Prisma, { db } from "@db/client"
import { parseBlob } from "@graph/blob"
import { CourseAttributes, CourseGraph } from "@graph/course"
import { graphToHydratedStudentProfile } from "@graph/graph"
import { createGraph } from "@graph/profile"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@ui/components/ui/accordion"
import { cn } from "@ui/lib/utils"

const TRACK_QUERY = {
  include: {
    requirementGroup: {
      include: {
        requirementSubgroups: {
          include: {
            requirements: {
              include: {
                courses: true
              }
            }
          }
        },
        requirements: {
          include: {
            courses: true
          }
        }
      }
    }
  }
} satisfies Prisma.TrackDefaultArgs

type RequirementGroupsQuery = Prisma.TrackGetPayload<typeof TRACK_QUERY>

type GroupData = RequirementGroupsQuery["requirementGroup"][number]["requirementSubgroups"][number]

export default async function Page({
  params: { scheduleId }
}: {
  params: {
    scheduleId: string
  }
}) {
  const schedule = await db.schedule.findUnique({
    where: {
      id: scheduleId
    },
    include: {
      versions: {
        select: {
          // scheduleId: true,
          blob: true,
          // createdAt: true,
          id: true
        },
        orderBy: {
          createdAt: "asc"
        },
        take: 1
      }
    }
  })

  if (!schedule || !schedule.versions[0]) {
    return <div>Not found</div>
  }

  const baseProfile = parseBlob(schedule.versions[0].blob)

  const graph = await createGraph(baseProfile)

  const profile = graphToHydratedStudentProfile(graph, baseProfile)

  if (profile.tracks.length > 1) {
    return <div>Multiple tracks not supported on our audit page for now</div>
  }

  const trackData = await db.track.findUnique({
    where: {
      id: profile.tracks[0]
    },
    ...TRACK_QUERY
  })

  if (!trackData) {
    return <div>Track not found</div>
  }

  return (
    <div className="flex w-full h-full flex-col gap-8 max-w-[1200px] mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Degree Audit</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Review your progress towards your degree requirements.
        </p>
      </div>
      <div className="space-y-4">
        {trackData.requirementGroup.map(requirementGroup => (
          <>
            {requirementGroup.requirementSubgroups.length > 0 && (
              <>
                <h2 className="text-2xl font-bold">{requirementGroup.name}</h2>
                <Accordion type="single" collapsible>
                  {requirementGroup.requirementSubgroups.map((group, i) => (
                    <AccordionItem key={i} value={group.id}>
                      <AccordionTrigger>
                        <div className="flex items-center justify-between py-2">
                          <h2 className="text-xl font-bold">{group.name}</h2>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-8">
                          {group.requirements.map((requirement, i) => (
                            <RequirementRow
                              key={i}
                              requirement={requirement}
                              graph={graph}
                              currentSemester={profile.currentSemester}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </>
            )}
          </>
        ))}
      </div>

      {/* <ProgressSection /> */}

      {/* <pre>{JSON.stringify(trackData, null, 2)}</pre> */}
    </div>
  )
}

const STATUS_COLOR = {
  not_planned: "gray-500",
  planned: "blue-500",
  in_progress: "yellow-500",
  completed: "green-500"
}

function getStatusForCourse(course: CourseAttributes, currentSemester: number) {
  if (!course.semester) {
    return "not_planned"
  }
  if (course.semester < currentSemester) {
    return "completed" as const
  }
  if (course.semester === currentSemester) {
    return "in_progress" as const
  }
  return "planned" as const
}

function getStatusForRequirement(
  requirement: GroupData["requirements"][number],
  graph: CourseGraph,
  currentSemester: number
) {
  const statuses = requirement.courses.map(course =>
    getStatusForCourse(graph.getNodeAttributes(course.id), currentSemester)
  )
  if (statuses.includes("not_planned")) {
    return "not_planned"
  }
  if (statuses.includes("planned")) {
    return "planned"
  }
  if (statuses.includes("in_progress")) {
    return "in_progress"
  }
  return "completed"
}

function RequirementRow({
  requirement,
  graph,
  currentSemester
}: {
  requirement: GroupData["requirements"][number]
  graph: CourseGraph
  currentSemester: number
}) {
  const status = getStatusForRequirement(requirement, graph, currentSemester)

  const statusColor = STATUS_COLOR[status]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <div className={cn("h-4 w-4 rounded-full", `bg-${statusColor}`)} />
        <h4 className="font-medium text-md">
          Pick {requirement.creditHoursNeeded} credits worth of the following courses
        </h4>
      </div>
      <div className="space-y-3">
        {requirement.courses.map((course, i) => {
          const courseData = graph.getNodeAttributes(course.id)

          const status = getStatusForCourse(courseData, currentSemester)

          return (
            <div key={i} className="pl-8">
              {courseData.name} - Status: {status} - semester:{" "}
              {courseData.semester ?? "no semester"}
            </div>
          )
        })}
      </div>
    </div>
  )
}
