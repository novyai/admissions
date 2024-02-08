import { ReactNode } from "react"

import { AdminNav } from "@/components/admin-nav"
import AppMenu from "@/components/app-menu"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col items-start">
      <div className="w-full border-b-[1px] border-b-gray-3 p-4 flex justify-between">
        <AdminNav />

        <div className="flex items-center gap-4">
          <AppMenu />
        </div>
      </div>

      <main className="w-full h-[calc(100%-60px)] flex-1 overflow-hidden p-4">{children}</main>
    </div>
  )
}
