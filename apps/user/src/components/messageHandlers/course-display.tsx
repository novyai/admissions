import { getCourseFromIdNameCode } from "@repo/graph/course"
import { getAllDependents, getAllPrereqs } from "@repo/graph/graph"
import { StudentProfile } from "@repo/graph/types"

import { MdxContent } from "../mdxContent"

export const CourseDisplay = ({ course, profile }: { course: string; profile: StudentProfile }) => {
  console.log("displaying course", course)
  const courseNode = getCourseFromIdNameCode(profile, course)

  if (!courseNode) {
    return <div>Course {course} not found</div>
  }

  const preqs = getAllPrereqs(courseNode.id, profile)
  const dependents = getAllDependents(courseNode.id, profile)

  return (
    <MdxContent
      content={`
### ${courseNode.name}

#### Prerequisites
${preqs.length > 0 ? preqs.map(p => ` - ${profile.graph.get(p.id)?.name}`).join("\n") : "No required courses"}

#### Dependents
${
  dependents.length > 0 ?
    dependents.map(p => ` - ${profile.graph.get(p.id)?.name}`).join("\n")
  : "No courses depend on this course"
}

#### Description
A course about ${courseNode.name}
`}
    />
  )
}
