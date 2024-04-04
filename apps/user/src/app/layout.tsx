import "@/styles/globals.css"

import { ReactNode } from "react"
import Link from "next/link"
import { ClerkProvider } from "@clerk/nextjs"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import ModeToggle from "@/components/mode-toggle"
import { defaultFontMapper } from "@/styles/fonts"

import Providers from "./providers"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(
          "antialiased overflow-hidden h-screen w-screen",
          ...Object.values(defaultFontMapper)
        )}
      >
        <body>
          <Providers>
            <>
              <div
                className="h-screen w-screen flex flex-col overflow-hidden bg-background"
                vaul-drawer-wrapper=""
              >
                <header className="w-full py-4 px-4 pr-4 lg:px-8 border-b-[1px] h-[64px] backdrop-blur-md bg-background/90 dark:bg-background/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center lg:gap-6 gap-2">
                      <div className="flex items-center">
                        <h1 className="text-lg font-okineBold uppercase tracking-widest overflow-hidden whitespace-nowrap">
                          <Link href={"/"}>Admissions</Link>
                        </h1>

                        <nav className="space-x-8 block ml-12">
                          {siteConfig.mainNav.map(({ label, url }) => (
                            <Link
                              className="text-xs hover:underline font-okineMedium uppercase tracking-widest text-muted-foreground hover:text-foreground"
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
                    </div>
                  </div>
                </header>

                <main className="h-[calc(100dvh-64px)] w-full flex-1 flex flex-col overflow-hidden">
                  {children}
                </main>
              </div>
            </>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
