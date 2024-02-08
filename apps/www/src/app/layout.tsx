import "@repo/ui/styles.css"

import { ReactNode } from "react"
import { cn } from "@ui/lib/utils"
import { defaultFontMapper } from "@ui/styles/fonts"
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
      className={cn(
        defaultFontMapper.default,
        defaultFontMapper.serif,
        defaultFontMapper.mono,
        "antialiased overflow-hidden h-screen w-screen"
      )}
    >
      <body className="antialiased relative">
        <Providers>
          <>
            <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
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
