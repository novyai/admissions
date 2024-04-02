import { StudentProfile } from "@graph/types"
import { Node } from "reactflow"

export function createBlob(semesters: StudentProfile, nodes: Node[]) {
  return {
    profile: {
      requiredCourses: semesters.requiredCourses,
      transferCredits: semesters.transferCredits,
      timeToGraduate: semesters.timeToGraduate,
      coursePerSemester: semesters.coursePerSemester,
      currentSemester: semesters.currentSemester,
      semesters: semesters.semesters.map(s => s.map(c => c.id))
    },
    nodes: nodes
      .filter(n => n.type === "courseNode")
      .map(n => ({ id: n.id, position: { ...n.position } }))
  }
}
