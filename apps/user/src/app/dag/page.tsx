import { getStudentProfile } from "@/actions/schedule"
import cseDegree from "@/cse_requirments.json"
import { db, Prisma } from "@db/client"
import { BaseStudentProfile } from "@graph/types"

import { SemesterDAG } from "@/components/semester-dag"

export default async function Page() {
	const deptCourses = cseDegree.map((course): Prisma.CourseWhereInput => {
		return {
			courseSubject: course.course_dept,
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

	const { id: precalcId } = await db.course.findFirst({
		select: {
			id: true
		},
		where: {
			courseSubject: "MAC",
			courseNumber: "1147"
		}
	}) ?? {
		id: null
	}

	if (!precalcId) {
		throw new Error("Precalc course not found")
	}

	const baseProfile: BaseStudentProfile = {
		requiredCourses: requiredCourses.map(course => course.id),
		transferCredits: [precalcId],
		timeToGraduate: 8,
		coursePerSemester: 6,
		currentSemester: 0
	}

	const studentProfile = await getStudentProfile(baseProfile)

	return (
		<>
			<SemesterDAG studentProfile={studentProfile} />
			{/* <DagChat studentProfile={studentProfile} /> */}
		</>
	)
}
