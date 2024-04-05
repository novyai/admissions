import { StudentProfile } from "@repo/graph/types"
import { DataTable } from "@repo/ui/components/table"

import { getScheduleTableColumns } from "./schedule-table"

export const SemesterDisplay = ({
  semester,
  profile
}: {
  semester: number
  profile: StudentProfile
}) => {
  const semesterCourses = profile.semesters[semester]

  if (!semesterCourses) {
    return <div>No courses in this semester</div>
  }

  return (
    <DataTable
      columns={getScheduleTableColumns(profile)}
      data={semesterCourses}
      rowCount={semesterCourses.length}
    />
  )
}
