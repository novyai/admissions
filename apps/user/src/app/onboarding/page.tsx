"use client"

import { useRouter } from "next/navigation"
import { Button } from "@ui/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/ui/card"

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center h-screen">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to USF&apos;s Degree Planner</CardTitle>
        </CardHeader>
        <CardContent>
          <p>We need some information to get you started</p>
          <p>we need a degree picker here</p>
          <Button onClick={() => router.push("/dag")}>Submit</Button>
        </CardContent>
      </Card>
    </div>
  )
}
