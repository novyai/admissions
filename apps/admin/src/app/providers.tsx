"use client"

import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react"
import { Toaster } from "@repo/ui/components/ui/toaster"
import { ThemeProvider } from "next-themes"

export const AppContext = createContext({
  setData: () => {},
  data: {}
} as {
  setData: Dispatch<SetStateAction<{}>>
  data: {}
})
const ToasterProvider = () => {
  return <Toaster />
}

export default function Providers({ children }: { children: ReactNode }) {
  const [data, setData] = useState({})

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppContext.Provider
        value={{
          setData,
          data
        }}
      >
        <ToasterProvider />
        <div>{children}</div>
      </AppContext.Provider>
    </ThemeProvider>
  )
}
