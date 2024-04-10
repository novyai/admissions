"use client"

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { getUserByExternalId } from "@/actions/user"
import { useUser } from "@clerk/nextjs"
import { User } from "@repo/db"
import { Toaster } from "@repo/ui/components/ui/toaster"
import { TooltipProvider } from "@ui/components/ui/tooltip"
import { ThemeProvider } from "next-themes"

interface AppData {
  user: User | null
}

interface AppContextType {
  setData: (data: AppData) => void
  data: AppData
}

export const AppContext = createContext<AppContextType>({
  setData: () => {},
  data: {
    user: null
  }
})

export const useAppContext = () => {
  const ctx = useContext(AppContext)

  return ctx
}

const UserProvider = () => {
  const clerkUser = useUser()
  const ctx = useContext(AppContext)
  const loaded = useRef(false)

  const getUser = async () => {
    console.log("clerkUser", clerkUser)
    if (!clerkUser.user) {
      return null
    }
    loaded.current = true
    console.log("fetching user")
    const user = await getUserByExternalId({ uid: clerkUser.user?.id })
    console.log("user", user)
    ctx.setData({
      ...ctx.data,
      user
    })

    return user
  }

  useEffect(() => {
    !loaded.current && getUser()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser.isLoaded, clerkUser.isSignedIn])

  return null
}

export default function Providers({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    user: null
  })

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AppContext.Provider
        value={{
          setData,
          data
        }}
      >
        <Toaster />
        <UserProvider />
        <TooltipProvider>{children}</TooltipProvider>
      </AppContext.Provider>
    </ThemeProvider>
  )
}
