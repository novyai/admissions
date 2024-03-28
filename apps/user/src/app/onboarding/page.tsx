import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { db } from "@db/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/ui/card"

import { OnboardingForm } from "./form"

export default async function OnboardingPage() {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const schedule = await db.schedule.findUnique({
    where: {
      userID: userId
    }
  })

  if (schedule) {
    redirect("/dag")
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Welcome to USF&apos;s Degree Planner</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>We need some information to get you started</CardDescription>
          <OnboardingForm userId={userId} />
        </CardContent>
      </Card>
    </div>
  )
}
