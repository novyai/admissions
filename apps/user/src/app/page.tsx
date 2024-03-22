import { UserButton } from "@clerk/nextjs"

export default async function Home() {
  return (
    <div className="h-screen">
      <UserButton />
    </div>
  )
}
