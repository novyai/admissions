import { getCourseFromIdNameCode } from "@graph/course"
import { getAllDependents, getAllPrereqs } from "@graph/graph"
import { StudentProfile } from "@graph/types"

import { MdxContent } from "../mdxContent"

export const CourseDisplay = ({ course, profile }: { course: string; profile: StudentProfile }) => {
	console.log("displaying course", course)
	const courseNode = getCourseFromIdNameCode(profile, course)

	if (!courseNode) {
		return <div>Course {course} not found</div>
	}

	const preqs = getAllPrereqs(courseNode.id, profile).filter(p => p.id !== courseNode.id)
	const dependents = getAllDependents(courseNode.id, profile).filter(p => p.id !== courseNode.id)

	return (
		<MdxContent
			content={`
### ${courseNode.name}

#### Prerequisites
${preqs.length > 0 ? preqs.map(p => ` - ${profile.graph.get(p.id)?.name}`).join("\n") : "No required courses"}

#### Dependents
${
	dependents.length > 0
		? dependents.map(p => ` - ${profile.graph.get(p.id)?.name}`).join("\n")
		: "No courses depend on this course"
}

#### Description
A course about ${courseNode.name}
`}
		/>
	)
}
