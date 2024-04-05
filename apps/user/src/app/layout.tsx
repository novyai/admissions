import "@/styles/globals.css"

import { ReactNode } from "react"
import { ClerkProvider } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
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
                {children}
              </div>
            </>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
