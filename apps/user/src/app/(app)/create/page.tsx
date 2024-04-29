import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card"

import { getProgramsForAllUniversities } from "@/components/createNewSchedule/action"
import { CreateNewScheduleForm } from "@/components/createNewSchedule/form"

export default async function CreateSchedulePage() {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const universityPrograms = await getProgramsForAllUniversities()

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>
            <p className="flex gap-1">
              <span>Welcome to</span>
              <span className="uppercase tracking-widest overflow-hidden">
                AI
                <span className="font-light">dvisor.</span>
              </span>
              <span>Your AI powered course planner</span>
            </p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Let&apos;s get you started!</p>

          <CreateNewScheduleForm userId={userId} universityPrograms={universityPrograms} />
        </CardContent>
      </Card>
    </div>
  )
}
