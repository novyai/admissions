import { ReactNode } from "react"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@repo/ui/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/ui/tooltip"
import { Plus } from "lucide-react"

import { siteConfig } from "@/config/site"
import ModeToggle from "@/components/mode-toggle"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="w-full py-4 px-4 pr-4 lg:px-8 border-b-[1px] h-[64px] backdrop-blur-md bg-background/90 dark:bg-background/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center lg:gap-6 gap-4">
            <div className="flex items-center">
              <h1 className="text-lg  uppercase tracking-widest overflow-hidden whitespace-nowrap">
                <Link href={"/"}>
                  <div className="text-xl font-bold">
                    AI
                    <span className="font-light">dvisor</span>
                  </div>
                </Link>
              </h1>

              <nav className="space-x-8 block ml-12">
                {siteConfig.mainNav.map(({ label, url }) => (
                  <Link
                    className="text-xs hover:underline font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    href={url}
                    key={label}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="icon">
                  <Link href="/create">
                    <Plus strokeWidth={1} width={30} height={30} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create New Schedule</TooltipContent>
            </Tooltip>
          </div>
          <div className="gap-4 items-center flex">
            <div className="ml-[-2px] mt-[4px] flex items-center gap-6">
              <ModeToggle />
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-64px)] w-full flex-1 flex flex-col overflow-auto">
        {children}
      </main>
    </>
  )
}
