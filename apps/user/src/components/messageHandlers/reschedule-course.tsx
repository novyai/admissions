"use state"

import { useState } from "react"
import { canMoveCourse, moveCourse } from "@graph/schedule"
import { StudentProfile } from "@graph/types"
import { Button } from "@ui/components/ui/button"

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

  const canMove = canMoveCourse(courseName, toSemester, profile)
  return (
    <div>
      <strong>Assistant:</strong>
      {`Checking if we can ${courseName} to semester ${toSemester}`}
      <br />
      {canMove.canMove ? (
        <Button
          disabled={confirmed}
          onClick={() => {
            setProfile(moveCourse(courseName, toSemester, profile))
            setConfirmed(true)
          }}
        >
          {confirmed ? "Confirmed" : "Confirm Move"}
        </Button>
      ) : (
        <p className="text-red-500">{`Cannot move course: ${canMove.reason}`}</p>
      )}
    </div>
  )
}
