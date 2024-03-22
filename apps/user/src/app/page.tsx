import { redirect } from "next/navigation"
import { auth, currentUser, UserButton } from "@clerk/nextjs"

export default async function Home() {
  return (
    <div className="h-screen">
      <UserButton />
    </div>
  )
}
