import { ReactNode } from "react"
import { defaultFontMapper } from "@ui/styles/fonts"

import { cn } from "@/lib/utils"
import { AdminNav } from "@/components/admin-nav"
import AppMenu from "@/components/app-menu"

import Providers from "./providers"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div
            className={cn(
              defaultFontMapper.default,
              defaultFontMapper.serif,
              defaultFontMapper.mono,
              "flex-col items-stretch h-screen w-screen overflow-y-scroll overflow-x-hidden"
            )}
          >
            <div className="w-screen h-screen overflow-x-hidden flex flex-col items-start">
              <div className="w-full border-b-[1px] border-b-gray-3 p-4 flex justify-between">
                <AdminNav />

                <div className="flex items-center gap-4">
                  <AppMenu />
                </div>
              </div>

              <main className="w-full h-[calc(100%-60px)] flex-1">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
