import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@repo/ui/components/ui/button"
import { Plus } from "lucide-react"

import { Novy } from "@/components/novy-logo"

export default function DagLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col  ">
      <div className="flex w-full flex-row">
        <header className="border-b sticky w-full gap-4 top-0 z-10 flex h-[60px] items-center bg-background px-4">
          <Button asChild variant="outline" size="icon" aria-label="Home" className="flex">
            <Link href="/">
              <Novy width={32} height={32} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Home" className="flex">
            <Link href="/create">
              <Plus strokeWidth={1} width={32} height={32} />
            </Link>
          </Button>
          <div className="ml-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
      </div>
      <div className="flex flex-row w-full h-full gap-4 p-4">{children}</div>
    </div>
  )
}
