import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/ui/card"

import { OnboardingForm } from "./form"

export default function OnboardingPage() {
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

          <OnboardingForm userId={userId} />
        </CardContent>
      </Card>
    </div>
  )
}
