import { SignInButton } from "@clerk/nextjs"

export default async function Home() {
  return (
    <div className="h-screen">
      <SignInButton />
    </div>
  )
}
