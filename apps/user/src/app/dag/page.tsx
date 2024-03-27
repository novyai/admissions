import { redirect } from "next/navigation"
import { auth, UserButton } from "@clerk/nextjs"
import { db } from "@db/client"
import { Button } from "@ui/components/ui/button"

import { Novy } from "@/components/novy-logo"

import { Editor } from "./editor"

export default async function Page() {
  const { userId, protect } = auth()

  protect({
    redirectUrl: "/"
  })

  if (!userId) {
    redirect("/")
  }

  let schedule = await db.schedule.findUnique({
    where: {
      userID: userId
    },
    include: {
      versions: {
        select: {
          scheduleId: true,
          blob: true,
          createdAt: true,
          id: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })

  if (!schedule || schedule?.versions.length == 0) {
    redirect("/onboarding")
  }

  return (
    <div className="flex h-screen w-screen flex-col  ">
      <div className="flex w-full flex-row border-r">
        <div className="border-b gap-2 h-[60px] flex items-center justify-center">
          <Button variant="outline" aria-label="Home" className="flex">
            <Novy width={32} height={32} />
            <h1 className="text-xxl font-semibold">Playground</h1>
          </Button>
        </div>
        <header className="sticky w-full top-0 z-10 flex h-[60px] items-center gap-1 border-b bg-background px-4">
          <div className="ml-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
      </div>
      <div className="flex flex-row w-full h-full gap-4 m-4">
        <Editor versions={schedule.versions} />
      </div>
    </div>
  )
}
