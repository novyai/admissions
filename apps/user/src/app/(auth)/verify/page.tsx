import { AuthVerify } from "@/components/verify-auth/auth-verify"

export default async function Page() {
  return (
    <div className="w-full h-full">
      <div className="w-full h-full flex items-center justify-center">
        <AuthVerify />
      </div>
    </div>
  )
}
