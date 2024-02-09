"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@ui/components/ui/button"

export function AdminNav() {
  const pathname = usePathname()

  return (
    <ul className="flex gap-2">
      <li>
        <Link
          href="/"
          className={buttonVariants({
            variant: pathname === "/admin" ? "secondary" : "ghost"
          })}
        >
          Dashboard
        </Link>
      </li>
      <li>
        <Link
          href="/students"
          className={buttonVariants({
            variant: pathname.startsWith("/students") ? "secondary" : "ghost"
          })}
        >
          Students
        </Link>
      </li>
      <li>
        <Link
          href="/courses"
          className={buttonVariants({
            variant: pathname.startsWith("/courses") ? "secondary" : "ghost"
          })}
        >
          Courses
        </Link>
      </li>
    </ul>
  )
}
