import { StudentProfile } from "./types"

export const getCourseFromIdNameCode = (profile: StudentProfile, course: string) => {

	const courses = [...profile.graph.values()]

	return (
		courses.find(c => c.name == course) ??
		courses.find(
			c => `${c.raw_course.courseSubject} ${c.raw_course.courseNumber}` == course
		) ??
		courses.find(c => c.id == course)
	)
}
