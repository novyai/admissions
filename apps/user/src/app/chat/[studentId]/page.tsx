import { db } from "@db/client"

import { Chat } from "@/components/chat"

export default async function Page({ params }: { params: { studentId: string } }) {
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
      <pre>{JSON.stringify(student, null, 2)}</pre>
      <Chat student={student} />
    </div>
  )
}
