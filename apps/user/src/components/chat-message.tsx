import { ReactNode } from "react"
import { AdvisorAgent, advisorAgentSchema } from "@/agents/advisor/schema"
import { $Enums, User } from "@db/client"
import { getCourseFromNameOrCode } from "@graph/course"
import { getAllRequiredCourses } from "@graph/graph"
import { canMoveCourse, moveCourse } from "@graph/schedule"
import { StudentProfile } from "@graph/types"
import { DataTable } from "@ui/components/table"
import { Button } from "@ui/components/ui/button"
import OpenAI from "openai"

import { getScheduleTableColumns, ScheduleTable } from "./schedule-table"

type ChatMessageSubType = AdvisorAgent["advisor_output"]["type"]

type HandleChatMessage<T extends ChatMessageSubType> = (params: {
  studentProfile: StudentProfile
  setStudentProfile: (profile: StudentProfile) => void
  student: User
  advisor_output: Extract<AdvisorAgent["advisor_output"], { type: T }>
}) => ReactNode

type ChatMessageHandler = {
  [K in ChatMessageSubType]: HandleChatMessage<K>
}

const chatMessageHandler: ChatMessageHandler = {
  "4-year-plan": ({ studentProfile }) => {
    return <ScheduleTable profile={studentProfile} />
  },
  "display-course": ({ advisor_output, studentProfile }) => {
    return <CourseDisplay course={advisor_output.course_name} profile={studentProfile} />
  },
  "error": ({ advisor_output }) => {
    return <p className="text-red-500">{`Assistant Error: ${advisor_output.error}`}</p>
  },
  "conversation": ({ advisor_output }) => {
    return (
      <p>
        <strong>Assistant:</strong> {advisor_output.response}
      </p>
    )
  },
  "rescheduleCourse": ({ advisor_output, studentProfile, setStudentProfile }) => {
    return (
      <RescheduleCourse
        courseName={advisor_output.course_name}
        toSemester={advisor_output.toSemester}
        profile={studentProfile}
        setProfile={setStudentProfile}
      />
    )
  },
  "display-semester": ({ advisor_output, studentProfile }) => {
    return (
      <div>
        <strong>Assistant:</strong> {`Displaying semester ${advisor_output.semester}`}
        <SemesterDisplay semester={advisor_output.semester - 1} profile={studentProfile} />
      </div>
    )
  }
}

export const ChatMessage = ({
  partial = false,
  message,
  studentProfile,
  setStudentProfile
}: {
  partial?: boolean
  studentProfile: StudentProfile
  setStudentProfile: (profile: StudentProfile) => void
  message: {
    role: OpenAI.ChatCompletionMessageParam["role"]
    content: unknown
  }
}) => {
  const { role, content } = message

  if (role === "user") {
    return (
      <p>
        <strong>User:</strong> {content as string}
      </p>
    )
  } else {
    const output = advisorAgentSchema.safeParse(content as string)

    if (output.success) {
      const advisor_output = output.data.advisor_output
      const handler = chatMessageHandler[advisor_output.type]

      return handler({
        // @ts-expect-error - safe because we are using the handler to determine the type
        advisor_output,
        studentProfile,
        setStudentProfile
      })
    } else {
      // don't show parsing errors for partial responses
      if (partial) return null

      return <p> {`Assistant Error: COULD NOT PARSE ${JSON.stringify(content)}`}</p>
    }
  }
}

const SemesterDisplay = ({ semester, profile }: { semester: number; profile: StudentProfile }) => {
  const semesterCourses = profile.semesters[semester]

  if (!semesterCourses) {
    return <div>No courses in this semester</div>
  }

  return (
    <DataTable
      columns={getScheduleTableColumns(profile)}
      data={semesterCourses}
      rowCount={semesterCourses.length}
      search={false}
    />
  )
}

const CourseDisplay = ({ course, profile }: { course: string; profile: StudentProfile }) => {
  console.log("displaying course", course)
  const courseNode = getCourseFromNameOrCode(profile, course)

  if (!courseNode) {
    return <div>Course {course} not found</div>
  }

  return (
    <div>
      <h2>{courseNode.name}</h2>
      <p>Earliest Finish: {courseNode.earliestFinish}</p>
      <p>Latest Finish: {courseNode.latestFinish}</p>
      <p>Slack: {courseNode.latestFinish! - courseNode.earliestFinish!}</p>
      <p>Required For: {getAllRequiredCourses(courseNode.id, profile.graph).join(", ")}</p>
      <p>Semester: {profile.semesters.findIndex(s => s.some(c => c.id === courseNode.id)) + 1}</p>
      <p>Direct Prerequisites: {courseNode.prerequisites.join(", ")}</p>
    </div>
  )
}

const RescheduleCourse = ({
  courseName,
  toSemester,
  profile,
  setProfile
}: {
  courseName: string
  toSemester: number
  profile: StudentProfile
  setProfile: (profile: StudentProfile) => void
}) => {
  const canMove = canMoveCourse(courseName, toSemester, profile)
  return (
    <div>
      <strong>Assistant:</strong>
      {`Checking if we can ${courseName} to semester ${toSemester}`}
      <br />
      {canMove.canMove ? (
        <Button
          onClick={() => {
            setProfile(moveCourse(courseName, toSemester, profile))
          }}
        >
          Confirm Move
        </Button>
      ) : (
        <p className="text-red-500">{`Cannot move course: ${canMove.reason}`}</p>
      )}
    </div>
  )
}
