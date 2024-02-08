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
            variant: pathname === "/" ? "secondary" : "ghost"
          })}
        >
          Dashboard
        </Link>
      </li>
      <li>
        <Link
          href="/admin/courses"
          className={buttonVariants({
            variant: pathname.startsWith("/admin/courses") ? "secondary" : "ghost"
          })}
        >
          Courses
        </Link>
      </li>
    </ul>
  )
}
