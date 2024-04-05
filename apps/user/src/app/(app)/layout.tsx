import { ReactNode } from "react"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"

import { siteConfig } from "@/config/site"
import ModeToggle from "@/components/mode-toggle"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="w-full py-4 px-4 pr-4 lg:px-8 border-b-[1px] h-[64px] backdrop-blur-md bg-background/90 dark:bg-background/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center lg:gap-6 gap-2">
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
          </div>
          <div className="gap-4 items-center flex">
            <div className="ml-[-2px] mt-[4px] flex items-center gap-6">
              <ModeToggle />
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="h-[calc(100dvh-64px)] w-full flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </>
  )
}
