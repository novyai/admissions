import { redirect } from "next/navigation"
import { auth, SignInButton } from "@clerk/nextjs"
import { Button } from "@ui/components/ui/button"

export default async function Home() {
  const { userId } = auth()

  if (userId) {
    redirect("/dag-v1")
  }

  return (
    <div className="h-screen">
      <SignInButton afterSignInUrl="/dag-v1" mode="redirect">
        <Button>click to sign in</Button>
      </SignInButton>
    </div>
  )
}
