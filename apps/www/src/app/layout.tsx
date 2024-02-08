import "@ui/styles/globals.css"

import { ReactNode } from "react"
import { cn } from "@ui/lib/utils"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import Providers from "./providers"

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content"
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased overflow-hidden h-screen w-screen font-fusiona")}
    >
      <body className="antialiased relative">
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
