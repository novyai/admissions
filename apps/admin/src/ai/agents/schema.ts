import { z } from "zod"

export const rescheduleCourseAgent = z.object(
	{
		toSemester: z.number({
			description: "The semester to reschedule the course to"
		}),
		course_name: z.string({
			description: "The course name to reschedule. Do not use the course ID. USE THE FULL NAME"
		})
	},
	{ description: "Reshedule Course Agent" }
)
