import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { buttonVariants } from "@repo/ui/components/ui/button"
import { cn } from "@ui/lib/utils"
import { MoveRight } from "lucide-react"

export default async function Home() {
  const { userId } = auth()

  if (userId) {
    redirect("/schedule")
  }

  return (
    <div className="h-screen">
      <HeroSection />
    </div>
  )
}

function HeroSection() {
  return (
    <main className="container">
      <section className="mt-12 mb-8 flex lg:justify-between w-full flex-col lg:flex-row">
        <div className="mx-auto lg:w-full p-6 lg:p-0">
          <strong className="text-4xl md:text-6xl font-bold leading-tight -mb-2 flex items-center gap-4">
            We provide
            <span className="">
              <MoveRight className="h-24 w-16 md:w-24 text-8xl" />
            </span>
          </strong>

          <div className="space-y-2">
            <strong className="text-4xl md:text-5xl italic font-semibold leading-tight flex items-center gap-4 ml-6 md:ml-12">
              xyz & abc
            </strong>
            <strong className="text-4xl md:text-5xl italic font-semibold leading-tight flex items-center gap-4 ml-6 md:ml-12">
              personalized advice
            </strong>
            <strong className="text-4xl md:text-5xl italic font-semibold leading-tight mb-4 flex items-center gap-4 ml-6 md:ml-12">
              complete privacy
            </strong>
          </div>
        </div>

        <div className="self-center lg:w-1/2 mt-12 p-6 md:p-0">
          <div className="max-w-md">
            <p className="text-sm font-semibold mb-2">[ YOUR AI POWERED COLLEGE ADVISOR ]</p>
            <p className="text-sm">
              Our AI advisor provides personalized advice based on your interests and academic
              profile.
            </p>

            <p className="text-sm font-semibold mb-2 mt-6 text-right">
              [ YOU - YOUR DATA - YOUR CHOICE ]
            </p>
            <p className="text-sm text-right">
              We believe in complete privacy. Your data is yours and yours alone. Get personalized
              advice without sharing your personal information.
            </p>

            <div className="w-full flex flex-row-reverse">
              <Link
                href="/sign-in"
                className={cn(
                  "text-lg font-semibold mt-6",
                  buttonVariants({
                    size: "lg",
                    variant: "outline"
                  })
                )}
              >
                Get Started <span className="text-blue-600">{` >`}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>

    // <section className="w-full py-12">
    //   <div className="container flex flex-col items-center gap-4 px-4 space-y-4 md:px-6 md:space-y-8">
    //     <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
    //       Your Personal AI Advisor
    //     </h1>
    //     <p className="max-w-[700px] text-center text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
    //       Let our AI plan your schedule. Spend less time organizing and more time doing.
    //     </p>
    //     <div className="flex flex-col gap-2 min-[400px]:flex-row">
    //       <Button asChild>
    //         <Link href="/sign-in?redirectUrl=/verify">Login</Link>
    //       </Button>

    //       <Button asChild>
    //         <Link href="/sign-up?redirectUrl=/verify">Sign Up</Link>
    //       </Button>
    //     </div>
    //   </div>
    // </section>
  )
}
