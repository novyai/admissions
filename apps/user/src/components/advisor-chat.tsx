import { ReactNode } from "react"
import { AdvisorAgent } from "@/agents/advisor/schema"
import { User } from "@db/client"
import { StudentProfile } from "@graph/types"

import { MdxContent } from "./mdxContent"
import { CourseDisplay } from "./messageHandlers/course-display"
import { RescheduleCourse } from "./messageHandlers/reschedule-course"
import { SemesterDisplay } from "./messageHandlers/semester-display"
import { ScheduleTable } from "./messageHandlers/4-year-plan-table"

type AdvisorChatMessageSubType = AdvisorAgent["advisor_output"]["actions"][number]["type"]

type HandleAdvisorChatMessage<T extends AdvisorChatMessageSubType> = (params: {
	studentProfile: StudentProfile
	setStudentProfile: (profile: StudentProfile) => void
	student: User
	action: Extract<AdvisorAgent["advisor_output"]["actions"][number], { type: T }>
}) => ReactNode

type AdvisorMessageHandler = {
	[K in AdvisorChatMessageSubType]: HandleAdvisorChatMessage<K>
}

export const chatMessageHandler: AdvisorMessageHandler = {
	"4-year-plan": ({ studentProfile }) => {
		return <ScheduleTable profile={studentProfile} />
	},
	"display-course": ({ action, studentProfile }) => {
		return <CourseDisplay course={action.course_name} profile={studentProfile} />
	},
	"error": ({ action }) => {
		return <p className="text-red-500">{`Assistant Error: ${action.error}`}</p>
	},
	"rescheduleCourse": ({ action, studentProfile, setStudentProfile }) => {
		return (
			<RescheduleCourse
				courseName={action.course_name}
				toSemester={action.toSemester}
				profile={studentProfile}
				setProfile={setStudentProfile}
			/>
		)
	},
	"display-semester": ({ action: advisor_output, studentProfile }) => {
		return (
			<div>
				<strong>Assistant:</strong> {`Displaying semester ${advisor_output.semester}`}
				<SemesterDisplay semester={advisor_output.semester - 1} profile={studentProfile} />
			</div>
		)
	}
}

export const AdvisorMessageBody = ({
	advisor_output,
	...params
}: {
	advisor_output: AdvisorAgent["advisor_output"]
	studentProfile: StudentProfile
	setStudentProfile: (profile: StudentProfile) => void
	student: User
}) => {
	return (
		<>
			<MdxContent content={advisor_output.response} />
			<small className="text-gray-500">
				{advisor_output.actions?.map(action => action.type).join(", ")}
			</small>

			<div>
				{advisor_output?.actions?.map((action, i) => {
					const Handler = chatMessageHandler[action.type]

					return (
						<Handler
							key={i}
							// @ts-ignore
							action={action}
							studentProfile={params.studentProfile}
							setStudentProfile={params.setStudentProfile}
							student={params.student}
						/>
					)
				})}
			</div>
		</>
	)
}
