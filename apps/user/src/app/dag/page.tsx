import Link from "next/link"
import { redirect, RedirectType } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { db, Schedule } from "@db/client"

export default async function Page() {
  const { userId, protect } = auth()

  protect({
    redirectUrl: "/"
  })

  if (!userId) {
    return redirect("/sign-in", RedirectType.replace)
  }

  const schedules = await db.schedule.findMany({
    where: {
      userID: userId
    }
  })

  return <ScheduleTable schedules={schedules} />
}

function ScheduleTable({ schedules }: { schedules: Schedule[] }) {
  return (
    <div>
      {schedules.map(schedule => (
        <div key={schedule.id}>
          <Link href={`/dag/${schedule.id}`}>{schedule.id}</Link>
        </div>
      ))}
    </div>
  )
}
