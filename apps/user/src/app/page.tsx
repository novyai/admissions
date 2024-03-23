import { SignInButton } from "@clerk/nextjs"

export default async function Home() {
  return (
    <div className="h-screen">
      <SignInButton afterSignInUrl="/dag-v1" />
    </div>
  )
}
