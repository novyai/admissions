import { db } from "@db/client"

export default async function Chat({ params }: { params: { studentId: string } }) {
  const student = await db.user.findUnique({
    where: {
      id: params.studentId
    }
  })

  if (!student) {
    return <div>Student not found</div>
  }

  return (
    <div>
      <p>{`Chat for student ${student?.studentId}`}</p>
    </div>
  )
}
