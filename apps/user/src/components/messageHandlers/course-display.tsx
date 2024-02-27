import { getCourseFromNameOrCode } from "@graph/course"
import { getAllDependents, getAllPrereqs } from "@graph/graph"
import { StudentProfile } from "@graph/types"

export const CourseDisplay = ({ course, profile }: { course: string; profile: StudentProfile }) => {
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
      <p>
        All Prerequisites:
        {getAllPrereqs(courseNode.id, profile)
          .filter(c => c.id !== courseNode.id)
          .map(c => c.name)
          .join(", ")}
      </p>
      <p>Semester: {profile.semesters.findIndex(s => s.some(c => c.id === courseNode.id)) + 1}</p>
      <p>
        Needed to take before:{" "}
        {getAllDependents(courseNode.id, profile)
          .map(c => c.name)
          .filter(c => c !== courseNode.name)
          .join(", ")}
      </p>
    </div>
  )
}
