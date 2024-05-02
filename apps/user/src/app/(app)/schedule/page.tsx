import Link from "next/link"
import { redirect, RedirectType } from "next/navigation"
import { getSchedules } from "@/db/degree"
import { auth } from "@clerk/nextjs/server"
import { parseBlob } from "@graph/blob"
import { programName } from "@graph/defaultCourses"
import { Button } from "@repo/ui/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@repo/ui/components/ui/table"
import { Badge } from "@ui/components/ui/badge"

import { ScheduleTableActions } from "./schedule-table-actions"

export default async function Page() {
  const { userId, protect } = auth()

  protect({
    unauthenticatedUrl: "/"
  })

  if (!userId) {
    return redirect("/sign-in", RedirectType.replace)
  }

  return (
    <div className="w-full h-full">
      <h1 className="text-3xl font-bold pb-4">Your Schedules</h1>
      <div className="border rounded-2xl">
        <ScheduleTable userId={userId} />
      </div>
    </div>
  )
}

function timeSince(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  let interval = seconds / 31536000

  if (interval > 1) {
    return Math.floor(interval) + " years ago"
  }
  interval = seconds / 2592000
  if (interval > 1) {
    return Math.floor(interval) + " months ago"
  }
  interval = seconds / 86400
  if (interval > 1) {
    return Math.floor(interval) + " days ago"
  }
  interval = seconds / 3600
  if (interval > 1) {
    return Math.floor(interval) + " hours ago"
  }
  interval = seconds / 60
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago"
  }
  return Math.floor(seconds) + " seconds ago"
}

async function ScheduleTable({ userId }: { userId: string }) {
  const schedules = await getSchedules(userId)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Schedule</TableHead>
          <TableHead>Majors</TableHead>
          <TableHead>Last Modified</TableHead>
          <TableHead>Versions</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map(schedule => {
          const hasVersions = schedule.versions.length > 0
          const blob = hasVersions ? parseBlob(schedule.versions[0].blob) : undefined
          const programs = blob?.programs
          return (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium">
                <Button variant={"link"} asChild>
                  <Link href={`/schedule/${schedule.id}`}>View</Link>
                </Button>
              </TableCell>
              <TableCell>
                {programs ?
                  programs.map(p => <Badge key={p}>{programName[p]}</Badge>)
                : "No Programs"}
              </TableCell>
              <TableCell>
                {hasVersions ? timeSince(new Date(schedule.versions[0].createdAt)) : "Not modified"}
              </TableCell>
              <TableCell>{schedule._count.versions}</TableCell>
              <TableCell>
                <ScheduleTableActions />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
