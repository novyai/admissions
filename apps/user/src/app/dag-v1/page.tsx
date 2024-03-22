import { auth, UserButton } from "@clerk/nextjs"

export default function Page() {
  auth().protect()

  return (
    <div>
      DAG V1
      <UserButton />
    </div>
  )
}
