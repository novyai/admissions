"use state"

import { useState } from "react"
import { getCourseFromIdNameCode } from "@graph/course"
import { canMoveCourse, moveCourse } from "@repo/graph/schedule"
import { StudentProfile } from "@repo/graph/types"
import { Button } from "@repo/ui/components/ui/button"

export const RescheduleCourse = ({
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
  const [confirmed, setConfirmed] = useState(false)

  const course = getCourseFromIdNameCode(profile, courseName)

  const canMove = canMoveCourse(course.id, toSemester - 1, profile)
  return (
    <div>
      <strong>Assistant:</strong>
      {`Checking if we can ${courseName} to semester ${toSemester}`}
      <br />
      {canMove.canMove ?
        <Button
          disabled={confirmed}
          onClick={() => {
            setProfile(moveCourse(course.id, toSemester - 1, profile))
            setConfirmed(true)
          }}
        >
          {confirmed ? "Confirmed" : "Confirm Move"}
        </Button>
      : <p className="text-red-500">{`Cannot move course: ${canMove.reason}`}</p>}
    </div>
  )
}
