import { redirect } from "next/navigation"
import { auth, SignInButton, SignUpButton } from "@clerk/nextjs"
import { Button } from "@ui/components/ui/button"

export default async function Home() {
  const { userId } = auth()

  if (userId) {
    redirect("/dag")
  }

  return (
    <div className="h-screen">
      <HeroSection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="w-full py-12">
      <div className="container flex flex-col items-center gap-4 px-4 space-y-4 md:px-6 md:space-y-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
          Your Personal AI Advisor
        </h1>
        <p className="max-w-[700px] text-center text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
          Let our AI plan your schedule. Spend less time organizing and more time doing.
        </p>
        <div className="flex flex-col gap-2 min-[400px]:flex-row">
          <SignInButton afterSignInUrl="/dag" mode="redirect">
            <Button>Sign In</Button>
          </SignInButton>
          <SignUpButton afterSignUpUrl="/dag" mode="redirect">
            <Button>Sign Up</Button>
          </SignUpButton>
        </div>
      </div>
    </section>
  )
}
