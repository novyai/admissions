import { redirect } from "next/navigation"
import { getVersions } from "@/db/versions"
import { auth, UserButton } from "@clerk/nextjs"
import { Button } from "@ui/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/ui/tooltip"
import { LifeBuoy } from "lucide-react"

import { Novy } from "@/components/novy-logo"
import { TemporaryDag } from "@/components/semester-dag/temp-dag"

export default async function Page() {
  const { userId, protect } = auth()

  protect({
    redirectUrl: "/"
  })

  if (!userId) {
    redirect("/")
  }

  return (
    <div className="flex h-screen w-screen flex-row ">
      <div className="flex h-full flex-col border-r">
        <div className="border-b gap-2 h-[60px] flex items-center justify-center">
          <Button variant="outline" aria-label="Home" className="flex">
            <Novy width={32} height={32} />
            <h1 className="text-xxl font-semibold">Playground</h1>
          </Button>
        </div>
        <DagVersionSidebar userId={userId} />
        <nav className="mt-auto grid gap-1 p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="mt-auto rounded-lg" aria-label="Help">
                <LifeBuoy className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              Help
            </TooltipContent>
          </Tooltip>
        </nav>
      </div>
      <div className="flex flex-col w-full h-full">
        <header className="sticky top-0 z-10 flex h-[60px] items-center gap-1 border-b bg-background px-4">
          <div className="ml-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="grid flex-1 gap-4 overflow-auto p-4">
          <DagChat />
        </main>
      </div>
    </div>
  )
}

const DagChat = () => {
  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl border p-4 lg:col-span-2">
      <TemporaryDag />
    </div>
  )
}

async function DagVersionSidebar({ userId }: { userId: string }) {
  const versions = await getVersions(userId)

  if (!versions.length) {
    // this should never be the case, cause on user creation we should create a first version
    return <p>No versions</p>
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {versions.map(version => {
        return <div key={version.id}>{version.id}</div>
      })}
    </div>
  )
}
