import Link from "next/link"
import { redirect, RedirectType } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { db } from "@db/client"
import { Button } from "@repo/ui/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@repo/ui/components/ui/table"

import { ScheduleTableActions } from "./schedule-table-actions"

async function getSchedules(userId: string) {
  "use server"
  return await db.schedule.findMany({
    where: {
      userID: userId
    },
    select: {
      id: true,
      _count: {
        select: {
          versions: true
        }
      },
      versions: {
        select: {
          id: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  })
}

export default async function Page() {
  const { userId, protect } = auth()

  protect({
    redirectUrl: "/"
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

async function ScheduleTable({ userId }: { userId: string }) {
  const schedules = await getSchedules(userId)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Schedule</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Versions</TableHead>
          <TableHead>Latest Metadata</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map(schedule => (
          <TableRow key={schedule.id}>
            <TableCell className="font-medium">
              <Button variant={"link"} asChild>
                <Link href={`/schedule/${schedule.id}`}>View</Link>
              </Button>
            </TableCell>
            <TableCell>Temp Name</TableCell>
            <TableCell>{schedule._count.versions}</TableCell>
            <TableCell>{schedule.versions[0]?.id} Change to metadata once added</TableCell>
            <TableCell>
              <ScheduleTableActions />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
