"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { checkAuth } from "./action"

export function AuthVerify() {
  const router = useRouter()
  const attemptsRef = useRef(0)

  const checkForUserAndSetCookie = async () => {
    if (attemptsRef.current > 5) {
      router.push("/sign-in")
      return
    }

    attemptsRef.current = attemptsRef.current + 1

    const isValid = await checkAuth()

    if (!isValid) {
      return setTimeout(() => {
        checkForUserAndSetCookie()
      }, 1000)
    }

    router.push("/schedule")
  }

  useEffect(() => {
    checkForUserAndSetCookie()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin h-6 w-6" />
    </div>
  )
}
