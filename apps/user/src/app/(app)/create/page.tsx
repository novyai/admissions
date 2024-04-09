import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card"

import { CreateNewScheduleForm } from "@/components/createNewSchedule/form"

export default async function CreateSchedulePage() {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Welcome to USF&apos;s Degree Planner</CardTitle>
        </CardHeader>
        <CardContent>
          <p>We need some information to get you started</p>

          <CreateNewScheduleForm userId={userId} />
        </CardContent>
      </Card>
    </div>
  )
}