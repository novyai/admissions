import { forwardRef, useEffect, useState } from "react"
import { TrackDataPayload } from "@/app/(app)/schedule/[scheduleId]/page"
import { CourseAttributes, CourseGraph } from "@graph/course"
import { hydratedStudentProfileToGraph } from "@graph/graph"
import { HydratedStudentProfile, SemesterYearType } from "@graph/types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@ui/components/ui/accordion"
import { Badge } from "@ui/components/ui/badge"
import { Button } from "@ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@ui/components/ui/dropdown-menu"
import { Separator } from "@ui/components/ui/separator"
import { cn } from "@ui/lib/utils"
import { CalendarCheckIcon, CheckIcon, Ellipsis, MoreHorizontal, TriangleAlert } from "lucide-react"

import { getSemesterCode } from "@/lib/schedule/utils"
import { capitalize } from "@/lib/utils"

type GroupData = TrackDataPayload["requirementGroup"][number]["requirementSubgroups"][number]

type Status = "not_planned" | "completed" | "in_progress" | "planned"

interface DegreeAuditProps {
  profile: HydratedStudentProfile
  trackData: TrackDataPayload | null
  requirementToScrollTo: string | undefined
  clearRequirementToScrollTo: () => void
}

const DegreeAudit = forwardRef<HTMLDivElement, DegreeAuditProps>(
  ({ profile, trackData, requirementToScrollTo, clearRequirementToScrollTo }, ref) => {
    const [accordionValue, setAccordionValue] = useState<string>()

    useEffect(() => {
      const scrollToRequirement = async () => {
        if (requirementToScrollTo !== undefined) {
          const requirementElt = document.querySelector(
            `[data-requirement-group-id='${requirementToScrollTo}']`
          )
          if (requirementElt === null || !(requirementElt instanceof HTMLElement)) {
            throw Error(
              `No HTML element found matching [data-requirement-group-id='${requirementToScrollTo}']`
            )
          }
          if (requirementElt.hasAttribute("data-accordion-item")) {
            setAccordionValue(undefined)
            requirementElt.scrollIntoView({ block: "nearest", inline: "start" })
            const accordionTrigger = requirementElt.querySelector(
              "button[data-accordion-trigger]"
            ) as HTMLButtonElement | null
            if (accordionTrigger === null) {
              throw Error(
                `No button element with the 'data-accordion-item' attribute found in the requirementElt ${requirementElt}`
              )
            }
            requirementElt.scrollIntoView({ block: "nearest", inline: "start" })
            setAccordionValue(requirementToScrollTo)
          }
          clearRequirementToScrollTo()
        }
      }
      scrollToRequirement()
    }, [requirementToScrollTo, clearRequirementToScrollTo])

    if (!trackData) {
      return <div>Track not found</div>
    }
    if (profile.tracks.length > 1) {
      return <div>Multiple tracks not supported on our audit page for now</div>
    }

    const graph = hydratedStudentProfileToGraph(profile)

    trackData.requirementGroup.sort((reqGroupA, reqGroupB) =>
      reqGroupA.name.localeCompare(reqGroupB.name)
    )

    return (
      <div className="w-full h-full p-4 max-w-[1200px] mx-auto overflow-scroll" ref={ref}>
        <h1 className="text-3xl font-bold sr-only">Degree Audit</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Review your progress towards your degree requirements.
        </p>
        {trackData.requirementGroup.map((requirementGroup, i) => (
          <div key={i} className="mt-4">
            {requirementGroup.requirementSubgroups.length > 0 && (
              <>
                <h2 className="text-lg font-bold" data-requirement-group-id={requirementGroup.id}>
                  {requirementGroup.name}
                </h2>
                <Accordion
                  type="single"
                  value={accordionValue}
                  onValueChange={value => setAccordionValue(value)}
                  collapsible
                >
                  {requirementGroup.requirementSubgroups.map((group, i) => (
                    <AccordionItem
                      key={i}
                      value={group.id}
                      data-requirement-group-id={group.id}
                      data-accordion-item
                    >
                      <AccordionTrigger data-accordion-trigger>
                        <div className="flex w-full h-full items-center gap-2">
                          <StatusIcon
                            status={handleStatusList(
                              group.requirements.map(requirement =>
                                getStatusForRequirement(requirement, graph, profile.currentSemester)
                              )
                            )}
                          />
                          <h2 className="text-[1rem]">{group.name}</h2>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex w-full h-full flex-col gap-8">
                          {group.requirements.map((requirement, i) => (
                            <RequirementRow
                              key={i}
                              requirement={requirement}
                              graph={graph}
                              startTerm={profile.startTerm}
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
          </div>
        ))}
      </div>
    )
  }
)
DegreeAudit.displayName = "DegreeAudit"
const STATUS_INFORMATION = {
  not_planned: {
    bgColor: "bg-red-400" as const,
    icon: TriangleAlert,
    content: "Not planned"
  },
  planned: {
    bgColor: "bg-blue-400" as const,
    icon: CalendarCheckIcon,
    content: "Planned"
  },
  in_progress: {
    bgColor: "bg-yellow-400" as const,
    icon: Ellipsis,
    content: "In progress"
  },
  completed: {
    bgColor: "bg-green-400" as const,
    icon: CheckIcon,
    content: "Completed"
  }
}

function getAttributes(graph: CourseGraph, courseId: string) {
  if (graph.hasNode(courseId)) {
    return graph.getNodeAttributes(courseId)
  }
  return null
}

function getStatusForCourse(course: CourseAttributes, currentSemester: number): Status {
  if (course.semester === undefined) {
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

function handleStatusList(statuses: Status[]): Status {
  if (statuses.includes("not_planned")) {
    return "not_planned"
  }
  if (statuses.includes("in_progress")) {
    return "in_progress"
  }
  if (statuses.includes("planned")) {
    return "planned"
  }
  return "completed"
}

function StatusIcon({ status }: { status: Status }) {
  const info = STATUS_INFORMATION[status]
  return (
    <div className={cn("flex items-center justify-center  w-8 h-8 rounded-full", info.bgColor)}>
      <info.icon className="w-5 h-5 text-white" />
    </div>
  )
}

function getStatusForRequirement(
  requirement: GroupData["requirements"][number],
  graph: CourseGraph,
  currentSemester: number
): Status {
  const statuses = requirement.courses.map(course => {
    const attributes = getAttributes(graph, course.id)
    if (!attributes) {
      return { status: "not_planned", creditHours: course.creditHours }
    }
    return {
      status: getStatusForCourse(attributes, currentSemester),
      creditHours: course.creditHours
    }
  })

  const creditHoursTaken = statuses
    .filter(status => status.status === "completed")
    .reduce((acc, status) => acc + status.creditHours, 0)

  if (creditHoursTaken >= requirement.creditHoursNeeded) {
    return "completed"
  }

  const creditHoursInProgress = statuses
    .filter(status => status.status === "in_progress")
    .reduce((acc, status) => acc + status.creditHours, 0)

  if (creditHoursInProgress + creditHoursTaken > 0) {
    return "in_progress"
  }

  const creditHoursPlanned = statuses
    .filter(status => status.status === "planned")
    .reduce((acc, status) => acc + status.creditHours, 0)
  if (
    creditHoursTaken + creditHoursInProgress + creditHoursPlanned >=
    requirement.creditHoursNeeded
  ) {
    return "planned"
  }

  return "not_planned"
}

function RequirementRow({
  requirement,
  graph,
  currentSemester,
  startTerm
}: {
  startTerm: SemesterYearType
  requirement: GroupData["requirements"][number]
  graph: CourseGraph
  currentSemester: number
}) {
  const status = getStatusForRequirement(requirement, graph, currentSemester)

  let courses = requirement.courses
  let extraCourses: GroupData["requirements"][number]["courses"] = []
  // if status is completed we just need to show completed courses
  if (status === "completed") {
    courses = courses.filter(course => {
      const attributes = getAttributes(graph, course.id)

      if (!attributes) {
        return false
      }
      const status = getStatusForCourse(attributes, currentSemester)
      return status === "completed"
    })
  }

  // if status is planned we need to show courses that are completed and in progress, and planned. Then show other courses
  if (status === "planned" || status === "in_progress") {
    courses = courses.filter(course => {
      const attributes = getAttributes(graph, course.id)
      if (!attributes) {
        return false
      }
      return getStatusForCourse(attributes, currentSemester) !== "not_planned"
    })
    courses.sort((courseA, courseB) => {
      const semesterA = getAttributes(graph, courseA.id)?.semester
      const semesterB = getAttributes(graph, courseB.id)?.semester

      if (semesterA === undefined && semesterB === undefined) return 0
      if (semesterA === undefined) return 1
      if (semesterB === undefined) return -1
      return semesterA - semesterB
    })
    extraCourses = requirement.courses.filter(course => {
      const attributes = getAttributes(graph, course.id)

      if (!attributes) {
        return true
      }
      return getStatusForCourse(attributes, currentSemester) === "not_planned"
    })
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 p-2 items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
        <div className="flex gap-2 items-center">
          <StatusIcon status={status} />
          <h4 className="font-medium text-md">
            Pick {requirement.creditHoursNeeded} credits worth of the following courses
          </h4>
        </div>
      </div>
      <div className="space-y-3 ml-8">
        {courses.map((course, i) => (
          <CourseRow
            key={i}
            course={course}
            graph={graph}
            currentSemester={currentSemester}
            startTerm={startTerm}
          />
        ))}
        {extraCourses.length > 0 && (
          <>
            <Separator />

            <div className="flex gap-2 flex-col p-1 rounded-md">
              <h4 className="font-semibold text-md">Other courses to consider</h4>
              <div className="max-h-[36ex] w-[36rem] max-w-full p-1 overflow-y-scroll shadow-inner rounded-lg">
                {extraCourses.map((course, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-md"
                  >
                    <div>
                      <div className="flex gap-2 items-center">
                        <h5 className="font-medium text-md">
                          {course.courseSubject} {course.courseNumber}
                        </h5>
                        <Badge variant="outline">{course.creditHours} credits</Badge>
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400">{course?.name}</p>
                    </div>
                    <CourseDropdown />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CourseRow({
  course,
  graph,
  currentSemester,
  startTerm
}: {
  course: GroupData["requirements"][number]["courses"][number]
  graph: CourseGraph
  currentSemester: number
  startTerm: SemesterYearType
}) {
  const courseData = getAttributes(graph, course.id)

  let status: Status = "not_planned"
  let semesterCode: {
    semester: string
    year: string | number
  } = {
    semester: "No",
    year: "semester"
  }

  if (courseData) {
    status = getStatusForCourse(courseData, currentSemester)
    if (courseData.semester !== undefined) {
      semesterCode = getSemesterCode(courseData.semester, startTerm)
    }
  }

  const statusInfo = STATUS_INFORMATION[status]
  return (
    <div className="flex gap-2 w-[36rem] max-w-full items-center hover:bg-gray-50 dark:hover:bg-gray-900 p-2 rounded-md">
      <div className="flex justify-between items-center gap-8 w-full">
        <div className="flex gap-2 items-center">
          <StatusIcon status={status} />
          <div>
            <div className="flex gap-2 items-center">
              <h5 className="font-medium text-md">
                {course.courseSubject} {course.courseNumber}
              </h5>
              <Badge variant={"outline"}>{course.creditHours} credits</Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{course?.name}</p>
          </div>
        </div>
        <div className="text-sm text-right">
          {status === "not_planned" ?
            "Not planned"
          : <>
              <span className="block font-semibold">{`${capitalize(semesterCode.semester)} ${semesterCode.year}`}</span>
              <span className="block">{statusInfo.content}</span>
            </>
          }
        </div>
      </div>

      <CourseDropdown />
    </div>
  )
}

function CourseDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Select this course</DropdownMenuItem>
        <DropdownMenuItem>View course information</DropdownMenuItem>
        <DropdownMenuItem>Replace this course</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DegreeAudit
